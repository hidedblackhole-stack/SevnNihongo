import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, RotateCcw, CheckCircle2, XCircle, ArrowRight, Trophy, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserDeck } from '../../types/rpg';
import { resolveDeckItem, ResolvedDeckItem } from '../../utils/decks';
import { playSound, speakJapanese } from '../../utils/audio';

interface DeckFlashcardRunnerProps {
  deck: UserDeck;
  onClose: () => void;
  onReward?: (exp: number, gold: number) => void;
  soundEnabled?: boolean;
}

export const DeckFlashcardRunner: React.FC<DeckFlashcardRunnerProps> = ({
  deck,
  onClose,
  onReward,
  soundEnabled = true,
}) => {
  // Resolve items
  const resolvedItems = useMemo(() => {
    return deck.items
      .map(ref => resolveDeckItem(ref))
      .filter((it): it is ResolvedDeckItem => it !== null);
  }, [deck.items]);

  const [queue, setQueue] = useState<ResolvedDeckItem[]>(resolvedItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentItem = queue[currentIndex];

  const handleNext = (mastered: boolean) => {
    playSound('click', soundEnabled);
    setIsFlipped(false);

    if (mastered) {
      setMasteredCount(prev => prev + 1);
    } else {
      setReviewCount(prev => prev + 1);
      // Re-queue item at the end of the session for reinforcement
      if (currentItem) {
        setQueue(prev => [...prev, currentItem]);
      }
    }

    if (currentIndex + 1 >= queue.length) {
      // Completed drill!
      setIsCompleted(true);
      playSound('victory', soundEnabled);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}

      // Reward EXP and Gold based on total items
      const earnedExp = Math.max(20, resolvedItems.length * 10);
      const earnedGold = Math.max(10, resolvedItems.length * 5);
      if (onReward) {
        onReward(earnedExp, earnedGold);
      }
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleRestart = () => {
    playSound('click', soundEnabled);
    setQueue(resolvedItems);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredCount(0);
    setReviewCount(0);
    setIsCompleted(false);
  };

  if (resolvedItems.length === 0) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-surface-ground/90 backdrop-blur-md">
        <div className="panel p-6 rounded-3xl max-w-md w-full border border-border-subtle text-center space-y-4">
          <h3 className="text-lg font-heading font-bold text-text-primary">Deck Masih Kosong</h3>
          <p className="text-xs text-text-secondary">
            Tambahkan materi ke dalam deck ini terlebih dahulu sebelum memulai latihan flashcard.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-surface-elevated text-text-primary border border-border-primary"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-surface-ground/95 backdrop-blur-md overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between max-w-2xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-xl">{deck.coverIcon || '📖'}</span>
          <div>
            <h3 className="font-heading font-bold text-sm sm:text-base text-text-primary">
              Flashcard: {deck.title}
            </h3>
            <p className="text-[11px] font-mono text-text-muted">
              {isCompleted ? 'Selesai' : `Kartu ${currentIndex + 1} dari ${queue.length}`}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            playSound('click', soundEnabled);
            onClose();
          }}
          className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-card border border-border-subtle transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Flashcard Container */}
      <div className="flex-1 flex items-center justify-center p-4 max-w-xl w-full mx-auto">
        {isCompleted ? (
          /* Completion Screen */
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="panel p-6 sm:p-8 rounded-3xl border border-border-subtle shadow-2xl text-center space-y-5 w-full"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-inset border border-gold/40 text-gold flex items-center justify-center mx-auto shadow-inner">
              <Trophy className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-gold">
                Sesi Flashcard Selesai
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-heading text-text-primary mt-1">
                Latihan Terfokus Selesai!
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Kamu telah meninjau seluruh materi di dalam deck ini.
              </p>
            </div>

            {/* Score Stats */}
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle">
                <span className="text-[10px] font-mono text-text-muted uppercase">Paham Langsung</span>
                <p className="text-lg font-bold font-mono text-text-primary">{masteredCount}</p>
              </div>
              <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle">
                <span className="text-[10px] font-mono text-text-muted uppercase">Perlu Diulang</span>
                <p className="text-lg font-bold font-mono text-text-secondary">{reviewCount}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleRestart}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-text-secondary bg-surface-inset border border-border-subtle hover:text-text-primary flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ulangi Drill</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-xs font-heading font-bold bg-surface-elevated text-text-primary border border-border-primary shadow-sm hover:scale-105 transition-all"
              >
                Kembali ke Buku Saku
              </button>
            </div>
          </motion.div>
        ) : (
          /* Active Flashcard */
          <div className="w-full space-y-4">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                setIsFlipped(prev => !prev);
                playSound('click', soundEnabled);
              }}
              className={`panel p-6 sm:p-8 rounded-3xl border cursor-pointer select-none min-h-[280px] flex flex-col justify-between transition-all duration-300 shadow-xl ${
                isFlipped
                  ? 'border-border-primary bg-surface-elevated'
                  : 'border-border-subtle hover:border-border-primary bg-surface-card'
              }`}
            >
              {/* Card Meta Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase border border-border-subtle bg-surface-inset text-text-secondary">
                    {currentItem?.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border border-border-subtle bg-surface-inset text-text-primary">
                    {currentItem?.level}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentItem?.displayTitle) {
                      speakJapanese(currentItem.displayTitle);
                    }
                  }}
                  className="p-2 rounded-xl bg-surface-inset border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
                  title="Dengarkan pelafalan"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Card Body */}
              <div className="my-auto py-6 text-center space-y-3">
                <h2 className="text-3xl sm:text-4xl font-bold font-jp text-text-primary tracking-wide">
                  {currentItem?.displayTitle}
                </h2>

                {/* Flipped content */}
                {isFlipped ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2 pt-2 border-t border-border-subtle"
                  >
                    {currentItem?.displayReading && (
                      <p className="text-sm font-mono text-wine-accent font-bold">
                        {currentItem.displayReading}
                      </p>
                    )}
                    <p className="text-sm sm:text-base font-semibold text-text-primary">
                      {currentItem?.displayMeaning}
                    </p>
                  </motion.div>
                ) : (
                  <p className="text-xs font-mono text-text-muted">
                    Ketuk kartu untuk melihat arti & cara baca
                  </p>
                )}
              </div>

              {/* Card Footer Hint */}
              <div className="text-center text-[10px] font-mono text-text-muted border-t border-border-subtle/50 pt-2.5">
                {isFlipped ? 'Pilih tingkat pemahamanmu di bawah' : 'Klik kartu untuk membalik'}
              </div>
            </motion.div>

            {/* Assessment Buttons */}
            {isFlipped && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-3"
              >
                <button
                  onClick={() => handleNext(false)}
                  className="py-3 px-4 rounded-2xl bg-surface-inset border border-border-subtle hover:border-wine-accent text-text-secondary hover:text-text-primary flex items-center justify-center gap-2 font-heading font-bold text-xs transition-all shadow-sm"
                >
                  <XCircle className="w-4 h-4 text-wine-accent" />
                  <span>Belum Hafal (Ulangi)</span>
                </button>

                <button
                  onClick={() => handleNext(true)}
                  className="py-3 px-4 rounded-2xl bg-surface-elevated border border-border-primary text-text-primary flex items-center justify-center gap-2 font-heading font-bold text-xs transition-all shadow-md hover:scale-[1.02]"
                >
                  <CheckCircle2 className="w-4 h-4 text-gold" />
                  <span>Sudah Paham</span>
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
