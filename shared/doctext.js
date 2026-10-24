// Dateiformate und Textauslesen, gemeinsam für muster/ und anleitung/ (beide nehmen dieselben Formate an).
const FILE_ACCEPT = 'image/*,application/pdf,.pdf,.txt,text/plain,.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,.odt,application/vnd.oasis.opendocument.text';
// 'image' | 'pdf' | 'word' (.docx, .odt, .doc) | 'text' | null
const fileKind = f => /^image\//.test(f.type) ? 'image' : (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) ? 'pdf' : /\.(docx?|odt)$/i.test(f.name) || /msword|wordprocessingml|opendocument\.text/.test(f.type) ? 'word' : (/^text\//.test(f.type) || /\.txt$/i.test(f.name)) ? 'text' : null;
// Text einer Datei für den Häkelhelfer: .txt direkt, .docx/.odt ausgelesen, sonst '' (Bild, PDF, alte .doc)
async function fileText(f) {
  const k = fileKind(f);
  return k === 'text' ? f.text() : k === 'word' ? docText(f) : '';
}
// Text aus .docx (word/document.xml) oder .odt (content.xml) lesen; beides sind ZIP-Dateien. Ohne Bibliothek; alte .doc liefern ''
async function docText(blob) {
  try {
    const b = new Uint8Array(await blob.arrayBuffer()), v = new DataView(b.buffer);
    let e = b.length - 22; while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) return '';
    for (let o = v.getUint32(e + 16, true), n = v.getUint16(e + 10, true); n--; ) {
      const m = v.getUint16(o + 10, true), cs = v.getUint32(o + 20, true), nl = v.getUint16(o + 28, true), lo = v.getUint32(o + 42, true);
      const name = new TextDecoder().decode(b.subarray(o + 46, o + 46 + nl));
      o += 46 + nl + v.getUint16(o + 30, true) + v.getUint16(o + 32, true);
      if (name !== 'word/document.xml' && name !== 'content.xml') continue;
      const start = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true), data = b.subarray(start, start + cs);
      const raw = m === 0 ? data : new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      const xml = new DOMParser().parseFromString(new TextDecoder().decode(raw), 'application/xml');
      return (name === 'content.xml' ? odtText(xml) : docxText(xml)).replace(/\n{3,}/g, '\n\n').trim();
    }
  } catch {}
  return '';
}

function docxText(xml) {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  return [...xml.getElementsByTagNameNS(W, 'p')].map(p => [...p.getElementsByTagNameNS(W, '*')]
    .map(x => x.localName === 't' ? x.textContent : x.localName === 'tab' ? '\t' : x.localName === 'br' ? '\n' : '').join('')).join('\n');
}
function odtText(xml) {
  const T = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0', body = xml.getElementsByTagNameNS('urn:oasis:names:tc:opendocument:xmlns:office:1.0', 'text')[0];
  const walk = n => [...n.childNodes].map(c => {
    if (c.nodeType === 3) return c.nodeValue;
    if (c.nodeType !== 1) return '';
    if (c.namespaceURI === T) {
      if (c.localName === 's') return ' '.repeat(+c.getAttributeNS(T, 'c') || 1);
      if (c.localName === 'tab') return '\t';
      if (c.localName === 'line-break') return '\n';
      if (c.localName === 'p' || c.localName === 'h') return walk(c) + '\n';
    }
    return walk(c);
  }).join('');
  return body ? walk(body) : '';
}
