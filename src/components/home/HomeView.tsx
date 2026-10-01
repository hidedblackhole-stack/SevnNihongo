import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Play, Flame, ChevronRight } from 'lucide-react';
import { ScrollIcon, QuillIcon } from '../ui/EngravingIcons';
import { PlayerStats, Mission, StageClearData } from '../../types/rpg';
import { getEffectiveTier } from '../../utils/ascension';
import { MAP_REGIONS, getStagesForMap } from '../../data/maps';
import { TierAvatar } from '../avatar/TierAvatar';
import { playSound } from '../../utils/audio';
import { calculateOverallMastery, generateAdaptiveRecommendation } from '../../utils/mastery';

export interface HomeViewProps {
  stats: PlayerStats;
  dailyMissions?: Mission[];
  stageProgress?: Record<string, StageClearData>;
  onOpenStatusModal: () => void;
  onNavigateToStage: (stageId: string) => void;
  onNavigateTab: (tab: 'maps' | 'daily' | 'weekly' | 'settings') => void;
  onStartRecall?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  stats,
  dailyMissions = [],
  stageProgress = {},
  onOpenStatusModal,
  onNavigateToStage,
  onNavigateTab,
  onStartRecall,
}) => {
  const { effectiveTierIndex } = getEffectiveTier(stats);

  // Check if player has completed any stage
  const hasClearedAnyStage = stageProgress ? Object.values(stageProgress).some(s => s?.cleared) : false;
  const isFirstTime = !hasClearedAnyStage;

  const currentMap = MAP_REGIONS.find(m => m.id === (isFirstTime ? 'map_kana_hiragana' : stats.currentMapId)) || MAP_REGIONS[0];
  const stages = getStagesForMap(currentMap ? currentMap.id : stats.currentMapId);
  const currentStage = stages.find(s => s.id === (isFirstTime ? 'stage_kana_hira_1' : stats.currentStageId)) || stages[0];
  const effectiveStage = currentStage;

  const overallMastery = useMemo(() => calculateOverallMastery(stats.itemMastery || {}), [stats.itemMastery]);
  const recallCount = stats.recallQueue ? stats.recallQueue.length : 0;
  const recommendation = useMemo(() => generateAdaptiveRecommendation(stats), [stats.itemMastery, stats.recallQueue, stats.currentStageId]);

  const completedMissionsCount = dailyMissions.filter(m => m.completed).length;
  const totalMissionsCount = dailyMissions.length || 4;
  const hasClaimableReward = dailyMissions.some(m => m.completed && !m.claimed);

  const handleContinue = () => {
    playSound('click', stats.soundEnabled);
    if (effectiveStage) {
      onNavigateToStage(effectiveStage.id);
    } else {
      onNavigateTab('maps');
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 pb-20 sm:pb-8 px-2 sm:px-0">
      {/* 1. TOP COMPACT RPG HUD (Level & Streak Pills) */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => {
            playSound('open_modal', stats.soundEnabled);
            onOpenStatusModal();
          }}
          className="btn btn-pill flex items-center gap-1.5 transition-transform"
        >
          <span className="font-mono text-xs text-gold-soft font-bold tracking-wider">
            {stats.playerName || 'Pelajar'} · {stats.totalExp.toLocaleString()} EXP
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('daily')}
          className="btn btn-pill flex items-center gap-1.5 transition-transform"
        >
          <Flame className="w-3.5 h-3.5 fill-gold text-gold animate-pulse shrink-0" />
          <span className="font-mono text-xs text-gold-soft font-bold tracking-wider">{stats.streakDays} HARI STREAK</span>
        </button>
      </div>

      {/* 2. HERO: CHARACTER SANCTUARY (THE SINGLE FOCAL POINT) */}
      <motion.div
        data-tour="hero-card"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        onClick={() => {
          playSound('open_modal', stats.soundEnabled);
          onOpenStatusModal();
        }}
        className="panel panel-stitched cursor-pointer text-center space-y-4 overflow-hidden group hover:scale-[1.01] transition-transform"
      >
        {/* Character Avatar Hero Display (Full Presence, No Constraining Circle) */}
        <div className="flex flex-col items-center justify-center my-2 relative z-10">
          <motion.div
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center justify-center"
          >
            <TierAvatar
              tierIndex={effectiveTierIndex ?? stats.tierIndex}
              gender={stats.characterGender || 'male'}
              size="lg"
            />
          </motion.div>
        </div>

        {/* Player Profile Title */}
        <div className="space-y-0.5 relative z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide">
            {stats.playerName || 'Pelajar Bahasa'}
          </h2>
        </div>

        {/* EXP Badge */}
        <div className="max-w-xs mx-auto space-y-1.5 relative z-10 pt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-surface-inset/80 border border-border-subtle text-xs font-mono">
            <span className="text-text-secondary font-bold uppercase tracking-wider">Total Belajar:</span>
            <span className="text-gold font-bold">{stats.totalExp.toLocaleString()} EXP</span>
          </div>
        </div>

        {/* Sub-label */}
        <div className="text-[11px] text-text-secondary group-hover:text-gold font-medium inline-flex items-center gap-1.5 transition-colors font-body pt-1">
          <ScrollIcon className="w-3.5 h-3.5 inline text-gold" />
          <span>Ketuk Karakter untuk Lembar Status & Profil</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </motion.div>

      {/* 3. MAIN PRIMARY CTA: CONTINUE EXPEDITION */}
      {effectiveStage && (
        <motion.button
          animate={isFirstTime ? { y: [0, -4, 0] } : {}}
          transition={isFirstTime ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleContinue}
          className="btn btn-cta flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-surface-inset/80 text-gold flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform shrink-0 border border-border-subtle">
              <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5 fill-gold text-gold" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <span className="breadcrumb-label text-gold-soft block">
                WORLD
              </span>
              <h3 className="text-base sm:text-lg font-bold text-text-on-btn font-heading truncate">
                Lanjutkan Belajar di World
              </h3>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-surface-inset/50 flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform border border-border-subtle">
            <ChevronRight className="w-5 h-5 text-gold-soft font-bold" />
          </div>
        </motion.button>
      )}

      {/* 4. COMPACT ESSENTIAL ACTION LIST (MOMENT-TO-MOMENT ONLY) */}
      <div className="panel p-0 overflow-hidden divide-y divide-border-subtle shadow-lg">
        {/* Row 1: Spaced Recall (SRS) */}
        {(!(stats.level === 1 && stats.totalExp === 0) || recallCount > 0) && (
          <div
            onClick={() => {
              if (onStartRecall) {
                playSound('click', stats.soundEnabled);
                onStartRecall();
              }
            }}
            className="p-4 flex items-center justify-between gap-3 hover:bg-surface-elevated/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border shrink-0 ${
                recallCount > 0
                  ? 'bg-wine/20 text-wine-accent border-wine/40 animate-pulse'
                  : 'bg-surface-inset/50 text-gold border-border-subtle'
              }`}>
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-text-primary font-heading group-hover:text-gold transition-colors">
                  Recall Memori
                </span>
                <p className="text-[10px] text-text-secondary font-mono">Spaced Repetition System</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {recallCount > 0 ? (
                <span className="badge-wine animate-pulse">
                  {recallCount} due
                </span>
              ) : (
                <span className="text-xs font-bold text-state-success font-mono">
                  ✓ Selesai
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        )}

        {/* Row 2: Daily Missions */}
        <div
          onClick={() => {
            playSound('click', stats.soundEnabled);
            onNavigateTab('daily');
          }}
          className="p-4 flex items-center justify-between gap-3 hover:bg-surface-elevated/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-surface-inset/50 text-indigo border border-border-subtle shrink-0">
              <ScrollIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-text-primary font-heading group-hover:text-gold transition-colors">
                Misi Harian
              </span>
              <p className="text-[10px] text-text-secondary font-mono">Hadiah EXP & Koin</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold font-mono ${
              hasClaimableReward ? 'text-gold font-black animate-pulse' : 'text-text-secondary'
            }`}>
              {completedMissionsCount}/{totalMissionsCount} {hasClaimableReward ? '· Klaim Hadiah!' : 'selesai'}
            </span>
            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Row 3: Tutor & Linguistic Mastery */}
        <div
          onClick={() => {
            playSound('open_modal', stats.soundEnabled);
            onOpenStatusModal();
          }}
          className="p-4 flex items-center justify-between gap-3 hover:bg-surface-elevated/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-surface-inset/50 text-indigo border border-border-subtle shrink-0">
              <QuillIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-text-primary font-heading group-hover:text-gold transition-colors">
                Profil & Tutor
              </span>
              <p className="text-[10px] text-text-secondary font-mono">True Mastery & Kelemahan</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-state-success font-mono">
              {overallMastery.overallPercentage}%
            </span>
            {recommendation.prioritySeverity === 'critical' && (
              <span className="badge-wine">
                ⚠ 1 Titik Lemah
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
};

