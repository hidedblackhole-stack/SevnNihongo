import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

const SRC_IMAGE = 'C:/Users/user/.gemini/antigravity-ide/brain/40858932-98f0-41e6-abd4-f6f77275ac29/.user_uploaded/media_1789741479556.jpg';
const OUT_DIR = 'c:/project/Nihongo Quest - Copy (2)/src/assets/avatars/female';
const PUBLIC_DIR = 'c:/project/Nihongo Quest - Copy (2)/public/avatars/female';

[OUT_DIR, PUBLIC_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Accurate bounding boxes for each of the 10 tiers
const TIERS_CONFIG = [
  // Tier 1: Novice
  { tier: 1, x: 5, y: 135, w: 185, h: 260 },
  // Tier 2: Wanderer
  { tier: 2, x: 195, y: 135, w: 175, h: 260 },
  // Tier 3: Knight
  { tier: 3, x: 355, y: 125, w: 185, h: 270 },
  // Tier 4: Royal Guard
  { tier: 4, x: 535, y: 115, w: 220, h: 280 },
  // Tier 5: Elite Knight
  { tier: 5, x: 745, y: 110, w: 265, h: 285 },
  // Tier 6: Champion
  { tier: 6, x: 0, y: 520, w: 220, h: 285 },
  // Tier 7: Holy Knight
  { tier: 7, x: 200, y: 490, w: 205, h: 315 },
  // Tier 8: Flame Knight
  { tier: 8, x: 395, y: 515, w: 215, h: 290 },
  // Tier 9: Shadow Knight
  { tier: 9, x: 575, y: 515, w: 215, h: 290 },
  // Tier 10: Ascendant
  { tier: 10, x: 775, y: 490, w: 245, h: 315 },
];

function removeBackgroundFloodFill(cropped) {
  const w = cropped.bitmap.width;
  const h = cropped.bitmap.height;
  const visited = new Uint8Array(w * h);

  // Helper to check if pixel is background (dark navy background)
  function isBgColor(x, y) {
    const color = cropped.getPixelColor(x, y);
    const r = (color >> 24) & 255;
    const g = (color >> 16) & 255;
    const b = (color >> 8) & 255;
    
    // Background is dark navy: r < 38, g < 45, b < 60
    // and relatively neutral or slightly blue
    return (r <= 36 && g <= 44 && b <= 58);
  }

  // Queue for BFS flood fill starting from outer perimeter
  const queue = [];

  function addPixel(x, y) {
    const idx = y * w + x;
    if (!visited[idx] && isBgColor(x, y)) {
      visited[idx] = 1;
      queue.push(x, y);
    }
  }

  // Add all border pixels
  for (let x = 0; x < w; x++) {
    addPixel(x, 0);
    addPixel(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    addPixel(0, y);
    addPixel(w - 1, y);
  }

  // BFS
  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];

    // Make this background pixel transparent
    cropped.setPixelColor(0x00000000, cx, cy);

    // Neighbors
    const neighbors = [
      [cx + 1, cy], [cx - 1, cy],
      [cx, cy + 1], [cx, cy - 1]
    ];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nIdx = ny * w + nx;
        if (!visited[nIdx] && isBgColor(nx, ny)) {
          visited[nIdx] = 1;
          queue.push(nx, ny);
        }
      }
    }
  }

  return cropped;
}

async function extractAll() {
  console.log('Loading source image...');
  const source = await Jimp.read(SRC_IMAGE);

  for (const cfg of TIERS_CONFIG) {
    console.log(`Extracting Tier ${cfg.tier}...`);
    const cropped = source.clone().crop({
      x: cfg.x,
      y: cfg.y,
      w: cfg.w,
      h: cfg.h
    });

    removeBackgroundFloodFill(cropped);

    // Save to src/assets and public/avatars
    const outSrc = `${OUT_DIR}/tier-${cfg.tier}.png`;
    const outPub = `${PUBLIC_DIR}/tier-${cfg.tier}.png`;
    await cropped.write(outSrc);
    await cropped.write(outPub);
    console.log(`Tier ${cfg.tier} saved.`);
  }

  console.log('All 10 tiers successfully extracted!');
}

extractAll().catch(console.error);
