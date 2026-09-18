import { Question, KotobaItem } from '../types/content';
import { conjugateVerb } from '../engine/morphology/inflectionEngine';
import { fisherYatesShuffle } from '../utils/smartRandomizer';

export type VerbGroup = 'godan' | 'ichidan' | 'irregular';

export interface VerbForms {
  dictionary: string; // 辞書形
  masu: string;       // ます形
  te: string;         // て形
  ta: string;         // た形 (lampau)
  nai: string;        // ない形 (negatif)
  potential: string;  // 可能形 (bisa/dapat)
  passive: string;    // 受身形 (dikenai)
  causative: string;  // 使役形 (menyuruh/mengizinkan)
  ba: string;         // ば形 (jika/pengandaian)
  volitional: string; // 意向形 (mari/hendak)
  causative_passive?: string; // 使役受身形 (terpaksa/disuruh)
  tai?: string;               // たい形 (keinginan/mau)
  tara?: string;              // たら形 (kondisional/kalau)
  imperative?: string;        // 命令形 (perintah)
}

export interface VerbItem {
  id: string;
  kanji: string;
  reading: string;
  romaji: string;
  meaningId: string;
  group: VerbGroup;
  godanEnding?: 'u' | 'ku' | 'gu' | 'su' | 'tsu' | 'nu' | 'bu' | 'mu' | 'ru';
  forms: VerbForms;
  formsReadings: VerbForms;
}

export interface ConjugationFormInfo {
  id: string;
  name: string;
  friendlyTarget?: string;
  japaneseName: string;
  badge: string;
  summary: string;
  nuanceExplanation: string;
  ruleExplanation: {
    godan: string;
    ichidan: string;
    irregular: string;
  };
  sampleExamples: {
    dictionary: string;
    conjugated: string;
    meaning: string;
  }[];
}

export interface WordClassGuide {
  id: string;
  title: string;
  japaneseTitle: string;
  description: string;
  subGroups: {
    name: string;
    rule: string;
    examples: string[];
  }[];
}

/* ==========================================================================
   1. DATABASE VERBA & CONJUGATION PAIRS (LENGKAP GOLONGAN 1, 2, 3)
   ========================================================================== */

/**
 * Universal helper that returns the exact hiragana reading of any conjugated form of a verb.
 */
function getConjugatedFormReading(verb: { kanji: string; reading: string }, formText: string): string {
  if (!formText) return '';
  if (verb.kanji === 'する') return formText;
  if (verb.kanji === '来る') {
    if (
      formText.startsWith('来な') ||
      formText.startsWith('来ら') ||
      formText.startsWith('来さ') ||
      formText.startsWith('来よ')
    ) {
      return formText.replace('来', 'こ');
    }
    if (formText.startsWith('来ま') || formText.startsWith('来て') || formText.startsWith('来た')) {
      return formText.replace('来', 'き');
    }
    return formText.replace('来', 'く');
  }

  // Find kanji prefix in verb
  const kanjiMatch = verb.kanji.match(/^[\u4e00-\u9faf]+/);
  if (!kanjiMatch) return formText;
  const kanjiPrefix = kanjiMatch[0];
  const okurigana = verb.kanji.slice(kanjiPrefix.length);
  const stemReading = verb.reading.slice(0, verb.reading.length - okurigana.length);

  if (formText.startsWith(kanjiPrefix)) {
    return stemReading + formText.slice(kanjiPrefix.length);
  }
  return formText;
}

function computeVerbFormsReadings(verb: { kanji: string; reading: string; forms: VerbForms }): VerbForms {
  return {
    dictionary: getConjugatedFormReading(verb, verb.forms.dictionary),
    masu: getConjugatedFormReading(verb, verb.forms.masu),
    te: getConjugatedFormReading(verb, verb.forms.te),
    ta: getConjugatedFormReading(verb, verb.forms.ta),
    nai: getConjugatedFormReading(verb, verb.forms.nai),
    potential: getConjugatedFormReading(verb, verb.forms.potential),
    passive: getConjugatedFormReading(verb, verb.forms.passive),
    causative: getConjugatedFormReading(verb, verb.forms.causative),
    ba: getConjugatedFormReading(verb, verb.forms.ba),
    volitional: getConjugatedFormReading(verb, verb.forms.volitional),
    causative_passive: verb.forms.causative_passive ? getConjugatedFormReading(verb, verb.forms.causative_passive) : undefined,
    tai: verb.forms.tai ? getConjugatedFormReading(verb, verb.forms.tai) : undefined,
    tara: verb.forms.tara ? getConjugatedFormReading(verb, verb.forms.tara) : undefined,
    imperative: verb.forms.imperative ? getConjugatedFormReading(verb, verb.forms.imperative) : undefined,
  };
}

