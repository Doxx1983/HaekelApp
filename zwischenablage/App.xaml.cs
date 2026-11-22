using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Microsoft.Win32;

namespace Zwischenablage;

public partial class App : Application
{
    const int HotkeyId = 1;
    const uint ModCtrl = 0x2, ModShift = 0x4, ModNoRepeat = 0x4000, VkV = 0x56;
    const int RetentionDays = 30;
    const long MaxTextChars = 1_000_000;
    const string SelfFormat = "Zwischenablage.Self";

    // Programme, deren Zwischenablage nie aufgenommen wird (Teil des Prozessnamens).
    static readonly string[] BlockedProcesses =
    {
        "keepass", "keepassxc", "bitwarden", "1password", "dashlane", "lastpass", "enpass", "nordpass",
        "roboform", "keeper", "protonpass", "proton pass", "stickypassword", "logmeonce", "passwordsafe",
        "pwsafe", "buttercup", "psono", "kwallet", "authenticator"
    };

    // Clipboard-Formate, mit denen Programme „nicht aufnehmen“ signalisieren.
    static readonly string[] IgnoreFormats =
    {
        "ExcludeClipboardContentFromMonitorProcessing", // Windows-Standard (Passwort-Manager, Verlauf, Cloud)
        "Clipboard Viewer Ignore"                       // KeePass u. a.
    };

    Mutex? _mutex;
    Store? _store;
    HwndSource? _msg;
    System.Windows.Forms.NotifyIcon? _tray;
    PopupWindow? _popup;
    System.Windows.Forms.ToolStripMenuItem? _autostart;
    IntPtr _target;
    Timer? _expireTimer;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        _mutex = new Mutex(true, "Zwischenablage.Einzelinstanz", out bool created);
        if (!created) { Shutdown(); return; }

        ApplyTheme();
        _store = new Store();
        _store.Expire(RetentionDays);
        _expireTimer = new Timer(_ => Dispatcher.BeginInvoke(new Action(() => _store?.Expire(RetentionDays))),
                                 null, TimeSpan.FromHours(6), TimeSpan.FromHours(6));
        _popup = new PopupWindow(_store, PasteItem);

        // Unsichtbares Nachrichtenfenster: Hotkey und Clipboard-Änderungen.
        var p = new HwndSourceParameters("ZwischenablageMsg") { ParentWindow = new IntPtr(-3), Width = 0, Height = 0 };
        _msg = new HwndSource(p);
        _msg.AddHook(WndProc);
        Native.AddClipboardFormatListener(_msg.Handle);

