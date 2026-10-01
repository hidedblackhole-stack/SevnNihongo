import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Compass,
  Lock,
  CheckCircle2,
  Play,
  RotateCcw,
  Star,
  Sliders,
} from 'lucide-react';
import {
  CustomCurriculum,
  CustomCurriculumProgress,
  CustomStage,
  StageStatus,
} from '../../types/curriculum';
import {
  customStageToStage,
  saveCurriculumProgress,
} from '../../utils/curriculumEngine';
import { StageHubView } from '../stage/StageHubView';
import { ItemMasteryRecord } from '../../types/content';
import { StageClearData } from '../../types/rpg';
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
  onReconfigure?: () => void;
  onBack: () => void;
  isTemplate?: boolean;
  soundEnabled?: boolean;
  playerMp?: number;
  playerMaxMp?: number;
  playerInt?: number;
  playerStr?: number;
  playerHp?: number;
  playerMaxHp?: number;
  onUseMp?: (amount: number) => boolean;
  onHpDamage?: (amount: number) => void;
  onGameOver?: () => void;
  onStartRemediationRecall?: (itemIds: string[]) => void;
  itemMastery?: Record<string, ItemMasteryRecord>;
  furiganaEnabled?: boolean;
}

export const CustomWorldView: React.FC<CustomWorldViewProps> = ({
  curriculum,
  progress,
  onUpdateProgress,
  onRewardPlayer,
  onCompleteStudyItem,
  onReconfigure,
  onBack,
  isTemplate = false,
  soundEnabled = true,
  playerMp = 100,
  playerMaxMp = 100,
  playerInt = 10,
  playerStr = 10,
  playerHp = 100,
  playerMaxHp = 100,
  onUseMp = () => true,
  onHpDamage,
  onGameOver,
  onStartRemediationRecall,
  itemMastery = {},
  furiganaEnabled = true,
}) => {
  const [activeCustomStage, setActiveCustomStage] = useState<CustomStage | null>(null);

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
    setActiveCustomStage(stage);
  };

  const handleCustomModuleComplete = (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => {
    // onCompleteStudyItem (App.handleStudyComplete) sudah memberi EXP/Gold; jangan panggil keduanya.
    if (onCompleteStudyItem) {
      onCompleteStudyItem(moduleId, expGained, goldGained, itemId, score, total);
    } else if (onRewardPlayer) {
      onRewardPlayer(expGained, goldGained);
    }

    if (!activeCustomStage) return;

    const currentStageId = activeCustomStage.id;
    const stageIndex = curriculum.stages.findIndex(s => s.id === currentStageId);
    const existingProg = progress.stages[currentStageId] || { status: 'current' };
    const currentClearedModules = existingProg.clearedModules || [];
    const updatedClearedModules = currentClearedModules.includes(moduleId)
      ? currentClearedModules
      : [...currentClearedModules, moduleId];

    // Determine if stage is considered cleared
    const hasBunpou = activeCustomStage.items.some(i => i.type === 'bunpou');
    const hasKotoba = activeCustomStage.items.some(i => i.type === 'kotoba');
    const hasKanji = activeCustomStage.items.some(i => i.type === 'kanji');
    const expectedModulesCount = [
      hasBunpou ? 'bunpou' : null,
      hasKotoba ? 'kotoba' : null,
      hasKanji ? 'kanji' : null,
    ].filter(Boolean).length || 1;

    const isStageCleared = updatedClearedModules.length >= expectedModulesCount || moduleId === 'boss';
    const calculatedStars = Math.min(3, Math.max(1, Math.ceil((updatedClearedModules.length / expectedModulesCount) * 3)));

    const updatedStages = { ...progress.stages };
    updatedStages[currentStageId] = {
      ...existingProg,
      status: isStageCleared ? 'completed' : (existingProg.status === 'completed' ? 'completed' : 'current'),
      score: score !== undefined ? (existingProg.score || 0) + score : existingProg.score,
      total: total !== undefined ? (existingProg.total || 0) + total : existingProg.total,
      stars: Math.max(existingProg.stars || 0, calculatedStars),
      clearedAt: isStageCleared ? (existingProg.clearedAt || new Date().toISOString()) : existingProg.clearedAt,
      clearedModules: updatedClearedModules,
    };

    // Unlock next stage if this stage is completed
    let nextStageIndex = progress.currentStageIndex;
    if (isStageCleared && stageIndex + 1 < curriculum.stages.length) {
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
  };

  // IF AN ACTIVE STAGE IS SELECTED: RENDER STAGEHUBVIEW (EXACTLY AS IN SCREENSHOT 1)
  if (activeCustomStage) {
    const stageObj = customStageToStage(activeCustomStage, curriculum.deckTitle);
    const stageProg = progress.stages[activeCustomStage.id];
    const stageClearData: StageClearData = {
      stageId: activeCustomStage.id,
      cleared: stageProg?.status === 'completed',
      stars: stageProg?.stars || 0,
      score: stageProg?.score,
      clearedModules: stageProg?.clearedModules || [],
      clearedAt: stageProg?.clearedAt,
    };

    return (
      <div className="w-full animate-fade-in">
        <StageHubView
          stage={stageObj}
          stageProgress={stageClearData}
          itemMastery={itemMastery}
          onBackToMap={() => {
            playSound('click', soundEnabled);
            setActiveCustomStage(null);
          }}
          onModuleComplete={handleCustomModuleComplete}
          playerMp={playerMp}
          playerMaxMp={playerMaxMp}
          playerInt={playerInt}
          playerStr={playerStr}
          playerHp={playerHp}
          playerMaxHp={playerMaxHp}
          onUseMp={onUseMp}
          onHpDamage={onHpDamage}
          onGameOver={onGameOver}
          onStartRemediationRecall={onStartRemediationRecall}
          furiganaEnabled={furiganaEnabled}
          soundEnabled={soundEnabled}
        />
      </div>
    );
  }

  // STANDARD ROADMAP VIEW
  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. HEADER BANNER */}
      <div className="panel p-5 sm:p-6 rounded-3xl space-y-4 border border-border-subtle shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onBack();
              }}
              className="p-2.5 rounded-xl border border-border-subtle bg-surface-inset hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo/15 text-indigo border border-indigo/30 uppercase">
                  {isTemplate ? 'Template World' : 'Custom World'}
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

          {!isTemplate && onReconfigure && (
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
          )}
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
              className="h-full rounded-full bg-indigo shadow-xs"
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
                onClick={() => {
                  if (!isLocked) handleStartStage(stage);
                }}
                className={`panel p-4 sm:p-5 rounded-2xl border transition-all ${
                  !isLocked ? 'cursor-pointer' : ''
                } ${
                  isCurrent
                    ? 'border border-border-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.35)] bg-surface-elevated'
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
                          ? 'bg-indigo text-white border-indigo/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_6px_rgba(0,0,0,0.3)]'
                          : 'bg-surface-inset text-text-secondary border-border-subtle shadow-[inset_1px_1px_3px_var(--neu-d)]'
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartStage(stage);
                        }}
                        className="btn-skeuo-indigo w-full sm:w-auto text-xs py-2.5 px-5 shadow-md active:scale-95 transition-all"
                      >
                        <Play className="w-4 h-4 fill-current shrink-0" />
                        <span className="whitespace-nowrap font-bold">Mulai Stage</span>
                      </button>
                    ) : isCompleted ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartStage(stage);
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-heading font-bold text-xs hover:bg-emerald-500/20 transition-all"
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
    </div>
  );
};