const RAW_VERBS: Omit<VerbItem, 'formsReadings'>[] = [
  // --- GOLONGAN 1 (GODAN / 五段動詞) ---
  {
    id: 'v_nomu',
    kanji: '飲む',
    reading: 'のむ',
    romaji: 'nomu',
    meaningId: 'Minum',
    group: 'godan',
    godanEnding: 'mu',
    forms: {
      dictionary: '飲む',
      masu: '飲みます',
      te: '飲んで',
      ta: '飲んだ',
      nai: '飲まない',
      potential: '飲める',
      passive: '飲まれる',
      causative: '飲ませる',
      ba: '飲めば',
      volitional: '飲もう',
    },
  },
  {
    id: 'v_kaku',
    kanji: '書く',
    reading: 'かく',
    romaji: 'kaku',
    meaningId: 'Menulis',
    group: 'godan',
    godanEnding: 'ku',
    forms: {
      dictionary: '書く',
      masu: '書きます',
      te: '書いて',
      ta: '書いた',
      nai: '書かない',
      potential: '書ける',
      passive: '書かれる',
      causative: '書かせる',
      ba: '書けば',
      volitional: '書こう',
    },
  },
  {
    id: 'v_iku',
    kanji: '行く',
    reading: 'いく',
    romaji: 'iku',
    meaningId: 'Pergi',
    group: 'godan',
    godanEnding: 'ku',
    forms: {
      dictionary: '行く',
      masu: '行きます',
      te: '行って',
      ta: '行った',
      nai: '行かない',
      potential: '行ける',
      passive: '行かれる',
      causative: '行かせる',
      ba: '行けば',
      volitional: '行こう',
    },
  },
  {
    id: 'v_oyogu',
    kanji: '泳ぐ',
    reading: 'およぐ',
    romaji: 'oyogu',
    meaningId: 'Berenang',
    group: 'godan',
    godanEnding: 'gu',
    forms: {
      dictionary: '泳ぐ',
      masu: '泳ぎます',
      te: '泳いで',
      ta: '泳いだ',
      nai: '泳がない',
      potential: '泳げる',
      passive: '泳がれる',
      causative: '泳がせる',
      ba: '泳げば',
      volitional: '泳ごう',
    },
  },
  {
    id: 'v_hanasu',
    kanji: '話す',
    reading: 'はなす',
    romaji: 'hanasu',
    meaningId: 'Berbicara',
    group: 'godan',
    godanEnding: 'su',
    forms: {
      dictionary: '話す',
      masu: '話します',
      te: '話して',
      ta: '話した',
      nai: '話さない',
      potential: '話せる',
      passive: '話される',
      causative: '話させる',
      ba: '話せば',
      volitional: '話そう',
    },
  },
  {
    id: 'v_matsu',
    kanji: '待つ',
    reading: 'まつ',
    romaji: 'matsu',
    meaningId: 'Menunggu',
    group: 'godan',
    godanEnding: 'tsu',
    forms: {
      dictionary: '待つ',
      masu: '待ちます',
      te: '待って',
      ta: '待った',
      nai: '待たない',
      potential: '待てる',
      passive: '待たれる',
      causative: '待たせる',
      ba: '待てば',
      volitional: '待とう',
    },
  },
  {
    id: 'v_kau',
    kanji: '買う',
    reading: 'かう',
    romaji: 'kau',
    meaningId: 'Membeli',
    group: 'godan',
    godanEnding: 'u',
    forms: {
      dictionary: '買う',
      masu: '買います',
      te: '買って',
      ta: '買った',
      nai: '買わない',
      potential: '買える',
      passive: '買われる',
      causative: '買わせる',
      ba: '買えば',
      volitional: '買おう',
    },
  },
  {
    id: 'v_toru',
    kanji: '取る',
    reading: 'とる',
    romaji: 'toru',
    meaningId: 'Mengambil',
    group: 'godan',
    godanEnding: 'ru',
    forms: {
      dictionary: '取る',
      masu: '取ります',
      te: '取って',
      ta: '取った',
      nai: '取らない',
      potential: '取れる',
      passive: '取られる',
      causative: '取らせる',
      ba: '取れば',
      volitional: '取ろう',
    },
  },
  {
    id: 'v_asobu',
    kanji: '遊ぶ',
    reading: 'あそぶ',
    romaji: 'asobu',
    meaningId: 'Bermain',
    group: 'godan',
    godanEnding: 'bu',
    forms: {
      dictionary: '遊ぶ',
      masu: '遊びます',
      te: '遊んで',
      ta: '遊んだ',
      nai: '遊ばない',
      potential: '遊べる',
      passive: '遊ばれる',
      causative: '遊ばせる',
      ba: '遊べば',
      volitional: '遊ぼう',
    },
  },
  {
    id: 'v_shinu',
    kanji: '死ぬ',
    reading: 'しぬ',
    romaji: 'shinu',
    meaningId: 'Mati / Meninggal',
    group: 'godan',
    godanEnding: 'nu',
    forms: {
      dictionary: '死ぬ',
      masu: '死にます',
      te: '死んで',
      ta: '死んだ',
      nai: '死なない',
      potential: '死ねる',
      passive: '死なれる',
      causative: '死なせる',
      ba: '死ねば',
      volitional: '死のう',
    },
  },

  // --- GOLONGAN 2 (ICHIDAN / 一段動詞) ---
  {
    id: 'v_taberu',
    kanji: '食べる',
    reading: 'たべる',
    romaji: 'taberu',
    meaningId: 'Makan',
    group: 'ichidan',
    forms: {
      dictionary: '食べる',
      masu: '食べます',
      te: '食べて',
      ta: '食べた',
      nai: '食べない',
      potential: '食べられる',
      passive: '食べられる',
      causative: '食べさせる',
      ba: '食べれば',
      volitional: '食べよう',
    },
  },
  {
    id: 'v_miru',
    kanji: '見る',
    reading: 'みる',
    romaji: 'miru',
    meaningId: 'Melihat / Menonton',
    group: 'ichidan',
    forms: {
      dictionary: '見る',
      masu: '見ます',
      te: '見て',
      ta: '見た',
      nai: '見ない',
      potential: '見られる',
      passive: '見られる',
      causative: '見させる',
      ba: '見れば',
      volitional: '見よう',
    },
  },
  {
    id: 'v_neru',
    kanji: '寝る',
    reading: 'ねる',
    romaji: 'neru',
    meaningId: 'Tidur',
    group: 'ichidan',
    forms: {
      dictionary: '寝る',
      masu: '寝ます',
      te: '寝て',
      ta: '寝た',
      nai: '寝ない',
      potential: '寝られる',
      passive: '寝られる',
      causative: '寝させる',
      ba: '寝れば',
      volitional: '寝よう',
    },
  },
  {
    id: 'v_okiru',
    kanji: '起きる',
    reading: 'おきる',
    romaji: 'okiru',
    meaningId: 'Bangun tidur',
    group: 'ichidan',
    forms: {
      dictionary: '起きる',
      masu: '起きます',
      te: '起きて',
      ta: '起きた',
      nai: '起きない',
      potential: '起きられる',
      passive: '起きられる',
      causative: '起きさせる',
      ba: '起きれば',
      volitional: '起きよう',
    },
  },

  // --- GOLONGAN 3 (IRREGULAR / 不規則動詞) ---
  {
    id: 'v_suru',
    kanji: 'する',
    reading: 'する',
    romaji: 'suru',
    meaningId: 'Melakukan',
    group: 'irregular',
    forms: {
      dictionary: 'する',
      masu: 'します',
      te: 'して',
      ta: 'した',
      nai: 'しない',
      potential: 'できる',
      passive: 'される',
      causative: 'させる',
      ba: 'すれば',
      volitional: 'しよう',
    },
  },
  {
    id: 'v_kuru',
    kanji: '来る',
    reading: 'くる',
    romaji: 'kuru',
    meaningId: 'Datang',
    group: 'irregular',
    forms: {
      dictionary: '来る',
      masu: '来ます',
      te: '来て',
      ta: '来た',
      nai: '来ない',
      potential: '来られる',
      passive: '来られる',
      causative: '来させる',
      ba: '来れば',
      volitional: '来よう',
    },
  },
];

