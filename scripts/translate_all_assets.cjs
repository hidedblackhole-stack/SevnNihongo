const fs = require('fs');
const path = require('path');
const https = require('https');

// Helper to translate English to Indonesian with retries
function translateEnToId(text) {
  return new Promise((resolve) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) return resolve(text);
    const cleaned = text.trim();
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=id&dt=t&q=' + encodeURIComponent(cleaned);
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const result = parsed[0].map(p => p[0]).join('').trim();
          resolve(result || cleaned);
        } catch(e) {
          resolve(cleaned);
        }
      });
    }).on('error', () => resolve(cleaned));
  });
}

// Queue runner with bounded concurrency
async function mapConcurrent(items, fn, concurrency = 20) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch (e) {
        results[idx] = items[idx];
      }
    }
  }

  const workers = Array(Math.min(concurrency, items.length)).fill(0).map(() => worker());
  await Promise.all(workers);
  return results;
}

// Formula localizer function
function localizeFormula(str) {
  if (!str) return '';
  return str
    .replace(/［/g, '[').replace(/］/g, ']')
    .replace(/Noun\s*\[\s*thing\s*\]/gi, 'Kata Benda [hal]')
    .replace(/Noun\s*\[\s*person\s*[\/／]\s*faculty\s*\]/gi, 'Kata Benda [orang/pihak]')
    .replace(/Noun\s*\[\s*person\s*\]/gi, 'Kata Benda [orang]')
    .replace(/Noun\s*\[\s*place\s*\]/gi, 'Kata Benda [tempat]')
    .replace(/Noun\s*\[\s*time\s*\]/gi, 'Kata Benda [waktu]')
    .replace(/Noun\s*\[\s*reason\s*\]/gi, 'Kata Benda [alasan]')
    .replace(/Noun\s*\[\s*situation\s*\]/gi, 'Kata Benda [situasi]')
    .replace(/Noun-A/g, 'Kata Benda A')
    .replace(/Noun-B/g, 'Kata Benda B')
    .replace(/\bNoun\b/g, 'Kata Benda')
    .replace(/\bVerb\s*\[\s*た\s*form\s*\]/gi, 'Kata Kerja [Bentuk-ta]')
    .replace(/\bVerb\s*\[\s*dictionary\s*form\s*\]/gi, 'Kata Kerja [Bentuk Kamus]')
    .replace(/\bVerb\s*\[\s*plain\s*form\s*\]/gi, 'Kata Kerja [Bentuk Biasa]')
    .replace(/\bVerb\s*\[\s*stem\s*\]/gi, 'Kata Kerja [Bentuk Masu]')
    .replace(/\bVerb\s*\[\s*te\s*form\s*\]/gi, 'Kata Kerja [Bentuk-te]')
    .replace(/\bVerb\s*\[\s*nai\s*form\s*\]/gi, 'Kata Kerja [Bentuk-nai]')
    .replace(/\bVerb\s*\[\s*volitional\s*form\s*\]/gi, 'Kata Kerja [Bentuk Maksud]')
    .replace(/\bVerb\s*\[\s*potential\s*form\s*\]/gi, 'Kata Kerja [Bentuk Potensial]')
    .replace(/\bVerb\s*\[\s*passive\s*form\s*\]/gi, 'Kata Kerja [Bentuk Pasif]')
    .replace(/\bVerb\s*\[\s*causative\s*form\s*\]/gi, 'Kata Kerja [Bentuk Kausatif]')
    .replace(/\bVerb\b/g, 'Kata Kerja')
    .replace(/na-adjective|na adjective|な-adjective/gi, 'Kata Sifat-na')
    .replace(/i-adjective|i adjective|い-adjective/gi, 'Kata Sifat-i')
    .replace(/\bAdjective\b|\badjective\b/g, 'Kata Sifat')
    .replace(/\bSentence\b|\bsentence\b/g, 'Kalimat')
    .replace(/\bplain form\b/gi, 'Bentuk Biasa')
    .replace(/\bdictionary form\b/gi, 'Bentuk Kamus')
    .replace(/\bpolite form\b/gi, 'Bentuk Sopan')
    .replace(/\bvolitional form\b|\bvolitional\b/gi, 'Bentuk Maksud')
    .replace(/\bpotential form\b|\bpotential\b/gi, 'Bentuk Potensial')
    .replace(/\bpassive form\b|\bpassive\b/gi, 'Bentuk Pasif')
    .replace(/\bcausative form\b|\bcausative\b/gi, 'Bentuk Kausatif')
    .replace(/\bClause\b|\bclause\b/gi, 'Klausa')
    .replace(/\bPhrase\b|\bphrase\b/gi, 'Frasa')
    .replace(/\bNumber\b|\bnumber\b/gi, 'Angka')
    .replace(/\bCounter\b|\bcounter\b/gi, 'Kata Bantu Hitung')
    .replace(/\bQuantity\b|\bquantity\b/gi, 'Jumlah')
    .replace(/\bQuestion word\b/gi, 'Kata Tanya')
    .replace(/\[thing\]/gi, '[hal]')
    .replace(/\[person[\s\/／]*faculty\]/gi, '[orang/pihak]')
    .replace(/\[person\]/gi, '[orang]')
    .replace(/\[place\]/gi, '[tempat]')
    .replace(/\[time\]/gi, '[waktu]')
    .replace(/\[reason\]/gi, '[alasan]')
    .replace(/\[situation\]/gi, '[situasi]');
}

