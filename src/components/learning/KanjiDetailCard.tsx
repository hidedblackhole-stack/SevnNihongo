import React, { useState } from 'react';
import { Edit3, Volume2, ArrowLeft, HelpCircle } from 'lucide-react';
import { KanjiItem } from '../../types/content';
import { KanjiWritingCanvas } from './KanjiWritingCanvas';
import { RubyText } from './RubyText';
import { ErrorBoundary } from '../ErrorBoundary';
import { speakJapanese, playSound } from '../../utils/audio';
import { WritingRewardResult } from '../../utils/rewards';

const kataToHira = (str: string) => {
  return str.replace(/[\u30a1-\u30f6]/g, m => String.fromCharCode(m.charCodeAt(0) - 0x60));
};

const rendakuMap: Record<string, string> = {
  'か': 'が', 'き': 'ぎ', 'く': 'ぐ', 'け': 'げ', 'こ': 'ご',
  'さ': 'ざ', 'し': 'じ', 'す': 'ず', 'せ': 'ぜ', 'そ': 'ぞ',
  'た': 'だ', 'ち': 'ぢ', 'つ': 'づ', 'て': 'で', 'と': 'ど',
  'は': 'ば', 'ひ': 'び', 'ふ': 'ぶ', 'へ': 'べ', 'ほ': 'ぼ',
};

const handakutenMap: Record<string, string> = {
  'は': 'ぱ', 'ひ': 'ぴ', 'ふ': 'ぷ', 'へ': 'ぺ', 'ほ': 'ぽ',
};

