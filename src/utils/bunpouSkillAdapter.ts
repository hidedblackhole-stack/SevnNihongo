import {
  BunpouItem,
  GrammarSkillNodes,
  GrammarSkillConcept,
  GrammarSkillFunction,
  GrammarSkillFormulaStep,
  GrammarSkillWordIdentity,
  GrammarSkillNuance,
  TieredExampleSentence,
  Question,
} from '../types/content';
import { fisherYatesShuffle } from './smartRandomizer';

/**
 * Handcrafted 7-node skill profiles for signature grammar points
 */
const BESPOKE_SKILL_NODES: Record<string, Partial<GrammarSkillNodes>> = {
  // Signature N4: 〜ようになる
  'bp_n4_youni_naru': {
    concept: {
      summary: 'Menyatakan terjadinya perubahan dari keadaan atau kebiasaan lama menjadi keadaan atau kebiasaan baru.',
      beforeState: 'Dulu: Belum bisa / Tidak terbiasa ❌',
      afterState: 'Sekarang: Menjadi bisa / Mulai terbiasa ✅',
      keyTakeaway: 'Fokus pada proses perubahan bertahap seiring waktu atau latihan.',
    },
    functions: [
      {
        number: 1,
        label: 'Perubahan Kemampuan (能力の変化)',
        description: 'Menyatakan bahwa seseorang yang tadinya tidak mampu melakukan sesuatu, kini telah memperoleh kemampuan tersebut.',
        miniExample: {
          japanese: '日本語が話せるようになった。',
          reading: 'にほんごがはなせるようになった。',
          meaningId: 'Sekarang sudah menjadi bisa berbicara bahasa Jepang.',
        },
      },
      {
        number: 2,
        label: 'Perubahan Kebiasaan (習慣の変化)',
        description: 'Menyatakan bahwa suatu aktivitas baru kini mulai rutin dilakukan atau menjadi kebiasaan baru dalam keseharian.',
        miniExample: {
          japanese: '毎日勉強するようになった。',
          reading: 'まいにちべんきょうするようになった。',
          meaningId: 'Sekarang mulai (terbiasa) belajar setiap hari.',
        },
      },
    ],
    formulas: [
      {
        title: 'A. Perubahan Kemampuan (Bentuk Potensial)',
        breakdown: ['Kata Kerja Potensial (V可能形)', '+', 'ようになる'],
        progression: ['話す (Bicara)', '話せる (Bisa bicara)', '話せるようになる (Menjadi bisa bicara)'],
        note: 'Gunakan bentuk potensial untuk menegaskan perolehan kapasitas atau skill baru.',
      },
      {
        title: 'B. Perubahan Kebiasaan (Bentuk Kamus)',
        breakdown: ['Kata Kerja Kamus (V辞書形)', '+', 'ようになる'],
        progression: ['走る (Lari)', '走るようになる (Mulai terbiasa lari)'],
        note: 'Gunakan bentuk kamus untuk tindakan berulang yang dilakukan atas kehendak sendiri.',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'Potential Form (Bentuk Potensial)',
        tagColor: 'purple',
        icon: '🟣',
        examples: ['話せる', '読める', '泳げる'],
        functionEffect: 'Fungsi: Perubahan kapasitas atau kemampuan diri.',
      },
      {
        typeCategory: '意志動詞 (Kata Kerja Kehendak)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['勉強する', '走る', '野菜を食べる'],
        functionEffect: 'Fungsi: Perubahan kebiasaan atau pola rutinitas baru.',
      },
      {
        typeCategory: '無意志動詞 (Kata Kerja Spontan / Keadaan)',
        tagColor: 'sky',
        icon: '🔵',
        examples: ['分かる', '見える', '聞こえる'],
        functionEffect: 'Fungsi: Perubahan kondisi persepsi tanpa perlu bentuk potensial.',
      },
    ],
    nuances: [
      {
        contrastA: '話すようになった',
        meaningA: 'Mulai berbicara (mengacu pada aksi/kebiasaan yang mulai dilakukan)',
        contrastB: '話せるようになった',
        meaningB: 'Menjadi bisa berbicara (mengacu pada kemampuan berbahasa yang baru dikuasai)',
        explanation: 'Perbedaan terletak pada apakah Anda menekankan aksi/kebiasaan (V-kamus) atau kemampuan internal (V-potensial).',
      },
      {
        contrastA: '〜ようになる',
        meaningA: 'Perubahan terjadi secara alami / berproses (Menjadi...)',
        contrastB: '〜ことにする',
        meaningB: 'Keputusan tegas yang dibuat oleh diri sendiri secara sadar (Memutuskan untuk...)',
        explanation: '〜ようになる lebih menyoroti hasil proses perubahan waktu ketimbang sekadar niat sepihak.',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Basic (Pondasi Konsep)',
        japanese: '日本語が分かるようになった。',
        reading: 'にほんごがわかるようになった。',
        meaningId: 'Saya jadi paham bahasa Jepang.',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Daily (Percakapan Sehari-hari)',
        japanese: '毎朝走るようになった。',
        reading: 'まいあさはしるようになった。',
        meaningId: 'Saya mulai lari setiap pagi.',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Natural (Ekspresi Alami Penutur Asli)',
        japanese: '最近、健康のために早く寝るようになった。',
        reading: 'さいきん、けんこうのために はやくねるようになった。',
        meaningId: 'Akhir-akhir ini, demi kesehatan saya mulai terbiasa tidur lebih awal.',
      },
    ],
  },

  // Signature N3: 〜みたいだ (w1d3g1)
  'w1d3g1': {
    concept: {
      summary: 'Menyatakan perumpamaan (seperti/mirip) atau dugaan subjektif berdasarkan kesan langsung panca indra.',
      beforeState: 'Fakta Sebenarnya: Bukan hal itu 👤',
      afterState: 'Kesan / Tampang: Terlihat mirip sekali ✨',
      keyTakeaway: 'Bernuansa santai (bahasa percakapan lisan) dan menyambung langsung ke kata benda tanpa partikel の.',
    },
    functions: [
      {
        number: 1,
        label: '比喩 (Perumpamaan)',
        description: 'Mengibaratkan sesuatu dengan hal lain yang memiliki kemiripan fisik, sifat, atau perilaku.',
        miniExample: {
          japanese: '彼の話し方は、女みたいだ。',
          reading: 'かれのはなしかたは、おんなみたいだ。',
          meaningId: 'Cara bicaranya seperti perempuan.',
        },
      },
      {
        number: 2,
        label: '推測 (Dugaan Spontan)',
        description: 'Menyimpulkan keadaan saat ini berdasarkan apa yang dilihat, didengar, atau dirasakan seketika.',
        miniExample: {
          japanese: '雨が降るみたいだ。',
          reading: 'あめがふるみたいだ。',
          meaningId: 'Sepertinya akan turun hujan.',
        },
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'Kata Benda (名詞)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['女', '子供', '夢', 'アニメ'],
        functionEffect: 'Langsung menempel tanpa の (contoh: 子供みたいだ).',
      },
      {
        typeCategory: 'Kata Sifat-na (な形容詞)',
        tagColor: 'sky',
        icon: '🔵',
        examples: ['静か', '元気', 'きれい'],
        functionEffect: 'Langsung menempel tanpa だ (contoh: 静かみたいだ).',
      },
      {
        typeCategory: 'Kata Kerja (動詞) & Sifat-i (い形容詞)',
        tagColor: 'purple',
        icon: '🟣',
        examples: ['降る', '食べた', '高い', '痛い'],
        functionEffect: 'Bentuk kasual biasa / 普通形 (contoh: 降るみたいだ, 高いみたいだ).',
      },
    ],
  },
};

