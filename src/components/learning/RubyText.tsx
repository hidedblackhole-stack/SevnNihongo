import React, { useMemo } from 'react';
import { getFuriganaSegments } from '../../utils/furiganaUtils';

export interface RubyTextProps {
  japanese?: string;
  text?: string;
  reading?: string;
  ruby?: string;
  showFurigana?: boolean;
  excludeKanji?: string[];
  highlightKanji?: string;
  className?: string;
}

/**
 * RubyText — Renders Japanese text with inline <ruby><rt> furigana annotations.
 *
 * Supports polymorphic prop naming (japanese/text, reading/ruby).
 * If no reading is provided, automatically looks up kanji compounds in the furigana dictionary.
 */
export const RubyText: React.FC<RubyTextProps> = ({
  japanese,
  text,
  reading,
  ruby,
  showFurigana = true,
  excludeKanji,
  highlightKanji,
  className = '',
}) => {
  const actualJapanese = (japanese ?? text ?? '').trim();
  const actualReading = (reading ?? ruby ?? '').trim();

  const segments = useMemo(() => {
    if (!showFurigana || !actualJapanese) {
      return null;
    }
    const excludeSet = excludeKanji ? new Set<string>(excludeKanji) : undefined;
    return getFuriganaSegments(actualJapanese, actualReading || undefined, excludeSet);
  }, [actualJapanese, actualReading, showFurigana, excludeKanji]);

  const renderSegmentText = (str: string) => {
    if (!highlightKanji) return str;
    return str.split('').map((char, i) => (
      char === highlightKanji ? (
        <span key={i} className="text-red-700 dark:text-amber-400 font-bold">{char}</span>
      ) : (
        <span key={i}>{char}</span>
      )
    ));
  };

  // If furigana is disabled or no segments generated, render plain text
  if (!showFurigana || !segments || segments.length === 0) {
    return <span className={`font-jp ${className}`}>{renderSegmentText(actualJapanese)}</span>;
  }

  const hasRuby = segments.some(s => s.isKanji && s.ruby);
  if (!hasRuby) {
    return <span className={`font-jp ${className}`}>{renderSegmentText(actualJapanese)}</span>;
  }

  return (
    <span className={`ruby-text font-jp leading-relaxed ${className}`}>
      {segments.map((segment, index) => {
        if (segment.isKanji && segment.ruby) {
          return (
            <ruby key={index} className="ruby-word">
              {renderSegmentText(segment.text)}
              <rp>(</rp>
              <rt className="text-[0.62em] font-semibold leading-none select-none text-[#3f3a32] dark:text-[#f0be52] font-jp tracking-tight">
                {segment.ruby}
              </rt>
              <rp>)</rp>
            </ruby>
          );
        }
        return <span key={index}>{renderSegmentText(segment.text)}</span>;
      })}
    </span>
  );
};
