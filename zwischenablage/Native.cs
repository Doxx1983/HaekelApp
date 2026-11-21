using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace Zwischenablage;

static class Native
{
    public const int WM_CLIPBOARDUPDATE = 0x031D;
    public const int WM_HOTKEY = 0x0312;

    [DllImport("user32.dll")] public static extern bool AddClipboardFormatListener(IntPtr h);
    [DllImport("user32.dll")] public static extern bool RemoveClipboardFormatListener(IntPtr h);
    [DllImport("user32.dll")] public static extern bool RegisterHotKey(IntPtr h, int id, uint mod, uint vk);
    [DllImport("user32.dll")] public static extern bool UnregisterHotKey(IntPtr h, int id);
    [DllImport("user32.dll")] static extern IntPtr GetClipboardOwner();
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern uint RegisterClipboardFormat(string s);
    [DllImport("user32.dll")] static extern bool IsClipboardFormatAvailable(uint f);
    [DllImport("user32.dll", SetLastError = true)] static extern uint SendInput(uint n, INPUT[] inputs, int size);

    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }

    [StructLayout(LayoutKind.Sequential)]
    struct MOUSEINPUT { public int dx, dy; public uint mouseData, dwFlags, time; public IntPtr extra; }

    [StructLayout(LayoutKind.Sequential)]
    struct KEYBDINPUT { public ushort vk, scan; public uint flags, time; public IntPtr extra; }

    [StructLayout(LayoutKind.Explicit)]
    struct InputUnion { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }

    [StructLayout(LayoutKind.Sequential)]
    struct INPUT { public uint type; public InputUnion u; }

    /// <summary>Prüft, ob ein registriertes Clipboard-Format (z. B. von Passwort-Managern gesetzt) vorhanden ist.</summary>
    public static bool HasFormat(string name)
    {
        uint f = RegisterClipboardFormat(name);
        return f != 0 && IsClipboardFormatAvailable(f);
    }

    /// <summary>Prozessname des Programms, das gerade in die Zwischenablage geschrieben hat.</summary>
    public static (string? Name, int Pid) ClipboardOwner()
    {
        try
        {
            IntPtr h = GetClipboardOwner();
            if (h == IntPtr.Zero) return (null, 0);
            GetWindowThreadProcessId(h, out uint pid);
            using var p = Process.GetProcessById((int)pid);
            return (p.ProcessName, (int)pid);
        }
        catch { return (null, 0); }
    }

    public static void SendCtrlV()
    {
        const ushort VK_CONTROL = 0x11, VK_V = 0x56;
        const uint KEYUP = 0x0002;
        INPUT Key(ushort vk, uint flags) => new()
        {
            type = 1,
            u = new InputUnion { ki = new KEYBDINPUT { vk = vk, flags = flags } }
        };
        var seq = new[] { Key(VK_CONTROL, 0), Key(VK_V, 0), Key(VK_V, KEYUP), Key(VK_CONTROL, KEYUP) };
        SendInput((uint)seq.Length, seq, Marshal.SizeOf<INPUT>());
    }
}
