const fs = require('fs');
const path = require('path');

const OFFICIAL_DIR = path.join(__dirname, '..', 'src', 'data', 'tryouts', 'official');
const MANIFEST_PATH = path.join(OFFICIAL_DIR, 'manifest.json');
const INDEX_PATH = path.join(OFFICIAL_DIR, 'index.ts');
const JFT_PATH = path.join(__dirname, '..', 'src', 'data', 'tryouts', 'jft_001.json');

// Base package counters per level:
// N1 already has n1_001 (Paket 001) -> starts at 2
// N2 already has n2_001, n2_002, n2_003 (Paket 001-003) -> starts at 4
// N3 already has n3_001, n3_002 (Paket 001-002) -> starts at 3
const packageCounters = {
  N1: 2,
  N2: 4,
  N3: 3
};

// 1. Read manifest.json
const rawManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

// Update each manifest entry
const updatedManifest = rawManifest.map((item) => {
  const lvl = item.level;
  const num = packageCounters[lvl]++;
  const code = String(num).padStart(3, '0');
  const title = `Simulasi ${lvl} — Paket ${code}`;

  const jsonFilePath = path.join(OFFICIAL_DIR, `${item.id}.json`);
  if (fs.existsSync(jsonFilePath)) {
    const fileData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
    fileData.title = title;
    fileData.code = code;
    delete fileData.year;
    delete fileData.month;
    fs.writeFileSync(jsonFilePath, JSON.stringify(fileData, null, 2), 'utf-8');
    console.log(`Updated file: ${item.id}.json -> ${title} (${code})`);
  } else {
    console.warn(`File not found: ${jsonFilePath}`);
  }

  const newEntry = {
    id: item.id,
    level: item.level,
    title,
    code,
    totalQuestions: item.totalQuestions,
    fileName: item.fileName,
    filePath: item.filePath
  };

  return newEntry;
});

// Write updated manifest
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(updatedManifest, null, 2), 'utf-8');
console.log('Updated manifest.json');

// 2. Generate updated index.ts
const lines = [
  `// Auto-generated JLPT exam simulation packages`,
  `import { TryOutMeta } from '../index';`,
  `import { TryOutData } from '../../../types/content';`,
  ``
];

updatedManifest.forEach((m) => {
  lines.push(`import ${m.id} from './${m.id}.json';`);
});

lines.push(``);
lines.push(`export const OFFICIAL_TRYOUTS: TryOutMeta[] = [`);

updatedManifest.forEach((m) => {
  lines.push(`  {`);
  lines.push(`    id: '${m.id}',`);
  lines.push(`    level: '${m.level}',`);
  lines.push(`    title: '${m.title}',`);
  lines.push(`    code: '${m.code}',`);
  lines.push(`    totalQuestions: (${m.id}.sections.mojiGoi?.questions?.length || 0) + (${m.id}.sections.bunpouDokkai?.questions?.length || 0) + (${m.id}.sections.choukai?.questions?.length || 0),`);
  lines.push(`    data: ${m.id} as unknown as TryOutData`);
  lines.push(`  },`);
});

lines.push(`];`);
lines.push(``);

fs.writeFileSync(INDEX_PATH, lines.join('\n'), 'utf-8');
console.log('Updated index.ts');

// 3. Update jft_001.json
if (fs.existsSync(JFT_PATH)) {
  const jftData = JSON.parse(fs.readFileSync(JFT_PATH, 'utf-8'));
  jftData.title = 'Simulasi JFT-Basic — Paket 001';
  jftData.code = '001';
  fs.writeFileSync(JFT_PATH, JSON.stringify(jftData, null, 2), 'utf-8');
  console.log('Updated jft_001.json');
}

console.log('All tryout data files sanitized successfully!');
