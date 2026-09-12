import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Heart,
  Zap,
  Star,
  Flame,
  Award,
  BookOpen,
  Target,
  Calendar,
  Layers,
  Trophy,
  Check,
  Edit2
} from 'lucide-react';
import { PlayerStats } from '../../types/rpg';
import { getTierForExp } from '../../data/tiers';
import { TierAvatar } from '../avatar/TierAvatar';
import { playSound } from '../../utils/audio';
import { calculateLanguageProfile, calculateCoverage } from '../../utils/mastery';
import { INITIAL_STUDY_STATS } from '../../utils/activity';

import { WORLD_STAGES_MAP } from '../../data/maps';

interface CharacterStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  stageProgress?: Record<string, import('../../types/rpg').StageClearData>;
  onAllocateStat?: (statKey: 'str' | 'agi' | 'int' | 'vit') => void;
  onRecoverHp?: () => void;
  onStartRecall?: () => void;
  onUpdateName?: (newName: string) => void;
}

export const CharacterStatusModal: React.FC<CharacterStatusModalProps> = ({
  isOpen,
  onClose,
  stats,
  stageProgress = {},
}) => {
  if (!isOpen) return null;

  const { tierIndex: effectiveTierIndex } = getTierForExp(
    stats.totalExp,
    stageProgress,
    WORLD_STAGES_MAP
  );
  
  const languageProfile = calculateLanguageProfile(stats.itemMastery || {});
  const coverage = calculateCoverage(stats);
  const studyStats = stats.studyStats || INITIAL_STUDY_STATS;
  const unlockedAchievements = stats.streakDays > 0 ? 1 : 0;
  const totalAchievements = 12;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl panel border border-border-subtle rounded-3xl p-5 sm:p-6 text-text-primary shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle shrink-0 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-surface-inset border border-border-subtle text-indigo">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text-primary font-heading uppercase tracking-wider">
                  Nihongo Quest Profile
                </h2>
                <p className="text-[10px] text-text-secondary font-mono">
                  5 Realms Progression & Dynamic Mastery
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                playSound('click', stats.soundEnabled);
                onClose();
              }}
              className="p-1.5 rounded-full bg-surface-inset hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
            
            {/* 1. IDENTITY & TOTAL STUDY EXP */}
            <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-3xl bg-surface-inset border border-border-subtle shadow-inner">
              <TierAvatar tierIndex={effectiveTierIndex ?? stats.tierIndex} size="lg" />
              <div>
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-text-primary font-heading">
                    {stats.playerName || 'Pelajar Bahasa'}
                  </h3>
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="px-3 py-1 rounded-xl bg-surface-card text-gold font-bold font-mono text-xs border border-border-subtle flex items-center gap-1.5 shadow-sm">
                    <Star className="w-3.5 h-3.5 fill-gold text-gold" />
                    {stats.totalExp.toLocaleString()} Akumulasi EXP Belajar
                  </span>
                </div>
              </div>
            </div>

            {/* 2. STUDY STATISTICS (TOTAL VS UNIQUE) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2 font-heading">
                <BookOpen className="w-4 h-4 text-indigo" />
                Study Statistics
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Flashcards */}
                <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle text-center space-y-1">
                  <div className="w-8 h-8 mx-auto rounded-xl bg-indigo/15 flex items-center justify-center mb-2">
                    <Layers className="w-4 h-4 text-indigo" />
                  </div>
                  <h4 className="text-xs font-bold text-text-primary font-heading">Flashcards</h4>
                  <div className="flex flex-col text-[11px]">
                    <span className="text-indigo font-mono font-bold">{studyStats.flashcards.total} Total</span>
                    <span className="text-text-muted font-mono">{studyStats.flashcards.uniqueIds.length} Unique</span>
                  </div>
                </div>

                {/* Questions */}
                <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle text-center space-y-1">
                  <div className="w-8 h-8 mx-auto rounded-xl bg-state-success/15 flex items-center justify-center mb-2">
                    <Target className="w-4 h-4 text-state-success" />
                  </div>
                  <h4 className="text-xs font-bold text-text-primary font-heading">Questions</h4>
                  <div className="flex flex-col text-[11px]">
                    <span className="text-state-success font-mono font-bold">{studyStats.questions.total} Total</span>
                    <span className="text-text-muted font-mono">{studyStats.questions.uniqueIds.length} Unique</span>
                  </div>
                </div>

                {/* Kanji Writing */}
                <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle text-center space-y-1">
                  <div className="w-8 h-8 mx-auto rounded-xl bg-wine-accent/15 flex items-center justify-center mb-2">
                    <Edit2 className="w-4 h-4 text-wine-accent" />
                  </div>
                  <h4 className="text-xs font-bold text-text-primary font-heading">Kanji Writing</h4>
                  <div className="flex flex-col text-[11px]">
                    <span className="text-wine-accent font-mono font-bold">{studyStats.kanjiWriting.total} Total</span>
                    <span className="text-text-muted font-mono">{studyStats.kanjiWriting.uniqueIds.length} Unique</span>
                  </div>
                </div>

                {/* Try Outs / Boss */}
                <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle text-center space-y-1">
                  <div className="w-8 h-8 mx-auto rounded-xl bg-gold/15 flex items-center justify-center mb-2">
                    <Trophy className="w-4 h-4 text-gold" />
                  </div>
                  <h4 className="text-xs font-bold text-text-primary font-heading">Try Outs</h4>
                  <div className="flex flex-col text-[11px]">
                    <span className="text-gold font-mono font-bold">{studyStats.tryOuts.total} Total</span>
                    <span className="text-text-muted font-mono">{studyStats.tryOuts.uniqueIds.length} Unique</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. N3 MASTERY VS COVERAGE */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2 font-heading">
                <Target className="w-4 h-4 text-gold" />
                N3 Mastery vs Coverage
              </h3>
              
              <div className="p-4 rounded-3xl bg-surface-inset border border-border-subtle space-y-4">
                {/* Overall Mastery & Coverage */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-border-subtle">
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] text-text-muted block font-mono">Overall Mastery (Depth)</span>
                    <span className="text-3xl font-bold text-gold font-mono">{languageProfile.overallPercentage}%</span>
                  </div>
                  <div className="text-center sm:text-right">
                    <span className="text-[10px] text-text-muted block font-mono">Overall Coverage (Breadth)</span>
                    <span className="text-xl font-bold text-state-success font-mono">{coverage.overall}%</span>
                  </div>
                </div>

                {/* Pillar Breakdown */}
                <div className="space-y-3">
                  {[
                    { key: 'kotoba', label: 'Kotoba', mastery: languageProfile.pillars.kotoba.percentage, cov: coverage.kotoba, color: 'bg-indigo text-indigo' },
                    { key: 'kanji', label: 'Kanji', mastery: languageProfile.pillars.kanji.percentage, cov: coverage.kanji, color: 'bg-wine-accent text-wine-accent' },
                    { key: 'bunpou', label: 'Bunpou', mastery: languageProfile.pillars.bunpou.percentage, cov: coverage.bunpou, color: 'bg-gold text-gold' },
                    { key: 'dokkai', label: 'Dokkai', mastery: languageProfile.pillars.dokkai.percentage, cov: coverage.dokkai, color: 'bg-dokkai text-dokkai' },
                    { key: 'choukai', label: 'Choukai', mastery: languageProfile.pillars.choukai.percentage, cov: coverage.choukai, color: 'bg-choukai text-choukai' },
                  ].map(pillar => (
                    <div key={pillar.key} className="flex items-center gap-3">
                      <div className="w-16 text-xs font-bold text-text-primary">{pillar.label}</div>
                      
                      {/* Mastery Bar */}
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className={pillar.color.split(' ')[1]}>Mastery {pillar.mastery}%</span>
                        </div>
                        <div className="h-1.5 w-full rpg-progress-track rounded-full overflow-hidden">
                          <div className={`h-full ${pillar.color.split(' ')[0]} rounded-full`} style={{ width: `${pillar.mastery}%` }} />
                        </div>
                      </div>

                      {/* Coverage Bar */}
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-state-success">Coverage {pillar.cov}%</span>
                        </div>
                        <div className="h-1.5 w-full rpg-progress-track rounded-full overflow-hidden">
                          <div className="h-full bg-state-success rounded-full" style={{ width: `${pillar.cov}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-[10px] text-text-muted italic mt-2 text-center">
                  * Coverage = Materi yang pernah dipelajari. Mastery = Kekuatan pemahaman & ingatan (SRS).
                </p>
              </div>
            </div>

            {/* 4. STREAK & ACHIEVEMENTS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Streak */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2 font-heading">
                  <Flame className="w-4 h-4 text-gold" />
                  Activity Streak
                </h3>
                <div className="p-4 rounded-3xl bg-surface-inset border border-border-subtle grid grid-cols-2 gap-4">
                  <div className="text-center space-y-1 border-r border-border-subtle">
                    <span className="text-[10px] text-text-muted uppercase">Current Streak</span>
                    <div className="flex items-center justify-center gap-1 text-gold">
                      <Flame className="w-5 h-5 fill-gold" />
                      <span className="text-xl font-bold font-mono">{stats.streakDays}</span>
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-[10px] text-text-muted uppercase">Longest Streak</span>
                    <div className="flex items-center justify-center gap-1 text-text-primary">
                      <Award className="w-5 h-5" />
                      <span className="text-xl font-bold font-mono">{stats.longestStreak || stats.streakDays}</span>
                    </div>
                  </div>
                  <div className="col-span-2 pt-3 mt-1 border-t border-border-subtle text-center flex items-center justify-center gap-2 text-xs text-text-secondary">
                    <Calendar className="w-4 h-4" />
                    Total Active Days: <strong className="text-text-primary">{stats.totalActiveDays || stats.streakDays}</strong>
                  </div>
                </div>
              </div>

              {/* Achievements */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2 font-heading">
                  <Trophy className="w-4 h-4 text-gold" />
                  Achievements
                </h3>
                <div className="p-4 rounded-3xl bg-surface-inset border border-border-subtle flex flex-col justify-center items-center text-center h-[132px]">
                  <span className="text-3xl font-bold text-text-primary font-mono">
                    {unlockedAchievements} <span className="text-text-muted text-xl">/ {totalAchievements}</span>
                  </span>
                  <p className="text-[11px] text-text-muted mt-2">
                    Achievement system will be fully integrated soon! 
                    Keep practicing to unlock badges.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
