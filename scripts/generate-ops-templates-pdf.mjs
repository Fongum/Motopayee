import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const sourcePath = resolve('docs/launch-operations-templates.md');
const outPath = resolve('output/pdf/motopayee-launch-operations-templates.pdf');

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 44;
const BOTTOM = 44;
const LINE = 13;

function esc(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function width(text, size) {
  return String(text).length * size * 0.49;
}

function wrap(text, maxWidth, size = 9.5) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (width(next, size) <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

class Page {
  constructor(number) {
    this.number = number;
    this.ops = [];
    this.y = PAGE_H - M;
  }

  raw(s) {
    this.ops.push(s);
  }

  color(hex) {
    const value = hex.replace('#', '');
    const r = parseInt(value.slice(0, 2), 16) / 255;
    const g = parseInt(value.slice(2, 4), 16) / 255;
    const b = parseInt(value.slice(4, 6), 16) / 255;
    this.raw(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    this.raw(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
  }

  rect(x, y, w, h, fill = false) {
    this.raw(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${fill ? 'f' : 'S'}`);
  }

  text(x, y, text, size = 9.5, font = 'F1', color = '#172033') {
    this.color(color);
    this.raw(`BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc(text)}) Tj ET`);
  }

  line(x1, y1, x2, y2, color = '#d8e0ea') {
    this.color(color);
    this.raw(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }
}

const pages = [];
let page = new Page(1);
pages.push(page);

function header() {
  page.text(M, PAGE_H - 28, 'MotoPayee Launch Operations Templates', 8, 'F2', '#5c6978');
  page.text(PAGE_W - M - 42, PAGE_H - 28, `Page ${page.number}`, 8, 'F1', '#5c6978');
  page.line(M, PAGE_H - 36, PAGE_W - M, PAGE_H - 36, '#e1e7ef');
  page.y = PAGE_H - 58;
}

function newPage() {
  page = new Page(pages.length + 1);
  pages.push(page);
  header();
}

function ensure(space) {
  if (page.y - space < BOTTOM) newPage();
}

function cover(title, subtitle) {
  page.color('#0d1f3c');
  page.rect(M, PAGE_H - 204, PAGE_W - 2 * M, 154, true);
  page.text(M + 22, PAGE_H - 92, 'MotoPayee', 12, 'F2', '#dcecff');
  page.text(M + 22, PAGE_H - 123, title, 24, 'F2', '#ffffff');
  page.text(M + 22, PAGE_H - 150, subtitle, 11, 'F1', '#dcecff');
  const badges = ['Buea + Douala', 'Seller intake', 'Dealer pilot', 'Verified rentals', 'MFI partners'];
  let bx = M + 22;
  for (const badge of badges) {
    const bw = width(badge, 8) + 18;
    if (bx + bw > PAGE_W - M - 16) break;
    page.color('#1e6b3a');
    page.rect(bx, PAGE_H - 180, bw, 18, true);
    page.text(bx + 8, PAGE_H - 175, badge, 8, 'F2', '#ffffff');
    bx += bw + 8;
  }
  page.y = PAGE_H - 232;
}

function h1(text) {
  ensure(34);
  page.text(M, page.y, text, 20, 'F2', '#143a63');
  page.y -= 28;
}

function h2(text) {
  ensure(30);
  page.text(M, page.y, text, 13, 'F2', '#143a63');
  page.y -= 7;
  page.line(M, page.y, PAGE_W - M, page.y, '#d7e2ef');
  page.y -= 13;
}

function h3(text) {
  ensure(20);
  page.text(M, page.y, text, 10.5, 'F2', '#143a63');
  page.y -= 15;
}

function para(text) {
  const lines = wrap(text, PAGE_W - 2 * M, 9.5);
  ensure(lines.length * LINE + 6);
  for (const line of lines) {
    page.text(M, page.y, line, 9.5);
    page.y -= LINE;
  }
  page.y -= 4;
}

function bullet(text) {
  const lines = wrap(text, PAGE_W - 2 * M - 18, 9.5);
  ensure(lines.length * LINE + 2);
  page.text(M + 4, page.y, '-', 9.5, 'F2', '#1e6b3a');
  page.text(M + 18, page.y, lines[0], 9.5);
  page.y -= LINE;
  for (const line of lines.slice(1)) {
    page.text(M + 18, page.y, line, 9.5);
    page.y -= LINE;
  }
}

function table(headers, rows) {
  const totalW = PAGE_W - 2 * M;
  const widths = headers.length === 2 ? [totalW * 0.42, totalW * 0.58] : Array(headers.length).fill(totalW / headers.length);
  const wrappedRows = rows.map((row) => row.map((cell, i) => wrap(cell || ' ', widths[i] - 9, 8.2)));
  const heights = wrappedRows.map((row) => Math.max(20, ...row.map((lines) => lines.length * 10 + 9)));
  ensure(22 + heights.reduce((a, b) => a + b, 0) + 10);
  let x = M;
  let y = page.y;
  page.color('#edf5ef');
  page.rect(M, y - 21, totalW, 21, true);
  headers.forEach((head, i) => {
    page.text(x + 5, y - 14, head, 8.2, 'F2', '#173b28');
    x += widths[i];
  });
  page.y -= 21;
  rows.forEach((row, ri) => {
    x = M;
    y = page.y;
    const h = heights[ri];
    page.color('#d8e0ea');
    page.rect(M, y - h, totalW, h, false);
    row.forEach((_, i) => {
      page.line(x, y, x, y - h, '#d8e0ea');
      let ty = y - 12;
      for (const line of wrappedRows[ri][i]) {
        page.text(x + 5, ty, line, 8.2);
        ty -= 10;
      }
      x += widths[i];
    });
    page.line(x, y, x, y - h, '#d8e0ea');
    page.y -= h;
  });
  page.y -= 10;
}

function note(text) {
  const lines = wrap(text, PAGE_W - 2 * M - 22, 9.5);
  const h = lines.length * LINE + 14;
  ensure(h + 8);
  page.color('#f3faf5');
  page.rect(M, page.y - h + 8, PAGE_W - 2 * M, h, true);
  page.color('#1e6b3a');
  page.rect(M, page.y - h + 8, 4, h, true);
  let y = page.y;
  for (const line of lines) {
    page.text(M + 12, y, line, 9.5);
    y -= LINE;
  }
  page.y -= h + 8;
}

function parseMarkdown(md) {
  const lines = md.split(/\r?\n/);
  cover('Launch Operations Templates', 'Reference forms and checklists for the first 30-day launch push.');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) {
      page.y -= 3;
      continue;
    }
    if (line.startsWith('# ')) {
      h1(line.slice(2));
      continue;
    }
    if (line.startsWith('## ')) {
      h2(line.slice(3));
      continue;
    }
    if (line.startsWith('### ')) {
      h3(line.slice(4));
      continue;
    }
    if (line.startsWith('- ')) {
      bullet(line.slice(2));
      continue;
    }
    if (line.startsWith('|')) {
      const block = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        block.push(lines[i]);
        i += 1;
      }
      i -= 1;
      const rows = block
        .filter((row) => !/^\|\s*-+/.test(row))
        .map((row) => row.split('|').slice(1, -1).map((cell) => cell.trim()));
      if (rows.length > 1) table(rows[0], rows.slice(1));
      continue;
    }
    if (line.startsWith('Hello, this is MotoPayee')) {
      note(line);
      continue;
    }
    para(line);
  }
}

parseMarkdown(readFileSync(sourcePath, 'utf8'));

function pdfString() {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };
  const fontRegular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageRefs = [];
  const contentRefs = [];
  for (const p of pages) {
    const stream = p.ops.join('\n');
    contentRefs.push(add(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`));
  }
  const pagesRefPlaceholder = '__PAGES_REF__';
  for (let i = 0; i < pages.length; i += 1) {
    pageRefs.push(add(`<< /Type /Page /Parent ${pagesRefPlaceholder} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentRefs[i]} 0 R >>`));
  }
  const pagesRef = add(`<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`);
  const catalogRef = add(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);
  const finalObjects = objects.map((body) => body.replaceAll(`${pagesRefPlaceholder} 0 R`, `${pagesRef} 0 R`));
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  finalObjects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${finalObjects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${finalObjects.length + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return pdf;
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, pdfString(), 'binary');
console.log(outPath);
