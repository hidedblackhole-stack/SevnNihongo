// Bantu isi definisi: `node scripts/def_tool.cjs stats` | `list START COUNT` (entri tanpa definitionId)
// | `apply file.txt` menerapkan baris "id|definisi Jepang|definisi Indonesia" ke meaningJa, definitionId, meaningJaId.
const fs = require('fs'), path = require('path');
const F = path.join(__dirname, '../src/data/db/kotoba.json');
const db = JSON.parse(fs.readFileSync(F, 'utf8'));
const [cmd, a, b] = process.argv.slice(2);
const order = ['N5', 'N4', 'Kaigo', 'SSW', 'N3', 'N2', 'N1'];
const todo = () => Object.values(db).filter(x => !x.definitionId)
  .sort((p, q) => order.indexOf(p.jlpt) - order.indexOf(q.jlpt));
if (cmd === 'stats') { const c = {}; todo().forEach(x => c[x.jlpt] = (c[x.jlpt] || 0) + 1); console.log(c, todo().length); }
if (cmd === 'list') todo().slice(+a, +a + +b).forEach(x => console.log(`${x.id.replace('kotoba_', '')}|${x.word}|${x.reading}|${x.meaningId}|${x.meaningEn}|${x.wordType.replace('adjective-', 'adj-')}`));
if (cmd === 'apply') {
  let n = 0; const bad = [];
  for (const l of fs.readFileSync(a, 'utf8').split(/\r?\n/)) {
    if (!l.trim()) continue;
    const p = l.split('|'); const id = db['kotoba_' + p[0]] ? 'kotoba_' + p[0] : p[0];
    const [, ja, idn] = p.map(s => s && s.trim());
    if (p.length !== 3 || !db[id] || !ja || !idn || ja.length < 4 || idn.length < 8) { bad.push(l.slice(0, 40)); continue; }
    db[id].meaningJa = ja; db[id].definitionId = idn; db[id].meaningJaId = idn; n++;
  }
  fs.writeFileSync(F, JSON.stringify(db, null, 2) + '\n');
  console.log({ applied: n, bad });
}
