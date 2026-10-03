/**
 * Satu kata = satu identitas. Menggabungkan entri kotoba ganda (word + reading sama) di src/data/db/kotoba.json:
 *  - pilih entri kanonik: `kotoba_NNNN` (utama) bila ada, selain itu entri dengan JLPT paling mudah
 *  - JLPT entri kanonik diset ke yang paling mudah di antara duplikat; field kosong diisi dari duplikat; tags di-union
 *  - duplikat dihapus, peta alias ditulis ke src/data/db/kotoba_aliases.json (dipakai canonicalEntityId + lookup DB)
 *  - referensi di data/world/stages.json dan db/sentence_links.json ditulis ulang (+ de-duplikasi dalam satu stage)
 * Grup berlabel SSW (kotoba_ssw_*) sengaja TIDAK digabung: membawa tag/unit vertikal sendiri.
 *
 * Pakai: node scripts/dedupe_kotoba_identity.cjs [--dry]
 */
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const DB = path.join(__dirname, '..', 'src', 'data', 'db');
const KOTOBA = path.join(DB, 'kotoba.json');
const ALIASES = path.join(DB, 'kotoba_aliases.json');
const STAGES = path.join(__dirname, '..', 'src', 'data', 'world', 'stages.json');
const LINKS = path.join(DB, 'sentence_links.json');

const kotoba = JSON.parse(fs.readFileSync(KOTOBA, 'utf8'));
const existingAliases = fs.existsSync(ALIASES) ? JSON.parse(fs.readFileSync(ALIASES, 'utf8')) : {};
const RANK = { N5: 5, N4: 4, N3: 3, N2: 2, N1: 1 };
const easiest = (items) => items.map((x) => x.jlpt).filter((j) => RANK[j]).sort((a, b) => RANK[b] - RANK[a])[0];

const groups = new Map();
for (const item of Object.values(kotoba)) {
  const key = `${item.word}|${item.reading}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(item);
}

const aliases = { ...existingAliases };
const report = [];
for (const items of groups.values()) {
  if (items.length < 2) continue;
  if (items.some((x) => x.id.startsWith('kotoba_ssw_'))) continue;

  const numeric = items.find((x) => /^kotoba_[0-9]+$/.test(x.id));
  const canonical = numeric || [...items].sort((a, b) => (RANK[b.jlpt] || 0) - (RANK[a.jlpt] || 0))[0];
  const dupes = items.filter((x) => x !== canonical);

  const level = easiest(items);
  if (level) canonical.jlpt = level;
  for (const d of dupes) {
    for (const f of ['definitionId', 'meaningJaId', 'meaningJa', 'exampleSentence', 'unitName']) {
      if (!canonical[f] && d[f]) canonical[f] = d[f];
    }
    for (const f of ['collocations', 'relatedWords', 'kanjiComponents']) {
      if ((!canonical[f] || canonical[f].length === 0) && d[f] && d[f].length) canonical[f] = d[f];
    }
    if (d.tags || canonical.tags) canonical.tags = [...new Set([...(canonical.tags || []), ...(d.tags || [])])];
    aliases[d.id] = canonical.id;
    delete kotoba[d.id];
  }
  report.push(`${canonical.word} → ${canonical.id} (${canonical.jlpt}) ⟵ ${dupes.map((d) => d.id).join(', ')}`);
}

const resolve = (id) => aliases[id] || id;

// stages.json: tulis ulang referensi kotoba + de-duplikasi dalam satu stage
const stages = JSON.parse(fs.readFileSync(STAGES, 'utf8'));
let stageRewrites = 0;
for (const s of Object.values(stages)) {
  if (!Array.isArray(s.kotoba)) continue;
  const next = [...new Set(s.kotoba.map(resolve))];
  if (next.length !== s.kotoba.length || next.some((id, i) => id !== s.kotoba[i])) stageRewrites++;
  s.kotoba = next;
}

// sentence_links.json (tanpa konsumen runtime, dijaga tetap konsisten)
let linkRewrites = 0;
let links = null;
if (fs.existsSync(LINKS)) {
  links = JSON.parse(fs.readFileSync(LINKS, 'utf8'));
  for (const l of links.sentence_vocabulary || []) {
    const id = resolve(l.vocabulary_id);
    if (id !== l.vocabulary_id) { l.vocabulary_id = id; linkRewrites++; }
  }
}

console.log(`grup digabung: ${report.length}, alias total: ${Object.keys(aliases).length}, entri kotoba: ${Object.keys(kotoba).length}`);
console.log(`stage ditulis ulang: ${stageRewrites}, tautan kalimat ditulis ulang: ${linkRewrites}`);
console.log(report.join('\n'));

if (!DRY) {
  fs.writeFileSync(KOTOBA, JSON.stringify(kotoba, null, 2) + '\n');
  fs.writeFileSync(ALIASES, JSON.stringify(aliases, null, 2) + '\n');
  fs.writeFileSync(STAGES, JSON.stringify(stages, null, 2) + '\n');
  if (links) fs.writeFileSync(LINKS, JSON.stringify(links, null, 2) + '\n');
  console.log('ditulis.');
}
