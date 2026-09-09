import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Feather, BookOpen, Edit3, Sparkles, Volume2, ArrowLeft } from 'lucide-react';
import { KanjiItem, Question } from '../../types/content';
import { KANJI_DATABASE, STAGE_1_KANJI_QUIZ } from '../../data/kanji';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KanjiWritingCanvas } from './KanjiWritingCanvas';
import { QuizEngine } from './QuizEngine';
import { speakJapanese, playSound } from '../../utils/audio';
import { RubyText } from './RubyText';
import { ErrorBoundary } from '../ErrorBoundary';

const getHighlightedYomikata = (word: string, reading: string, kanji: KanjiItem) => {
  if (!reading) return <span className="text-wine-accent font-bold">{word}</span>;
  
  const getCleanReadings = (arr: string[], isOnyomi: boolean) => {
    return arr.map(r => {
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

interface KanjiModuleProps {
  kanjiIds: string[];
  onReward: (exp: number, gold: number, moduleId: string, itemId?: string, score?: number, total?: number) => void;
  onBack: () => void;
  playerMp: number;
  playerInt: number;
  onUseMp: (amount: number) => boolean;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
}

export const KanjiModule: React.FC<KanjiModuleProps> = ({
  kanjiIds,
  onReward,
  onBack,
  playerMp,
  playerInt,
  onUseMp,
  soundEnabled = true,
  furiganaEnabled = true,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'quiz'>('list');
  const [selectedKanjiId, setSelectedKanjiId] = useState<string | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<'detail' | 'writing'>('detail');
  const [isQuizActive, setIsQuizActive] = useState(false);

  const fallbackKanji: KanjiItem = {
    id: 'kanji_001',
    character: '関',
    meaningId: 'Hubungan / Relasi',
    meaningEn: 'connection, barrier',
    onyomi: ['カン (KAN)'],
    kunyomi: ['せき (seki)', 'かか.わる (kaka.waru)'],
    jlpt: 'N3',
    strokeCount: 14,
    radical: '門 (mon)',
    radicalName: 'Mon (もん)',
    relatedWords: [
      { word: '関係', reading: 'かんけい', meaningId: 'Hubungan / Relasi' },
      { word: '玄関', reading: 'げんかん', meaningId: 'Pintu masuk' }
    ],
    questions: []
  };

  const kanjiList: KanjiItem[] = kanjiIds.map(id => KANJI_DATABASE[id]).filter(Boolean);
  const safeKanjiList = kanjiList.length > 0 ? kanjiList : [fallbackKanji];
  const activeKanji: KanjiItem = (selectedKanjiId ? KANJI_DATABASE[selectedKanjiId] : safeKanjiList[0]) || fallbackKanji;

  const handlePlayAudio = (text: string) => {
    speakJapanese(text);
  };

  const generateKanjiQuestions = (pool: KanjiItem[]) => {
    return pool.map((item, idx) => {
      const qType = Math.floor(Math.random() * 3);
      
      let prompt = '';
      let correctAns = '';
      let distractors: string[] = [];
      
      const otherKanjis = Object.values(KANJI_DATABASE)
        .filter(k => k.id !== item.id)
        .sort(() => 0.5 - Math.random());

      if (qType === 0) {
        prompt = `Apa arti dari Kanji berikut?\n\n${item.character}`;
        correctAns = item.meaningId;
        distractors = Array.from(new Set(otherKanjis.map(k => k.meaningId))).slice(0, 3);
      } else if (qType === 1) {
        prompt = `Pilih Kanji yang tepat untuk arti:\n\n"${item.meaningId}"`;
        correctAns = item.character;
        distractors = Array.from(new Set(otherKanjis.map(k => k.character))).slice(0, 3);
      } else {
        prompt = `Pilih cara baca (Onyomi/Kunyomi) yang tepat untuk Kanji:\n\n${item.character}`;
        correctAns = [...(item.onyomi || []), ...(item.kunyomi || [])].join(', ') || item.character;
        distractors = Array.from(new Set(otherKanjis.map(k => [...(k.onyomi || []), ...(k.kunyomi || [])].join(', ') || k.character))).slice(0, 3);
      }

      while (distractors.length < 3) {
        distractors.push(['Melakukan kegiatan', 'Menyatakan keadaan', 'Sesuatu yang besar'][distractors.length]);
      }

      const options = [correctAns, ...distractors].sort(() => 0.5 - Math.random());
      const correctIndex = options.indexOf(correctAns);

      return {
        id: `kanji_q_${item.id}_${qType}`,
        prompt,
        options,
        correctIndex,
        explanation: `Kanji 「${item.character}」 artinya "${item.meaningId}". Bacaan: Onyomi [${item.onyomi?.join(', ') || '-'}], Kunyomi [${item.kunyomi?.join(', ') || '-'}]`
      };
    });
  };

  // Store questions in dedicated state created once upon starting the quiz
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);

  const handleStartQuiz = () => {
    playSound('click', soundEnabled);
    const stageKanjiQuestions = generateKanjiQuestions(kanjiList);
    setActiveQuestions(stageKanjiQuestions.length > 0 ? stageKanjiQuestions : STAGE_1_KANJI_QUIZ);
    setIsQuizActive(true);
  };

  if (isQuizActive) {
    return (
      <div className="w-full space-y-4">
        <QuizEngine
          title={`🎯 Quiz Aksara & Kanji (${kanjiList.length} Karakter)`}
          questions={activeQuestions}
          playerMp={playerMp}
          playerInt={playerInt}
          onUseMp={onUseMp}
          soundEnabled={soundEnabled}
          onComplete={(score, total, exp, gold) => {
            onReward(exp, gold, 'kanji', kanjiList[0]?.id || 'kanji_set', score, total);
          }}
          onExit={() => {
            setIsQuizActive(false);
            setActiveQuestions([]);
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="p-2.5 rounded-xl bg-surface-inset text-wine-accent border border-border-subtle shrink-0">
            <Feather className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text-primary font-heading flex items-center gap-2">
              <span className="text-wine-accent">漢</span> KANJI (Karakter)
            </h2>
            <p className="text-xs text-text-secondary">
              Pelajari {safeKanjiList.length} Karakter, latihan menulis 7 lembar stroke & selesaikan Quiz
            </p>
          </div>
        </div>

        {/* Global Tab Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('list');
              setSelectedKanjiId(null);
              playSound('click', soundEnabled);
            }}
            className={`btn btn-pill ${
              activeTab === 'list' && !selectedKanjiId
                ? 'ring-1 ring-wine-accent/50 text-wine-accent'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            📋 Daftar Karakter ({safeKanjiList.length})
          </button>
          <button
            onClick={handleStartQuiz}
            className="btn btn-pill flex items-center gap-1.5 shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-wine-accent" />
            <span>🎯 Quiz Kanji (7 Soal)</span>
          </button>
        </div>
      </div>

      {/* When a specific Kanji is selected: Detail & Writing Practice View */}
      {selectedKanjiId ? (
        <div className="space-y-4">
          {/* Back & Sub-tab switcher */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedKanjiId(null);
                playSound('click', soundEnabled);
              }}
              className="btn btn-pill text-xs gap-1.5"
            >
              <ArrowLeft className="w-4 h-4 text-wine-accent" />
              <span>Kembali ke Daftar Kanji</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setDetailSubTab('detail');
                  playSound('click', soundEnabled);
                }}
                className={`btn btn-pill text-xs ${
                  detailSubTab === 'detail'
                    ? 'ring-1 ring-wine-accent/50 text-wine-accent'
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
                    ? 'ring-1 ring-wine-accent/50 text-wine-accent'
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
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-border-subtle">
                {/* Giant Kanji Character Frame - Hanko Red stamp motif */}
                <div className="w-32 h-32 rounded-3xl bg-surface-inset border-2 border-wine-accent/40 flex items-center justify-center text-7xl font-bold text-wine-accent font-jp shadow-inner shrink-0">
                  {activeKanji.character}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-inset text-wine-accent border border-wine-accent/30 text-xs font-bold font-mono">
                      {activeKanji.jlpt}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-inset text-text-secondary border border-border-subtle text-xs font-mono">
                      {activeKanji.strokeCount} Goresan
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-inset text-text-secondary border border-border-subtle text-xs">
                      Radikal: {activeKanji.radical}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold font-heading text-text-primary">
                    {activeKanji.meaningId}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Arti Inggris: {activeKanji.meaningEn} • Radikal Asal: {activeKanji.radicalName}
                  </p>
                </div>
              </div>

              {/* Onyomi & Kunyomi Readings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                  <span className="text-[11px] font-bold text-wine-accent uppercase tracking-wider">
                    音読み (Onyomi - Bacaan Cina)
                  </span>
                  <div className="text-base font-bold text-text-primary font-mono flex flex-wrap gap-2 pt-1">
                    {(activeKanji?.onyomi || []).length > 0 ? (
                      activeKanji.onyomi.map((on, i) => (
                        <span key={i} className="px-2.5 py-0.5 rounded-lg bg-surface-card text-wine-accent border border-wine-accent/20 font-bold">
                          {on}
                        </span>
                      ))
                    ) : (
                      <span className="text-text-muted text-xs italic">-</span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                  <span className="text-[11px] font-bold text-state-success uppercase tracking-wider">
                    訓読み (Kunyomi - Bacaan Jepang)
                  </span>
                  <div className="text-base font-bold text-text-primary font-mono flex flex-wrap gap-2 pt-1">
                    {(activeKanji?.kunyomi || []).length > 0 ? (
                      activeKanji.kunyomi.map((kun, i) => (
                        <span key={i} className="px-2.5 py-0.5 rounded-lg bg-surface-card text-state-success border border-state-success/20 font-bold">
                          {kun}
                        </span>
                      ))
                    ) : (
                      <span className="text-text-muted text-xs italic">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Related Vocabulary Words */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  📚 Kosakata Terkait Mengandung Kanji 「{activeKanji.character}」
                </h4>
                {(activeKanji.relatedWords && activeKanji.relatedWords.length > 0) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeKanji.relatedWords.map((rw, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between gap-2"
                      >
                        <div>
                          {furiganaEnabled ? (
                            <p className="text-base font-bold text-text-primary">
                              <RubyText
                                japanese={rw.word}
                                reading={rw.reading}
                                showFurigana={furiganaEnabled}
                              />
                            </p>
                          ) : (
                            <>
                              <p className="text-[11px] text-wine-accent font-mono">
                                {rw.reading}
                              </p>
                              <p className="text-base font-bold text-text-primary font-jp">
                                {rw.word}
                              </p>
                            </>
                          )}
                          <p className="text-xs text-text-secondary">
                            {rw.meaningId}
                          </p>
                        </div>
                        <button
                          onClick={() => handlePlayAudio(rw.word)}
                          className="p-2 rounded-xl bg-surface-card hover:bg-surface-elevated text-wine-accent border border-border-subtle transition-colors"
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
            /* Kanji Writing Practice 7-Sheet Canvas */
            <div className="panel p-5 sm:p-6 space-y-4 text-center">
              <div>
                <div className="flex flex-wrap items-center justify-center gap-6 mb-3 min-h-[48px]">
                  {(activeKanji.relatedWords && activeKanji.relatedWords.length > 0) ? (
                    activeKanji.relatedWords.slice(0, 2).map((rw, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="text-2xl font-bold font-jp tracking-widest drop-shadow-sm mb-1">
                          {getHighlightedYomikata(rw.word, rw.reading, activeKanji)}
                        </div>
                        <span className="text-[10px] text-text-secondary mt-1">{rw.meaningId}</span>
                      </div>
                    ))
                  ) : (
                    <h3 className="text-2xl font-bold text-wine-accent font-jp drop-shadow-sm">
                      「{activeKanji.character}」
                    </h3>
                  )}
                </div>
                <div className="flex flex-col items-center justify-center gap-1.5 text-xs">
                  {activeKanji.onyomi && activeKanji.onyomi.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <span className="text-text-muted font-bold bg-surface-inset px-1.5 py-0.5 rounded text-[10px]">ON</span>
                      <span className="text-wine-accent font-jp tracking-wider">{activeKanji.onyomi.join(', ')}</span>
                    </div>
                  )}
                  {activeKanji.kunyomi && activeKanji.kunyomi.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <span className="text-text-muted font-bold bg-surface-inset px-1.5 py-0.5 rounded text-[10px]">KUN</span>
                      <span className="text-state-success font-jp tracking-wider">{activeKanji.kunyomi.join(', ')}</span>
                    </div>
                  )}
                  <div className="text-text-primary mt-2 font-medium px-3 py-1.5 bg-surface-inset rounded-xl border border-border-subtle">
                    {activeKanji.meaningId}
                  </div>
                </div>
              </div>

              <ErrorBoundary>
                <KanjiWritingCanvas
                  kanjiChar={activeKanji.character}
                  totalSheets={7}
                  soundEnabled={soundEnabled}
                  onCompleteSheet={(sheet, score) => {
                    // Writing practice only gives small EXP, NOT module completion
                    // User must pass the Quiz to get module completion credit
                    onReward(5, 3, 'kanji_practice');
                  }}
                  onFinish={() => {
                    // Return user directly to the stage hub room
                    playSound('fanfare', soundEnabled);
                    onBack();
                  }}
                />
              </ErrorBoundary>
            </div>
          )}
        </div>
      ) : (
        /* Kanji Grid List View */
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {safeKanjiList.map((kanji) => (
              <motion.div
                key={kanji.id}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setSelectedKanjiId(kanji.id);
                  setDetailSubTab('detail');
                  playSound('click', soundEnabled);
                }}
                className="panel p-4 cursor-pointer text-center space-y-2 group transition-all shadow-md hover:border-wine-accent/50"
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-inset border border-wine-accent/30 flex items-center justify-center text-3xl font-bold text-wine-accent font-jp group-hover:scale-105 transition-transform">
                  {kanji.character}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary truncate">
                    {kanji.meaningId}
                  </h4>
                  <p className="text-[11px] font-mono text-text-secondary truncate">
                    {kanji.onyomi[0] || kanji.kunyomi[0] || ''}
                  </p>
                </div>
                <div className="text-[10px] px-2 py-0.5 rounded-full bg-surface-inset text-text-muted border border-border-subtle">
                  {kanji.strokeCount} Coretan
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick Quiz Banner */}
          <div className="panel p-5 border border-wine-accent/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-base font-bold text-wine-accent font-heading">
                🎯 Uji Semua Kanji Hari Ini (7 Soal)
              </h3>
              <p className="text-xs text-text-secondary">
                Quiz kanji mencakup seluruh kanji pada stage ini dengan soal berbasis kosakata kontekstual.
              </p>
            </div>
            <button
              onClick={handleStartQuiz}
              className="btn btn-pill py-3 px-6 text-wine-accent border-wine-accent/40 hover:bg-wine-accent/10 font-bold text-xs shadow-md shrink-0"
            >
              Mulai Quiz Kanji
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
