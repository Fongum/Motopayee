// One-off image optimizer. Produces resized WebP (and a social OG image) from
// the oversized source PNGs in /public. Run with: node scripts/optimize-images.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';

const pub = fileURLToPath(new URL('../public/', import.meta.url));
const kb = (p) => `${(statSync(p).size / 1024).toFixed(0)} KB`;

// Photos / hero: resize to sensible max widths and re-encode as WebP.
const photoJobs = [
  { src: 'car-hero.png', out: 'car-hero.webp', width: 1600, quality: 72 },
  { src: 'team.png', out: 'team.webp', width: 1200, quality: 75 },
  { src: 'man.png', out: 'man.webp', width: 240, quality: 80 },
  { src: 'woman.png', out: 'woman.webp', width: 240, quality: 80 },
  // Navbar logo: small, transparent, crisp.
  { src: 'logo2.png', out: 'logo2.webp', width: 480, quality: 90 },
];

for (const j of photoJobs) {
  await sharp(pub + j.src)
    .resize({ width: j.width, withoutEnlargement: true })
    .webp({ quality: j.quality })
    .toFile(pub + j.out);
  console.log(`${j.src} (${kb(pub + j.src)}) -> ${j.out} (${kb(pub + j.out)})`);
}

// Social / Open Graph card: 1200x630 JPG (broadest scraper compatibility),
// brand-navy background with the logo centered.
await sharp(pub + 'logo2.png')
  .resize({ width: 760, height: 420, fit: 'contain', background: { r: 13, g: 31, b: 60, alpha: 1 } })
  .extend({
    top: 105, bottom: 105, left: 220, right: 220,
    background: { r: 13, g: 31, b: 60, alpha: 1 },
  })
  .flatten({ background: { r: 13, g: 31, b: 60 } })
  .jpeg({ quality: 82 })
  .toFile(pub + 'og.jpg');
console.log(`og.jpg (${kb(pub + 'og.jpg')})`);

console.log('Done.');
