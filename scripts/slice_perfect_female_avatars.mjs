import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

const SRC_IMAGE = 'C:/Users/user/.gemini/antigravity-ide/brain/40858932-98f0-41e6-abd4-f6f77275ac29/.user_uploaded/media_1789741479556.jpg';
const OUT_SRC = 'c:/project/Nihongo Quest - Copy (2)/src/assets/avatars/female';
const OUT_PUB = 'c:/project/Nihongo Quest - Copy (2)/public/avatars/female';

[OUT_SRC, OUT_PUB].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const TIERS = [
  { tier: 1, x: 10, y: 135, w: 175, h: 255, feetY: 236 },
  { tier: 2, x: 195, y: 135, w: 160, h: 255, feetY: 236 },
  { tier: 3, x: 360, y: 125, w: 170, h: 265, feetY: 242 },
  { tier: 4, x: 535, y: 115, w: 215, h: 275, feetY: 254 },
  { tier: 5, x: 770, y: 105, w: 245, h: 285, feetY: 262 },
  { tier: 6, x: 5, y: 520, w: 195, h: 275, feetY: 258 },
  { tier: 7, x: 210, y: 510, w: 180, h: 282, feetY: 264 },
  { tier: 8, x: 410, y: 505, w: 175, h: 290, feetY: 268 },
  { tier: 9, x: 590, y: 512, w: 190, h: 283, feetY: 264 },
  { tier: 10, x: 805, y: 508, w: 215, h: 287, feetY: 270 },
];

function isNavyBg(r, g, b) {
  // Navy background in the sheet is dark blue-gray
  if (b > r + 5 && b >= g + 1 && b >= 18 && b <= 40 && r <= 22 && g <= 30) return true;
  const d = Math.sqrt((r - 13)**2 + (g - 21)**2 + (b - 28)**2);
  return d < 7.2;
}

async function processTier(source, cfg) {
  console.log(`Processing Female Tier ${cfg.tier}...`);
  const img = source.clone().crop({ x: cfg.x, y: cfg.y, w: cfg.w, h: cfg.h });
  const w = img.bitmap.width;
  const h = img.bitmap.height;

  // 1. Flood-fill background from perimeter
  const visited = new Uint8Array(w * h);
  const queue = [];

  function checkAndAdd(px, py) {
    const idx = py * w + px;
    if (!visited[idx]) {
      const c = img.getPixelColor(px, py);
      const r = (c >> 24) & 255;
      const g = (c >> 16) & 255;
      const b = (c >> 8) & 255;
      if (isNavyBg(r, g, b)) {
        visited[idx] = 1;
        queue.push(px, py);
      }
    }
  }

  for (let x = 0; x < w; x++) { checkAndAdd(x, 0); checkAndAdd(x, h - 1); }
  for (let y = 0; y < h; y++) { checkAndAdd(0, y); checkAndAdd(w - 1, y); }

  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];
    img.setPixelColor(0x00000000, cx, cy);

    const neighbors = [[cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        checkAndAdd(nx, ny);
      }
    }
  }

  // 2. Erase ground shadows under feet
  if (cfg.feetY) {
    for (let y = cfg.feetY; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = img.getPixelColor(x, y);
        const a = c & 255;
        if (a > 0) {
          const r = (c >> 24) & 255;
          const g = (c >> 16) & 255;
          const b = (c >> 8) & 255;
          // Floor shadow is dark and muddy
          if (r < 38 && g < 38 && b < 45) {
            img.setPixelColor(0x00000000, x, y);
          }
        }
      }
    }
  }

  // 3. Clean small detached specks (< 40 connected pixels)
  const compVisited = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!compVisited[idx]) {
        const c = img.getPixelColor(x, y);
        if ((c & 255) > 0) {
          const comp = [];
          const q = [x, y];
          compVisited[idx] = 1;
          let qHead = 0;
          while (qHead < q.length) {
            const qx = q[qHead++];
            const qy = q[qHead++];
            comp.push([qx, qy]);
            const nbrs = [[qx+1, qy], [qx-1, qy], [qx, qy+1], [qx, qy-1]];
            for (const [nx, ny] of nbrs) {
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nIdx = ny * w + nx;
                if (!compVisited[nIdx] && (img.getPixelColor(nx, ny) & 255) > 0) {
                  compVisited[nIdx] = 1;
                  q.push(nx, ny);
                }
              }
            }
          }
          if (comp.length < 50) {
            for (const [cx, cy] of comp) {
              img.setPixelColor(0x00000000, cx, cy);
            }
          }
        }
      }
    }
  }

  // Save to src and public
  await img.write(`${OUT_SRC}/tier-${cfg.tier}.png`);
  await img.write(`${OUT_PUB}/tier-${cfg.tier}.png`);
  console.log(`Female Tier ${cfg.tier} saved successfully.`);
}

async function run() {
  console.log('Loading Female Warrior Progression image...');
  const source = await Jimp.read(SRC_IMAGE);

  for (const cfg of TIERS) {
    await processTier(source, cfg);
  }

  console.log('All 10 Female Warrior Tiers have been sliced and saved!');
}

run().catch(console.error);
