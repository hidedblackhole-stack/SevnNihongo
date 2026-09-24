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
      afterState: 'Kesan Tampang: Terlihat mirip sekali',
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

  // Signature N4: 赤ちゃんに泣かれた（迷惑の受身 / adversative passive）
  'w1d1g2': {
    concept: {
      summary: 'Menyatakan rasa terganggu, repot, atau dirugikan akibat tindakan pihak lain (Pasif Kerugian / 迷惑の受身).',
      beforeState: 'Kalimat Netral: 赤ちゃんが泣いた (Sekadar menyatakan fakta bayi menangis)',
      afterState: 'Pasif Kerugian: 赤ちゃんに泣かれた (Bayi menangis dan pembicara jadi sangat repot)',
      starterExample: {
        japanese: '友達の赤ちゃんを抱っこしたら、泣かれてしまった。',
        reading: 'ともだちのあかちゃんをだっこしたら、なかれてしまった。',
        meaningId: 'Saat menggendong bayi temanku, dia menangis dan aku jadi repot.',
        contrastNote: 'Bentuk pasif 泣かれた menegaskan bahwa tangisan tersebut membuat pembicara repot atau serba salah.',
      },
      keyTakeaway: 'Pelaku penyebab repot ditandai partikel に. Pembicara sebagai pihak yang dirugikan biasanya tidak perlu disebut sebagai subjek.',
    },
    functions: [
      {
        number: 1,
        label: 'Pasif Kerugian Pribadi (迷惑受身)',
        description: 'Menyatakan bahwa pembicara terimbas kerepotan atau ketidaknyamanan karena tindakan orang lain.',
        miniExample: {
          japanese: '雨に降られて、服がびしょ濡れになった。',
          reading: 'あめにふられて、ふくがびしょぬれになった。',
          meaningId: 'Kehujanan di jalan, bajuku jadi basah kuyup.',
        },
      },
      {
        number: 2,
        label: 'Kejadian di Luar Kuasa (不可抗力)',
        description: 'Digunakan saat orang atau hal lain bertindak di luar kendali kita dan merusak rencana kita.',
        miniExample: {
          japanese: '大切な会議の前に、電車に遅れられて困った。',
          reading: 'たいせつなかいぎのまえに、でんしゃにおくれられてこまった。',
          meaningId: 'Sebelum rapat penting, keretanya malah terlambat sehingga aku repot.',
        },
      },
    ],
    formulas: [
      {
        title: 'Rumus Pasif Kerugian',
        breakdown: ['Pelaku Pembuat Repot (N)', '+', 'に', '+', 'Kata Kerja Pasif (〜れる / 〜られる)'],
        progression: ['泣く (Menangis)', '泣かれる (Dibuat repot karena tangisannya)', '泣かれてしまった (Terlanjur dibuat repot)'],
        note: 'Pelaku selalu menggunakan partikel に. Kalimat berfokus pada dampak repot yang dialami pembicara.',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Kata Kerja Golongan 1 (五段)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['泣く → 泣かれる', '降る → 降られる', '死ぬ → 死なれる'],
        functionEffect: '→ Ubah vokal akhir u menjadi a, lalu tambahkan れる.',
      },
      {
        typeCategory: 'B. Kata Kerja Golongan 2 & 3',
        tagColor: 'sky',
        icon: '🔵',
        examples: ['逃げる → 逃げられる', '来る → 来られる', 'する → される'],
        functionEffect: '→ Golongan 2 +られる, 来る jadi こられる, する jadi される.',
      },
    ],
    nuances: [
      {
        contrastA: '赤ちゃんが泣いた',
        meaningA: 'Fakta netral: Bayi menangis.',
        contrastB: '赤ちゃんに泣かれた',
        meaningB: 'Pasif kerugian: Bayi menangis dan saya menanggung kerepotannya.',
        explanation: '迷惑の受身 hanya dipakai ketika ada rasa kesusahan atau kerugian pada pihak yang terkena imbas.',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Sederhana (Pondasi)',
        japanese: '傘がなくて、雨に降られてしまった。',
        reading: 'かさがなくて、あめにふられてしまった。',
        meaningId: 'Karena tidak bawa payung, aku kehujanan (dan jadi basah kuyup).',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Sehari-hari (Percakapan)',
        japanese: '友達の赤ちゃんを抱っこしたら、泣かれてしまった。',
        reading: 'ともだちのあかちゃんをだっこしたら、なかれてしまった。',
        meaningId: 'Saat menggendong bayi temanku, dia menangis dan aku jadi repot.',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Alami (Ekspresi Wajar)',
        japanese: '昨日は夜中に隣の人に騒がれて、全然眠れなかった。',
        reading: 'きのうはよなかにとなりのひとにさわがれて、ぜんぜんねむれなかった。',
        meaningId: 'Kemarin malam tetangga berisik sekali, sampai-sampai aku tidak bisa tidur sama sekali.',
      },
    ],
  },

  // Signature N4: 早く帰らせてください（V(さ)せてください / もらえますか / もらえませんか）
  'w1d1g3': {
    concept: {
      summary: 'Meminta izin secara santun agar pembicara sendiri yang diperkenankan melakukan sesuatu.',
      beforeState: 'Vてください: Meminta lawan bicara yang berbuat (Silakan Anda pulang)',
      afterState: 'V(さ)せてください: Meminta izin agar pembicara yang berbuat (Izinkan saya pulang)',
      starterExample: {
        japanese: '今日は気分が悪いので、早く帰らせてください。',
        reading: 'きょうはきぶんがわるいので、はやくかえらせてください。',
        meaningId: 'Karena hari ini merasa kurang enak badan, izinkan saya pulang lebih awal.',
        contrastNote: 'Gabungan dari 使役 (Kausatif / membiarkan) + てください (tolong). Secara harfiah: Tolong biarkan saya pulang.',
      },
      keyTakeaway: 'Sangat sering dipakai di tempat kerja atau sekolah untuk meminta izin tidak masuk, bertanya, atau pulang duluan.',
    },
    functions: [
      {
        number: 1,
        label: 'Meminta Izin Melakukan Aksi (許可)',
        description: 'Meminta kerelaan atau persetujuan atasan/lawan bicara agar kita diizinkan bertindak.',
        miniExample: {
          japanese: 'この件について、私に説明させてください。',
          reading: 'このけんについて、わたしにせつめいさせてください。',
          meaningId: 'Mengenai hal ini, izinkan saya untuk menjelaskannya.',
        },
      },
      {
        number: 2,
        label: 'Bentuk Lebih Halus / Sopan (〜てもらえますか)',
        description: 'Tingkat kesopanan lebih tinggi untuk lingkungan kerja profesional.',
        miniExample: {
          japanese: '明日、病院へ行くので休ませてもらえますか。',
          reading: 'あした、びょういんへいくのでやすませてもらえますか。',
          meaningId: 'Besok saya mau ke rumah sakit, apakah saya diperbolehkan untuk izin libur?',
        },
      },
    ],
    formulas: [
      {
        title: 'Rumus Kausatif Permintaan Izin',
        breakdown: ['Kata Kerja Kausatif (使役形)', '+', 'てください / もらえますか / もらえませんか'],
        progression: ['帰る (Pulang)', '帰らせる (Membuat/membiarkan pulang)', '帰らせてください (Izinkan saya pulang)'],
        note: 'Jika kata kerja transitif (butuh objek), pembicara ditandai partikel に (私に言わせてください).',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Kata Kerja Golongan 1 (五段)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['休む → 休ませてください', '書く → 書かせてください', '聞く → 聞かせてください'],
        functionEffect: '→ Vokal u menjadi a, lalu tambahkan せてください.',
      },
      {
        typeCategory: 'B. Kata Kerja Golongan 2 & 3',
        tagColor: 'sky',
        icon: '🔵',
        examples: ['食べる → 食べさせてください', 'する → させてください', '来る → 来させてください'],
        functionEffect: '→ Golongan 2 +させて, する jadi させて, 来る jadi こさせて.',
      },
    ],
    nuances: [
      {
        contrastA: '早く帰ってください',
        meaningA: 'Menyuruh lawan bicara: Silakan Anda yang cepat pulang.',
        contrastB: '早く帰らせてください',
        meaningB: 'Meminta izin diri sendiri: Izinkan/perkenankan saya pulang cepat.',
        explanation: 'Salah satu kesalahan paling umum pemula adalah mengatakan 帰ってください saat ingin pamit pulang sendiri.',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Sederhana (Pondasi)',
        japanese: 'トイレに行かせてください。',
        reading: 'トイレにいかせてください。',
        meaningId: 'Izinkan saya pergi ke toilet sebentar.',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Sehari-hari (Percakapan)',
        japanese: '頭が痛いので、少し休ませてもらえませんか。',
        reading: 'あたまがいたいので、すこしやすませてもらえませんか。',
        meaningId: 'Karena kepala saya pusing, bolehkah saya izin istirahat sebentar?',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Alami (Ekspresi Wajar)',
        japanese: '新しい企画について、私に一度やらせてください！',
        reading: 'あたらしいきかくについて、わたしにいちどやらせてください！',
        meaningId: 'Mengenai rencana proyek baru ini, tolong beri saya kesempatan untuk mencobanya!',
      },
    ],
  },

  // Signature N4: 食べちゃった（Vちゃう／Vじゃう）
  'w1d2g2': {
    concept: {
      summary: "Bentuk percakapan santai dari 'Vてしまう' (Selesai Tuntas / Terlanjur Basah)",
      beforeState: 'Bentuk Standar: 〜てしまう / 〜でしまう (Terkesan baku & panjang) 📜',
      afterState: 'Ragam Lisan: 〜ちゃう / 〜じゃう (Santai, akrab, & ekspresif) 💬',
      starterExample: {
        japanese: '試験が終わった！今日は朝まで飲んじゃおう！',
        reading: 'しけんがおわった！きょうはあさまでのんじゃおう！',
        meaningId: 'Ujian sudah selesai! Hari ini ayo kita minum-minum sampai tuntas!',
        contrastNote: "Bentuk percakapan akrab dari '飲んでしまおう'. Mengandung tekad merayakan sampai tuntas.",
      },
      keyTakeaway: 'Sangat sering muncul dalam obrolan sehari-hari, anime, dan dorama. Memiliki 2 rasa utama: 1) Selesai tuntas tanpa sisa, atau 2) Terlanjur keliru dengan nada penyesalan.',
    },
    functions: [
      {
        number: 1,
        label: 'Tindakan Selesai Tuntas (完了)',
        description: 'Menyatakan perbuatan yang diselesaikan sepenuhnya sampai habis atau tuntas tanpa sisa.',
        miniExample: {
          japanese: '喉が渇いていたから、ジュースを全部飲んじゃった。',
          reading: 'のどがかわいていたから、ジュースをぜんぶのんじゃった。',
          meaningId: 'Karena haus, aku minum sampai habis semua jusnya.',
        },
      },
      {
        number: 2,
        label: 'Terlanjur & Penyesalan (後悔・失敗)',
        description: 'Menyatakan peristiwa di luar kendali atau tindakan ceroboh yang disesali oleh pembicara ("aduh, terlanjur...").',
        miniExample: {
          japanese: '大切な書類を電車の中に忘れちゃった！',
          reading: 'たいせつなしょるいをでんしゃのなかにわすれちゃった！',
          meaningId: 'Gawat, dokumen pentingku terlanjur ketinggalan di dalam kereta!',
        },
      },
      {
        number: 3,
        label: 'Ragam Singkatan Percakapan (日常会話・短縮)',
        description: 'Dalam obrolan santai sehari-hari: V-てしまう disingkat jadi V-ちゃう, dan V-でしまう disingkat jadi V-じゃう.',
        miniExample: {
          japanese: 'うっかり秘密を喋っちゃった。',
          reading: 'うっかりひみつをしゃべっちゃった。',
          meaningId: 'Tanpa sengaja aku keceplosan rahasianya.',
        },
      },
    ],
    formulas: [
      {
        title: 'A. Bunyi ~te menjadi ~chau (〜て → 〜ちゃう)',
        breakdown: ['Kata Kerja Bentuk-Te', 'hapus [て]', '+', 'ちゃう / ちゃった'],
        progression: ['食べる (Makan)', '食べて (Bentuk Te)', '食べちゃう (Habiskan / Terlanjur makan)', '食べちゃった (Sudah tuntas / Terlanjur)'],
        note: 'Untuk kata kerja yang berakhiran [て] biasa (contoh: 行く → 行って → 行っちゃう).',
      },
      {
        title: 'B. Bunyi ~de menjadi ~jau (〜で → 〜じゃう)',
        breakdown: ['Kata Kerja Bentuk-De', 'hapus [で]', '+', 'じゃう / じゃった'],
        progression: ['飲む (Minum)', '飲んで (Bentuk De)', '飲んじゃう (Habiskan)', '飲んじゃった (Sudah tuntas diminum)'],
        note: 'Untuk kata kerja yang bentuk te-nya bernada sengau/tebal [で] (contoh: 読む → 読んで → 読んじゃう).',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Kata Kerja Berakhiran て (Te-form)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['食べる → 食べちゃう', '書く → 書いちゃう', '忘れる → 忘れちゃう', '落とす → 落としちゃう'],
        functionEffect: '→ Berubah menjadi 〜ちゃう (lampau: 〜ちゃった).',
      },
      {
        typeCategory: 'B. Kata Kerja Berakhiran で (De-form)',
        tagColor: 'purple',
        icon: '🟣',
        examples: ['飲む → 飲んじゃう', '読む → 読んじゃう', '遊ぶ → 遊んじゃう', '死ぬ → 死んじゃう'],
        functionEffect: '→ Berubah menjadi 〜じゃう (lampau: 〜じゃった).',
      },
    ],
    nuances: [
      {
        contrastA: '〜てしまう (Standar/Formal)',
        meaningA: 'Bentuk buku/tulisan resmi: 忘れてしまいました (sopan) / 忘れてしまった (netral)',
        contrastB: '〜ちゃう (Lisan/Santai)',
        meaningB: 'Bentuk obrolan akrab sehari-hari: 忘れちゃった (sangat natural)',
        explanation: 'Jangan gunakan 〜ちゃう kepada guru, atasan, atau dalam situasi wawancara kerja.',
      },
      {
        contrastA: 'Nuansa: Selesai Tuntas (完了)',
        meaningA: 'Konteks positif / kelegaan: 本を全部読んじゃった (Buku ini sudah kubaca habis).',
        contrastB: 'Nuansa: Penyesalan (後悔)',
        meaningB: 'Konteks negatif / kelalaian: 財布を落としちゃった (Dompetku terlanjur hilang).',
        explanation: 'Arti ditentukan konteks kalimat: apakah perbuatan sengaja dituntaskan, atau keteledoran yang disesali.',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Sederhana (Pondasi)',
        japanese: '宿題はもう全部やっちゃった。',
        reading: 'しゅくだいはもうぜんぶやっちゃった。',
        meaningId: 'PR-nya sudah selesai kukerjakan semuanya sampai beres.',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Sehari-hari (Percakapan)',
        japanese: '大切な書類を電車の中に忘れちゃった！',
        reading: 'たいせつなしょるいをでんしゃのなかにわすれちゃった！',
        meaningId: 'Gawat, dokumen pentingku terlanjur ketinggalan di kereta!',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Alami (Ekspresi Wajar)',
        japanese: '試験が終わった！今日は飲んじゃおう！',
        reading: 'しけんがおわった！きょうはのんじゃおう！',
        meaningId: 'Ujian sudah selesai! Hari ini ayo kita minum-minum santai!',
      },
    ],
  },

  // Signature N4: 行かなくちゃ（Vなくちゃ／Vなきゃ）
  'w1d2g1': {
    concept: {
      summary: "Bentuk percakapan santai dari 'Vなければならない' (Harus melakukan)",
      beforeState: 'Bentuk Standar: 〜なければならない (Panjang & kaku diucapkan) 📜',
      afterState: 'Ragam Lisan: 〜なくちゃ / 〜なきゃ (Cepat, lincah, & natural) 💬',
      starterExample: {
        japanese: 'もう時間だ。早く行かなくちゃ！',
        reading: 'もうじかんだ。はやくいかなくちゃ！',
        meaningId: 'Sudah waktunya. Aku harus segera pergi!',
        contrastNote: "Bentuk percakapan dari '行かなければならない'.",
      },
      keyTakeaway: 'Sering dipakai saat berbicara pada diri sendiri atau mengingatkan teman akrab tentang hal mendesak.',
    },
    functions: [
      {
        number: 1,
        label: 'Kewajiban Mendesak (義務)',
        description: 'Menyatakan hal penting yang harus atau wajib segera diselesaikan tanpa ditunda.',
        miniExample: {
          japanese: 'メールの返事を今日中に書かなくちゃ。',
          reading: 'メールのへんじをきょうちゅうにかかなくちゃ。',
          meaningId: 'Aku harus menulis balasan email ini hari ini juga.',
        },
      },
      {
        number: 2,
        label: 'Pengingat Diri Sendiri (独り言・自発)',
        description: 'Bergumam pada diri sendiri saat menyadari ada hal yang harus segera dilakukan.',
        miniExample: {
          japanese: 'もうこんな時間！早く起きなきゃ！',
          reading: 'もうこんなじかん！はやくおきなきゃ！',
          meaningId: 'Sudah jam segini! Aku harus segera bangun!',
        },
      },
      {
        number: 3,
        label: 'Ragam Percakapan Santai (日常会話・短縮)',
        description: 'Singkatan lisan: 〜なければ → 〜なきゃ, 〜なくては → 〜なくちゃ.',
        miniExample: {
          japanese: '薬をちゃんと飲まないと、風邪が治らないよ。',
          reading: 'くすりをちゃんとやまないと、かぜがなおらないよ。',
          meaningId: 'Kalau tidak minum obat dengan teratur, flumu tidak akan sembuh lho.',
        },
      },
    ],
  },

  // Signature N4: 書いとく（Vとく／Vどく）
  'w1d2g3': {
    concept: {
      summary: "Bentuk percakapan dari 'Vておく' (Persiapan / Membiarkan)",
      beforeState: 'Bentuk Standar: 〜ておく / 〜でおく (Bentuk baku textbook) 📜',
      afterState: 'Ragam Lisan: 〜とく / 〜どく (Praktis & lincah dalam obrolan) 💬',
      starterExample: {
        japanese: 'テストで間違ったところを、ノートに書いとこう。',
        reading: 'テストでまちがったところを、ノートにかいとこう。',
        meaningId: 'Aku akan mencatat bagian yang salah di ujian ke buku catatan sebagai persiapan.',
        contrastNote: "Singkatan dari '書いておこう'.",
      },
      keyTakeaway: 'Dipakai untuk aksi yang sengaja dikerjakan demi kemudahan di masa depan, atau membiarkan kondisi seperti semula.',
    },
    functions: [
      {
        number: 1,
        label: 'Persiapan Masa Depan (準備)',
        description: 'Melakukan tindakan sekarang sebagai bekal persiapan sebelum peristiwa penting terjadi.',
        miniExample: {
          japanese: '旅行の前に切符を買っといた。',
          reading: 'りょこうのまえにきっぷをかっといた。',
          meaningId: 'Sebelum liburan, aku sudah membelikan tiket terlebih dahulu.',
        },
      },
      {
        number: 2,
        label: 'Tindakan Pasca-Aktivitas / Beres-beres (後始末)',
        description: 'Mengembalikan benda ke tempatnya atau menyelesaikan sesuatu setelah dipakai.',
        miniExample: {
          japanese: '使ったハサミは引き出しに戻しといてね。',
          reading: 'つかったハサミはひきだしにもどしといてね。',
          meaningId: 'Gunting yang sudah dipakai tolong taruh kembali ke laci ya.',
        },
      },
      {
        number: 3,
        label: 'Membiarkan Keadaan (状態維持)',
        description: 'Sengaja membiarkan suatu keadaan tetap seperti apa adanya tanpa diubah.',
        miniExample: {
          japanese: 'まだ使っているから、そのままにしといて。',
          reading: 'まだつかっているから、そのままにしといて。',
          meaningId: 'Karena masih kupakai, biarkan saja seperti itu ya.',
        },
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
    (item.title.includes('みたい') ? BESPOKE_SKILL_NODES['w1d3g1'] : undefined) ||
    (item.title.includes('ちゃう') || item.title.includes('じゃう') ? BESPOKE_SKILL_NODES['w1d2g2'] : undefined) ||
    (item.title.includes('なくちゃ') || item.title.includes('なきゃ') ? BESPOKE_SKILL_NODES['w1d2g1'] : undefined) ||
    (item.title.includes('とく') || item.title.includes('どく') ? BESPOKE_SKILL_NODES['w1d2g3'] : undefined);

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
  const rawExplanation = (item as any).nuance || item.meaningId || item.explanation || '';
  const explanation = rawExplanation
    .replace(/\s*\([A-Za-z0-9\s/,'’._\-—]{4,}\)\.?\s*$/g, '')
    .trim();
  const isChange = explanation.toLowerCase().includes('perubahan') || explanation.toLowerCase().includes('menjadi');
  const isPassive = explanation.toLowerCase().includes('pasif') || item.title.includes('れる') || item.title.includes('られる');
  const isCausative = explanation.toLowerCase().includes('izin') || explanation.toLowerCase().includes('menyuruh') || item.title.includes('させて');
  const isDugaan = explanation.toLowerCase().includes('seperti') || explanation.toLowerCase().includes('tampaknya') || explanation.toLowerCase().includes('dugaan');

  const firstEx = item.examples && item.examples[0];
  const starterExample = firstEx ? {
    japanese: firstEx.japanese,
    reading: firstEx.reading,
    meaningId: firstEx.meaningId,
  } : undefined;

  if (isChange) {
    return {
      summary: explanation,
      beforeState: 'Dulu: ❌ Keadaan lama / Belum terjadi',
      afterState: 'Sekarang: ✅ Menjadi keadaan baru',
      starterExample,
    };
  }

  if (isPassive) {
    return {
      summary: explanation,
      beforeState: 'Aksi Aktif: Pelaku yang berbuat 👤',
      afterState: 'Posisi Pasif: Subjek terkena dampak / kerepotan 🛡️',
      starterExample,
    };
  }

  if (isCausative) {
    return {
      summary: explanation,
      beforeState: 'Menunggu Izin: Mengharapkan perkenan pihak lain ⏳',
      afterState: 'Meminta Izin: Mengizinkan atau meminta agar boleh berbuat 🤝',
      starterExample,
    };
  }

  if (isDugaan) {
    return {
      summary: explanation,
      beforeState: 'Fakta Pasti: Belum dikonfirmasi 100% 🔍',
      afterState: 'Kesan Tampang: Dugaan kuat dari apa yang diamati 💡',
      starterExample,
    };
  }

  return {
    summary: explanation,
    beforeState: 'Tanpa Pola: Kalimat fakta biasa 💬',
    afterState: 'Dengan Pola: Bernuansa dan terarah 🎯',
    starterExample,
  };
}

/**
 * Knowledge map of pedagogically rich descriptions and human-friendly labels for grammar functions
 */
const FUNCTION_KNOWLEDGE_MAP: Record<string, { label: string; description: string; keywords?: string[] }> = {
  '完了': {
    label: 'Tindakan Selesai Tuntas (完了)',
    description: 'Menyatakan bahwa suatu aktivitas telah terselesaikan sepenuhnya sampai beres atau habis tanpa sisa.',
    keywords: ['全部', '終わ', '宿題', '飲ん', '食べ', 'すっかり', '切る'],
  },
  '後悔': {
    label: 'Terlanjur & Penyesalan (後悔)',
    description: 'Menyatakan rasa bersalah, kecewa, atau sesuatu yang keliru dan terlanjur terjadi di luar kendali.',
    keywords: ['忘れ', '落と', 'なく', '困', '失敗', '壊', 'うっかり', '電車', 'ケーキ'],
  },
  '日常会話': {
    label: 'Percakapan Santai Sehari-hari (日常会話)',
    description: 'Bentuk singkatan kasual (colloquial) yang digunakan dalam obrolan lisan akrab sehari-hari.',
    keywords: ['今日', 'じゃお', 'ちゃお', 'ね', 'よ', '友達', '飲んじゃおう'],
  },
  '義務': {
    label: 'Kewajiban & Keharusan (義務)',
    description: 'Menyatakan hal mendesak yang wajib atau harus segera dikerjakan tanpa ditunda.',
    keywords: ['行か', '書か', '急ぐ', '宿題', '時間', '返事', '起き'],
  },
  '助言': {
    label: 'Nasihat & Anjuran (助言)',
    description: 'Memberikan saran atau usulan positif yang dianggap baik dan bermanfaat bagi lawan bicara.',
    keywords: ['いい', '方', '薬', '病院', '相談'],
  },
  '推測': {
    label: 'Dugaan Spontan (推測)',
    description: 'Menyatakan dugaan atau perkiraan berdasarkan apa yang dilihat atau dirasakan langsung saat itu.',
    keywords: ['雨', '人', '来', 'だれも', 'どうやら'],
  },
  '比喩': {
    label: 'Perumpamaan / Mengibaratkan (比喩)',
    description: 'Mengibaratkan sesuatu menyerupai hal lain karena sifat, tingkah laku, atau tampilannya serupa.',
    keywords: ['子供', '女', '夢', 'まるで', '花'],
  },
  '類似': {
    label: 'Kemiripan Karakteristik (類似)',
    description: 'Menunjukkan keserupaan ciri khas atau karakteristik antar dua objek.',
    keywords: ['似', '同じ', 'よう'],
  },
  '典型': {
    label: 'Khas / Otentik (典型)',
    description: 'Menunjukkan ciri khas sejati yang benar-benar mencerminkan status atau esensi aslinya.',
    keywords: ['男', '女', '春', '学生', 'プロ'],
  },
  '様子': {
    label: 'Kesan Lahiriah (様子)',
    description: 'Menggambarkan kondisi atau suasana yang tampak secara kasat mata.',
    keywords: ['静か', '元気', '様子', '顔'],
  },
  '傾向': {
    label: 'Kecenderungan Sifat (傾向)',
    description: 'Menyatakan kecenderungan atau sifat pembawaan yang sering terlihat dari luar.',
    keywords: ['子供', '安', '怒り', '黒'],
  },
  '努力': {
    label: 'Usaha Sadar (努力)',
    description: 'Menunjukkan komitmen dan usaha sadar yang terus-menerus dilakukan untuk membiasakan hal baik.',
    keywords: ['忘れ物', '毎日', '心掛', '早起き'],
  },
  '習慣': {
    label: 'Pembiasaan Rutin (習慣)',
    description: 'Membentuk rutinitas atau kebiasaan baru yang dilakukan secara berkala.',
    keywords: ['運動', '勉強', '毎日', '朝'],
  },
  '目的': {
    label: 'Tujuan Tindakan (目的)',
    description: 'Melakukan tindakan demi mencapai suatu kondisi atau tujuan yang diinginkan.',
    keywords: ['聞こえる', '見える', '合格', 'ため'],
  },
  '変化': {
    label: 'Perubahan Kondisi / Kemampuan (変化)',
    description: 'Menyatakan transisi dari keadaan semula (tidak bisa/belum biasa) menjadi keadaan baru.',
    keywords: ['話せる', '泳げる', '読める', '直る'],
  },
  '限定': {
    label: 'Pembatasan Khusus (限定)',
    description: 'Membatasi lingkup hanya pada hal tersebut (melulu / semata-mata hal itu).',
    keywords: ['ばかり', 'だけ', '遊んで', 'テレビ'],
  },
  '強調': {
    label: 'Penekanan Derajat (強調)',
    description: 'Memberi penekanan khusus untuk menegaskan tingkat keparahan, jumlah, atau frekuensi.',
    keywords: ['女性', '雨', '文句', '寝て'],
  },
  '不満': {
    label: 'Keluhan / Nada Kritis (不満)',
    description: 'Mengandung nada kejengkelan atau kritik karena suatu perbuatan dirasa berlebihan.',
    keywords: ['遊んでばかり', 'ゲーム', '文句', 'サボ'],
  },
  '関連': {
    label: 'Kaitan Topik Bahasan (関連)',
    description: 'Mengangkat suatu topik wacana, bahasan, atau objek pembicaraan yang lebih luas.',
    keywords: ['事件', '問題', '調査', '記事'],
  },
  '手段': {
    label: 'Sarana & Cara (手段)',
    description: 'Menunjukkan sarana, metode, atau instrumen yang digunakan untuk melaksanakan aksi.',
    keywords: ['車', 'インターネット', '電話', '方法'],
  },
  '原因': {
    label: 'Penyebab / Alasan (原因)',
    description: 'Menjelaskan faktor pemicu logis di balik terjadinya suatu kondisi atau peristiwa.',
    keywords: ['事故', '台風', '熱', '遅れ'],
  },
  '確信': {
    label: 'Keyakinan Logis (確信)',
    description: 'Menyatakan keyakinan kuat bahwa sesuatu semestinya terjadi berdasarkan jadwal atau fakta.',
    keywords: ['来る', '合格', '届く', '予定'],
  },
  '当然': {
    label: 'Kewajaran Akal Sehat (当然)',
    description: 'Menyatakan hal yang wajar dan sudah sewajarnya terjadi demikian.',
    keywords: ['約束', '勉強した', '知っている'],
  },
  '納得': {
    label: 'Pemahaman Wajar (納得)',
    description: 'Menyatakan pemahaman logis setelah mengetahui alasan di baliknya ("pantas saja...").',
    keywords: ['暑い', '上手', '日本にいた', '道理で'],
  },
  '部分否定': {
    label: 'Penolakan Sebagian (部分否定)',
    description: 'Menolak generalisasi bahwa hal tersebut tidak selalu atau tidak 100% demikian.',
    keywords: ['嫌い', '高い', '全部', '必ずしも'],
  },
  '受身': {
    label: 'Bentuk Pasif Objektif (受身)',
    description: 'Menyatakan peristiwa atau fakta dari sudut pandang penerima aksi tanpa menonjolkan pelaku.',
    keywords: ['書かれて', '作られた', '建てられ', '言われて'],
  },
  '迷惑受身': {
    label: 'Pasif Kerugian / Kerepotan (迷惑受身)',
    description: 'Menyatakan bahwa pembicara merasa sangat terganggu, repot, atau dirugikan oleh perbuatan pihak lain.',
    keywords: ['泣かれた', '降られた', '踏まれた', '逃げられた'],
  },
  '許可': {
    label: 'Izin & Persetujuan (許可)',
    description: 'Memohon izin untuk melakukan sesuatu secara santun atau menyatakan perkenan.',
    keywords: ['帰らせて', '休ませて', '使わせて', 'させて'],
  },
  '使役': {
    label: 'Bentuk Kausatif (使役)',
    description: 'Menyuruh, menugaskan, atau memberi kesempatan kepada orang lain untuk melakukan aksi.',
    keywords: ['行かせる', '食べさせる', '読ませる', '勉強させる'],
  },
  '使役受身': {
    label: 'Kausatif Pasif / Terpaksa (使役受身)',
    description: 'Menyatakan bahwa subjek terpaksa melakukan suatu perbuatan di luar kehendaknya sendiri.',
    keywords: ['待たされた', '飲まされた', '行かされた', '歌わされた'],
  },
  '仮定': {
    label: 'Pengandaian & Syarat (仮定・条件)',
    description: 'Menyatakan prasyarat yang harus dipenuhi agar kejadian atau hasil berikutnya dapat terwujud.',
    keywords: ['雨が降れば', '安かったら', '行けば', '春になれば'],
  },
  '逆接': {
    label: 'Pertentangan / Walaupun (逆接・譲歩)',
    description: 'Menghubungkan dua fakta yang bertentangan atau hasil yang meleset dari ekspektasi normal.',
    keywords: ['のに', 'けれども', '薬を飲んだが', '雨なのに'],
  },
  '極限': {
    label: 'Ketuntasan Maksimal (極限)',
    description: 'Menghabiskan atau mengerahkan sesuatu sampai ke batas akhir tanpa tersisa.',
    keywords: ['使い切る', '食べ切る', '走り切った', '疲れ切った'],
  },
  '限界': {
    label: 'Batas Kapasitas (限界)',
    description: 'Menunjukkan batas kemampuan fisik, mental, atau kapasitas yang sanggup ditampung.',
    keywords: ['数え切れない', '我慢', '持ちきれない'],
  },
  '敬語': {
    label: 'Bahasa Sopan & Formal (敬語)',
    description: 'Ragam bahasa hormat untuk menghargai lawan bicara atau merendahkan diri secara santun.',
    keywords: ['いらっしゃる', 'おっしゃる', 'いただく', '申す'],
  },
};

interface CandidateSentence {
  japanese: string;
  reading?: string;
  meaningId: string;
}

function extractCandidateSentences(item: BunpouItem): CandidateSentence[] {
  const list: CandidateSentence[] = [];

  // 1. From examples
  if (item.examples && item.examples.length > 0) {
    for (const ex of item.examples) {
      if (ex.japanese && ex.meaningId) {
        list.push({
          japanese: ex.japanese,
          reading: ex.reading || ex.japanese,
          meaningId: ex.meaningId,
        });
      }
    }
  }

  // 2. From questions
  if (item.questions && item.questions.length > 0) {
    for (const q of item.questions) {
      if (!q.prompt) continue;
      const correctOption = q.options && q.correctIndex !== undefined ? q.options[q.correctIndex] : '';
      const filled = q.prompt.replace(/（\s*）|\(\s*\)/g, correctOption || '').trim();
      if (!filled) continue;

      let meaning = '';
      const artiMatch = q.explanation?.match(/Arti kalimat:\s*["“]([^"”]+)["”]/i);
      if (artiMatch) {
        meaning = artiMatch[1];
      } else if (q.explanation) {
        meaning = q.explanation.split('\n')[0].replace(/^Jawaban benar:[^\n]*/, '').trim();
      }

      if (!meaning || meaning.length < 5) {
        meaning = item.meaningId;
      }

      list.push({
        japanese: filled,
        reading: q.ruby ? q.ruby.replace(/（\s*）|\(\s*\)/g, correctOption || '') : filled,
        meaningId: meaning,
      });
    }
  }

  return list;
}

/**
 * Fallback generator for Node 2: Functions
 */
function generateFallbackFunctions(item: BunpouItem): GrammarSkillFunction[] {
  const candidates = extractCandidateSentences(item);
  const usedSentences = new Set<string>();

  if (item.functions && item.functions.length > 0) {
    return item.functions.map((fn, idx) => {
      const parts = fn.split(/[()（）]/).filter(p => p.trim());
      const kanjiKey = parts[0]?.trim() || '';
      const indoTag = parts[1]?.trim() || '';

      const descriptor = FUNCTION_KNOWLEDGE_MAP[kanjiKey] ||
        Object.entries(FUNCTION_KNOWLEDGE_MAP).find(([k]) => kanjiKey.includes(k))?.[1];

      let label = descriptor?.label;
      if (!label) {
        if (indoTag) {
          const capitalizedIndo = indoTag.charAt(0).toUpperCase() + indoTag.slice(1);
          label = `${capitalizedIndo} (${kanjiKey})`;
        } else {
          label = kanjiKey || fn;
        }
      }

      let description = descriptor?.description;
      if (!description) {
        if (indoTag) {
          description = `Dipakai untuk menyatakan fungsi ${indoTag} dalam konteks kalimat ${item.title}.`;
        } else {
          description = `Digunakan sesuai kaidah fungsi ${kanjiKey} dalam konteks kalimat.`;
        }
      }

      // Find best matching unused candidate sentence
      const keywords = descriptor?.keywords || [kanjiKey, indoTag].filter(Boolean);
      let bestCandidate: CandidateSentence | undefined;
      let highestScore = -1;

      for (const cand of candidates) {
        if (usedSentences.has(cand.japanese)) continue;
        let score = 0;
        for (const kw of keywords) {
          if (cand.japanese.includes(kw) || cand.meaningId.toLowerCase().includes(kw.toLowerCase())) {
            score += 2;
          }
        }
        if (score > highestScore) {
          highestScore = score;
          bestCandidate = cand;
        }
      }

      // If no candidate scored with keywords, pick the first unused candidate
      if (!bestCandidate) {
        bestCandidate = candidates.find(c => !usedSentences.has(c.japanese));
      }

      // Mark as used so functions NEVER share the exact same sentence
      if (bestCandidate) {
        usedSentences.add(bestCandidate.japanese);
      }

      return {
        number: idx + 1,
        label,
        description,
        miniExample: bestCandidate ? {
          japanese: bestCandidate.japanese,
          reading: bestCandidate.reading,
          meaningId: bestCandidate.meaningId,
        } : undefined,
      };
    });
  }

  // Parse from subFormulas if available
  if (item.subFormulas && item.subFormulas.length > 0) {
    return item.subFormulas.map((sub, idx) => {
      const ex = sub.examples && sub.examples[0];
      return {
        number: idx + 1,
        label: sub.token || `Fungsi ${idx + 1}`,
        description: sub.meaning || sub.usageLocation || item.meaningId,
        miniExample: ex ? {
          japanese: ex.japanese,
          reading: ex.reading,
          meaningId: ex.meaningId,
        } : undefined,
      };
    });
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
