import React from 'react';
import { KanjiItem } from '../types/content';

export const kataToHira = (str: string) => {
  return str.replace(/[\u30a1-\u30f6]/g, m => String.fromCharCode(m.charCodeAt(0) - 0x60));
};

export const rendakuMap: Record<string, string> = {
  'か': 'が', 'き': 'ぎ', 'く': 'ぐ', 'け': 'げ', 'こ': 'ご',
  'さ': 'ざ', 'し': 'じ', 'す': 'ず', 'せ': 'ぜ', 'そ': 'ぞ',
  'た': 'だ', 'ち': 'ぢ', 'つ': 'づ', 'て': 'で', 'と': 'ど',
  'は': 'ば', 'ひ': 'び', 'ふ': 'ぶ', 'へ': 'べ', 'ほ': 'ぼ',
};

export const handakutenMap: Record<string, string> = {
  'は': 'ぱ', 'ひ': 'ぴ', 'ふ': 'ぷ', 'へ': 'ぺ', 'ほ': 'ぽ',
};

export const getKanjiStems = (kanji: KanjiItem): string[] => {
  const stems = new Set<string>();
  const addStem = (s?: string) => {
    if (!s) return;
    const h = kataToHira(s);
    stems.add(h);
    // Sokuon change: if stem ends with つ, ち, く, き -> could become っ (e.g. けつ -> けっ in 結婚)
    if (/[つちくき]$/.test(h)) {
      stems.add(h.slice(0, -1) + 'っ');
    }
    // Rendaku change
    const firstChar = h[0];
    if (rendakuMap[firstChar]) {
      const voiced = rendakuMap[firstChar] + h.slice(1);
      stems.add(voiced);
      if (/[つちくき]$/.test(voiced)) {
        stems.add(voiced.slice(0, -1) + 'っ');
      }
    }
    if (handakutenMap[firstChar]) {
      const pSound = handakutenMap[firstChar] + h.slice(1);
      stems.add(pSound);
      if (/[つちくき]$/.test(pSound)) {
        stems.add(pSound.slice(0, -1) + 'っ');
      }
    }
  };

  (kanji?.onyomi || []).forEach(o => {
    const base = o.split(' ')[0].split(/[\.・\-\/]/)[0].trim();
    addStem(base);
  });
  (kanji?.kunyomi || []).forEach(k => {
    const base = k.split(' ')[0].split(/[\.・\-\/]/)[0].trim();
    addStem(base);
  });
  return Array.from(stems).filter(Boolean).sort((a, b) => b.length - a.length);
};

export const findReadingSegments = (word: string, reading: string, kanji: KanjiItem) => {
  if (!reading) return { prefix: '', target: word || '', suffix: '' };
  const cleanReading = reading.trim();
  const char = kanji?.character;
  const kanjiIdx = word ? word.indexOf(char) : -1;

  // Method 1: Okurigana alignment (if word has kana before/after target kanji)
  if (kanjiIdx !== -1 && word) {
    const wordPrefix = word.slice(0, kanjiIdx);
    const wordSuffix = word.slice(kanjiIdx + 1);
    const isSuffixAllKana = wordSuffix.length > 0 && /^[\u3040-\u309F]+$/.test(wordSuffix);
    const isPrefixAllKana = wordPrefix.length > 0 && /^[\u3040-\u309F]+$/.test(wordPrefix);

    if (isSuffixAllKana && cleanReading.endsWith(wordSuffix)) {
      const rest = cleanReading.slice(0, cleanReading.length - wordSuffix.length);
      if (isPrefixAllKana && rest.startsWith(wordPrefix)) {
        return {
          prefix: wordPrefix,
          target: rest.slice(wordPrefix.length),
          suffix: wordSuffix,
        };
      } else if (!wordPrefix) {
        return {
          prefix: '',
          target: rest,
          suffix: wordSuffix,
        };
      }
    }
  }

  // Method 2: Match known stems (onyomi & kunyomi with sokuon and rendaku variations)
  const stems = getKanjiStems(kanji);
  for (const stem of stems) {
    if (cleanReading.includes(stem)) {
      if (kanjiIdx === 0 && cleanReading.startsWith(stem)) {
        return {
          prefix: '',
          target: stem,
          suffix: cleanReading.slice(stem.length),
        };
      }
      if (kanjiIdx !== -1 && kanjiIdx === word.length - 1 && cleanReading.endsWith(stem)) {
        return {
          prefix: cleanReading.slice(0, cleanReading.length - stem.length),
          target: stem,
          suffix: '',
        };
      }
      const idx = cleanReading.indexOf(stem);
      return {
        prefix: cleanReading.substring(0, idx),
        target: stem,
        suffix: cleanReading.substring(idx + stem.length),
      };
    }
  }

  return { prefix: '', target: cleanReading, suffix: '' };
};

