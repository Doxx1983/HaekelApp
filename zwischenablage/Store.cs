using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Microsoft.Data.Sqlite;

namespace Zwischenablage;

public sealed class Item
{
    public long Id { get; set; }
    public string Kind { get; set; } = "text";   // text | image | files
    public string Text { get; set; } = "";       // Text bzw. Dateipfade (je Zeile einer)
    public string Path { get; set; } = "";       // Bilddatei
    public string Ocr { get; set; } = "";
    public string Source { get; set; } = "";
    public bool Pinned { get; set; }
    public DateTime Created { get; set; }

    public string Title
    {
        get
        {
            switch (Kind)
            {
                case "image":
                    var o = Collapse(Ocr, 120);
                    return o.Length > 0 ? "Bild – " + o : "Bild";
                case "files":
                    var names = Text.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                                    .Select(p => System.IO.Path.GetFileName(p.TrimEnd('\\', '/'))).ToList();
                    return names.Count <= 1 ? (names.FirstOrDefault() ?? "Datei") : names[0] + $"  +{names.Count - 1}";
                default:
                    return Collapse(Text, 140);
            }
        }
    }

    public string Sub
    {
        get
        {
            string art = Kind == "image" ? "Bild" : Kind == "files" ? "Datei" : "Text";
            string src = string.IsNullOrEmpty(Source) ? "" : " · " + Source;
            return art + src + " · " + Created.ToLocalTime().ToString("dd.MM. HH:mm");
        }
    }

    public Visibility PinVis => Pinned ? Visibility.Visible : Visibility.Collapsed;
    public Visibility ThumbVis => Kind == "image" && File.Exists(Path) ? Visibility.Visible : Visibility.Collapsed;

    ImageSource? _thumb;
    public ImageSource? Thumb
    {
        get
        {
            if (_thumb != null || Kind != "image" || !File.Exists(Path)) return _thumb;
            try
            {
                var b = new BitmapImage();
                b.BeginInit();
                b.CacheOption = BitmapCacheOption.OnLoad;
                b.DecodePixelHeight = 80;
                b.UriSource = new Uri(Path);
                b.EndInit();
                b.Freeze();
                _thumb = b;
            }
            catch { }
            return _thumb;
        }
    }

    static string Collapse(string s, int max)
    {
        s = string.Join(" ", s.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        return s.Length > max ? s.Substring(0, max) + "…" : s;
    }
}

/// <summary>SQLite-Verlauf unter %LOCALAPPDATA%\Zwischenablage. Nur vom UI-Thread benutzen.</summary>
public sealed class Store : IDisposable
{
    public static readonly string Dir =
        System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Zwischenablage");
    public static readonly string ImgDir = System.IO.Path.Combine(Dir, "images");

    readonly SqliteConnection _c;

    public Store()
    {
        Directory.CreateDirectory(ImgDir);
        _c = new SqliteConnection("Data Source=" + System.IO.Path.Combine(Dir, "verlauf.db"));
        _c.Open();
        Exec(@"CREATE TABLE IF NOT EXISTS items(
                 id INTEGER PRIMARY KEY, kind TEXT NOT NULL, text TEXT NOT NULL DEFAULT '', path TEXT NOT NULL DEFAULT '',
                 hash TEXT NOT NULL UNIQUE, ocr TEXT NOT NULL DEFAULT '', search TEXT NOT NULL DEFAULT '',
                 pinned INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, source TEXT NOT NULL DEFAULT '')");
    }

    void Exec(string sql, params (string, object)[] ps)
    {
        using var cmd = _c.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (n, v) in ps) cmd.Parameters.AddWithValue(n, v);
        cmd.ExecuteNonQuery();
    }

    static long Now() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    static Item Read(SqliteDataReader r) => new()
    {
        Id = r.GetInt64(0), Kind = r.GetString(1), Text = r.GetString(2), Path = r.GetString(3),
        Ocr = r.GetString(4), Pinned = r.GetInt64(5) != 0,
        Created = DateTimeOffset.FromUnixTimeMilliseconds(r.GetInt64(6)).UtcDateTime, Source = r.GetString(7)
    };

    const string Cols = "id,kind,text,path,ocr,pinned,created,source";