        CreateTray();
        if (!Native.RegisterHotKey(_msg.Handle, HotkeyId, ModCtrl | ModShift | ModNoRepeat, VkV))
            _tray!.ShowBalloonTip(5000, "Zwischenablage", "Strg+Shift+V ist schon belegt.", System.Windows.Forms.ToolTipIcon.Warning);
    }

    protected override void OnExit(ExitEventArgs e)
    {
        if (_msg != null)
        {
            Native.UnregisterHotKey(_msg.Handle, HotkeyId);
            Native.RemoveClipboardFormatListener(_msg.Handle);
            _msg.Dispose();
        }
        _tray?.Dispose();
        _expireTimer?.Dispose();
        _store?.Dispose();
        _mutex?.Dispose();
        base.OnExit(e);
    }

    // ---------- Design: Hell/Dunkel nach Windows-Einstellung ----------

    void ApplyTheme()
    {
        bool light = true;
        try { light = (int)(Registry.GetValue(@"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize",
                                              "AppsUseLightTheme", 1) ?? 1) != 0; }
        catch { }
        if (light) return;
        void Set(string k, string hex) => Resources[k] = new SolidColorBrush((Color)ColorConverter.ConvertFromString(hex));
        Set("Bg", "#0F1115"); Set("Surface", "#171A21"); Set("Surface2", "#1F232C"); Set("Text", "#E7E9EE");
        Set("Muted", "#98A2B3"); Set("Line", "#2B303B"); Set("Accent", "#8196FF"); Set("AccentSoft", "#242C52");
    }

    // ---------- Tray ----------

    void CreateTray()
    {
        var menu = new System.Windows.Forms.ContextMenuStrip();
        menu.Items.Add("Verlauf öffnen (Strg+Shift+V)", null, (_, _) => ShowPopup());
        menu.Items.Add("Verlauf leeren (Angeheftetes bleibt)", null, (_, _) => _store!.ClearUnpinned());
        _autostart = new System.Windows.Forms.ToolStripMenuItem("Mit Windows starten") { Checked = IsAutostart() };
        _autostart.Click += (_, _) => { SetAutostart(!_autostart.Checked); _autostart.Checked = IsAutostart(); };
        menu.Items.Add(_autostart);
        menu.Items.Add("Beenden", null, (_, _) => Shutdown());

        _tray = new System.Windows.Forms.NotifyIcon
        {
            Icon = MakeIcon(), Text = "Zwischenablage", Visible = true, ContextMenuStrip = menu
        };
    }

    // Schlichtes Symbol: blaues Rechteck mit weißem „Klemmbrett“-Strich.
    static System.Drawing.Icon MakeIcon()
    {
        using var bmp = new System.Drawing.Bitmap(32, 32);
        using (var g = System.Drawing.Graphics.FromImage(bmp))
        {
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
            using var blue = new System.Drawing.SolidBrush(System.Drawing.Color.FromArgb(0x43, 0x61, 0xEE));
            g.FillRectangle(blue, 5, 4, 22, 26);
            g.FillRectangle(System.Drawing.Brushes.White, 11, 1, 10, 7);
            using var pen = new System.Drawing.Pen(System.Drawing.Color.White, 2);
            g.DrawLine(pen, 9, 14, 23, 14);
            g.DrawLine(pen, 9, 19, 23, 19);
            g.DrawLine(pen, 9, 24, 18, 24);
        }
        return System.Drawing.Icon.FromHandle(bmp.GetHicon());
    }

    const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";

    static bool IsAutostart()
    {
        using var k = Registry.CurrentUser.OpenSubKey(RunKey);
        return k?.GetValue("Zwischenablage") != null;
    }

    static void SetAutostart(bool on)
    {
        using var k = Registry.CurrentUser.OpenSubKey(RunKey, true);
        if (k == null) return;
        if (on) k.SetValue("Zwischenablage", "\"" + Environment.ProcessPath + "\"");
        else k.DeleteValue("Zwischenablage", false);
    }

    // ---------- Nachrichten ----------

    IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == Native.WM_CLIPBOARDUPDATE)
        {
            _ = CaptureAsync();
            handled = true;
        }
        else if (msg == Native.WM_HOTKEY && wParam.ToInt32() == HotkeyId)
        {
            ShowPopup();
            handled = true;
        }
        return IntPtr.Zero;
    }

    void ShowPopup()
    {
        if (_popup!.IsVisible) { _popup.Hide(); return; }
        _target = Native.GetForegroundWindow();   // hierhin wird eingefügt
        _popup.ShowAtCursor();
    }

    // ---------- Aufnehmen ----------

    static bool IsBlockedSource(string? process)
    {
        if (process == null) return false;
        var n = process.ToLowerInvariant();
        return BlockedProcesses.Any(b => n.Contains(b));
    }

    static bool ExcludedByFlag(System.Windows.IDataObject d)
    {
        if (IgnoreFormats.Any(Native.HasFormat)) return true;
        // Diese beiden Formate tragen einen Wert; 0 heißt „nicht aufnehmen“.
        foreach (var f in new[] { "CanIncludeInClipboardHistory", "CanUploadToCloudClipboard" })
        {
            try
            {
                if (!d.GetDataPresent(f)) continue;
                var raw = d.GetData(f);
                byte[]? b = raw as byte[] ?? (raw as MemoryStream)?.ToArray();
                if (b != null && b.Length >= 4 && BitConverter.ToInt32(b, 0) == 0) return true;
            }
            catch { }
        }
        return false;
    }

    async Task CaptureAsync()
    {
        try
        {
            var (owner, pid) = Native.ClipboardOwner();
            if (pid == Environment.ProcessId || IsBlockedSource(owner)) return;

            System.Windows.IDataObject? d = null;
            for (int i = 0; i < 8 && d == null; i++)
            {
                try { d = Clipboard.GetDataObject(); }
                catch (System.Runtime.InteropServices.COMException) { await Task.Delay(40); }
            }
            if (d == null || d.GetDataPresent(SelfFormat) || ExcludedByFlag(d)) return;

            string source = owner ?? "";

            // 1) Dateien
            if (d.GetDataPresent(DataFormats.FileDrop) && d.GetData(DataFormats.FileDrop) is string[] files && files.Length > 0)
            {
                string text = string.Join("\n", files);
                var names = string.Join(" ", files.Select(f => Path.GetFileName(f)));
                _store!.Add("files", text, "", Hash("files", text), source, names + " " + text);
                return;
            }

            // 2) Text
            if (d.GetDataPresent(DataFormats.UnicodeText) && d.GetData(DataFormats.UnicodeText) is string t
                && t.Trim().Length > 0 && t.Length <= MaxTextChars)
            {
                _store!.Add("text", t, "", Hash("text", t), source, t);
                return;
            }

            // 3) Bild (PNG bevorzugt wegen Transparenz)
            byte[]? png = null;
            if (d.GetDataPresent("PNG") && d.GetData("PNG") is MemoryStream ms) png = ms.ToArray();
            else if (d.GetDataPresent(DataFormats.Bitmap))
            {
                var bs = Clipboard.GetImage();
                if (bs != null)
                {
                    var enc = new PngBitmapEncoder();
                    enc.Frames.Add(BitmapFrame.Create(bs));
                    using var o = new MemoryStream();
                    enc.Save(o);
                    png = o.ToArray();
                }
            }
            if (png == null || png.Length == 0) return;

            string hash = Hash("image", png);
            string path = Path.Combine(Store.ImgDir, hash + ".png");
            if (!File.Exists(path)) File.WriteAllBytes(path, png);
            var (item, isNew) = _store!.Add("image", "", path, hash, source, "bild");
            if (isNew)
            {
                string ocr = await Ocr.ReadAsync(path);   // lokal, danach durchsuchbar
                if (ocr.Trim().Length > 0) _store.SetOcr(item.Id, ocr);
            }
        }
        catch { /* Aufnehmen darf nie die App stören */ }
    }

    static string Hash(string kind, string s) => Hash(kind, Encoding.UTF8.GetBytes(s));

    static string Hash(string kind, byte[] data)
    {
        using var sha = SHA256.Create();
        sha.TransformBlock(Encoding.UTF8.GetBytes(kind), 0, Encoding.UTF8.GetByteCount(kind), null, 0);
        sha.TransformFinalBlock(data, 0, data.Length);
        return Convert.ToHexString(sha.Hash!);
    }

    // ---------- Einfügen ----------

    async void PasteItem(Item it)
    {
        _popup!.Hide();
        try
        {
            var data = new System.Windows.DataObject();
            switch (it.Kind)
            {
                case "files":
                    var sc = new System.Collections.Specialized.StringCollection();
                    sc.AddRange(it.Text.Split('\n', StringSplitOptions.RemoveEmptyEntries));
                    data.SetFileDropList(sc);
                    break;
                case "image":
                    if (!File.Exists(it.Path)) return;
                    var bytes = File.ReadAllBytes(it.Path);
                    var bmp = new BitmapImage();
                    bmp.BeginInit();
                    bmp.CacheOption = BitmapCacheOption.OnLoad;
                    bmp.StreamSource = new MemoryStream(bytes);
                    bmp.EndInit();
                    bmp.Freeze();
                    data.SetImage(bmp);
                    data.SetData("PNG", new MemoryStream(bytes));
                    break;
                default:
                    data.SetText(it.Text, TextDataFormat.UnicodeText);
                    break;
            }
            data.SetData(SelfFormat, true);   // eigene Änderung nicht erneut aufnehmen

            for (int i = 0; i < 8; i++)
            {
                try { Clipboard.SetDataObject(data, true); break; }
                catch (System.Runtime.InteropServices.COMException) { await Task.Delay(40); }
            }
            _store!.Touch(it.Id);

            Native.SetForegroundWindow(_target);
            await Task.Delay(120);
            Native.SendCtrlV();
        }
        catch { }
    }
}
