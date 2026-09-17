import { MapRegion, Stage, WorldInfo } from '../../types/content';
import mapsDb from './maps.json';
import stagesDb from './stages.json';

interface RawMapJson {
  id: string;
  world_id?: string;
  title_jp: string;
  title_en: string;
  map_number: number;
  source: string;
  page_range: string;
  stage_ids: string[];
}

interface RawStageJson {
  id: string;
  map_id: string;
  stage_number: number;
  title_jp: string;
  title_en: string;
  bunpou?: string[];
  kotoba?: string[];
  kanji?: string[];
  dokkai?: string[];
  choukai?: string[];
}

export const WORLDS_LIST: WorldInfo[] = [
  {
    id: 'world_training',
    jlptLevel: 'KANA',
    name: 'Kuil Pelatihan Aksara (Shūren no Niwa)',
    japaneseName: '修練の庭 (Kana Dojo)',
    subtitle: 'Akademi Menulis & Membaca 46 Hiragana & Katakana 7 Sheet',
    description: 'Dunia khusus pemula untuk menguasai aksara Jepang dasar (46 Hiragana + 46 Katakana), latihan kuas kaligrafi 7 sheet, kuis membaca bunyi, dan salam dasar.',
    theme: 'Akademi Kaligrafi & Aksara Dasar',
    bannerBg: 'bg-surface-card',
    accentColor: 'text-emerald-400 border-emerald-500/60',
    glowColor: 'shadow-emerald-500/30',
    iconName: 'Feather',
    minTier: 1,
    maxTier: 1,
    minLevel: 1,
    badge: 'KANA DOJO'
  },
  {
    id: 'world_n5',
    jlptLevel: 'N5',
    name: 'Dunia Permulaan (Hajimari no Sekai)',
    japaneseName: '始まりの世界 (JLPT N5)',
    subtitle: 'Partikel, Tata Bahasa, & Kosakata Inti',
    description: 'Fokus penguasaan materi resmi JLPT N5: Partikel dasar, salam, angka, kata kerja harian, bentuk -te, dan 84 Kanji dasar N5.',
    theme: 'Ranah Permulaan N5',
    bannerBg: 'bg-surface-card',
    accentColor: 'text-emerald-400 border-emerald-500/60',
    glowColor: 'shadow-emerald-500/30',
    iconName: 'Compass',
    minTier: 1,
    maxTier: 2,
    minLevel: 1,
    badge: 'JLPT N5'
  },
  {
    id: 'world_n4',
    jlptLevel: 'N4',
    name: 'Langkah Petualang (Tabidachi no Sekai)',
    japaneseName: '旅立ちの世界',
    subtitle: 'Minna no Nihongo II (Bab 26〜50)',
    description: 'Petualangan terstruktur berdasarkan 25 bab Minna no Nihongo Shokyū II: bentuk potensial, maksud, pengandaian, pasif, kausatif, hingga keigo.',
    theme: 'Ranah Minna no Nihongo',
    bannerBg: 'bg-surface-card',
    accentColor: 'text-sky-400 border-sky-500/60',
    glowColor: 'shadow-sky-500/30',
    iconName: 'Footprints',
    minTier: 3,
    maxTier: 4,
    minLevel: 10,
    badge: 'MINNA II CORE'
  },
  {
    id: 'world_n3',
    jlptLevel: 'N3',
    name: 'Alam Soumatome (Kokorozashi no Sekai)',
    japaneseName: '志の世界 (Soumatome N3)',
    subtitle: 'Peta Resmi 6 Minggu Soumatome N3',
    description: 'Petualangan terstruktur berdasarkan materi resmi Soumatome N3. Kuasai bentuk pasif, kausatif, ungkapan sudut pandang, dan wacana menengah.',
    theme: 'Ranah Soumatome',
    bannerBg: 'bg-surface-card',
    accentColor: 'text-gold border-gold/60',
    glowColor: 'shadow-gold/30',
    iconName: 'Shield',
    minTier: 5,
    maxTier: 6,
    minLevel: 20,
    badge: 'SOUMATOME CORE'
  },
  {
    id: 'world_n2',
    jlptLevel: 'N2',
    name: 'Benteng Kemahiran (Jukuren no Sekai)',
    japaneseName: '熟練の世界',
    subtitle: 'Wacana Formal, Opini, & Bahasa Bisnis',
    description: 'Tata bahasa tingkat tinggi, nuansa halus situasi formal, ungkapan logika akademis, dan teks bacaan panjang.',
    theme: 'Ranah Kemahiran',
    bannerBg: 'bg-surface-card',
    accentColor: 'text-purple-400 border-purple-500/60',
    glowColor: 'shadow-purple-500/30',
    iconName: 'Sword',
    minTier: 7,
    maxTier: 8,
    minLevel: 35,
    badge: 'ADVANCED'
  },
  {
    id: 'world_n1',
    jlptLevel: 'N1',
    name: 'Puncak Transenden (Chouetsu no Sekai)',
    japaneseName: '超越の世界',
    subtitle: 'Puncak Tertinggi Penguasaan Bahasa Jepang',
    description: 'Tata bahasa klasik, idiom mendalam, wacana filosofis, dan ekspresi elok setara penutur asli tingkat lanjut.',
    theme: 'Ranah Dewa Bahasa',
    bannerBg: 'bg-surface-card',
    accentColor: 'text-rose-400 border-rose-500/60',
    glowColor: 'shadow-rose-500/30',
    iconName: 'Crown',
    minTier: 9,
    maxTier: 10,
    minLevel: 50,
    badge: 'APEX MASTER'
  }
];

