import { UserDeck, DeckItemCategory } from '../types/rpg';
import { Stage } from '../types/content';
import {
  CurriculumConfig,
  CustomStage,
  CustomStageItem,
  CustomCurriculum,
  CustomCurriculumProgress,
  ActivityType,
} from '../types/curriculum';

const STORAGE_KEY_CURRICULUMS = 'nihongo_quest_custom_curriculums';
const STORAGE_KEY_PROGRESS = 'nihongo_quest_custom_curriculum_progress';

export interface DeckRefsSummary {
  kanjiIds: string[];
  kotobaIds: string[];
  polaIds: string[];
  totalCount: number;
  availableTypes: DeckItemCategory[];
}

/**
 * Extracts reference IDs grouped by category from a UserDeck without duplicating data.
 */
export function extractDeckRefs(deck: UserDeck): DeckRefsSummary {
  const kanjiSet = new Set<string>();
  const kotobaSet = new Set<string>();
  const polaSet = new Set<string>();

  (deck.items || []).forEach(item => {
    if (item.category === 'kanji') kanjiSet.add(item.id);
    else if (item.category === 'kotoba') kotobaSet.add(item.id);
    else if (item.category === 'bunpou') polaSet.add(item.id);
  });

  const kanjiIds = Array.from(kanjiSet);
  const kotobaIds = Array.from(kotobaSet);
  const polaIds = Array.from(polaSet);

  const availableTypes: DeckItemCategory[] = [];
  if (kanjiIds.length > 0) availableTypes.push('kanji');
  if (kotobaIds.length > 0) availableTypes.push('kotoba');
  if (polaIds.length > 0) availableTypes.push('bunpou');

  return {
    kanjiIds,
    kotobaIds,
    polaIds,
    totalCount: kanjiIds.length + kotobaIds.length + polaIds.length,
    availableTypes,
  };
}

/**
 * Helper to split an array into N approximately equal chunks
 */
function chunkArray<T>(items: T[], chunkCount: number): T[][] {
  if (chunkCount <= 0) return [items];
  if (items.length === 0) return Array.from({ length: chunkCount }, () => []);

  const count = Math.min(chunkCount, items.length);
  const chunks: T[][] = Array.from({ length: count }, () => []);

  items.forEach((item, index) => {
    chunks[index % count].push(item);
  });

  // If items < chunkCount, fill remaining chunks as empty
  while (chunks.length < chunkCount) {
    chunks.push([]);
  }

  return chunks;
}

/**
 * Validates and sanitizes CurriculumConfig against the actual contents of the deck.
 */
function validateConfigAgainstDeck(deck: UserDeck, config: CurriculumConfig): CurriculumConfig {
  const refs = extractDeckRefs(deck);
  const validIncludeTypes = config.includeTypes.filter(type => refs.availableTypes.includes(type));

  // If no valid types remain, default to whatever is available
  const finalIncludeTypes = validIncludeTypes.length > 0 ? validIncludeTypes : refs.availableTypes;

  const maxStages = Math.max(1, Math.min(config.stageCount, 10));

  return {
    ...config,
    stageCount: maxStages,
    includeTypes: finalIncludeTypes,
  };
}

/**
 * Pure function to generate a full CustomCurriculum from a UserDeck and CurriculumConfig.
 * Zero data duplication: only references are partitioned into Stages.
 */
