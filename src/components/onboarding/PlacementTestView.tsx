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
      <div className="flex flex-col items-center justify-center h-full p-8 text-stone-400">
        Database ujian untuk {targetLevel} belum tersedia.
        <button onClick={onCancel} className="mt-4 px-4 py-2 bg-stone-800 rounded-lg">Kembali</button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4 relative z-[200]">
        <div className={`p-8 rounded-3xl max-w-sm w-full text-center border-2 shadow-2xl ${
          isPassed ? 'bg-amber-950/90 border-amber-500/50' : 'bg-rose-950/90 border-rose-500/50'
        }`}>
          <div className="w-20 h-20 mx-auto rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center mb-6">
            {isPassed ? (
              <Crown className="w-10 h-10 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            ) : (
              <XCircle className="w-10 h-10 text-rose-400" />
            )}
          </div>
          <h2 className={`text-2xl font-bold font-medieval mb-2 ${isPassed ? 'text-amber-400' : 'text-rose-400'}`}>
            {isPassed ? 'Ujian LULUS!' : 'Ujian GAGAL'}
          </h2>
          <p className="text-stone-300 mb-6 text-sm">
            Skor Anda: <strong className="text-xl">{score}</strong> / {questions.length}
            <br />
            <span className="text-xs text-stone-500">Minimal Lulus: {passThreshold} benar (75%)</span>
          </p>

          <button
            onClick={() => onComplete(isPassed)}
            className={`w-full py-3 rounded-xl font-bold transition-transform active:scale-95 ${
              isPassed 
                ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' 
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
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
    <div className="fixed inset-0 z-[200] bg-stone-950 flex flex-col items-center p-2 sm:p-4 overflow-y-auto">
      {/* Header Overlay */}
      <div className="w-full max-w-3xl mb-4 bg-stone-900 rounded-2xl p-4 border border-stone-800 flex items-center justify-between shadow-lg sticky top-2 z-10 shrink-0">
        <div>
          <h1 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Ujian Penempatan {targetLevel}
          </h1>
          <p className="text-[10px] text-stone-500 hidden sm:block">Peringatan: Keluar dari halaman ini akan membatalkan ujian.</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold ${
          timeLeft < 60 ? 'bg-rose-950/50 border-rose-500/50 text-rose-400 animate-pulse' : 'bg-stone-950 border-stone-800 text-stone-300'
        }`}>
          <Timer className="w-4 h-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="w-full max-w-3xl bg-stone-900/50 rounded-2xl border border-stone-800 overflow-hidden relative min-h-[600px] mb-8">
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