function getWorldById(worldId: string): WorldInfo {
  return WORLDS_LIST.find(w => w.id === worldId) || WORLDS_LIST[0];
}

const THEMES: Record<string, { theme: string; bannerBg: string; accentColor: string; minLevel: number; description: string }> = {
  // N5 Themes (All regions in Dunia Permulaan accessible from level 1)
  // Kana Training Ground Themes (4 Regions)
  map_kana_hiragana: {
    theme: 'Hiragana Dojo (Wilayah 1)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-amber-400 border-amber-500',
    minLevel: 1,
    description: 'Wilayah 1: Akademi Hiragana — Kuasai penulisan 7 sheet & pembacaan 46 aksara Hiragana dasar (Seion あ〜ん).'
  },
  map_kana_katakana: {
    theme: 'Katakana Dojo (Wilayah 2)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-orange-400 border-orange-500',
    minLevel: 1,
    description: 'Wilayah 2: Akademi Katakana — Kuasai penulisan 7 sheet & pembacaan 46 aksara Katakana (ア〜ン) serta kosakata serapan.'
  },
  map_kana_verbs: {
    theme: 'Verb Foundations (Wilayah 3)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-cyan-400 border-cyan-500',
    minLevel: 1,
    description: 'Wilayah 3: Fondasi Konjugasi — Kuasai 5 bentuk kata kerja paling dasar: Kamus (Futsukei), Masu, Nai, Ta, dan Te.'
  },
  map_kana_grammar: {
    theme: 'Sentence Foundations (Wilayah 4)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-purple-400 border-purple-500',
    minLevel: 1,
    description: 'Wilayah 4: Pola Kalimat Pembuka — Kuasai predikat nominal (Desu/Dewa arimasen), kalimat tanya (Ka), serta partikel inti (Wo, Ga, Ni, De, No, Mo).'
  },

  // N5 Themes (Canonical 4 Regions)
  map_n5_w1: {
    theme: 'Gate of Beginnings (Wilayah 1)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-emerald-400 border-emerald-500',
    minLevel: 1,
    description: 'Wilayah 1: Fondasi partikel dasar (wa, ga, wo), salam perjumpaan, dan perkenalan diri.'
  },
  map_n5_w2: {
    theme: 'Village of Daily Living (Wilayah 2)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-teal-400 border-teal-500',
    minLevel: 1,
    description: 'Wilayah 2: Kata kerja harian, lokasi & arah (ni, de, he), serta aktivitas sehari-hari.'
  },
  map_n5_w3: {
    theme: 'Forest of Time (Wilayah 3)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-green-400 border-green-500',
    minLevel: 1,
    description: 'Wilayah 3: Angka, waktu, tanggal, kata sifat -i dan -na, serta pola perbandingan dasar.'
  },
  map_n5_w4: {
    theme: 'Temple of Trial (Wilayah 4)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-emerald-400 border-emerald-500',
    minLevel: 1,
    description: 'Wilayah 4: Konjugasi bentuk Te, permintaan izin (te mo ii), dan Ujian Akhir Boss N5.'
  },

  // N4 Themes
  map_n4_w1: {
    theme: 'Plains of Departure (Wilayah 1)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-sky-400 border-sky-500',
    minLevel: 10,
    description: 'Minggu 1: Bentuk lampau (ta-kei), bentuk negatif (nai-kei), dan kebiasaan.'
  },
  map_n4_w2: {
    theme: 'Canyon of Potential (Wilayah 2)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-blue-400 border-blue-500',
    minLevel: 12,
    description: 'Minggu 2: Bentuk potensial (bisa melakukan), volisional (mari lakukan), dan keinginan (tai).'
  },
  map_n4_w3: {
    theme: 'Swamp of Conditionals (Wilayah 3)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-cyan-400 border-cyan-500',
    minLevel: 14,
    description: 'Minggu 3: Pengandaian tara, to, ba, nara, serta hubungan sebab-akibat.'
  },
  map_n4_w4: {
    theme: 'Fortress of Politeness (Wilayah 4)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-indigo-400 border-indigo-500',
    minLevel: 16,
    description: 'Minggu 4: Keigo pemula (Sonkeigo/Kenjougo) dan pola memberi-menerima (ageru, kureru, morau).'
  },
  map_n4_w5: {
    theme: 'Tower of Promotion (Wilayah 5)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-sky-400 border-sky-500',
    minLevel: 18,
    description: 'Minggu 5: Ujian komprehensif N4 dan pertempuran Boss Evaluasi Kelulusan.'
  },

  // N3 Themes (Soumatome canonical)
  map_bunpou_w1: {
    theme: 'Harbor of Beginnings (Wilayah 1)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-emerald-400 border-emerald-500',
    minLevel: 20,
    description: 'Minggu 1: Fondasi bentuk pasif (Ukemikei), kausatif izin, singkatan percakapan, dan ungkapan ekspresi diri.'
  },
  map_bunpou_w2: {
    theme: 'Shrines of Determination (Wilayah 2)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-amber-400 border-amber-500',
    minLevel: 23,
    description: 'Minggu 2: Partikel penegas (bakari, dakeshika, sae), ungkapan topik (ni kanshite, ni tsuite), dan nominalisasi.'
  },
  map_bunpou_w3: {
    theme: 'Coast of Perseverance (Wilayah 3)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-cyan-400 border-cyan-500',
    minLevel: 26,
    description: 'Minggu 3: Pengandaian konsesif (temo, zuni), posisi/peran (to shite, ni shite wa), serta keharusan & kenangan.'
  },
  map_bunpou_w4: {
    theme: 'Mystic Mountain of Resolve (Wilayah 4)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-amber-400 border-amber-500',
    minLevel: 29,
    description: 'Minggu 4: Sudut pandang (ni totte), perbandingan proporsi (wari ni, hodo), sebab akibat, dan konektor wacana.'
  },
  map_bunpou_w5: {
    theme: 'Sacred Forest of Reflection (Wilayah 5)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-lime-400 border-lime-500',
    minLevel: 32,
    description: 'Minggu 5: Perbandingan & kontras (mochiron, bakari ka, ni kurabete), verba majemuk kelengkapan, dan pengandaian penyesalan.'
  },
  map_bunpou_w6: {
    theme: 'Citadel of Master Decisive Will (Wilayah 6)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-pink-400 border-pink-500',
    minLevel: 34,
    description: 'Minggu 6: Pengandaian hipotetis (moshi, to shitemo), kebiasaan (koto ni shite iru), nuansa wake/tokoro, dan tata bahasa Keigo level N3.'
  },

  // N2 Themes
  map_n2_w1: {
    theme: 'Boundary of Formality (Wilayah 1)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-purple-400 border-purple-500',
    minLevel: 35,
    description: 'Minggu 1: Ungkapan formal saat acara atau momentum penting (ni saishite, ni atatte, o keiki ni).'
  },
  map_n2_w2: {
    theme: 'Cliffs of Contrast (Wilayah 2)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-indigo-400 border-indigo-500',
    minLevel: 38,
    description: 'Minggu 2: Kontras dan dua sisi realitas (ippou de, hanmen, ni hanshite, ni kurabete).'
  },
  map_n2_w3: {
    theme: 'Labyrinth of Nuances (Wilayah 3)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-fuchsia-400 border-fuchsia-500',
    minLevel: 41,
    description: 'Minggu 3: Emosi intens dan keniscayaan (te tamaranai, te naranai, zaru wo enai).'
  },
  map_n2_w4: {
    theme: 'Corridor of Academic Logic (Wilayah 4)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-purple-300 border-purple-400',
    minLevel: 44,
    description: 'Minggu 4: Penalaran logika dan pembatasan wacana (nomi narazu, ni hoka naranai, o moto ni).'
  },
  map_n2_w5: {
    theme: 'High Citadel of N2 (Wilayah 5)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-purple-400 border-purple-500',
    minLevel: 47,
    description: 'Minggu 5: Ujian kelulusan tingkat mahir N2 dan Boss Penguji Dokkai Tingkat Tinggi.'
  },

  // N1 Themes
  map_n1_w1: {
    theme: 'Pinnacle of Classical Expressions (Wilayah 1)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-rose-400 border-rose-500',
    minLevel: 50,
    description: 'Minggu 1: Ungkapan berakar sastra klasik (gotoki, nari ni, to ie domo, majiki).'
  },
  map_n1_w2: {
    theme: 'Abyss of Instantaneous Timing (Wilayah 2)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-rose-300 border-rose-400',
    minLevel: 53,
    description: 'Minggu 2: Waktu instan dan kausalitas ekstrem (ya ina ya, soba kara, ta tokoro de).'
  },
  map_n1_w3: {
    theme: 'Palace of Philosophy (Wilayah 3)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-amber-400 border-amber-500',
    minLevel: 56,
    description: 'Minggu 3: Wacana kritis filosofis dan kondisi sosial (ni atte, o oite, ni kakete wa).'
  },
  map_n1_w4: {
    theme: 'Summit of Eloquence (Wilayah 4)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-amber-300 border-amber-400',
    minLevel: 60,
    description: 'Minggu 4: Ungkapan estetika maksimal (kagiri da, kiwamari nai, o fumaete).'
  },
  map_n1_w5: {
    theme: 'Throne of the Transcendent (Wilayah 5)',
    bannerBg: 'bg-stone-900',
    accentColor: 'text-amber-400 border-amber-500',
    minLevel: 65,
    description: 'Minggu 5: Singgasana Kaisar Bahasa Jepang — Boss Terakhir Seluruh Petualangan Nihongo Quest.'
  }
};