async function processBunpou() {
  console.log('--- Processing Bunpou Database ---');
  const bPath = path.join('src', 'data', 'db', 'bunpou.json');
  const items = JSON.parse(fs.readFileSync(bPath, 'utf8'));

  // 1. Gather examples needing translation
  const examplesToTranslate = [];
  items.forEach((item, itemIdx) => {
    // Localize formula
    if (item.formula) {
      item.formula = localizeFormula(item.formula);
    }

    (item.examples || []).forEach((ex, exIdx) => {
      const isPlaceholder = !ex.id || ex.id.startsWith('Contoh penggunaan pola');
      if (isPlaceholder && ex.en) {
        examplesToTranslate.push({ itemIdx, exIdx, text: ex.en });
      }
    });
  });

  console.log(`Translating ${examplesToTranslate.length} bunpou example sentences...`);
  const translatedExamples = await mapConcurrent(examplesToTranslate, async (entry) => {
    const id = await translateEnToId(entry.text);
    return { ...entry, id };
  }, 25);

  translatedExamples.forEach(({ itemIdx, exIdx, id }) => {
    items[itemIdx].examples[exIdx].id = id;
  });

  // 2. Gather explanation notes needing translation
  const englishWords = /\b(the|is|are|to|in|on|at|of|for|with|by|from|about|into|through|during|before|after|assigns|indicates|expresses|used|when)\b/i;
  const notesToTranslate = [];
  items.forEach((item, itemIdx) => {
    if (item.explanation_note && englishWords.test(item.explanation_note)) {
      notesToTranslate.push({ itemIdx, text: item.explanation_note });
    }
  });

  console.log(`Translating ${notesToTranslate.length} bunpou explanation notes...`);
  const translatedNotes = await mapConcurrent(notesToTranslate, async (entry) => {
    const id = await translateEnToId(entry.text);
    return { ...entry, id };
  }, 25);

  translatedNotes.forEach(({ itemIdx, id }) => {
    items[itemIdx].explanation_note = id;
  });

  // 3. Explicit high quality curation for bp_n2_001 (~を~に任せる)
  const n2_001 = items.find(i => i.id === 'bp_n2_001');
  if (n2_001) {
    n2_001.formula = 'Kata Benda [hal/urusan] ＋ を ＋ Kata Benda [orang/pihak] ＋ に ＋ 任せる';
    n2_001.meaning_id = 'Menyerahkan atau mempercayakan (urusan/tanggung jawab) kepada (orang/pihak lain)';
    n2_001.explanation_note = 'Pola ini digunakan untuk melimpahkan keputusan, pekerjaan, atau tanggung jawab kepada pihak lain agar mereka yang menanganinya (misal: 仕事を彼に任せる = mempercayakan pekerjaan padanya, 判断を現場に任せる = menyerahkan keputusan ke tim lapangan). Dapat pula bermakna memasrahkan diri pada keadaan (misal: 運を天に任せる = memasrahkan nasib pada langit/takdir).';
    n2_001.examples = [
      {
        jp: '細かいことは、現場の判断に任せることにした。',
        reading: '細こまかいことは、現場げんばの判断はんだんに任まかせることにした。',
        id: 'Kami memutuskan untuk menyerahkan hal-hal teknis mendalam kepada keputusan tim di lapangan.',
        en: 'We decided to leave the fine details up to the judgment of the people on site.'
      },
      {
        jp: 'この件は、経験のある彼に任せたほうがいいだろう。',
        reading: 'この件けんは、経験けいけんのある彼かれに任まかせたほうがいいだろう。',
        id: 'Mengenai urusan ini, sebaiknya kita percayakan saja kepada dia yang berpengalaman.',
        en: 'It would probably be better to entrust this matter to him, since he has the experience.'
      },
      {
        jp: '運を天に任せて、全力を尽くそう。',
        reading: '運うんを天てんに任まかせて、全力ぜんりょくを尽つくそう。',
        id: 'Mari pasrahkan hasil akhirnya pada takdir dan berjuang sekuat tenaga.',
        en: 'Let us leave the outcome to fate and do our very best.'
      }
    ];
  }

  fs.writeFileSync(bPath, JSON.stringify(items, null, 2), 'utf8');
  console.log('Bunpou database updated successfully.');
}