export function generateCurriculum(deck: UserDeck, rawConfig: CurriculumConfig): CustomCurriculum {
  const config = validateConfigAgainstDeck(deck, rawConfig);
  const refs = extractDeckRefs(deck);

  const activeKanji = config.includeTypes.includes('kanji') ? refs.kanjiIds : [];
  const activeKotoba = config.includeTypes.includes('kotoba') ? refs.kotobaIds : [];
  const activePola = config.includeTypes.includes('bunpou') ? refs.polaIds : [];

  const totalActiveItems = activeKanji.length + activeKotoba.length + activePola.length;
  const targetStageCount = Math.max(1, Math.min(config.stageCount, totalActiveItems || 1));

  const kanjiChunks = chunkArray(activeKanji, targetStageCount);
  const kotobaChunks = chunkArray(activeKotoba, targetStageCount);
  const polaChunks = chunkArray(activePola, targetStageCount);

  const stages: CustomStage[] = [];

  for (let i = 0; i < targetStageCount; i++) {
    const stageItems: CustomStageItem[] = [
      ...(kanjiChunks[i] || []).map(id => ({ type: 'kanji' as const, id })),
      ...(kotobaChunks[i] || []).map(id => ({ type: 'kotoba' as const, id })),
      ...(polaChunks[i] || []).map(id => ({ type: 'bunpou' as const, id })),
    ];

    // Determine activities for this stage based on config & contents
    const activities: ActivityType[] = [];
    const hasKanji = stageItems.some(it => it.type === 'kanji');
    const hasKotoba = stageItems.some(it => it.type === 'kotoba');
    const hasBunpou = stageItems.some(it => it.type === 'bunpou');

    if (hasKanji) {
      if (config.kanjiSettings.flashcard) activities.push('kanji_flashcard');
      if (config.kanjiSettings.writeMode) activities.push('kanji_write');
      if (config.kanjiSettings.quiz) activities.push('kanji_quiz');
    }

    if (hasKotoba) {
      if (config.kotobaSettings.flashcard) activities.push('kotoba_flashcard');
      if (config.kotobaSettings.quiz) activities.push('kotoba_quiz');
    }

    if (hasBunpou) {
      if (config.polaSettings.study) activities.push('bunpou_study');
      if (config.polaSettings.quiz) activities.push('bunpou_quiz');
    }

    // Default fallback if no activities match
    if (activities.length === 0) {
      if (hasKanji) activities.push('kanji_flashcard');
      if (hasKotoba) activities.push('kotoba_flashcard');
      if (hasBunpou) activities.push('bunpou_study');
    }

    const stageNumber = i + 1;
    const summaryParts: string[] = [];
    const kCount = (kanjiChunks[i] || []).length;
    const koCount = (kotobaChunks[i] || []).length;
    const pCount = (polaChunks[i] || []).length;
    if (kCount > 0) summaryParts.push(`${kCount} Kanji`);
    if (koCount > 0) summaryParts.push(`${koCount} Kotoba`);
    if (pCount > 0) summaryParts.push(`${pCount} Tata Bahasa`);

    stages.push({
      id: `stage_${stageNumber}`,
      stageNumber,
      title: `Stage ${stageNumber}: 第${stageNumber}節：${deck.title}`,
      description: summaryParts.length > 0
        ? `Drill Stage ${stageNumber}: Pembelajaran ${summaryParts.join(', ')}, dan kuis pemahaman.`
        : `Drill Stage ${stageNumber}: Pembelajaran materi terstruktur dari ${deck.title}.`,
      items: stageItems,
      activities,
      isExam: false,
      rewardExp: 35 + stageItems.length * 10,
      rewardGold: 20 + stageItems.length * 5,
    });
  }

  // Final Mixed Exam Stage: Appended if user included multiple distinct types
  const includedTypesWithItems = [
    activeKanji.length > 0 ? 'kanji' : null,
    activeKotoba.length > 0 ? 'kotoba' : null,
    activePola.length > 0 ? 'bunpou' : null,
  ].filter(Boolean);

  if (includedTypesWithItems.length > 1) {
    const allItems: CustomStageItem[] = [
      ...activeKanji.map(id => ({ type: 'kanji' as const, id })),
      ...activeKotoba.map(id => ({ type: 'kotoba' as const, id })),
      ...activePola.map(id => ({ type: 'bunpou' as const, id })),
    ];

    const examStageNumber = stages.length + 1;
    stages.push({
      id: `stage_${examStageNumber}_exam`,
      stageNumber: examStageNumber,
      title: `Stage ${examStageNumber}: 👑 Ujian Akhir Penguasaan Buku Saku`,
      description: `Evaluasi komprehensif menguji sinergi antara Kanji, Kotoba, dan Pola Kalimat yang telah dipelajari.`,
      items: allItems,
      activities: ['mixed_exam'],
      isExam: true,
      rewardExp: 150 + allItems.length * 5,
      rewardGold: 100 + allItems.length * 3,
    });
  }

  const now = new Date().toISOString();
  return {
    id: `curriculum_${deck.id}`,
    deckId: deck.id,
    deckTitle: deck.title,
    createdAt: now,
    updatedAt: now,
    config,
    stages,
  };
}