export const VERB_CONJUGATION_DATABASE: VerbItem[] = RAW_VERBS.map(verb => ({
  ...verb,
  formsReadings: computeVerbFormsReadings(verb),
}));

/* ==========================================================================
   2. PANDUAN BENTUK-BENTUK PERUBAHAN KATA (CONJUGATION FORMS ENCYCLOPEDIA)
   ========================================================================== */
export const CONJUGATION_FORMS_INFO: ConjugationFormInfo[] = [
  {
    id: 'te',
    name: 'Bentuk Sambung [~te]',
    friendlyTarget: 'Bentuk Sambung [~te]',
    japaneseName: 'て形 (Te-kei)',
    badge: 'て形',
    summary: 'Digunakan untuk menyambung kalimat, permohonan santun (~te kudasai), izin (~te mo ii), dan sedang berlangsung (~te iru).',
    nuanceExplanation: 'Merupakan bentuk paling krusial dalam tata bahasa Jepang karena menjadi fondasi dari puluhan pola kalimat lanjutan.',
    ruleExplanation: {
      godan: '• う、つ、る → って\n• む、ぶ、ぬ → んで\n• く → いて (Pengecualian: 行く → 行って)\n• ぐ → いで\n• す → して',
      ichidan: 'Buang akhiran [る], gantikan langsung dengan [て].\nContoh: 食べる → 食べて, 見る → 見て',
      irregular: '• する → して\n• 来る (くる) → 来て (きて)',
    },
    sampleExamples: [
      { dictionary: '飲む (nomu)', conjugated: '飲んで (nonde)', meaning: 'Minum lalu / Sedang minum' },
      { dictionary: '書く (kaku)', conjugated: '書いて (kaite)', meaning: 'Menulis lalu / Tolong tulis' },
      { dictionary: '食べる (taberu)', conjugated: '食べて (tabete)', meaning: 'Makan lalu / Tolong makan' },
    ],
  },
  {
    id: 'nai',
    name: 'Bentuk Negatif [~nai]',
    friendlyTarget: 'Bentuk Negatif [~nai]',
    japaneseName: 'ない形 (Nai-kei)',
    badge: 'ない形',
    summary: 'Menyatakan tidak melakukan sesuatu, larangan santun (~naide kudasai), atau keharusan (~nakereba naranai).',
    nuanceExplanation: 'Digunakan dalam percakapan kasual dan sebagai akar dari pola keharusan serta saran tidak melakukan.',
    ruleExplanation: {
      godan: 'Ubah vokal akhiran [u] menjadi baris [a], lalu tambahkan [ない].\nKhusus akhiran [う] menjadi [わない].\nContoh: 飲む → 飲まない, 買う → 買わない',
      ichidan: 'Buang akhiran [る], gantikan dengan [ない].\nContoh: 食べる → 食べない, 起きる → 起きない',
      irregular: '• する → しない\n• 来る (くる) → 来ない (こない)',
    },
    sampleExamples: [
      { dictionary: '行く (iku)', conjugated: '行かない (ikanai)', meaning: 'Tidak pergi' },
      { dictionary: '話す (hanasu)', conjugated: '話さない (hanasanai)', meaning: 'Tidak berbicara' },
      { dictionary: '見る (miru)', conjugated: '見ない (minai)', meaning: 'Tidak melihat' },
    ],
  },
  {
    id: 'ta',
    name: 'Bentuk Lampau [~ta]',
    friendlyTarget: 'Bentuk Lampau [~ta]',
    japaneseName: 'た形 (Ta-kei)',
    badge: 'た形',
    summary: 'Menyatakan kejadian lampau/selesai, pengalaman pernah melakukan (~koto ga aru), atau anjuran baiknya (~hou ga ii).',
    nuanceExplanation: 'Aturan perubahan persis 100% sama dengan Bentuk Te, hanya vokal akhir [te] diubah menjadi [ta] atau [de] menjadi [da].',
    ruleExplanation: {
      godan: '• って → った\n• んで → んだ\n• いて → いた\n• いで → いだ\n• して → した',
      ichidan: 'Buang akhiran [る], gantikan dengan [た].\nContoh: 食べる → 食べた, 寝る → 寝た',
      irregular: '• する → した\n• 来る (くる) → 来た (きた)',
    },
    sampleExamples: [
      { dictionary: '待つ (matsu)', conjugated: '待った (matta)', meaning: 'Sudah menunggu' },
      { dictionary: '遊ぶ (asobu)', conjugated: '遊んだ (asonda)', meaning: 'Sudah bermain' },
      { dictionary: '食べる (taberu)', conjugated: '食べた (tabeta)', meaning: 'Sudah makan' },
    ],
  },
  {
    id: 'masu',
    name: 'Bentuk Sopan [~masu]',
    friendlyTarget: 'Bentuk Sopan [~masu]',
    japaneseName: 'ます形 (Masu-kei)',
    badge: 'ます形',
    summary: 'Bentuk sopan sehari-hari (Desu/Masu), ajakan (~mashou), dan kata benda hasil tindakan.',
    nuanceExplanation: 'Batang kata (masu-stem / pre-masu) sering digunakan sebagai titik sambungan partikel penunjuk tujuan (V-stem + ni iku).',
    ruleExplanation: {
      godan: 'Ubah vokal akhiran [u] menjadi baris [i], lalu tambahkan [ます].\nContoh: 飲む (u) → 飲み (i) + ます → 飲みます',
      ichidan: 'Buang akhiran [る], gantikan dengan [ます].\nContoh: 食べる → 食べます, 見る → 見ます',
      irregular: '• する → します\n• 来る (くる) → 来ます (きます)',
    },
    sampleExamples: [
      { dictionary: '書く (kaku)', conjugated: '書きます (kakimasu)', meaning: 'Menulis (sopan)' },
      { dictionary: '泳ぐ (oyogu)', conjugated: '泳ぎます (oyogimasu)', meaning: 'Berenang (sopan)' },
      { dictionary: 'する (suru)', conjugated: 'します (shimasu)', meaning: 'Melakukan (sopan)' },
    ],
  },
  {
    id: 'potential',
    name: 'Bentuk Bisa / Dapat [~eru/rareru]',
    friendlyTarget: 'Bentuk Bisa / Dapat [~eru/rareru]',
    japaneseName: '可能形 (Kanou-kei)',
    badge: '可能形',
    summary: 'Menyatakan kesanggupan atau kemampuan melakukan sesuatu ("bisa/dapat..."). Partikel を biasanya berganti menjadi が.',
    nuanceExplanation: 'Digunakan untuk kemampuan intrinsik atau kondisi situasi yang memungkinkan terlaksananya tindakan.',
    ruleExplanation: {
      godan: 'Ubah vokal akhiran [u] menjadi baris [e], lalu tambahkan [る].\nContoh: 飲む → 飲める, 行く → 行ける',
      ichidan: 'Buang akhiran [る], tambahkan [られる] (lisan sering disingkat [れる]).\nContoh: 食べる → 食べられる',
      irregular: '• する → できる\n• 来る (くる) → 来られる (こられる)',
    },
    sampleExamples: [
      { dictionary: '話す (hanasu)', conjugated: '話せる (hanaseru)', meaning: 'Bisa berbicara' },
      { dictionary: '泳ぐ (oyogu)', conjugated: '泳げる (oyogeru)', meaning: 'Bisa berenang' },
      { dictionary: 'する (suru)', conjugated: 'できる (dekiru)', meaning: 'Bisa melakukan' },
    ],
  },
  {
    id: 'passive',
    name: 'Bentuk Pasif / Kena [~reru/rareru]',
    friendlyTarget: 'Bentuk Pasif / Kena [~reru/rareru]',
    japaneseName: '受身形 (Ukemi-kei)',
    badge: '受身形',
    summary: 'Menyatakan subjek yang menerima atau terkena dampak dari tindakan pihak lain ("di-...kan"), atau fakta umum sejarah.',
    nuanceExplanation: 'Dalam bahasa Jepang, pasif sering kali memiliki nuansa penderitaan (meiwaku no ukemi / merasa dirugikan).',
    ruleExplanation: {
      godan: 'Ubah vokal akhiran [u] menjadi baris [a], lalu tambahkan [れる].\nContoh: 飲む → 飲まれる, 叱る → 叱られる',
      ichidan: 'Buang akhiran [る], tambahkan [られる].\nContoh: 食べる → 食べられる, 褒める → 褒められる',
      irregular: '• する → される\n• 来る (くる) → 来られる (こられる)',
    },
    sampleExamples: [
      { dictionary: '叱る (shikaru)', conjugated: '叱られる (shikarareru)', meaning: 'Dimarahi' },
      { dictionary: '書く (kaku)', conjugated: '書かれる (kakareru)', meaning: 'Dituliskan' },
      { dictionary: 'する (suru)', conjugated: 'される (sareru)', meaning: 'Dilakukan oleh...' },
    ],
  },
  {
    id: 'causative',
    name: 'Bentuk Menyuruh / Izin [~aseru/saseru]',
    friendlyTarget: 'Bentuk Menyuruh / Izin [~aseru/saseru]',
    japaneseName: '使役形 (Shieki-kei)',
    badge: '使役形',
    summary: 'Menyatakan membuat seseorang melakukan tindakan, menyuruh anak/bawahan, atau memberi izin ("membiarkan/mengizinkan").',
    nuanceExplanation: 'Sering digabung dengan 〜てください untuk permohonan santun: 〜(さ)せてください (Izinkan saya melakukan...).',
    ruleExplanation: {
      godan: 'Ubah vokal akhiran [u] menjadi baris [a], lalu tambahkan [せる].\nContoh: 飲む → 飲ませる, 行く → 行かせる',
      ichidan: 'Buang akhiran [る], tambahkan [させる].\nContoh: 食べる → 食べさせる',
      irregular: '• する → させる\n• 来る (くる) → 来させる (こさせる)',
    },
    sampleExamples: [
      { dictionary: '待つ (matsu)', conjugated: '待たせる (mataseru)', meaning: 'Membuat menunggu' },
      { dictionary: '行く (iku)', conjugated: '行かせる (ikaseru)', meaning: 'Menyuruh pergi' },
      { dictionary: '食べる (taberu)', conjugated: '食べさせる (tabesaseru)', meaning: 'Menyuapi / memberi makan' },
    ],
  },
  {
    id: 'ba',
    name: 'Bentuk Pengandaian [~ba]',
    friendlyTarget: 'Bentuk Pengandaian [~ba]',
    japaneseName: 'ば形 (Ba-kei)',
    badge: 'ば形',
    summary: 'Menyatakan prasyarat atau kondisi pengandaian ("jika / kalau..."). Fokus pada syarat mutlak.',
    nuanceExplanation: 'Digunakan dalam peribahasa, instruksi resmi, dan hubungan sebab-akibat langsung.',
    ruleExplanation: {
      godan: 'Ubah vokal akhiran [u] menjadi baris [e], lalu tambahkan [ば].\nContoh: 飲む → 飲めば, 行く → 行けば',
      ichidan: 'Buang akhiran [る], tambahkan [れば].\nContoh: 食べる → 食べれば, 見る → 見れば',
      irregular: '• する → すれば\n• 来る (くる) → 来れば (くれば)',
    },
    sampleExamples: [
      { dictionary: '飲む (nomu)', conjugated: '飲めば (nomeba)', meaning: 'Jika minum' },
      { dictionary: '行く (iku)', conjugated: '行けば (ikeba)', meaning: 'Jika pergi' },
      { dictionary: '食べる (taberu)', conjugated: '食べれば (tabereba)', meaning: 'Jika makan' },
    ],
  },
  {
    id: 'volitional',
    name: 'Bentuk Ajakan / Niat [~ou/you]',
    friendlyTarget: 'Bentuk Ajakan / Niat [~ou/you]',
    japaneseName: '意向形 (Ikou-kei)',
    badge: '意向形',
    summary: 'Menyatakan ajakan informal ("Ayo...") atau niat/tekad kuat pribadi ("Saya akan...").',
    nuanceExplanation: 'Merupakan bentuk kasual dari 〜ましょう. Sering disambung dengan と思う (berniat untuk...).',
    ruleExplanation: {
      godan: 'Ubah vokal akhiran [u] menjadi baris [o] panjang ([おう]).\nContoh: 飲む → 飲もう, 行く → 行こう',
      ichidan: 'Buang akhiran [る], tambahkan [よう].\nContoh: 食べる → 食べよう, 起きる → 起きよう',
      irregular: '• する → しよう\n• 来る (くる) → 来よう (こよう)',
    },
    sampleExamples: [
      { dictionary: '話す (hanasu)', conjugated: '話そう (hanasou)', meaning: 'Ayo berbicara / Hendak bicara' },
      { dictionary: '食べる (taberu)', conjugated: '食べよう (tabeyou)', meaning: 'Ayo makan / Hendak makan' },
      { dictionary: '行く (iku)', conjugated: '行こう (ikou)', meaning: 'Ayo pergi / Hendak pergi' },
    ],
  },
  {
    id: 'causative_passive',
    name: 'Bentuk Terpaksa / Kausatif-Pasif [~(sa)serareru]',
    friendlyTarget: 'Bentuk Terpaksa / Kausatif-Pasif',
    japaneseName: '使役受身形 (Shieki-ukemi)',
    badge: '使役受身',
    summary: 'Menyatakan terpaksa atau dibuat harus melakukan sesuatu di luar kehendak sendiri ("terpaksa...").',
    nuanceExplanation: 'Kombinasi kausatif + pasif yang sangat bernuansa emosional/keluhan dalam percakapan nyata.',
    ruleExplanation: {
      godan: 'Ubah [u] menjadi [a] + せられる (sering disingkat menjadi 〜される).\nContoh: 待つ → 待たされる, 飲む → 飲まされる',
      ichidan: 'Buang akhiran [る], tambahkan [させられる].\nContoh: 食べる → 食べさせられる',
      irregular: '• する → させられる\n• 来る (くる) → 来させられる (こさせられる)',
    },
    sampleExamples: [
      { dictionary: '待つ (matsu)', conjugated: '待たされる (matasareru)', meaning: 'Terpaksa menunggu' },
      { dictionary: '飲む (nomu)', conjugated: '飲まされる (nomasareru)', meaning: 'Terpaksa minum' },
      { dictionary: '食べる (taberu)', conjugated: '食べさせられる (tabesaserareru)', meaning: 'Dipaksa makan' },
    ],
  },
  {
    id: 'tai',
    name: 'Bentuk Keinginan [~tai]',
    friendlyTarget: 'Bentuk Keinginan [~tai]',
    japaneseName: 'たい形 (Tai-kei)',
    badge: 'たい形',
    summary: 'Menyatakan keinginan subjektif pembicara ("ingin / mau melakukan..."). Berkonjugasi seperti kata sifat-i.',
    nuanceExplanation: 'Khusus untuk keinginan diri sendiri atau pertanyaan langsung ke lawan bicara akrab.',
    ruleExplanation: {
      godan: 'Masu-stem (akar vokal [i]) + たい.\nContoh: 飲む → 飲みたい, 行く → 行きたい',
      ichidan: 'Buang akhiran [る], tambahkan [たい].\nContoh: 食べる → 食べたい, 見る → 見たい',
      irregular: '• する → したい\n• 来る (くる) → 来たい (きたい)',
    },
    sampleExamples: [
      { dictionary: '飲む (nomu)', conjugated: '飲みたい (nomitai)', meaning: 'Ingin minum' },
      { dictionary: '行く (iku)', conjugated: '行きたい (ikitai)', meaning: 'Ingin pergi' },
      { dictionary: '見る (miru)', conjugated: '見たい (mitai)', meaning: 'Ingin melihat' },
    ],
  },
  {
    id: 'tara',
    name: 'Bentuk Kondisional [~tara]',
    friendlyTarget: 'Bentuk Kondisional [~tara]',
    japaneseName: 'たら形 (Tara-kei)',
    badge: 'たら形',
    summary: 'Menyatakan urutan waktu ("setelah...") atau pengandaian santai ("kalau/jika...").',
    nuanceExplanation: 'Paling umum dan serbaguna dalam percakapan sehari-hari dibanding ba atau to.',
    ruleExplanation: {
      godan: 'Bentuk lampau [た/だ] + ら.\nContoh: 飲む → 飲んだら, 行く → 行ったら',
      ichidan: 'Bentuk lampau [た] + ら.\nContoh: 食べる → 食べたら, 見る → 見たら',
      irregular: '• する → したら\n• 来る (くる) → 来たら (きたら)',
    },
    sampleExamples: [
      { dictionary: '飲む (nomu)', conjugated: '飲んだら (nondara)', meaning: 'Kalau/setelah minum' },
      { dictionary: '行く (iku)', conjugated: '行ったら (ittara)', meaning: 'Kalau/setelah pergi' },
      { dictionary: '食べる (taberu)', conjugated: '食べたら (tabetara)', meaning: 'Kalau/setelah makan' },
    ],
  },
  {
    id: 'imperative',
    name: 'Bentuk Perintah [Imperatif]',
    friendlyTarget: 'Bentuk Perintah [Imperatif]',
    japaneseName: '命令形 (Meirei-kei)',
    badge: '命令形',
    summary: 'Bentuk perintah langsung, tegas, atau darurat ("Lakukan!").',
    nuanceExplanation: 'Bernuansa keras/kasar, digunakan di rambu lalu lintas darurat, militer, atau sorakan olahraga.',
    ruleExplanation: {
      godan: 'Ubah vokal akhiran [u] menjadi baris [e].\nContoh: 飲む → 飲め, 行く → 行け, 話す → 話せ',
      ichidan: 'Buang akhiran [る], tambahkan [ろ].\nContoh: 食べる → 食べろ, 起きる → 起きろ',
      irregular: '• する → しろ\n• 来る (くる) → 来い (こい)',
    },
    sampleExamples: [
      { dictionary: '行く (iku)', conjugated: '行け (ike)', meaning: 'Pergilah!' },
      { dictionary: '待つ (matsu)', conjugated: '待て (mate)', meaning: 'Tunggulah!' },
      { dictionary: '食べる (taberu)', conjugated: '食べろ (tabero)', meaning: 'Makanlah!' },
    ],
  },
];

