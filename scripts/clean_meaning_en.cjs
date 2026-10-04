// Rapikan meaningEn: hilangkan penomoran "(1) ... (2) ...", batasi maksimal 3 gloss per entri.
const fs = require('fs'), path = require('path');
const F = path.join(__dirname, '../src/data/db/kotoba.json');
const db = JSON.parse(fs.readFileSync(F, 'utf8'));
const clean = (s) => {
  if (!s) return s;
  const senses = s.split(/\s*\(\d+\)\s*/).map(t => t.trim()).filter(Boolean)
    .map(t => t.split(/\s*;\s*/).map(g => g.trim().replace(/[,;]+$/, '')).filter(Boolean));
  if (!senses.length) return s;
  const splitTop = (t) => t.split(/,\s*(?![^()]*\))/).map(x => x.trim()).filter(Boolean);
  for (const sn of senses) if (sn.length === 1 && sn[0].includes(",")) { const p = splitTop(sn[0]); if (p.length > 3) sn.splice(0, 1, ...p); }
  let out = [];
  if (senses.length === 1) out = senses[0].slice(0, 3);
  else { out = senses[0].slice(0, 2); for (const sn of senses.slice(1)) { if (out.length >= 3) break; out.push(sn[0]); } }
  out = out.filter((g, i) => out.indexOf(g) === i);
  return out.join('; ');
};
let n = 0;
for (const e of Object.values(db)) { const c = clean(e.meaningEn); if (c !== e.meaningEn) { e.meaningEn = c; n++; } }
fs.writeFileSync(F, JSON.stringify(db, null, 2) + '\n');
console.log({ changed: n });