export const MAP_REGIONS: MapRegion[] = (mapsDb as RawMapJson[]).map(m => {
  const meta = THEMES[m.id] || {
    theme: `Region ${m.map_number}`,
    bannerBg: 'bg-stone-900',
    accentColor: 'text-amber-400 border-amber-500',
    minLevel: m.map_number * 3,
    description: `Materi pembelajaran ${m.source}.`
  };

  return {
    id: m.id,
    worldId: m.world_id || 'world_n3',
    mapNumber: m.map_number,
    name: `Wilayah ${m.map_number}: ${m.title_en}`,
    japaneseName: `第${m.map_number}章: ${m.title_jp}`,
    description: meta.description,
    theme: meta.theme,
    bannerBg: meta.bannerBg,
    accentColor: meta.accentColor,
    minLevel: meta.minLevel,
    totalStages: m.stage_ids ? m.stage_ids.length : 7
  };
});

export function getMapsForWorld(worldId: string): MapRegion[] {
  return MAP_REGIONS.filter(m => m.worldId === worldId);
}

// Build map of worldId -> stageIds[] for fast gate checking
const WORLD_STAGES_MAP: Record<string, string[]> = {};
(mapsDb as RawMapJson[]).forEach(m => {
  const wId = m.world_id || 'world_n3';
  if (!WORLD_STAGES_MAP[wId]) WORLD_STAGES_MAP[wId] = [];
  if (m.stage_ids) {
    WORLD_STAGES_MAP[wId].push(...m.stage_ids);
  }
});

