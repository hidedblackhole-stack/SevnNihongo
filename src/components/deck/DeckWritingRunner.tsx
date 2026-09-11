import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, ArrowLeft, ArrowRight, Trophy, PenTool, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserDeck } from '../../types/rpg';
import { resolveDeckItem, ResolvedDeckItem } from '../../utils/decks';
import { KanjiWritingCanvas } from '../learning/KanjiWritingCanvas';
import { KotobaWritingPractice } from '../learning/KotobaWritingPractice';
import { playSound } from '../../utils/audio';
import { WritingRewardResult } from '../../utils/rewards';

interface DeckWritingRunnerProps {
  deck: UserDeck;
  onClose: () => void;
  onReward?: (exp: number, gold: number) => void;
  soundEnabled?: boolean;
}

export const DeckWritingRunner: React.FC<DeckWritingRunnerProps> = ({
  deck,
  onClose,
  onReward,
  soundEnabled = true,
}) => {
  // Resolve writable items (only kanji or kotoba)
  const writableItems = useMemo(() => {
    return (deck.items || [])
      .map(ref => resolveDeckItem(ref))
      .filter((it): it is ResolvedDeckItem => it !== null && (it.category === 'kanji' || it.category === 'kotoba'));
  }, [deck.items]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState<number[]>([]);
  const [isFinishedAll, setIsFinishedAll] = useState(false);
  const [accumulatedExp, setAccumulatedExp] = useState(0);
  const [accumulatedGold, setAccumulatedGold] = useState(0);
  const [finalRewards, setFinalRewards] = useState<{ exp: number; gold: number } | null>(null);

  const currentItem = writableItems[currentIndex];

  const handleNextItem = (itemExp?: number, itemGold?: number) => {
    playSound('click', soundEnabled);
    if (!completedItems.includes(currentIndex)) {
      setCompletedItems(prev => [...prev, currentIndex]);
    }

    const nextExp = accumulatedExp + (itemExp ?? 15);
    const nextGold = accumulatedGold + (itemGold ?? 5);
    setAccumulatedExp(nextExp);
    setAccumulatedGold(nextGold);

    if (currentIndex + 1 >= writableItems.length) {
      setIsFinishedAll(true);
      playSound('victory', soundEnabled);
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {}

      const earnedExp = Math.max(30, nextExp);
      const earnedGold = Math.max(15, nextGold);
      setFinalRewards({ exp: earnedExp, gold: earnedGold });
      if (onReward) {
        onReward(earnedExp, earnedGold);
      }
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevItem = () => {
    if (currentIndex > 0) {
      playSound('click', soundEnabled);
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (writableItems.length === 0) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-surface-ground/90 backdrop-blur-md">
        <div className="panel p-6 rounded-3xl max-w-md w-full border border-border-subtle text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-surface-inset text-gold border border-border-subtle flex items-center justify-center mx-auto">
            <PenTool className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-heading font-bold text-text-primary">Tidak Ada Materi Tulisan</h3>
          <p className="text-xs text-text-secondary">
            Deck ini tidak memiliki materi Kanji atau Kosakata. Tambahkan kanji atau kata untuk memulai latihan menulis.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-surface-elevated text-text-primary border border-border-primary"
          >
            Kembali ke Buku Saku
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-surface-ground/95 backdrop-blur-md overflow-y-auto">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border-subtle flex items-center justify-between max-w-3xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-xl">{deck.coverIcon || '✍️'}</span>
          <div>
            <h3 className="font-heading font-bold text-sm sm:text-base text-text-primary flex items-center gap-2">
              <span>Latihan Menulis: {deck.title}</span>
            </h3>
            <p className="text-[11px] font-mono text-text-muted">
              {isFinishedAll
                ? 'Selesai'
                : `Materi ${currentIndex + 1} dari ${writableItems.length} (${currentItem?.category.toUpperCase()})`}
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

      {/* Content Area */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-4 max-w-3xl w-full mx-auto">
        {isFinishedAll ? (
          /* Completion Card */
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="panel p-6 sm:p-8 rounded-3xl border border-border-subtle shadow-2xl text-center space-y-5 max-w-md w-full"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-inset border border-gold/40 text-gold flex items-center justify-center mx-auto shadow-inner">
              <Trophy className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-gold">
                Sesi Menulis Selesai
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-heading text-text-primary mt-1">
                Latihan Kaligrafi Sukses!
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Kamu telah menyelesaikan latihan menulis {writableItems.length} kanji & kata dalam deck ini.
              </p>
            </div>

            {/* Dynamic EXP & Gold Reward Banner */}
            {finalRewards && (
              <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-2xl bg-surface-inset border border-wine-accent/30">
                <span className="font-bold text-wine-accent font-mono text-sm">
                  +{finalRewards.exp} EXP
                </span>
                <span className="text-xs text-gold font-mono font-bold">
                  +{finalRewards.gold} Gold
                </span>
                <span className="text-[11px] text-text-muted font-mono">
                  (Multiplier Menulis)
                </span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setCompletedItems([]);
                  setAccumulatedExp(0);
                  setAccumulatedGold(0);
                  setFinalRewards(null);
                  setIsFinishedAll(false);
                  playSound('click', soundEnabled);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-text-secondary bg-surface-inset border border-border-subtle hover:text-text-primary flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ulangi Sesi</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-xs font-heading font-bold bg-surface-elevated text-text-primary border border-border-primary shadow-sm hover:scale-105 transition-all"
              >
                Selesai
              </button>
            </div>
          </motion.div>
        ) : (
          /* Active Writing Canvas */
          <div className="w-full space-y-3">
            {/* Render Canvas depending on whether it's Kanji or Kotoba */}
            {currentItem?.category === 'kanji' && currentItem.kanji && (
              <div className="panel p-4 sm:p-5 rounded-3xl border border-border-subtle shadow-lg">
                <KanjiWritingCanvas
                  kanjiChar={currentItem.kanji.character}
                  meaning={currentItem.kanji.meaningId}
                  onyomi={(currentItem.kanji.onyomi || []).join('、')}
                  kunyomi={(currentItem.kanji.kunyomi || []).join('、')}
                  strokeCount={currentItem.kanji.strokeCount}
                  level={currentItem.kanji.jlpt}
                  soundEnabled={soundEnabled}
                  showStopwatch={true}
                  onFinish={(reward) => {
                    handleNextItem(reward?.expGained, reward?.goldGained);
                  }}
                />
              </div>
            )}

            {currentItem?.category === 'kotoba' && currentItem.kotoba && (
              <div className="panel p-4 sm:p-5 rounded-3xl border border-border-subtle shadow-lg">
                <KotobaWritingPractice
                  kotoba={currentItem.kotoba}
                  soundEnabled={soundEnabled}
                  nextButtonLabel={
                    currentIndex + 1 === writableItems.length
                      ? 'Selesaikan Latihan'
                      : 'Lanjut ke Kata Berikutnya'
                  }
                  onFinishWord={(score, reward) => {
                    handleNextItem(reward?.expGained, reward?.goldGained);
                  }}
                  onCancel={() => {
                    playSound('click', soundEnabled);
                    onClose();
                  }}
                />
              </div>
            )}

            {/* Bottom Navigator Controls */}
            <div className="flex items-center justify-between px-2 pt-1">
              <button
                disabled={currentIndex === 0}
                onClick={handlePrevItem}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  currentIndex === 0
                    ? 'opacity-40 cursor-not-allowed border-transparent text-text-muted'
                    : 'bg-surface-inset border-border-subtle text-text-secondary hover:text-text-primary'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              <button
                onClick={handleNextItem}
                className="px-5 py-2 rounded-xl text-xs font-heading font-bold bg-surface-elevated text-text-primary border border-border-primary shadow-sm hover:scale-105 flex items-center gap-1.5 transition-all"
              >
                <span>{currentIndex + 1 === writableItems.length ? 'Selesaikan Drill' : 'Berikutnya'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
