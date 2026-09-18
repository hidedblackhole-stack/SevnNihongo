import { KOTOBA_DATABASE } from '../data/kotoba';
import { KANJI_DATABASE } from '../data/kanji';
import { BUNPOU_DATABASE } from '../data/bunpou';
import { ResolvedDeckItem, resolveDeckItem } from './decks';
import { DeckItemRef, UserDeck } from '../types/rpg';
import { generateSentenceExercise, SentencePracticeExercise, PATTERN_SCHEMAS } from '../engine';
import { generateConjugationQuestion, ConjugationDrillQuestion, VERB_CONJUGATION_DATABASE } from '../data/conjugationRules';
import { Question } from '../types/content';
import kanjiQuestionsDb from '../data/db/kanji_questions.json';
import bunpouQuestionsDb from '../data/db/bunpou_questions.json';
import kanjiExtremeStagesDb from '../data/db/kanji_extreme_100_stages.json';

export type DungeonType = 'writing' | 'flashcard' | 'sakubun' | 'conjugation' | 'quiz' | 'extreme';
export type DungeonLevelCategory = 'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'Kaigo' | 'PM' | 'SSW';

export interface DungeonConfig {
  type: DungeonType;
  levelCategory: DungeonLevelCategory;
  floorCount: number; // e.g. 5, 10, 15, 20, 30
  mode: 'standard' | 'survival';
  deckId?: string;
  deckTitle?: string;
  sourceType?: 'preset' | 'deck';
  stageNumber?: number; // 1 to 100 for extreme kanji
}

export interface DungeonPayload {
  config: DungeonConfig;
  writingItems?: ResolvedDeckItem[];
  flashcardItems?: ResolvedDeckItem[];
  sakubunExercises?: SentencePracticeExercise[];
  conjugationQuestions?: ConjugationDrillQuestion[];
  quizQuestions?: Question[];
}

export interface DeckDungeonCompatibility {
  isCompatible: boolean;
  reason?: string;
  matchedCount: number;
}

/**
 * Validates whether a custom user deck contains suitable materials for a specific dungeon type.
 */
export function isDeckCompatibleWithDungeon(
  deck: UserDeck,
  dungeonType: DungeonType
): DeckDungeonCompatibility {
  const items = deck.items || [];
  if (items.length === 0) {
    return {
      isCompatible: false,
      reason: 'Deck masih kosong (0 materi)',
      matchedCount: 0,
    };
  }

  if (dungeonType === 'writing') {
    const writableItems = items.filter(it => it.category === 'kanji' || it.category === 'kotoba');
    if (writableItems.length === 0) {
      return {
        isCompatible: false,
        reason: 'Memerlukan materi aksara (Kanji atau Kosakata)',
        matchedCount: 0,
      };
    }
    return {
      isCompatible: true,
      matchedCount: writableItems.length,
    };
  }

  if (dungeonType === 'flashcard') {
    return {
      isCompatible: true,
      matchedCount: items.length,
    };
  }

  if (dungeonType === 'sakubun') {
    const bunpouItems = items.filter(it => it.category === 'bunpou');
    if (bunpouItems.length === 0) {
      return {
        isCompatible: false,
        reason: 'Memerlukan materi pola tata bahasa (Bunpou)',
        matchedCount: 0,
      };
    }
    return {
      isCompatible: true,
      matchedCount: bunpouItems.length,
    };
  }

  if (dungeonType === 'conjugation') {
    const kotobaItems = items.filter(it => it.category === 'kotoba');
    if (kotobaItems.length === 0) {
      return {
        isCompatible: false,
        reason: 'Memerlukan materi kosakata (Kotoba)',
        matchedCount: 0,
      };
    }
    return {
      isCompatible: true,
      matchedCount: kotobaItems.length,
    };
  }

  if (dungeonType === 'quiz') {
    return {
      isCompatible: true,
      matchedCount: items.length,
    };
  }

  return { isCompatible: true, matchedCount: items.length };
}

