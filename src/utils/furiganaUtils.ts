// Furigana / Ruby Text Utilities
// Provides kanji detection, normalization, dictionary fallback, and kanji-reading alignment for inline ruby text rendering.

import furiganaDictRaw from '../data/furiganaDictionary.json';

export interface RubySegment {
  text: string;
  ruby?: string;
  isKanji: boolean;
}

interface FuriganaDict {
  kanji: Record<string, string>;
  words: Record<string, string>;
}

const furiganaDict: FuriganaDict = furiganaDictRaw as FuriganaDict;

/**
 * Check if a character is a CJK Unified Ideograph (kanji) or ideographic iteration mark.
 */
export function isKanji(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4E00 && code <= 0x9FFF) ||
    (code >= 0x3400 && code <= 0x4DBF) ||
    (code >= 0xF900 && code <= 0xFAFF) ||
    code === 0x3005 || // 々 (Ideographic Iteration Mark)
    code === 0x3006    // 〆 (Ideographic Closing Mark)
  );
}

/**
 * Check if a character is hiragana.
 */
export function isHiragana(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return code >= 0x3040 && code <= 0x309F;
}

/**
 * Check if a character is katakana.
 */
export function isKatakana(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return code >= 0x30A0 && code <= 0x30FF;
}

/**
 * Normalize punctuation, parentheses, and blank underscores to prevent desync between Japanese prompt and reading.
 */
export function normalizeJapanesePunctuation(str: string): string {
  if (!str) return '';
  return str
    .replace(/（[\s　]*）/g, '（　）')
    .replace(/\([\s　]*\)/g, '（　）')
    .replace(/[＿_]{2,}/g, '＿＿＿');
}

/**
 * Convert a single katakana character to hiragana.
 */
export function katakanaToHiragana(char: string): string {
  if (!char) return '';
  const code = char.charCodeAt(0);
  if (code >= 0x30A1 && code <= 0x30F6) {
    return String.fromCharCode(code - 0x60);
  }
  return char;
}

/**
 * Merge adjacent non-kanji segments into single segments for clean DOM rendering.
 */
