const fs = require('fs');
const path = require('path');

const kotoba = require('../src/data/db/kotoba.json');
const kanji = require('../src/data/db/kanji.json');
const kList = Object.values(kotoba);
const kanjiList = Object.values(kanji);

function findKotobaId(word) {
  const m = kList.find(x => x.word === word) || kList.find(x => x.reading === word) || kList.find(x => x.word.startsWith(word));
  if (!m) {
    console.warn(`[WARN] Kotoba not found for: ${word}`);
    return null;
  }
  return m.id;
}

function findKanjiChar(char) {
  const m = kanjiList.find(x => x.character === char);
  if (!m) {
    console.warn(`[WARN] Kanji not found for: ${char}`);
    return null;
  }
  return m.character;
}

const now = new Date().toISOString();

function makeRefs(kotobaWords, kanjiChars) {
  const refs = [];
  for (const w of kotobaWords) {
    const id = findKotobaId(w);
    if (id) {
      refs.push({ id, category: 'kotoba', addedAt: now });
    }
  }
  for (const c of kanjiChars) {
    const char = findKanjiChar(c);
    if (char) {
      refs.push({ id: char, category: 'kanji', addedAt: now });
    }
  }
  return refs;
}

const thematicBooks = [
  // -------------------------------------------------------------
  // 1. RAK TUBUH & KESEHATAN
  // -------------------------------------------------------------
  {
    id: 'book_theme_body',
    title: 'Rak Tubuh & Kesehatan',
    japaneseTitle: '生活の知恵：身体と健康の図鑑',
    subtitle: 'Anatomi Tubuh, Panca Indera & Istilah Medis Praktis',
    description: 'Panduan lengkap kosakata anggota gerak, wajah, organ dalam, serta keluhan sakit dan komunikasi dokter di Jepang.',
    level: 'TEMATIK',
    category: 'thematic',
    coverIcon: '🫀',
    colorTheme: {
      accentColor: 'text-rose-500',
      badgeBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
      borderAccent: 'border-rose-500/40 hover:border-rose-500',
      cardBg: 'from-rose-950/20 via-surface-card to-surface-card'
    },
    chapters: [
      {
        id: 'ch_body_limbs',
        bookId: 'book_theme_body',
        chapterNumber: 1,
        titleJp: '手足と関節',
        titleId: 'Bab 1: Anggota Gerak & Sendi',
        subtitle: 'Tangan, Kaki, Lengan, Lutut & Pergerakan',
        description: 'Kuasai kosakata tangan, jari, telapak, pergelangan, paha, tumit, dan kata kerja pergerakan dasar.',
        coverIcon: '🖐️',
        items: makeRefs(
          ['手', '足', '腕', '指', '膝', '肩', '爪', '首', '足首', '足底', '歩く', '握る', '指す', '走る', '転ぶ'],
          ['手', '足', '腕', '指', '肩', '首']
        )
      },
      {
        id: 'ch_body_face',
        bookId: 'book_theme_body',
        chapterNumber: 2,
        titleJp: '頭・顔・感覚',
        titleId: 'Bab 2: Kepala, Wajah & Panca Indera',
        subtitle: 'Wajah, Mata, Hidung, Telinga, Gigi & Ekspresi',
        description: 'Kosakata bagian kepala dan panca indera: mata, telinga, bibir, pipi, lidah, hingga senyuman.',
        coverIcon: '👀',
        items: makeRefs(
          ['頭', '顔', '目', '鼻', '口', '耳', '髪', '歯', '頬', '舌', '声', '髭', '額', '笑顔', '表情'],
          ['頭', '顔', '目', '耳', '口', '鼻', '歯', '声']
        )
      },
      {
        id: 'ch_body_organs',
        bookId: 'book_theme_body',
        chapterNumber: 3,
        titleJp: '内臓と骨格',
        titleId: 'Bab 3: Organ Tubuh & Fisiologi',
        subtitle: 'Jantung, Lambung, Paru-paru, Dada, Punggung & Tulang',
        description: 'Mengenal organ tubuh penting, otot, susunan tulang, dan bagian torso tubuh manusia.',
        coverIcon: '🫁',
        items: makeRefs(
          ['心臓', '胃', '胸', '背中', '腰', '骨', '筋肉', '血', '呼吸', '皮膚', 'お腹', '内臓'],
          ['心', '胸', '背', '腰', '骨', '血', '肉']
        )
      },
      {
        id: 'ch_body_symptoms',
        bookId: 'book_theme_body',
        chapterNumber: 4,
        titleJp: '症状と病院',
        titleId: 'Bab 4: Keluhan Sakit & Rumah Sakit',
        subtitle: 'Demam, Batuk, Pusing, Mual, Obat & Konsultasi Dokter',
        description: 'Istilah medis dasar untuk menjelaskan rasa sakit, luka, pemeriksaan, dan menebus obat di klinik.',
        coverIcon: '🏥',
        items: makeRefs(
          ['痛い', '頭痛', '熱', '風邪', '怪我', '薬', '病院', '医者', '咳', '吐き気', '下痢', '治る', '検査', '注射'],
          ['痛', '病', '院', '薬', '熱']
        )
      }
    ]
  },

  // -------------------------------------------------------------
  // 2. RAK RUMAH & TEMPAT TINGGAL
  // -------------------------------------------------------------
  {
    id: 'book_theme_home',
    title: 'Rak Rumah & Tempat Tinggal',
    japaneseTitle: '日々の暮らし：家・家具・家事',
    subtitle: 'Ruangan, Perabot, Alat Masak & Urusan Rumah Tangga',
    description: 'Kuasai sudut-sudut rumah di Jepang: kamar tidur, dapur, perlengkapan mandi, perabot elektronik, hingga pilah sampah.',
    level: 'TEMATIK',
    category: 'thematic',
    coverIcon: '🏠',
    colorTheme: {
      accentColor: 'text-emerald-500',
      badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      borderAccent: 'border-emerald-500/40 hover:border-emerald-500',
      cardBg: 'from-emerald-950/20 via-surface-card to-surface-card'
    },
    chapters: [
      {
        id: 'ch_home_rooms',
        bookId: 'book_theme_home',
        chapterNumber: 1,
        titleJp: '部屋と寝室・家具',
        titleId: 'Bab 1: Ruang Tamu & Kamar Tidur',
        subtitle: 'Ruangan, Pintu Masuk, Kasur, Lemari, Meja & Kursi',
        description: 'Perabotan interior rumah: genkan, kamar tidur, tempat tidur, kasur futon, meja kerja, dan jendela.',
        coverIcon: '🛏️',
        items: makeRefs(
          ['部屋', '玄関', '居間', '庭', '階段', 'ベッド', '布団', '毛布', '机', '椅子', '窓', 'ドア', '鍵', '壁', '床', 'カーテン'],
          ['家', '屋', '室', '階', '窓', '戸']
        )
      },
      {
        id: 'ch_home_kitchen',
        bookId: 'book_theme_home',
        chapterNumber: 2,
        titleJp: '台所と調理器具',
        titleId: 'Bab 2: Dapur & Alat Masak',
        subtitle: 'Kulkas, Microwave, Pisau Dapur, Panci, Piring & Sumpit',
        description: 'Peralatan memasak dan perabot dapur: lemari es, microwave, pisau dapur, wajan, piring, dan cangkir.',
        coverIcon: '🍳',
        items: makeRefs(
          ['台所', '冷蔵庫', '電子レンジ', '庖丁', '鍋', '皿', 'コップ', '箸', 'スプーン', 'やかん', '茶碗', 'フォーク', 'フライパン'],
          ['台', '所', '冷', '皿']
        )
      },
      {
        id: 'ch_home_bath',
        bookId: 'book_theme_home',
        chapterNumber: 3,
        titleJp: 'お風呂と洗面・洗濯',
        titleId: 'Bab 3: Kamar Mandi & Cuci',
        subtitle: 'Mandi Berendam, Handuk, Sabun, Sikat Gigi & Mesin Cuci',
        description: 'Rutinitas membersihkan diri: bak mandi ofuro, wastafel, sabun, handuk, sikat gigi, dan mesin cuci.',
        coverIcon: '🛁',
        items: makeRefs(
          ['お風呂', 'トイレ', '鏡', 'タオル', '石鹸', '歯ブラシ', '洗濯機', '水道', 'シャワー'],
          ['洗', '濯', '鏡', '水']
        )
      },
      {
        id: 'ch_home_chores',
        bookId: 'book_theme_home',
        chapterNumber: 4,
        titleJp: '掃除・片付け・ゴミ',
        titleId: 'Bab 4: Bersih-Bersih & Sampah',
        subtitle: 'Menyapu, Merapikan Rumah, Mencuci & Pilah Sampah',
        description: 'Istilah aktivitas rumah tangga: menyapu, mengelap lantai, membuang sampah, dan merapikan pakaian.',
        coverIcon: '🧹',
        items: makeRefs(
          ['掃除', '洗濯', '片付ける', '捨てる', 'ごみ', '掃く', '拭く', '干す', '畳む', '分ける'],
          ['掃', '除', '捨']
        )
      }
    ]
  },

  // -------------------------------------------------------------
  // 3. RAK FASILITAS PUBLIK & ADMINISTRASI
  // -------------------------------------------------------------
  {
    id: 'book_theme_public',
    title: 'Rak Layanan Publik & Finansial',
    japaneseTitle: '社会生活：郵便局・銀行・役所',
    subtitle: 'Kantor Pos, Transaksi Bank/ATM & Pengurusan Dokumen',
    description: 'Panduan bertahan hidup di Jepang: kirim paket pos, buka rekening tabungan, transfer uang di ATM, dan urusan izin di Balai Kota.',
    level: 'TEMATIK',
    category: 'thematic',
    coverIcon: '📮',
    colorTheme: {
      accentColor: 'text-amber-500',
      badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      borderAccent: 'border-amber-500/40 hover:border-amber-500',
      cardBg: 'from-amber-950/20 via-surface-card to-surface-card'
    },
    chapters: [
      {
        id: 'ch_public_post',
        bookId: 'book_theme_public',
        chapterNumber: 1,
        titleJp: '郵便局・手紙・宅配',
        titleId: 'Bab 1: Kantor Pos & Pengiriman',
        subtitle: 'Kirim Surat, Perangko, Amplop, Paket & Tanda Terima',
        description: 'Kosakata surat-menyurat dan ekspedisi: perangko, amplop, paket kiriman, alamat, dan kurir kilat.',
        coverIcon: '✉️',
        items: makeRefs(
          ['郵便局', '手紙', '葉書', '切手', '封筒', '荷物', '配達', '住所', '署名', '速達', 'ポスト', '受け取る', '送る'],
          ['郵', '便', '局', '切', '封', '筒', '荷']
        )
      },
      {
        id: 'ch_public_bank',
        bookId: 'book_theme_public',
        chapterNumber: 2,
        titleJp: '銀行・お金・口座',
        titleId: 'Bab 2: Bank, ATM & Keuangan',
        subtitle: 'Buku Tabungan, Nomor Rekening, Transfer & Tarik Tunai',
        description: 'Istilah transaksi perbankan dan ATM: rekening tabungan, uang tunai, transfer furikomi, nomor PIN, dan biaya admin.',
        coverIcon: '🏦',
        items: makeRefs(
          ['銀行', 'お金', '現金', '口座', '預金', '引き出し', '振込', '暗証番号', '通帳', '残高', '両替', '硬貨', '貯金'],
          ['銀', '行', '金', '口', '座', '預']
        )
      },
      {
        id: 'ch_public_ward',
        bookId: 'book_theme_public',
        chapterNumber: 3,
        titleJp: '役所・窓口・在留手続き',
        titleId: 'Bab 3: Balai Kota & Dokumen',
        subtitle: 'Ward Office, Zairyu Card, Cap Stempel & Asuransi',
        description: 'Prosedur administrasi kependudukan di balai kota: lapor domisili, kartu izin tinggal, cap inkan, dan kartu asuransi.',
        coverIcon: '🏛️',
        items: makeRefs(
          ['市役所', '窓口', '手続き', '申請', '在留カード', '印鑑', '書類', '記入', '保険証', 'パスポート'],
          ['役', '所', '窓', '申', '請', '印', '鑑', '書', '類']
        )
      }
    ]
  }
];

// Write to src/data/thematicBooks.ts
const fileContent = `import { OfficialBook } from '../types/books';

export const THEMATIC_BOOKS: OfficialBook[] = ${JSON.stringify(thematicBooks, null, 2)};
`;

const outputPath = path.join(__dirname, '..', 'src', 'data', 'thematicBooks.ts');
fs.writeFileSync(outputPath, fileContent, 'utf-8');
console.log('✅ Successfully generated src/data/thematicBooks.ts with', thematicBooks.length, 'thematic books!');
thematicBooks.forEach(b => {
  console.log(`- ${b.title} (${b.chapters.length} chapters, ${b.chapters.reduce((acc, c) => acc + c.items.length, 0)} total items)`);
});
