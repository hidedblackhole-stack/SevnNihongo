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
 * Compare two characters, treating katakana and hiragana equivalents as equal.
 */
export function charsMatch(c1: string, c2: string): boolean {
  if (!c1 || !c2) return false;
  if (c1 === c2) return true;
  return katakanaToHiragana(c1) === katakanaToHiragana(c2);
}

/**
 * Check if haystack starts with needle at given position, kana-insensitive.
 */
export function startsWithKana(haystack: string, needle: string, pos: number): boolean {
  if (pos + needle.length > haystack.length) return false;
  for (let i = 0; i < needle.length; i++) {
    if (!charsMatch(haystack[pos + i], needle[i])) return false;
  }
  return true;
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
      let reading = furiganaDict.words[wordMatch];
      // If a single kanji matched as a word but is immediately followed by hiragana (okurigana),
      // prefer the verb/adjective stem kunyomi from kanji dictionary (e.g. 終わった -> お, 割った -> わ, 乾いた -> かわ)
      if (wordMatch.length === 1 && i + 1 < text.length && isHiragana(text[i + 1]) && furiganaDict.kanji[wordMatch]) {
        reading = furiganaDict.kanji[wordMatch];
        segments.push({ text: wordMatch, ruby: reading, isKanji: true });
      } else if (Array.from(wordMatch).some(c => !isKanji(c))) {
        // Word contains both kanji and okurigana (e.g. 飽きる, 食べる, 思い出す)
        // Align wordMatch against reading so only kanji characters receive ruby, leaving okurigana as plain text
        const subSegments = alignKanjiReadings(wordMatch, reading, excludeKanji);
        segments.push(...subSegments);
      } else {
        segments.push({ text: wordMatch, ruby: reading, isKanji: true });
      }
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

      // Collect the following non-kanji anchor sequence in japanese
      let anchor = '';
      let lookAhead = jIdx;
      while (lookAhead < japanese.length && (!isKanji(japanese[lookAhead]) || excludeKanji?.has(japanese[lookAhead]))) {
        anchor += japanese[lookAhead];
        lookAhead++;
      }

      let readingEnd = rIdx;
      if (anchor.length > 0) {
        // In Japanese, each kanji has at least 1 mora (character) in reading
        const minLen = kanjiSeq.length;
        let found = -1;

        // Try matching anchor sequence with up to 4 characters prefix
        for (let aLen = Math.min(anchor.length, 4); aLen >= 1; aLen--) {
          const subAnchor = anchor.substring(0, aLen);
          for (let i = rIdx + minLen; i <= reading.length - aLen; i++) {
            if (startsWithKana(reading, subAnchor, i)) {
              found = i;
              break;
            }
          }
          if (found >= 0) break;
        }

        // Fallback: if minLen was too strict, try from rIdx + 1
        if (found < 0) {
          for (let aLen = Math.min(anchor.length, 4); aLen >= 1; aLen--) {
            const subAnchor = anchor.substring(0, aLen);
            for (let i = rIdx + 1; i <= reading.length - aLen; i++) {
              if (startsWithKana(reading, subAnchor, i)) {
                found = i;
                break;
              }
            }
            if (found >= 0) break;
          }
        }

        if (found >= 0) {
          readingEnd = found;
        } else {
          readingEnd = Math.min(rIdx + kanjiSeq.length * 3, reading.length);
        }
      } else {
        readingEnd = reading.length;
      }

      const rubyText = reading.substring(rIdx, readingEnd);
      // Fallback to dictionary if rubyText is empty
      const finalRuby = rubyText || furiganaDict.words[kanjiSeq] || furiganaDict.kanji[kanjiSeq] || undefined;
      segments.push({ text: kanjiSeq, ruby: finalRuby, isKanji: true });
      rIdx = readingEnd;
    } else if (isKanji(jChar) && excludeKanji?.has(jChar)) {
      let excludedSeq = '';
      while (jIdx < japanese.length && isKanji(japanese[jIdx]) && excludeKanji?.has(japanese[jIdx])) {
        excludedSeq += japanese[jIdx];
        jIdx++;
      }
      segments.push({ text: excludedSeq, isKanji: false });
    } else {
      segments.push({ text: jChar, isKanji: false });
      jIdx++;
      // Skip any extraneous whitespace in reading if jChar is not whitespace
      while (rIdx < reading.length && /[\s　]/.test(reading[rIdx]) && !/[\s　]/.test(jChar)) {
        rIdx++;
      }
      // Advance rIdx if reading matches jChar
      if (rIdx < reading.length && charsMatch(jChar, reading[rIdx])) {
        rIdx++;
      } else if (rIdx < reading.length && /[\s　]/.test(jChar) && /[\s　]/.test(reading[rIdx])) {
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
