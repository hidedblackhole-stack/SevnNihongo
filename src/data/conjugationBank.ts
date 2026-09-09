import { findSubBranch } from './bunpouSubKnowledge';
import { SubFormulaBranch } from '../types/content';

export interface ConjugationPattern {
  id: string;
  nameJa: string;
  nameId: string;
  nameEn: string;
  symbol: string;
  formation: {
    groupI: string;
    groupII: string;
    groupIII: string;
  };
  shortDescription: string;
}

export interface GrammarConnector {
  id: string;
  token: string;
  nameId: string;
  nameEn: string;
  description: string;
  subBranch?: SubFormulaBranch;
}

// ─── Base Conjugation Patterns ──────────────────────────────────────

export const CONJUGATION_PATTERNS: Record<string, ConjugationPattern> = {
  // ── Verb Forms ──
  jisho: {
    id: 'jisho',
    nameJa: '辞書形',
    nameId: 'Bentuk Kamus',
    nameEn: 'Dictionary Form',
    symbol: 'Vる',
    formation: {
      groupI: 'Bentuk dasar: 書く、読む、話す',
      groupII: 'Bentuk dasar: 食べる、見る、起きる',
      groupIII: 'する、来る（くる）',
    },
    shortDescription: 'Bentuk dasar kata kerja yang ditemukan di kamus. Digunakan dalam kalimat informal.',
  },
  masu: {
    id: 'masu',
    nameJa: 'ます形',
    nameId: 'Bentuk Sopan',
    nameEn: 'Polite Form',
    symbol: 'Vます',
    formation: {
      groupI: 'Ubah akhiran う段 → い段 + ます\n書く → 書きます、読む → 読みます、話す → 話します',
      groupII: 'Hapus る + ます\n食べる → 食べます、見る → 見ます',
      groupIII: 'する → します、来る → 来（き）ます',
    },
    shortDescription: 'Bentuk sopan/formal kata kerja. Stem ます juga digunakan sebagai dasar banyak pola.',
  },
  te_kei: {
    id: 'te_kei',
    nameJa: 'て形',
    nameId: 'Bentuk Te',
    nameEn: 'Te-form',
    symbol: 'Vて',
    formation: {
      groupI: 'く→いて、ぐ→いで、す→して、む/ぶ/ぬ→んで、う/つ/る→って\n書く→書いて、泳ぐ→泳いで、話す→話して、読む→読んで、買う→買って',
      groupII: 'Hapus る + て\n食べる → 食べて、見る → 見て',
      groupIII: 'する → して、来る → 来（き）て',
    },
    shortDescription: 'Bentuk sambung serbaguna. Digunakan untuk menghubungkan kalimat, meminta tolong, menyatakan sedang berlangsung, dll.',
  },
  te_kei_voiced: {
    id: 'te_kei_voiced',
    nameJa: 'で形',
    nameId: 'Bentuk De (Te bersuara)',
    nameEn: 'Voiced Te-form',
    symbol: 'Vで',
    formation: {
      groupI: 'ぐ→いで、む/ぶ/ぬ→んで\n泳ぐ→泳いで、読む→読んで、遊ぶ→遊んで',
      groupII: '(Tidak berlaku — selalu て)',
      groupIII: '(Tidak berlaku)',
    },
    shortDescription: 'Varian bersuara dari bentuk て, muncul pada kata kerja Grup I tertentu.',
  },
  nai: {
    id: 'nai',
    nameJa: 'ない形',
    nameId: 'Bentuk Negatif',
    nameEn: 'Negative Form',
    symbol: 'Vない',
    formation: {
      groupI: 'Ubah akhiran う段 → あ段 + ない\n書く → 書かない、読む → 読まない、買う → 買わない',
      groupII: 'Hapus る + ない\n食べる → 食べない、見る → 見ない',
      groupIII: 'する → しない、来る → 来（こ）ない',
    },
    shortDescription: 'Bentuk negatif informal. Basis untuk banyak pola negatif lainnya.',
  },
  ta: {
    id: 'ta',
    nameJa: 'た形',
    nameId: 'Bentuk Lampau',
    nameEn: 'Past Form',
    symbol: 'Vた',
    formation: {
      groupI: 'Sama dengan て形, ganti て→た、で→だ\n書く→書いた、泳ぐ→泳いだ、話す→話した、読む→読んだ',
      groupII: 'Hapus る + た\n食べる → 食べた、見る → 見た',
      groupIII: 'する → した、来る → 来（き）た',
    },
    shortDescription: 'Bentuk lampau informal. Pola pembentukannya sama dengan て形.',
  },
  ukemi: {
    id: 'ukemi',
    nameJa: '受身形',
    nameId: 'Bentuk Pasif',
    nameEn: 'Passive Form',
    symbol: 'Vれる',
    formation: {
      groupI: 'Ubah akhiran う段 → あ段 + れる\n書く → 書かれる、読む → 読まれる、話す → 話される',
      groupII: 'Hapus る + られる\n食べる → 食べられる、見る → 見られる',
      groupIII: 'する → される、来る → 来（こ）られる',
    },
    shortDescription: 'Menyatakan tindakan yang diterima subjek. Juga digunakan untuk menyatakan fakta tanpa menyebut pelaku.',
  },
  shieki: {
    id: 'shieki',
    nameJa: '使役形',
    nameId: 'Bentuk Kausatif',
    nameEn: 'Causative Form',
    symbol: 'V(さ)せる',
    formation: {
      groupI: 'Ubah akhiran う段 → あ段 + せる\n書く → 書かせる、読む → 読ませる',
      groupII: 'Hapus る + させる\n食べる → 食べさせる、見る → 見させる',
      groupIII: 'する → させる、来る → 来（こ）させる',
    },
    shortDescription: 'Menyatakan "menyuruh/membiarkan seseorang melakukan sesuatu".',
  },
  shieki_te: {
    id: 'shieki_te',
    nameJa: '使役て形',
    nameId: 'Bentuk Kausatif + Te',
    nameEn: 'Causative Te-form',
    symbol: 'V(さ)せて',
    formation: {
      groupI: 'V使役形 → させる → させて\n書く → 書かせて、読む → 読ませて',
      groupII: 'V使役形 → させる → させて\n食べる → 食べさせて',
      groupIII: 'する → させて、来る → 来させて',
    },
    shortDescription: 'Bentuk て dari kausatif. Sering dipakai untuk meminta izin: V(さ)せてください.',
  },
  ikou: {
    id: 'ikou',
    nameJa: '意向形',
    nameId: 'Bentuk Ajakan / Kemauan',
    nameEn: 'Volitional Form',
    symbol: 'Vよう',
    formation: {
      groupI: 'Ubah akhiran う段 → おう段\n書く → 書こう、読む → 読もう、話す → 話そう',
      groupII: 'Hapus る + よう\n食べる → 食べよう、見る → 見よう',
      groupIII: 'する → しよう、来る → 来（こ）よう',
    },
    shortDescription: 'Menyatakan ajakan ("Ayo...") atau niat/kemauan ("Saya akan...").',
  },
  ba: {
    id: 'ba',
    nameJa: 'ば形',
    nameId: 'Bentuk Kondisional -ba',
    nameEn: 'Conditional ba-form',
    symbol: 'Vば',
    formation: {
      groupI: 'Ubah akhiran う段 → え段 + ば\n書く → 書けば、読む → 読めば',
      groupII: 'Hapus る + れば\n食べる → 食べれば、見る → 見れば',
      groupIII: 'する → すれば、来る → 来（く）れば',
    },
    shortDescription: 'Menyatakan kondisi "kalau/jika..." dengan nuansa syarat.',
  },
  meirei: {
    id: 'meirei',
    nameJa: '命令形',
    nameId: 'Bentuk Perintah',
    nameEn: 'Imperative Form',
    symbol: 'V命令形',
    formation: {
      groupI: 'Ubah akhiran う段 → え段\n書く → 書け、読む → 読め',
      groupII: 'Hapus る + ろ (atau よ)\n食べる → 食べろ、見る → 見ろ',
      groupIII: 'する → しろ／せよ、来る → 来（こ）い',
    },
    shortDescription: 'Perintah langsung/kasar. Sering muncul di papan tanda, olahraga, atau situasi darurat.',
  },
  kano: {
    id: 'kano',
    nameJa: '可能形',
    nameId: 'Bentuk Potensi / Bisa',
    nameEn: 'Potential Form',
    symbol: 'Vれる',
    formation: {
      groupI: 'Ubah akhiran う段 → え段 + る\n書く → 書ける、読む → 読める',
      groupII: 'Hapus る + られる (sering disingkat → れる)\n食べる → 食べられる／食べれる',
      groupIII: 'する → できる、来る → 来（こ）られる',
    },
    shortDescription: 'Menyatakan kemampuan "bisa melakukan...". Grup II sering disingkat tanpa ら (ら抜き).',
  },
  zu: {
    id: 'zu',
    nameJa: 'ず形',
    nameId: 'Bentuk Negatif Formal (-zu)',
    nameEn: 'Zu-form (literary negative)',
    symbol: 'Vずに',
    formation: {
      groupI: 'Ubah akhiran う段 → あ段 + ずに\n書く → 書かずに、読む → 読まずに',
      groupII: 'Hapus る + ずに\n食べる → 食べずに',
      groupIII: 'する → せずに、来る → 来（こ）ずに',
    },
    shortDescription: 'Bentuk negatif literer yang berarti "tanpa melakukan V". Lebih formal dari Vないで.',
  },

  // ── Adjective / Noun forms ──
  adj_i: {
    id: 'adj_i',
    nameJa: 'い形容詞',
    nameId: 'Kata Sifat -i',
    nameEn: 'I-Adjective',
    symbol: 'A',
    formation: {
      groupI: 'Bentuk dasar: 大きい、高い、新しい',
      groupII: 'く形: い → く (大きい → 大きく)',
      groupIII: 'かった: い → かった (大きい → 大きかった)',
    },
    shortDescription: 'Kata sifat berakhiran い. Berkonjugasi langsung tanpa partikel.',
  },
  adj_na: {
    id: 'adj_na',
    nameJa: 'な形容詞',
    nameId: 'Kata Sifat -na',
    nameEn: 'Na-Adjective',
    symbol: 'na',
    formation: {
      groupI: 'Modifikasi N: na + な + N (きれいな花)',
      groupII: 'Predikat: na + だ (きれいだ) / na + です (きれいです)',
      groupIII: 'Lampau: na + だった (きれいだった)',
    },
    shortDescription: 'Kata sifat yang membutuhkan な saat memodifikasi kata benda.',
  },
  noun: {
    id: 'noun',
    nameJa: '名詞',
    nameId: 'Kata Benda',
    nameEn: 'Noun',
    symbol: 'N',
    formation: {
      groupI: 'Dasar: N + だ / です',
      groupII: 'Modifikasi: N + の + N (日本の文化)',
      groupIII: 'Lampau: N + だった / でした',
    },
    shortDescription: 'Kata benda. Digunakan dengan partikel dan kopula (だ/です) dalam kalimat.',
  },
};