/* ==========================================================================
   3. PANDUAN KELAS KATA LAINNYA (KATA SIFAT & KATA BENDA)
   ========================================================================== */
export const WORD_CLASS_GUIDES: WordClassGuide[] = [
  {
    id: 'doushi_groups',
    title: 'Pembagian 3 Golongan Kata Kerja (動詞)',
    japaneseTitle: '動詞のグループ分類',
    description: 'Seluruh kata kerja bahasa Jepang terbagi secara mutlak ke dalam 3 kelompok utama yang menentukan pola perubahannya.',
    subGroups: [
      {
        name: 'Golongan 1: Godan Doushi (五段動詞)',
        rule: 'Kata kerja yang berakhiran suku kata vokal [u] (u, ku, gu, su, tsu, nu, bu, mu, ru) dan TIDAK didahului vokal [i/e] sebelum ru.',
        examples: ['飲む (nomu)', '行く (iku)', '話す (hanasu)', '待つ (matsu)', '買う (kau)'],
      },
      {
        name: 'Golongan 2: Ichidan Doushi (一段動詞)',
        rule: 'Hampir selalu berakhiran [-iru] atau [-eru]. Perubahannya sangat mudah: cukup buang [る] lalu pasang akhiran bentuk baru.',
        examples: ['食べる (taberu - vokal e)', '見る (miru - vokal i)', '起きる (okiru)', '寝る (neru)'],
      },
      {
        name: 'Golongan 3: Fukisoku Doushi (不規則動詞)',
        rule: 'HANYA terdiri dari 2 kata unik yang memiliki konjugasi khusus: する (suru) dan 来る (kuru).',
        examples: ['する (suru) / 勉強する', '来る (kuru) / 持ってくる'],
      },
    ],
  },
  {
    id: 'keiyoushi_i',
    title: 'Kata Sifat-i (い形容詞)',
    japaneseTitle: 'い形容詞の活用',
    description: 'Kata sifat yang berakhiran huruf [い] asli dan dapat langsung menempel di depan kata benda.',
    subGroups: [
      {
        name: 'Bentuk Positif & Lampau',
        rule: '• Sekarang: [〜い] (高い = Mahal)\n• Lampau: Buang [い] + [かった] (高かった = Dulu mahal)',
        examples: [
          '高い (takai) → 高かった (takakatta) (Mahal → Dulu mahal)',
          '暑い (atsui) → 暑かった (atsukatta) (Panas → Dulu panas)',
        ],
      },
      {
        name: 'Bentuk Negatif',
        rule: '• Negatif Sekarang: Buang [い] + [くない] (高くない = Tidak mahal)\n• Negatif Lampau: Buang [い] + [くなかった] (高くなかった = Dulu tidak mahal)',
        examples: [
          '安い (yasui) → 安くない (yasukunai) (Murah → Tidak murah)',
          '寒い (samui) → 寒くなかった (samukunakatta) (Dingin → Dulu tidak dingin)',
        ],
      },
      {
        name: 'Bentuk Sambung & Keterangan (Adverb)',
        rule: '• Menyambung kalimat: Buang [い] + [くて] (安くて美味しい = Murah dan enak)\n• Menjadi Adverb (kata keterangan): Buang [い] + [く] + V (早く起きる = Bangun pagi)',
        examples: [
          '早い (hayai) → 早く (hayaku) + V (Cepat → Dengan cepat)',
          '美味しい (oishii) → 美味しくて (oishikute) (Enak → Enak dan...)',
        ],
      },
    ],
  },
  {
    id: 'keiyoushi_na',
    title: 'Kata Sifat-na (な形容詞)',
    japaneseTitle: 'な形容詞の活用',
    description: 'Kata sifat yang memerlukan partikel [な] saat memodifikasi kata benda, dan bertingkah mirip kata benda saat konjugasi.',
    subGroups: [
      {
        name: 'Modifikasi Kata Benda',
        rule: '• Pola: [Kata Sifat-na] + [な] + [Kata Benda]\n• Fungsi: Menerangkan kata benda secara langsung (atributif)',
        examples: [
          '有名 (yuumei) → 有名な人 (yuumei na hito) (Terkenal → Orang terkenal)',
          '綺麗 (kirei) → 綺麗な花 (kirei na hana) (Cantik/Indah → Bunga indah)',
          '静か (shizuka) → 静かな部屋 (shizuka na heya) (Tenang → Kamar tenang)',
        ],
      },
      {
        name: 'Predikat (Akhir Kalimat)',
        rule: '• Sekarang Positif: [〜だ / です] (静かです = Tenang)\n• Lampau: [〜だった / でした] (静かでした = Dulu tenang)\n• Negatif: [〜ではない / じゃありません] (静かじゃない = Tidak tenang)',
        examples: [
          '便利 (benri) → 便利です (benri desu) (Praktis → Praktis [positif])',
          '静か (shizuka) → 静かでした (shizuka deshita) (Tenang → Dulu tenang [lampau])',
          '好き (suki) → 好きじゃない (suki ja nai) (Suka → Tidak suka [negatif])',
        ],
      },
      {
        name: 'Menjadi Kata Keterangan (Adverb)',
        rule: '• Pola: [Kata Sifat-na] + [に] + [Kata Kerja]\n• Fungsi: Mengubah kata sifat menjadi kata keterangan cara (Adverb)',
        examples: [
          '静か (shizuka) → 静かに (shizuka ni) + V (Tenang → Dengan tenang)',
          '上手 (jouzu) → 上手に (jouzu ni) + V (Mahir → Dengan mahir)',
          '下手 (heta) → 下手に (heta ni) + V (Kaku → Dengan kaku/kurang mahir)',
        ],
      },
    ],
  },
  {
    id: 'meishi',
    title: 'Kata Benda (名詞)',
    japaneseTitle: '名詞の活用と接続',
    description: 'Kata benda tidak memiliki konjugasi sendiri, namun menyatu dengan kopula [だ / です] dan partikel sambung.',
    subGroups: [
      {
        name: 'Kopula Predikat',
        rule: '• Sekarang Positif: [N だ / です] (学生です = Adalah siswa)\n• Lampau: [N だった / でした] (学生でした = Dulu adalah siswa)\n• Negatif: [N ではない / じゃありません] (学生じゃない = Bukan siswa)',
        examples: [
          '学生 (gakusei) → 学生です (gakusei desu) (Siswa → Adalah siswa)',
          '雨 (ame) → 雨でした (ame deshita) (Hujan → Dulu hujan [lampau])',
          '日本人 (nihonjin) → 日本人じゃない (nihonjin ja nai) (Orang Jepang → Bukan orang Jepang)',
        ],
      },
      {
        name: 'Menyambung dengan Kata Benda Lain',
        rule: '• Pola: [Kata Benda A] + [の] + [Kata Benda B]\n• Fungsi: Menyatakan kepemilikan, asal negara/tempat, atau kategori materi',
        examples: [
          '先生 (sensei) → 先生の本 (sensei no hon) (Guru → Buku milik guru)',
          '日本 (nihon) → 日本の車 (nihon no kuruma) (Jepang → Mobil buatan Jepang)',
          '日本語 (nihongo) → 日本語の勉強 (nihongo no benkyou) (Bahasa Jepang → Belajar bahasa Jepang)',
        ],
      },
    ],
  },
];