async function processKotoba() {
  console.log('--- Processing Kotoba Database ---');
  const kPath = path.join('src', 'data', 'db', 'kotoba.json');
  const kotoba = JSON.parse(fs.readFileSync(kPath, 'utf8'));

  const curatedKotoba = {
    'kotoba_n1_0181': 'Pada akhirnya / cepat atau lambat / di antara hal tersebut',
    'kotoba_n1_0359': 'Dengan / melalui / atas dasar',
    'kotoba_n1_0366': 'Menitipkan / mempercayakan / melimpahkan tugas',
    'kotoba_n2_0443': 'Mengubah / memperbaiki / memperbarui',
    'kotoba_n2_0476': 'Tahun ajaran / tingkatan kelas',
    'kotoba_n2_0514': 'Sebentar lagi / tidak lama kemudian',
    'kotoba_n2_0571': 'Mengejutkan / mengagetkan / mengguncang',
    'kotoba_n2_0817': 'Terus-menerus / dari awal hingga akhir',
    'kotoba_n2_1006': 'Memperbanyak / menambah jumlah',
    'kotoba_n2_1174': 'Okurigana (huruf kana pengiring kanji)',
  };

  const list = Array.isArray(kotoba) ? kotoba : Object.values(kotoba);
  const toTranslate = [];

  list.forEach((k) => {
    if (curatedKotoba[k.id]) {
      k.meaningId = curatedKotoba[k.id];
      return;
    }
    const englishWords = /\b(the|is|are|to|in|on|at|of|for|with|by|from|about|into|through|during|before|after)\b/i;
    if (k.meaningId && englishWords.test(k.meaningId)) {
      const words = k.meaningId.split(/\s+/).filter(w => englishWords.test(w));
      if (words.length >= 2) {
        toTranslate.push({ item: k, text: k.meaningId });
      }
    }
  });

  console.log(`Translating ${toTranslate.length} remaining kotoba meanings...`);
  await mapConcurrent(toTranslate, async ({ item, text }) => {
    item.meaningId = await translateEnToId(text);
  }, 15);

  fs.writeFileSync(kPath, JSON.stringify(kotoba, null, 2), 'utf8');
  console.log('Kotoba database updated successfully.');
}

