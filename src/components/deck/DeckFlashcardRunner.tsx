import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, RotateCcw, CheckCircle2, XCircle, ArrowRight, ArrowLeft, Trophy, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserDeck } from '../../types/rpg';
import { ResolvedDeckItem, resolveDeckItem } from '../../utils/decks';
import { playSound, speakJapanese } from '../../utils/audio';
import { RubyText } from '../learning/RubyText';
import { getKanjiBaseExp, getKotobaBaseExp, getBunpouBaseExp, calculateFlashcardReward } from '../../utils/rewards';

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
  const [accumulatedExp, setAccumulatedExp] = useState(0);
  const [accumulatedGold, setAccumulatedGold] = useState(0);
  const [finalRewards, setFinalRewards] = useState<{ exp: number; gold: number } | null>(null);

  const currentItem = queue[currentIndex];

  const handleNext = (mastered: boolean) => {
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
    const reward = calculateFlashcardReward(baseExp, mastered);
    const newExp = accumulatedExp + reward.expGained;
    const newGold = accumulatedGold + reward.goldGained;
    setAccumulatedExp(newExp);
    setAccumulatedGold(newGold);

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

      // Reward dynamic EXP and Gold
      const earnedExp = Math.max(15, newExp);
      const earnedGold = Math.max(5, newGold);
      setFinalRewards({ exp: earnedExp, gold: earnedGold });
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
            <div
              onClick={() => {
                setIsFlipped(prev => !prev);
                playSound('click', soundEnabled);
              }}
              className="relative w-full aspect-[4/3] min-h-[380px] max-h-[460px] rounded-3xl cursor-pointer perspective-1000 select-none group"
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.5, type: 'spring', damping: 20 }}
                className="w-full h-full relative [transform-style:preserve-3d]"
              >
                {/* FRONT OF CARD */}
                <div className="absolute inset-0 [backface-visibility:hidden] rounded-3xl border border-border-subtle bg-surface-card p-6 sm:p-8 flex flex-col items-center justify-between shadow-xl overflow-y-auto no-scrollbar">
                  {/* Category-Specific Front Face */}
                  {currentItem?.category === 'kanji' ? (
                    <>
                      {/* Kanji Top Meta Bar */}
                      <div className="w-full flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full bg-surface-inset text-wine-accent border border-wine-accent/30 text-[11px] font-mono font-bold">
                            Kanji • {currentItem.kanji?.jlpt || currentItem.level}
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-surface-inset text-text-secondary border border-border-subtle text-[11px] font-mono">
                            {currentItem.kanji?.strokeCount || 1} Goresan
                          </span>
                          {currentItem.kanji?.radical && (
                            <span className="px-2 py-0.5 rounded-full bg-surface-inset text-text-muted border border-border-subtle text-[10px] font-jp">
                              部首: {currentItem.kanji.radical}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const readingToSpeak =
                              currentItem.kanji?.kunyomi?.[0]?.replace(/[.-]/g, '') ||
                              currentItem.kanji?.onyomi?.[0]?.split(' ')[0] ||
                              currentItem.kanji?.character ||
                              currentItem.displayTitle;
                            speakJapanese(readingToSpeak);
                          }}
                          className="p-2 rounded-xl bg-surface-inset hover:bg-surface-elevated text-wine-accent border border-border-subtle transition-colors shadow-sm"
                          title="Dengar pelafalan"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Giant Kanji Center */}
                      <div className="text-center space-y-2 my-auto">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl bg-surface-inset border-2 border-wine-accent/40 flex items-center justify-center text-6xl sm:text-7xl font-bold text-wine-accent font-jp shadow-inner select-none group-hover:scale-105 transition-transform">
                          {currentItem.kanji?.character || currentItem.displayTitle}
                        </div>
                        <p className="text-xs font-mono text-text-secondary pt-1">
                          {currentItem.kanji?.onyomi?.[0] || currentItem.kanji?.kunyomi?.[0] || ''}
                        </p>
                        <p className="text-xs text-text-muted pt-1 font-mono">
                          (Klik untuk membalik kartu & melihat arti & yomikata)
                        </p>
                      </div>

                      {/* Bottom Radical Info */}
                      <div className="text-[11px] text-text-muted font-mono">
                        {currentItem.kanji?.radicalName ? `Radikal: ${currentItem.kanji.radicalName}` : 'Karakter Kanji Resmi'}
                      </div>
                    </>
                  ) : currentItem?.category === 'bunpou' ? (
                    <>
                      {/* Bunpou Top Meta Bar */}
                      <div className="w-full flex justify-between items-center text-xs">
                        <span className="px-2.5 py-1 rounded-full bg-surface-inset text-purple-400 border border-purple-400/30 text-[11px] font-mono font-bold">
                          Bunpou • {currentItem.bunpou?.level || currentItem.level}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakJapanese(currentItem.bunpou?.title || currentItem.displayTitle);
                          }}
                          className="p-2 rounded-xl bg-surface-inset hover:bg-surface-elevated text-purple-400 border border-border-subtle transition-colors shadow-sm"
                          title="Dengar pelafalan"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Giant Bunpou Center */}
                      <div className="text-center space-y-2 my-auto">
                        <h3 className="text-3xl sm:text-4xl font-black text-text-primary tracking-wide font-jp drop-shadow-sm">
                          {currentItem.bunpou?.title || currentItem.displayTitle}
                        </h3>
                        <div className="inline-block px-3.5 py-1.5 rounded-xl bg-surface-inset border border-purple-400/30 text-purple-300 font-mono text-xs font-bold shadow-sm">
                          {currentItem.bunpou?.formula || currentItem.displayReading}
                        </div>
                        <p className="text-xs text-text-muted pt-2 font-mono">
                          (Klik untuk membalik kartu & melihat aturan & contoh)
                        </p>
                      </div>

                      {/* Bottom Function Tag */}
                      <div className="text-[11px] text-text-muted font-mono">
                        {currentItem.bunpou?.functions?.[0] || 'Kaidah Tata Bahasa'}
                      </div>
                    </>
                  ) : (
                    /* Default: Kotoba (Kosakata) Front Face - Identical to World KotobaModule */
                    <>
                      {/* Kotoba Top Meta Bar */}
                      <div className="w-full flex justify-between items-center text-xs">
                        <span className="px-2.5 py-1 rounded-full bg-surface-inset text-indigo border border-border-subtle text-[11px] font-mono font-bold">
                          {currentItem.kotoba?.jlpt || currentItem.level} • {currentItem.kotoba?.wordType || 'Kosakata'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakJapanese(currentItem.kotoba?.word || currentItem.displayTitle);
                          }}
                          className="p-2 rounded-xl bg-surface-inset hover:bg-surface-elevated text-gold border border-border-subtle transition-colors shadow-sm"
                          title="Dengar pelafalan"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Center Big Word with RubyText */}
                      <div className="text-center space-y-2 my-auto">
                        <h3 className="text-4xl sm:text-5xl font-black text-text-primary tracking-wider font-heading drop-shadow-sm">
                          <RubyText
                            japanese={currentItem.kotoba?.word || currentItem.displayTitle}
                            reading={currentItem.kotoba?.reading || currentItem.displayReading || ''}
                            showFurigana={true}
                          />
                        </h3>
                        <p className="text-xs text-text-muted pt-2 font-mono">
                          (Klik untuk membalik kartu & melihat arti)
                        </p>
                      </div>

                      {/* Kanji Breakdown Pills */}
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {(currentItem.kotoba?.kanjiComponents || []).length > 0 ? (
                          currentItem.kotoba!.kanjiComponents.map((k, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2.5 py-0.5 rounded-md bg-surface-inset text-text-secondary border border-border-subtle font-jp font-bold shadow-sm"
                            >
                              {k}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-text-muted font-mono">
                            Kana Fonetik (Hiragana/Katakana)
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* BACK OF CARD */}
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-3xl border border-gold/30 bg-surface-elevated p-6 sm:p-8 flex flex-col items-center justify-between shadow-xl overflow-y-auto no-scrollbar">
                  {/* Category-Specific Back Face */}
                  {currentItem?.category === 'kanji' ? (
                    <>
                      {/* Kanji Top Header */}
                      <div className="w-full flex justify-between items-center text-xs">
                        <span className="text-wine-accent font-bold tracking-wider uppercase font-mono">
                          Detail & Makna Kanji
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const readingToSpeak =
                              currentItem.kanji?.kunyomi?.[0]?.replace(/[.-]/g, '') ||
                              currentItem.kanji?.onyomi?.[0]?.split(' ')[0] ||
                              currentItem.kanji?.character ||
                              currentItem.displayTitle;
                            speakJapanese(readingToSpeak);
                          }}
                          className="p-2 rounded-xl bg-surface-inset hover:bg-surface-elevated text-wine-accent border border-border-subtle transition-colors shadow-sm"
                          title="Dengar pelafalan"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Kanji Center Details */}
                      <div className="text-center space-y-2.5 my-auto w-full max-w-md">
                        <h4 className="text-2xl sm:text-3xl font-black text-gold font-heading leading-tight">
                          {currentItem.kanji?.meaningId || currentItem.displayMeaning}
                        </h4>
                        {currentItem.kanji?.meaningEn && (
                          <p className="text-xs text-text-secondary italic">
                            English: {currentItem.kanji.meaningEn}
                          </p>
                        )}

                        {/* Onyomi & Kunyomi Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-1 text-xs">
                          <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle text-left">
                            <span className="text-[10px] font-bold text-wine-accent uppercase font-mono block mb-1">
                              音読み (Onyomi)
                            </span>
                            <div className="flex flex-wrap gap-1 font-jp font-bold text-text-primary">
                              {(currentItem.kanji?.onyomi || []).length > 0 ? (
                                currentItem.kanji!.onyomi.map((on, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      speakJapanese(on.split(' ')[0]);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-surface-card border border-wine-accent/20 hover:border-wine-accent text-wine-accent flex items-center gap-1 text-xs transition-colors"
                                    title="Dengar bacaan Onyomi"
                                  >
                                    <span>{on}</span>
                                    <Volume2 className="w-2.5 h-2.5 opacity-60" />
                                  </button>
                                ))
                              ) : (
                                <span className="text-text-muted italic text-[11px]">-</span>
                              )}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle text-left">
                            <span className="text-[10px] font-bold text-state-success uppercase font-mono block mb-1">
                              訓読み (Kunyomi)
                            </span>
                            <div className="flex flex-wrap gap-1 font-jp font-bold text-text-primary">
                              {(currentItem.kanji?.kunyomi || []).length > 0 ? (
                                currentItem.kanji!.kunyomi.map((kun, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      speakJapanese(kun.replace(/[.-]/g, '').split(' ')[0]);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-surface-card border border-state-success/20 hover:border-state-success text-state-success flex items-center gap-1 text-xs transition-colors"
                                    title="Dengar bacaan Kunyomi"
                                  >
                                    <span>{kun}</span>
                                    <Volume2 className="w-2.5 h-2.5 opacity-60" />
                                  </button>
                                ))
                              ) : (
                                <span className="text-text-muted italic text-[11px]">-</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Related Words */}
                        {currentItem.kanji?.relatedWords && currentItem.kanji.relatedWords.length > 0 && (
                          <div className="w-full p-2.5 rounded-xl bg-surface-inset border border-border-subtle text-left space-y-1 mt-1">
                            <span className="text-[10px] font-bold text-text-muted uppercase font-mono">
                              Contoh Kosakata Terkait:
                            </span>
                            <div className="flex flex-wrap gap-1.5 text-xs">
                              {currentItem.kanji.relatedWords.slice(0, 3).map((rw, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    speakJapanese(rw.word);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-surface-card border border-border-subtle hover:border-gold/40 flex items-center gap-1.5 text-[11px] transition-colors"
                                >
                                  <span className="font-jp font-bold text-text-primary">{rw.word}</span>
                                  <span className="text-text-muted font-mono">({rw.reading})</span>
                                  <span className="text-text-secondary">— {rw.meaningId}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-text-muted font-mono">
                        (Klik untuk kembali ke tampilan depan)
                      </p>
                    </>
                  ) : currentItem?.category === 'bunpou' ? (
                    <>
                      {/* Bunpou Top Header */}
                      <div className="w-full flex justify-between items-center text-xs">
                        <span className="text-purple-400 font-bold tracking-wider uppercase font-mono">
                          Makna & Aturan Tata Bahasa
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakJapanese(currentItem.bunpou?.title || currentItem.displayTitle);
                          }}
                          className="p-2 rounded-xl bg-surface-inset hover:bg-surface-elevated text-purple-400 border border-border-subtle transition-colors shadow-sm"
                          title="Dengar pelafalan"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Bunpou Center Details */}
                      <div className="text-center space-y-2.5 my-auto w-full max-w-md">
                        <h4 className="text-xl sm:text-2xl font-black text-gold font-heading leading-tight">
                          {currentItem.bunpou?.meaningId || currentItem.displayMeaning}
                        </h4>

                        {currentItem.bunpou?.nuance && (
                          <p className="text-xs text-text-secondary italic">
                            💡 Nuansa: {currentItem.bunpou.nuance}
                          </p>
                        )}

                        {/* Example sentence */}
                        {currentItem.bunpou?.examples && currentItem.bunpou.examples[0] && (
                          <div className="mt-2 p-3.5 rounded-2xl bg-surface-inset border border-border-subtle text-left space-y-1.5 max-w-md w-full mx-auto shadow-inner">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-bold text-text-primary leading-relaxed font-jp">
                                <RubyText
                                  japanese={currentItem.bunpou.examples[0].japanese}
                                  reading={currentItem.bunpou.examples[0].reading}
                                  showFurigana={true}
                                />
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speakJapanese(currentItem.bunpou!.examples[0].japanese);
                                }}
                                className="p-1.5 rounded-lg bg-surface-card hover:bg-surface-elevated text-gold border border-border-subtle shrink-0 transition-colors"
                                title="Dengarkan kalimat contoh"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-text-secondary font-medium">
                              {currentItem.bunpou.examples[0].meaningId}
                            </p>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-text-muted font-mono">
                        (Klik untuk kembali ke tampilan depan)
                      </p>
                    </>
                  ) : (
                    /* Default: Kotoba (Kosakata) Back Face - Identical to World KotobaModule */
                    <>
                      {/* Kotoba Top Header */}
                      <div className="w-full flex justify-between items-center text-xs">
                        <span className="text-indigo font-bold tracking-wider uppercase font-mono">
                          Terjemahan & Arti
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakJapanese(currentItem.kotoba?.word || currentItem.displayTitle);
                          }}
                          className="p-2 rounded-xl bg-surface-inset hover:bg-surface-elevated text-gold border border-border-subtle transition-colors shadow-sm"
                          title="Dengar pelafalan"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Kotoba Center Details */}
                      <div className="text-center space-y-2.5 my-auto w-full max-w-md">
                        <h4 className="text-2xl sm:text-3xl font-black text-gold font-heading leading-tight">
                          {currentItem.kotoba?.meaningId || currentItem.displayMeaning}
                        </h4>
                        {currentItem.kotoba?.meaningJa && (
                          <p className="text-xs text-text-secondary italic">
                            Definisi JP: {currentItem.kotoba.meaningJa}
                          </p>
                        )}

                        {/* Example Sentence Card (matching Image 1 exactly) */}
                        {currentItem.kotoba?.exampleSentence && (
                          <div className="mt-3 p-3.5 rounded-2xl bg-surface-inset border border-border-subtle text-left space-y-1.5 max-w-md w-full mx-auto shadow-inner">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-bold text-text-primary leading-relaxed font-jp">
                                <RubyText
                                  japanese={currentItem.kotoba.exampleSentence.japanese}
                                  reading={currentItem.kotoba.exampleSentence.reading}
                                  showFurigana={true}
                                />
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speakJapanese(currentItem.kotoba!.exampleSentence!.japanese);
                                }}
                                className="p-1.5 rounded-lg bg-surface-card hover:bg-surface-elevated text-gold border border-border-subtle shrink-0 transition-colors"
                                title="Dengarkan kalimat contoh"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-text-secondary font-medium">
                              {currentItem.kotoba.exampleSentence.meaningId}
                            </p>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-text-muted font-mono">
                        (Klik untuk kembali ke tampilan depan)
                      </p>
                    </>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Bottom Card Controls */}
            <div className="w-full space-y-3 pt-2">
              {/* If Flipped: Assessment Buttons (Belum Hafal vs Sudah Paham) */}
              {isFlipped ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 gap-3 w-full"
                >
                  <button
                    onClick={() => handleNext(false)}
                    className="py-3 px-4 rounded-2xl bg-surface-card border border-wine-accent/40 hover:bg-surface-elevated text-text-primary flex items-center justify-center gap-2 font-heading font-bold text-xs transition-all shadow-md hover:scale-[1.01]"
                  >
                    <XCircle className="w-4 h-4 text-wine-accent" />
                    <span>Belum Hafal (Ulangi)</span>
                  </button>

                  <button
                    onClick={() => handleNext(true)}
                    className="py-3 px-4 rounded-2xl btn-cta text-text-primary flex items-center justify-center gap-2 font-heading font-bold text-xs transition-all shadow-md hover:scale-[1.01]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-gold" />
                    <span>Sudah Paham (+EXP)</span>
                  </button>
                </motion.div>
              ) : (
                <div className="flex items-center justify-between gap-3 w-full">
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="flex-1 py-3 px-4 rounded-2xl bg-surface-card border border-border-subtle hover:bg-surface-elevated text-text-secondary hover:text-text-primary font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Sebelumnya</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsFlipped(true);
                      playSound('click', soundEnabled);
                    }}
                    className="flex-1 py-3 px-4 rounded-2xl btn-cta text-text-primary font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:scale-[1.01]"
                  >
                    <span>Balik Kartu (Lihat Arti)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Auxiliary Previous link when flipped */}
              {isFlipped && currentIndex > 0 && (
                <div className="flex justify-center">
                  <button
                    onClick={handlePrev}
                    className="text-[11px] text-text-muted hover:text-text-primary font-mono flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Kembali ke kartu sebelumnya</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