/**
 * Intelligent Adapter that builds full 7-node grammar skill data for any BunpouItem
 */
export function getGrammarSkillNodes(item: BunpouItem): GrammarSkillNodes {
  // If explicitly defined on item, return directly
  if (item.skillNodes) {
    return item.skillNodes;
  }

  // Check bespoke lookup (by exact ID or normalized title)
  const bespoke = BESPOKE_SKILL_NODES[item.id] ||
    (item.title.includes('ようになる') ? BESPOKE_SKILL_NODES['bp_n4_youni_naru'] : undefined) ||
    (item.title.includes('みたい') ? BESPOKE_SKILL_NODES['w1d3g1'] : undefined);

  // 1. Concept Node
  const concept: GrammarSkillConcept = bespoke?.concept || generateFallbackConcept(item);

  // 2. Function Node
  const functions: GrammarSkillFunction[] = bespoke?.functions || generateFallbackFunctions(item);

  // 3. Formula Steps Node
  const formulas: GrammarSkillFormulaStep[] = bespoke?.formulas || generateFallbackFormulas(item);

  // 4. Word Identity Node
  const wordIdentities: GrammarSkillWordIdentity[] = bespoke?.wordIdentities || generateFallbackWordIdentities(item);

  // 5. Nuance Node
  const nuances: GrammarSkillNuance[] = bespoke?.nuances || generateFallbackNuances(item);

  // 6. Tiered Examples Node
  const examples: TieredExampleSentence[] = bespoke?.examples || generateFallbackExamples(item);

  // 7. Training Questions Node
  const trainingQuestions: Question[] = item.questions && item.questions.length > 0
    ? item.questions
    : generateFallbackQuestions(item);

  return {
    concept,
    functions,
    formulas,
    wordIdentities,
    nuances,
    examples,
    trainingQuestions,
  };
}

