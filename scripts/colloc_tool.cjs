// Bantu isi kolokasi: `node scripts/colloc_tool.cjs list N START COUNT` menampilkan entri tanpa kolokasi,
// `node scripts/colloc_tool.cjs apply file.txt` menerapkan baris "id|kolok1;kolok2;kolok3".
const fs = require('fs'), path = require('path');
const F = path.join(__dirname, '../src/data/db/kotoba.json');
const db = JSON.parse(fs.readFileSync(F, 'utf8'));
const [cmd, a, b, c] = process.argv.slice(2);
const order = ['N5', 'N4', 'Kaigo', 'SSW', 'N3', 'N2', 'N1'];
const empty = () => Object.values(db).filter(x => !x.collocations || !x.collocations.length)
  .sort((p, q) => order.indexOf(p.jlpt) - order.indexOf(q.jlpt));
if (cmd === 'stats') { const c = {}; empty().forEach(x => c[x.jlpt] = (c[x.jlpt] || 0) + 1); console.log(c, empty().length); }
if (cmd === 'list') empty().slice(+a, +a + +b).forEach(x => console.log(`${x.id.replace('kotoba_', '')}|${x.word}|${x.reading}|${x.meaningId}|${x.wordType.replace('adjective-', 'adj-')}`));
if (cmd === 'apply') {
  let n = 0, bad = [];
  for (const l of fs.readFileSync(a, 'utf8').split(/\r?\n/)) {
    if (!l.trim()) continue;
    const i = l.indexOf('|'); const k0 = l.slice(0, i); const id = db['kotoba_' + k0] ? 'kotoba_' + k0 : k0; const cols = l.slice(i + 1).split(';').map(s => s.trim()).filter(Boolean);
    if (!db[id] || cols.length < 2 || cols.some(s => !/\(.+\)$/.test(s))) { bad.push(l.slice(0, 40)); continue; }
    db[id].collocations = cols.slice(0, 3); n++;
  }
  fs.writeFileSync(F, JSON.stringify(db, null, 2) + '\n');
  console.log({ applied: n, bad });
}
