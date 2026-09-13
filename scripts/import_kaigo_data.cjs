const fs = require('fs');
const path = require('path');

const kotobaDbPath = path.join(__dirname, '../src/data/db/kotoba.json');
const kotobaDb = JSON.parse(fs.readFileSync(kotobaDbPath, 'utf8'));

const xmlPath = path.join(__dirname, '../scratch/xlsx_extracted/xl/worksheets/sheet1.xml');
const xml = fs.readFileSync(xmlPath, 'utf8');
const rowMatches = xml.match(/<row r="(\d+)"[\s\S]*?<\/row>/g) || [];

function decodeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseRow(rowStr) {
  const cells = {};
  const cMatches = rowStr.match(/<c r="([A-Z]+)(\d+)"[\s\S]*?<\/c>/g) || [];
  for (const c of cMatches) {
    const colMatch = c.match(/r="([A-Z]+)\d+"/);
    if (!colMatch) continue;
    const col = colMatch[1];
    const tMatch = c.match(/<t[^>]*>([\s\S]*?)<\/t>/);
    const vMatch = c.match(/<v>([\s\S]*?)<\/v>/);
    let val = '';
    if (tMatch) val = tMatch[1];
    else if (vMatch) val = vMatch[1];
    cells[col] = decodeHtml(val.trim());
  }
  return cells;
}

// Map existing items by word
const wordToExisting = new Map();
for (const [id, item] of Object.entries(kotobaDb)) {
  wordToExisting.set(item.word, { id, item });
}

let updatedExistingCount = 0;
let brandNewCount = 0;

for (let i = 1; i < rowMatches.length; i++) {
  const row = parseRow(rowMatches[i]);
  const no = parseInt(row.A, 10);
  const unitNo = parseInt(row.B, 10);
  const unitName = row.C;
  const kanji = row.D;
  const readingRaw = row.E;
  const meaningId = row.F;
  const furigana = row.G;

  let primaryReading = readingRaw;
  let secondaryReading = '';
  if (readingRaw.includes('/')) {
    const parts = readingRaw.split('/').map(s => s.trim());
    primaryReading = parts[0];
    secondaryReading = parts[1];
  }

  // Kanji components
  const kanjiChars = Array.from(new Set(kanji.match(/[\u4E00-\u9FAF]/g) || []));

  // Word type
  let wordType = 'noun';
  if (kanji.endsWith('い') && !kanji.endsWith('しい') && !kanji.endsWith('ない')) {
    wordType = 'adjective-i';
  } else if (kanji.endsWith('な')) {
    wordType = 'adjective-na';
  } else if (/[うくぐすつぬぶむる]$/.test(kanji) && kanji.length > 1 && !kanjiChars.includes(kanji.slice(-1))) {
    wordType = 'verb';
  }

  if (wordToExisting.has(kanji)) {
    const { id, item } = wordToExisting.get(kanji);
    const tags = new Set(item.tags || []);
    tags.add('Kaigo');
    tags.add(unitName);
    item.tags = Array.from(tags);
    item.unitName = unitName;
    
    // If meaningJa was just the word itself, enhance it with furigana/simple reading
    if (!item.meaningJa || item.meaningJa === item.word) {
      item.meaningJa = furigana || primaryReading;
    }
    
    // If meaningId was english (e.g. contains English chars and no id or is a known stub)
    if (/[a-zA-Z]{3,}/.test(item.meaningId) && !item.meaningId.includes('(')) {
      if (!item.meaningEn) item.meaningEn = item.meaningId;
      item.meaningId = meaningId;
    }

    updatedExistingCount++;
  } else {
    const newId = `kotoba_kaigo_${String(no).padStart(4, '0')}`;
    
    // Create sensible caregiving collocations and example sentences
    const cleanMeaning = meaningId.toLowerCase();
    const collocations = [
      `${kanji}の記録 (${kanji} no kiroku - catatan ${cleanMeaning})`,
      `${kanji}を確認する (${kanji} wo kakunin suru - memeriksa ${cleanMeaning})`,
      `${kanji}の介助 (${kanji} no kaijo - bantuan ${cleanMeaning})`
    ];

    const newItem = {
      id: newId,
      word: kanji,
      reading: primaryReading,
      meaningId: meaningId,
      meaningEn: "",
      meaningJa: furigana || primaryReading,
      jlpt: "Kaigo",
      wordType: wordType,
      kanjiComponents: kanjiChars,
      tags: ["Kaigo", unitName],
      unitName: unitName,
      collocations: collocations,
      exampleSentence: {
        japanese: `利用者の${kanji}に注意します。`,
        reading: `りようしゃの${primaryReading}にちゅういします。`,
        meaningId: `Memperhatikan ${cleanMeaning} pengguna layanan.`
      }
    };

    kotobaDb[newId] = newItem;
    brandNewCount++;
  }
}

console.log(`Updated existing items: ${updatedExistingCount}`);
console.log(`Added brand new items: ${brandNewCount}`);
console.log(`Total Kotoba in DB now: ${Object.keys(kotobaDb).length}`);

// Write back to kotoba.json
fs.writeFileSync(kotobaDbPath, JSON.stringify(kotobaDb, null, 2), 'utf8');
console.log('Successfully saved to src/data/db/kotoba.json!');
