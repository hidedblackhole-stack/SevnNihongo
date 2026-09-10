import React, { useState, useEffect, useMemo } from 'react';
import { ALL_TRYOUTS } from '../../data/tryouts';
import { QuizEngine } from '../learning/QuizEngine';
import { Question } from '../../types/content';
import { ShieldAlert, Timer, Crown, XCircle } from 'lucide-react';
import { playSound } from '../../utils/audio';

interface PlacementTestViewProps {
  targetLevel: 'N4' | 'N3' | 'N2' | 'N1';
  onComplete: (success: boolean) => void;
  onCancel: () => void;
  soundEnabled: boolean;
}

export const PlacementTestView: React.FC<PlacementTestViewProps> = ({
  targetLevel,
  onComplete,
  onCancel,
  soundEnabled
}) => {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes (600s)
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  // Generate 20 random questions from the target level tryouts
  const questions = useMemo(() => {
    const levelTryouts = ALL_TRYOUTS.filter(t => t.level === targetLevel);
    if (levelTryouts.length === 0) return [];

    let allQuestions: Question[] = [];
    levelTryouts.forEach(t => {
      if (t.data.sections.mojiGoi?.questions) {
        allQuestions = [...allQuestions, ...t.data.sections.mojiGoi.questions.map(q => ({ ...q, explanation: '' }))];
      }
      if (t.data.sections.bunpouDokkai?.questions) {
        allQuestions = [...allQuestions, ...t.data.sections.bunpouDokkai.questions.map(q => ({ ...q, explanation: '' }))];
      }
    });

    // Shuffle and pick 20
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 20);
  }, [targetLevel]);

  useEffect(() => {
    if (isFinished) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto fail if time runs out
          handleFinish(0, questions.length);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isFinished, questions.length]);

  const handleFinish = (finalScore: number, total: number) => {
    setIsFinished(true);
    setScore(finalScore);
  };

  const passThreshold = Math.ceil(questions.length * 0.75);
  const isPassed = score >= passThreshold;

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-text-muted">
        Database ujian untuk {targetLevel} belum tersedia.
        <button onClick={onCancel} className="mt-4 px-4 py-2 rpg-btn rpg-btn-secondary rounded-lg">Kembali</button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center p-4 relative z-[200]">
        <div className={`p-8 rounded-3xl max-w-sm w-full text-center border-2 shadow-2xl panel bg-surface-card ${
          isPassed ? 'border-gold/50' : 'border-rose-500/50'
        }`}>
          <div className="w-20 h-20 mx-auto rounded-full bg-surface-inset border border-border-subtle flex items-center justify-center mb-6">
            {isPassed ? (
              <Crown className="w-10 h-10 text-gold" />
            ) : (
              <XCircle className="w-10 h-10 text-rose-500" />
            )}
          </div>
          <h2 className={`text-2xl font-bold font-heading mb-2 ${isPassed ? 'text-gold' : 'text-rose-500'}`}>
            {isPassed ? 'Ujian LULUS!' : 'Ujian GAGAL'}
          </h2>
          <p className="text-text-secondary mb-6 text-sm">
            Skor Anda: <strong className="text-xl text-text-primary">{score}</strong> / {questions.length}
            <br />
            <span className="text-xs text-text-muted">Minimal Lulus: {passThreshold} benar (75%)</span>
          </p>

          <button
            onClick={() => onComplete(isPassed)}
            className={`w-full py-3 rounded-xl font-bold transition-transform active:scale-95 font-heading ${
              isPassed 
                ? 'rpg-btn rpg-btn-primary' 
                : 'rpg-btn rpg-btn-secondary'
            }`}
          >
            {isPassed ? 'Klaim Hadiah & Mulai' : 'Mulai dari Nol'}
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[200] bg-surface-base flex flex-col items-center p-2 sm:p-4 overflow-y-auto">
      {/* Header Overlay */}
      <div className="w-full max-w-3xl mb-4 bg-surface-card rounded-2xl p-4 border border-border-subtle flex items-center justify-between shadow-lg sticky top-2 z-10 shrink-0">
        <div>
          <h1 className="text-sm font-bold text-gold flex items-center gap-2 font-heading">
            <ShieldAlert className="w-4 h-4" />
            Ujian Penempatan {targetLevel}
          </h1>
          <p className="text-[10px] text-text-muted hidden sm:block">Peringatan: Keluar dari halaman ini akan membatalkan ujian.</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold ${
          timeLeft < 60 ? 'bg-rose-500/15 border-rose-500/50 text-rose-500 animate-pulse' : 'bg-surface-inset border-border-subtle text-text-primary'
        }`}>
          <Timer className="w-4 h-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="w-full max-w-3xl bg-surface-card rounded-2xl border border-border-subtle overflow-hidden relative min-h-[600px] mb-8 shadow-xl">
        <QuizEngine
          title={`Soal Ujian Penempatan`}
          questions={questions}
          playerMp={999}
          playerInt={99}
          onUseMp={() => false}
          soundEnabled={soundEnabled}
          onComplete={(finalScore, total) => handleFinish(finalScore, total)}
          onExit={onCancel}
        />
      </div>
    </div>
  );
};
