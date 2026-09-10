import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Star, 
  Sparkles, 
  Coins, 
  Swords, 
  BookOpen, 
  Layers, 
  Feather, 
  BookMarked, 
  Headphones, 
  ShieldCheck, 
  Play, 
  RotateCcw,
  Crown
} from 'lucide-react';
import { Stage } from '../../types/content';
import { StageClearData } from '../../types/rpg';
import { playSound } from '../../utils/audio';

interface StageDetailSheetProps {
  stage: Stage | null;
  stageProgress?: StageClearData;
  isOpen: boolean;
  onClose: () => void;
  onStartStage: (stage: Stage) => void;
  soundEnabled?: boolean;
}

export const StageDetailSheet: React.FC<StageDetailSheetProps> = ({
  stage,
  stageProgress,
  isOpen,
  onClose,
  onStartStage,
  soundEnabled = true,
}) => {
  if (!isOpen || !stage) return null;

  const isCompleted = stageProgress?.cleared || false;
  const stars = stageProgress?.stars || 0;
  const isBoss = stage.isBoss;

  const bunpouCount = stage.bunpouIds?.length || 0;
  const kotobaCount = stage.kotobaIds?.length || 0;
  const kanjiCount = stage.kanjiIds?.length || 0;
  const dokkaiCount = stage.dokkaiIds?.length || 0;
  const choukaiCount = stage.choukaiIds?.length || 0;

  const handleStart = () => {
    playSound('attack', soundEnabled);
    onStartStage(stage);
  };

  const handleClose = () => {
    playSound('click', soundEnabled);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm modal-backdrop"
        />

        {/* Tactile Sheet / Modal Container */}
        <motion.div
          initial={{ y: 28, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 z-10 overflow-hidden shadow-2xl border border-border-primary transition-all panel bg-surface-card text-text-primary"
          style={{
            boxShadow: '0 20px 50px -10px var(--shadow-color), inset 0 2px 3px var(--panel-highlight)'
          }}
        >
          {/* Subtle Top Pull Indicator (Mobile) */}
          <div className="w-12 h-1.5 rounded-full bg-border-primary mx-auto -mt-2 mb-4 sm:hidden" />

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center bg-surface-inset hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors border border-border-subtle shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Badge & Level */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-lg border font-heading flex items-center gap-1 ${
                isBoss
                  ? 'bg-surface-inset border-border-primary text-gold'
                  : 'bg-gold/15 border-gold/40 text-gold'
              }`}
            >
              {isBoss ? <Crown className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{isBoss ? 'BOSS TRIAL' : `STAGE ${stage.stageNumber}`}</span>
            </span>

            {isCompleted && (
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-surface-inset text-gold border border-border-subtle">
                Selesai
              </span>
            )}
          </div>

          {/* Stage Title */}
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-black font-heading tracking-wide text-text-primary leading-snug">
              {stage.title.replace(/^Stage \d+:\s*/i, '').replace(/^第\d+節:\s*/i, '')}
            </h2>
            <p className="text-xs text-text-secondary mt-1 line-clamp-2">
              {stage.description}
            </p>
          </div>

          {/* Star Rating Section */}
          <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle mb-4 flex items-center justify-between">
            <span className="text-xs font-bold font-heading text-text-secondary">
              Pencapaian Bintang:
            </span>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                    i < stars
                      ? 'bg-gold/20 border-gold text-gold shadow-sm scale-105'
                      : 'bg-surface-card border-border-subtle text-text-muted/40'
                  }`}
                >
                  <Star className={`w-4 h-4 ${i < stars ? 'fill-current text-gold' : ''}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Rewards & Content Modules Breakdown */}
          <div className="space-y-3 mb-6">
            {/* Rewards Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center text-gold shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-text-secondary uppercase font-bold">Reward EXP</div>
                  <div className="text-sm font-black font-mono text-gold">+{stage.rewardExp} EXP</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center text-gold shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-text-secondary uppercase font-bold">Reward Koin</div>
                  <div className="text-sm font-black font-mono text-gold">+{stage.rewardGold} Gold</div>
                </div>
              </div>
            </div>

            {/* Modules Included */}
            <div className="pt-2">
              <div className="text-[11px] font-mono uppercase font-bold text-text-secondary mb-2">
                Materi di Stage Ini:
              </div>
              <div className="flex flex-wrap gap-2">
                {bunpouCount > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-surface-inset border border-border-subtle flex items-center gap-1.5 font-medium text-text-primary">
                    <BookOpen className="w-3.5 h-3.5 text-gold" />
                    <span>{bunpouCount} Bunpou</span>
                  </span>
                )}
                {kotobaCount > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-surface-inset border border-border-subtle flex items-center gap-1.5 font-medium text-text-primary">
                    <Layers className="w-3.5 h-3.5 text-gold" />
                    <span>{kotobaCount} Kosakata</span>
                  </span>
                )}
                {kanjiCount > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-surface-inset border border-border-subtle flex items-center gap-1.5 font-medium text-text-primary">
                    <Feather className="w-3.5 h-3.5 text-gold" />
                    <span>{kanjiCount} Kanji</span>
                  </span>
                )}
                {dokkaiCount > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-surface-inset border border-border-subtle flex items-center gap-1.5 font-medium text-text-primary">
                    <BookMarked className="w-3.5 h-3.5 text-gold" />
                    <span>{dokkaiCount} Dokkai</span>
                  </span>
                )}
                {choukaiCount > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-surface-inset border border-border-subtle flex items-center gap-1.5 font-medium text-text-primary">
                    <Headphones className="w-3.5 h-3.5 text-gold" />
                    <span>{choukaiCount} Choukai</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action CTA Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            className="rpg-btn rpg-btn-primary w-full py-3.5 px-6 rounded-2xl font-heading text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 cursor-pointer"
          >
            {isCompleted ? <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />}
            <span>{isCompleted ? 'Mainkan Ulang Stage' : isBoss ? 'Mulai Ujian Boss Battle' : 'Mulai Petualangan Stage'}</span>
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
