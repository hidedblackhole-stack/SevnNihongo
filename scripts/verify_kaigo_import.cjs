const fs = require('fs');
const path = require('path');

const kotobaDbPath = path.join(__dirname, '../src/data/db/kotoba.json');
const kotobaDb = JSON.parse(fs.readFileSync(kotobaDbPath, 'utf8'));

const allKotoba = Object.values(kotobaDb);
const kaigoItems = allKotoba.filter(item => item.tags && item.tags.includes('Kaigo'));

console.log(`Total Kotoba in DB: ${allKotoba.length}`);
console.log(`Total Kaigo Items (tagged 'Kaigo'): ${kaigoItems.length}`);

// Verify exactly 366
if (kaigoItems.length !== 366) {
  console.error(`ERROR: Expected 366 Kaigo items, but got ${kaigoItems.length}`);
  process.exit(1);
}

// Unit breakdown
const unitCounts = {};
const levelCounts = {};

for (const item of kaigoItems) {
  const unit = item.unitName || 'Unknown';
  unitCounts[unit] = (unitCounts[unit] || 0) + 1;
  levelCounts[item.jlpt] = (levelCounts[item.jlpt] || 0) + 1;
}

console.log('\nKaigo JLPT Level Breakdown:');
console.table(levelCounts);

console.log('\nKaigo Units Breakdown:');
console.table(unitCounts);

console.log('\nSample Kaigo Item from Existing JLPT:');
const existingKaigo = kaigoItems.find(k => k.id.startsWith('kotoba_n2') || k.id.startsWith('kotoba_1'));
console.log(existingKaigo);

console.log('\nSample Brand-New Kaigo Item:');
const newKaigo = kaigoItems.find(k => k.id.startsWith('kotoba_kaigo'));
console.log(newKaigo);

console.log('\nVerification PASSED successfully!');
