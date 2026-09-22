import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Skull, Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2, 
  Volume2, Trophy, Award, BookOpen, Layers 
} from 'lucide-react';
import { TryOutData } from '../../types/content';
import { playSound, speakJapanese } from '../../utils/audio';
import { ALL_TRYOUTS, DEFAULT_TRYOUT } from '../../data/tryouts';

interface DungeonBattleModuleProps {
  tryOutData?: TryOutData;
  onComplete: (score: number, total: number, expGained: number, goldGained: number, tryoutId?: string) => void;
  onBack: () => void;
  soundEnabled?: boolean;
}

type StepKey = 'intro' | 'mojiGoi' | 'bunpouDokkai' | 'choukai' | 'transition' | 'results';

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string; glow: string; badge: string }> = {
  N1: { 
    bg: 'bg-crimson/10', 
    text: 'text-crimson', 
    border: 'border-crimson/40', 
    glow: 'shadow-crimson/20', 
    badge: 'bg-crimson text-white font-bold' 
  },
  N2: { 
    bg: 'bg-indigo/10', 
    text: 'text-indigo', 
    border: 'border-indigo/40', 
    glow: 'shadow-indigo/20', 
    badge: 'bg-indigo text-white font-bold' 
  },
  N3: { 
    bg: 'bg-gold/10', 
    text: 'text-gold', 
    border: 'border-gold/40', 
    glow: 'shadow-gold/20', 
    badge: 'bg-gold text-surface-ground font-bold' 
  },
  N4: { 
    bg: 'bg-matcha/10', 
    text: 'text-matcha', 
    border: 'border-matcha/40', 
    glow: 'shadow-matcha/20', 
    badge: 'bg-matcha text-white font-bold' 
  },
  N5: { 
    bg: 'bg-teal/10', 
    text: 'text-teal', 
    border: 'border-teal/40', 
    glow: 'shadow-teal/20', 
    badge: 'bg-teal text-white font-bold' 
  },
  JFT: { 
    bg: 'bg-amber-500/10', 
    text: 'text-amber-400', 
    border: 'border-amber-500/40', 
    glow: 'shadow-amber-500/20', 
    badge: 'bg-amber-500 text-surface-ground font-bold' 
  },
};

