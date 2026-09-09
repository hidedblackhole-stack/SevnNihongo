// Furigana / Ruby Text Utilities
// Provides kanji detection and kanji-reading alignment for inline ruby text rendering.

export interface RubySegment {
  text: string;
  ruby?: string;
  isKanji: boolean;
}

/**
 * Check if a character is a CJK Unified Ideograph (kanji).
 */
export function isKanji(char: string): boolean {
  const code = char.charCodeAt(0);
  // CJK Unified Ideographs: U+4E00 to U+9FFF
  // CJK Unified Ideographs Extension A: U+3400 to U+4DBF
  // CJK Compatibility Ideographs: U+F900 to U+FAFF
  return (code >= 0x4E00 && code <= 0x9FFF) ||
         (code >= 0x3400 && code <= 0x4DBF) ||
         (code >= 0xF900 && code <= 0xFAFF);
}

/**
 * Check if a character is hiragana.
 */
export function isHiragana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x3040 && code <= 0x309F;
}

/**
 * Check if a character is katakana.
 */
export function isKatakana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x30A0 && code <= 0x30FF;
}

/**
 * Align a Japanese text (with kanji) against its full-hiragana reading
 * to produce ruby segments with kanji → reading mappings.
 *
 * This uses a greedy alignment approach:
 * 1. Walk through the Japanese text character by character
 * 2. Non-kanji characters are expected to match the reading directly
 * 3. Kanji sequences consume the corresponding portion of the reading
 *
 * @param japanese - The original Japanese text containing kanji
 * @param reading  - The full reading in hiragana/katakana (no kanji)
 * @param excludeKanji - Optional set of kanji characters to not annotate
 * @returns Array of RubySegment objects
 */
export function alignKanjiReadings(
  japanese: string,
  reading: string,
  excludeKanji?: Set<string>
): RubySegment[] {
  if (!japanese || !reading) {
    return [{ text: japanese || '', isKanji: false }];
  }

  // If japanese and reading are identical, no furigana needed
  if (japanese === reading) {
    return [{ text: japanese, isKanji: false }];
  }

  // Check if reading contains any kanji — if so, it's not a pure reading
  // and we can't reliably align. Fall back to showing reading above.
  const readingHasKanji = Array.from(reading).some(c => isKanji(c));
  if (readingHasKanji) {
    // Reading also has kanji — can't do inline ruby alignment
    return [{ text: japanese, isKanji: false }];
  }

  const segments: RubySegment[] = [];
  let jIdx = 0; // index in japanese string
  let rIdx = 0; // index in reading string

  while (jIdx < japanese.length) {
    const jChar = japanese[jIdx];

    if (isKanji(jChar) && !(excludeKanji?.has(jChar))) {
      // Start of a kanji sequence — collect consecutive kanji
      let kanjiSeq = '';
      while (jIdx < japanese.length && isKanji(japanese[jIdx]) && !(excludeKanji?.has(japanese[jIdx]))) {
        kanjiSeq += japanese[jIdx];
        jIdx++;
      }

      // Now find how many reading characters this kanji sequence maps to.
      // Strategy: look ahead in the Japanese text for the next non-kanji char,
      // then find that char in the reading to determine the boundary.
      let readingEnd = rIdx;

      if (jIdx < japanese.length) {
        // There's text after the kanji — find the next non-kanji char(s)
        // and locate them in the reading to determine boundary
        const nextJChar = japanese[jIdx];

        if (!isKanji(nextJChar)) {
          // Find this character in the reading starting from rIdx
          const searchFrom = rIdx + kanjiSeq.length; // minimum possible reading length
          let found = -1;

          // Search for the next Japanese char in the reading
          for (let i = Math.max(rIdx + 1, searchFrom - 1); i < reading.length; i++) {
            if (reading[i] === nextJChar || 
                (isKatakana(nextJChar) && reading[i] === katakanaToHiragana(nextJChar)) ||
                (isHiragana(nextJChar) && reading[i] === nextJChar)) {
              found = i;
              break;
            }
          }

          if (found >= 0) {
            readingEnd = found;
          } else {
            // Fallback: assume each kanji = 2 reading chars (common heuristic)
            readingEnd = Math.min(rIdx + kanjiSeq.length * 2, reading.length);
          }
        } else {
          // Next char is also kanji (shouldn't happen since we collected all consecutive kanji)
          readingEnd = Math.min(rIdx + kanjiSeq.length * 2, reading.length);
        }
      } else {
        // Kanji is at the end of the string — consume remaining reading
        readingEnd = reading.length;
      }

      const rubyText = reading.substring(rIdx, readingEnd);
      segments.push({ text: kanjiSeq, ruby: rubyText, isKanji: true });
      rIdx = readingEnd;
    } else if (isKanji(jChar) && excludeKanji?.has(jChar)) {
      // Excluded kanji — collect consecutive excluded kanji
      let excludedSeq = '';
      while (jIdx < japanese.length && isKanji(japanese[jIdx]) && excludeKanji?.has(japanese[jIdx])) {
        excludedSeq += japanese[jIdx];
        jIdx++;
      }

      // Skip corresponding reading characters
      // Find next matching non-kanji char to determine boundary
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
      // Non-kanji character — advance both indices
      segments.push({ text: jChar, isKanji: false });
      jIdx++;
      // Advance reading index past the matching character
      if (rIdx < reading.length) {
        rIdx++;
      }
    }
  }

  // Merge adjacent non-kanji segments for cleaner output
  return mergeNonKanjiSegments(segments);
}

/**
 * Convert a single katakana character to hiragana.
 */
function katakanaToHiragana(char: string): string {
  const code = char.charCodeAt(0);
  if (code >= 0x30A1 && code <= 0x30F6) {
    return String.fromCharCode(code - 0x60);
  }
  return char;
}

/**
 * Merge adjacent non-kanji segments into single segments.
 */
function mergeNonKanjiSegments(segments: RubySegment[]): RubySegment[] {
  const merged: RubySegment[] = [];

  for (const seg of segments) {
    if (!seg.isKanji && merged.length > 0 && !merged[merged.length - 1].isKanji) {
      // Merge with previous non-kanji segment
      merged[merged.length - 1].text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }

  return merged;
}