const getKanjiStems = (kanji: KanjiItem): string[] => {
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

export const getHighlightedYomikata = (word: string, reading: string, kanji: KanjiItem) => {
  if (!reading) return <span className="text-wine-accent font-bold">{word}</span>;

  // Handle slash-separated readings if any (e.g. 'まいつき / まいげつ')
  const readings = reading.split('/').map(r => r.trim());

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

export interface KanjiDetailCardProps {
  item: KanjiItem;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
  initialTab?: 'detail' | 'writing';
  onCompleteSheet?: (sheetNumber: number, score: number, reward?: WritingRewardResult) => void;
  onFinish?: (reward?: WritingRewardResult) => void;
  onBack?: () => void;
  backButtonLabel?: string;
  showQuestions?: boolean;
}

export const KanjiDetailCard: React.FC<KanjiDetailCardProps> = ({
  item,
  soundEnabled = true,
  furiganaEnabled = true,
  initialTab = 'detail',
  onCompleteSheet,
  onFinish,
  onBack,
  backButtonLabel = 'Kembali ke Daftar Kanji',
  showQuestions = true,
}) => {
  const [detailSubTab, setDetailSubTab] = useState<'detail' | 'writing'>(initialTab);

  const isHiragana = item.radical === 'Hiragana' || (item.jlpt === 'KANA' && item.character >= 'ぁ' && item.character <= 'ん');
  const isKatakana = item.radical === 'Katakana' || (item.jlpt === 'KANA' && item.character >= 'ァ' && item.character <= 'ン');
  const isKana = isHiragana || isKatakana;
  const isSuuji = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', '零'].includes(item.character);

  const levelBadgeLabel = isHiragana
    ? 'Hiragana'
    : isKatakana
      ? 'Katakana'
      : isSuuji
        ? 'Angka / Sūji'
        : `${item.jlpt || 'N3'} Kanji`;

  const levelBadgeClass = isHiragana
    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    : isKatakana
      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
      : isSuuji
        ? 'bg-indigo/15 text-indigo dark:text-indigo-soft border-indigo/30'
        : 'bg-surface-inset text-wine-accent border-wine-accent/30';

  return (
    <div className="space-y-4 w-full">
      {/* Navigation & Sub-tab Switcher */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {onBack ? (
          <button
            onClick={() => {
              onBack();
              playSound('click', soundEnabled);
            }}
            className="btn btn-pill text-xs gap-1.5"
          >
            <ArrowLeft className="w-4 h-4 text-wine-accent" />
            <span>{backButtonLabel}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${levelBadgeClass}`}>
              {levelBadgeLabel}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-surface-inset border border-border-subtle text-text-secondary">
              {item.strokeCount} Goresan
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setDetailSubTab('detail');
              playSound('click', soundEnabled);
            }}
            className={`btn btn-pill text-xs ${
              detailSubTab === 'detail'
                ? 'ring-1 ring-wine-accent/50 text-wine-accent font-bold'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            📖 Detail & Arti
          </button>
          <button
            onClick={() => {
              setDetailSubTab('writing');
              playSound('click', soundEnabled);
            }}
            className={`btn btn-pill text-xs flex items-center gap-1 ${
              detailSubTab === 'writing'
                ? 'ring-1 ring-wine-accent/50 text-wine-accent font-bold'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            <Edit3 className="w-3 h-3 text-wine-accent" />
            <span>✍️ Latihan Menulis</span>
          </button>
        </div>
      </div>

      {detailSubTab === 'detail' ? (
        /* Kanji Detail View */
        <div className="panel panel-stitched p-6 space-y-6 shadow-xl">
          {/* Giant Character & Hero Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-border-subtle">
            {/* Giant Kanji Character Frame - Hanko Red stamp motif */}
            <div className="relative group w-32 h-32 rounded-3xl bg-surface-inset border-2 border-wine-accent/40 flex items-center justify-center text-7xl font-bold text-wine-accent font-jp shadow-inner shrink-0 select-none">
              {item.character}
              <button
                onClick={() => {
                  const readingToSpeak =
                    item.kunyomi?.[0]?.replace(/[.-]/g, '') || item.onyomi?.[0] || item.character;
                  speakJapanese(readingToSpeak);
                }}
                className="absolute -bottom-2 -right-2 p-2.5 rounded-full bg-surface-card border border-border-subtle text-text-muted hover:text-wine-accent shadow-md transition-all"
                title="Dengar pelafalan"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold font-mono ${levelBadgeClass}`}>
                  {levelBadgeLabel}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-surface-inset text-text-secondary border border-border-subtle text-xs font-mono">
                  {item.strokeCount} Goresan
                </span>
                {item.radical && (
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-inset text-text-secondary border border-border-subtle text-xs font-jp">
                    {isKana ? 'Kategori: ' : '部首: '}{item.radical} {item.radicalName ? `(${item.radicalName})` : ''}
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-bold font-heading text-text-primary">
                {item.meaningId}
              </h3>
              {item.meaningEn && (
                <p className="text-xs text-text-secondary">
                  Arti Inggris: {item.meaningEn}
                  {item.radicalName ? ` • Radikal Asal: ${item.radicalName}` : ''}
                </p>
              )}
              <p className="text-[11px] text-text-muted pt-0.5">
                ID Entitas: <span className="font-mono text-text-primary font-bold">{item.id}</span>
              </p>
            </div>
          </div>

          {/* Readings Section: Kana uses Romaji & Pronunciation, Kanji/Suuji uses Onyomi & Kunyomi */}
          {isKana ? (
            <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
              <span className="text-[11px] font-bold text-wine-accent uppercase tracking-wider font-mono">
                発音 (Pelafalan Romaji & Suara)
              </span>
              <div className="flex items-center gap-3 pt-1">
                <div className="text-xl font-bold text-text-primary font-mono px-3 py-1 rounded-xl bg-surface-card border border-border-subtle">
                  {item.kunyomi?.[0] || item.onyomi?.[0] || item.character}
                </div>
                <button
                  onClick={() => speakJapanese(item.character)}
                  className="px-3 py-1.5 rounded-xl bg-wine-accent/15 text-wine-accent border border-wine-accent/30 font-bold hover:bg-wine-accent/25 flex items-center gap-2 transition-colors text-xs font-mono"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Putar Suara</span>
                </button>
                <span className="text-xs text-text-secondary">
                  {isHiragana ? 'Aksara Fonetik Hiragana (Seion)' : 'Aksara Fonetik Katakana (Seion)'}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Onyomi */}
              <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                <span className="text-[11px] font-bold text-wine-accent uppercase tracking-wider font-mono">
                  音読み (Onyomi - Bacaan Cina)
                </span>
                <div className="text-base font-bold text-text-primary font-mono flex flex-wrap gap-2 pt-1">
                  {(item.onyomi || []).length > 0 ? (
                    item.onyomi.map((on, i) => (
                      <button
                        key={i}
                        onClick={() => speakJapanese(on.split(' ')[0])}
                        className="px-2.5 py-1 rounded-lg bg-surface-card text-wine-accent border border-wine-accent/20 font-bold hover:border-wine-accent/50 flex items-center gap-1.5 transition-colors text-xs font-jp"
                        title="Klik untuk mendengar"
                      >
                        <span>{on}</span>
                        <Volume2 className="w-3 h-3 text-wine-accent/60" />
                      </button>
                    ))
                  ) : (
                    <span className="text-text-muted text-xs italic">-</span>
                  )}
                </div>
              </div>

              {/* Kunyomi */}
              <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                <span className="text-[11px] font-bold text-state-success uppercase tracking-wider font-mono">
                  訓読み (Kunyomi - Bacaan Jepang)
                </span>
                <div className="text-base font-bold text-text-primary font-mono flex flex-wrap gap-2 pt-1">
                  {(item.kunyomi || []).length > 0 ? (
                    item.kunyomi.map((kun, i) => (
                      <button
                        key={i}
                        onClick={() => speakJapanese(kun.split(' ')[0].replace(/[.-]/g, ''))}
                        className="px-2.5 py-1 rounded-lg bg-surface-card text-state-success border border-state-success/20 font-bold hover:border-state-success/50 flex items-center gap-1.5 transition-colors text-xs font-jp"
                        title="Klik untuk mendengar"
                      >
                        <span>{kun}</span>
                        <Volume2 className="w-3 h-3 text-state-success/60" />
                      </button>
                    ))
                  ) : (
                    <span className="text-text-muted text-xs italic">-</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Related Vocabulary Words */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary font-mono">
              <span>{isKana ? `Kosakata Mengandung Huruf 「${item.character}」` : `Kosakata Terkait Mengandung Kanji 「${item.character}」`}</span>
            </div>
            {item.relatedWords && item.relatedWords.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {item.relatedWords.map((rw, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between gap-2 hover:border-border-muted transition-colors"
                  >
                    <div>
                      {furiganaEnabled ? (
                        <p className="text-base font-bold text-text-primary">
                          <RubyText
                            japanese={rw.word}
                            reading={rw.reading}
                            showFurigana={furiganaEnabled}
                            highlightKanji={item.character}
                          />
                        </p>
                      ) : (
                        <>
                          <p className="text-[11px] text-wine-accent font-mono">{rw.reading}</p>
                          <p className="text-base font-bold text-text-primary font-jp">{rw.word}</p>
                        </>
                      )}
                      <p className="text-xs text-text-secondary mt-0.5">{rw.meaningId}</p>
                    </div>
                    <button
                      onClick={() => speakJapanese(rw.word)}
                      className="p-2 rounded-xl bg-surface-card hover:bg-surface-elevated text-wine-accent border border-border-subtle transition-colors"
                      title="Dengar pengucapan"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle text-xs text-text-secondary text-center">
                Aksara ini berfokus pada penguasaan bentuk, goresan stroke, dan bacaan dasar.
              </div>
            )}
          </div>

          {/* Attached Practice Questions */}
          {showQuestions && item.questions && item.questions.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase font-mono">
                <HelpCircle className="w-3.5 h-3.5 text-text-muted" />
                <span>{isKana ? `Contoh Soal Pengujian Huruf 「${item.character}」` : `Contoh Soal Pengujian Kanji 「${item.character}」`} ({item.questions.length} Soal)</span>
              </div>
              <div className="space-y-2">
                {item.questions.slice(0, 3).map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-surface-card border border-border-subtle space-y-1.5 text-xs"
                  >
                    <p className="font-medium text-text-primary">{q.prompt}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {q.options.map((opt, oIdx) => (
                        <span
                          key={oIdx}
                          className={`px-2 py-0.5 rounded-md font-jp text-[11px] ${
                            oIdx === q.correctIndex
                              ? 'bg-surface-inset border border-gold/40 text-text-primary font-bold'
                              : 'bg-surface-inset text-text-muted opacity-75'
                          }`}
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Switch to Writing Practice CTA */}
          <button
            onClick={() => {
              setDetailSubTab('writing');
              playSound('click', soundEnabled);
            }}
            className="w-full py-3.5 rounded-2xl btn-cta font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            <span>Buka Kanvas Latihan Menulis</span>
          </button>
        </div>
      ) : (
        /* Kanji Writing Practice Canvas */
        <div className="panel p-5 sm:p-6 space-y-4 text-center">
          <div>
            {/* Highlighted Yomikata / Reading Header (Hidden Kanji to test recall in writing mode) */}
            <div className="flex flex-wrap items-stretch justify-center gap-3 sm:gap-4 mb-4 min-h-[52px]">
              {item.relatedWords && item.relatedWords.length > 0 ? (
                item.relatedWords.slice(0, 2).map((rw, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-between px-3.5 py-2.5 rounded-2xl bg-surface-card/85 dark:bg-surface-card/50 border border-border-default hover:border-wine-accent/50 hover:shadow-md transition-all shadow-xs group cursor-pointer min-w-[135px] max-w-[220px]"
                    onClick={() => speakJapanese(rw.word)}
                    title="Klik untuk mendengar audio kata ini"
                  >
                    {/* Yomikata Reading with high-contrast target badge */}
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <div className="text-xl sm:text-2xl font-bold font-jp">
                        {getHighlightedYomikata(rw.word, rw.reading, item)}
                      </div>
                      <Volume2 className="w-4 h-4 text-text-muted opacity-60 group-hover:text-wine-accent group-hover:scale-110 transition-all flex-shrink-0" />
                    </div>

                    {/* Indonesian meaning */}
                    <span className="text-[11px] text-text-secondary text-center leading-tight line-clamp-2 mt-0.5 font-medium">
                      {rw.meaningId}
                    </span>
                  </div>
                ))
              ) : (
                <div
                  className="flex flex-col items-center justify-between px-4 py-2.5 rounded-2xl bg-surface-card/85 dark:bg-surface-card/50 border border-border-default group cursor-pointer"
                  onClick={() =>
                    speakJapanese(
                      item.kunyomi?.[0]?.replace(/[.-]/g, '') || item.onyomi?.[0] || item.character
                    )
                  }
                  title="Klik untuk mendengar"
                >
                  <div className="text-xl sm:text-2xl font-bold font-jp text-wine-accent drop-shadow-sm mb-1 flex items-center gap-1.5">
                    <span>
                      {item.kunyomi?.[0]?.replace(/[.-]/g, '') ||
                        item.onyomi?.[0] ||
                        ''}
                    </span>
                    <Volume2 className="w-4 h-4 text-text-muted opacity-60 group-hover:text-wine-accent transition-colors" />
                  </div>
                  <span className="text-[11px] text-text-secondary mt-0.5 font-medium">{item.meaningId}</span>
                </div>
              )}
            </div>

            {/* Readings (ON / KUN or ROMAJI) and Meaning Pill Badge */}
            <div className="flex flex-col items-center justify-center gap-1.5 text-xs">
              {isKana ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted font-bold bg-surface-inset px-2 py-0.5 rounded text-[10px] font-mono">
                    ROMAJI
                  </span>
                  <span className="text-wine-accent font-mono font-bold tracking-wider">
                    {item.kunyomi?.[0] || item.onyomi?.[0] || item.character}
                  </span>
                </div>
              ) : (
                <>
                  {item.onyomi && item.onyomi.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <span className="text-text-muted font-bold bg-surface-inset px-1.5 py-0.5 rounded text-[10px]">
                        ON
                      </span>
                      <span className="text-wine-accent font-jp tracking-wider font-medium">
                        {item.onyomi.join(', ')}
                      </span>
                    </div>
                  )}
                  {item.kunyomi && item.kunyomi.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <span className="text-text-muted font-bold bg-surface-inset px-1.5 py-0.5 rounded text-[10px]">
                        KUN
                      </span>
                      <span className="text-state-success font-jp tracking-wider font-medium">
                        {item.kunyomi.join(', ')}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="text-text-primary mt-2 font-medium px-3.5 py-1.5 bg-surface-inset rounded-xl border border-border-subtle shadow-sm">
                {item.meaningId}
              </div>
            </div>
          </div>

          <ErrorBoundary>
            <KanjiWritingCanvas
              kanjiChar={item.character}
              totalSheets={1}
              strokeCount={item.strokeCount}
              meaning={item.meaningId}
              kunyomi={item.kunyomi?.[0] || ''}
              onyomi={item.onyomi?.[0] || ''}
              soundEnabled={soundEnabled}
              level={item.jlpt}
              onCompleteSheet={onCompleteSheet}
              onFinish={onFinish}
            />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
};
