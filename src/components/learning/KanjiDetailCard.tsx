import React, { useState } from 'react';
import { Edit3, Volume2, ArrowLeft, HelpCircle } from 'lucide-react';
import { KanjiItem } from '../../types/content';
import { KanjiWritingCanvas } from './KanjiWritingCanvas';
import { RubyText } from './RubyText';
import { ErrorBoundary } from '../ErrorBoundary';
import { speakJapanese, playSound } from '../../utils/audio';
import { WritingRewardResult } from '../../utils/rewards';

export const getHighlightedYomikata = (word: string, reading: string, kanji: KanjiItem) => {
  if (!reading) return <span className="text-wine-accent font-bold">{word}</span>;

  const getCleanReadings = (arr: string[], isOnyomi: boolean) => {
    return (arr || []).map(r => {
      let base = r.split(' ')[0];
      if (base.includes('・')) {
        base = base.split('・')[0];
      }
      if (isOnyomi) {
        base = base.replace(/[\u30a1-\u30f6]/g, function(match) {
          return String.fromCharCode(match.charCodeAt(0) - 0x60);
        });
      }
      return base;
    });
  };

  const onReadings = getCleanReadings(kanji?.onyomi || [], true);
  const kunReadings = getCleanReadings(kanji?.kunyomi || [], false);
  const allReadings = [...onReadings, ...kunReadings].filter(Boolean).sort((a, b) => b.length - a.length);

  for (const r of allReadings) {
    if (reading.includes(r)) {
      const idx = reading.indexOf(r);
      return (
        <>
          <span className="text-text-muted">{reading.substring(0, idx)}</span>
          <span className="text-wine-accent font-bold drop-shadow-sm">{r}</span>
          <span className="text-text-muted">{reading.substring(idx + r.length)}</span>
        </>
      );
    }
  }

  return <span className="text-wine-accent font-bold drop-shadow-sm">{reading}</span>;
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
    ? 'HIRAGANA'
    : isKatakana
      ? 'KATAKANA'
      : isSuuji
        ? 'ANGKA / SŪJI'
        : `${item.jlpt || 'N3'} Kanji`;

  const levelBadgeClass = isHiragana
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : isKatakana
      ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
      : isSuuji
        ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
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
            <span>✍️ Latihan 7 Sheet</span>
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
            <span>Buka Kanvas Latihan Menulis (7 Sheet)</span>
          </button>
        </div>
      ) : (
        /* Kanji Writing Practice 7-Sheet Canvas Studio */
        <div className="panel p-5 sm:p-6 space-y-4 text-center">
          <div>
            {/* Highlighted Yomikata / Reading Header */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-3 min-h-[48px]">
              {item.relatedWords && item.relatedWords.length > 0 ? (
                item.relatedWords.slice(0, 2).map((rw, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center group cursor-pointer"
                    onClick={() => speakJapanese(rw.word)}
                    title="Klik untuk mendengar"
                  >
                    <div className="text-2xl sm:text-3xl font-bold font-jp tracking-widest drop-shadow-sm mb-1 flex items-center gap-1.5">
                      {getHighlightedYomikata(rw.word, rw.reading, item)}
                      <Volume2 className="w-4 h-4 text-text-muted opacity-60 group-hover:text-wine-accent transition-colors" />
                    </div>
                    <span className="text-[11px] text-text-secondary mt-0.5">{rw.meaningId}</span>
                  </div>
                ))
              ) : (
                <div
                  className="flex flex-col items-center group cursor-pointer"
                  onClick={() =>
                    speakJapanese(
                      item.kunyomi?.[0]?.replace(/[.-]/g, '') || item.onyomi?.[0] || item.character
                    )
                  }
                  title="Klik untuk mendengar"
                >
                  <div className="text-2xl sm:text-3xl font-bold font-jp text-wine-accent drop-shadow-sm mb-1 flex items-center gap-1.5">
                    <span>
                      {item.kunyomi?.[0]?.replace(/[.-]/g, '') ||
                        item.onyomi?.[0] ||
                        item.character}
                    </span>
                    <Volume2 className="w-4 h-4 text-text-muted opacity-60 group-hover:text-wine-accent transition-colors" />
                  </div>
                  <span className="text-[11px] text-text-secondary mt-0.5">{item.meaningId}</span>
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
              totalSheets={7}
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
