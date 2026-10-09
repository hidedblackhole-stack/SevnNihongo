// Render banyak still sekaligus (satu bundle):  npx tsx scripts/stills.ts <videoId> <frame> [frame...]
import path from 'node:path';
import fs from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { CP_ROOT } from './common';

const [videoId, ...frames] = process.argv.slice(2);
const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const serveUrl = await bundle({ entryPoint: path.join(CP_ROOT, 'compositions/index.ts'), publicDir: path.join(CP_ROOT, 'public') });
const inputProps = { videoId };
const composition = await selectComposition({ serveUrl, id: 'Video', inputProps, browserExecutable: chrome });
fs.mkdirSync(path.join(CP_ROOT, 'out/stills'), { recursive: true });
for (const f of frames.map(Number)) {
  const output = path.join(CP_ROOT, 'out/stills', `f${String(f).padStart(4, '0')}.png`);
  await renderStill({ composition, serveUrl, frame: f, output, inputProps, browserExecutable: chrome, imageFormat: 'png', scale: 0.4 });
  console.log('ok', f);
}