/**
 * Fallback generator for Node 1: Concept
 */
function generateFallbackConcept(item: BunpouItem): GrammarSkillConcept {
  const explanation = item.explanation || item.meaningId;
  const isChange = item.meaningId.toLowerCase().includes('perubahan') || item.meaningId.toLowerCase().includes('menjadi');
  const isPassive = item.meaningId.toLowerCase().includes('pasif') || item.title.includes('れる') || item.title.includes('られる');
  const isCausative = item.meaningId.toLowerCase().includes('izin') || item.meaningId.toLowerCase().includes('menyuruh') || item.title.includes('させて');
  const isDugaan = item.meaningId.toLowerCase().includes('seperti') || item.meaningId.toLowerCase().includes('tampaknya') || item.meaningId.toLowerCase().includes('dugaan');

  if (isChange) {
    return {
      summary: explanation,
      beforeState: 'Kondisi Semula: Belum terjadi / Masih kondisi lama ❌',
      afterState: 'Kondisi Terkini: Telah bergeser menjadi keadaan baru ✅',
      keyTakeaway: 'Pola ini menekankan transisi atau hasil proses perubahan.',
    };
  }

  if (isPassive) {
    return {
      summary: explanation,
      beforeState: 'Aksi Aktif: Pelaku melakukan tindakan 👤',
      afterState: 'Posisi Pasif: Subjek menerima dampak atau merasa terganggu 🛡️',
      keyTakeaway: 'Sudut pandang berpusat pada korban atau pihak yang merasakan akibat tindakan.',
    };
  }

  if (isCausative) {
    return {
      summary: explanation,
      beforeState: 'Kondisi Biasa: Menunggu keputusan pihak lain ⏳',
      afterState: 'Tindakan: Meminta izin atau memperkenankan tindakan berlangsung 🤝',
      keyTakeaway: 'Menunjukkan dinamika izin dan perkenan antarpihak secara sopan.',
    };
  }

  if (isDugaan) {
    return {
      summary: explanation,
      beforeState: 'Fakta Pasti: Belum dikonfirmasi 100% 🔍',
      afterState: 'Kesan Sensorik: Dugaan kuat berdasarkan panca indra 💡',
      keyTakeaway: 'Mengungkapkan penilaian atau perumpamaan dari pengamatan langsung pembicara.',
    };
  }

  return {
    summary: explanation,
    beforeState: 'Sebelum Digunakan: Makna kata dasar 💬',
    afterState: 'Setelah Digabung: Memperoleh fungsi tata bahasa khusus 🎯',
    keyTakeaway: `Kuasai fungsi inti dari pola 「${item.title}」 dalam kalimat bahasa Jepang.`,
  };
}

/**
 * Fallback generator for Node 2: Functions
 */
function generateFallbackFunctions(item: BunpouItem): GrammarSkillFunction[] {
  if (item.functions && item.functions.length > 0) {
    return item.functions.map((fn, idx) => {
      const parts = fn.split(/[()（）]/).filter(p => p.trim());
      const label = parts[0]?.trim() || fn;
      const desc = parts[1]?.trim() ? `Menyatakan ${parts[1].trim()}` : `Penggunaan pola untuk konteks ${label}`;
      const matchingEx = item.examples && item.examples[idx] ? item.examples[idx] : item.examples?.[0];

      return {
        number: idx + 1,
        label,
        description: desc,
        miniExample: matchingEx ? {
          japanese: matchingEx.japanese,
          reading: matchingEx.reading,
          meaningId: matchingEx.meaningId,
        } : undefined,
      };
    });
  }

  // Parse from subFormulas if available
  if (item.subFormulas && item.subFormulas.length > 0) {
    return item.subFormulas.map((sub, idx) => ({
      number: idx + 1,
      label: sub.token || `Penggunaan ${idx + 1}`,
      description: sub.meaning || sub.usageLocation || item.meaningId,
      miniExample: sub.examples && sub.examples[0] ? {
        japanese: sub.examples[0].japanese,
        reading: sub.examples[0].reading,
        meaningId: sub.examples[0].meaningId,
      } : undefined,
    }));
  }

  return [
    {
      number: 1,
      label: 'Fungsi Utama (主要な用法)',
      description: item.meaningId,
      miniExample: item.examples && item.examples[0] ? {
        japanese: item.examples[0].japanese,
        reading: item.examples[0].reading,
        meaningId: item.examples[0].meaningId,
      } : undefined,
    }
  ];
}

