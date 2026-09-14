// ==============================================================================
// JAPANESE LANGUAGE INTELLIGENCE ENGINE (J-LIE) — SENTENCE BUILDER PRACTICE
// ==============================================================================

import {
  SentencePracticeExercise,
  SentenceTile,
  ValidationFeedback,
} from '../types';
import { synthesizeSentence, SynthesizeOptions, NATURAL_PAIRS } from '../synthesis/sentenceSynthesizer';
import { PATTERN_SCHEMAS } from '../syntax/patternSchemas';
import { conjugateVerb } from '../morphology/inflectionEngine';

export interface ExerciseOptions extends Partial<SynthesizeOptions> {
  patternId?: string;
  jlpt?: 'N5' | 'N4' | 'N3';
  includeDistractors?: boolean;
}

/**
 * Procedurally generates an interactive Sentence Construction Exercise (Sakubun).
 */
export function generateSentenceExercise(options: ExerciseOptions = {}): SentencePracticeExercise {
  // 1. Pick target pattern
  const availableSchemas = Object.values(PATTERN_SCHEMAS).filter(
    s => !options.jlpt || s.jlpt === options.jlpt
  );
  const schema = options.patternId
    ? PATTERN_SCHEMAS[options.patternId] || availableSchemas[0]
    : availableSchemas[Math.floor(Math.random() * availableSchemas.length)];

  // 2. Synthesize base sentence
  const synth = synthesizeSentence({
    ...options,
    patternId: schema.id,
  });

  // 3. Build valid tiles from synthesis breakdown
  const tiles: SentenceTile[] = [];
  let tileCounter = 1;

  let locTile: SentenceTile | null = null;
  let locPartTile: SentenceTile | null = null;
  let objTile: SentenceTile | null = null;
  let objPartTile: SentenceTile | null = null;
  let predTile: SentenceTile | null = null;
  let suffixTile: SentenceTile | null = null;

  synth.breakdown.forEach(item => {
    const tile: SentenceTile = {
      id: `tile_${tileCounter++}`,
      text: item.text,
      reading: item.reading,
      role: item.isParticle ? 'particle' : (item.role as any),
      isDistractor: false,
    };

    if (item.role === 'location') locTile = tile;
    else if (item.role === 'location_particle') locPartTile = tile;
    else if (item.role === 'object') objTile = tile;
    else if (item.role === 'object_particle') objPartTile = tile;
    else if (item.role === 'predicate') predTile = tile;
    else if (item.role === 'grammar_suffix') suffixTile = tile;

    tiles.push(tile);
  });

  // 4. Create educational distractors if requested (default true)
  if (options.includeDistractors !== false) {
    // Distractor 1: Wrong verb conjugation (e.g. dictionary form instead of te-form)
    if (predTile) {
      const verbEntry = NATURAL_PAIRS.find(p => synth.japanese.includes(p.verb.word))?.verb;
      if (verbEntry) {
        const conj = conjugateVerb(verbEntry.word, verbEntry.reading);
        // If required is 'te', distractor can be 'jisho' or 'nai'
        const wrongForm = schema.requiredConjugation === 'te' ? conj.forms.jisho : conj.forms.te;
        tiles.push({
          id: `distractor_verb_${tileCounter++}`,
          text: wrongForm.japanese,
          reading: wrongForm.reading,
          role: 'distractor',
          isDistractor: true,
        });
      }
    }

    // Distractor 2: Confusing particle (e.g. 'に' instead of 'で')
    if (locPartTile) {
      tiles.push({
        id: `distractor_part_${tileCounter++}`,
        text: 'に',
        reading: 'に',
        role: 'distractor',
        isDistractor: true,
      });
    } else if (objPartTile) {
      tiles.push({
        id: `distractor_part_${tileCounter++}`,
        text: 'に',
        reading: 'に',
        role: 'distractor',
        isDistractor: true,
      });
    }
  }

  // 5. Generate all linguistically valid sequences
  // In Japanese, modifier phrases (Location + Particle and Object + Particle) can interchange:
  // Option A: [Location] [で] [Object] [を] [Predicate] [Suffix]
  // Option B: [Object] [を] [Location] [で] [Predicate] [Suffix]
  const validSequences: string[][] = [];

  const optionA: string[] = [];
  if (locTile && locPartTile) optionA.push(locTile.id, locPartTile.id);
  if (objTile && objPartTile) optionA.push(objTile.id, objPartTile.id);
  if (predTile) optionA.push(predTile.id);
  if (suffixTile) optionA.push(suffixTile.id);
  validSequences.push(optionA);

  if (locTile && locPartTile && objTile && objPartTile) {
    const optionB: string[] = [];
    optionB.push(objTile.id, objPartTile.id);
    optionB.push(locTile.id, locPartTile.id);
    if (predTile) optionB.push(predTile.id);
    if (suffixTile) optionB.push(suffixTile.id);
    validSequences.push(optionB);
  }

  // 6. Shuffle available tiles for practice
  const shuffledTiles = [...tiles].sort(() => Math.random() - 0.5);

  return {
    id: `exercise_${schema.id}_${Date.now()}`,
    patternId: schema.id,
    patternTitle: schema.title,
    promptMeaningId: synth.meaningId,
    promptMeaningEn: synth.meaningEn,
    targetSentenceJp: synth.japanese,
    targetSentenceReading: synth.reading,
    availableTiles: shuffledTiles,
    validSequences,
    hint: `Pola tata bahasa ini adalah 「${schema.pattern}」. Perhatikan bentuk kata kerja yang dibutuhkan dan letak partikelnya.`,
    grammarExplanation: schema.nuanceExplanation,
  };
}