const PM_KEYWORDS = ['medis', 'dokter', 'perawat', 'darurat', 'rumah sakit', 'kesehatan', 'obat', 'penyakit', 'darah', 'luka', 'pasien', 'klinik', 'ambulans'];

function isPmKotoba(item: any): boolean {
  if (!item) return false;
  const unit = (item.unitName || '').toLowerCase();
  const meaning = (item.meaningId || '').toLowerCase();
  const romaji = (item.romaji || '').toLowerCase();
  return PM_KEYWORDS.some(kw => unit.includes(kw) || meaning.includes(kw) || romaji.includes(kw));
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  return copy.sort(() => 0.5 - Math.random());
}

export function generateDungeonSession(config: DungeonConfig, userDecks?: UserDeck[]): DungeonPayload {
  const { type, levelCategory, floorCount, deckId } = config;
  const count = floorCount;

  // Selected Custom Deck if provided
  const selectedDeck = deckId && userDecks ? userDecks.find(d => d.id === deckId) : undefined;

  // 1. Filter Kotoba (Presets)
  const allKotoba = Object.values(KOTOBA_DATABASE);
  const matchingKotoba = allKotoba.filter(item => {
    if (!item) return false;
    if (levelCategory === 'all') return true;
    if (levelCategory === 'Kaigo') {
      return Boolean(item.tags?.includes('Kaigo') || (item.unitName && item.unitName.includes('Kaigo')));
    }
    if (levelCategory === 'SSW') {
      return Boolean(item.tags?.includes('SSW') || item.jlpt === 'SSW');
    }
    if (levelCategory === 'PM') {
      return isPmKotoba(item);
    }
    return item.jlpt === levelCategory;
  });

  // 2. Filter Kanji (Presets)
  const allKanji = Object.values(KANJI_DATABASE);
  const seenKanji = new Set<string>();
  const matchingKanji = allKanji.filter(item => {
    if (!item || !item.character || seenKanji.has(item.character)) return false;
    seenKanji.add(item.character);
    if (levelCategory === 'all') return true;
    if (levelCategory === 'Kaigo' || levelCategory === 'PM' || levelCategory === 'SSW') {
      return matchingKotoba.some(k => k.kanjiComponents?.includes(item.character));
    }
    return item.jlpt === levelCategory;
  });

  // 3. Filter Bunpou (Presets)
  const allBunpou = Object.values(BUNPOU_DATABASE);
  const matchingBunpou = allBunpou.filter(item => {
    if (!item) return false;
    if (levelCategory === 'all') return true;
    if (levelCategory === 'Kaigo' || levelCategory === 'PM') {
      return item.level === 'N5' || item.level === 'N4' || item.level === 'N3';
    }
    return item.level === levelCategory;
  });

  // Prepare payload
  const payload: DungeonPayload = { config };

  // ==================== A. WRITING DUNGEON ====================
  if (type === 'writing') {
    if (selectedDeck) {
      const rawRefs = selectedDeck.items.filter(it => it.category === 'kanji' || it.category === 'kotoba');
      let resolved = rawRefs
        .map(ref => resolveDeckItem(ref))
        .filter((it): it is ResolvedDeckItem => it !== null);

      if (resolved.length > 0) {
        resolved = shuffleArray(resolved);
        const picked: ResolvedDeckItem[] = [];
        for (let i = 0; i < count; i++) {
          picked.push(resolved[i % resolved.length]);
        }
        payload.writingItems = picked;
        return payload;
      }
    }

    // Default Preset Generation
    const poolKanji = matchingKanji.length > 0 ? matchingKanji : allKanji;
    const poolKotoba = matchingKotoba.length > 0 ? matchingKotoba : allKotoba;

    const kanjiCount = Math.ceil(count * 0.5);
    const kotobaCount = count - kanjiCount;

    const kanjiRefs: DeckItemRef[] = shuffleArray(poolKanji).slice(0, kanjiCount).map(k => ({
      id: k.id || k.character,
      category: 'kanji',
      addedAt: new Date().toISOString()
    }));

    const kotobaRefs: DeckItemRef[] = shuffleArray(poolKotoba).slice(0, kotobaCount).map(k => ({
      id: k.id,
      category: 'kotoba',
      addedAt: new Date().toISOString()
    }));

    const combinedRefs = shuffleArray([...kanjiRefs, ...kotobaRefs]);
    let resolved = combinedRefs.map(ref => resolveDeckItem(ref)).filter((it): it is ResolvedDeckItem => it !== null);
    
    // Fallback padding if resolved is less than requested count
    if (resolved.length < count) {
      const fallbackKanji = shuffleArray(allKanji).map(k => resolveDeckItem({
        id: k.id || k.character,
        category: 'kanji',
        addedAt: new Date().toISOString()
      })).filter((it): it is ResolvedDeckItem => it !== null);
      resolved.push(...fallbackKanji);
    }

    if (resolved.length < count) {
      const fallbackKotoba = shuffleArray(allKotoba).map(k => resolveDeckItem({
        id: k.id,
        category: 'kotoba',
        addedAt: new Date().toISOString()
      })).filter((it): it is ResolvedDeckItem => it !== null);
      resolved.push(...fallbackKotoba);
    }

    payload.writingItems = resolved.slice(0, count);
  }

  // ==================== B. FLASHCARD DUNGEON ====================
  else if (type === 'flashcard') {
    if (selectedDeck) {
      let resolved = selectedDeck.items
        .map(ref => resolveDeckItem(ref))
        .filter((it): it is ResolvedDeckItem => it !== null);

      if (resolved.length > 0) {
        resolved = shuffleArray(resolved);
        const picked: ResolvedDeckItem[] = [];
        for (let i = 0; i < count; i++) {
          picked.push(resolved[i % resolved.length]);
        }
        payload.flashcardItems = picked;
        return payload;
      }
    }

    // Default Preset Generation
    const poolKotoba = matchingKotoba.length > 0 ? matchingKotoba : allKotoba;
    const poolKanji = matchingKanji.length > 0 ? matchingKanji : allKanji;
    const poolBunpou = matchingBunpou.length > 0 ? matchingBunpou : allBunpou;

    const kotobaRefs: DeckItemRef[] = shuffleArray(poolKotoba).slice(0, Math.ceil(count * 0.6)).map(k => ({
      id: k.id,
      category: 'kotoba',
      addedAt: new Date().toISOString()
    }));

    const kanjiRefs: DeckItemRef[] = shuffleArray(poolKanji).slice(0, Math.ceil(count * 0.25)).map(k => ({
      id: k.id || k.character,
      category: 'kanji',
      addedAt: new Date().toISOString()
    }));

    const bunpouRefs: DeckItemRef[] = shuffleArray(poolBunpou).slice(0, count - (kotobaRefs.length + kanjiRefs.length)).map(b => ({
      id: b.id,
      category: 'bunpou',
      addedAt: new Date().toISOString()
    }));

    const combined = shuffleArray([...kotobaRefs, ...kanjiRefs, ...bunpouRefs]);
    let resolved = combined.map(ref => resolveDeckItem(ref)).filter((it): it is ResolvedDeckItem => it !== null);

    if (resolved.length < count) {
      const moreKotoba = shuffleArray(allKotoba).map(k => resolveDeckItem({
        id: k.id,
        category: 'kotoba',
        addedAt: new Date().toISOString()
      })).filter((it): it is ResolvedDeckItem => it !== null);
      resolved.push(...moreKotoba);
    }

    payload.flashcardItems = resolved.slice(0, count);
  }

  // ==================== C. SAKUBUN (SENTENCE BUILDER) DUNGEON ====================
  else if (type === 'sakubun') {
    const allSchemas = Object.values(PATTERN_SCHEMAS);
    let targetSchemas = allSchemas;

    if (selectedDeck) {
      const bunpouRefs = selectedDeck.items.filter(it => it.category === 'bunpou');
      const bunpouIds = new Set(bunpouRefs.map(b => b.id.toLowerCase()));
      const bunpouTitles = new Set(bunpouRefs.map(b => BUNPOU_DATABASE[b.id]?.title?.toLowerCase()).filter(Boolean));

      // Try matching by pattern id or title
      const matched = allSchemas.filter(s =>
        bunpouIds.has(s.id.toLowerCase()) ||
        Array.from(bunpouTitles).some(t => t && (t.includes(s.pattern) || s.pattern.includes(t)))
      );

      if (matched.length > 0) {
        targetSchemas = matched;
      } else {
        // Fallback: match by JLPT level of bunpou items in deck
        const levels = new Set(bunpouRefs.map(b => BUNPOU_DATABASE[b.id]?.level).filter(Boolean));
        const byLevel = allSchemas.filter(s => levels.has(s.jlpt));
        if (byLevel.length > 0) {
          targetSchemas = byLevel;
        }
      }
    } else {
      if (levelCategory === 'N5') {
        targetSchemas = allSchemas.filter(s => s.jlpt === 'N5');
      } else if (levelCategory === 'N4') {
        targetSchemas = allSchemas.filter(s => s.jlpt === 'N4');
      } else if (levelCategory === 'N3') {
        targetSchemas = allSchemas.filter(s => s.jlpt === 'N3');
      } else if (levelCategory === 'Kaigo' || levelCategory === 'PM') {
        targetSchemas = allSchemas.filter(s => s.jlpt === 'N5' || s.jlpt === 'N4');
      }
    }

    if (targetSchemas.length === 0) {
      targetSchemas = allSchemas;
    }

    const exercises: SentencePracticeExercise[] = [];
    const shuffledSchemas = shuffleArray(targetSchemas);

    for (let i = 0; i < count; i++) {
      const schema = shuffledSchemas[i % shuffledSchemas.length];
      try {
        const ex = generateSentenceExercise({
          patternId: schema.id,
          includeDistractors: true,
        });
        if (ex) {
          exercises.push(ex);
        }
      } catch (err) {
        console.warn('Failed to generate sentence exercise for schema', schema.id, err);
      }
    }

    if (exercises.length < count && exercises.length > 0) {
      while (exercises.length < count) {
        exercises.push({ ...exercises[exercises.length % exercises.length] });
      }
    }

    payload.sakubunExercises = exercises.slice(0, count);
  }

  // ==================== D. CONJUGATION DOJO DUNGEON ====================
  else if (type === 'conjugation') {
    const questions: ConjugationDrillQuestion[] = [];
    const forms = ['te', 'nai', 'ta', 'masu', 'potential', 'passive', 'causative', 'ba', 'volitional'];
    
    let allowedForms = forms;
    let allowedVerbs = VERB_CONJUGATION_DATABASE;

    if (selectedDeck) {
      const kotobaRefs = selectedDeck.items.filter(it => it.category === 'kotoba');
      const kotobaWords = new Set(kotobaRefs.map(k => KOTOBA_DATABASE[k.id]?.word).filter(Boolean));
      const matched = VERB_CONJUGATION_DATABASE.filter(v => kotobaWords.has(v.kanji) || kotobaWords.has(v.reading));
      if (matched.length > 0) {
        allowedVerbs = matched;
      }
    } else {
      if (levelCategory === 'N5') {
        allowedForms = ['te', 'nai', 'ta', 'masu'];
      } else if (levelCategory === 'N4') {
        allowedForms = ['te', 'nai', 'ta', 'masu', 'potential', 'volitional'];
      }
    }

    for (let i = 0; i < count; i++) {
      const randomForm = allowedForms[Math.floor(Math.random() * allowedForms.length)];
      const randomVerb = allowedVerbs[Math.floor(Math.random() * allowedVerbs.length)];
      try {
        const q = generateConjugationQuestion(randomForm, randomVerb);
        if (q) {
          questions.push(q);
        }
      } catch (err) {
        console.warn('Failed to generate conjugation question', err);
      }
    }

    payload.conjugationQuestions = questions.slice(0, count);
  }

  // ==================== E. RAPID QUIZ BATTLE DUNGEON ====================
  else if (type === 'quiz') {
    if (selectedDeck) {
      const questions: Question[] = [];

      // 1. Bunpou Questions from deck
      const bunpouRefs = selectedDeck.items.filter(it => it.category === 'bunpou');
      bunpouRefs.forEach(bRef => {
        const item = BUNPOU_DATABASE[bRef.id];
        if (item?.questions?.length) {
          questions.push(...item.questions);
        }
      });

      // 2. Kanji Questions from deck
      const kanjiRefs = selectedDeck.items.filter(it => it.category === 'kanji');
      kanjiRefs.forEach(kRef => {
        const item = KANJI_DATABASE[kRef.id];
        if (item?.questions?.length) {
          questions.push(...item.questions);
        } else if (item) {
          const onyomiStr = (item.onyomi || []).join(', ');
          const meaningStr = item.meaningId || item.meaningEn || 'Arti kanji';
          const targetOpt = `${meaningStr} (${onyomiStr || item.character})`;
          const rawOptions = [
            targetOpt,
            'Air dan sungai (Mizu)',
            'Gunung tinggi (Yama)',
            'Langit biru (Sora)',
          ];
          const options = shuffleArray(rawOptions);
          questions.push({
            id: `q_k_${item.id}_synth_${Math.random().toString(36).slice(2, 6)}`,
            instruction: 'Pilihlah arti dan cara baca yang tepat:',
            prompt: `Apa arti dan cara baca dari Kanji "${item.character}"?`,
            options,
            correctIndex: options.indexOf(targetOpt),
            explanation: `Kanji ${item.character} memiliki arti "${meaningStr}" dengan On'yomi: ${onyomiStr || '-'}.`,
            category: 'kanji',
            difficulty: item.jlpt || 'N5',
          });
        }
      });

      // 3. Kotoba Questions from deck
      const kotobaRefs = selectedDeck.items.filter(it => it.category === 'kotoba');
      const allKotobaList = Object.values(KOTOBA_DATABASE);
      kotobaRefs.forEach(koRef => {
        const item = KOTOBA_DATABASE[koRef.id];
        if (!item) return;

        const distractors = allKotobaList
          .filter(k => k.id !== item.id && k.meaningId && k.meaningId !== item.meaningId)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map(k => k.meaningId);

        while (distractors.length < 3) {
          distractors.push(`Arti kosakata alternatif ${distractors.length + 1}`);
        }

        const options = shuffleArray([item.meaningId, ...distractors]);
        questions.push({
          id: `q_ko_${item.id}_synth_${Math.random().toString(36).slice(2, 6)}`,
          instruction: 'Pilihlah arti kosakata yang tepat:',
          prompt: `Apa arti dari kosakata "${item.word}" (${item.reading})?`,
          options,
          correctIndex: options.indexOf(item.meaningId),
          explanation: `Kosakata "${item.word}" (${item.reading}) memiliki arti "${item.meaningId}".`,
          category: 'kotoba',
          difficulty: item.jlpt || 'N5',
        });
      });

      if (questions.length > 0) {
        const shuffled = shuffleArray(questions);
        const picked: Question[] = [];
        for (let i = 0; i < count; i++) {
          picked.push(shuffled[i % shuffled.length]);
        }
        payload.quizQuestions = picked;
        return payload;
      }
    }

    // Default Preset Generation
    const rawKanjiQs = (kanjiQuestionsDb as any[]) || [];
    const rawBunpouQs = (bunpouQuestionsDb as any[]) || [];

    const formatRaw = (raw: any, categoryName: string): Question => {
      let lvl = 'N5';
      if (raw.difficulty_level === 4 || raw.level === 'N4') lvl = 'N4';
      if (raw.difficulty_level === 3 || raw.level === 'N3') lvl = 'N3';
      if (raw.difficulty_level === 2 || raw.level === 'N2') lvl = 'N2';
      if (raw.difficulty_level === 1 || raw.level === 'N1') lvl = 'N1';

      let correctIdx = 0;
      if (typeof raw.correct_index === 'number') {
        correctIdx = raw.correct_index;
      } else if (typeof raw.correct_answer === 'number') {
        correctIdx = raw.correct_answer;
      }

      return {
        id: raw.id || `quiz_${Math.random().toString(36).slice(2, 8)}`,
        instruction: raw.prompt || 'Pilihlah jawaban yang paling tepat:',
        instructionId: raw.explanation || undefined,
        prompt: raw.prompt,
        options: raw.options || [],
        correctIndex: correctIdx,
        explanation: raw.explanation || `Kunci jawaban yang tepat adalah opsi ke-${correctIdx + 1}.`,
        category: categoryName,
        difficulty: lvl,
      };
    };

    const formattedKanji = rawKanjiQs.map(q => formatRaw(q, 'kanji'));
    const formattedBunpou = rawBunpouQs.map(q => formatRaw(q, 'bunpou'));

    const filterQs = (qs: any[]) => {
      return qs.filter(q => {
        if (levelCategory === 'all' || levelCategory === 'Kaigo' || levelCategory === 'PM') return true;
        return q.difficulty === levelCategory;
      });
    };

    const matchingPool = filterQs([...formattedKanji, ...formattedBunpou]);
    let picked = shuffleArray(matchingPool.length > 0 ? matchingPool : [...formattedKanji, ...formattedBunpou]);
    
    if (picked.length < count) {
      picked.push(...shuffleArray([...formattedKanji, ...formattedBunpou]));
    }

    payload.quizQuestions = picked.slice(0, count);
  }

  // ==================== F. KANJI EXTREME DUNGEON ====================
  else if (type === 'extreme') {
    const stages = (kanjiExtremeStagesDb as any[]) || [];
    let poolQuestions: Question[] = [];

    if (config.stageNumber && config.stageNumber >= 1 && config.stageNumber <= stages.length) {
      const targetStage = stages[config.stageNumber - 1];
      if (targetStage && targetStage.questions) {
        poolQuestions = targetStage.questions.map((q: any) => ({
          id: q.id,
          instruction: q.instruction || `${q.hint} dari Kanji berikut:`,
          prompt: q.prompt || q.kanji,
          options: q.options || [],
          correctIndex: q.correctIndex ?? 0,
          explanation: q.explanation || `Jawaban yang tepat: ${q.correctAnswer || q.options?.[q.correctIndex]}`,
          category: 'kanji',
          difficulty: q.jlpt || 'N5',
        }));
      }
    } else {
      stages.forEach(stg => {
        if (stg.questions) {
          stg.questions.forEach((q: any) => {
            poolQuestions.push({
              id: q.id,
              instruction: q.instruction || `${q.hint} dari Kanji berikut:`,
              prompt: q.prompt || q.kanji,
              options: q.options || [],
              correctIndex: q.correctIndex ?? 0,
              explanation: q.explanation || `Jawaban yang tepat: ${q.correctAnswer || q.options?.[q.correctIndex]}`,
              category: 'kanji',
              difficulty: q.jlpt || 'N5',
            });
          });
        }
      });
    }

    if (config.stageNumber) {
      // In stage mode, use the questions in order or limited by count
      payload.quizQuestions = poolQuestions.slice(0, count);
    } else {
      const shuffled = shuffleArray(poolQuestions);
      payload.quizQuestions = shuffled.slice(0, count);
    }
  }

  return payload;
}