/**
 * Fallback generator for Node 3: Formulas
 */
function generateFallbackFormulas(item: BunpouItem): GrammarSkillFormulaStep[] {
  if (item.subFormulas && item.subFormulas.length > 0) {
    return item.subFormulas.map((sub) => {
      const conditions = sub.connectionConditions.map(c => `${c.partOfSpeech}: ${c.rule}`);
      return {
        title: sub.token || item.formula || item.title,
        breakdown: conditions.length > 0 ? conditions : [item.formula || item.title],
        note: sub.usageLocation ? `Posisi: ${sub.usageLocation}` : undefined,
      };
    });
  }

  const rawFormula = item.formula || item.title;
  const parts = rawFormula.split(/[＋+]/).map(p => p.trim());

  return [
    {
      title: `Rumus Pembentukan: ${item.title}`,
      breakdown: parts.length > 1 ? parts : [rawFormula],
      note: 'Perhatikan konjugasi bentuk kata kerja/sifat yang bersambung dengan pola ini.',
    }
  ];
}

/**
 * Fallback generator for Node 4: Word Identity
 */
function generateFallbackWordIdentities(item: BunpouItem): GrammarSkillWordIdentity[] {
  const result: GrammarSkillWordIdentity[] = [];

  // Extract from connection conditions if present
  if (item.subFormulas && item.subFormulas.length > 0) {
    const seen = new Set<string>();
    for (const sub of item.subFormulas) {
      for (const cond of sub.connectionConditions) {
        if (!seen.has(cond.partOfSpeech)) {
          seen.add(cond.partOfSpeech);
          const isVerb = cond.partOfSpeech.toLowerCase().includes('kerja') || cond.partOfSpeech.includes('V');
          const isNoun = cond.partOfSpeech.toLowerCase().includes('benda') || cond.partOfSpeech.includes('N');
          const isAdj = cond.partOfSpeech.toLowerCase().includes('sifat') || cond.partOfSpeech.includes('A');

          result.push({
            typeCategory: cond.partOfSpeech,
            tagColor: isVerb ? 'emerald' : isNoun ? 'sky' : isAdj ? 'amber' : 'purple',
            icon: isVerb ? '🟢' : isNoun ? '🔵' : isAdj ? '🟡' : '🟣',
            examples: cond.example ? [cond.example] : [cond.rule],
            functionEffect: `Aturan: ${cond.rule}`,
          });
        }
      }
    }
  }

  if (result.length > 0) return result;

  // Generic fallback
  return [
    {
      typeCategory: 'Kata Kerja (動詞 / Verba)',
      tagColor: 'emerald',
      icon: '🟢',
      examples: ['行く', '食べる', 'する'],
      functionEffect: 'Menyambung dengan bentuk kamus, bentuk-te, atau bentuk potensial sesuai aturan rumus.',
    },
    {
      typeCategory: 'Kata Benda & Sifat (名詞・形容詞)',
      tagColor: 'sky',
      icon: '🔵',
      examples: ['学生', '静か', '高い'],
      functionEffect: 'Dapat memerlukan partikel penghubung seperti な atau の sesuai pola.',
    }
  ];
}

/**
 * Fallback generator for Node 5: Nuance
 */