// Load stages dynamically from stages.json
export function getStagesForMap(mapId: string): Stage[] {
  const matchingStages = (stagesDb as RawStageJson[]).filter(s => s.map_id === mapId);
  
  if (matchingStages.length === 0) {
    return [];
  }

  return matchingStages.map(s => {
    const isBoss = s.stage_number === matchingStages.length || s.id.includes('boss');
    
    return {
      id: s.id,
      mapId: s.map_id,
      stageNumber: s.stage_number,
      title: isBoss ? `Stage ${s.stage_number}: Boss Battle (${s.title_jp})` : `Stage ${s.stage_number}: ${s.title_jp}`,
      description: isBoss
        ? `Ujian Boss Akhir Wilayah: Uji pemahaman menyeluruh semua materi!`
        : `${s.title_en} — Pembelajaran tata bahasa, kosakata, kanji, dan kuis pemahaman.`,
      isBoss,
      bossName: isBoss ? `Guardian of Wilayah ${s.stage_number} (守護神)` : undefined,
      bossTitle: isBoss ? 'Master Overseer' : undefined,
      bossHp: isBoss ? 200 + s.stage_number * 50 : undefined,
      bossAvatar: isBoss ? '👹' : undefined,
      
      bunpouIds: s.bunpou || [],
      kotobaIds: s.kotoba || [],
      kanjiIds: s.kanji || [],
      dokkaiIds: s.dokkai || [],
      choukaiIds: s.choukai || [],

      rewardExp: isBoss ? 250 : 80 + s.stage_number * 10,
      rewardGold: isBoss ? 350 : 100 + s.stage_number * 15,
      rewardItem: isBoss ? 'Ramuan Semangat Nihongo (Master Elixir)' : undefined
    };
  });
}

