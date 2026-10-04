// Sisa audit Kotoba: wordType tidak valid, meaningEn salah, kanjiComponents kosong, kolokasi template berromaji.
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '../src/data/db/kotoba.json');
const db = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const TYPE_FIX = { na: 'adjective-na', v: 'verb', adv: 'adverb' };
const EN_FIX = {
  kotoba_n1_1695: 'enough; sufficient',
  kotoba_n1_1704: 'to pile up; to overlap; to occur in succession',
  kotoba_n1_1826: 'skillful; good at',
  kotoba_n1_1830: 'sturdy; strong; healthy',
  kotoba_n1_2429: 'immediately; right away; easily',
  kotoba_n1_3157: 'obvious; clear',
  kotoba_n1_3275: 'to come; to arrive',
};
const COMPONENT_FIX = { kotoba_2257: ['底'], kotoba_n2_0300: ['字'], kotoba_n1_0130: ['四'] };
const COLLOC_FIX = {
  kotoba_theme_kao: ['顔を洗う (mencuci muka)', '顔色が悪い (wajah pucat)', '顔を出す (menampakkan diri)'],
  kotoba_theme_ashikubi: ['足首を捻る (terkilir pergelangan kaki)', '足首が細い (pergelangan kaki ramping)', '足首を回す (memutar pergelangan kaki)'],
  kotoba_theme_denshirenji: ['電子レンジで温める (memanaskan dengan microwave)', '電子レンジを使う (menggunakan microwave)', '電子レンジ対応 (bisa untuk microwave)'],
  kotoba_theme_haburashi: ['歯ブラシを買う (membeli sikat gigi)', '歯ブラシで磨く (menggosok dengan sikat gigi)', '電動歯ブラシ (sikat gigi listrik)'],
  kotoba_theme_kouza: ['口座を開く (membuka rekening)', '口座に振り込む (mentransfer ke rekening)', '銀行口座 (rekening bank)'],
  kotoba_theme_furikomi: ['振込をする (melakukan transfer)', '振込手数料 (biaya transfer)', '銀行振込 (transfer bank)'],
  kotoba_theme_anshoubangou: ['暗証番号を入力する (memasukkan PIN)', '暗証番号を忘れる (lupa PIN)', '暗証番号を変更する (mengganti PIN)'],
  kotoba_theme_hokenshou: ['保険証を出す (menunjukkan kartu asuransi)', '保険証を忘れる (lupa kartu asuransi)', '健康保険証 (kartu asuransi kesehatan)'],
};
const TEMPLATE = / wo tsukau| ni tsuite| no juuyousei/;

let types = 0, colloc = 0;
for (const [id, x] of Object.entries(db)) {
  if (TYPE_FIX[x.wordType]) { x.wordType = TYPE_FIX[x.wordType]; types++; }
  if (EN_FIX[id]) x.meaningEn = EN_FIX[id];
  if (COMPONENT_FIX[id]) x.kanjiComponents = COMPONENT_FIX[id];
  if (COLLOC_FIX[id]) x.collocations = COLLOC_FIX[id];
  if (Array.isArray(x.collocations) && x.collocations.some(c => TEMPLATE.test(c))) {
    delete x.collocations;
    colloc++;
  }
}
fs.writeFileSync(FILE, JSON.stringify(db, null, 2) + '\n', 'utf8');
console.log({ types, templateCollocationsRemoved: colloc });