function generateFallbackNuances(item: BunpouItem): GrammarSkillNuance[] {
  if (item.comparisonNotes && item.comparisonNotes.length > 0) {
    return item.comparisonNotes.map((comp) => ({
      contrastA: item.title,
      meaningA: item.meaningId,
      contrastB: comp.targetGrammar,
      meaningB: comp.difference,
      explanation: item.nuance || comp.difference,
    }));
  }

  if (item.nuance) {
    return [
      {
        contrastA: item.title,
        meaningA: item.meaningId,
        contrastB: 'Ragam Ungkapan Serupa',
        meaningB: 'Perhatikan konteks formalitas dan nuansa perasaan pembicara.',
        explanation: item.nuance,
      }
    ];
  }

  return [
    {
      contrastA: item.title,
      meaningA: item.meaningId,
      contrastB: 'Bentuk Kalimat Dasar',
      meaningB: 'Pola ini memberikan warna ekspresi dan sudut pandang subjektif pada informasi.',
      explanation: 'Gunakan pola ini untuk membuat ungkapan terdengar lebih alami bagi penutur asli Jepang.',
    }
  ];
}

/**
 * Fallback generator for Node 6: Tiered Examples
 */
function generateFallbackExamples(item: BunpouItem): TieredExampleSentence[] {
  const rawExamples = item.examples && item.examples.length > 0
    ? item.examples
    : [
        {
          japanese: `これは${item.title.replace(/^[〜~]/, '')}の例です。`,
          reading: '',
          meaningId: `Ini adalah contoh penerapan pola ${item.title}.`,
        }
      ];

  const tiers: ('basic' | 'daily' | 'natural')[] = ['basic', 'daily', 'natural'];
  const tierLabels = [
    'Level 1: Basic (Pondasi Konsep)',
    'Level 2: Daily (Percakapan Sehari-hari)',
    'Level 3: Natural (Ekspresi Alami)',
  ];

  return rawExamples.slice(0, 3).map((ex, idx) => ({
    tier: tiers[idx] || 'daily',
    tierLabel: tierLabels[idx] || `Contoh ${idx + 1}`,
    japanese: ex.japanese,
    reading: ex.reading || ex.japanese,
    meaningId: ex.meaningId,
  }));
}

/**
 * Fallback generator for Node 7: Training Questions
 */
function generateFallbackQuestions(item: BunpouItem): Question[] {
  const patternTitle = item.title.split(/[(（＋／]/)[0].trim();
  const cleanedPattern = patternTitle.replace(/^[〜~]/, '');
  const examples = item.examples && item.examples.length > 0 ? item.examples : [];
  const ex = examples[0];

  const prompt = ex && ex.japanese.includes(cleanedPattern)
    ? ex.japanese.replace(cleanedPattern, '（　）')
    : `文の（　）に「${cleanedPattern}」を入れる場合、最も適切な意味を選びなさい。`;

  return [
    {
      id: `quest_${item.id}_1`,
      instruction: '文の（　）に入れるのに最もよいものを、一つえらびなさい。',
      instructionId: 'Pilihlah bentuk pola atau kata yang paling tepat untuk melengkapi kalimat berikut:',
      prompt,
      ruby: ex?.reading,
      options: [
        cleanedPattern,
        `〜${cleanedPattern}ない`,
        `〜${cleanedPattern}すぎる`,
        `〜${cleanedPattern}そう`,
      ],
      correctIndex: 0,
      explanation: `Jawaban tepat adalah 「${cleanedPattern}」. Makna pola ini adalah: ${item.meaningId}.`,
    }
  ];
}

/**
 * Helper to derive category tags for the Bunpou list card
 */
export function getBunpouCategoryTags(item: BunpouItem): string[] {
  if (item.tags && item.tags.length > 0) {
    return item.tags;
  }

  const tags: string[] = [];

  if (item.functions && item.functions.length > 0) {
    for (const fn of item.functions) {
      const match = fn.match(/\((.*?)\)/);
      if (match && match[1]) {
        tags.push(match[1].trim());
      } else {
        const clean = fn.split(/[ （]/)[0].trim();
        if (clean) tags.push(clean);
      }
    }
  }

  const meaning = (item.meaningId || '').toLowerCase();
  if (meaning.includes('kemampuan') || meaning.includes('bisa')) tags.push('Ability');
  if (meaning.includes('kebiasaan') || meaning.includes('rutin')) tags.push('Habit');
  if (meaning.includes('perubahan') || meaning.includes('menjadi')) tags.push('Change');
  if (meaning.includes('dugaan') || meaning.includes('seperti')) tags.push('Conjecture');
  if (meaning.includes('pasif')) tags.push('Passive');
  if (meaning.includes('izin') || meaning.includes('suruh')) tags.push('Causative');
  if (meaning.includes('keinginan') || meaning.includes('ingin')) tags.push('Desire');

  if (tags.length === 0) {
    tags.push('Grammar', 'Pattern');
  }

  return Array.from(new Set(tags)).slice(0, 3);
}