// ─── Grammar Connectors / Function Words ────────────────────────────

export const GRAMMAR_CONNECTORS: Record<string, GrammarConnector> = {
  to_omou: {
    id: 'to_omou',
    token: 'と思う',
    nameId: '"berpikir / berniat"',
    nameEn: '"to think / to intend"',
    description: 'Menyatakan pikiran atau niat. Dengan Vよう＋と思う menunjukkan niat kuat untuk melakukan sesuatu.',
  },
  to_suru: {
    id: 'to_suru',
    token: 'とする',
    nameId: '"mencoba / akan (melakukan)"',
    nameEn: '"to try to / to be about to"',
    description: 'Dengan Vよう＋とする menunjukkan saat seseorang mencoba atau akan mulai melakukan tindakan.',
  },
  to_shinai: {
    id: 'to_shinai',
    token: 'としない',
    nameId: '"tidak mau (melakukan)"',
    nameEn: '"to show no intention of"',
    description: 'Dengan Vよう＋としない menyatakan ketiadaan niat/kemauan. Subjek sama sekali tidak menunjukkan tanda-tanda akan melakukan.',
  },
  you_ni_suru: {
    id: 'you_ni_suru',
    token: 'ようにする',
    nameId: '"berusaha agar / membiasakan"',
    nameEn: '"to make an effort to / to make sure that"',
    description: 'Menunjukkan kebiasaan atau usaha sadar untuk melakukan/tidak melakukan sesuatu.',
  },
  you_ni_naru: {
    id: 'you_ni_naru',
    token: 'ようになる',
    nameId: '"menjadi bisa / berubah jadi"',
    nameEn: '"to come to / to become able to"',
    description: 'Menunjukkan perubahan keadaan — sesuatu yang tadinya tidak bisa, kini menjadi bisa.',
  },
  you_ni: {
    id: 'you_ni',
    token: 'ように',
    nameId: '"agar / supaya / seperti"',
    nameEn: '"so that / in order to / as"',
    description: 'Menyatakan tujuan atau cara. Juga dipakai sebagai pembuka "seperti yang...".',
  },
  you_ni_period: {
    id: 'you_ni_period',
    token: 'ように。',
    nameId: '"perintah halus / harapan"',
    nameEn: '"soft command / wish"',
    description: 'Di akhir kalimat: perintah halus ("...ya.") atau harapan/doa ("semoga...").',
  },
  koto_ni_naru: {
    id: 'koto_ni_naru',
    token: 'ことになる',
    nameId: '"diputuskan bahwa / jadinya"',
    nameEn: '"it has been decided that"',
    description: 'Menyatakan keputusan yang dibuat oleh pihak lain atau keadaan yang terjadi di luar kendali pembicara.',
  },
  koto_ni_suru: {
    id: 'koto_ni_suru',
    token: 'ことにする',
    nameId: '"memutuskan untuk"',
    nameEn: '"to decide to"',
    description: 'Menyatakan keputusan pribadi pembicara. Berbeda dengan ことになる yang keputusannya datang dari luar.',
  },
  koto_ni_natteiru: {
    id: 'koto_ni_natteiru',
    token: 'ことになっている',
    nameId: '"sudah menjadi aturan / ditentukan bahwa"',
    nameEn: '"it is a rule/arrangement that"',
    description: 'Menyatakan aturan, kebijakan, atau keadaan yang sudah ditetapkan dan berlaku.',
  },
  wake_ni_wa_ikanai: {
    id: 'wake_ni_wa_ikanai',
    token: 'わけにはいかない',
    nameId: '"tidak bisa begitu saja / tidak mungkin"',
    nameEn: '"cannot possibly / it won\'t do to"',
    description: 'Menyatakan bahwa secara moral, sosial, atau situasional, seseorang tidak bisa melakukan tindakan tersebut.',
  },
  kudasai: {
    id: 'kudasai',
    token: 'ください',
    nameId: '"tolong / mohon"',
    nameEn: '"please (do)"',
    description: 'Permintaan sopan. Dengan V(さ)せて＋ください berarti meminta izin.',
  },
  moraemasu_ka: {
    id: 'moraemasu_ka',
    token: 'もらえますか',
    nameId: '"bolehkah saya..."',
    nameEn: '"may I / could you let me"',
    description: 'Permintaan izin yang lebih sopan dari ください. Sering dipakai dengan V(さ)せて.',
  },
  moraemasen_ka: {
    id: 'moraemasen_ka',
    token: 'もらえませんか',
    nameId: '"bisakah saya... (sangat sopan)"',
    nameEn: '"would it be possible for me to"',
    description: 'Bentuk paling sopan untuk meminta izin. Negasi retoris menambah kesantunan.',
  },
  mitai_da: {
    id: 'mitai_da',
    token: 'みたいだ',
    nameId: '"sepertinya / mirip (predikat)"',
    nameEn: '"it seems like / similar to"',
    description: 'Di akhir kalimat sebagai predikat: menyatakan kesan perbandingan atau kesimpulan dugaan. Lebih santai dari 〜ようだ.',
  },
  mitai_ni: {
    id: 'mitai_ni',
    token: 'みたいに',
    nameId: '"seperti (adverbia cara)"',
    nameEn: '"like / as (adverbial)"',
    description: 'Sebelum kata kerja atau kata sifat sebagai keterangan cara: melakukan tindakan dengan perumpamaan serupa (contoh: おじいさんみたいに話す).',
  },
  mitai_na: {
    id: 'mitai_na',
    token: 'みたいなN',
    nameId: '"seperti (modifikasi nomina)"',
    nameEn: '"like / similar to (noun modifier)"',
    description: 'Sebelum kata benda untuk menerangkan sifat atau kemiripan dengan benda tersebut (contoh: 本物の果物みたいな味).',
  },
  rashii: {
    id: 'rashii',
    token: 'らしい',
    nameId: '"khas / benar-benar seperti"',
    nameEn: '"typical of / -like"',
    description: 'Dengan N: menyatakan sesuatu benar-benar sesuai citra khas N tersebut.',
  },
  ppoi: {
    id: 'ppoi',
    token: 'っぽい',
    nameId: '"agak / kesan -an"',
    nameEn: '"-ish / -like (tendency)"',
    description: 'Menyatakan kesan kuat atau kecenderungan memiliki sifat tertentu (kadang sedikit negatif).',
  },
  ageru_agaru: {
    id: 'ageru_agaru',
    token: '上げる／上がる',
    nameId: '"menyelesaikan / naik-selesai"',
    nameEn: '"to finish (up) / to rise/complete"',
    description: 'Vます＋上げる: menyelesaikan dari bawah ke atas. Vます＋上がる: selesai dengan sendirinya.',
  },
  kiru_kireru: {
    id: 'kiru_kireru',
    token: '切る／切れる／切れない',
    nameId: '"sepenuhnya / habis / tidak habis"',
    nameEn: '"completely / able to finish / unable to finish"',
    description: 'Vます＋切る: melakukan sepenuhnya. 切れる: mampu menyelesaikan. 切れない: tidak mampu menyelesaikan.',
  },
  kakeru: {
    id: 'kakeru',
    token: 'かける',
    nameId: '"setengah / mulai tapi belum selesai"',
    nameEn: '"half-done / in the middle of"',
    description: 'Vます＋かける: melakukan setengah jalan, belum selesai. かけのN: N yang setengah jadi.',
  },
  tate: {
    id: 'tate',
    token: 'たて',
    nameId: '"baru saja (segar)"',
    nameEn: '"freshly / just (done)"',
    description: 'Vます＋たて: baru saja selesai dilakukan, masih segar/baru. たてのN: N yang baru saja.',
  },
};

