// ==============================================================================
// JAPANESE INPUT METHOD EDITOR (IME) & KANA-KANJI HENKAN ENGINE
// Provides real-time Romaji-to-Kana conversion, Kana-to-Kanji dictionary lookup,
// and candidate suggestions (Henkan) for typing and searching.
// ==============================================================================

import * as wanakana from 'wanakana';
import furiganaDictRaw from '../data/furiganaDictionary.json';

export interface HenkanCandidate {
  text: string;
  type: 'context' | 'kanji' | 'katakana' | 'hiragana' | 'romaji';
  label?: string;
}

// Inverted dictionary built lazily on first access
let readingToKanjiMap: Map<string, string[]> | null = null;

function getReadingMap(): Map<string, string[]> {
  if (readingToKanjiMap) return readingToKanjiMap;

  readingToKanjiMap = new Map();
  const words = (furiganaDictRaw as any).words || {};

  for (const [kanjiWord, reading] of Object.entries(words)) {
    if (typeof reading === 'string') {
      // Clean up reading if it has annotations e.g. "あげる (=やる)" -> "あげる"
      const cleanReading = reading.replace(/\s*\(.*?\)/g, '').trim();
      const existing = readingToKanjiMap.get(cleanReading) || [];
      if (!existing.includes(kanjiWord)) {
        existing.push(kanjiWord);
        readingToKanjiMap.set(cleanReading, existing);
      }
    }
  }

  // Also index individual kanji characters
  const kanji = (furiganaDictRaw as any).kanji || {};
  for (const [kChar, reading] of Object.entries(kanji)) {
    if (typeof reading === 'string') {
      const cleanReading = reading.replace(/[-]/g, '').trim();
      if (cleanReading) {
        const existing = readingToKanjiMap.get(cleanReading) || [];
        if (!existing.includes(kChar)) {
          existing.push(kChar);
          readingToKanjiMap.set(cleanReading, existing);
        }
      }
    }
  }

  return readingToKanjiMap;
}

/**
 * Converts romaji to hiragana in real-time as user types.
 * Retains punctuation, spaces, and existing Japanese characters.
 */
export function convertRomajiToKana(text: string): string {
  if (!text) return '';
  return wanakana.toHiragana(text, { IMEMode: true });
}

/**
 * Converts kana to katakana.
 */
export function convertToKatakana(text: string): string {
  if (!text) return '';
  return wanakana.toKatakana(text);
}

/**
 * Converts kana/kanji to romaji.
 */
export function convertToRomaji(text: string): string {
  if (!text) return '';
  return wanakana.toRomaji(text);
}

/**
 * Gets conversion (Henkan) candidates for a given input query.
 * Prioritizes:
 * 1. Contextual words (e.g. from current challenge)
 * 2. Dictionary Kanji matches
 * 3. Katakana form (e.g. てれび -> テレビ)
 * 4. Hiragana form
 * 5. Romaji form
 */
export function getHenkanCandidates(query: string, contextWords: string[] = []): HenkanCandidate[] {
  if (!query || !query.trim()) return [];

  const raw = query.trim();
  const kana = wanakana.toHiragana(raw, { IMEMode: true });
  const katakana = wanakana.toKatakana(kana);
  const romaji = wanakana.toRomaji(kana);

  const candidates: HenkanCandidate[] = [];
  const added = new Set<string>();

  const addCandidate = (text: string, type: HenkanCandidate['type'], label?: string) => {
    if (!text || added.has(text)) return;
    added.add(text);
    candidates.push({ text, type, label });
  };

  // 1. Context words from current exercise/view (highest priority!)
  for (const word of contextWords) {
    if (!word) continue;
    const wordReading = wanakana.toHiragana(word, { IMEMode: true });
    if (word === kana || wordReading === kana || word.includes(kana) || kana.includes(wordReading)) {
      addCandidate(word, 'context', 'Konteks');
    }
  }

  // 2. Dictionary Kanji lookup
  const dict = getReadingMap();
  const kanjiMatches = dict.get(kana) || [];
  for (const k of kanjiMatches) {
    addCandidate(k, 'kanji', 'Kanji');
  }

  // If kana has prefix/sub-word matches in dictionary
  if (kanjiMatches.length === 0 && kana.length >= 2) {
    let partialCount = 0;
    for (const [r, list] of dict.entries()) {
      if (r.startsWith(kana) && r !== kana) {
        for (const item of list) {
          addCandidate(item, 'kanji');
          partialCount++;
          if (partialCount >= 4) break;
        }
      }
      if (partialCount >= 4) break;
    }
  }

  // 3. Katakana candidate (e.g. てれび -> テレビ, びーる -> ビール)
  if (katakana !== kana) {
    addCandidate(katakana, 'katakana', 'Katakana');
  }

  // 4. Hiragana candidate (the pure phonetic form)
  addCandidate(kana, 'hiragana', 'Hiragana');

  // 5. Romaji candidate (original alphabet)
  if (romaji && romaji !== raw.toLowerCase()) {
    addCandidate(romaji, 'romaji', 'Romaji');
  }

  return candidates;
}

/**
 * Searches and matches user query against Japanese item (handling Romaji, Hiragana, Katakana, Kanji)
 */
export function matchJapaneseQuery(query: string, targetFields: (string | undefined | null)[]): boolean {
  if (!query || !query.trim()) return true;
  const q = query.toLowerCase().trim();
  const qKana = wanakana.toHiragana(q, { IMEMode: true }).toLowerCase();
  const qKata = wanakana.toKatakana(q).toLowerCase();

  for (const field of targetFields) {
    if (!field) continue;
    const f = field.toLowerCase();
    if (
      f.includes(q) ||
      f.includes(qKana) ||
      f.includes(qKata)
    ) {
      return true;
    }
  }
  return false;
}
