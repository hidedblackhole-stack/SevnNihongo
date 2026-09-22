const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'public', 'data', 'kanji-strokes');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const kdb = require('../src/data/db/kanji.json');
const allChars = Array.from(new Set(Object.values(kdb).map(k => k.character || k.kanji).filter(Boolean)));

console.log(`Total unique kanji to bundle: ${allChars.length}`);

const sourceHanziDir = path.join(__dirname, '..', 'node_modules', 'hanzi-writer-data');

let fromLocal = 0;
let neededDownload = [];

for (const char of allChars) {
  const localFile = path.join(sourceHanziDir, `${char}.json`);
  const targetFileChar = path.join(targetDir, `${char}.json`);
  const hex = char.charCodeAt(0).toString(16).toLowerCase();
  const targetFileHex = path.join(targetDir, `${hex}.json`);

  if (fs.existsSync(localFile)) {
    const data = fs.readFileSync(localFile, 'utf8');
    fs.writeFileSync(targetFileChar, data);
    fs.writeFileSync(targetFileHex, data);
    fromLocal++;
  } else {
    neededDownload.push(char);
  }
}

console.log(`Copied ${fromLocal} kanji from local hanzi-writer-data.`);
console.log(`Downloading ${neededDownload.length} Japanese-specific kanji variants...`);

async function downloadVariant(char) {
  const hex = char.charCodeAt(0).toString(16).toLowerCase();
  const targetFileChar = path.join(targetDir, `${char}.json`);
  const targetFileHex = path.join(targetDir, `${hex}.json`);

  if (fs.existsSync(targetFileChar)) return;

  const mirrors = [
    `https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0.0.1/${encodeURIComponent(char)}.json`,
    `https://unpkg.com/hanzi-writer-data-jp@0.0.1/${encodeURIComponent(char)}.json`,
    `https://fastly.jsdelivr.net/npm/hanzi-writer-data-jp@0.0.1/${encodeURIComponent(char)}.json`,
    `https://cdn.jsdelivr.net/gh/MadLadSquad/hanzi-writer-data-youyin/data/${encodeURIComponent(char)}.json`
  ];

  for (const url of mirrors) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const text = await res.text();
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.strokes)) {
          fs.writeFileSync(targetFileChar, text);
          fs.writeFileSync(targetFileHex, text);
          return true;
        }
      }
    } catch {
      // try next mirror
    }
  }
  console.warn(`Could not download stroke data for: ${char}`);
  return false;
}

async function run() {
  const batchSize = 15;
  for (let i = 0; i < neededDownload.length; i += batchSize) {
    const batch = neededDownload.slice(i, i + batchSize);
    await Promise.all(batch.map(downloadVariant));
    process.stdout.write(`\rProgress: ${Math.min(i + batchSize, neededDownload.length)} / ${neededDownload.length}`);
  }
  console.log('\nKanji stroke bundling complete!');
}

run().catch(console.error);
