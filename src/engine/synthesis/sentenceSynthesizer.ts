// ==============================================================================
// JAPANESE LANGUAGE INTELLIGENCE ENGINE (J-LIE) — SENTENCE SYNTHESIZER
// ==============================================================================

import { SynthesizedSentence, ConjugationForm } from '../types';
import { conjugateVerb } from '../morphology/inflectionEngine';
import { PATTERN_SCHEMAS } from '../syntax/patternSchemas';

export interface SynthesizeOptions {
  patternId: string;
  verbWord?: string;
  verbReading?: string;
  verbMeaningId?: string;
  verbMeaningEn?: string;
  objectWord?: string;
  objectReading?: string;
  objectMeaningId?: string;
  objectMeaningEn?: string;
  locationWord?: string;
  locationReading?: string;
  locationMeaningId?: string;
  locationMeaningEn?: string;
}

/**
 * Curated natural collocations for high-fidelity procedural generation.
 */
export const NATURAL_PAIRS: {
  verb: { word: string; reading: string; meaningId: string; meaningEn: string };
  object: { word: string; reading: string; meaningId: string; meaningEn: string };
  defaultLocation?: { word: string; reading: string; meaningId: string };
}[] = [
  {
    verb: { word: '読む', reading: 'よむ', meaningId: 'membaca', meaningEn: 'read' },
    object: { word: '本', reading: 'ほん', meaningId: 'buku', meaningEn: 'book' },
    defaultLocation: { word: '図書館', reading: 'としょかん', meaningId: 'perpustakaan' },
  },
  {
    verb: { word: '食べる', reading: 'たべる', meaningId: 'makan', meaningEn: 'eat' },
    object: { word: 'ご飯', reading: 'ごはん', meaningId: 'nasi', meaningEn: 'meal' },
    defaultLocation: { word: '食堂', reading: 'しょくどう', meaningId: 'kantin' },
  },
  {
    verb: { word: '飲む', reading: 'のむ', meaningId: 'minum', meaningEn: 'drink' },
    object: { word: '水', reading: 'みず', meaningId: 'air', meaningEn: 'water' },
    defaultLocation: { word: 'ここ', reading: 'ここ', meaningId: 'sini' },
  },
  {
    verb: { word: '勉強する', reading: 'べんきょうする', meaningId: 'belajar', meaningEn: 'study' },
    object: { word: '日本語', reading: 'にほんご', meaningId: 'bahasa Jepang', meaningEn: 'Japanese' },
    defaultLocation: { word: '教室', reading: 'きょうしつ', meaningId: 'kelas' },
  },
  {
    verb: { word: '聞く', reading: 'きく', meaningId: 'mendengarkan', meaningEn: 'listen to' },
    object: { word: '音楽', reading: 'おんがく', meaningId: 'musik', meaningEn: 'music' },
    defaultLocation: { word: '部屋', reading: 'へや', meaningId: 'kamar' },
  },
  {
    verb: { word: '吸う', reading: 'すう', meaningId: 'merokok / menghisap', meaningEn: 'smoke' },
    object: { word: 'たばこ', reading: 'たばこ', meaningId: 'rokok', meaningEn: 'cigarette' },
    defaultLocation: { word: 'ここ', reading: 'ここ', meaningId: 'sini' },
  },
  {
    verb: { word: '撮る', reading: 'とる', meaningId: 'mengambil', meaningEn: 'take' },
    object: { word: '写真', reading: 'しゃしん', meaningId: 'foto', meaningEn: 'photo' },
    defaultLocation: { word: '美術館', reading: 'びじゅつかん', meaningId: 'museum' },
  },
  {
    verb: { word: '書く', reading: 'かく', meaningId: 'menulis', meaningEn: 'write' },
    object: { word: '手紙', reading: 'てがみ', meaningId: 'surat', meaningEn: 'letter' },
    defaultLocation: { word: '部屋', reading: 'へや', meaningId: 'kamar' },
  },
  {
    verb: { word: '見る', reading: 'みる', meaningId: 'menonton', meaningEn: 'watch' },
    object: { word: 'テレビ', reading: 'てれび', meaningId: 'televisi', meaningEn: 'TV' },
    defaultLocation: { word: '家', reading: 'いえ', meaningId: 'rumah' },
  },
];

