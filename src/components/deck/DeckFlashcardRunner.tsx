import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, RotateCcw, RotateCw, ArrowRight, ArrowLeft, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserDeck } from '../../types/rpg';
import { ResolvedDeckItem, resolveDeckItem } from '../../utils/decks';
import { playSound } from '../../utils/audio';
import { UniversalFlashcard } from '../learning/UniversalFlashcard';
import { getKanjiBaseExp, getKotobaBaseExp, getBunpouBaseExp, calculateFlashcardReward } from '../../utils/rewards';

interface DeckFlashcardRunnerProps {
  deck: UserDeck;
  onClose: () => void;
  onReward?: (exp: number, gold: number) => void;
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

export const DeckFlashcardRunner: React.FC<DeckFlashcardRunnerProps> = ({
  deck,
  onClose,
  onReward,
  onCompleteStudyItem,
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
  const [isCompleted, setIsCompleted] = useState(false);
  const [accumulatedExp, setAccumulatedExp] = useState(0);
  const [accumulatedGold, setAccumulatedGold] = useState(0);
  const [finalRewards, setFinalRewards] = useState<{ exp: number; gold: number } | null>(null);

  const currentItem = queue[currentIndex];

  const handleNext = () => {
    playSound('click', soundEnabled);
    setIsFlipped(false);

    // Calculate dynamic flashcard reward for current item based on its Base EXP
    let baseExp = 15;
    if (currentItem?.category === 'kanji' && currentItem.kanji) {
      baseExp = getKanjiBaseExp(currentItem.kanji);
    } else if (currentItem?.category === 'kotoba' && currentItem.kotoba) {
      baseExp = getKotobaBaseExp(currentItem.kotoba);
    } else if (currentItem?.category === 'bunpou' && currentItem.bunpou) {
      baseExp = getBunpouBaseExp(currentItem.bunpou);
    }
    const reward = calculateFlashcardReward(baseExp, true);
    const newExp = accumulatedExp + reward.expGained;
    const newGold = accumulatedGold + reward.goldGained;
    setAccumulatedExp(newExp);
    setAccumulatedGold(newGold);

    if (currentItem && onCompleteStudyItem) {
      const mod = currentItem.category === 'kanji' ? 'kanji' : (currentItem.category === 'bunpou' ? 'bunpou' : 'kotoba');
      onCompleteStudyItem(mod, reward.expGained, reward.goldGained, currentItem.ref.id, 1, 1);
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

      // Reward dynamic EXP and Gold
      const earnedExp = Math.max(15, newExp);
      const earnedGold = Math.max(5, newGold);
      setFinalRewards({ exp: earnedExp, gold: earnedGold });
      if (onReward && !onCompleteStudyItem) {
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
    setAccumulatedExp(0);
    setAccumulatedGold(0);
    setFinalRewards(null);
    setIsCompleted(false);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      playSound('click', soundEnabled);
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
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

            {/* Completion Stats */}
            <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle text-center">
              <span className="text-xs font-mono text-text-muted uppercase">Total Kartu Dipelajari</span>
              <p className="text-2xl font-black font-heading text-text-primary mt-1">{queue.length} Materi</p>
            </div>

            {/* Dynamic EXP & Gold Reward Banner */}
            {finalRewards && (
              <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-2xl bg-surface-inset border border-gold/30">
                <span className="font-bold text-wine-accent font-mono text-sm">
                  +{finalRewards.exp} EXP
                </span>
                <span className="text-xs text-gold font-mono font-bold">
                  +{finalRewards.gold} Gold
                </span>
                <span className="text-[11px] text-text-muted font-mono">
                  (Multiplier Flashcard)
                </span>
              </div>
            )}

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
          /* Active Flashcard Drill matching World richness */
          <div className="w-full space-y-4">
            {/* Card Progress Header */}
            <div className="flex items-center justify-between text-xs text-text-muted w-full px-1">
              <span>
                Kartu <strong className="text-indigo font-bold">{currentIndex + 1}</strong> dari {queue.length}
              </span>
              <span className="font-mono text-gold font-bold">Total: {queue.length}</span>
            </div>

            {/* Interactive 3D Flip Card */}
            {currentItem && (
              <UniversalFlashcard
                item={currentItem}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped(prev => !prev)}
                soundEnabled={soundEnabled}
              />
            )}

            {/* Bottom Card Controls */}
            <div className="w-full pt-2">
              <div className="flex items-center justify-between gap-3 w-full">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="flex-1 py-3 px-3 sm:px-4 rounded-2xl bg-surface-card border border-border-subtle hover:bg-surface-elevated text-text-secondary hover:text-text-primary font-heading font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                <button
                  onClick={() => {
                    setIsFlipped(prev => !prev);
                    playSound('click', soundEnabled);
                  }}
                  className="flex-1 py-3 px-3 sm:px-4 rounded-2xl bg-surface-inset hover:bg-surface-elevated border border-border-subtle text-text-primary font-heading font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-sm"
                >
                  <RotateCw className="w-3.5 h-3.5 text-gold" />
                  <span>{isFlipped ? 'Tutup Arti' : 'Balik Kartu'}</span>
                </button>

                <button
                  onClick={handleNext}
                  className="flex-1 py-3 px-3 sm:px-4 rounded-2xl btn-cta text-text-primary font-heading font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-md hover:scale-[1.01]"
                >
                  <span>{currentIndex + 1 === queue.length ? 'Selesai' : 'Berikutnya'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
