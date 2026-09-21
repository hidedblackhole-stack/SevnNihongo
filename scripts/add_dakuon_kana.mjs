import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KANJI_JSON_PATH = path.join(__dirname, '../src/data/db/kanji.json');

const rawData = JSON.parse(fs.readFileSync(KANJI_JSON_PATH, 'utf-8'));

const dakuonList = [
  // Hiragana Dakuon (Tengteng - 20)
  { id: 'kana_hira_ga', char: 'が', romaji: 'ga', stroke: 5, radical: 'Hiragana', u: 'U+304C' },
  { id: 'kana_hira_gi', char: 'ぎ', romaji: 'gi', stroke: 6, radical: 'Hiragana', u: 'U+304E' },
  { id: 'kana_hira_gu', char: 'ぐ', romaji: 'gu', stroke: 3, radical: 'Hiragana', u: 'U+3050' },
  { id: 'kana_hira_ge', char: 'げ', romaji: 'ge', stroke: 5, radical: 'Hiragana', u: 'U+3052' },
  { id: 'kana_hira_go', char: 'ご', romaji: 'go', stroke: 4, radical: 'Hiragana', u: 'U+3054' },
  { id: 'kana_hira_za', char: 'ざ', romaji: 'za', stroke: 5, radical: 'Hiragana', u: 'U+3056' },
  { id: 'kana_hira_ji', char: 'じ', romaji: 'ji', stroke: 3, radical: 'Hiragana', u: 'U+3058' },
  { id: 'kana_hira_zu', char: 'ず', romaji: 'zu', stroke: 4, radical: 'Hiragana', u: 'U+305A' },
  { id: 'kana_hira_ze', char: 'ぜ', romaji: 'ze', stroke: 5, radical: 'Hiragana', u: 'U+305C' },
  { id: 'kana_hira_zo', char: 'ぞ', romaji: 'zo', stroke: 3, radical: 'Hiragana', u: 'U+305E' },
  { id: 'kana_hira_da', char: 'だ', romaji: 'da', stroke: 6, radical: 'Hiragana', u: 'U+3060' },
  { id: 'kana_hira_dji', char: 'ぢ', romaji: 'ji', stroke: 4, radical: 'Hiragana', u: 'U+3062' },
  { id: 'kana_hira_dzu', char: 'づ', romaji: 'zu', stroke: 3, radical: 'Hiragana', u: 'U+3065' },
  { id: 'kana_hira_de', char: 'で', romaji: 'de', stroke: 3, radical: 'Hiragana', u: 'U+3067' },
  { id: 'kana_hira_do', char: 'ど', romaji: 'do', stroke: 4, radical: 'Hiragana', u: 'U+3069' },
  { id: 'kana_hira_ba', char: 'ば', romaji: 'ba', stroke: 5, radical: 'Hiragana', u: 'U+3070' },
  { id: 'kana_hira_bi', char: 'び', romaji: 'bi', stroke: 3, radical: 'Hiragana', u: 'U+3073' },
  { id: 'kana_hira_bu', char: 'ぶ', romaji: 'bu', stroke: 6, radical: 'Hiragana', u: 'U+3076' },
  { id: 'kana_hira_be', char: 'べ', romaji: 'be', stroke: 3, radical: 'Hiragana', u: 'U+3079' },
  { id: 'kana_hira_bo', char: 'ぼ', romaji: 'bo', stroke: 6, radical: 'Hiragana', u: 'U+307C' },

  // Hiragana Handakuon (Maru - 5)
  { id: 'kana_hira_pa', char: 'ぱ', romaji: 'pa', stroke: 4, radical: 'Hiragana', u: 'U+3071' },
  { id: 'kana_hira_pi', char: 'ぴ', romaji: 'pi', stroke: 2, radical: 'Hiragana', u: 'U+3074' },
  { id: 'kana_hira_pu', char: 'ぷ', romaji: 'pu', stroke: 5, radical: 'Hiragana', u: 'U+3077' },
  { id: 'kana_hira_pe', char: 'ぺ', romaji: 'pe', stroke: 2, radical: 'Hiragana', u: 'U+307A' },
  { id: 'kana_hira_po', char: 'ぽ', romaji: 'po', stroke: 5, radical: 'Hiragana', u: 'U+307D' },

  // Katakana Dakuon (Tengteng - 20)
  { id: 'kana_kata_ga', char: 'ガ', romaji: 'ga', stroke: 4, radical: 'Katakana', u: 'U+30AC' },
  { id: 'kana_kata_gi', char: 'ギ', romaji: 'gi', stroke: 5, radical: 'Katakana', u: 'U+30AE' },
  { id: 'kana_kata_gu', char: 'グ', romaji: 'gu', stroke: 4, radical: 'Katakana', u: 'U+30B0' },
  { id: 'kana_kata_ge', char: 'ゲ', romaji: 'ge', stroke: 5, radical: 'Katakana', u: 'U+30B2' },
  { id: 'kana_kata_go', char: 'ゴ', romaji: 'go', stroke: 4, radical: 'Katakana', u: 'U+30B4' },
  { id: 'kana_kata_za', char: 'ザ', romaji: 'za', stroke: 5, radical: 'Katakana', u: 'U+30B6' },
  { id: 'kana_kata_ji', char: 'ジ', romaji: 'ji', stroke: 5, radical: 'Katakana', u: 'U+30B8' },
  { id: 'kana_kata_zu', char: 'ズ', romaji: 'zu', stroke: 4, radical: 'Katakana', u: 'U+30BA' },
  { id: 'kana_kata_ze', char: 'ゼ', romaji: 'ze', stroke: 4, radical: 'Katakana', u: 'U+30BC' },
  { id: 'kana_kata_zo', char: 'ゾ', romaji: 'zo', stroke: 4, radical: 'Katakana', u: 'U+30BE' },
  { id: 'kana_kata_da', char: 'ダ', romaji: 'da', stroke: 5, radical: 'Katakana', u: 'U+30C0' },
  { id: 'kana_kata_dji', char: 'ヂ', romaji: 'ji', stroke: 5, radical: 'Katakana', u: 'U+30C2' },
  { id: 'kana_kata_dzu', char: 'ヅ', romaji: 'zu', stroke: 5, radical: 'Katakana', u: 'U+30C5' },
  { id: 'kana_kata_de', char: 'デ', romaji: 'de', stroke: 5, radical: 'Katakana', u: 'U+30C7' },
  { id: 'kana_kata_do', char: 'ド', romaji: 'do', stroke: 4, radical: 'Katakana', u: 'U+30C9' },
  { id: 'kana_kata_ba', char: 'バ', romaji: 'ba', stroke: 4, radical: 'Katakana', u: 'U+30D0' },
  { id: 'kana_kata_bi', char: 'ビ', romaji: 'bi', stroke: 4, radical: 'Katakana', u: 'U+30D3' },
  { id: 'kana_kata_bu', char: 'ブ', romaji: 'bu', stroke: 3, radical: 'Katakana', u: 'U+30D6' },
  { id: 'kana_kata_be', char: 'ベ', romaji: 'be', stroke: 3, radical: 'Katakana', u: 'U+30D9' },
  { id: 'kana_kata_bo', char: 'ボ', romaji: 'bo', stroke: 6, radical: 'Katakana', u: 'U+30DC' },

  // Katakana Handakuon (Maru - 5)
  { id: 'kana_kata_pa', char: 'パ', romaji: 'pa', stroke: 3, radical: 'Katakana', u: 'U+30D1' },
  { id: 'kana_kata_pi', char: 'ピ', romaji: 'pi', stroke: 3, radical: 'Katakana', u: 'U+30D4' },
  { id: 'kana_kata_pu', char: 'プ', romaji: 'pu', stroke: 2, radical: 'Katakana', u: 'U+30D7' },
  { id: 'kana_kata_pe', char: 'ペ', romaji: 'pe', stroke: 2, radical: 'Katakana', u: 'U+30DA' },
  { id: 'kana_kata_po', char: 'ポ', romaji: 'po', stroke: 5, radical: 'Katakana', u: 'U+30DD' },

  // Vu (1)
  { id: 'kana_kata_vu', char: 'ヴ', romaji: 'vu', stroke: 4, radical: 'Katakana', u: 'U+30F4' }
];

let addedCount = 0;
for (const item of dakuonList) {
  if (!rawData[item.id]) {
    rawData[item.id] = {
      id: item.id,
      character: item.char,
      onyomi: [item.romaji.toUpperCase()],
      kunyomi: [item.romaji.toLowerCase()],
      strokeCount: item.stroke,
      radical: item.radical,
      meaningId: `Huruf ${item.radical} 「${item.char}」 (${item.romaji})`,
      meaningEn: `${item.radical} letter ${item.char} (${item.romaji})`,
      jlpt: 'KANA',
      relatedWords: [],
      unicode: item.u,
      version: 1,
      status: 'published'
    };
    addedCount++;
  }
}

fs.writeFileSync(KANJI_JSON_PATH, JSON.stringify(rawData, null, 2), 'utf-8');
console.log(`Successfully added ${addedCount} Kana items to kanji.json! Total items in db: ${Object.keys(rawData).length}`);
