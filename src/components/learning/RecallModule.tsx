import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Sparkles, CheckCircle2, XCircle, Volume2, ArrowRight, RotateCcw, Award, ShieldAlert, BookOpen, Layers, Undo2, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { RecallQueueItem, RecallPriorityTier, Question, MasteryDifficultyLevel } from '../../types/content';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { DOKKAI_DATABASE } from '../../data/dokkai';
import { CHOUKAI_DATABASE } from '../../data/choukai';
import { playSound, speakJapanese } from '../../utils/audio';
import { RubyText } from './RubyText';

interface RecallModuleProps {
  recallQueue: RecallQueueItem[];
  playerMp: number;
  playerInt: number;
  onUseMp?: (amount: number) => boolean;
  onItemReviewed: (itemId: string, category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai', isCorrect: boolean) => void;
  onCompleteRecallSession: (totalReviewed: number, correctCount: number, expGained: number, goldGained: number) => void;
  onExit: () => void;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
}

export const RecallModule: React.FC<RecallModuleProps> = ({
  recallQueue,
  playerMp,
  playerInt,
  onUseMp,
  onItemReviewed,
  onCompleteRecallSession,
  onExit,
  soundEnabled = true,
  furiganaEnabled = true,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | RecallPriorityTier>('ALL');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  // Level 5 Sentence Construction State
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<{ id: string; word: string }[]>([]);

  // Filtered queue
  const filteredQueue = activeFilter === 'ALL'
    ? recallQueue
    : recallQueue.filter(q => q.priorityTier === activeFilter);

  const currentItem = filteredQueue[currentIndex] || filteredQueue[0] || recallQueue[0];

  // Initialize word bank if current question is Level 5 Sentence Production
  useEffect(() => {
    if (currentItem?.sampleQuestion?.difficultyLevel === 5 && currentItem.sampleQuestion.scrambleWords) {
      setAvailableWords(
        currentItem.sampleQuestion.scrambleWords.map((w, idx) => ({
          id: `${w}_${idx}`,
          word: w
        }))
      );
      setSelectedWords([]);
    } else {
      setSelectedWords([]);
      setAvailableWords([]);
    }
  }, [currentIndex, currentItem]);

  if (!recallQueue || recallQueue.length === 0) {
    return (
      <div className="w-full max-w-lg mx-auto p-6 sm:p-8 rounded-3xl bg-stone-900 border border-amber-600/30 text-center space-y-5 shadow-xl">
        <div className="p-4 inline-flex rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-amber-300 font-medieval">
            SEMUA MATERI TELAH SEGAR!
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-1">
            Tidak ada materi dalam antrean Recall yang perlu direview saat ini. Ingatanmu masih dalam kondisi prima.
          </p>
        </div>
        <button
          onClick={onExit}
          className="w-full py-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs sm:text-sm font-medieval transition-colors"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="w-full max-w-lg mx-auto p-6 rounded-3xl bg-stone-900 border border-stone-800 text-center space-y-4">
        <p className="text-xs text-stone-300">Tidak ada item pada filter ini.</p>
        <button
          onClick={() => {
            setActiveFilter('ALL');
            setCurrentIndex(0);
          }}
          className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs"
        >
          Tampilkan Semua Materi
        </button>
      </div>
    );
  }

  const currentQ = currentItem.sampleQuestion || {
    id: `rc_${currentItem.itemId}`,
    prompt: `Apa penggunaan yang tepat untuk materi 「${currentItem.title}」?`,
    options: [currentItem.subtitle || 'Pilihan arti tepat', 'Pilihan tidak relevan', 'Bukan kalimat alami', 'Salah bentuk'],
    correctIndex: 0,
    explanation: `${currentItem.title}: ${currentItem.subtitle}`
  };

  const totalItems = filteredQueue.length;

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correctIndex;
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      playSound('correct', soundEnabled);
    } else {
      playSound('wrong', soundEnabled);
    }

    onItemReviewed(currentItem.itemId, currentItem.category, isCorrect);
  };

  // Handle word selection for Level 5 sentence production
  const handleWordClick = (wordObj: { id: string; word: string }) => {
    if (isAnswered) return;
    setSelectedWords(prev => [...prev, wordObj.word]);
    setAvailableWords(prev => prev.filter(w => w.id !== wordObj.id));
  };