    /// <summary>Fügt ein oder hebt einen vorhandenen gleichen Eintrag wieder nach oben. isNew = war noch nicht da.</summary>
    public (Item Item, bool IsNew) Add(string kind, string text, string path, string hash, string source, string search)
    {
        using (var sel = _c.CreateCommand())
        {
            sel.CommandText = $"SELECT {Cols} FROM items WHERE hash=@h";
            sel.Parameters.AddWithValue("@h", hash);
            using var r = sel.ExecuteReader();
            if (r.Read())
            {
                var existing = Read(r);
                r.Close();
                Exec("UPDATE items SET created=@t WHERE id=@i", ("@t", Now()), ("@i", existing.Id));
                existing.Created = DateTime.UtcNow;
                return (existing, false);
            }
        }
        long now = Now();
        Exec("INSERT INTO items(kind,text,path,hash,search,created,source) VALUES(@k,@t,@p,@h,@s,@c,@o)",
             ("@k", kind), ("@t", text), ("@p", path), ("@h", hash), ("@s", search.ToLowerInvariant()), ("@c", now), ("@o", source));
        using var idCmd = _c.CreateCommand();
        idCmd.CommandText = "SELECT last_insert_rowid()";
        long id = (long)idCmd.ExecuteScalar()!;
        return (new Item { Id = id, Kind = kind, Text = text, Path = path, Source = source,
                           Created = DateTimeOffset.FromUnixTimeMilliseconds(now).UtcDateTime }, true);
    }

    public void SetOcr(long id, string ocr)
    {
        Exec("UPDATE items SET ocr=@o, search=search||' '||@s WHERE id=@i",
             ("@o", ocr), ("@s", ocr.ToLowerInvariant()), ("@i", id));
    }

    public void Touch(long id) => Exec("UPDATE items SET created=@t WHERE id=@i", ("@t", Now()), ("@i", id));

    public void TogglePin(Item it)
    {
        it.Pinned = !it.Pinned;
        Exec("UPDATE items SET pinned=@p WHERE id=@i", ("@p", it.Pinned ? 1 : 0), ("@i", it.Id));
    }

    public void Delete(Item it)
    {
        Exec("DELETE FROM items WHERE id=@i", ("@i", it.Id));
        CleanFiles();
    }

    /// <summary>Löscht alles außer Angeheftetem.</summary>
    public void ClearUnpinned()
    {
        Exec("DELETE FROM items WHERE pinned=0");
        CleanFiles();
    }

    /// <summary>Löscht nicht angeheftete Einträge, die älter als <paramref name="days"/> Tage sind.</summary>
    public void Expire(int days)
    {
        long cutoff = DateTimeOffset.UtcNow.AddDays(-days).ToUnixTimeMilliseconds();
        Exec("DELETE FROM items WHERE pinned=0 AND created<@c", ("@c", cutoff));
        CleanFiles();
    }

    public List<Item> Query(string search, int limit = 200)
    {
        var words = search.ToLowerInvariant().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        using var cmd = _c.CreateCommand();
        var where = new List<string>();
        for (int i = 0; i < words.Length; i++)
        {
            where.Add($"search LIKE @w{i} ESCAPE '\\'");
            cmd.Parameters.AddWithValue("@w" + i, "%" + words[i].Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%");
        }
        cmd.CommandText = $"SELECT {Cols} FROM items" + (where.Count > 0 ? " WHERE " + string.Join(" AND ", where) : "") +
                          " ORDER BY pinned DESC, created DESC, id DESC LIMIT " + limit;
        var list = new List<Item>();
        using var r = cmd.ExecuteReader();
        while (r.Read()) list.Add(Read(r));
        return list;
    }

    /// <summary>Entfernt Bilddateien, auf die kein Eintrag mehr zeigt.</summary>
    void CleanFiles()
    {
        var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        using (var cmd = _c.CreateCommand())
        {
            cmd.CommandText = "SELECT path FROM items WHERE kind='image'";
            using var r = cmd.ExecuteReader();
            while (r.Read()) used.Add(r.GetString(0));
        }
        foreach (var f in Directory.EnumerateFiles(ImgDir))
            if (!used.Contains(f)) { try { File.Delete(f); } catch { } }
    }

    public void Dispose() => _c.Dispose();
}
