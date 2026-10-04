// Tambah kosakata dari scripts/kotoba_expansion/*.txt ke kotoba.json (+ kalimat & tautannya).
// Format baris: kata|bacaan|arti ID|arti EN|JLPT|jenis|kalimat JP|bacaan kalimat|arti kalimat|kolokasi1;kolokasi2;kolokasi3
// Jenis: n v i na adv conj pron int ex ctr num pre suf pn
const fs = require('fs');
const path = require('path');
const DB = path.join(__dirname, '../src/data/db');
const SRC = path.join(__dirname, 'kotoba_expansion');
const TYPES = { n: 'noun', v: 'verb', i: 'adjective-i', na: 'adjective-na', adv: 'adverb', conj: 'conjunction', pron: 'pronoun', int: 'interjection', ex: 'expression', ctr: 'counter', num: 'numeral', pre: 'prefix', suf: 'suffix', pn: 'adjective-pn' };
const JLPT = new Set(['N5', 'N4', 'N3', 'N2', 'N1']);
const isKanji = c => /[\u4e00-\u9fff々]/.test(c);

const kotoba = JSON.parse(fs.readFileSync(path.join(DB, 'kotoba.json'), 'utf8'));
const sentences = JSON.parse(fs.readFileSync(path.join(DB, 'sentences.json'), 'utf8'));
const links = JSON.parse(fs.readFileSync(path.join(DB, 'sentence_links.json'), 'utf8'));
// --prune: buang entri kotoba_x_* yang barisnya sudah dihapus dari sumber .txt
if (process.argv.includes('--reset')) process.argv.push('--prune', '--reset-all');
if (process.argv.includes('--prune')) {
  const wanted = new Set();
  for (const f of fs.readdirSync(SRC).filter(n => n.endsWith('.txt'))) for (const l of fs.readFileSync(path.join(SRC, f), 'utf8').split(/\r?\n/)) if (l && !l.startsWith('#')) wanted.add(l.split('|')[0].trim());
  const gone = new Set(Object.entries(kotoba).filter(([id, x]) => id.startsWith('kotoba_x_') && (process.argv.includes('--reset-all') || !wanted.has(x.word))).map(([id]) => id));
  gone.forEach(id => delete kotoba[id]);
  for (let i = sentences.length - 1; i >= 0; i--) if (gone.has(sentences[i].id.replace('sen_kt_', ''))) sentences.splice(i, 1);
  links.sentence_vocabulary = links.sentence_vocabulary.filter(x => !gone.has(x.vocabulary_id));
  console.log('dibuang', gone.size);
}
const existing = new Set(Object.values(kotoba).map(x => x.word));
const byReading = {};
for (const x of Object.values(kotoba)) (byReading[x.reading || x.word] ||= []).push(x.word);
let counter = Math.max(0, ...Object.keys(kotoba).filter(k => k.startsWith('kotoba_x_')).map(k => +k.slice(9)));
const sentList = Array.isArray(sentences) ? sentences : Object.values(sentences);
const errors = [];
let added = 0, skipped = 0;

for (const f of fs.readdirSync(SRC).filter(n => n.endsWith('.txt')).sort()) {
  fs.readFileSync(path.join(SRC, f), 'utf8').split(/\r?\n/).forEach((line, ln) => {
    if (!line.trim() || line.startsWith('#')) return;
    const p = line.split('|').map(s => s.trim());
    const where = `${f}:${ln + 1}`;
    if (p.length !== 10) return errors.push(`${where} kolom=${p.length} ${p[0]}`);
    const [word, reading, meaningId, meaningEn, jlpt, t, ja, jaRead, jaId, col] = p;
    if (!TYPES[t]) return errors.push(`${where} jenis ${t}`);
    if (!JLPT.has(jlpt)) return errors.push(`${where} jlpt ${jlpt}`);
    if (!/^[\u3040-\u309f\u30a0-\u30ffー・\s]+$/.test(reading) && reading) return errors.push(`${where} bacaan ${reading}`);
    if (!/^[\u3040-\u309fー、。！？「」\s]+$/.test(jaRead.replace(/[A-Za-z0-9]/g, ''))) return errors.push(`${where} bacaan kalimat ${jaRead}`);
    if (!ja.includes(word.replace(/～|〜/g, '')) && !(t === 'v' || t === 'i' || t === 'na')) errors.push(`${where} kalimat tak memuat kata ${word}`);
    if (existing.has(word)) { skipped++; return; }
    const same = byReading[reading || word];
    if (same && !process.argv.includes('--quiet')) console.log(`~ ${word} (${reading}) sudah ada bacaan sama: ${same.join(',')}`);
    existing.add(word);
    const id = `kotoba_x_${String(++counter).padStart(4, '0')}`;
    const item = {
      id, word, reading: /^[\u30a0-\u30ffー・]+$/.test(word) ? '' : reading,
      meaningId, meaningEn, meaningJa: reading || word, jlpt, wordType: TYPES[t],
      kanjiComponents: [...new Set([...word].filter(isKanji))],
      collocations: col.split(';').map(s => s.trim()).filter(Boolean),
      exampleSentence: { japanese: ja, reading: jaRead, meaningId: jaId },
    };
    kotoba[id] = item;
    const sid = `sen_kt_${id}`;
    sentList.push({ id: sid, japanese: ja, reading: jaRead, translation_id: jaId, translation_en: '', source: 'kotoba_database', version: 1 });
    links.sentence_vocabulary.push({ sentence_id: sid, vocabulary_id: id, role: 'target_word' });
    added++;
  });
}
if (errors.length) { console.error(errors.join('\n')); console.error(`${errors.length} masalah`); }
if (process.argv.includes('--write') && !errors.some(e => !e.includes('tak memuat'))) {
  fs.writeFileSync(path.join(DB, 'kotoba.json'), JSON.stringify(kotoba, null, 2) + '\n');
  fs.writeFileSync(path.join(DB, 'sentences.json'), JSON.stringify(Array.isArray(sentences) ? sentList : Object.fromEntries(sentList.map((s, i) => [i, s])), null, 2) + '\n');
  fs.writeFileSync(path.join(DB, 'sentence_links.json'), JSON.stringify(links, null, 2) + '\n');
  console.log('ditulis');
}
console.log({ added, skipped });