  const handleRemoveWord = (word: string, indexToRemove: number) => {
    if (isAnswered) return;
    setSelectedWords(prev => prev.filter((_, i) => i !== indexToRemove));
    setAvailableWords(prev => [...prev, { id: `${word}_${Date.now()}`, word }]);
  };

  const handleSubmitSentenceProduction = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    const constructed = selectedWords.join('');
    const targetString = currentQ.orderedTarget ? currentQ.orderedTarget.join('') : (currentQ.options[0] || '');
    
    // Check if constructed matches target or contains all key components
    const isCorrect = constructed === targetString || constructed.replace(/\s+/g, '') === targetString.replace(/\s+/g, '');
    
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      playSound('correct', soundEnabled);
    } else {
      playSound('wrong', soundEnabled);
    }

    onItemReviewed(currentItem.itemId, currentItem.category, isCorrect);
  };

  const handleNext = () => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setHiddenOptions([]);
    } else {
      setIsFinished(true);
      const expGained = correctCount * 25 + Math.round(playerInt * 2);
      const goldGained = correctCount * 15;

      if (correctCount >= Math.ceil(totalItems * 0.7)) {
        playSound('fanfare', soundEnabled);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      onCompleteRecallSession(totalItems, correctCount, expGained, goldGained);
    }
  };

  const handleUse5050 = () => {
    if (hiddenOptions.length > 0 || isAnswered || currentQ.difficultyLevel === 5) return;
    const mpCost = 10;
    if (onUseMp && !onUseMp(mpCost)) {
      alert('MP tidak cukup untuk Mantra 50/50!');
      return;
    }

    playSound('coin', soundEnabled);
    const correctIdx = currentQ.correctIndex;
    const wrongIndices = currentQ.options
      .map((_, i) => i)
      .filter(i => i !== correctIdx);
    setHiddenOptions(wrongIndices.slice(0, 2));
  };

  if (isFinished) {
    const accuracy = totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 100;
    return (
      <div className="w-full max-w-lg mx-auto p-6 sm:p-8 rounded-3xl bg-stone-900 border border-amber-500/50 text-center space-y-6 shadow-2xl">
        <div className="p-4 inline-flex rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 shadow-xl">
          <Award className="w-12 h-12" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-medieval">
            SESI RECALL ADAPTIF SELESAI
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-medieval">
            DAYA INGAT DIPERKUAT!
          </h2>
          <p className="text-xs sm:text-sm text-stone-300">
            {correctCount} dari {totalItems} materi berhasil diingat dengan tingkat akurasi ({accuracy}%).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-stone-950 border border-stone-800">
          <div>
            <span className="text-[11px] text-stone-400">EXP Diperoleh</span>
            <p className="text-lg font-bold text-amber-400 font-medieval">+{correctCount * 25} EXP</p>
          </div>
          <div>
            <span className="text-[11px] text-stone-400">Peningkatan True Mastery</span>
            <p className="text-lg font-bold text-emerald-400 font-medieval">+{Math.round(accuracy * 0.15)}%</p>
          </div>
        </div>

        <button
          onClick={onExit}
          className="w-full py-3.5 rounded-xl bg-[#57382A] hover:bg-[#442D22] text-[#FFF9F0] dark:bg-amber-600 dark:text-stone-950 dark:hover:bg-amber-500 font-black text-sm shadow-md active:scale-95 transition-all font-medieval"
        >
          Selesai & Kembali ke Beranda
        </button>
      </div>
    );
  }

  // Count items per priority
  const countCritical = recallQueue.filter(q => q.priorityTier === 'CRITICAL').length;
  const countWeak = recallQueue.filter(q => q.priorityTier === 'WEAK').length;
  const countReview = recallQueue.filter(q => q.priorityTier === 'REVIEW').length;
  const countMaintain = recallQueue.filter(q => q.priorityTier === 'MAINTAIN').length;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-6">
      {/* Priority Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => { setActiveFilter('ALL'); setCurrentIndex(0); }}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
            activeFilter === 'ALL' ? 'bg-amber-500 text-stone-950 font-mono' : 'bg-stone-900 text-stone-400 border border-stone-800'
          }`}
        >
          Semua ({recallQueue.length})
        </button>
        {countCritical > 0 && (
          <button
            onClick={() => { setActiveFilter('CRITICAL'); setCurrentIndex(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
              activeFilter === 'CRITICAL' ? 'bg-red-500 text-white shadow-md' : 'bg-stone-900 text-red-400 border border-red-900/60'
            }`}
          >
            <span>🔴 Kritis</span>
            <span className="font-mono">({countCritical})</span>
          </button>
        )}
        {countWeak > 0 && (
          <button
            onClick={() => { setActiveFilter('WEAK'); setCurrentIndex(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
              activeFilter === 'WEAK' ? 'bg-amber-600 text-stone-950' : 'bg-stone-900 text-amber-400 border border-amber-900/50'
            }`}
          >
            <span>🟠 Lemah</span>
            <span className="font-mono">({countWeak})</span>
          </button>
        )}
        {countReview > 0 && (
          <button
            onClick={() => { setActiveFilter('REVIEW'); setCurrentIndex(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
              activeFilter === 'REVIEW' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-amber-400 border border-amber-900/50'
            }`}
          >
            <span>🟡 Jadwal SRS</span>
            <span className="font-mono">({countReview})</span>
          </button>
        )}
        {countMaintain > 0 && (
          <button
            onClick={() => { setActiveFilter('MAINTAIN'); setCurrentIndex(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
              activeFilter === 'MAINTAIN' ? 'bg-emerald-600 text-stone-950' : 'bg-stone-900 text-emerald-400 border border-emerald-900/50'
            }`}
          >
            <span>🟢 Penguatan</span>
            <span className="font-mono">({countMaintain})</span>
          </button>
        )}
      </div>

      {/* Top Recall Progress & Priority Pill */}
      <div className="p-4 sm:p-5 rounded-3xl bg-stone-900 border border-amber-600/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-lg ${
              currentItem.priorityTier === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              <Flame className="w-4 h-4 animate-pulse" />
            </span>
            <span className="text-xs font-bold text-amber-300 font-medieval">
              RECALL ADAPTIF • {currentIndex + 1} / {totalItems}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-950 border border-stone-800 text-amber-300 font-mono">
              True Mastery: {currentItem.trueMasteryScore || 65}%
            </span>
            <span className="text-xs font-mono font-bold text-stone-300">
              Skor: {correctCount}/{currentIndex}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-stone-950 rounded-full overflow-hidden border border-stone-800">
          <div
            className="h-full bg-amber-600 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalItems) * 100}%` }}
          />
        </div>

        {/* Diagnostic Reason Alert */}
        <div className="p-2.5 rounded-xl bg-stone-950 border border-amber-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-stone-300">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-[11px] text-amber-200">
              <strong className="font-bold text-amber-300 font-medieval mr-1">Alasan Pengujian:</strong>
              {currentItem.reasonText}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
              currentItem.priorityTier === 'CRITICAL'
                ? 'bg-red-500 text-stone-950'
                : currentItem.priorityTier === 'WEAK'
                ? 'bg-amber-600 text-stone-950'
                : currentItem.priorityTier === 'REVIEW'
                ? 'bg-amber-500 text-stone-950'
                : 'bg-emerald-600 text-stone-950'
            }`}>
              {currentItem.priorityTier}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-900 border border-stone-700 text-stone-300 uppercase font-mono">
              {currentItem.category}
            </span>
          </div>
        </div>

        {/* Personalized Tutor Insight */}
        {currentItem.tutorInsight && (
          <div className="p-2.5 rounded-xl bg-stone-950/80 border border-stone-800 text-[11px] text-stone-300 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {currentItem.tutorInsight}
            </p>
          </div>
        )}
      </div>

      {/* Question Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-stone-900 border border-stone-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between text-xs text-stone-400 border-b border-stone-800/80 pb-3">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-stone-200 font-medieval">{currentItem.title}</span>
          </div>

          <div className="flex items-center gap-2">
            {currentQ.difficultyLevel !== 5 && (
              <button
                onClick={handleUse5050}
                disabled={isAnswered || hiddenOptions.length > 0}
                className="px-2.5 py-1 rounded-lg bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-amber-300 border border-stone-800 text-[11px] font-bold flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>50/50 (10 MP)</span>
              </button>
            )}

            <button
              onClick={() => speakJapanese(currentQ.prompt)}
              className="p-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>

        <p className="text-sm sm:text-base text-stone-100 font-medium whitespace-pre-line leading-relaxed">
          {currentQ.ruby ? (
            <RubyText
              japanese={currentQ.prompt}
              reading={currentQ.ruby}
              showFurigana={furiganaEnabled}
            />
          ) : (
            currentQ.prompt
          )}
        </p>

        {/* LEVEL 5: INTERACTIVE SENTENCE PRODUCTION BUILDER */}
        {currentQ.difficultyLevel === 5 ? (
          <div className="space-y-4 pt-2">
            {/* Target Assembly Box */}
            <div className="p-4 rounded-2xl bg-stone-950 border-2 border-dashed border-amber-600/50 min-h-[64px] flex flex-wrap items-center gap-2">
              {selectedWords.length === 0 ? (
                <span className="text-xs text-stone-500 italic">
                  Klik kata-kata di bawah untuk menyusun kalimat bahasa Jepang...
                </span>
              ) : (
                selectedWords.map((word, idx) => (
                  <motion.button
                    key={`${word}_${idx}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={() => handleRemoveWord(word, idx)}
                    disabled={isAnswered}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-red-500/20 text-amber-300 hover:text-red-300 border border-amber-500/40 hover:border-red-500/40 text-xs sm:text-sm font-bold flex items-center gap-1 transition-all"
                  >
                    <span>{word}</span>
                    <span className="text-[10px] opacity-60">×</span>
                  </motion.button>
                ))
              )}
            </div>

            {/* Word Bank Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {availableWords.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleWordClick(item)}
                  disabled={isAnswered}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700 text-xs sm:text-sm font-bold shadow-sm transition-all"
                >
                  {item.word}
                </motion.button>
              ))}
            </div>

            {/* Submit Sentence Button */}
            {!isAnswered && (
              <button
                onClick={handleSubmitSentenceProduction}
                disabled={selectedWords.length === 0}
                className="w-full py-3 rounded-xl bg-amber-600 hover:disabled:opacity-40 text-stone-950 font-black text-xs sm:text-sm shadow-md transition-all font-medieval flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Periksa Susunan Kalimat</span>
              </button>
            )}
          </div>
        ) : (
          /* STANDARD MULTIPLE CHOICE OPTIONS (LEVELS 1 - 4) */
          <div className="grid grid-cols-1 gap-2.5 pt-2">
            {currentQ.options.map((opt, idx) => {
              const isHidden = hiddenOptions.includes(idx);
              if (isHidden) {
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-stone-950/40 border border-stone-800/40 opacity-20 text-center text-xs italic text-stone-600 pointer-events-none"
                  >
                    (Pilihan tereliminasi)
                  </div>
                );
              }

              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.correctIndex;

              let optionStyle = 'bg-stone-950 border-stone-800 hover:border-amber-500/50 text-stone-200';
              if (isAnswered) {
                if (isCorrect) {
                  optionStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-emerald-900/30';
                } else if (isSelected) {
                  optionStyle = 'bg-red-950/80 border-red-500 text-red-200 shadow-red-950/40';
                } else {
                  optionStyle = 'bg-stone-950/50 border-stone-900 text-stone-500 opacity-60';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 shadow-sm ${optionStyle}`}
                >
                  <span>{opt}</span>
                  {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                  {isAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Feedback / Explanation */}
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3 pt-3"
          >
            <div className="text-xs text-stone-300 leading-relaxed">
              <strong className="text-amber-400 block mb-1 font-medieval">Pengingat Memori:</strong>
              {currentQ.explanation}
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3 rounded-xl bg-[#57382A] hover:bg-[#442D22] text-[#FFF9F0] dark:bg-amber-600 dark:text-stone-950 dark:hover:bg-amber-500 font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all font-medieval flex items-center justify-center gap-2"
            >
              <span>Materi Berikutnya</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};
