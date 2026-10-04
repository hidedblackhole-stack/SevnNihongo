// Rapikan tanda "、" yang salah tempat pada meaningJa hasil isian def_batches (mis. "ある、物事の、中に").
const fs = require('fs'), path = require('path');
const F = path.join(__dirname, '../src/data/db/kotoba.json');
const db = JSON.parse(fs.readFileSync(F, 'utf8'));
const dir = path.join(__dirname, 'def_batches');
const ids = new Set();
for (const f of fs.readdirSync(dir)) for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)) { const k = l.split('|')[0]; if (k) ids.add(db['kotoba_' + k] ? 'kotoba_' + k : k); }
const fix = (s) => { const parts = s.split('、'); if (parts.length < 2) return s; let out = parts[0]; for (let i = 1; i < parts.length; i++) { const sentStart = out.lastIndexOf('。') + 1; const cur = out.length - sentStart; const nxt = parts[i].split('。')[0].length; out += (cur >= 8 && nxt >= 8 ? '、' : '') + parts[i]; } return out; };
let n = 0;
for (const id of ids) { const e = db[id]; if (!e || !e.meaningJa) continue; const c = fix(e.meaningJa); if (c !== e.meaningJa) { e.meaningJa = c; n++; } }
fs.writeFileSync(F, JSON.stringify(db, null, 2) + '\n');
console.log({ changed: n });