export const DungeonBattleModule: React.FC<DungeonBattleModuleProps> = ({
  tryOutData,
  onComplete,
  onBack,
  soundEnabled = true,
}) => {
  const [activeTryOut, setActiveTryOut] = useState<TryOutData>(tryOutData || DEFAULT_TRYOUT);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<'ALL' | 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'JFT'>('ALL');
  const [currentStep, setCurrentStep] = useState<StepKey>('intro');
  const [nextSectionKey, setNextSectionKey] = useState<StepKey | null>(null);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showGrid, setShowGrid] = useState(false);
  
  // Choukai Audio State
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [hasAudioPlayed, setHasAudioPlayed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // When props change, update active tryout if still in intro
  useEffect(() => {
    if (tryOutData && currentStep === 'intro') {
      setActiveTryOut(tryOutData);
    }
  }, [tryOutData, currentStep]);

  // Timer Effect
  useEffect(() => {
    if (currentStep === 'mojiGoi' || currentStep === 'bunpouDokkai' || currentStep === 'choukai') {
      const timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [currentStep]);

  useEffect(() => {
    if (timeLeft === 0 && (currentStep === 'mojiGoi' || currentStep === 'bunpouDokkai' || currentStep === 'choukai')) {
      handleFinishSection();
    }
  }, [timeLeft, currentStep]);

  const startSection = (key: 'mojiGoi' | 'bunpouDokkai' | 'choukai') => {
    const sec = activeTryOut.sections[key];
    if (!sec || !sec.questions || sec.questions.length === 0) {
      if (key === 'mojiGoi') {
        startSection('bunpouDokkai');
      } else {
        setCurrentStep('results');
      }
      return;
    }

    setCurrentStep(key);
    setCurrentQuestionIndex(0);
    setTimeLeft(sec.timeLimitMinutes * 60);
    setIsAudioPlaying(false);
    setHasAudioPlayed(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    playSound('click', soundEnabled);
  };

  const handleFinishSection = () => {
    playSound('fanfare', soundEnabled);
    if (currentStep === 'mojiGoi') {
      setNextSectionKey('bunpouDokkai');
      setCurrentStep('transition');
    } else if (currentStep === 'bunpouDokkai') {
      const choukaiQuestions = activeTryOut.sections.choukai?.questions || [];
      if (choukaiQuestions.length > 0) {
        setNextSectionKey('choukai');
        setCurrentStep('transition');
      } else {
        // No Choukai questions in paper-only packs
        setCurrentStep('results');
      }
    } else if (currentStep === 'choukai') {
      setCurrentStep('results');
    }
  };

  const getPassingThreshold = (level: string, maxScore: number) => {
    // JLPT standard passing marks ratio:
    // N1: 100/180 (~55.6%), N2: 90/180 (50%), N3: 95/180 (~52.8%), N4: 90/180 (50%), N5: 80/180 (~44.4%)
    const ratio = level === 'N1' ? 100 / 180 :
                  level === 'N3' ? 95 / 180 :
                  level === 'N5' ? 80 / 180 :
                  90 / 180;
    return Math.round(maxScore * ratio);
  };

  const calculateJLPTScore = () => {
    const sections: Array<'mojiGoi' | 'bunpouDokkai' | 'choukai'> = ['mojiGoi', 'bunpouDokkai', 'choukai'];
    let totalScore = 0;
    let maxTotalScore = 0;
    let totalQuestionsCount = 0;
    let totalCorrectCount = 0;
    const breakdown: Record<string, { score: number; max: number; correct: number; total: number }> = {};

    sections.forEach(secKey => {
      const section = activeTryOut.sections[secKey];
      if (!section || !section.questions || section.questions.length === 0) return;

      let correct = 0;
      section.questions.forEach(q => {
        totalQuestionsCount++;
        if (answers[q.id] === q.correctIndex) {
          correct++;
          totalCorrectCount++;
        }
      });

      // Scaled to 60 points max per section
      const scaledScore = Math.round((correct / section.questions.length) * 60);
      breakdown[secKey] = {
        score: scaledScore,
        max: 60,
        correct,
        total: section.questions.length,
      };
      totalScore += scaledScore;
      maxTotalScore += 60;
    });

    if (maxTotalScore === 0) maxTotalScore = 180;
    const passingScore = getPassingThreshold(activeTryOut.level || 'N3', maxTotalScore);
    const isSuccess = totalScore >= passingScore;

    return { totalScore, maxTotalScore, passingScore, isSuccess, breakdown, totalQuestionsCount, totalCorrectCount };
  };

  const handleSubmitScore = () => {
    const { totalScore, maxTotalScore } = calculateJLPTScore();
    const expGained = totalScore * 10; 
    const goldGained = totalScore * 5;

    onComplete(totalScore, maxTotalScore, expGained, goldGained, activeTryOut.id);
  };

  const handleSelectAnswer = (qId: string, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [qId]: optionIndex }));
    playSound('click', soundEnabled);
  };

  const handleToggleFlag = (qId: string) => {
    setFlags(prev => ({ ...prev, [qId]: !prev[qId] }));
    playSound('click', soundEnabled);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- VIEWS ---

  if (currentStep === 'intro') {
    const filteredPacks = selectedLevelFilter === 'ALL'
      ? ALL_TRYOUTS
      : ALL_TRYOUTS.filter(t => t.level === selectedLevelFilter);

    const activeMeta = ALL_TRYOUTS.find(t => t.id === activeTryOut.id) || {
      id: activeTryOut.id,
      level: (activeTryOut.level || 'N3') as 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'JFT',
      title: activeTryOut.title,
      year: activeTryOut.year || 2023,
      totalQuestions: (activeTryOut.sections.mojiGoi?.questions.length || 0) + (activeTryOut.sections.bunpouDokkai?.questions.length || 0)
    };

    const activeColor = LEVEL_COLORS[activeMeta.level] || LEVEL_COLORS.N3;
    const mojiQ = activeTryOut.sections.mojiGoi?.questions.length || 0;
    const bunpouQ = activeTryOut.sections.bunpouDokkai?.questions.length || 0;
    const choukaiQ = activeTryOut.sections.choukai?.questions.length || 0;
    const mojiTime = activeTryOut.sections.mojiGoi?.timeLimitMinutes || 30;
    const bunpouTime = activeTryOut.sections.bunpouDokkai?.timeLimitMinutes || 60;

    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="p-2.5 rounded-xl bg-surface-card border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
              title="Kembali ke Peta"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-crimson font-heading flex items-center gap-2">
                <Skull className="w-4 h-4 text-crimson" />
                <span>JLPT Dungeon Boss — Tryout Resmi</span>
              </h2>
              <p className="text-xs text-text-secondary">
                Simulasi Ujian JLPT & JFT-Basic Terstandar & Dinilai Otomatis
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-text-secondary bg-surface-card px-3 py-1.5 rounded-xl border border-border-subtle">
            <Layers className="w-4 h-4 text-gold" />
            <span>{ALL_TRYOUTS.length} Paket Ujian Tersedia</span>
          </div>
        </div>

        {/* Level Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {(['ALL', 'N5', 'N4', 'N3', 'N2', 'N1', 'JFT'] as const).map((lvl) => {
            const isSelected = selectedLevelFilter === lvl;
            const count = lvl === 'ALL' 
              ? ALL_TRYOUTS.length 
              : ALL_TRYOUTS.filter(t => t.level === lvl).length;
            
            return (
              <button
                key={lvl}
                onClick={() => {
                  setSelectedLevelFilter(lvl);
                  playSound('click', soundEnabled);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all shrink-0 flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-crimson text-white border-crimson shadow-md shadow-crimson/20'
                    : 'bg-surface-card border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-strong'
                }`}
              >
                <span>{lvl === 'ALL' ? 'Semua Level' : lvl}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isSelected ? 'bg-white/20 text-white font-black' : 'bg-surface-inset text-text-secondary'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tryout Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPacks.map((pack) => {
            const isChosen = activeTryOut.id === pack.id;
            const color = LEVEL_COLORS[pack.level] || LEVEL_COLORS.N3;

            return (
              <motion.div
                key={pack.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveTryOut(pack.data);
                  playSound('click', soundEnabled);
                }}
                className={`panel p-4 rounded-2xl cursor-pointer transition-all border relative flex flex-col justify-between ${
                  isChosen
                    ? 'border-gold/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_14px_rgba(0,0,0,0.4)] bg-surface-elevated'
                    : 'border-border-subtle hover:border-border-muted'
                }`}
              >
                {/* Level badge + Package Code */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-black ${color.badge}`}>
                    {pack.level}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-text-muted font-mono">
                    <span>Paket {pack.code}</span>
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  <h3 className="font-bold text-text-primary text-sm font-jp line-clamp-1">
                    {pack.title}
                  </h3>
                  <p className="text-xs text-text-secondary flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-gold" />
                    <span>{pack.totalQuestions} Soal Lengkap</span>
                  </p>
                </div>

                {/* Section breakdown tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface-inset border border-border-subtle text-text-secondary">
                    Moji-Goi ({pack.data.sections.mojiGoi?.questions.length || 0})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface-inset border border-border-subtle text-text-secondary">
                    Bunpou-Dokkai ({pack.data.sections.bunpouDokkai?.questions.length || 0})
                  </span>
                  {isChosen && (
                    <span className="ml-auto text-[10px] font-bold text-crimson flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Aktif
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Active Pack Briefing Card & Start Button */}
        <div className={`panel p-6 sm:p-8 rounded-3xl ${activeColor.border} shadow-2xl relative overflow-hidden space-y-6 text-center`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-crimson/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-inset border border-border-subtle text-xs font-mono text-crimson font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>Paket Terpilih: {activeTryOut.title}</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary font-heading">
              Tantang Simulasi {activeMeta.level}
            </h1>
            
            <p className="text-text-secondary text-sm leading-relaxed">
              Kamu akan mengerjakan simulasi komprehensif {activeMeta.level} yang terdiri dari sesi 文字・語彙 dan 文法・読解.
              Timer akan otomatis berjalan untuk tiap sesi. Nilai akan dikonversi ke skala kelulusan (180 / 120 poin).
            </p>
          </div>

          {/* Quick Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
            <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Sesi 1</span>
              <p className="text-xs font-bold text-text-primary">Moji-Goi</p>
              <p className="text-[11px] text-gold font-mono">{mojiQ} Soal • {mojiTime}m</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Sesi 2</span>
              <p className="text-xs font-bold text-text-primary">Bunpou-Dokkai</p>
              <p className="text-[11px] text-gold font-mono">{bunpouQ} Soal • {bunpouTime}m</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Sesi 3</span>
              <p className="text-xs font-bold text-text-primary">Choukai</p>
              <p className="text-[11px] text-text-secondary font-mono">{choukaiQ > 0 ? `${choukaiQ} Soal` : 'Paper Edition'}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Target Lulus</span>
              <p className="text-xs font-bold text-text-primary">Passing Mark</p>
              <p className="text-[11px] text-matcha font-mono font-bold">
                {activeMeta.level === 'N1' ? '≥ 100/180' : activeMeta.level === 'N3' ? '≥ 95/180' : activeMeta.level === 'N5' ? '≥ 80/180' : '≥ 90/180'}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setAnswers({});
                setFlags({});
                startSection('mojiGoi');
              }}
              className="px-10 py-4 rounded-2xl bg-crimson hover:brightness-110 text-white font-bold text-base shadow-xl hover:shadow-crimson/30 transition-all transform hover:scale-105 inline-flex items-center gap-3 font-heading"
            >
              <Skull className="w-5 h-5" />
              <span>Mulai Ujian Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'transition' && nextSectionKey) {
    const nextSectionObj = activeTryOut.sections[nextSectionKey as 'mojiGoi' | 'bunpouDokkai' | 'choukai'];
    return (
      <div className="w-full max-w-4xl mx-auto flex items-center justify-center h-[60vh] animate-fade-in">
        <div className="panel p-8 rounded-3xl border border-border-subtle shadow-2xl text-center space-y-6 w-full max-w-md">
          <CheckCircle2 className="w-16 h-16 text-matcha mx-auto" />
          <div>
            <h2 className="text-2xl font-bold text-text-primary font-heading mb-2">Sesi Selesai!</h2>
            <p className="text-text-secondary">Tarik napas sejenak. Persiapkan dirimu untuk sesi berikutnya:</p>
            <h3 className="text-xl font-bold text-gold mt-4 font-jp">{nextSectionObj?.title || 'Sesi Selanjutnya'}</h3>
            <p className="text-sm text-text-muted mt-1">Waktu: {nextSectionObj?.timeLimitMinutes || 60} Menit</p>
          </div>
          <button
            onClick={() => startSection(nextSectionKey as 'mojiGoi' | 'bunpouDokkai' | 'choukai')}
            className="btn-cta w-full py-3.5 rounded-xl font-bold shadow-lg transition-transform hover:scale-102"
          >
            Mulai Sesi Selanjutnya
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 'results') {
    const { totalScore, maxTotalScore, passingScore, isSuccess, breakdown, totalQuestionsCount, totalCorrectCount } = calculateJLPTScore();

    return (
      <div className="panel w-full max-w-3xl mx-auto p-6 md:p-10 rounded-3xl border border-border-subtle text-center space-y-8 shadow-2xl animate-fade-in">
        {isSuccess ? (
          <Trophy className="w-20 h-20 mx-auto text-gold animate-bounce" />
        ) : (
          <Skull className="w-20 h-20 mx-auto text-text-muted" />
        )}
        
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-inset border border-border-subtle text-xs font-mono text-text-secondary mb-3">
            <span>{activeTryOut.title}</span>
          </div>
          <h3 className="text-3xl font-extrabold text-text-primary font-heading mb-2">
            {isSuccess ? 'Lulus! Boss Telah Ditaklukkan!' : 'Belum Lulus — Tetap Semangat!'}
          </h3>
          <p className="text-text-secondary text-sm">
            {isSuccess 
              ? `Selamat! Kamu berhasil melampaui batas nilai kelulusan resmi (${passingScore}/${maxTotalScore}).` 
              : `Kamu memperoleh nilai ${totalScore}/${maxTotalScore}. Batas lulus adalah ${passingScore}. Ayo coba lagi!`}
          </p>
        </div>

        {/* Big Score Counter */}
        <div className="flex justify-center items-end gap-2">
          <strong className={`text-6xl sm:text-7xl font-mono ${isSuccess ? 'text-gold' : 'text-crimson'}`}>
            {totalScore}
          </strong>
          <span className="text-2xl text-text-muted mb-2 font-mono">/ {maxTotalScore}</span>
        </div>

        <p className="text-xs text-text-muted">
          Akurasi Soal: <span className="font-bold text-text-primary">{totalCorrectCount} benar</span> dari {totalQuestionsCount} soal ({Math.round((totalCorrectCount / (totalQuestionsCount || 1)) * 100)}%)
        </p>

        {/* Section Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-left">
          {Object.entries(breakdown).map(([secKey, info]) => {
            const title = secKey === 'mojiGoi' ? 'Moji-Goi' : secKey === 'bunpouDokkai' ? 'Bunpou-Dokkai' : 'Choukai';
            return (
              <div key={secKey} className="p-4 rounded-2xl bg-surface-inset border border-border-subtle">
                <h4 className="text-xs text-text-muted uppercase font-bold mb-1">{title}</h4>
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl text-text-primary font-mono">{info.score} <span className="text-xs text-text-muted">/ {info.max}</span></p>
                  <span className="text-xs text-text-secondary">{info.correct}/{info.total} Benar</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reward & Back Button */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              playSound('click', soundEnabled);
              handleSubmitScore();
            }}
            className="btn-cta w-full sm:w-auto py-4 px-10 rounded-2xl font-bold shadow-lg text-base transition-transform hover:scale-105 font-heading"
          >
            Klaim Hadiah & Selesai
          </button>
          <button
            onClick={() => {
              setCurrentStep('intro');
              playSound('click', soundEnabled);
            }}
            className="w-full sm:w-auto py-4 px-6 rounded-2xl bg-surface-inset hover:bg-surface-card border border-border-subtle text-text-secondary hover:text-text-primary font-bold text-sm transition-all"
          >
            Pilih Paket Ujian Lain
          </button>
        </div>
      </div>
    );
  }

  // Active Quiz View
  const section = activeTryOut.sections[currentStep as 'mojiGoi' | 'bunpouDokkai' | 'choukai'];
  const currentQ = section?.questions[currentQuestionIndex];
  const totalQ = section?.questions.length || 0;
  const isChoukai = currentStep === 'choukai';
  const hasPassage = !!currentQ?.passage;

  if (!section || !currentQ) {
    return (
      <div className="text-center p-8">
        <p className="text-text-muted">Tidak ada soal pada sesi ini.</p>
        <button onClick={() => setCurrentStep('results')} className="rpg-btn rpg-btn-primary mt-4 px-6 py-2 text-sm font-heading">
          Lihat Hasil
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-[85vh] animate-fade-in space-y-4">
      {/* Top Header */}
      <div className="panel flex items-center justify-between p-4 rounded-2xl border border-border-subtle shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowGrid(!showGrid)} className="p-2 bg-surface-inset border border-border-subtle rounded-xl hover:bg-surface-card transition-colors">
            <span className="font-bold text-text-secondary text-xs">Grid Soal</span>
          </button>
          <div>
            <h3 className="text-sm font-bold text-crimson">{section.title}</h3>
            <p className="text-[10px] text-text-muted">Soal {currentQuestionIndex + 1} dari {totalQ}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-sm ${timeLeft < 300 ? 'bg-crimson/15 text-crimson border border-crimson/30 animate-pulse' : 'bg-surface-inset border border-border-subtle text-gold'}`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
          <button
            onClick={() => {
              if (window.confirm("Apakah kamu yakin ingin menyelesaikan sesi ini sekarang? Waktu yang tersisa akan diakhiri.")) {
                handleFinishSection();
              }
            }}
            className="px-4 py-1.5 bg-crimson hover:brightness-110 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            Kumpul Sesi
          </button>
        </div>
      </div>

      {/* Grid Modal */}
      <AnimatePresence>
        {showGrid && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="panel absolute top-20 left-4 right-4 z-50 p-4 rounded-2xl border border-border-subtle shadow-2xl max-h-[70vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-text-primary text-sm font-heading">Navigasi Soal</h4>
              <button onClick={() => setShowGrid(false)} className="text-text-muted hover:text-text-primary text-xs font-bold">Tutup</button>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {section.questions.map((q, idx) => {
                const isAns = answers[q.id] !== undefined;
                const isFlag = flags[q.id];
                const isCur = idx === currentQuestionIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      setShowGrid(false);
                      playSound('click', soundEnabled);
                    }}
                    className={`relative py-2 rounded-lg text-xs font-mono font-bold border transition-all ${
                      isCur ? 'border-crimson bg-crimson/15 text-crimson font-black' 
                      : isAns ? 'border-matcha/50 bg-matcha/15 text-matcha'
                      : 'border-border-subtle bg-surface-inset text-text-muted hover:border-border-strong'
                    }`}
                  >
                    {idx + 1}
                    {isFlag && <Flag className="w-3 h-3 text-crimson absolute -top-1 -right-1 fill-crimson" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Question Area */}
      <div className={`flex-1 flex ${isChoukai ? 'flex-col' : hasPassage ? 'flex-col md:flex-row' : 'flex-col'} gap-4 overflow-hidden`}>
        {isChoukai ? (
          <div className="panel w-full flex flex-col h-full border border-border-subtle rounded-2xl overflow-hidden relative">
            <div className="p-4 border-b border-border-subtle bg-surface-inset flex flex-col items-center justify-center space-y-3 sticky top-0 z-10">
              {section.audioUrl && (
                <audio 
                  ref={audioRef} 
                  src={section.audioUrl} 
                  onEnded={() => setIsAudioPlaying(false)}
                />
              )}
              <span className="text-sm font-bold text-text-primary">Audio Choukai (Hanya 1 Kali Putar)</span>
              {!hasAudioPlayed ? (
                <button
                  onClick={() => {
                     if(!isAudioPlaying) {
                       setIsAudioPlaying(true);
                       setHasAudioPlayed(true);
                       if (audioRef.current) {
                         audioRef.current.play().catch(e => {
                           console.error("Audio playback failed", e);
                           setIsAudioPlaying(false);
                         });
                       }
                     }
                  }}
                  disabled={isAudioPlaying}
                  className="btn-cta px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <Volume2 className="w-5 h-5" />
                  Mulai Audio
                </button>
              ) : (
                <div className="px-6 py-3 rounded-full bg-surface-card border border-border-subtle text-text-muted font-bold flex items-center gap-2">
                  <Volume2 className="w-5 h-5 opacity-50" />
                  Audio Telah Diputar
                </div>
              )}
            </div>
            
            {/* Scrollable Answer Sheet */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-6">
              {section.questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl bg-surface-inset border border-border-subtle space-y-3">
                  <div className="flex flex-col gap-2">
                    {q.instruction && (
                      <span className="text-xs font-bold text-text-muted font-jp mb-1">{q.instruction}</span>
                    )}
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-gold font-mono">Soal {idx + 1}</span>
                      {(q as any).audio && (
                        <button
                          type="button"
                          onClick={() => speakJapanese((q as any).audio)}
                          className="px-3 py-1 rounded-lg bg-surface-card hover:bg-surface-elevated text-gold border border-gold/30 hover:border-gold text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                          title="Putar audio soal percakapan"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Dengarkan Soal {idx + 1}</span>
                        </button>
                      )}
                    </div>
                    {q.prompt && q.prompt !== q.instruction && (
                      <p className="text-sm text-text-primary font-medium">{q.prompt}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, optIdx) => {
                       const isSelected = answers[q.id] === optIdx;
                       return (
                         <button
                           key={optIdx}
                           onClick={() => handleSelectAnswer(q.id, optIdx)}
                           className={`w-full text-left p-3 rounded-lg border font-jp transition-all flex items-center justify-between ${
                             isSelected 
                               ? 'bg-gold/15 border-gold text-gold font-bold shadow-sm' 
                               : 'bg-surface-card border-border-subtle text-text-primary hover:border-border-strong'
                           }`}
                         >
                           <span>{opt}</span>
                           {isSelected && <CheckCircle2 className="w-4 h-4 text-gold" />}
                         </button>
                       );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Left Side: Passage (if Dokkai) */}
            {hasPassage && (
              <div className="panel w-full md:w-1/2 p-4 rounded-2xl border border-border-subtle overflow-y-auto custom-scrollbar">
                <h4 className="text-xs text-text-muted uppercase tracking-widest font-bold mb-3 border-b border-border-subtle pb-2">Teks Bacaan</h4>
                <p className="text-text-primary text-base leading-relaxed whitespace-pre-wrap font-jp font-medium">
                  {currentQ.passage}
                </p>
              </div>
            )}

            {/* Right Side / Full: Question & Options */}
            <div className={`panel ${hasPassage ? 'w-full md:w-1/2' : 'w-full max-w-3xl mx-auto'} flex flex-col justify-between p-4 sm:p-6 rounded-2xl border border-border-subtle overflow-y-auto custom-scrollbar`}>
              
              <div className="space-y-6">
                {/* Instruction if present */}
                {currentQ.instruction && (
                  <div className="px-4 py-2 bg-surface-inset rounded-xl border border-border-subtle">
                    <p className="text-sm font-bold text-text-secondary font-jp">{currentQ.instruction}</p>
                  </div>
                )}

                {/* Prompt */}
                <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-surface-inset border border-border-subtle">
                  <h3 className="text-lg text-text-primary font-jp leading-relaxed">
                    {currentQ.prompt}
                  </h3>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {currentQ.options.map((opt, i) => {
                    const isSelected = answers[currentQ.id] === i;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectAnswer(currentQ.id, i)}
                        className={`w-full text-left p-4 rounded-xl border font-jp transition-all flex items-center justify-between ${
                          isSelected 
                            ? 'bg-crimson/15 border-crimson text-crimson font-bold shadow-sm' 
                            : 'bg-surface-inset border-border-subtle text-text-primary hover:border-border-strong'
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-5 text-crimson" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Navigation */}
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-border-subtle">
                <button
                  onClick={() => handleToggleFlag(currentQ.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                    flags[currentQ.id] ? 'text-crimson bg-crimson/15 border border-crimson/30' : 'text-text-muted hover:text-text-primary bg-surface-inset border border-border-subtle'
                  }`}
                >
                  <Flag className={`w-4 h-4 ${flags[currentQ.id] ? 'fill-crimson' : ''}`} />
                  Tandai Ragu
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (currentQuestionIndex > 0) {
                        setCurrentQuestionIndex(prev => prev - 1);
                        playSound('click', soundEnabled);
                      }
                    }}
                    disabled={currentQuestionIndex === 0}
                    className="p-2 rounded-xl bg-surface-inset border border-border-subtle disabled:opacity-40 text-text-secondary hover:text-text-primary transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (currentQuestionIndex < totalQ - 1) {
                        setCurrentQuestionIndex(prev => prev + 1);
                        playSound('click', soundEnabled);
                      }
                    }}
                    disabled={currentQuestionIndex === totalQ - 1}
                    className="px-4 py-2 flex items-center gap-1 rounded-xl bg-crimson hover:brightness-110 disabled:bg-surface-inset disabled:text-text-muted disabled:border disabled:border-border-subtle text-white font-bold transition-all shadow-sm"
                  >
                    Selanjutnya
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
};
