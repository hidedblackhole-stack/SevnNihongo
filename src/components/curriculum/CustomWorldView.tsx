import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Compass,
  Sparkles,
  Lock,
  CheckCircle2,
  Play,
  RotateCcw,
  Star,
  Layers,
  BookOpen,
  PenTool,
  Brain,
  Sliders,
  Trophy,
  ShieldAlert,
} from 'lucide-react';
import {
  CustomCurriculum,
  CustomCurriculumProgress,
  CustomStage,
  StageStatus,
} from '../../types/curriculum';
import {
  saveCurriculumProgress,
} from '../../utils/curriculumEngine';
import { CustomStageRunner } from './CustomStageRunner';
import { playSound } from '../../utils/audio';

interface CustomWorldViewProps {
  curriculum: CustomCurriculum;
  progress: CustomCurriculumProgress;
  onUpdateProgress: (progress: CustomCurriculumProgress) => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => void;
  onReconfigure: () => void;
  onBack: () => void;
  soundEnabled?: boolean;
}

export const CustomWorldView: React.FC<CustomWorldViewProps> = ({
  curriculum,
  progress,
  onUpdateProgress,
  onRewardPlayer,
  onCompleteStudyItem,
  onReconfigure,
  onBack,
  soundEnabled = true,
}) => {
  const [activeStageForRunner, setActiveStageForRunner] = useState<CustomStage | null>(null);

  // Calculate statistics
  const totalStages = curriculum.stages.length;
  const completedStagesCount = useMemo(() => {
    return Object.values(progress.stages || {}).filter(s => s.status === 'completed').length;
  }, [progress.stages]);

  const completionPercent = Math.round((completedStagesCount / Math.max(1, totalStages)) * 100);

  const totalStars = useMemo(() => {
    return Object.values(progress.stages || {}).reduce((acc, s) => acc + (s.stars || 0), 0);
  }, [progress.stages]);

  const handleStartStage = (stage: CustomStage) => {
    playSound('click', soundEnabled);
    setActiveStageForRunner(stage);
  };

  const handleStageComplete = (
    score: number,
    total: number,
    expGained: number,
    goldGained: number
  ) => {
    if (!activeStageForRunner) return;

    const currentStageId = activeStageForRunner.id;
    const stageIndex = curriculum.stages.findIndex(s => s.id === currentStageId);

    // Calculate earned stars
    const percentage = total > 0 ? (score / total) * 100 : 100;
    const stars = percentage >= 90 ? 3 : percentage >= 60 ? 2 : 1;

    // Create updated stages map
    const updatedStages = { ...progress.stages };
    updatedStages[currentStageId] = {
      status: 'completed',
      score,
      total,
      stars,
      clearedAt: new Date().toISOString(),
    };

    // Unlock next stage if exists
    let nextStageIndex = progress.currentStageIndex;
    if (stageIndex + 1 < curriculum.stages.length) {
      const nextStage = curriculum.stages[stageIndex + 1];
      if (updatedStages[nextStage.id]?.status !== 'completed') {
        updatedStages[nextStage.id] = { status: 'current' };
      }
      nextStageIndex = Math.max(nextStageIndex, stageIndex + 1);
    }

    const isAllComplete = Object.values(updatedStages).filter(s => s.status === 'completed').length === totalStages;

    const updatedProgress: CustomCurriculumProgress = {
      ...progress,
      currentStageIndex: nextStageIndex,
      stages: updatedStages,
      lastPlayedAt: new Date().toISOString(),
      isFullyCompleted: isAllComplete,
    };

    onUpdateProgress(updatedProgress);
    saveCurriculumProgress(updatedProgress);

    // Reward player
    if (onRewardPlayer) {
      onRewardPlayer(expGained, goldGained);
    }
    if (onCompleteStudyItem) {
      onCompleteStudyItem('boss', expGained, goldGained, currentStageId, score, total);
    }

    setActiveStageForRunner(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 sm:pb-12 animate-fade-in px-2 sm:px-0">
      {/* 1. TOP NAVIGATION & WORLD HEADER */}
      <div className="panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-md border border-border-subtle bg-surface-card space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onBack();
              }}
              className="p-2.5 rounded-2xl bg-surface-inset border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors shrink-0"
              title="Kembali ke Buku Saku"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo/15 text-indigo border border-indigo/30 uppercase">
                  Custom World
                </span>
                <span className="text-xs text-text-secondary font-mono">
                  {totalStages} Stage Terjadwal
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide">
                Petualangan: {curriculum.deckTitle}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              onReconfigure();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-border-subtle bg-surface-inset hover:bg-surface-elevated text-text-secondary hover:text-indigo transition-all self-stretch sm:self-auto justify-center"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Atur Ulang Stage</span>
          </button>
        </div>

        {/* Progress Bar & Quick Stats */}
        <div className="space-y-2 pt-2 border-t border-border-subtle">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-text-primary font-heading">
              Progress Kurikulum ({completedStagesCount}/{totalStages} Selesai)
            </span>
            <div className="flex items-center gap-3 font-mono">
              <span className="text-gold flex items-center gap-1 font-bold">
                <Star className="w-3.5 h-3.5 fill-gold" />
                <span>{totalStars} Bintang</span>
              </span>
              <span className="text-indigo font-bold">{completionPercent}%</span>
            </div>
          </div>

          {/* Bar */}
          <div className="w-full h-3 rounded-full bg-surface-inset border border-border-subtle overflow-hidden p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-indigo to-emerald-400 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* 2. STAGES ROADMAP */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary font-heading px-1 flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo" />
          <span>Peta Alur Stage Belajar ({totalStages})</span>
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {curriculum.stages.map((stage, idx) => {
            const stageProgress = progress.stages[stage.id];
            const status: StageStatus = stageProgress?.status || (idx === 0 ? 'current' : 'locked');
            const isCompleted = status === 'completed';
            const isCurrent = status === 'current';
            const isLocked = status === 'locked';

            // Counts by category
            const kanjiCount = stage.items.filter(i => i.type === 'kanji').length;
            const kotobaCount = stage.items.filter(i => i.type === 'kotoba').length;
            const bunpouCount = stage.items.filter(i => i.type === 'bunpou').length;

            return (
              <motion.div
                key={stage.id}
                whileHover={!isLocked ? { scale: 1.005 } : {}}
                className={`panel p-4 sm:p-5 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'border-indigo shadow-md shadow-indigo/10 bg-surface-card ring-1 ring-indigo/40'
                    : isCompleted
                    ? 'border-emerald-500/30 bg-surface-card/90'
                    : 'border-border-subtle bg-surface-inset/60 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Left: Badge & Stage Info */}
                  <div className="flex items-start gap-3.5">
                    {/* Stage Number / Status Circle */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-heading font-bold text-sm shrink-0 border shadow-xs ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                          : isCurrent
                          ? 'bg-indigo text-white border-indigo shadow-indigo/30'
                          : 'bg-surface-inset text-text-secondary border-border-subtle'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : isLocked ? (
                        <Lock className="w-4 h-4 text-text-secondary" />
                      ) : (
                        <span>{stage.stageNumber}</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                            stage.isExam
                              ? 'bg-gold/15 text-gold border-gold/30'
                              : isCurrent
                              ? 'bg-indigo/15 text-indigo border-indigo/30'
                              : isCompleted
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-surface-inset text-text-secondary border-border-subtle'
                          }`}
                        >
                          {stage.isExam ? 'FINAL BOSS' : `STAGE ${stage.stageNumber}`}
                        </span>

                        {isCompleted && stageProgress?.stars && (
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3].map(st => (
                              <Star
                                key={st}
                                className={`w-3 h-3 ${
                                  st <= stageProgress.stars!
                                    ? 'text-gold fill-gold'
                                    : 'text-border-subtle'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-text-primary font-heading">
                        {stage.title}
                      </h3>
                      <p className="text-xs text-text-secondary line-clamp-1">
                        {stage.description}
                      </p>

                      {/* Item Tags */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] font-mono text-text-secondary">
                        {kanjiCount > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-surface-inset border border-border-subtle text-gold font-bold">
                            {kanjiCount} Kanji
                          </span>
                        )}
                        {kotobaCount > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-surface-inset border border-border-subtle text-emerald-400 font-bold">
                            {kotobaCount} Kotoba
                          </span>
                        )}
                        {bunpouCount > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-surface-inset border border-border-subtle text-indigo font-bold">
                            {bunpouCount} Pola
                          </span>
                        )}
                        <span className="text-text-secondary">
                          • Hadiah: +{stage.rewardExp} EXP, +{stage.rewardGold} G
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Button */}
                  <div className="w-full sm:w-auto flex justify-end shrink-0 pt-2 sm:pt-0">
                    {isCurrent ? (
                      <button
                        type="button"
                        onClick={() => handleStartStage(stage)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo to-indigo-dark text-white font-heading font-bold text-xs shadow-md shadow-indigo/25 hover:opacity-95 transition-all"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Mulai Stage</span>
                      </button>
                    ) : isCompleted ? (
                      <button
                        type="button"
                        onClick={() => handleStartStage(stage)}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-heading font-bold text-xs hover:bg-emerald-500/20 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Ulangi Stage</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-text-secondary font-mono px-3 py-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Terkunci</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* STAGE RUNNER MODAL */}
      {activeStageForRunner && (
        <CustomStageRunner
          stage={activeStageForRunner}
          config={curriculum.config}
          onCompleteStage={handleStageComplete}
          onClose={() => setActiveStageForRunner(null)}
          soundEnabled={soundEnabled}
        />
      )}
    </div>
  );
};
