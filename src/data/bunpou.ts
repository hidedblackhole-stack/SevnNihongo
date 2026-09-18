import { BunpouItem, BunpouMixedSet, Question } from '../types/content';
import { getSubBranchesForBunpou } from './bunpouSubKnowledge';
import { enrichBunpouItem } from './bunpouMetadata';
import bunpouJson from './db/bunpou.json';
import questionsJson from './db/bunpou_questions.json';
import sentencesJson from './db/sentences.json';

// Build sentence reading lookup map from canonical sentences database
const sentenceReadingMap = new Map<string, string>();
if (Array.isArray(sentencesJson)) {
  for (const s of (sentencesJson as any[])) {
    if (s.japanese && s.reading) {
      sentenceReadingMap.set(s.japanese, s.reading);
    }
  }
}

interface RawExample {
  jp: string;
  en?: string;
  id?: string;
  reading?: string;
}

interface RawBunpou {
  id: string;
  map_id?: string;
  stage_id?: string;
  title: string;
  formula: string;
  meaning_en: string;
  meaning_id: string;
  explanation_note?: string;
  examples: RawExample[];
  question_ids: string[];
}

interface RawQuestion {
  id: string;
  material_id: string;
  type: string;
  prompt: string;
  ruby?: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

// Group questions by material_id
const questionsByMaterial = new Map<string, Question[]>();
(questionsJson as RawQuestion[]).forEach(q => {
  if (!questionsByMaterial.has(q.material_id)) {
    questionsByMaterial.set(q.material_id, []);
  }
  questionsByMaterial.get(q.material_id)!.push({
    id: q.id,
    prompt: q.prompt,
    ruby: q.ruby,
    options: q.options,
    correctIndex: q.correct_answer,
    explanation: q.explanation
  });
});

export const BUNPOU_DATABASE: Record<string, BunpouItem> = {};

(bunpouJson as RawBunpou[]).forEach(item => {
  const questions = questionsByMaterial.get(item.id) || [];
  
  // Format examples with canonical readings
  const examples = (item.examples || []).map(ex => {
    let cleanMeaningId = ex.id;
    const isPlaceholder = !cleanMeaningId || cleanMeaningId.startsWith('Contoh penggunaan pola');
    if (isPlaceholder && ex.en) {
      cleanMeaningId = ex.en;
    }

    return {
      japanese: ex.jp,
      reading: ex.reading || sentenceReadingMap.get(ex.jp) || ex.jp,
      meaningId: cleanMeaningId || ex.en || 'Contoh kalimat.',
      meaningEn: ex.en || ex.id
    };
  });

  // Determine level from ID (e.g. bp_n5_004 -> N5)
  // For legacy N3 items (e.g. w1d1g1), default to N3
  let detectedLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' = 'N3';
  if (item.id.includes('_n5_')) detectedLevel = 'N5';
  else if (item.id.includes('_n4_')) detectedLevel = 'N4';
  else if (item.id.includes('_n2_')) detectedLevel = 'N2';
  else if (item.id.includes('_n1_')) detectedLevel = 'N1';

  const bunpouItem: BunpouItem = {
    id: item.id,
    title: item.title,
    reading: item.formula || '文法パターン',
    meaningId: item.meaning_id || `Tata bahasa ${detectedLevel}`,
    meaningEn: item.meaning_en || `${detectedLevel} Grammar Pattern`,
    level: detectedLevel,
    explanation: item.explanation_note
      ? `${item.meaning_id}. Catatan: ${item.explanation_note}`
      : `${item.meaning_id} (${item.meaning_en}).`,
    formula: item.formula || '',
    examples,
    questions: questions.length > 0 ? questions : [
      {
        id: `${item.id}_default_q1`,
        prompt: `Arti yang tepat untuk pola 「${item.title}」 adalah:`,
        options: [item.meaning_id, 'Menyatakan larangan keras', 'Menunjukkan kemungkinan masa lalu', 'Menyatakan dugaan spekulatif'],
        correctIndex: 0,
        explanation: `${item.title}: ${item.meaning_id}`
      }
    ]
  };

  bunpouItem.subFormulas = getSubBranchesForBunpou(bunpouItem);
  const enrichedItem = enrichBunpouItem(bunpouItem);

  BUNPOU_DATABASE[item.id] = enrichedItem;
});

// Legacy mapping support (bunpou_001 -> w1d1g1, etc.)
if (BUNPOU_DATABASE['w1d1g1']) {
  BUNPOU_DATABASE['bunpou_001'] = { ...BUNPOU_DATABASE['w1d1g1'], id: 'bunpou_001' };
}
if (BUNPOU_DATABASE['w1d1g2']) {
  BUNPOU_DATABASE['bunpou_002'] = { ...BUNPOU_DATABASE['w1d1g2'], id: 'bunpou_002' };
}
if (BUNPOU_DATABASE['w1d1g3']) {
  BUNPOU_DATABASE['bunpou_003'] = { ...BUNPOU_DATABASE['w1d1g3'], id: 'bunpou_003' };
}
if (BUNPOU_DATABASE['w1d2g1']) {
  BUNPOU_DATABASE['bunpou_004'] = { ...BUNPOU_DATABASE['w1d2g1'], id: 'bunpou_004' };
}
if (BUNPOU_DATABASE['w1d2g2']) {
  BUNPOU_DATABASE['bunpou_005'] = { ...BUNPOU_DATABASE['w1d2g2'], id: 'bunpou_005' };
}

// Collect questions from all grammar points in a given week prefix
function collectWeekQuestions(weekPrefix: string): Question[] {
  const allQuestions: Question[] = [];
  for (const [id, item] of Object.entries(BUNPOU_DATABASE)) {
    if (id.startsWith(weekPrefix) && item.questions) {
      // Take 1 random question from each grammar point for variety
      const randomQ = item.questions[Math.floor(Math.random() * item.questions.length)];
      if (randomQ) allQuestions.push(randomQ);
    }
  }
  // Shuffle using Fisher-Yates
  for (let i = allQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
  }
  return allQuestions;
}

// Generate mixed sets for all 6 weeks dynamically
function buildMixedSets(): Record<string, BunpouMixedSet> {
  const sets: Record<string, BunpouMixedSet> = {};
  
  for (let w = 1; w <= 6; w++) {
    const weekPrefix = `w${w}`;
    const weekQuestions = collectWeekQuestions(weekPrefix);
    
    // General mixed set
    sets[`bunpou_mixed_w${w}`] = {
      id: `bunpou_mixed_w${w}`,
      title: `Week ${w} Mixed Grammar Test`,
      description: `Tantangan 7 soal acak dari seluruh tata bahasa Week ${w}.`,
      questions: weekQuestions.slice(0, 7)
    };
    
    // Boss set (same pool, different slice)
    sets[`set_w${w}_boss`] = {
      id: `set_w${w}_boss`,
      title: `Week ${w} Boss Mixed Grammar Test`,
      description: `Ujian boss akhir minggu: 7 soal campuran dari seluruh tata bahasa Week ${w}.`,
      questions: weekQuestions.slice(0, 7)
    };
  }

  // Legacy alias
  sets['bunpou_mixed_001'] = sets['bunpou_mixed_w1'] || {
    id: 'bunpou_mixed_001',
    title: 'N3 Bunpou Mastery Mixed Test',
    description: 'Tantangan 7 soal acak dari seluruh tata bahasa bab ini.',
    questions: collectWeekQuestions('w1').slice(0, 7)
  };

  return sets;
}

export const BUNPOU_MIXED_DATABASE = buildMixedSets();