export const DEFAULT_TEMPLATE_CURRICULUM_CONFIG: CurriculumConfig = {
  stageCount: 8,
  includeTypes: ['kanji', 'kotoba', 'bunpou'],
  kanjiSettings: {
    writeMode: true,
    canvasPerKanji: 1,
    flashcard: true,
    quiz: true,
  },
  kotobaSettings: {
    flashcard: true,
    quiz: true,
  },
  polaSettings: {
    study: true,
    quiz: true,
  },
};

export function getOrCreateCurriculumForDeck(deck: UserDeck, customConfig?: CurriculumConfig): CustomCurriculum {
  const allCurriculums = loadAllCustomCurriculums();
  if (allCurriculums[deck.id]) {
    return allCurriculums[deck.id];
  }
  const config = customConfig || DEFAULT_TEMPLATE_CURRICULUM_CONFIG;
  const generated = generateCurriculum(deck, config);
  saveCustomCurriculum(generated);
  return generated;
}

/**
 * Adapts a CustomStage into the standard Stage object expected by StageHubView.
 * Provides 100% feature and visual parity with standard RPG story stages.
 */
export function customStageToStage(customStage: CustomStage, deckTitle?: string): Stage {
  const bunpouIds = customStage.items.filter(i => i.type === 'bunpou').map(i => i.id);
  const kotobaIds = customStage.items.filter(i => i.type === 'kotoba').map(i => i.id);
  const kanjiIds = customStage.items.filter(i => i.type === 'kanji').map(i => i.id);

  return {
    id: customStage.id,
    mapId: `custom_world_${customStage.id}`,
    stageNumber: customStage.stageNumber,
    title: customStage.title,
    description: customStage.description,
    isBoss: !!customStage.isExam,
    bossName: customStage.isExam ? `Penguji Agung: ${deckTitle || 'Buku Saku'}` : undefined,
    bossTitle: customStage.isExam ? 'Ujian Evaluasi Kurikulum Kustom' : undefined,
    bossHp: customStage.isExam ? Math.max(800, customStage.items.length * 120) : undefined,
    bunpouIds,
    kotobaIds,
    kanjiIds,
    dokkaiIds: [],
    choukaiIds: [],
    rewardExp: customStage.rewardExp,
    rewardGold: customStage.rewardGold,
  };
}

/**
 * Initializes a new progress record for a newly generated curriculum.
 */
export function initializeCurriculumProgress(curriculum: CustomCurriculum): CustomCurriculumProgress {
  const stages: Record<string, { status: 'locked' | 'current' | 'completed' }> = {};

  curriculum.stages.forEach((stage, idx) => {
    stages[stage.id] = {
      status: idx === 0 ? 'current' : 'locked',
    };
  });

  return {
    curriculumId: curriculum.id,
    deckId: curriculum.deckId,
    currentStageIndex: 0,
    stages,
    lastPlayedAt: new Date().toISOString(),
    isFullyCompleted: false,
  };
}



/* ==========================================================================
   LOCAL STORAGE PERSISTENCE HELPERS
   ========================================================================== */

export function loadAllCustomCurriculums(): Record<string, CustomCurriculum> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRICULUMS);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('Failed to load custom curriculums from localStorage', err);
    return {};
  }
}

export function saveCustomCurriculum(curriculum: CustomCurriculum): void {
  try {
    const all = loadAllCustomCurriculums();
    all[curriculum.deckId] = curriculum;
    localStorage.setItem(STORAGE_KEY_CURRICULUMS, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save custom curriculum to localStorage', err);
  }
}

export function deleteCustomCurriculum(deckId: string): void {
  try {
    const all = loadAllCustomCurriculums();
    delete all[deckId];
    localStorage.setItem(STORAGE_KEY_CURRICULUMS, JSON.stringify(all));

    const allProgress = loadAllCurriculumProgress();
    delete allProgress[deckId];
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(allProgress));
  } catch (err) {
    console.error('Failed to delete custom curriculum from localStorage', err);
  }
}

export function loadAllCurriculumProgress(): Record<string, CustomCurriculumProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('Failed to load curriculum progress from localStorage', err);
    return {};
  }
}

export function loadCurriculumProgress(deckId: string): CustomCurriculumProgress | null {
  const all = loadAllCurriculumProgress();
  return all[deckId] || null;
}

export function saveCurriculumProgress(progress: CustomCurriculumProgress): void {
  try {
    const all = loadAllCurriculumProgress();
    all[progress.deckId] = progress;
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save curriculum progress to localStorage', err);
  }
}
