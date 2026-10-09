// Render video:  npx tsx scripts/render.ts <videoId> [--still <frame>]   → out/<videoId>.mp4 (atau out/<videoId>-f<frame>.png)
import path from 'node:path';
import fs from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { CP_ROOT, fail } from './common';

const [videoId, flag, frameArg] = process.argv.slice(2);
if (!videoId) fail('Pemakaian: tsx scripts/render.ts <videoId> [--still <frame>]');
if (!fs.existsSync(path.join(CP_ROOT, 'public/video-data', `${videoId}.json`))) fail('Belum ada data video. Jalankan: npm run generate');

const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const serveUrl = await bundle({ entryPoint: path.join(CP_ROOT, 'compositions/index.ts'), publicDir: path.join(CP_ROOT, 'public') });
const inputProps = { videoId };
const composition = await selectComposition({ serveUrl, id: 'Video', inputProps, browserExecutable: chrome });
fs.mkdirSync(path.join(CP_ROOT, 'out'), { recursive: true });

if (flag === '--still') {
  const frame = Number(frameArg ?? 0);
  const output = path.join(CP_ROOT, 'out', `${videoId}-f${String(frame).padStart(4, '0')}.png`);
  await renderStill({ composition, serveUrl, frame, output, inputProps, browserExecutable: chrome, imageFormat: 'png' });
  console.log(`✓ still → ${output}`);
} else {
  const output = path.join(CP_ROOT, 'out', `${videoId}.mp4`);
  let last = -1;
  await renderMedia({
    composition, serveUrl, codec: 'h264', outputLocation: output, inputProps, browserExecutable: chrome,
    onProgress: ({ progress }) => { const pct = Math.floor(progress * 10); if (pct !== last) { last = pct; console.log(`  render ${pct * 10}%`); } },
  });
  console.log(`✓ video → ${output} (${composition.durationInFrames} frame, ${composition.width}x${composition.height})`);
}