/* ==========================================================================
   4. GENERATOR SOAL LATIHAN KONJUGASI INTERAKTIF (DRILL GENERATOR)
   ========================================================================== */

export interface ConjugationDrillQuestion extends Question {
  targetVerb: {
    id: string;
    kanji: string;
    reading: string;
    meaningId: string;
    group: VerbGroup;
  };
  targetForm: {
    id: string;
    name: string;
    friendlyTarget?: string;
    japaneseName: string;
  };
}

/**
 * Converts a raw KotobaItem from KOTOBA_DATABASE into a complete, conjugatable VerbItem.
 * Uses the high-precision J-LIE morphological inflection engine to derive all 13 forms automatically.
 */
export function kotobaItemToVerbItem(item: KotobaItem): VerbItem | null {
  if (!item || !item.word) return null;
  const w = item.word.trim();
  const r = (item.reading || w).trim();
  try {
    const res = conjugateVerb(w, r);
    const grp: VerbGroup = res.group === 'suru' || res.group === 'kuru' ? 'irregular' : res.group;
    return {
      id: item.id,
      kanji: w,
      reading: r,
      romaji: item.meaningEn || '',
      meaningId: item.meaningId || '',
      group: grp,
      forms: {
        dictionary: res.forms.jisho?.japanese || w,
        masu: res.forms.masu?.japanese || '',
        te: res.forms.te?.japanese || '',
        ta: res.forms.ta?.japanese || '',
        nai: res.forms.nai?.japanese || '',
        potential: res.forms.potential?.japanese || '',
        passive: res.forms.passive?.japanese || '',
        causative: res.forms.causative?.japanese || '',
        ba: res.forms.ba?.japanese || '',
        volitional: res.forms.volitional?.japanese || '',
        causative_passive: res.forms.causative_passive?.japanese,
        tai: res.forms.tai?.japanese,
        tara: res.forms.tara?.japanese,
        imperative: res.forms.imperative?.japanese,
      },
      formsReadings: {
        dictionary: res.forms.jisho?.reading || r,
        masu: res.forms.masu?.reading || '',
        te: res.forms.te?.reading || '',
        ta: res.forms.ta?.reading || '',
        nai: res.forms.nai?.reading || '',
        potential: res.forms.potential?.reading || '',
        passive: res.forms.passive?.reading || '',
        causative: res.forms.causative?.reading || '',
        ba: res.forms.ba?.reading || '',
        volitional: res.forms.volitional?.reading || '',
        causative_passive: res.forms.causative_passive?.reading,
        tai: res.forms.tai?.reading,
        tara: res.forms.tara?.reading,
        imperative: res.forms.imperative?.reading,
      },
    };
  } catch {
    return null;
  }
}

