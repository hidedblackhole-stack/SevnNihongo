// Rapikan tanda "、" yang salah tempat pada meaningJa hasil isian def_batches (mis. "ある、物事の、中に").
const fs = require('fs'), path = require('path');
const F = path.join(__dirname, '../src/data/db/kotoba.json');
const db = JSON.parse(fs.readFileSync(F, 'utf8'));
const dir = path.join(__dirname, 'def_batches');
const ids = new Set();
for (const f of fs.readdirSync(dir)) for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)) { const k = l.split('|')[0]; if (k) ids.add(db['kotoba_' + k] ? 'kotoba_' + k : k); }
const fix = (s) => s.replace(/([のをにでがはもへとからよりため])、/g, '$1').replace(/([ぁ-んァ-ヶ一-龥]{1,3})、([ぁ-んァ-ヶ一-龥]{1,3})(?=、|。|$)/g, '$1$2');
let n = 0;
for (const id of ids) { const e = db[id]; if (!e || !e.meaningJa) continue; const c = fix(e.meaningJa); if (c !== e.meaningJa) { e.meaningJa = c; n++; } }
fs.writeFileSync(F, JSON.stringify(db, null, 2) + '\n');
console.log({ changed: n });
