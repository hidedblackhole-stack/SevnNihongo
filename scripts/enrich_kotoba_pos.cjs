/**
 * Mengisi `wordType` (part of speech) di src/data/db/kotoba.json dari tag POS JMdict.
 *
 * Pakai:  node scripts/enrich_kotoba_pos.cjs <path/jmdict-eng-*.json> [--dry]
 * JMdict: https://github.com/scriptin/jmdict-simplified/releases (jmdict-eng-*.json)
 *
 * Pencocokan: kata (kanji atau kana) + bacaan -> entri JMdict; sense dipilih dari kemiripan gloss
 * dengan `meaningEn`. Tag POS sense dipetakan ke WordType. Entri tanpa pasangan diklasifikasi
 * heuristik (gloss "to ..." => verb, dst.) dan dilaporkan.
 */
const fs = require('fs');
const path = require('path');

const jmPath = process.argv[2];
const DRY = process.argv.includes('--dry');
if (!jmPath) { console.error('usage: node scripts/enrich_kotoba_pos.cjs <jmdict.json> [--dry]'); process.exit(1); }

const KOTOBA = path.join(__dirname, '..', 'src', 'data', 'db', 'kotoba.json');
const jm = JSON.parse(fs.readFileSync(jmPath, 'utf8'));
const kotoba = JSON.parse(fs.readFileSync(KOTOBA, 'utf8'));

// ---- index JMdict: teks (kanji/kana) -> entri ----
const index = new Map();
const add = (k, e) => { if (!index.has(k)) index.set(k, []); index.get(k).push(e); };
for (const e of jm.words) {
  for (const k of e.kanji) add(k.text, e);
  for (const k of e.kana) add(k.text, e);
}

// ---- tag JMdict -> WordType (urutan tag di sense = urutan prioritas JMdict) ----
function mapTag(t) {
  if (["vk", "vz", "vn", "vr", "v-unspec"].includes(t) || /^v(1|5)/.test(t) || /^vs-[sci]$/.test(t)) return "verb";
  if (t === 'adj-i' || t === 'adj-ix') return 'adjective-i';
  if (t === 'adj-na') return 'adjective-na';
  if (t === 'adv' || t === 'adv-to') return 'adverb';
  if (t === 'conj') return 'conjunction';
  if (t === 'prt') return 'particle';
  if (t === 'pn') return 'pronoun';
  if (t === 'ctr') return 'counter';
  if (t === 'int') return 'interjection';
  if (t === 'exp') return 'expression';
  if (t === 'pref' || t === 'n-pref') return 'prefix';
  if (t === 'suf' || t === 'n-suf') return 'suffix';
  if (t === 'num') return 'numeral';
  if (t === 'adj-pn') return 'adjective-pn';
  if (t === 'aux-v' || t === 'aux-adj' || t === 'aux' || t === 'cop') return 'auxiliary';
  if (t === 'n' || t === 'n-t' || t === 'n-adv' || t === 'n-pr' || t === 'adj-no' || t === 'vs' || t === 'adj-f') return 'noun';
  return null;
}
function typeOfSense(sense) {
  for (const t of sense.partOfSpeech) { const m = mapTag(t); if (m) return m; }
  return null;
}

const norm = (s) => (s || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const kataToHira = (s) => (s || '').replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

function candidatesFor(item) {
  const forms = new Set();
  for (const part of String(item.word).split(/\s*[\/／、,]\s*/)) {
    const w = part.replace(/[〜～~\s]/g, '').trim();
    if (w) forms.add(w);
  }
  return [...forms];
}

function classify(item) {
  const readings = new Set(String(item.reading || '').split(/\s*[\/／、,]\s*/).map((r) => kataToHira(r.replace(/[〜～~\s]/g, ''))));
  const gloss = norm(item.meaningEn);
  let best = null;
  for (const form of candidatesFor(item)) {
    for (const e of index.get(form) || []) {
      const kanaHit = e.kana.some((k) => readings.has(kataToHira(k.text)));
      for (const s of e.sense) {
        const type = typeOfSense(s);
        if (!type) continue;
        let score = 0;
        for (const g of s.gloss) { const n = norm(g.text); if (n && gloss && (gloss.includes(n) || n.includes(gloss))) score += 3; }
        if (kanaHit) score += 4; else if (readings.size && !e.kana.some((k) => readings.has(kataToHira(k.text)))) score -= 2;
        if (e.kanji.some((k) => k.text === form && k.common) || e.kana.some((k) => k.common)) score += 1;
        if (!best || score > best.score) best = { score, type, tags: s.partOfSpeech };
      }
    }
  }
  return best;
}

// ---- fallback heuristik bila JMdict tidak punya pasangan ----
function heuristic(item) {
  const w = String(item.word).split(/\s*\/\s*/)[0];
  const g = String(item.meaningEn || '').replace(/^\(\d\)\s*/, '').replace(/^\([a-z, ]+\)\s*/i, '');
  if (/^to [a-z]/i.test(g) && /[うくぐすつぬぶむる]$/.test(w)) return 'verb';
  if (/する$/.test(w) && /^to /i.test(g)) return 'verb';
  return null;
}

// Koreksi manual untuk entri yang tidak ada di JMdict (ejaan tak baku / frasa)
const OVERRIDES = {
  'ゆっくりと': 'adverb', 'しいんと': 'adverb', 'やたらに': 'adverb', '矢鱈に': 'adverb',
  '泌み泌み': 'adverb', '煌々と': 'adverb', '一段と': 'adverb',
  'よると': 'expression', 'おまちください': 'expression', '其れ共': 'conjunction',
  '厭やらしい': 'adjective-i', '嫋か': 'adjective-na', '怪やふや': 'adjective-na',
};

const stats = {}; const before = {}; const unmatched = []; const changed = [];
for (const item of Object.values(kotoba)) {
  before[item.wordType] = (before[item.wordType] || 0) + 1;
  const hit = OVERRIDES[item.word] ? null : classify(item);
  let next = OVERRIDES[item.word] || (hit ? hit.type : heuristic(item));
  if (!next) { next = item.wordType === 'noun' ? 'noun' : item.wordType; unmatched.push(item.word + ' | ' + item.meaningEn); }
  stats[next] = (stats[next] || 0) + 1;
  if (next !== item.wordType) changed.push(`${item.word}: ${item.wordType} -> ${next}`);
  item.wordType = next;
}
console.log('before', before);
console.log('after ', stats);
console.log('changed', changed.length, 'unmatched(kept)', unmatched.length);
console.log('sample changes:', changed.filter((_, i) => i % 250 === 0).slice(0, 30));
console.log('sample unmatched:', unmatched.slice(0, 25));
if (!DRY) { fs.writeFileSync(KOTOBA, JSON.stringify(kotoba, null, 2) + '\n'); console.log('written', KOTOBA); }
