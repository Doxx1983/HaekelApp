using System;
using System.Threading.Tasks;
using Windows.Globalization;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Storage;
using Windows.Storage.Streams;

namespace Zwischenablage;

/// <summary>Lokale Texterkennung mit der in Windows eingebauten OCR (keine Cloud, kein Download).</summary>
static class Ocr
{
    public static async Task<string> ReadAsync(string path)
    {
        try
        {
            var engine = OcrEngine.TryCreateFromUserProfileLanguages()
                         ?? TryLang("de") ?? TryLang("en-US");
            if (engine == null) return "";

            var file = await StorageFile.GetFileFromPathAsync(path);
            using IRandomAccessStream stream = await file.OpenAsync(FileAccessMode.Read);
            var decoder = await BitmapDecoder.CreateAsync(stream);

            uint w = decoder.PixelWidth, h = decoder.PixelHeight, max = OcrEngine.MaxImageDimension;
            var transform = new BitmapTransform();
            if (w > max || h > max)
            {
                double s = (double)max / Math.Max(w, h);
                transform.ScaledWidth = (uint)Math.Max(1, w * s);
                transform.ScaledHeight = (uint)Math.Max(1, h * s);
            }

            using var bmp = await decoder.GetSoftwareBitmapAsync(
                BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, transform,
                ExifOrientationMode.IgnoreExifOrientation, ColorManagementMode.DoNotColorManage);
            var result = await engine.RecognizeAsync(bmp);
            return result.Text ?? "";
        }
        catch { return ""; }
    }

    static OcrEngine? TryLang(string tag)
    {
        try { return OcrEngine.TryCreateFromLanguage(new Language(tag)); }
        catch { return null; }
    }
}
