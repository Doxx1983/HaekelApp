using System;
using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;

namespace Zwischenablage;

public partial class PopupWindow : Window
{
    readonly Store _store;
    readonly Action<Item> _paste;

    public PopupWindow(Store store, Action<Item> paste)
    {
        InitializeComponent();
        _store = store;
        _paste = paste;
        Search.TextChanged += (_, _) => Refresh();
        PreviewKeyDown += OnKey;
        Deactivated += (_, _) => Hide();
    }

    void Refresh()
    {
        List.ItemsSource = _store.Query(Search.Text);
        if (List.Items.Count > 0) List.SelectedIndex = 0;
    }

    /// <summary>Öffnet den Verlauf an der Mausposition (innerhalb des Bildschirms).</summary>
    public void ShowAtCursor()
    {
        Search.Text = "";
        Refresh();

        Native.GetCursorPos(out var p);
        var wa = System.Windows.Forms.Screen.FromPoint(new System.Drawing.Point(p.X, p.Y)).WorkingArea;
        var dpi = VisualTreeHelper.GetDpi(this);
        double w = Width * dpi.DpiScaleX, h = Height * dpi.DpiScaleY;
        double x = Math.Max(wa.Left, Math.Min(p.X, wa.Right - w));
        double y = Math.Max(wa.Top, Math.Min(p.Y, wa.Bottom - h));
        Left = x / dpi.DpiScaleX;
        Top = y / dpi.DpiScaleY;

        Show();
        Activate();
        Native.SetForegroundWindow(new WindowInteropHelper(this).Handle);
        Search.Focus();
        Keyboard.Focus(Search);
    }

    void Move(int delta)
    {
        int n = List.Items.Count;
        if (n == 0) return;
        List.SelectedIndex = Math.Max(0, Math.Min(n - 1, List.SelectedIndex + delta));
        List.ScrollIntoView(List.SelectedItem);
    }

    void OnKey(object sender, KeyEventArgs e)
    {
        bool ctrl = (Keyboard.Modifiers & ModifierKeys.Control) != 0;
        switch (e.Key)
        {
            case Key.Down: Move(1); e.Handled = true; break;
            case Key.Up: Move(-1); e.Handled = true; break;
            case Key.PageDown: Move(6); e.Handled = true; break;
            case Key.PageUp: Move(-6); e.Handled = true; break;
            case Key.Escape: Hide(); e.Handled = true; break;
            case Key.Enter:
                if (List.SelectedItem is Item it) _paste(it);
                e.Handled = true;
                break;
            case Key.P when ctrl:
                if (List.SelectedItem is Item pi)
                {
                    int idx = List.SelectedIndex;
                    _store.TogglePin(pi);
                    Refresh();
                    List.SelectedIndex = Math.Min(idx, List.Items.Count - 1);
                }
                e.Handled = true;
                break;
            case Key.Delete when ctrl:
                if (List.SelectedItem is Item di)
                {
                    int idx = List.SelectedIndex;
                    _store.Delete(di);
                    Refresh();
                    if (List.Items.Count > 0) List.SelectedIndex = Math.Min(idx, List.Items.Count - 1);
                }
                e.Handled = true;
                break;
        }
    }

    void List_DoubleClick(object sender, MouseButtonEventArgs e)
    {
        if (List.SelectedItem is Item it) _paste(it);
    }
}