/**
 * Synthesizes a natural Japanese sentence from a grammar pattern and compatible vocabulary.
 */
export function synthesizeSentence(options: SynthesizeOptions): SynthesizedSentence {
  const schema = PATTERN_SCHEMAS[options.patternId] || PATTERN_SCHEMAS['te_wa_ikenai'];

  // Select vocabulary: use provided or pick from natural pairs
  const pairIndex = Math.abs(options.patternId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % NATURAL_PAIRS.length;
  const pair = NATURAL_PAIRS[pairIndex];

  const verb = {
    word: options.verbWord || pair.verb.word,
    reading: options.verbReading || pair.verb.reading,
    meaningId: options.verbMeaningId || pair.verb.meaningId,
    meaningEn: options.verbMeaningEn || pair.verb.meaningEn,
  };

  const object = {
    word: options.objectWord || pair.object.word,
    reading: options.objectReading || pair.object.reading,
    meaningId: options.objectMeaningId || pair.object.meaningId,
    meaningEn: options.objectMeaningEn || pair.object.meaningEn,
  };

  const location = options.locationWord
    ? {
        word: options.locationWord,
        reading: options.locationReading || options.locationWord,
        meaningId: options.locationMeaningId || options.locationWord,
      }
    : pair.defaultLocation;

  // Conjugate the verb according to the pattern's requirement
  const conjResult = conjugateVerb(verb.word, verb.reading);
  const requiredForm = schema.requiredConjugation as ConjugationForm;
  const conjugated = conjResult.forms[requiredForm] || conjResult.forms.jisho;

  // Build the sentence breakdown & full string
  const breakdown: SynthesizedSentence['breakdown'] = [];
  let jpStr = '';
  let rdStr = '';

  // 1. Location (if applicable to pattern and exists)
  const hasLocationSlot = schema.slots.some(s => s.role === 'location');
  if (hasLocationSlot && location) {
    breakdown.push({ text: location.word, reading: location.reading, role: 'location' });
    breakdown.push({ text: 'で', reading: 'で', role: 'location_particle', isParticle: true });
    jpStr += `${location.word}で`;
    rdStr += `${location.reading}で`;
  }

  // 2. Object (if applicable)
  const hasObjectSlot = schema.slots.some(s => s.role === 'object');
  if (hasObjectSlot && object) {
    breakdown.push({ text: object.word, reading: object.reading, role: 'object' });
    breakdown.push({ text: 'を', reading: 'を', role: 'object_particle', isParticle: true });
    jpStr += `${object.word}を`;
    rdStr += `${object.reading}を`;
  }

  // 3. Predicate (Conjugated Verb Stem/Form)
  breakdown.push({ text: conjugated.japanese, reading: conjugated.reading, role: 'predicate' });
  jpStr += conjugated.japanese;
  rdStr += conjugated.reading;

  // 4. Grammar Suffix
  if (schema.fixedSuffix) {
    breakdown.push({ text: schema.fixedSuffix, reading: schema.fixedSuffix, role: 'grammar_suffix' });
    jpStr += schema.fixedSuffix;
    rdStr += schema.fixedSuffix;
  }

  // Sentence ending punctuation
  jpStr += '。';
  rdStr += '。';

  // Generate natural Indonesian and English translations
  let meaningId = schema.meaningTemplateId
    .replace('{predicate}', verb.meaningId)
    .replace('{object}', object ? object.meaningId : '')
    .replace('{location}', location ? location.meaningId : '')
    .replace(/\s+/g, ' ')
    .trim();

  let meaningEn = schema.meaningTemplateEn
    .replace('{predicate}', verb.meaningEn)
    .replace('{object}', object ? object.meaningEn : '')
    .replace('{location}', location ? (location.meaningId === 'perpustakaan' ? 'the library' : location.meaningId) : '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    id: `synth_${schema.id}_${Date.now()}`,
    patternId: schema.id,
    japanese: jpStr,
    reading: rdStr,
    meaningId: meaningId + '.',
    meaningEn: meaningEn + '.',
    breakdown,
  };
}