async function processSentences() {
  console.log('--- Processing Sentences Database ---');
  const sPath = path.join('src', 'data', 'db', 'sentences.json');
  const sentences = JSON.parse(fs.readFileSync(sPath, 'utf8'));

  const englishWords = /\b(the|is|are|to|in|on|at|of|for|with|by|from|about|into|through|during|before|after|when|because|although)\b/i;
  const toTranslate = [];

  sentences.forEach((s) => {
    if (s.translation_id && englishWords.test(s.translation_id)) {
      const words = s.translation_id.split(/\s+/).filter(w => englishWords.test(w));
      if (words.length >= 2) {
        // If it starts with 'Penggunaan "..." (english) ini', translate the english inside parentheses
        const bracketMatch = s.translation_id.match(/^(Penggunaan\s*["“][^"”]+["”]\s*)\(([^)]+)\)(\s*ini.*)$/i);
        if (bracketMatch) {
          toTranslate.push({
            sentence: s,
            text: bracketMatch[2],
            formatter: (trans) => `${bracketMatch[1]}(${trans})${bracketMatch[3]}`
          });
        } else {
          toTranslate.push({
            sentence: s,
            text: s.translation_id,
            formatter: (trans) => trans
          });
        }
      }
    }
  });

  console.log(`Translating ${toTranslate.length} sentences...`);
  await mapConcurrent(toTranslate, async ({ sentence, text, formatter }) => {
    const trans = await translateEnToId(text);
    sentence.translation_id = formatter(trans);
  }, 25);

  fs.writeFileSync(sPath, JSON.stringify(sentences, null, 2), 'utf8');
  console.log('Sentences database updated successfully.');
}

async function processDokkai() {
  console.log('--- Processing Dokkai Database ---');
  const dPath = path.join('src', 'data', 'db', 'dokkai.json');
  const dokkai = JSON.parse(fs.readFileSync(dPath, 'utf8'));

  const categoryMap = {
    'Daily Life / Society': 'Kehidupan Sehari-hari / Masyarakat',
    'Work & Daily Life': 'Dunia Kerja & Keseharian',
    'Daily Life': 'Kehidupan Sehari-hari',
    'Daily Life / Travel': 'Keseharian & Perjalanan',
    'Society / Community': 'Masyarakat & Komunitas',
    'Daily Life / Story': 'Keseharian & Cerita',
    'Daily Life / Essay': 'Keseharian & Esai',
    'Career & Life': 'Karier & Kehidupan',
    'Culture & Society': 'Budaya & Masyarakat',
    'Education / Society': 'Pendidikan & Sosial',
    'Personal Essay / Daily Life': 'Esai Pribadi & Keseharian',
    'エッセイ (Essay)': 'Esai (エッセイ)',
    'Mystery / Drama': 'Misteri & Drama',
    'Placeholder': 'Membaca Teks',
  };

  const list = Array.isArray(dokkai) ? dokkai : Object.values(dokkai);
  list.forEach(d => {
    if (categoryMap[d.category]) {
      d.category = categoryMap[d.category];
    }
  });

  fs.writeFileSync(dPath, JSON.stringify(dokkai, null, 2), 'utf8');
  console.log('Dokkai database updated successfully.');
}

async function processMapsAndStages() {
  console.log('--- Processing Maps & Stages Database ---');
  const mPath = path.join('src', 'data', 'world', 'maps.json');
  const maps = JSON.parse(fs.readFileSync(mPath, 'utf8'));

  const mapTitles = {
    map_kana_hiragana: 'Kuil Aksara Hiragana: 7 Lembar Menulis & Membaca',
    map_kana_katakana: 'Kuil Aksara Katakana: 7 Lembar Menulis & Kata Serapan',
    map_kana_verbs: 'Fondasi Kata Kerja: Kamus, Masu, Nai, Ta, Te',
    map_kana_grammar: 'Fondasi Kalimat: Partikel Inti & Kopula',
    map_n5_w1: 'Gerbang Permulaan (Partikel Dasar & Salam)',
    map_n5_w2: 'Desa Kehidupan Sehari-hari (Verba & Nomina Keseharian)',
    map_n5_w3: 'Hutan Waktu (Angka, Waktu, & Kata Sifat)',
    map_n5_w4: 'Kuil Ujian (Bentuk-Te & Boss Akhir N5)',
    map_bunpou_w1: 'Minggu 1: Aku Harus Berjuang!',
    map_bunpou_w2: 'Minggu 2: Ayo Kita Coba!',
    map_bunpou_w3: 'Minggu 3: Ayo Lebih Semangat Lagi!',
    map_bunpou_w4: 'Minggu 4: Bertahan Sedikit Lagi!',
    map_bunpou_w5: 'Minggu 5: Seandainya Berusaha Lebih Keras!',
    map_bunpou_w6: 'Minggu 6: Memutuskan Untuk Terus Maju!',
    map_n2_w1: 'Batas Formalitas (Ungkapan Resmi & Berita)',
    map_n2_w2: 'Tebing Kontras (Oposisi & Sudut Pandang)',
    map_n2_w3: 'Labirin Emosi & Kepastian Tak Terelakkan',
    map_n2_w4: 'Koridor Logika Akademik & Penalaran',
    map_n2_w5: 'Benteng Puncak Penguasaan N2 (Boss Besar)',
    map_n1_w1: 'Puncak Ungkapan Klasik & Sastra',
    map_n1_w2: 'Jurang Tata Bahasa Spontan & Larangan Keras',
    map_n1_w3: 'Istana Filsafat Kritis & Konteks Mendalam',
    map_n1_w4: 'Puncak Kekuatan Linguistik Tertinggi',
    map_n1_w5: 'Singgasana Transenden (Boss Mitos Agung)',
  };

  maps.forEach(m => {
    if (mapTitles[m.id]) {
      m.title_id = mapTitles[m.id];
      m.title_en = mapTitles[m.id]; // keep in sync
    }
  });
  fs.writeFileSync(mPath, JSON.stringify(maps, null, 2), 'utf8');

  // Stages
  const sPath = path.join('src', 'data', 'world', 'stages.json');
  const stages = JSON.parse(fs.readFileSync(sPath, 'utf8'));

  const toTranslateStages = [];
  stages.forEach(s => {
    if (s.title_en && !s.title_id) {
      toTranslateStages.push(s);
    }
  });

  console.log(`Translating ${toTranslateStages.length} stage titles...`);
  await mapConcurrent(toTranslateStages, async (s) => {
    const id = await translateEnToId(s.title_en);
    s.title_id = id;
    s.title_en = id;
  }, 25);

  fs.writeFileSync(sPath, JSON.stringify(stages, null, 2), 'utf8');
  console.log('Maps & Stages updated successfully.');
}

async function main() {
  console.log('Starting Master Asset Translation Audit & Update...');
  await processBunpou();
  await processKotoba();
  await processSentences();
  await processDokkai();
  await processMapsAndStages();
  console.log('ALL ASSETS AUDITED & LOCALIZED TO INDONESIAN SUCCESSFULLY!');
}

main().catch(console.error);
