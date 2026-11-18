// Minimální čtečka ZIP (bez závislostí): centrální adresář + inflateRaw.
// Stačí na archivy otevřených dat psp.cz a na .docx. Nepodporuje ZIP64 ani šifrování.

import zlib from 'node:zlib';

/** @returns {Map<string, Buffer>} název souboru → obsah */
export function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ZIP: nenalezen konec centrálního adresáře');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('ZIP: poškozený centrální adresář');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nlen).toString('utf8');
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(dataStart, dataStart + csize);
    if (!name.endsWith('/')) {
      if (method === 0) out.set(name, Buffer.from(raw));
      else if (method === 8) out.set(name, zlib.inflateRawSync(raw));
      else throw new Error(`ZIP: nepodporovaná komprese ${method} u ${name}`);
    }
    p += 46 + nlen + elen + clen;
  }
  return out;
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Prostý text z .docx (word/document.xml); odstavce odděluje \n. */
export function docxText(buf) {
  const xml = readZip(buf).get('word/document.xml');
  if (!xml) throw new Error('DOCX: chybí word/document.xml');
  return xml.toString('utf8')
    .replace(/<w:del\b[\s\S]*?<\/w:del>/g, '')          // sledované změny: smazaný text nepatří do znění
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:(?:tab|br)\b[^>]*\/>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ENT[e])
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .trim();
}