export function mergeNonKanjiSegments(segments: RubySegment[]): RubySegment[] {
  const merged: RubySegment[] = [];

  for (const seg of segments) {
    if (!seg.isKanji && merged.length > 0 && !merged[merged.length - 1].isKanji) {
      merged[merged.length - 1].text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }

  return merged;
}

/**
 * Automatically annotate kanji words in Japanese text using the comprehensive built-in dictionary.
 * Used as an automatic fallback when no explicit reading string is provided for a question.
 */
export function autoAnnotateFurigana(text: string, excludeKanji?: Set<string>): RubySegment[] {
  if (!text) return [];

  const segments: RubySegment[] = [];
  let i = 0;

  // Filter dictionary words that actually appear in this text, sorted by length descending
  const matchedWords = Object.keys(furiganaDict.words)
    .filter(w => text.includes(w))
    .sort((a, b) => b.length - a.length);

  while (i < text.length) {
    // Check if substring matches known compound word
    let wordMatch: string | null = null;
    for (const w of matchedWords) {
      if (text.startsWith(w, i)) {
        // If all kanji in word are excluded, skip word match
        const containsExcluded = excludeKanji && Array.from(w).some(c => excludeKanji.has(c));
        if (!containsExcluded) {
          wordMatch = w;
          break;
        }
      }
    }

    if (wordMatch) {
      const reading = furiganaDict.words[wordMatch];
      segments.push({ text: wordMatch, ruby: reading, isKanji: true });
      i += wordMatch.length;
      continue;
    }

    const char = text[i];
    if (isKanji(char)) {
      if (excludeKanji && excludeKanji.has(char)) {
        segments.push({ text: char, isKanji: false });
      } else {
        const singleReading = furiganaDict.kanji[char];
        segments.push({ text: char, ruby: singleReading || undefined, isKanji: true });
      }
      i++;
      continue;
    }

    // Collect continuous non-kanji text
    let nonKanji = '';
    while (i < text.length && !isKanji(text[i])) {
      if (matchedWords.some(w => text.startsWith(w, i))) break;
      nonKanji += text[i];
      i++;
    }
    if (nonKanji) {
      segments.push({ text: nonKanji, isKanji: false });
    }
  }

  return mergeNonKanjiSegments(segments);
}

/**
 * Align a Japanese text (with kanji) against its full-hiragana reading
 * to produce ruby segments with kanji → reading mappings.
 */
export function alignKanjiReadings(
  origJapanese: string,
  origReading: string,
  excludeKanji?: Set<string>
): RubySegment[] {
  if (!origJapanese) {
    return [];
  }
  if (!origReading) {
    return autoAnnotateFurigana(origJapanese, excludeKanji);
  }

  const japanese = normalizeJapanesePunctuation(origJapanese);
  const reading = normalizeJapanesePunctuation(origReading);

  if (japanese === reading) {
    return [{ text: origJapanese, isKanji: false }];
  }

  // If reading itself contains kanji, cannot do 1-to-1 hiragana mapping, fall back to auto-annotation
  const readingHasKanji = Array.from(reading).some(c => isKanji(c));
  if (readingHasKanji) {
    return autoAnnotateFurigana(origJapanese, excludeKanji);
  }

  const segments: RubySegment[] = [];
  let jIdx = 0;
  let rIdx = 0;

  while (jIdx < japanese.length) {
    const jChar = japanese[jIdx];

    if (isKanji(jChar) && !(excludeKanji?.has(jChar))) {
      let kanjiSeq = '';
      while (jIdx < japanese.length && isKanji(japanese[jIdx]) && !(excludeKanji?.has(japanese[jIdx]))) {
        kanjiSeq += japanese[jIdx];
        jIdx++;
      }

      let readingEnd = rIdx;
      if (jIdx < japanese.length) {
        const nextJChar = japanese[jIdx];
        if (!isKanji(nextJChar)) {
          const searchFrom = rIdx + kanjiSeq.length;
          let found = -1;

          for (let i = Math.max(rIdx + 1, searchFrom - 1); i < reading.length; i++) {
            if (
              reading[i] === nextJChar ||
              (isKatakana(nextJChar) && reading[i] === katakanaToHiragana(nextJChar)) ||
              (isHiragana(nextJChar) && reading[i] === nextJChar)
            ) {
              found = i;
              break;
            }
          }

          if (found >= 0) {
            readingEnd = found;
          } else {
            readingEnd = Math.min(rIdx + kanjiSeq.length * 2, reading.length);
          }
        } else {
          readingEnd = Math.min(rIdx + kanjiSeq.length * 2, reading.length);
        }
      } else {
        readingEnd = reading.length;
      }

      const rubyText = reading.substring(rIdx, readingEnd);
      segments.push({ text: kanjiSeq, ruby: rubyText, isKanji: true });
      rIdx = readingEnd;
    } else if (isKanji(jChar) && excludeKanji?.has(jChar)) {
      let excludedSeq = '';
      while (jIdx < japanese.length && isKanji(japanese[jIdx]) && excludeKanji?.has(japanese[jIdx])) {
        excludedSeq += japanese[jIdx];
        jIdx++;
      }

      if (jIdx < japanese.length) {
        const nextJChar = japanese[jIdx];
        if (!isKanji(nextJChar)) {
          for (let i = rIdx + 1; i < reading.length; i++) {
            if (reading[i] === nextJChar) {
              rIdx = i;
              break;
            }
          }
        } else {
          rIdx += excludedSeq.length * 2;
        }
      } else {
        rIdx = reading.length;
      }

      segments.push({ text: excludedSeq, isKanji: false });
    } else {
      segments.push({ text: jChar, isKanji: false });
      jIdx++;
      if (rIdx < reading.length) {
        rIdx++;
      }
    }
  }

  return mergeNonKanjiSegments(segments);
}

/**
 * Universal helper that returns ruby segments for any Japanese text,
 * whether an explicit reading string is provided or auto-annotated.
 */
export function getFuriganaSegments(
  japanese: string,
  reading?: string,
  excludeKanji?: Set<string>
): RubySegment[] {
  if (!japanese) return [];
  if (reading && reading.trim() && reading.trim() !== japanese.trim()) {
    return alignKanjiReadings(japanese, reading, excludeKanji);
  }
  return autoAnnotateFurigana(japanese, excludeKanji);
}
