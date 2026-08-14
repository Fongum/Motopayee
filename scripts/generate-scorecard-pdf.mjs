import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outPath = resolve('output/pdf/motopayee-30-day-launch-scorecard.pdf');

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 46;
const BOTTOM = 46;
const LINE = 14;

function esc(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function approxWidth(text, size) {
  return String(text).length * size * 0.5;
}

function wrap(text, maxWidth, size = 10) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (approxWidth(next, size) <= maxWidth || !line) {
      line = next;
    } else {
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

  text(x, y, text, size = 10, font = 'F1', color = '#172033') {
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

function newPage() {
  page = new Page(pages.length + 1);
  pages.push(page);
  header();
}

function ensure(space) {
  if (page.y - space < BOTTOM) newPage();
}

function header() {
  page.text(M, PAGE_H - 28, 'MotoPayee 30-Day Launch Scorecard', 8, 'F2', '#5c6978');
  page.text(PAGE_W - M - 42, PAGE_H - 28, `Page ${page.number}`, 8, 'F1', '#5c6978');
  page.line(M, PAGE_H - 36, PAGE_W - M, PAGE_H - 36, '#e1e7ef');
  page.y = PAGE_H - 58;
}

function h1(text) {
  ensure(42);
  page.text(M, page.y, text, 24, 'F2', '#143a63');
  page.y -= 32;
}

function h2(text) {
  ensure(34);
  page.text(M, page.y, text, 14, 'F2', '#143a63');
  page.y -= 7;
  page.line(M, page.y, PAGE_W - M, page.y, '#d7e2ef');
  page.y -= 15;
}

function h3(text) {
  ensure(22);
  page.text(M, page.y, text, 11, 'F2', '#143a63');
  page.y -= 16;
}

function para(text, size = 10, color = '#172033') {
  const lines = wrap(text, PAGE_W - 2 * M, size);
  ensure(lines.length * LINE + 6);
  for (const line of lines) {
    page.text(M, page.y, line, size, 'F1', color);
    page.y -= LINE;
  }
  page.y -= 4;
}

function bullets(items) {
  for (const item of items) {
    const lines = wrap(item, PAGE_W - 2 * M - 18, 10);
    ensure(lines.length * LINE + 3);
    page.text(M + 4, page.y, '-', 10, 'F2', '#1e6b3a');
    page.text(M + 18, page.y, lines[0], 10);
    page.y -= LINE;
    for (const rest of lines.slice(1)) {
      page.text(M + 18, page.y, rest, 10);
      page.y -= LINE;
    }
  }
  page.y -= 5;
}

function note(text, warning = false) {
  const lines = wrap(text, PAGE_W - 2 * M - 22, 10);
  const h = lines.length * LINE + 14;
  ensure(h + 8);
  page.color(warning ? '#fff8ea' : '#f3faf5');
  page.rect(M, page.y - h + 8, PAGE_W - 2 * M, h, true);
  page.color(warning ? '#f5a623' : '#1e6b3a');
  page.rect(M, page.y - h + 8, 4, h, true);
  let y = page.y;
  for (const line of lines) {
    page.text(M + 12, y, line, 10, 'F1', '#172033');
    y -= LINE;
  }
  page.y -= h + 8;
}

function table(headers, rows, widths) {
  const rowH = 22;
  const wrappedRows = rows.map((row) => row.map((cell, i) => wrap(cell, widths[i] - 10, 8.8)));
  const heights = wrappedRows.map((row) => Math.max(rowH, ...row.map((lines) => lines.length * 11 + 10)));
  ensure(rowH + heights.reduce((a, b) => a + b, 0) + 10);
  let x = M;
  let y = page.y;
  page.color('#edf5ef');
  page.rect(M, y - rowH, widths.reduce((a, b) => a + b, 0), rowH, true);
  headers.forEach((head, i) => {
    page.text(x + 5, y - 14, head, 8.8, 'F2', '#173b28');
    x += widths[i];
  });
  page.y -= rowH;
  rows.forEach((row, ri) => {
    x = M;
    y = page.y;
    const h = heights[ri];
    page.color('#d8e0ea');
    page.rect(M, y - h, widths.reduce((a, b) => a + b, 0), h, false);
    row.forEach((_, i) => {
      page.line(x, y, x, y - h, '#d8e0ea');
      const lines = wrappedRows[ri][i];
      let ty = y - 12;
      for (const line of lines) {
        page.text(x + 5, ty, line, 8.8);
        ty -= 11;
      }
      x += widths[i];
    });
    page.line(x, y, x, y - h, '#d8e0ea');
    page.y -= h;
  });
  page.y -= 12;
}

function cover() {
  page.color('#0d1f3c');
  page.rect(M, PAGE_H - 210, PAGE_W - 2 * M, 160, true);
  page.text(M + 22, PAGE_H - 92, 'MotoPayee', 12, 'F2', '#dcecff');
  page.text(M + 22, PAGE_H - 126, '30-Day Launch Scorecard', 28, 'F2', '#ffffff');
  page.text(M + 22, PAGE_H - 154, 'Professional trusted vehicle marketplace for Buea and Douala', 12, 'F1', '#dcecff');
  const badges = ['Buea + Douala first', 'Reviewed marketplace', 'Verified rentals', 'Finance partners'];
  let bx = M + 22;
  for (const badge of badges) {
    const bw = approxWidth(badge, 8.5) + 18;
    page.color('#1e6b3a');
    page.rect(bx, PAGE_H - 184, bw, 18, true);
    page.text(bx + 8, PAGE_H - 179, badge, 8.5, 'F2', '#ffffff');
    bx += bw + 8;
  }
  page.y = PAGE_H - 240;
}

cover();
h2('Strategic Focus');
para('MotoPayee is launching as a professional trusted vehicle marketplace for Buea and Douala. The first public push should focus on trusted local buying and selling, vehicle financing through partner institutions, and verified rentals for travel, events, business, and peak season demand. Imports remain secondary for now.');
table(['Area', '30-Day Target', 'Launch Gate'], [
  ['Sale listings', '25+', 'Reviewed and presentable'],
  ['Rental vehicles', '20+', 'Verified or near verified'],
  ['Dealer pilots', '3-5', 'Free 6-month pilot in progress'],
  ['Finance partners', '2-3', 'MFI, credit union, or dealer-finance conversations active'],
  ['Finance-eligible vehicles', '5-10', 'Only after verification and review'],
  ['WhatsApp Business', '1 dedicated channel', 'Profile, labels, quick replies active'],
  ['Inspection offer', '1 clear package', 'Buyer-requested inspection available'],
], [150, 120, 233]);
h2('Team Roles');
table(['Person', 'Primary Responsibility', 'Weekly Target'], [
  ['Founder', 'Dealers, finance partners, key partnerships', '5 partner conversations, 2 dealer visits, 2 finance meetings'],
  ['Staff 1', 'Seller and rental owner onboarding', '20 outreach contacts, 10 completed intake forms'],
  ['Staff 2', 'Listing packaging, data entry, verification follow-up', '10 listings prepared, 5 verification follow-ups'],
], [90, 190, 223]);

newPage();
h2('Weekly Scorecard');
table(['Metric', 'Week 1', 'Week 2', 'Week 3', 'Week 4'], [
  ['Seller contacts', '', '', '', ''],
  ['Dealer contacts', '', '', '', ''],
  ['Rental owner contacts', '', '', '', ''],
  ['MFI/credit partner contacts', '', '', '', ''],
  ['Completed sale listing intakes', '', '', '', ''],
  ['Completed rental intakes', '', '', '', ''],
  ['Listings reviewed', '', '', '', ''],
  ['Listings published', '', '', '', ''],
  ['Verified listings', '', '', '', ''],
  ['Inspected listings', '', '', '', ''],
  ['Finance-eligible listings', '', '', '', ''],
  ['Rental vehicles approved', '', '', '', ''],
  ['Buyer inquiries', '', '', '', ''],
  ['Renter inquiries', '', '', '', ''],
  ['Inspection requests', '', '', '', ''],
  ['Financing applications', '', '', '', ''],
  ['Rental bookings', '', '', '', ''],
], [190, 78, 78, 78, 79]);

newPage();
h2('Week 1 - Setup And Outreach Start');
h3('Founder');
bullets(['Set up MotoPayee WhatsApp Business number.', 'Build target dealer list for Buea and Douala.', 'Build target MFI and credit union list.', 'Contact the first 5 dealers.', 'Contact the first 3 finance institutions.']);
h3('Staff 1');
bullets(['Start private seller outreach.', 'Start rental owner outreach.', 'Collect seller and rental details through WhatsApp or calls.', 'Target 20 outreach contacts.']);
h3('Staff 2');
bullets(['Create intake sheets.', 'Prepare sale listing and rental vehicle templates.', 'Package existing seller inventory.', 'Target 5 draft sale listings.']);
note('Week 1 target: WhatsApp Business ready, 5 draft sale listings, 5 rental leads, 5 dealer conversations started, and 3 finance partner conversations started.');

h2('Week 2 - Inventory Packaging');
h3('Founder');
bullets(['Visit or call 2-3 dealers.', 'Push the free 6-month dealer pilot.', 'Ask each dealer for 5-10 vehicles.', 'Continue scheduling MFI meetings.']);
h3('Staff 1');
bullets(['Follow up seller and rental leads.', 'Collect missing photos, prices, and documents.', 'Target 10 completed seller/rental intakes.']);
h3('Staff 2');
bullets(['Package listings professionally.', 'Review listing completeness.', 'Mark trust status clearly.', 'Target 10-15 sale listings prepared.']);
note('Week 2 target: 10-15 sale listings ready or reviewed, 8-10 rental vehicles in intake, 1-2 dealer pilots verbally interested, and inspection process drafted.');

newPage();
h2('Week 3 - Verification And Partner Push');
h3('Founder');
bullets(['Confirm dealer pilot terms with interested dealers.', 'Start formal MFI and credit union meetings.', 'Present the finance partner pitch.', 'Identify finance-eligible listing candidates.']);
h3('Staff 1');
bullets(['Push rental owners for documents and availability.', 'Confirm rates and security deposits.', 'Continue seller outreach.', 'Target 10 more completed intakes.']);
h3('Staff 2');
bullets(['Prepare or publish reviewed listings.', 'Prepare rental listings.', 'Create the weekly inventory status report.', 'Target 20+ sale listings and 15+ rental vehicles.']);
note('Week 3 target: 20+ sale listings, 15+ rental vehicles, 2-3 dealer pilots in progress, 1-2 MFI meetings completed, and 5 finance-eligible candidates identified.');

h2('Week 4 - Launch Readiness');
h3('Founder');
bullets(['Confirm 3-5 dealer pilots if possible.', 'Continue MFI follow-ups.', 'Approve public launch messaging.', 'Decide go/no-go for buyer campaign.']);
h3('Staff 1');
bullets(['Final push for seller and rental inventory.', 'Confirm contacts and availability.', 'Prepare lead follow-up list.']);
h3('Staff 2');
bullets(['Final listing quality check.', 'Final rental verification check.', 'Prepare launch posts and weekly scorecard.', 'Confirm all listings have price, city, photos, and trust status.']);
note('Week 4 target: 25+ sale listings, 20+ rental vehicles, 3-5 dealer pilots started or in negotiation, WhatsApp labels and quick replies active, and public soft launch ready.');

newPage();
h2('Go/No-Go Rule');
note('Proceed with the buyer and renter campaign only if 25+ sale listings are presentable, 20+ rental vehicles are presentable or clearly coming online, inquiry handling is ready, trust statuses are clear, and the WhatsApp process is working.');
note('If the supply target is not ready, continue for two more weeks with a supply campaign only: list your car free, register your rental vehicle, and join the dealer pilot.', true);

h2('Trust Rules');
bullets(['No sale listing goes public without MotoPayee review.', 'Free listing does not mean verified.', 'Rental vehicles must be verified before going live.', 'Financing appears only on finance-eligible listings.', 'Unverified listing inquiries should pass through MotoPayee.', 'Verified and inspected listings should rank higher.']);

h2('Commercial Defaults');
table(['Item', 'Launch Policy'], [
  ['Basic sale listing', 'Free'],
  ['Dealer pilot', 'Free for 6 months'],
  ['Document verification', 'Free at first'],
  ['Buyer-requested inspection', 'Paid, starting around 15,000 XAF'],
  ['Rental commission', '10% starting point'],
  ['Featured listing', 'Optional, around 10,000 XAF'],
  ['Financing application', 'Free to buyer'],
  ['Financing revenue', 'Success commission from partner after disbursement'],
], [180, 323]);

newPage();
h2('Daily Lead Statuses');
table(['Status', 'Meaning'], [
  ['New', 'Lead has been captured but not contacted.'],
  ['Contacted', 'Team has reached out.'],
  ['Waiting for photos', 'Listing cannot move until photos are provided.'],
  ['Waiting for price', 'Listing cannot move until price is confirmed.'],
  ['Waiting for documents', 'Verification or rental approval is pending documents.'],
  ['Ready for review', 'All core details are available.'],
  ['Approved', 'Listing or partner is approved for next step.'],
  ['Published', 'Listing is live or ready for promotion.'],
  ['Rejected', 'Lead failed review or is unsuitable.'],
  ['Follow-up later', 'Valid lead but not ready now.'],
], [150, 353]);
h2('Monday Meeting Agenda');
bullets(['Last week targets vs actual', 'Best lead sources', 'Listings ready to publish', 'Rental vehicles ready', 'Dealer and MFI progress', 'Verification or inspection blockers', "This week's targets", 'Staff assignments']);
h2('Launch Positioning');
note('Primary line: MotoPayee is the trusted vehicle marketplace for Buea and Douala.');
para('Supporting lines: Buy reviewed vehicles. Sell your car for free. Access finance-eligible cars. Book verified rentals. Join the dealer pilot.', 10, '#5c6978');

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
    const contentRef = add(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    contentRefs.push(contentRef);
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
  pdf += `xref\n0 ${finalObjects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${finalObjects.length + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return pdf;
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, pdfString(), 'binary');
console.log(outPath);
