import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';

const BRAIN_DIR = 'C:/Users/user/.gemini/antigravity-ide/brain/40858932-98f0-41e6-abd4-f6f77275ac29';
const OUT_DIR = 'c:/project/Nihongo Quest - Copy (2)/src/assets/avatars/female';
const PUBLIC_DIR = 'c:/project/Nihongo Quest - Copy (2)/public/avatars/female';

// Ensure directories exist
[OUT_DIR, PUBLIC_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function removeBackground(image) {
  // Flood fill or pixel color threshold for white background
  image.scan((x, y) => {
    const color = image.getPixelColor(x, y);
    const r = (color >> 24) & 255;
    const g = (color >> 16) & 255;
    const b = (color >> 8) & 255;

    // Pure white or off-white background
    if (r > 240 && g > 240 && b > 240) {
      image.setPixelColor(0x00000000, x, y);
    }
  });
  return image;
}

// Color palette transform for higher tiers
function transformPalette(image, filterFn) {
  const cloned = image.clone();
  cloned.scan((x, y) => {
    const color = cloned.getPixelColor(x, y);
    const a = color & 255;
    if (a === 0) return; // Transparent

    const r = (color >> 24) & 255;
    const g = (color >> 16) & 255;
    const b = (color >> 8) & 255;

    // Don't change skin tones (roughly peach/flesh: r > 180, g between 120 and 190, b between 100 and 160)
    const isSkin = (r > 170 && g > 110 && b > 90 && r > g && g > b && (r - b) > 30);
    if (isSkin) return;

    const [newR, newG, newB] = filterFn(r, g, b);
    const newColor = ((newR * 16777216) + (newG * 65536) + (newB * 256) + a) >>> 0;
    cloned.setPixelColor(newColor, x, y);
  });
  return cloned;
}

async function run() {
  console.log('Processing Female Tier Sprites...');

  // 1. Tier 1 (Villager)
  const img1 = await Jimp.read(`${BRAIN_DIR}/tier_female_1_1789741603828.jpg`);
  removeBackground(img1);
  await img1.write(`${OUT_DIR}/tier-1.png`);
  await img1.write(`${PUBLIC_DIR}/tier-1.png`);
  console.log('Tier 1 done');

  // 2. Tier 2 (Novice)
  const img2 = await Jimp.read(`${BRAIN_DIR}/tier_female_2_1789741693165.jpg`);
  removeBackground(img2);
  await img2.write(`${OUT_DIR}/tier-2.png`);
  await img2.write(`${PUBLIC_DIR}/tier-2.png`);
  console.log('Tier 2 done');

  // 3. Tier 3 (Apprentice)
  const img3 = await Jimp.read(`${BRAIN_DIR}/tier_female_3_1789741714001.jpg`);
  removeBackground(img3);
  await img3.write(`${OUT_DIR}/tier-3.png`);
  await img3.write(`${PUBLIC_DIR}/tier-3.png`);
  console.log('Tier 3 done');

  // 4. Tier 4 (Valiant Squire - Steel/Silver chainmail & cobalt blue)
  const img4 = transformPalette(img3, (r, g, b) => {
    // Shift cyan clothing to cobalt royal steel blue
    if (b > r && g > r) {
      return [Math.round(r * 0.5), Math.round(g * 0.7), Math.min(255, Math.round(b * 1.3))];
    }
    // Polish leather to steel iron
    if (r > 70 && g > 50 && b < 60) {
      const avg = Math.round((r + g + b) / 3 * 1.1);
      return [Math.min(255, avg + 10), Math.min(255, avg + 15), Math.min(255, avg + 25)];
    }
    return [r, g, b];
  });
  await img4.write(`${OUT_DIR}/tier-4.png`);
  await img4.write(`${PUBLIC_DIR}/tier-4.png`);
  console.log('Tier 4 done');

  // 5. Tier 5 (Honorable Knight - Noble Amethyst & Gold Plate)
  const img5 = transformPalette(img3, (r, g, b) => {
    // Shift clothing to deep royal purple
    if (b > r || g > r) {
      return [Math.min(255, Math.round(r * 1.4 + 60)), Math.round(g * 0.4), Math.min(255, Math.round(b * 1.3 + 50))];
    }
    // Shift wood/leather to golden bronze armor
    if (r > 80 && g > 60) {
      return [Math.min(255, Math.round(r * 1.25)), Math.min(255, Math.round(g * 1.15)), Math.round(b * 0.4)];
    }
    return [r, g, b];
  });
  await img5.write(`${OUT_DIR}/tier-5.png`);
  await img5.write(`${PUBLIC_DIR}/tier-5.png`);
  console.log('Tier 5 done');

  // 6. Tier 6 (Elite Knight - Royal Crimson & Dark Steel Plate)
  const img6 = transformPalette(img3, (r, g, b) => {
    // Crimson velvet
    if (b > r || g > r) {
      return [Math.min(255, Math.round(r * 1.6 + 90)), Math.round(g * 0.3), Math.round(b * 0.4)];
    }
    // Dark silver engraved plate
    const avg = Math.round((r + g + b) / 3);
    return [Math.min(255, avg + 30), Math.min(255, avg + 30), Math.min(255, avg + 45)];
  });
  await img6.write(`${OUT_DIR}/tier-6.png`);
  await img6.write(`${PUBLIC_DIR}/tier-6.png`);
  console.log('Tier 6 done');

  // 7. Tier 7 (Grand Paladin - Radiant Solar Gold & Holy White)
  const img7 = transformPalette(img3, (r, g, b) => {
    // Holy radiant gold and platinum
    const lum = (r + g + b) / 3;
    if (lum > 60) {
      return [Math.min(255, Math.round(lum * 1.2 + 40)), Math.min(255, Math.round(lum * 1.05 + 25)), Math.round(lum * 0.5)];
    }
    return [r, g, b];
  });
  await img7.write(`${OUT_DIR}/tier-7.png`);
  await img7.write(`${PUBLIC_DIR}/tier-7.png`);
  console.log('Tier 7 done');

  // 8. Tier 8 (Legendary Hero - Cosmic Cyan Starfire)
  const img8 = transformPalette(img3, (r, g, b) => {
    // Cosmic luminous glow
    const lum = (r + g + b) / 3;
    if (lum > 50) {
      return [Math.round(lum * 0.3), Math.min(255, Math.round(lum * 1.1 + 40)), Math.min(255, Math.round(lum * 1.3 + 60))];
    }
    return [r, g, b];
  });
  await img8.write(`${OUT_DIR}/tier-8.png`);
  await img8.write(`${PUBLIC_DIR}/tier-8.png`);
  console.log('Tier 8 done');

  // 9. Tier 9 (Elemental Champion - Mystic Violet & Azure)
  const img9 = transformPalette(img3, (r, g, b) => {
    const lum = (r + g + b) / 3;
    if (lum > 50) {
      return [Math.min(255, Math.round(lum * 1.1 + 60)), Math.round(lum * 0.4), Math.min(255, Math.round(lum * 1.3 + 60))];
    }
    return [r, g, b];
  });
  await img9.write(`${OUT_DIR}/tier-9.png`);
  await img9.write(`${PUBLIC_DIR}/tier-9.png`);
  console.log('Tier 9 done');

  // 10. Tier 10 (Mythic Deity - Transcendent Pure Sun Gold & Celestial Diamond)
  const img10 = transformPalette(img3, (r, g, b) => {
    const lum = (r + g + b) / 3;
    if (lum > 40) {
      return [Math.min(255, Math.round(lum * 1.25 + 50)), Math.min(255, Math.round(lum * 1.15 + 40)), Math.min(255, Math.round(lum * 0.8 + 20))];
    }
    return [r, g, b];
  });
  await img10.write(`${OUT_DIR}/tier-10.png`);
  await img10.write(`${PUBLIC_DIR}/tier-10.png`);
  console.log('Tier 10 done');

  console.log('All 10 female tiers generated successfully!');
}

run().catch(console.error);
