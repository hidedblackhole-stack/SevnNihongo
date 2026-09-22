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

/**
 * Handcrafted 7-node skill profiles for signature grammar points
 * (Written in simple, clear, human language for real learners)
 */
const BESPOKE_SKILL_NODES: Record<string, Partial<GrammarSkillNodes>> = {
  // Signature N4: 〜ようになる
  'bp_n4_youni_naru': {
    concept: {
      summary: 'Dulu tidak → sekarang menjadi',
      beforeState: 'Dulu: ❌ Tidak bisa / Belum biasa',
      afterState: 'Sekarang: ✅ Menjadi bisa / Mulai terbiasa',
      starterExample: {
        japanese: '日本語が話せるようになった。',
        reading: 'にほんごがはなせるようになった。',
        meaningId: 'Sekarang sudah menjadi bisa berbicara bahasa Jepang.',
        contrastNote: 'Dulu tidak bisa bahasa Jepang, sekarang bisa.',
      },
      keyTakeaway: 'Dipakai saat ada perubahan kemampuan diri atau kebiasaan baru yang mulai terbentuk.',
    },
    functions: [
      {
        number: 1,
        label: 'Menjadi Bisa (Kemampuan)',
        description: 'Tadinya tidak mampu melakukan sesuatu, sekarang sudah bisa.',
        miniExample: {
          japanese: '読めるようになった。',
          reading: 'よめるようになった。',
          meaningId: 'Menjadi bisa membaca.',
        },
      },
      {
        number: 2,
        label: 'Mulai Kebiasaan (Rutinitas Baru)',
        description: 'Tadinya tidak biasa dilakukan, sekarang mulai rutin dikerjakan.',
        miniExample: {
          japanese: '毎日勉強するようになった。',
          reading: 'まいにちべんきょうするようになった。',
          meaningId: 'Mulai belajar setiap hari.',
        },
      },
    ],
    formulas: [
      {
        title: 'A. Kemampuan (Bentuk Potensial)',
        breakdown: ['Kata Kerja Potensial (V-bisa)', '+', 'ようになる'],
        progression: ['話す (Bicara)', '話せる (Bisa bicara)', '話せるようになる (Menjadi bisa bicara)'],
        note: 'Ubah kata kerja ke bentuk potensial (bisa) dulu, lalu gabung dengan ようになる.',
      },
      {
        title: 'B. Kebiasaan (Bentuk Kamus)',
        breakdown: ['Kata Kerja Kamus (V-dasar)', '+', 'ようになる'],
        progression: ['勉強する (Belajar)', '勉強するようになる (Mulai terbiasa belajar)'],
        note: 'Gunakan bentuk kamus biasa untuk aksi yang sengaja dirutinkan.',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Tindakan Manusia (意志動詞)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['勉強する', '読む', '話す', '走る'],
        functionEffect: '→ Menunjukkan perubahan kebiasaan atau rutinitas baru.',
      },
      {
        typeCategory: 'B. Kemampuan & Keadaan (無意志動詞 / Potensial)',
        tagColor: 'purple',
        icon: '🟣',
        examples: ['分かる', '見える', '聞こえる', '話せる'],
        functionEffect: '→ Menunjukkan perubahan kemampuan atau kondisi yang terjadi.',
      },
    ],
    nuances: [
      {
        contrastA: '話すようになった',
        meaningA: 'Mulai berbicara (fokus pada aksi/kebiasaan yang mulai dilakukan)',
        contrastB: '話せるようになった',
        meaningB: 'Menjadi bisa berbicara (fokus pada kemampuan/kapasitas yang baru dikuasai)',
        explanation: 'Jangan tertukar! Kalau ingin pamer kemampuan baru, gunakan bentuk potensial (話せる).',
      },
      {
        contrastA: '〜ようになる',
        meaningA: 'Perubahan terjadi alami / berproses seiring waktu',
        contrastB: '〜ことにする',
        meaningB: 'Keputusan sadar yang dibuat oleh diri sendiri seketika',
        explanation: '〜ようになる menekankan hasil perubahan nyata, bukan sekadar niat di kepala.',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Sederhana (Pondasi)',
        japanese: '泳げるようになった。',
        reading: 'およげるようになった。',
        meaningId: 'Saya menjadi bisa berenang. (Dulu: ❌ tidak bisa → Sekarang: ✅ bisa)',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Sehari-hari (Percakapan)',
        japanese: '毎日運動するようになった。',
        reading: 'まいにちうんどうするようになった。',
        meaningId: 'Saya mulai berolahraga setiap hari.',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Alami (Ekspresi Wajar)',
        japanese: '最近、早く寝るようになった。',
        reading: 'さいきん、はやくねるようになった。',
        meaningId: 'Akhir-akhir ini saya mulai terbiasa tidur lebih awal.',
      },
    ],
  },

  // Signature N3: 〜みたいだ (w1d3g1)
  'w1d3g1': {
    concept: {
      summary: 'Kelihatannya seperti... / Mirip dengan...',
      beforeState: 'Fakta Aslinya: Bukan hal itu 👤',
      afterState: 'Kesan Tampang: Terlihat mirip sekali ✨',
      starterExample: {
        japanese: '彼の話し方は、女みたいだ。',
        reading: 'かれのはなしかたは、おんなみたいだ。',
        meaningId: 'Cara bicaranya seperti perempuan.',
        contrastNote: 'Padahal aslinya laki-laki, tapi gayanya mirip.',
      },
      keyTakeaway: 'Gunakan saat ingin mengibaratkan sesuatu atau menduga hal yang kamu lihat/rasakan seketika.',
    },
    functions: [
      {
        number: 1,
        label: 'Perumpamaan (Mengibaratkan)',
        description: 'Menyebut sesuatu mirip dengan hal lain karena sifat atau gayanya serupa.',
        miniExample: {
          japanese: '子供みたいだ。',
          reading: 'こどもみたいだ。',
          meaningId: 'Tingkahnya seperti anak kecil.',
        },
      },
      {
        number: 2,
        label: 'Dugaan Spontan',
        description: 'Menduga keadaan dari apa yang dilihat atau dirasakan langsung saat itu juga.',
        miniExample: {
          japanese: '雨が降るみたいだ。',
          reading: 'あめがふるみたいだ。',
          meaningId: 'Sepertinya akan turun hujan.',
        },
      },
    ],
    formulas: [
      {
        title: 'Kata Benda Langsung Menempel',
        breakdown: ['Kata Benda (N)', '+', 'みたいだ'],
        progression: ['子供 (Anak)', '子供みたいだ (Seperti anak kecil)'],
        note: 'Tidak perlu partikel の atau だ di tengahnya.',
      },
      {
        title: 'Kata Kerja / Sifat Bentuk Biasa (Kasual)',
        breakdown: ['Kata Kerja/Sifat (Bentuk Biasa)', '+', 'みたいだ'],
        progression: ['降る (Turun)', '降るみたいだ (Sepertinya turun)'],
        note: 'Gunakan bentuk biasa (普通形), bukan bentuk sopan (ます).',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Kata Benda (名詞)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['女', '子供', '夢', 'アニメ'],
        functionEffect: '→ Langsung nempel tanpa の (contoh: 子供みたいだ).',
      },
      {
        typeCategory: 'B. Kata Sifat & Kerja',
        tagColor: 'sky',
        icon: '🔵',
        examples: ['静か', '降る', '高い', '食べた'],
        functionEffect: '→ Gunakan bentuk biasa tanpa embel-embel だ.',
      },
    ],
    nuances: [
      {
        contrastA: '〜みたいだ',
        meaningA: 'Santai & Lisan (bahasa percakapan sehari-hari)',
        contrastB: '〜ようだ',
        meaningB: 'Formal & Tertulis (memerlukan の untuk kata benda: 女のようだ)',
        explanation: 'Di percakapan santai, orang Jepang hampir selalu memakai みたい dibanding ようだ.',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Sederhana (Pondasi)',
        japanese: '彼の話し方は、女みたいだ。',
        reading: 'かれのはなしかたは、おんなみたいだ。',
        meaningId: 'Cara bicaranya seperti perempuan.',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Sehari-hari (Percakapan)',
        japanese: '今日は春になったみたいに暖かい。',
        reading: 'きょうははるになったみたいにあたたかい。',
        meaningId: 'Hari ini hangat, rasanya seperti sudah musim semi.',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Alami (Ekspresi Wajar)',
        japanese: '隣の部屋、だれもいないみたいだね。',
        reading: 'となりのへや、だれもいないみたいだね。',
        meaningId: 'Kamar sebelah sepertinya tidak ada orang ya.',
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

  const firstEx = item.examples && item.examples[0];
  const starterExample = firstEx ? {
    japanese: firstEx.japanese,
    reading: firstEx.reading,
    meaningId: firstEx.meaningId,
    contrastNote: `Penerapan langsung pola 「${item.title}」 dalam kalimat nyata.`,
  } : undefined;

  if (isChange) {
    return {
      summary: explanation,
      beforeState: 'Dulu: ❌ Keadaan lama / Belum terjadi',
      afterState: 'Sekarang: ✅ Menjadi keadaan baru',
      starterExample,
      keyTakeaway: 'Pola ini dipakai saat ingin menegaskan adanya transisi atau perubahan nyata.',
    };
  }

  if (isPassive) {
    return {
      summary: explanation,
      beforeState: 'Aksi Aktif: Pelaku yang melakukan 👤',
      afterState: 'Posisi Pasif: Subjek terkena dampak / merasa terganggu 🛡️',
      starterExample,
      keyTakeaway: 'Dipakai saat kamu ingin menyoroti perasaan atau posisi pihak yang terkena dampak tindakan orang lain.',
    };
  }

  if (isCausative) {
    return {
      summary: explanation,
      beforeState: 'Menunggu Izin: Mengharapkan perkenan pihak lain ⏳',
      afterState: 'Meminta Izin: Mengizinkan atau meminta agar boleh melakukan aksi 🤝',
      starterExample,
      keyTakeaway: 'Gunakan pola ini untuk meminta izin secara sopan tanpa terkesan memaksa.',
    };
  }

  if (isDugaan) {
    return {
      summary: explanation,
      beforeState: 'Fakta Pasti: Belum dikonfirmasi 100% 🔍',
      afterState: 'Kesan Tampang: Dugaan kuat dari apa yang dilihat / dirasa 💡',
      starterExample,
      keyTakeaway: 'Dipakai untuk mengungkapkan penilaian atau perumpamaan berdasarkan pengamatanmu sendiri.',
    };
  }

  return {
    summary: explanation,
    beforeState: 'Tanpa Pola Ini: Hanya kalimat fakta biasa 💬',
    afterState: 'Dengan Pola Ini: Memiliki nuansa dan maksud khusus 🎯',
    starterExample,
    keyTakeaway: `Pola ini penting untuk membuat kalimatmu terdengar alami dan tepat sasaran.`,
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
      const desc = parts[1]?.trim() ? `Dipakai untuk ${parts[1].trim()}` : `Penggunaan untuk ${label}`;
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
      label: sub.token || `Fungsi ${idx + 1}`,
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
      label: 'Fungsi Utama',
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
        note: sub.usageLocation ? `Letak dalam kalimat: ${sub.usageLocation}` : undefined,
      };
    });
  }

  const rawFormula = item.formula || item.title;
  const parts = rawFormula.split(/[＋+]/).map(p => p.trim());

  return [
    {
      title: `Rumus Pembentukan: ${item.title}`,
      breakdown: parts.length > 1 ? parts : [rawFormula],
      note: 'Perhatikan bentuk kata sebelum menyambungkannya dengan pola ini.',
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
            typeCategory: isVerb ? 'A. Kata Kerja (動詞)' : isNoun ? 'B. Kata Benda (名詞)' : 'C. Kata Sifat (形容詞)',
            tagColor: isVerb ? 'emerald' : isNoun ? 'sky' : isAdj ? 'amber' : 'purple',
            icon: isVerb ? '🟢' : isNoun ? '🔵' : isAdj ? '🟡' : '🟣',
            examples: cond.example ? [cond.example] : [cond.rule],
            functionEffect: `→ Aturan gabung: ${cond.rule}`,
          });
        }
      }
    }
  }

  if (result.length > 0) return result;

  // Generic fallback
  return [
    {
      typeCategory: 'A. Kata Kerja (動詞)',
      tagColor: 'emerald',
      icon: '🟢',
      examples: ['行く (pergi)', '食べる (makan)', 'する (melakukan)'],
      functionEffect: '→ Sambungkan sesuai bentuk yang diminta rumus (kamus / bentuk-te / dsb).',
    },
    {
      typeCategory: 'B. Kata Benda & Sifat (名詞・形容詞)',
      tagColor: 'sky',
      icon: '🔵',
      examples: ['学生 (siswa)', '静か (tenang)', '高い (mahal)'],
      functionEffect: '→ Perhatikan partikel penghubung seperti な atau の jika diperlukan.',
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
        contrastB: 'Bentuk Biasa Tanpa Pola',
        meaningB: 'Makna netral tanpa penekanan perasaan pembicara.',
        explanation: item.nuance,
      }
    ];
  }

  return [
    {
      contrastA: item.title,
      meaningA: item.meaningId,
      contrastB: 'Bentuk Kalimat Netral',
      meaningB: 'Hanya menyatakan fakta tanpa rasa bahasa khusus.',
      explanation: 'Gunakan pola ini saat ingin menyampaikan maksud dengan nuansa yang wajar didengar oleh orang Jepang.',
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
    'Level 1: Sederhana (Pondasi)',
    'Level 2: Sehari-hari (Percakapan)',
    'Level 3: Alami (Ekspresi Wajar)',
  ];

  return rawExamples.slice(0, 3).map((ex, idx) => ({
    tier: tiers[idx] || 'daily',
    tierLabel: tierLabels[idx] || `Level ${idx + 1}`,
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
