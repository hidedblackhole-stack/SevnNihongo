import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Volume2, ArrowRight, RotateCcw, HelpCircle, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question } from '../../types/content';
import { playSound, speakJapanese } from '../../utils/audio';
import { calculateExpBonus } from '../../data/tiers';
import { RubyText } from './RubyText';
import { StarSentenceQuiz } from './StarSentenceQuiz';

import { sendScoreEvent } from '../../lib/supabase';

interface QuizEngineProps {
  title: string;
  questions: Question[];
  onComplete: (score: number, total: number, expGained: number, goldGained: number) => void;
  onExit: () => void;
  baseExpPerQuestion?: number;
  baseGoldPerQuestion?: number;
  playerMp?: number;
  playerInt?: number;
  onUseMp?: (amount: number) => boolean;
  onWrongAnswer?: () => void;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
}

export const QuizEngine: React.FC<QuizEngineProps> = ({
  title,
  questions: propQuestions,
  onComplete,
  onExit,
  baseExpPerQuestion = 15,
  baseGoldPerQuestion = 10,
  playerMp = 50,
  playerInt = 10,
  onUseMp,
  onWrongAnswer,
  soundEnabled = true,
  furiganaEnabled = true,
}) => {
  // Lock questions in state for the entire quiz session so external re-renders cannot alter options or questions
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>(propQuestions);
  const activeTitleRef = React.useRef(title);

  // If a brand new quiz is mounted or title changes, update the session questions
  React.useEffect(() => {
    if (activeTitleRef.current !== title || (sessionQuestions.length === 0 && propQuestions.length > 0)) {
      activeTitleRef.current = title;
      setSessionQuestions(propQuestions);
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsAnswered(false);
      setCorrectCount(0);
      setHiddenOptions([]);
      setIsFinished(false);
    }
  }, [title, propQuestions, sessionQuestions.length]);

  const questions = sessionQuestions.length > 0 ? sessionQuestions : propQuestions;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const currentQ = questions[currentIndex] || questions[0];
  const totalQ = questions.length;

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
      if (onWrongAnswer) onWrongAnswer();
    }

    // Send server-authoritative score event
    sendScoreEvent('quiz_answer', currentQ.id || `q_${currentIndex}`, isCorrect);
  };

  const handleStarAnswer = (selectedIdx: number, isCorrect: boolean) => {
    if (isAnswered) return;
    setSelectedOption(selectedIdx);
    setIsAnswered(true);

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    } else {
      if (onWrongAnswer) onWrongAnswer();
    }

    sendScoreEvent('quiz_answer', currentQ.id || `q_${currentIndex}`, isCorrect);
  };

  const handleNext = () => {
    if (currentIndex < totalQ - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setHiddenOptions([]);
    } else {
      setIsFinished(true);
      const baseExpEarned = correctCount * baseExpPerQuestion;
      const { totalExpGained } = calculateExpBonus(baseExpEarned, playerInt);
      const expGained = totalExpGained;
      const goldGained = correctCount * baseGoldPerQuestion;

      if (correctCount >= Math.ceil(totalQ * 0.7)) {
        playSound('fanfare', soundEnabled);
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      onComplete(correctCount, totalQ, expGained, goldGained);
    }
  };

  const handleUse5050Hint = () => {
    if (hiddenOptions.length > 0 || isAnswered) return;
    const mpCost = 15;
    if (onUseMp && !onUseMp(mpCost)) {
      alert('MP tidak cukup untuk menggunakan skill 50/50 Hint!');
      return;
    }

    playSound('coin', soundEnabled);
    const wrongIndices = currentQ.options
      .map((_, i) => i)
      .filter(i => i !== currentQ.correctIndex);
    const toHide = wrongIndices.slice(0, 2);
    setHiddenOptions(toHide);
  };

  const handlePlayAudio = (text: string) => {
    speakJapanese(text);
  };

  if (isFinished) {
    const isSuccess = correctCount >= Math.ceil(totalQ * 0.6);
    const baseExpEarned = correctCount * baseExpPerQuestion;
    const { totalExpGained, bonusExp, bonusPercentage } = calculateExpBonus(baseExpEarned, playerInt);
    const expGained = totalExpGained;
    const goldGained = correctCount * baseGoldPerQuestion;

    return (
      <div className="w-full max-w-xl mx-auto p-6 panel text-center space-y-5 shadow-2xl">
        <div className="p-4 inline-flex rounded-full bg-surface-inset border border-gold/40 text-gold">
          {isSuccess ? <CheckCircle2 className="w-9 h-9" /> : <RotateCcw className="w-9 h-9" />}
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-text-primary font-heading">
          {isSuccess ? 'Ujian Selesai! Luar Biasa!' : 'Tetap Berjuang! Coba Lagi!'}
        </h3>

        <div className="text-xs sm:text-sm text-text-secondary">
          Skor Akhir: <strong className="text-gold font-mono text-xl">{correctCount}</strong> / {totalQ} Benar
        </div>

        {/* Rewards Earned Box */}
        <div className="flex flex-col items-center gap-3 max-w-sm mx-auto p-4 rounded-2xl bg-surface-inset border border-border-subtle">
          <div className="text-center">
            <span className="text-[11px] text-text-muted">Perolehan EXP</span>
            <div className="text-base sm:text-lg font-bold text-gold flex items-center justify-center gap-1 font-mono">
              +{expGained} EXP
            </div>
            {bonusExp > 0 && (
              <span className="text-[10px] text-gold/80 font-medium block">
                (+{bonusExp} INT bonus +{bonusPercentage}%)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              setCurrentIndex(0);
              setSelectedOption(null);
              setIsAnswered(false);
              setCorrectCount(0);
              setHiddenOptions([]);
              setIsFinished(false);
              setSessionQuestions(propQuestions);
              playSound('click', soundEnabled);
            }}
            className="btn btn-pill py-2.5 px-4 text-xs font-bold flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            Ulangi Drill
          </button>
          <button
            onClick={() => {
              playSound('click', soundEnabled);
              onExit();
            }}
            className="btn-cta py-2.5 px-5 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
          >
            Kembali ke Modul
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto p-4 sm:p-6 panel text-text-primary shadow-xl space-y-4">
      {/* Top Header & Progress */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo font-heading">
            {title}
          </span>
          <div className="text-xs text-text-secondary">
            Pertanyaan <strong className="text-text-primary">{currentIndex + 1}</strong> dari {totalQ}
          </div>
        </div>

        {/* 50/50 Skill Hint Button */}
        <button
          onClick={handleUse5050Hint}
          disabled={hiddenOptions.length > 0 || isAnswered || playerMp < 15}
          className={`btn btn-pill text-xs flex items-center gap-1.5 ${
            hiddenOptions.length > 0
              ? 'opacity-40 cursor-not-allowed'
              : playerMp >= 15
              ? 'text-indigo border-indigo/40 hover:bg-indigo/10'
              : 'opacity-40 cursor-not-allowed'
          }`}
          title="Gunakan 15 MP untuk membuang 2 pilihan salah"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>50/50 Hint (15 MP)</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full rpg-progress-track rounded-full overflow-hidden">
        <motion.div
          animate={{ width: `${((currentIndex + 1) / totalQ) * 100}%` }}
          className="h-full bg-indigo rounded-full shadow-sm"
        />
      </div>

      {/* Question Body: Star Sentence Quiz or Standard Multiple Choice */}
      {((currentQ.scrambleWords && currentQ.scrambleWords.length === 4) || currentQ.prompt.includes('★') || currentQ.prompt.includes('＿★＿')) ? (
        <StarSentenceQuiz
          question={currentQ}
          isAnswered={isAnswered}
          onAnswer={handleStarAnswer}
          soundEnabled={soundEnabled}
        />
      ) : (
        <>
          {/* Question Prompt Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 flex-1">
                {currentQ.ruby && furiganaEnabled ? (
                  <h3 className="text-base sm:text-lg font-bold text-text-primary leading-relaxed">
                    <RubyText
                      japanese={currentQ.prompt}
                      reading={currentQ.ruby}
                      showFurigana={furiganaEnabled}
                    />
                  </h3>
                ) : (
                  <>
                    {currentQ.ruby && (
                      <p className="text-xs text-indigo font-jp font-medium">
                        {currentQ.ruby}
                      </p>
                    )}
                    <h3 className="text-base sm:text-lg font-bold text-text-primary leading-relaxed font-jp">
                      {currentQ.prompt}
                    </h3>
                  </>
                )}
              </div>

              <button
                onClick={() => handlePlayAudio(currentQ.audioPrompt || currentQ.prompt)}
                className="p-2 rounded-xl bg-surface-card hover:bg-surface-elevated border border-border-subtle text-indigo transition-colors shrink-0"
                title="Dengarkan Pengucapan"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Options List */}
          <div className="space-y-2">
            {currentQ.options.map((option, idx) => {
              const isHidden = hiddenOptions.includes(idx);
              if (isHidden) {
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-surface-inset/40 border border-dashed border-border-subtle text-text-muted text-xs italic text-center"
                  >
                    Pilihan dieliminasi oleh Hint 50/50
                  </div>
                );
              }

              let btnStyle = 'panel hover:border-indigo/50 text-text-primary';

              if (isAnswered) {
                if (idx === currentQ.correctIndex) {
                  btnStyle = 'bg-state-success/15 border-state-success text-state-success shadow-[0_0_15px_rgba(79,174,134,0.2)] font-bold';
                } else if (idx === selectedOption) {
                  btnStyle = 'bg-wine-accent/15 border-wine-accent text-wine-accent font-bold';
                } else {
                  btnStyle = 'bg-surface-inset border-border-subtle text-text-muted opacity-40';
                }
              }

              return (
                <motion.button
                  key={idx}
                  whileTap={!isAnswered ? { scale: 0.99 } : {}}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium flex items-center justify-between gap-3 transition-all ${btnStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-surface-inset border border-border-subtle text-xs flex items-center justify-center font-mono font-bold text-indigo">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="font-jp">{option}</span>
                  </div>

                  {isAnswered && idx === currentQ.correctIndex && (
                    <CheckCircle2 className="w-4 h-4 text-state-success shrink-0" />
                  )}
                  {isAnswered && idx === selectedOption && idx !== currentQ.correctIndex && (
                    <XCircle className="w-4 h-4 text-wine-accent shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Explanation Banner (when answered) */}
          <AnimatePresence>
            {isAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  selectedOption === currentQ.correctIndex
                    ? 'bg-state-success/10 border-state-success/30 text-text-primary'
                    : 'bg-wine-accent/10 border-wine-accent/30 text-text-primary'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 font-heading">
                  {selectedOption === currentQ.correctIndex ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-state-success" />
                      <span className="text-state-success">Jawaban Benar! (+{Math.round(baseExpPerQuestion * (1 + playerInt * 0.04))} EXP)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-wine-accent" />
                      <span className="text-wine-accent">Kurang Tepat</span>
                    </>
                  )}
                </div>
                <p className="text-text-secondary leading-relaxed">
                  {currentQ.explanation}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Next Button */}
      {isAnswered && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleNext}
          className="w-full py-3 rounded-xl btn-cta font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all font-heading"
        >
          <span>{currentIndex < totalQ - 1 ? 'Lanjut ke Soal Berikutnya' : 'Lihat Hasil Akhir'}</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
};