export const renderWordWithKanjiHighlight = (word: string, targetChar: string) => {
  if (!word) return null;
  if (!targetChar || !word.includes(targetChar)) {
    return <span className="font-jp font-bold text-text-primary">{word}</span>;
  }

  return (
    <span className="inline-flex items-center justify-center font-jp font-bold tracking-wide">
      {Array.from(word).map((ch, idx) => {
        if (ch === targetChar) {
          return (
            <span
              key={idx}
              className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 rounded-lg bg-wine-accent/15 dark:bg-wine-accent/30 text-wine-accent dark:text-rose-300 font-black border border-wine-accent/40 shadow-xs ring-1 ring-wine-accent/20"
            >
              {ch}
            </span>
          );
        }
        return (
          <span key={idx} className="text-text-primary/75 dark:text-text-primary/80 font-semibold px-0.5">
            {ch}
          </span>
        );
      })}
    </span>
  );
};

/**
 * Splits a reading string that may contain multiple alternative readings.
 * Delimiters supported:
 * - slashes: '/' or '／'
 * - Japanese commas: '、'
 * - Standard commas/semicolons: ',' or ';'
 * - Multiple consecutive spaces: '\s{2,}'
 */
export const parseReadingVariations = (reading?: string): string[] => {
  if (!reading) return [];
  const normalized = reading
    .replace(/／/g, '/')
    .replace(/、/g, '/')
    .replace(/[,;]/g, '/')
    .replace(/\s{2,}/g, '/');

  return normalized
    .split('/')
    .map(r => r.trim())
    .filter(Boolean);
};

/**
 * Formats a reading string canonically with ' / ' separator if multiple variations exist.
 */
export const formatNormalizedReading = (reading?: string): string => {
  const variations = parseReadingVariations(reading);
  if (variations.length <= 1) return reading?.trim() || '';
  return variations.join(' / ');
};

export const getHighlightedYomikata = (word: string, reading: string, kanji: KanjiItem) => {
  if (!reading) return <span className="text-wine-accent font-bold">{word}</span>;

  // Handle alternative readings (slashes, double spaces, commas, etc.)
  const readings = parseReadingVariations(reading);

  return (
    <div className="inline-flex flex-wrap items-center justify-center gap-1.5 font-jp text-sm sm:text-base">
      {readings.map((singleReading, rIdx) => {
        const seg = findReadingSegments(word, singleReading, kanji);
        return (
          <React.Fragment key={rIdx}>
            {rIdx > 0 && <span className="text-text-muted/50 px-0.5">/</span>}
            {seg.target && seg.target !== singleReading ? (
              <span className="inline-flex items-center gap-0.5">
                {seg.prefix && (
                  <span className="text-text-secondary/60 dark:text-text-secondary/70 font-medium tracking-normal px-0.5">
                    {seg.prefix}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md bg-wine-accent/15 dark:bg-wine-accent/30 text-wine-accent dark:text-rose-300 font-extrabold border border-wine-accent/35 shadow-xs tracking-wider">
                  {seg.target}
                </span>
                {seg.suffix && (
                  <span className="text-text-secondary/60 dark:text-text-secondary/70 font-medium tracking-normal px-0.5">
                    {seg.suffix}
                  </span>
                )}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-wine-accent/15 dark:bg-wine-accent/30 text-wine-accent dark:text-rose-300 font-extrabold border border-wine-accent/35 shadow-xs tracking-wider">
                {singleReading}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