// Helper to determine the World for a given Stage
function getWorldForStage(stage: Stage | string): WorldInfo | null {
  const stageId = typeof stage === 'string' ? stage : stage.id;
  const stageObj = (stagesDb as RawStageJson[]).find(s => s.id === stageId);
  if (!stageObj) return null;
  const mapObj = MAP_REGIONS.find(m => m.id === stageObj.map_id);
  if (!mapObj) return null;
  return WORLDS_LIST.find(w => w.id === mapObj.worldId) || null;
}

// Helper to get sibling stages (prev, next, and full list) in the same World
export function getSiblingStagesForStage(stage: Stage): {
  world: WorldInfo | null;
  prevStage: Stage | null;
  nextStage: Stage | null;
  allStagesInWorld: Stage[];
  currentIndex: number;
} {
  const world = getWorldForStage(stage);
  if (!world) {
    return {
      world: null,
      prevStage: null,
      nextStage: null,
      allStagesInWorld: [],
      currentIndex: -1,
    };
  }

  const maps = getMapsForWorld(world.id);
  const allStages = maps.flatMap(m => getStagesForMap(m.id));
  const idx = allStages.findIndex(s => s.id === stage.id);

  return {
    world,
    prevStage: idx > 0 ? allStages[idx - 1] : null,
    nextStage: idx >= 0 && idx < allStages.length - 1 ? allStages[idx + 1] : null,
    allStagesInWorld: allStages,
    currentIndex: idx,
  };
}

