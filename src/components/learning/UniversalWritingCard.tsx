import React from 'react';
import { KanjiWritingCanvas } from './KanjiWritingCanvas';
import { KotobaWritingPractice } from './KotobaWritingPractice';
import { ResolvedDeckItem } from '../../utils/decks';
import { KanjiItem, KotobaItem } from '../../types/content';
import { WritingRewardResult } from '../../utils/rewards';

export type UniversalWritingItem =
  | ResolvedDeckItem
  | KanjiItem
  | KotobaItem
  | {
      id?: string;
      category?: 'kanji' | 'kotoba' | 'bunpou';
      displayTitle?: string;
      displayReading?: string;
      displayMeaning?: string;
      level?: string;
      kanji?: KanjiItem;
      kotoba?: KotobaItem;
      character?: string;
      word?: string;
      [key: string]: any;
    };

export interface UniversalWritingCardProps {
  item: UniversalWritingItem;
  onFinish: (score: number, reward?: WritingRewardResult) => void;
  soundEnabled?: boolean;
  totalSheets?: number;
  showStopwatch?: boolean;
  className?: string;
}

export const UniversalWritingCard: React.FC<UniversalWritingCardProps> = ({
  item,
  onFinish,
  soundEnabled = true,
  totalSheets = 1,
  showStopwatch = true,
  className = '',
}) => {
  const raw = item as any;

  // 1. Detect if it is Kanji
  const isKanji =
    raw.category === 'kanji' ||
    Boolean(raw.kanji) ||
    (Boolean(raw.character) && typeof raw.strokeCount === 'number');

  if (isKanji) {
    const kanji: KanjiItem = raw.kanji || raw;
    const kanjiChar = kanji.character || raw.displayTitle || '';
    const meaning = kanji.meaningId || kanji.meaningEn || raw.displayMeaning || '';
    const onyomiStr = Array.isArray(kanji.onyomi) ? kanji.onyomi.join('、') : (kanji.onyomi || '');
    const kunyomiStr = Array.isArray(kanji.kunyomi) ? kanji.kunyomi.join('、') : (kanji.kunyomi || '');

    return (
      <div className={`w-full flex justify-center ${className}`}>
        <KanjiWritingCanvas
          kanjiChar={kanjiChar}
          level={kanji.jlpt || raw.level || 'N5'}
          meaning={meaning}
          strokeCount={kanji.strokeCount}
          onyomi={onyomiStr}
          kunyomi={kunyomiStr}
          soundEnabled={soundEnabled}
          totalSheets={totalSheets}
          showStopwatch={showStopwatch}
          onCompleteSheet={(_sheet, score, reward) => {
            if (totalSheets === 1) {
              onFinish(score, reward);
            }
          }}
          onFinish={(reward) => {
            onFinish(100, reward);
          }}
        />
      </div>
    );
  }

  // 2. Kotoba or general word
  const kotoba: KotobaItem =
    raw.kotoba ||
    (raw.word
      ? raw
      : {
          id: raw.id || 'custom_kotoba_write',
          word: raw.displayTitle || '日本',
          reading: raw.displayReading || 'にほん',
          meaningId: raw.displayMeaning || 'Jepang',
          meaningEn: 'Japan',
          meaningJa: '日本',
          jlpt: raw.level || 'N5',
          wordType: 'noun',
          kanjiComponents: Array.from(raw.displayTitle || '日本'),
          exampleSentence: {
            japanese: `${raw.displayTitle || '日本'}へ行きます。`,
            reading: `${raw.displayReading || 'にほん'}へいきます。`,
            meaningId: `Pergi ke ${raw.displayMeaning || 'Jepang'}.`,
          },
        });

  return (
    <div className={`w-full ${className}`}>
      <KotobaWritingPractice
        kotoba={kotoba}
        soundEnabled={soundEnabled}
        onFinishWord={(score, reward) => {
          onFinish(score, reward);
        }}
      />
    </div>
  );
};