/**
 * Validates the user's submitted tiles against the exercise rules.
 */
export function validateSentenceSubmission(
  exercise: SentencePracticeExercise,
  submittedTileIds: string[]
): ValidationFeedback {
  const schema = PATTERN_SCHEMAS[exercise.patternId];
  const tileMap = new Map<string, SentenceTile>(exercise.availableTiles.map(t => [t.id, t]));

  const submittedTiles = submittedTileIds.map(id => tileMap.get(id)).filter(Boolean) as SentenceTile[];
  const submittedSentence = submittedTiles.map(t => t.text).join('');

  // Check 1: Did the user include any distractor tiles?
  const distractorUsed = submittedTiles.find(t => t.isDistractor);
  if (distractorUsed) {
    if (distractorUsed.text === 'に') {
      return {
        isCorrect: false,
        score: 40,
        submittedSentence,
        targetSentence: exercise.targetSentenceJp,
        errorType: 'wrong_particle',
        detailedFeedback: `Kamu menggunakan partikel '${distractorUsed.text}' yang kurang tepat.`,
        pedagogicalAdvice: `Untuk tempat terjadinya aktivitas fisik, bahasa Jepang menggunakan partikel lokasi aksi 「で」, bukan 「に」.`,
      };
    }

    return {
      isCorrect: false,
      score: 40,
      submittedSentence,
      targetSentence: exercise.targetSentenceJp,
      errorType: 'wrong_conjugation',
      detailedFeedback: `Bentuk kata kerja '${distractorUsed.text}' tidak cocok dengan pola 「${schema ? schema.pattern : ''}」.`,
      pedagogicalAdvice: `Pola ini mewajibkan kata kerja diubah ke bentuk yang ditentukan (misal: Bentuk-Te untuk 〜てはいけない).`,
    };
  }

  // Check 2: Match against valid sequence permutations
  const isSequenceValid = exercise.validSequences.some(seq => {
    if (seq.length !== submittedTileIds.length) return false;
    return seq.every((id, idx) => id === submittedTileIds[idx]);
  });

  if (isSequenceValid) {
    return {
      isCorrect: true,
      score: 100,
      submittedSentence,
      targetSentence: exercise.targetSentenceJp,
      detailedFeedback: 'Susunan kalimat 100% benar dan alami!',
      pedagogicalAdvice: 'Hebat! Kamu telah menguasai relasi partikel, konjugasi kata kerja, dan penempatan pola tata bahasa ini.',
    };
  }

  // Check 3: Predicate position check (must be at the end before suffix)
  const lastTile = submittedTiles[submittedTiles.length - 1];
  const hasSuffix = lastTile && lastTile.role === 'grammar_suffix';
  if (!hasSuffix) {
    return {
      isCorrect: false,
      score: 50,
      submittedSentence,
      targetSentence: exercise.targetSentenceJp,
      errorType: 'wrong_order',
      detailedFeedback: 'Urutan kalimat belum tepat.',
      pedagogicalAdvice: 'Dalam tata bahasa Jepang (SOV), kata kerja dan pola akhiran tata bahasa selalu diletakkan di posisi paling akhir kalimat.',
    };
  }

  // Fallback order error
  return {
    isCorrect: false,
    score: 60,
    submittedSentence,
    targetSentence: exercise.targetSentenceJp,
    errorType: 'wrong_order',
    detailedFeedback: 'Partikel atau kata benda tertukar posisinya.',
    pedagogicalAdvice: 'Pastikan setiap partikel diletakkan tepat setelah kata benda yang diterangkannya (contoh: [Kata Benda] + [Partikel]).',
  };
}
