import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Trophy,
  PenTool,
  BookOpen,
  Brain,
  ShieldCheck,
  Star,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CustomStage, CurriculumConfig } from '../../types/curriculum';
import { resolveDeckItem, ResolvedDeckItem } from '../../utils/decks';
import { generateStageQuestions } from '../../utils/curriculumEngine';
import { UniversalFlashcard } from '../learning/UniversalFlashcard';
import { UniversalWritingCard } from '../learning/UniversalWritingCard';
import { QuizEngine } from '../learning/QuizEngine';
import { playSound } from '../../utils/audio';

interface CustomStageRunnerProps {
  stage: CustomStage;
  config: CurriculumConfig;
  onCompleteStage: (score: number, total: number, expGained: number, goldGained: number) => void;
  onClose: () => void;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
}

type RunnerPhase = 'flashcard' | 'writing' | 'quiz' | 'victory';

export const CustomStageRunner: React.FC<CustomStageRunnerProps> = ({
  stage,
  config,
  onCompleteStage,
  onClose,
  soundEnabled = true,
  furiganaEnabled = true,
}) => {
  // Resolve all items in this stage without duplicating master data
  const resolvedItems = useMemo(() => {
    return (stage.items || [])
      .map(it => resolveDeckItem({ id: it.id, category: it.type, addedAt: '' }))
      .filter((item): item is ResolvedDeckItem => item !== null);
  }, [stage.items]);

  // Kanji items for writing practice
  const kanjiItems = useMemo(() => {
    return resolvedItems.filter(it => it.category === 'kanji' && it.kanji);
  }, [resolvedItems]);

  // Determine enabled phases for this stage
  const hasFlashcardPhase = stage.isExam
    ? false
    : stage.activities.some(a => a.includes('flashcard') || a === 'bunpou_study');

  const hasWritingPhase =
    !stage.isExam &&
    stage.activities.includes('kanji_write') &&
    kanjiItems.length > 0;

  const hasQuizPhase =
    stage.isExam ||
    stage.activities.some(a => a.includes('quiz') || a === 'mixed_exam');

  // Initial phase
  const initialPhase: RunnerPhase = useMemo(() => {
    if (stage.isExam) return 'quiz';
    if (hasFlashcardPhase) return 'flashcard';
    if (hasWritingPhase) return 'writing';
    if (hasQuizPhase) return 'quiz';
    return 'flashcard';
  }, [stage.isExam, hasFlashcardPhase, hasWritingPhase, hasQuizPhase]);

  const [currentPhase, setCurrentPhase] = useState<RunnerPhase>(initialPhase);

  // --- Flashcard State ---
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const currentFcItem = resolvedItems[fcIndex];

  // --- Writing State ---
  const [writeIndex, setWriteIndex] = useState(0);
  const currentKanjiItem = kanjiItems[writeIndex];

  // --- Quiz Questions ---
  const quizQuestions = useMemo(() => {
    const maxQ = stage.isExam ? 15 : Math.max(5, Math.min(stage.items.length * 2, 10));
    return generateStageQuestions(stage, maxQ);
  }, [stage]);

  // --- Completion & Scoring State ---
  const [finalScore, setFinalScore] = useState(0);
  const [finalTotal, setFinalTotal] = useState(0);
  const [earnedExp, setEarnedExp] = useState(stage.rewardExp);
  const [earnedGold, setEarnedGold] = useState(stage.rewardGold);
  const [earnedStars, setEarnedStars] = useState(3);

  // Transitions
  const handleNextFlashcard = () => {
    playSound('click', soundEnabled);
    setFcFlipped(false);
    if (fcIndex + 1 < resolvedItems.length) {
      setFcIndex(prev => prev + 1);
    } else {
      // Completed flashcards -> move to next phase
      if (hasWritingPhase) {
        setCurrentPhase('writing');
      } else if (hasQuizPhase) {
        setCurrentPhase('quiz');
      } else {
        triggerVictory(resolvedItems.length, resolvedItems.length, stage.rewardExp, stage.rewardGold);
      }
    }
  };

  const handlePrevFlashcard = () => {
    if (fcIndex > 0) {
      playSound('click', soundEnabled);
      setFcFlipped(false);
      setFcIndex(prev => prev - 1);
    }
  };

  const handleFinishKanjiWriting = () => {
    playSound('click', soundEnabled);
    if (writeIndex + 1 < kanjiItems.length) {
      setWriteIndex(prev => prev + 1);
    } else {
      // Finished writing all kanji -> move to quiz
      if (hasQuizPhase) {
        setCurrentPhase('quiz');
      } else {
        triggerVictory(kanjiItems.length, kanjiItems.length, stage.rewardExp, stage.rewardGold);
      }
    }
  };

  const handleQuizComplete = (score: number, total: number, expGained: number, goldGained: number) => {
    const totalExp = stage.rewardExp + expGained;
    const totalGold = stage.rewardGold + goldGained;
    triggerVictory(score, total, totalExp, totalGold);
  };

  const triggerVictory = (score: number, total: number, exp: number, gold: number) => {
    const percentage = total > 0 ? (score / total) * 100 : 100;
    const stars = percentage >= 90 ? 3 : percentage >= 60 ? 2 : 1;

    setFinalScore(score);
    setFinalTotal(total);
    setEarnedExp(exp);
    setEarnedGold(gold);
    setEarnedStars(stars);
    setCurrentPhase('victory');

    playSound('victory', soundEnabled);
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}
  };

  const handleClaimAndExit = () => {
    playSound('click', soundEnabled);
    onCompleteStage(finalScore, finalTotal, earnedExp, earnedGold);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-surface-card border border-border-subtle rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-inset shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl border ${
                stage.isExam
                  ? 'bg-gold/15 text-gold border-gold/30'
                  : 'bg-indigo/15 text-indigo border-indigo/30'
              }`}
            >
              {stage.isExam ? 'FINAL BOSS EXAM' : `STAGE ${stage.stageNumber}`}
            </span>
            <h3 className="text-sm font-bold text-text-primary font-heading line-clamp-1">
              {stage.title}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Phase Pills */}
            {!stage.isExam && currentPhase !== 'victory' && (
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono mr-2">
                {hasFlashcardPhase && (
                  <span
                    className={`px-2 py-0.5 rounded-lg border ${
                      currentPhase === 'flashcard'
                        ? 'bg-indigo text-white border-indigo'
                        : 'bg-surface-card text-text-secondary border-border-subtle'
                    }`}
                  >
                    1. Belajar
                  </span>
                )}
                {hasWritingPhase && (
                  <span
                    className={`px-2 py-0.5 rounded-lg border ${
                      currentPhase === 'writing'
                        ? 'bg-indigo text-white border-indigo'
                        : 'bg-surface-card text-text-secondary border-border-subtle'
                    }`}
                  >
                    2. Tulis
                  </span>
                )}
                {hasQuizPhase && (
                  <span
                    className={`px-2 py-0.5 rounded-lg border ${
                      currentPhase === 'quiz'
                        ? 'bg-indigo text-white border-indigo'
                        : 'bg-surface-card text-text-secondary border-border-subtle'
                    }`}
                  >
                    3. Kuis
                  </span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-card transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Body Content by Phase */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col justify-center">
          {/* 1. FLASHCARD / STUDY PHASE */}
          {currentPhase === 'flashcard' && currentFcItem && (
            <div className="space-y-6 max-w-lg mx-auto w-full my-auto">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span className="font-mono">
                  Kartu {fcIndex + 1} dari {resolvedItems.length}
                </span>
                <span className="capitalize font-bold px-2 py-0.5 rounded-md bg-surface-inset border border-border-subtle">
                  {currentFcItem.category}
                </span>
              </div>

              {/* Unified 3D Flip Flashcard */}
              <UniversalFlashcard
                item={currentFcItem}
                isFlipped={fcFlipped}
                onFlip={() => {
                  setFcFlipped(prev => !prev);
                  playSound('click', soundEnabled);
                }}
                soundEnabled={soundEnabled}
                furiganaEnabled={furiganaEnabled}
              />

              {/* Navigation Bar */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={fcIndex === 0}
                  onClick={handlePrevFlashcard}
                  className="px-4 py-2.5 rounded-xl border border-border-subtle bg-surface-card text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextFlashcard}
                  className="px-5 py-2.5 rounded-xl bg-indigo text-white hover:bg-indigo/90 font-heading font-bold flex items-center gap-2 text-xs shadow-sm border border-indigo/30 transition-colors"
                >
                  <span>
                    {fcIndex + 1 >= resolvedItems.length
                      ? hasWritingPhase
                        ? 'Lanjut ke Menulis Kuas →'
                        : hasQuizPhase
                        ? 'Lanjut ke Kuis →'
                        : 'Selesai Stage'
                      : 'Berikutnya'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 2. WRITING CANVAS PHASE */}
          {currentPhase === 'writing' && currentKanjiItem && currentKanjiItem.kanji && (
            <div className="space-y-4 max-w-md mx-auto w-full my-auto text-center">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span className="font-mono">
                  Kanji {writeIndex + 1} dari {kanjiItems.length}
                </span>
                <span className="font-bold text-gold flex items-center gap-1">
                  <PenTool className="w-3.5 h-3.5" />
                  <span>{config.kanjiSettings.canvasPerKanji}x Goresan</span>
                </span>
              </div>

              <div className="panel p-4 rounded-3xl bg-surface-inset border border-border-subtle">
                <UniversalWritingCard
                  item={currentKanjiItem}
                  totalSheets={config.kanjiSettings.canvasPerKanji || 3}
                  soundEnabled={soundEnabled}
                  onFinish={() => {
                    handleFinishKanjiWriting();
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (writeIndex > 0) setWriteIndex(prev => prev - 1);
                  }}
                  disabled={writeIndex === 0}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border border-border-subtle bg-surface-card text-text-secondary disabled:opacity-40"
                >
                  Kanji Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={handleFinishKanjiWriting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25"
                >
                  Lewati / Selesai Kanji Ini →
                </button>
              </div>
            </div>
          )}

          {/* 3. QUIZ / MIXED EXAM PHASE */}
          {currentPhase === 'quiz' && (
            <div className="w-full">
              <QuizEngine
                title={stage.isExam ? 'Final Mixed Exam' : `Kuis: ${stage.title}`}
                questions={quizQuestions}
                onComplete={handleQuizComplete}
                onExit={() => {
                  playSound('click', soundEnabled);
                  onClose();
                }}
                soundEnabled={soundEnabled}
                furiganaEnabled={furiganaEnabled}
              />
            </div>
          )}

          {/* 4. VICTORY / STAGE CLEARED SCREEN */}
          {currentPhase === 'victory' && (
            <div className="text-center space-y-6 max-w-md mx-auto my-auto animate-fade-in p-4">
              <div className="w-20 h-20 rounded-3xl bg-gold/15 border border-gold/30 flex items-center justify-center mx-auto text-gold shadow-sm">
                <Trophy className="w-10 h-10" />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold tracking-widest text-gold uppercase">
                  STAGE COMPLETE
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-text-primary font-heading">
                  {stage.title} Ditaklukkan!
                </h2>
                <p className="text-xs text-text-secondary">
                  Semua aktivitas di stage ini telah berhasil diselesaikan dengan baik.
                </p>
              </div>

              {/* Stars Display */}
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3].map((starIdx) => (
                  <Star
                    key={starIdx}
                    className={`w-8 h-8 transition-all ${
                      starIdx <= earnedStars
                        ? 'text-gold fill-gold drop-shadow-md scale-110'
                        : 'text-border-subtle'
                    }`}
                  />
                ))}
              </div>

              {/* Rewards Summary */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-surface-inset border border-border-subtle">
                <div className="text-center space-y-0.5">
                  <span className="text-[10px] text-text-secondary font-mono">EXP Didapat</span>
                  <p className="text-lg font-bold text-indigo font-mono">+{earnedExp} EXP</p>
                </div>
                <div className="text-center space-y-0.5">
                  <span className="text-[10px] text-text-secondary font-mono">Koin Emas</span>
                  <p className="text-lg font-bold text-gold font-mono">+{earnedGold} Gold</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClaimAndExit}
                className="w-full py-3.5 rounded-2xl bg-indigo hover:bg-indigo/90 text-white font-heading font-bold text-sm shadow-sm border border-indigo/30 transition-colors"
              >
                Klaim Reward & Lanjutkan World →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
