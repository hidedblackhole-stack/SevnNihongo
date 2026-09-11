import { KanjiItem, KotobaItem, BunpouItem } from '../types/content';

/**
 * Base EXP constants based on JLPT tier difficulty.
 */
export const KANJI_LEVEL_BASE_EXP: Record<string, number> = {
  KANA: 10,
  SUUJI: 10,
  N5: 15,
  N4: 25,
  N3: 35,
  N2: 50,
  N1: 70,
};

export const KOTOBA_LEVEL_BASE_EXP: Record<string, number> = {
  N5: 12,
  N4: 18,
  N3: 28,
  N2: 40,
  N1: 55,
};

export const BUNPOU_LEVEL_BASE_EXP: Record<string, number> = {
  N5: 20,
  N4: 30,
  N3: 45,
  N2: 65,
  N1: 90,
};

export const QUIZ_LEVEL_BASE_EXP: Record<string, number> = {
  N5: 15,
  N4: 20,
  N3: 25,
  N2: 35,
  N1: 50,
};

/**
 * Calculates the intrinsic Base EXP of a Kanji/Kana/Suuji character.
 * Formula: Level Weight + (strokeCount * 2)
 */
export function getKanjiBaseExp(kanji: {
  character: string;
  strokeCount?: number;
  jlpt?: string;
  radical?: string;
}): number {
  const char = kanji.character || '';
  const isKana = char.length > 0 && char.charCodeAt(0) >= 0x3040 && char.charCodeAt(0) <= 0x30ff;
  const isSuuji = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', '零'].includes(char);

  let levelKey = kanji.jlpt?.toUpperCase() || 'N3';
  if (isKana || kanji.radical === 'Hiragana' || kanji.radical === 'Katakana') {
    levelKey = 'KANA';
  } else if (isSuuji) {
    levelKey = 'SUUJI';
  }

  const levelBase = KANJI_LEVEL_BASE_EXP[levelKey] || KANJI_LEVEL_BASE_EXP.N3;
  const strokes = kanji.strokeCount || (isKana ? 3 : 8);

  return levelBase + (strokes * 2);
}

/**
 * Calculates the intrinsic Base EXP of a vocabulary word (Kotoba).
 * Formula: Level Weight + (word.length * 2) + (kanjiComponents.length * 5)
 */
export function getKotobaBaseExp(kotoba: {
  word: string;
  jlpt?: string;
  kanjiComponents?: string[];
}): number {
  const levelKey = kotoba.jlpt?.toUpperCase() || 'N5';
  const levelBase = KOTOBA_LEVEL_BASE_EXP[levelKey] || KOTOBA_LEVEL_BASE_EXP.N5;

  const wordLength = Array.from(kotoba.word || '').length;
  const kanjiCount = kotoba.kanjiComponents?.length || 0;

  return levelBase + (wordLength * 2) + (kanjiCount * 5);
}

/**
 * Calculates the intrinsic Base EXP of a grammar point (Bunpou).
 * Formula: Level Weight + (subFormulas.length * 5)
 */
export function getBunpouBaseExp(bunpou: {
  level?: string;
  subFormulas?: any[];
}): number {
  const levelKey = bunpou.level?.toUpperCase() || 'N3';
  const levelBase = BUNPOU_LEVEL_BASE_EXP[levelKey] || BUNPOU_LEVEL_BASE_EXP.N3;
  const subCount = bunpou.subFormulas?.length || 0;

  return levelBase + (subCount * 5);
}

/**
 * Performance-based writing reward calculation.
 * Factors in:
 * - Base EXP of the character/word
 * - Watermark usage (Blind recall bonus: +0.35x)
 * - Animation usage (No animation bonus: +0.25x, excessive animation penalty: -0.1x per hint > 1)
 * - Accuracy (0 mistakes: +0.25x, excessive mistakes penalty)
 * - Pacing / Stopwatch (within reasonable focused writing window: +0.1x)
 */
export interface WritingPerformanceOptions {
  baseExp: number;
  mistakesCount: number;
  watermarkUsed: boolean;
  animationCount: number;
  elapsedSeconds: number;
  strokeCount?: number;
}

export interface WritingRewardResult {
  expGained: number;
  goldGained: number;
  multiplier: number;
  breakdown: {
    baseExp: number;
    blindRecallBonus: boolean;
    noAnimationBonus: boolean;
    perfectStrokesBonus: boolean;
    focusTimeBonus: boolean;
    mistakesPenalty: number;
    animationPenalty: number;
  };
}

