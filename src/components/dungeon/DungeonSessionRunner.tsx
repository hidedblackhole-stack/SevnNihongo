import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  X,
  Volume2,
  Trophy,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Flame,
  Shield,
  Coins,
  ChevronRight,
  LogOut,
  Swords,
  Layers,
  PenTool,
  BookOpen
} from 'lucide-react';
import { DungeonPayload, DungeonConfig } from '../../utils/dungeonGenerator';
import { playSound, speakJapanese } from '../../utils/audio';
import { UniversalFlashcard } from '../learning/UniversalFlashcard';
import { UniversalWritingCard } from '../learning/UniversalWritingCard';
import { SentenceTile, validateSentenceSubmission, validateSentenceTextSubmission, ValidationFeedback } from '../../engine';
import { JapaneseImeInput } from '../common/JapaneseImeInput';

interface DungeonSessionRunnerProps {
  payload: DungeonPayload;
  onClose: () => void;
  onRestart: (config: DungeonConfig) => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => void;
  soundEnabled?: boolean;
}

export const DungeonSessionRunner: React.FC<DungeonSessionRunnerProps> = ({
  payload,
  onClose,
  onRestart,
  onRewardPlayer,
  onCompleteStudyItem,
  soundEnabled = true,
}) => {
  const { config } = payload;
  const totalFloors = config.floorCount;

  const [currentFloorIndex, setCurrentFloorIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [accumulatedExp, setAccumulatedExp] = useState(0);
  const [accumulatedGold, setAccumulatedGold] = useState(0);
  const [isVictory, setIsVictory] = useState(false);

  // Sub-exercise state for Flashcard
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);

  // Sub-exercise state for Quiz / Conjugation
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);

  // Sub-exercise state for Sakubun (Sentence Builder)
  const [sakubunMode, setSakubunMode] = useState<'tiles' | 'typing'>('tiles');
  const [sakubunTypedText, setSakubunTypedText] = useState<string>('');
  const [sakubunPlacedTiles, setSakubunPlacedTiles] = useState<SentenceTile[]>([]);
  const [sakubunAvailableTiles, setSakubunAvailableTiles] = useState<SentenceTile[]>([]);
  const [sakubunFeedback, setSakubunFeedback] = useState<ValidationFeedback | null>(null);

  // Initialize Sakubun tiles when floor changes
  useEffect(() => {
    if (config.type === 'sakubun' && payload.sakubunExercises && payload.sakubunExercises[currentFloorIndex]) {
      const ex = payload.sakubunExercises[currentFloorIndex];
      setSakubunPlacedTiles([]);
      setSakubunAvailableTiles([...(ex.availableTiles || [])]);
      setSakubunFeedback(null);
      setSakubunTypedText('');
    }
    // Reset floor sub-states
    setIsFlashcardFlipped(false);
    setSelectedAnswerIndex(null);
    setIsAnswerChecked(false);
  }, [currentFloorIndex, config.type, payload.sakubunExercises]);

  // Next Floor or Finish Dungeon
  const advanceToNextFloor = (isCorrectAnswer: boolean, expAward = 20, goldAward = 10) => {
    const nextExp = accumulatedExp + expAward;
    const nextGold = accumulatedGold + goldAward;
    const nextCorrect = isCorrectAnswer ? correctCount + 1 : correctCount;

    setAccumulatedExp(nextExp);
    setAccumulatedGold(nextGold);
    if (isCorrectAnswer) setCorrectCount(nextCorrect);

    if (currentFloorIndex + 1 >= totalFloors) {
      // Dungeon Completed!
      playSound('victory', soundEnabled);
      try {
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      } catch {}

      if (onRewardPlayer) {
        onRewardPlayer(nextExp, nextGold);
      }
      if (onCompleteStudyItem) {
        const modId = config.type === 'writing' ? 'kanji' : (config.type === 'sakubun' ? 'bunpou' : 'kotoba');
        onCompleteStudyItem(modId, nextExp, nextGold, `dungeon_${config.type}_${Date.now()}`, nextCorrect, totalFloors);
      }

      setIsVictory(true);
    } else {
      setCurrentFloorIndex(prev => prev + 1);
    }
  };

  if (typeof document === 'undefined') return null;

  // Compute percentage accuracy & Rank
  const accuracyPct = Math.round((correctCount / Math.max(1, totalFloors)) * 100);
  let rankGrade = 'A';
  let rankColor = 'text-gold border-gold/40 bg-gold/15';
  if (accuracyPct === 100) {
    rankGrade = 'S';
    rankColor = 'text-amber-400 border-amber-400/50 bg-amber-400/20';
  } else if (accuracyPct >= 75) {
    rankGrade = 'A';
    rankColor = 'text-gold border-gold/40 bg-gold/15';
  } else if (accuracyPct >= 50) {
    rankGrade = 'B';
    rankColor = 'text-indigo border-indigo/40 bg-indigo/15';
  } else {
    rankGrade = 'C';
    rankColor = 'text-text-muted border-border-subtle bg-surface-inset';
  }

  return createPortal(
    <motion.div
      key="dungeon-runner-container"
      className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="panel panel-stitched relative w-full max-w-2xl max-h-[94vh] flex flex-col border border-border-subtle rounded-3xl shadow-2xl overflow-hidden bg-surface-card animate-scale-up">
        {/* Subtle Washi Texture Overlay */}
        <div className="skeuo-grain" />
        
        {/* TOP HUD: Dungeon Floor Header */}
        <div className="p-3.5 sm:p-4 border-b border-border-subtle flex items-center justify-between gap-3 bg-surface-inset shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-card border border-border-subtle flex items-center justify-center text-gold shadow-sm">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-primary font-heading">
                  {config.type === 'writing' && '✍️ Dungeon Menulis'}
                  {config.type === 'flashcard' && '🎴 Dungeon Flashcard'}
                  {config.type === 'sakubun' && '🧩 Kuil Tata Bahasa'}
                  {config.type === 'conjugation' && '⚡ Altar Konjugasi'}
                  {config.type === 'quiz' && '🎯 Arena Kuis Cepat'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-card text-indigo border border-border-subtle font-bold max-w-[150px] truncate">
                  {config.deckTitle ? `📖 ${config.deckTitle}` : config.levelCategory}
                </span>
              </div>
              <span className="text-[10px] text-text-secondary font-mono">
                Lantai {Math.min(currentFloorIndex + 1, totalFloors)} / {totalFloors}
              </span>
            </div>
          </div>

          {/* Progress Bar & Rewards Counter */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-bold">
              <span className="text-indigo">+{accumulatedExp} EXP</span>
              <span className="text-gold">+{accumulatedGold} G</span>
            </div>

            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="p-1.5 rounded-xl bg-surface-card hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors border border-border-subtle"
              title="Kabur dari Dungeon"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floor Progress Bar Line */}
        <div className="w-full bg-surface-inset h-1 overflow-hidden shrink-0">
          <motion.div
            className="bg-indigo h-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentFloorIndex + 1) / totalFloors) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* MAIN BODY: ACTIVE FLOOR CONTENT OR VICTORY SCREEN */}
        <div className="p-4 sm:p-6 overflow-y-auto scrollbar-thin flex-1 flex flex-col justify-between">
          
          {isVictory ? (
            /* ================= VICTORY SCREEN ================= */
            <div className="text-center space-y-6 my-auto py-6 animate-fade-in">
              <div className="relative inline-block">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gold/15 border-2 border-gold/40 flex items-center justify-center text-gold shadow-xl">
                  <Trophy className="w-10 h-10" />
                </div>
                <div className={`absolute -bottom-2 -right-2 px-3 py-0.5 rounded-xl border font-mono font-black text-sm shadow-md ${rankColor}`}>
                  Rank {rankGrade}
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-text-primary font-heading tracking-wide">
                  Dungeon Berhasil Ditaklukkan!
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary font-medium max-w-md mx-auto">
                  Kamu telah menyelesaikan seluruh {totalFloors} lantai dungeon dengan gemilang.
                </p>
              </div>

              {/* Stats Summary Panel */}
              <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto p-4 rounded-2xl bg-surface-inset border border-border-subtle">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-text-muted uppercase font-mono">Akurasi</span>
                  <p className="text-base sm:text-lg font-bold font-mono text-emerald-400">
                    {accuracyPct}%
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-text-muted uppercase font-mono">Total EXP</span>
                  <p className="text-base sm:text-lg font-bold font-mono text-indigo">
                    +{accumulatedExp}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-text-muted uppercase font-mono">Total Gold</span>
                  <p className="text-base sm:text-lg font-bold font-mono text-gold">
                    +{accumulatedGold}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playSound('click', soundEnabled);
                    onRestart(config);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-surface-card hover:bg-surface-elevated border border-border-subtle text-xs font-bold text-text-primary transition-all flex items-center justify-center gap-2 font-heading"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Jelajahi Lagi</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSound('click', soundEnabled);
                    onClose();
                  }}
                  className="btn-skeuo-indigo w-full sm:w-auto px-8 py-2.5 text-xs shadow-md transition-all active:scale-95"
                >
                  <span className="whitespace-nowrap">Kembali ke Gerbang</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
          ) : (
            /* ================= ACTIVE FLOOR EXERCISE ================= */
            <div className="space-y-5 my-auto">
              {/* TYPE 1: WRITING DUNGEON */}
              {config.type === 'writing' && payload.writingItems && (
                (() => {
                  const it = payload.writingItems[currentFloorIndex];
                  if (!it) return null;

                  return (
                    <div className="panel p-4 sm:p-5 rounded-3xl border border-border-subtle shadow-lg">
                      <UniversalWritingCard
                        item={it}
                        soundEnabled={soundEnabled}
                        totalSheets={1}
                        onFinish={(score, reward) => {
                          advanceToNextFloor(score >= 60, reward?.expGained ?? 25, reward?.goldGained ?? 12);
                        }}
                      />
                    </div>
                  );
                })()
              )}

              {/* TYPE 2: FLASHCARD DUNGEON */}
              {config.type === 'flashcard' && payload.flashcardItems && (
                (() => {
                  const it = payload.flashcardItems[currentFloorIndex];
                  if (!it) return null;

                  const jp = it.kotoba?.word || it.kanji?.character || it.bunpou?.title || it.displayTitle || '';

                  return (
                    <div className="space-y-5">
                      <UniversalFlashcard
                        item={it}
                        isFlipped={isFlashcardFlipped}
                        onFlip={() => {
                          playSound('click', soundEnabled);
                          setIsFlashcardFlipped(!isFlashcardFlipped);
                        }}
                        soundEnabled={soundEnabled}
                        furiganaEnabled={true}
                      />

                      {/* Flashcard Action Buttons */}
                      <div className="flex items-center justify-center gap-3">
                        {jp && (
                          <button
                            type="button"
                            onClick={() => speakJapanese(jp)}
                            className="p-3 rounded-2xl bg-surface-inset border border-border-subtle text-gold hover:bg-surface-elevated transition-colors"
                            title="Dengar Suara"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            playSound('wrong', soundEnabled);
                            advanceToNextFloor(false, 5, 2);
                          }}
                          className="px-5 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-heading font-bold text-xs hover:bg-rose-500/20 transition-all"
                        >
                          Belum Hafal
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            playSound('correct', soundEnabled);
                            advanceToNextFloor(true, 18, 8);
                          }}
                          className="px-6 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500 text-emerald-400 font-heading font-bold text-xs hover:bg-emerald-500/25 transition-all shadow-sm"
                        >
                          Sudah Hafal (+18 EXP)
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* TYPE 3: SAKUBUN (SENTENCE BUILDER) DUNGEON */}
              {config.type === 'sakubun' && payload.sakubunExercises && (
                (() => {
                  const ex = payload.sakubunExercises[currentFloorIndex];
                  if (!ex) return null;

                  const handleSelectTile = (tile: SentenceTile) => {
                    playSound('click', soundEnabled);
                    setSakubunAvailableTiles(prev => prev.filter(t => t.id !== tile.id));
                    setSakubunPlacedTiles(prev => [...prev, tile]);
                    setSakubunFeedback(null);
                  };

                  const handleRemoveTile = (tile: SentenceTile) => {
                    playSound('click', soundEnabled);
                    setSakubunPlacedTiles(prev => prev.filter(t => t.id !== tile.id));
                    setSakubunAvailableTiles(prev => [...prev, tile]);
                    setSakubunFeedback(null);
                  };

                  const handleCheckSakubun = () => {
                    const fb = sakubunMode === 'typing'
                      ? validateSentenceTextSubmission(ex, sakubunTypedText)
                      : validateSentenceSubmission(ex, sakubunPlacedTiles.map(t => t.id));

                    setSakubunFeedback(fb);
                    if (fb.isCorrect) {
                      playSound('correct', soundEnabled);
                    } else {
                      playSound('wrong', soundEnabled);
                    }
                  };

                  const isCheckDisabled = sakubunMode === 'typing'
                    ? sakubunTypedText.trim().length === 0
                    : sakubunPlacedTiles.length === 0;

                  return (
                    <div className="space-y-4">
                      {/* Meaning / Target */}
                      <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-1 text-center sm:text-left">
                        <span className="text-[10px] font-mono text-text-muted uppercase">
                          Susun potongan kata menjadi kalimat berikut:
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-text-primary">
                          "{ex.promptMeaningId || ex.promptMeaningEn}"
                        </h4>
                      </div>

                      {/* Mode Switcher: Balok Kata vs Ketik Manual (IME) */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-0.5">
                        <div className="inline-flex p-1 bg-surface-inset rounded-2xl border border-border-subtle shadow-inner gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              playSound('click', soundEnabled);
                              setSakubunMode('tiles');
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                              sakubunMode === 'tiles'
                                ? 'bg-indigo-deep text-gold border border-gold/40 shadow-xs'
                                : 'text-text-muted hover:text-text-primary hover:bg-surface-card/40'
                            }`}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Pilih Balok Kata</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              playSound('click', soundEnabled);
                              setSakubunMode('typing');
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                              sakubunMode === 'typing'
                                ? 'bg-indigo-deep text-gold border border-gold/40 shadow-xs'
                                : 'text-text-muted hover:text-text-primary hover:bg-surface-card/40'
                            }`}
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>Ketik Manual (IME)</span>
                          </button>
                        </div>

                        <span className="text-[11px] font-mono text-text-muted hidden sm:inline-block">
                          {sakubunMode === 'typing' ? 'Ketik Romaji otomatis jadi Kana & Henkan' : 'Klik balok kata untuk menyusun kalimat'}
                        </span>
                      </div>

                      {/* MODE 1: PILIH BALOK KATA */}
                      {sakubunMode === 'tiles' && (
                        <div className="space-y-3 animate-fade-in">
                          {/* Drop / Placement Area */}
                          <div className="p-4 rounded-2xl bg-surface-inset border-2 border-dashed border-border-subtle min-h-[70px] flex flex-wrap items-center gap-2">
                            {sakubunPlacedTiles.length === 0 ? (
                              <span className="text-xs text-text-muted italic mx-auto">
                                Klik potongan kata di bawah untuk menyusun kalimat...
                              </span>
                            ) : (
                              sakubunPlacedTiles.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => handleRemoveTile(t)}
                                  className="px-3 py-1.5 rounded-xl bg-surface-card hover:bg-rose-500/20 text-text-primary border border-border-primary text-xs sm:text-sm font-bold font-jp shadow-sm cursor-pointer transition-transform active:scale-95"
                                >
                                  {t.text}
                                </button>
                              ))
                            )}
                          </div>

                          {/* Available Tiles Bank */}
                          <div className="flex flex-wrap gap-2 justify-center">
                            {sakubunAvailableTiles.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => handleSelectTile(t)}
                                className="px-3.5 py-2 rounded-xl bg-surface-card hover:bg-surface-elevated text-text-primary border border-border-subtle text-xs sm:text-sm font-bold font-jp shadow-sm transition-transform active:scale-95 cursor-pointer"
                              >
                                {t.text}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* MODE 2: KETIK MANUAL (IME) */}
                      {sakubunMode === 'typing' && (
                        <div className="space-y-3 animate-fade-in">
                          {/* Japanese IME Input with Live Romaji-Kana & Henkan */}
                          <JapaneseImeInput
                            value={sakubunTypedText}
                            onChange={(val) => {
                              setSakubunTypedText(val);
                              if (sakubunFeedback) setSakubunFeedback(null);
                            }}
                            onSubmit={handleCheckSakubun}
                            placeholder="Ketik kalimat di sini (contoh: terebi o miru -> テレビを見る)..."
                            contextWords={ex.availableTiles.map(t => t.text)}
                            soundEnabled={soundEnabled}
                            autoFocus
                          />

                          {/* Vocabulary Assistance Palette */}
                          <div className="p-3 rounded-2xl bg-surface-inset/60 border border-border-subtle/70 space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-mono text-text-muted px-0.5">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3 text-gold" />
                                <span>Potongan Kosakata Bantuan (klik untuk sisipkan):</span>
                              </span>
                              {sakubunTypedText && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playSound('click', soundEnabled);
                                    setSakubunTypedText('');
                                    if (sakubunFeedback) setSakubunFeedback(null);
                                  }}
                                  className="text-text-muted hover:text-rose-400 font-bold transition-colors cursor-pointer"
                                >
                                  Hapus Teks
                                </button>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {ex.availableTiles.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => {
                                    playSound('click', soundEnabled);
                                    setSakubunTypedText(prev => prev + t.text);
                                    if (sakubunFeedback) setSakubunFeedback(null);
                                  }}
                                  className="px-2.5 py-1 rounded-xl bg-surface-card hover:bg-surface-elevated text-text-primary border border-border-subtle text-xs font-bold font-jp shadow-2xs hover:border-gold/30 transition-all active:scale-95 cursor-pointer"
                                  title={`Sisipkan 「${t.text}」`}
                                >
                                  {t.text}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Feedback or Check Button */}
                      {sakubunFeedback ? (
                        <div className={`p-4 rounded-2xl border space-y-2 ${sakubunFeedback.isCorrect ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-heading">
                              {sakubunFeedback.isCorrect ? 'Jawaban Benar!' : 'Belum Tepat'}
                            </span>
                            {sakubunFeedback.isCorrect ? (
                              <button
                                type="button"
                                onClick={() => advanceToNextFloor(true, 30, 15)}
                                className="px-5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold font-heading cursor-pointer"
                              >
                                Lantai Berikutnya →
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => advanceToNextFloor(false, 10, 5)}
                                className="px-4 py-1.5 rounded-xl bg-surface-card border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-bold cursor-pointer"
                              >
                                Lewati →
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary font-body">
                            {sakubunFeedback.detailedFeedback} {sakubunFeedback.pedagogicalAdvice}
                          </p>
                        </div>
                      ) : (
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            disabled={isCheckDisabled}
                            onClick={handleCheckSakubun}
                            className="btn-skeuo-indigo px-8 py-2.5 disabled:opacity-40 text-xs shadow-md active:scale-95 transition-all cursor-pointer"
                          >
                            <span className="whitespace-nowrap">Periksa Kalimat</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* TYPE 4: CONJUGATION DUNGEON */}
              {config.type === 'conjugation' && payload.conjugationQuestions && (
                (() => {
                  const q = payload.conjugationQuestions[currentFloorIndex];
                  if (!q) return null;

                  return (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle text-center space-y-1">
                        <span className="text-[10px] font-mono text-gold uppercase font-bold">
                          Ubah kata ke {q.targetForm?.name || (q as any).targetFormName || 'Bentuk Tertentu'}:
                        </span>
                        <h3 className="text-2xl font-black text-text-primary font-jp">
                          {q.targetVerb?.kanji || (q as any).dictionaryWord || q.prompt}
                        </h3>
                        <p className="text-xs text-text-muted">
                          {q.targetVerb?.meaningId || (q as any).meaning || ''}
                        </p>
                      </div>

                      {/* 4 Choices */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options.map((opt, idx) => {
                          const isCorrect = idx === q.correctIndex;
                          const isSelected = selectedAnswerIndex === idx;

                          let style = 'bg-surface-inset border-border-subtle hover:bg-surface-elevated text-text-primary';
                          if (isAnswerChecked) {
                            if (isCorrect) style = 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold';
                            else if (isSelected) style = 'bg-rose-500/15 border-rose-500 text-rose-400';
                            else style = 'opacity-40 border-border-subtle';
                          }

                          return (
                            <button
                              key={idx}
                              disabled={isAnswerChecked}
                              onClick={() => {
                                setSelectedAnswerIndex(idx);
                                setIsAnswerChecked(true);
                                if (isCorrect) playSound('correct', soundEnabled);
                                else playSound('wrong', soundEnabled);
                              }}
                              className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${style}`}
                            >
                              <span className="font-jp font-bold text-sm">
                                {opt}
                              </span>
                              {isAnswerChecked && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                              {isAnswerChecked && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation & Next Floor */}
                      {isAnswerChecked && (
                        <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between gap-3">
                          <p className="text-xs text-text-secondary line-clamp-2">
                            {q.explanation}
                          </p>
                          <button
                            type="button"
                            onClick={() => advanceToNextFloor(selectedAnswerIndex === q.correctIndex, 20, 10)}
                            className="btn-skeuo-indigo px-5 py-2 text-xs shadow-sm active:scale-95 transition-all shrink-0"
                          >
                            <span className="whitespace-nowrap">Lantai Berikutnya →</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* TYPE 5: QUIZ DUNGEON */}
              {config.type === 'quiz' && payload.quizQuestions && (
                (() => {
                  const q = payload.quizQuestions[currentFloorIndex];
                  if (!q) return null;

                  return (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
                        <span className="text-[10px] text-text-muted font-mono uppercase">
                          {q.instruction || 'Pilihlah jawaban yang paling tepat:'}
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-text-primary font-jp leading-relaxed">
                          {q.prompt}
                        </h3>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 gap-2">
                        {q.options.map((opt, idx) => {
                          const isCorrect = idx === q.correctIndex;
                          const isSelected = selectedAnswerIndex === idx;

                          let style = 'bg-surface-inset border-border-subtle hover:bg-surface-elevated text-text-primary';
                          if (isAnswerChecked) {
                            if (isCorrect) style = 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold';
                            else if (isSelected) style = 'bg-rose-500/15 border-rose-500 text-rose-400';
                            else style = 'opacity-40 border-border-subtle';
                          }

                          return (
                            <button
                              key={idx}
                              disabled={isAnswerChecked}
                              onClick={() => {
                                setSelectedAnswerIndex(idx);
                                setIsAnswerChecked(true);
                                if (isCorrect) playSound('correct', soundEnabled);
                                else playSound('wrong', soundEnabled);
                              }}
                              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${style}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-5 h-5 rounded bg-surface-card text-[10px] font-mono font-bold flex items-center justify-center border border-border-subtle shrink-0">
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="text-xs sm:text-sm font-jp font-bold">
                                  {opt}
                                </span>
                              </div>
                              {isAnswerChecked && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                              {isAnswerChecked && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation & Next Floor */}
                      {isAnswerChecked && (
                        <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between gap-3">
                          <p className="text-xs text-text-secondary line-clamp-2">
                            {q.explanation}
                          </p>
                          <button
                            type="button"
                            onClick={() => advanceToNextFloor(selectedAnswerIndex === q.correctIndex, 15, 8)}
                            className="btn-skeuo-indigo px-5 py-2 text-xs shadow-sm active:scale-95 transition-all shrink-0"
                          >
                            <span className="whitespace-nowrap">Lantai Berikutnya →</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

            </div>
          )}

        </div>
      </div>
    </motion.div>,
    document.body
  );
};
