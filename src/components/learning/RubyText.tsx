import React, { useMemo } from 'react';
import { alignKanjiReadings } from '../../utils/furiganaUtils';

interface RubyTextProps {
  japanese: string;
  reading: string;
  showFurigana?: boolean;
  excludeKanji?: string[];
  highlightKanji?: string;
  className?: string;
}

/**
 * RubyText — Renders Japanese text with inline <ruby><rt> furigana annotations.
 *
 * Aligns kanji in the `japanese` string with their readings from the `reading` string,
 * wrapping kanji in <ruby> tags for native browser furigana rendering.
 *
 * @param japanese     - The Japanese text containing kanji
 * @param reading      - The full reading (hiragana/katakana, no kanji)
 * @param showFurigana - Whether to show furigana (controlled by user settings)
 * @param excludeKanji - Kanji characters to NOT annotate (for quiz/test mode)
 * @param highlightKanji - Kanji character to highlight (for example display)
 * @param className    - Additional CSS classes for the wrapper span
 */
export const RubyText: React.FC<RubyTextProps> = ({
  japanese,
  reading,
  showFurigana = true,
  excludeKanji,
  highlightKanji,
  className = '',
}) => {
  const segments = useMemo(() => {
    if (!showFurigana || !japanese || !reading) {
      return null;
    }
    const excludeSet = excludeKanji ? new Set<string>(excludeKanji) : undefined;
    return alignKanjiReadings(japanese, reading, excludeSet);
  }, [japanese, reading, showFurigana, excludeKanji]);

  const renderSegmentText = (text: string) => {
    if (!highlightKanji) return text;
    return text.split('').map((char, i) => (
      char === highlightKanji ? <span key={i} className="text-amber-400 font-bold drop-shadow-md">{char}</span> : <span key={i}>{char}</span>
    ));
  };

  // If furigana is disabled or alignment failed, render plain text
  if (!showFurigana || !segments) {
    return <span className={`font-jp ${className}`}>{renderSegmentText(japanese)}</span>;
  }

  // Check if any segment actually has ruby — if not, render plain
  const hasRuby = segments.some(s => s.isKanji && s.ruby);
  if (!hasRuby) {
    return <span className={`font-jp ${className}`}>{renderSegmentText(japanese)}</span>;
  }

  return (
    <span className={`ruby-text font-jp ${className}`}>
      {segments.map((segment, index) => {
        if (segment.isKanji && segment.ruby) {
          return (
            <ruby key={index} className="ruby-word">
              {renderSegmentText(segment.text)}
              <rt>{segment.ruby}</rt>
            </ruby>
          );
        }
        return <span key={index}>{renderSegmentText(segment.text)}</span>;
      })}
    </span>
  );
};