export function calculateWritingReward(options: WritingPerformanceOptions): WritingRewardResult {
  const {
    baseExp,
    mistakesCount,
    watermarkUsed,
    animationCount,
    elapsedSeconds,
    strokeCount = 6,
  } = options;

  let multiplier = 1.2; // Base Writing Multiplier

  // 1. Watermark Guide Bonus
  const blindRecallBonus = !watermarkUsed;
  if (blindRecallBonus) {
    multiplier += 0.35; // +35% for pure memory writing without tracing
  }

  // 2. Animation Hint Bonus / Penalty
  const noAnimationBonus = animationCount === 0;
  let animationPenalty = 0;
  if (noAnimationBonus) {
    multiplier += 0.25; // +25% for knowing stroke order without checking animation
  } else if (animationCount > 1) {
    animationPenalty = Math.min(0.2, (animationCount - 1) * 0.08);
    multiplier -= animationPenalty;
  }

  // 3. Accuracy & Mistakes
  const perfectStrokesBonus = mistakesCount === 0;
  let mistakesPenalty = 0;
  if (perfectStrokesBonus) {
    multiplier += 0.25; // +25% for flawless stroke execution
  } else if (mistakesCount >= 3) {
    mistakesPenalty = Math.min(0.3, (mistakesCount - 2) * 0.05);
    multiplier -= mistakesPenalty;
  }

  // 4. Time / Stopwatch focus bonus
  // Expected reasonable time: 3s + (strokeCount * 2)s up to 60s
  const minSensibleTime = 2; // Below this is impossible / spam scribbling
  const maxSensibleTime = Math.max(25, strokeCount * 6);
  const focusTimeBonus = elapsedSeconds >= minSensibleTime && elapsedSeconds <= maxSensibleTime;
  if (focusTimeBonus) {
    multiplier += 0.10;
  }

  // Clamp multiplier to a reasonable range [0.6x to 2.25x]
  const finalMultiplier = Math.max(0.6, Math.min(2.25, multiplier));
  const expGained = Math.max(5, Math.round(baseExp * finalMultiplier));
  const goldGained = Math.max(3, Math.round(expGained * 0.5));

  return {
    expGained,
    goldGained,
    multiplier: Number(finalMultiplier.toFixed(2)),
    breakdown: {
      baseExp,
      blindRecallBonus,
      noAnimationBonus,
      perfectStrokesBonus,
      focusTimeBonus,
      mistakesPenalty: Number(mistakesPenalty.toFixed(2)),
      animationPenalty: Number(animationPenalty.toFixed(2)),
    },
  };
}

/**
 * Flashcard event reward calculation.
 * Formula: Base EXP * 0.35 * (isMastered ? 1.0 : 0.5)
 */
export function calculateFlashcardReward(baseExp: number, isMastered: boolean): {
  expGained: number;
  goldGained: number;
} {
  const flashcardBaseMultiplier = 0.35;
  const masteryMultiplier = isMastered ? 1.0 : 0.5;

  const expGained = Math.max(3, Math.round(baseExp * flashcardBaseMultiplier * masteryMultiplier));
  const goldGained = Math.max(2, Math.round(expGained * 0.4));

  return { expGained, goldGained };
}

/**
 * Quiz & Question Bank reward calculation based on JLPT level and accuracy.
 */
export function calculateQuizReward(options: {
  level?: string;
  totalQuestions: number;
  correctCount: number;
}): {
  expGained: number;
  goldGained: number;
  accuracyPercentage: number;
  accuracyBonusMultiplier: number;
} {
  const { level = 'N5', totalQuestions, correctCount } = options;
  const basePerQuestion = QUIZ_LEVEL_BASE_EXP[level.toUpperCase()] || QUIZ_LEVEL_BASE_EXP.N5;

  const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;
  const accuracyPercentage = Math.round(accuracy * 100);

  let accuracyBonusMultiplier = 1.0;
  if (accuracy === 1.0) {
    accuracyBonusMultiplier = 1.3; // +30% Perfect Score
  } else if (accuracy >= 0.8) {
    accuracyBonusMultiplier = 1.1; // +10% High Mastery
  } else if (accuracy < 0.6) {
    accuracyBonusMultiplier = 0.8;
  }

  const baseTotal = correctCount * basePerQuestion;
  const expGained = Math.max(10, Math.round(baseTotal * accuracyBonusMultiplier));
  const goldGained = Math.max(5, Math.round(expGained * 0.5));

  return {
    expGained,
    goldGained,
    accuracyPercentage,
    accuracyBonusMultiplier,
  };
}