export function generateConjugationQuestion(
  targetFormId?: string,
  targetVerb?: VerbItem,
  allowedFormIds?: string[]
): ConjugationDrillQuestion {
  // 1. Pick a verb randomly or use targetVerb
  const verb = targetVerb || VERB_CONJUGATION_DATABASE[Math.floor(Math.random() * VERB_CONJUGATION_DATABASE.length)];
  
  // 2. Pick target form from allowed forms or entire catalogue
  let availableForms = CONJUGATION_FORMS_INFO;
  if (allowedFormIds && allowedFormIds.length > 0) {
    const filtered = CONJUGATION_FORMS_INFO.filter(f => allowedFormIds.includes(f.id));
    if (filtered.length > 0) {
      availableForms = filtered;
    }
  }

  const formInfo = targetFormId
    ? availableForms.find(f => f.id === targetFormId) || availableForms[0]
    : availableForms[Math.floor(Math.random() * availableForms.length)];

  const correctFormKey = formInfo.id as keyof VerbItem['forms'];
  const correctAnswer = verb.forms[correctFormKey] || verb.forms.te || verb.forms.dictionary;

  // 3. Generate 3 smart distractors based on morphological patterns
  const distractors: string[] = [];

  // Distractor 1: Wrong group assumption
  if (verb.group === 'godan') {
    if (correctFormKey === 'te') distractors.push(verb.reading.slice(0, -1) + 'て');
    else if (correctFormKey === 'nai') distractors.push(verb.reading.slice(0, -1) + 'ない');
    else if (correctFormKey === 'potential') distractors.push(verb.reading.slice(0, -1) + 'られる');
    else if (correctFormKey === 'passive') distractors.push(verb.reading.slice(0, -1) + 'られる');
    else if (correctFormKey === 'causative') distractors.push(verb.reading.slice(0, -1) + 'させる');
    else if (correctFormKey === 'ba') distractors.push(verb.reading.slice(0, -1) + 'れば');
    else if (correctFormKey === 'volitional') distractors.push(verb.reading.slice(0, -1) + 'よう');
    else if (correctFormKey === 'imperative') distractors.push(verb.reading.slice(0, -1) + 'ろ');
    else distractors.push(verb.reading.slice(0, -1) + 'た');
  } else if (verb.group === 'ichidan') {
    if (correctFormKey === 'te') distractors.push(verb.reading.slice(0, -1) + 'って');
    else if (correctFormKey === 'nai') distractors.push(verb.reading.slice(0, -1) + 'らない');
    else if (correctFormKey === 'potential') distractors.push(verb.reading.slice(0, -1) + 'れる');
    else if (correctFormKey === 'passive') distractors.push(verb.reading.slice(0, -1) + 'れる');
    else if (correctFormKey === 'causative') distractors.push(verb.reading.slice(0, -1) + 'せる');
    else if (correctFormKey === 'ba') distractors.push(verb.reading.slice(0, -1) + 'えば');
    else if (correctFormKey === 'volitional') distractors.push(verb.reading.slice(0, -1) + 'ろう');
    else if (correctFormKey === 'imperative') distractors.push(verb.reading.slice(0, -1) + 'え');
    else distractors.push(verb.reading.slice(0, -1) + 'った');
  } else {
    // Irregular errors
    if (correctFormKey === 'te') distractors.push(verb.reading + 'て');
    else if (correctFormKey === 'nai') distractors.push(verb.reading + 'ない');
    else distractors.push(verb.reading + 'た');
  }

  // Distractor 2: Pick an adjacent real form of the same verb
  const otherKeys = (Object.keys(verb.forms) as (keyof VerbItem['forms'])[])
    .filter(k => k !== correctFormKey && verb.forms[k]);
  if (otherKeys.length > 0) {
    const otherKey = otherKeys[Math.floor(Math.random() * otherKeys.length)];
    const adjacent = verb.forms[otherKey];
    if (adjacent && adjacent !== correctAnswer) {
      distractors.push(adjacent);
    }
  }

  // Distractor 3: Common misapplied suffix
  if (correctFormKey === 'potential') {
    distractors.push(verb.kanji + 'できる');
  } else if (correctFormKey === 'passive') {
    distractors.push(verb.reading.slice(0, -1) + 'される');
  } else if (correctFormKey === 'causative_passive') {
    distractors.push(verb.reading.slice(0, -1) + 'さられる');
  } else if (correctFormKey === 'tai') {
    distractors.push(verb.kanji + 'ほしい');
  } else if (correctFormKey === 'volitional') {
    distractors.push(verb.kanji + 'ましょう');
  } else if (correctFormKey === 'te') {
    distractors.push(verb.reading.slice(0, -1) + 'いで');
  } else {
    distractors.push(verb.reading.slice(0, -1) + 'ます');
  }

  // Clean distractors: unique and not equal to correctAnswer
  const uniqueDistractors = Array.from(new Set(distractors.filter(d => d && d !== correctAnswer))).slice(0, 3);
  
  // Fallbacks if duplicates occurred
  while (uniqueDistractors.length < 3) {
    uniqueDistractors.push(`${verb.reading}（変化${uniqueDistractors.length + 1}）`);
  }

  // Shuffle options using true Fisher-Yates
  const allOptions = fisherYatesShuffle([correctAnswer, ...uniqueDistractors]);
  const correctIndex = allOptions.indexOf(correctAnswer);

  // Exact hiragana readings for all options
  const allOptionsRuby = allOptions.map(opt => getConjugatedFormReading(verb, opt));

  const groupLabel = verb.group === 'godan'
    ? 'Golongan 1 (Godan / 五段動詞)'
    : verb.group === 'ichidan'
    ? 'Golongan 2 (Ichidan / 一段動詞)'
    : 'Golongan 3 (Irregular / 不規則動詞)';

  const targetLabel = formInfo.friendlyTarget || formInfo.name;
  const formDisplay = getTargetFormDisplay(formInfo.id);

  return {
    id: `drill_${verb.id}_${formInfo.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    instruction: `次の動詞を「${formInfo.japaneseName}」に変えなさい。`,
    instructionId: `${verb.kanji} ＋ ${formDisplay.suffix}`,
    prompt: `${verb.kanji} ＋ ${formDisplay.suffix}`,
    ruby: `${verb.reading} ＋ ${formDisplay.suffix}`,
    translation: verb.meaningId,
    options: allOptions,
    optionsRuby: allOptionsRuby,
    correctIndex,
    explanation: `Kata kerja 「${verb.kanji}」 (${verb.reading}) termasuk ${groupLabel}. Perubahan ke ${targetLabel} yang benar adalah 「${correctAnswer}」.`,
    targetVerb: {
      id: verb.id,
      kanji: verb.kanji,
      reading: verb.reading,
      meaningId: verb.meaningId,
      group: verb.group,
    },
    targetForm: {
      id: formInfo.id,
      name: formInfo.name,
      friendlyTarget: targetLabel,
      japaneseName: formInfo.japaneseName,
    },
  };
}

/**
 * Helper to get clean target conjugation suffix and badge
 * Example: 'ta' -> { suffix: '〜た', badge: 'た形', label: 'Bentuk Lampau' }
 */
export function getTargetFormDisplay(formId: string): { suffix: string; badge: string; label: string } {
  switch (formId) {
    case 'te':
      return { suffix: '〜て', badge: 'て形', label: 'Bentuk Sambung' };
    case 'ta':
      return { suffix: '〜た', badge: 'た形', label: 'Bentuk Lampau' };
    case 'nai':
      return { suffix: '〜ない', badge: 'ない形', label: 'Bentuk Negatif' };
    case 'masu':
      return { suffix: '〜ます', badge: 'ます形', label: 'Bentuk Sopan' };
    case 'potential':
      return { suffix: '〜(ら)れる', badge: '可能形', label: 'Bisa / Dapat' };
    case 'volitional':
      return { suffix: '〜(よ)う', badge: '意向形', label: 'Ajakan / Niat' };
    case 'passive':
      return { suffix: '〜(ら)れる', badge: '受身形', label: 'Bentuk Pasif' };
    case 'causative':
      return { suffix: '〜(さ)せる', badge: '使役形', label: 'Menyuruh / Izin' };
    case 'ba':
      return { suffix: '〜ば', badge: 'ば形', label: 'Jika / Pengandaian' };
    case 'causative_passive':
      return { suffix: '〜(さ)せられる', badge: '使役受身', label: 'Terpaksa / Disuruh' };
    case 'tai':
      return { suffix: '〜たい', badge: 'たい形', label: 'Keinginan / Mau' };
    case 'tara':
      return { suffix: '〜たら', badge: 'たら形', label: 'Bila / Kalau' };
    case 'imperative':
      return { suffix: '〜ろ/え', badge: '命令形', label: 'Perintah (Imperatif)' };
    default:
      return { suffix: '〜' + formId, badge: `${formId}形`, label: formId };
  }
}

/**
 * Helper to get conjugated meaning in Indonesian for post-answer display
 * Example: ('Mati / Meninggal', 'ta') -> 'Sudah / Telah mati / meninggal'
 */
export function getConjugatedMeaningId(baseMeaning: string, formId: string): string {
  if (!baseMeaning) return '';
  const clean = baseMeaning.trim();
  const lower = clean.toLowerCase();

  switch (formId) {
    case 'ta':
      return 'Sudah / Telah ' + lower;
    case 'nai':
      return 'Tidak ' + lower;
    case 'masu':
      return clean + ' (sopan)';
    case 'te':
      return clean + ' lalu... / Sedang ' + lower;
    case 'potential':
      return 'Bisa / Dapat ' + lower;
    case 'volitional':
      return 'Ayo / Mari ' + lower;
    case 'ba':
      return 'Jika / Kalau ' + lower;
    case 'passive':
      return 'Di-' + lower + ' (pasif)';
    case 'causative':
      return 'Menyuruh / Membuat ' + lower;
    case 'causative_passive':
      return 'Terpaksa / Dibuat ' + lower;
    case 'tai':
      return 'Ingin / Mau ' + lower;
    case 'tara':
      return 'Kalau / Setelah ' + lower;
    case 'imperative':
      return 'Lakukanlah! (Perintah): ' + clean;
    default:
      return clean;
  }
}

