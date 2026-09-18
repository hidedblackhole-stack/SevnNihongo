import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';

async function processImage(inputPath, outputPath) {
  const image = await Jimp.read(inputPath);
  
  // Create output dir if not exists
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Scan pixels and convert near-white/background to transparent
  // We can do a flood fill or threshold:
  image.scan((x, y) => {
    const color = image.getPixelColor(x, y);
    // Jimp getPixelColor returns 32-bit int RGBA
    const r = (color >> 24) & 255;
    const g = (color >> 16) & 255;
    const b = (color >> 8) & 255;

    // If near-white (background of generated sprite is pure white #ffffff or slightly off-white)
    if (r > 240 && g > 240 && b > 240) {
      image.setPixelColor(0x00000000, x, y);
    }
  });

  await image.write(outputPath);
  console.log(`Saved transparent sprite to ${outputPath}`);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (inputPath && outputPath) {
  processImage(inputPath, outputPath).catch(console.error);
}
