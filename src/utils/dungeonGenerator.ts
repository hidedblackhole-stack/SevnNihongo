import { KOTOBA_DATABASE } from '../data/kotoba';
import { KANJI_DATABASE } from '../data/kanji';
import { BUNPOU_DATABASE } from '../data/bunpou';
import { ResolvedDeckItem, resolveDeckItem } from './decks';
import { DeckItemRef } from '../types/rpg';
import { generateSentenceExercise, SentencePracticeExercise, PATTERN_SCHEMAS } from '../engine';
import { generateConjugationQuestion, ConjugationDrillQuestion } from '../data/conjugationRules';
import { Question } from '../types/content';
import kanjiQuestionsDb from '../data/db/kanji_questions.json';
import bunpouQuestionsDb from '../data/db/bunpou_questions.json';

export type DungeonType = 'writing' | 'flashcard' | 'sakubun' | 'conjugation' | 'quiz';
export type DungeonLevelCategory = 'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'Kaigo' | 'PM';

export interface DungeonConfig {
  type: DungeonType;
  levelCategory: DungeonLevelCategory;
  floorCount: number; // e.g. 5, 10, 15, 20
  mode: 'standard' | 'survival';
}

export interface DungeonPayload {
  config: DungeonConfig;
  writingItems?: ResolvedDeckItem[];
  flashcardItems?: ResolvedDeckItem[];
  sakubunExercises?: SentencePracticeExercise[];
  conjugationQuestions?: ConjugationDrillQuestion[];
  quizQuestions?: Question[];
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

export function generateDungeonSession(config: DungeonConfig): DungeonPayload {
  const { type, levelCategory, floorCount } = config;
  const count = floorCount;

  // 1. Filter Kotoba
  const allKotoba = Object.values(KOTOBA_DATABASE);
  const matchingKotoba = allKotoba.filter(item => {
    if (!item) return false;
    if (levelCategory === 'all') return true;
    if (levelCategory === 'Kaigo') {
      return Boolean(item.tags?.includes('Kaigo') || (item.unitName && item.unitName.includes('Kaigo')));
    }
    if (levelCategory === 'PM') {
      return isPmKotoba(item);
    }
    return item.jlpt === levelCategory;
  });

  // 2. Filter Kanji
  const allKanji = Object.values(KANJI_DATABASE);
  const seenKanji = new Set<string>();
  const matchingKanji = allKanji.filter(item => {
    if (!item || !item.character || seenKanji.has(item.character)) return false;
    seenKanji.add(item.character);
    if (levelCategory === 'all') return true;
    if (levelCategory === 'Kaigo' || levelCategory === 'PM') {
      return matchingKotoba.some(k => k.kanjiComponents?.includes(item.character));
    }
    return item.jlpt === levelCategory;
  });

  // 3. Filter Bunpou
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
    if (levelCategory === 'N5') {
      targetSchemas = allSchemas.filter(s => s.jlpt === 'N5');
    } else if (levelCategory === 'N4') {
      targetSchemas = allSchemas.filter(s => s.jlpt === 'N4');
    } else if (levelCategory === 'N3') {
      targetSchemas = allSchemas.filter(s => s.jlpt === 'N3');
    } else if (levelCategory === 'Kaigo' || levelCategory === 'PM') {
      targetSchemas = allSchemas.filter(s => s.jlpt === 'N5' || s.jlpt === 'N4');
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
    if (levelCategory === 'N5') {
      allowedForms = ['te', 'nai', 'ta', 'masu'];
    } else if (levelCategory === 'N4') {
      allowedForms = ['te', 'nai', 'ta', 'masu', 'potential', 'volitional'];
    }

    for (let i = 0; i < count; i++) {
      const randomForm = allowedForms[Math.floor(Math.random() * allowedForms.length)];
      try {
        const q = generateConjugationQuestion(randomForm);
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

  return payload;
}