// ─── Lookup Helpers ─────────────────────────────────────────────────

/**
 * Find a conjugation pattern by its symbol or partial match.
 * Returns the pattern ID or undefined.
 */
export function findPatternBySymbol(symbol: string): string | undefined {
  // Direct symbol match
  for (const [id, p] of Object.entries(CONJUGATION_PATTERNS)) {
    if (p.symbol === symbol) return id;
  }
  // Partial matching for complex symbols
  const normalized = symbol.replace(/\s+/g, '');
  for (const [id, p] of Object.entries(CONJUGATION_PATTERNS)) {
    if (normalized === p.symbol.replace(/\s+/g, '')) return id;
  }
  return undefined;
}

/**
 * Find a grammar connector by its token text.
 * Returns the connector ID or undefined.
 */
export function findConnectorByToken(token: string): string | undefined {
  const normalized = token.replace(/^[〜~]/, '').replace(/\s+/g, '');
  
  // 1. Direct match in GRAMMAR_CONNECTORS
  for (const [id, c] of Object.entries(GRAMMAR_CONNECTORS)) {
    const cNorm = c.token.replace(/^[〜~]/, '').replace(/\s+/g, '');
    if (normalized === cNorm) return id;
  }

  // 2. Lookup in Sub-Branch knowledge bank
  const sub = findSubBranch(normalized);
  if (sub) return sub.id;

  // 3. Try partial / suffix matching in GRAMMAR_CONNECTORS
  for (const [id, c] of Object.entries(GRAMMAR_CONNECTORS)) {
    const cNorm = c.token.replace(/^[〜~]/, '').replace(/\s+/g, '');
    if (normalized.endsWith(cNorm) || cNorm.endsWith(normalized)) {
      return id;
    }
  }

  // 4. Handle trailing 'N' or variations like みたいなN -> みたいな / mitai_na
  if (normalized.endsWith('N')) {
    const withoutN = normalized.slice(0, -1);
    const subNoN = findSubBranch(withoutN);
    if (subNoN) return subNoN.id;
    for (const [id, c] of Object.entries(GRAMMAR_CONNECTORS)) {
      const cNorm = c.token.replace(/^[〜~]/, '').replace(/\s+/g, '');
      if (withoutN === cNorm || cNorm.startsWith(withoutN)) return id;
    }
  }

  return undefined;
}

/**
 * Retrieve either a GrammarConnector or rich SubFormulaBranch by patternId.
 */
export function getConnectorOrSubBranch(id: string): {
  id: string;
  token: string;
  nameId: string;
  nameEn: string;
  description: string;
  subBranch?: SubFormulaBranch;
} | undefined {
  const sub = findSubBranch(id);
  if (sub) {
    return {
      id: sub.id,
      token: sub.token,
      nameId: sub.token,
      nameEn: sub.usageLocation,
      description: sub.meaning,
      subBranch: sub,
    };
  }
  const c = GRAMMAR_CONNECTORS[id];
  if (c) {
    return c;
  }
  return undefined;
}
