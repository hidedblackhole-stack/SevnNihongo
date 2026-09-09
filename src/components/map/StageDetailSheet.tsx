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
          className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 z-10 overflow-hidden shadow-2xl border-t-2 sm:border-2 transition-all bg-[#FAF4E9] border-[#D9C5AB] text-[#442D22] dark:bg-[#1c1410] dark:border-[#3d2b22] dark:text-[#f4e8c1]"
          style={{
            boxShadow: '0 20px 50px -10px rgba(0,0,0,0.5), inset 0 2px 3px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)'
          }}
        >
          {/* Subtle Top Pull Indicator (Mobile) */}
          <div className="w-12 h-1.5 rounded-full bg-[#D9C5AB] dark:bg-stone-700 mx-auto -mt-2 mb-4 sm:hidden" />

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center bg-[#EDE1D0] hover:bg-[#E2D4C0] dark:bg-stone-800 dark:hover:bg-stone-700 text-[#765F50] dark:text-stone-400 transition-colors shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Badge & Level */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-lg border font-medieval flex items-center gap-1 ${
                isBoss
                  ? 'bg-red-500/15 border-red-500/40 text-red-600 dark:text-red-400'
                  : isCompleted
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400'
              }`}
            >
              {isBoss ? <Crown className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{isBoss ? 'BOSS TRIAL' : `STAGE ${stage.stageNumber}`}</span>
            </span>

            {isCompleted && (
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/50">
                Selesai
              </span>
            )}
          </div>

          {/* Stage Title */}
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-black font-medieval tracking-wide text-[#442D22] dark:text-stone-100 leading-snug">
              {stage.title.replace(/^Stage \d+:\s*/i, '').replace(/^第\d+節:\s*/i, '')}
            </h2>
            <p className="text-xs text-[#765F50] dark:text-stone-400 mt-1 line-clamp-2">
              {stage.description}
            </p>
          </div>

          {/* Star Rating Section */}
          <div className="p-3.5 rounded-2xl bg-[#F1E7D8] dark:bg-[#140d0a]/70 border border-[#D9C5AB] dark:border-[#36261e] mb-4 flex items-center justify-between">
            <span className="text-xs font-bold font-medieval text-[#765F50] dark:text-stone-400">
              Pencapaian Bintang:
            </span>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                    i < stars
                      ? 'bg-amber-400/20 border-amber-500 text-amber-500 shadow-sm scale-105'
                      : 'bg-[#FAF4E9] dark:bg-stone-900 border-[#D9C5AB] dark:border-stone-800 text-stone-400/40'
                  }`}
                >
                  <Star className={`w-4 h-4 ${i < stars ? 'fill-amber-400 text-amber-500' : ''}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Rewards & Content Modules Breakdown */}
          <div className="space-y-3 mb-6">
            {/* Rewards Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#F5ECD7] dark:bg-[#251b14] border border-[#E6C978] dark:border-amber-700/40 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-[#765F50] dark:text-stone-400 uppercase font-bold">Reward EXP</div>
                  <div className="text-sm font-black font-mono text-[#B88912] dark:text-amber-300">+{stage.rewardExp} EXP</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F5ECD7] dark:bg-[#251b14] border border-[#E6C978] dark:border-amber-700/40 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400 shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-[#765F50] dark:text-stone-400 uppercase font-bold">Reward Koin</div>
                  <div className="text-sm font-black font-mono text-[#B88912] dark:text-yellow-300">+{stage.rewardGold} Gold</div>
                </div>
              </div>
            </div>

            {/* Modules Included */}
            <div className="pt-2">
              <div className="text-[11px] font-mono uppercase font-bold text-[#765F50] dark:text-stone-400 mb-2">
                Materi di Stage Ini:
              </div>
              <div className="flex flex-wrap gap-2">
                {bunpouCount > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-[#FAF4E9] dark:bg-stone-900 border border-[#D9C5AB] dark:border-stone-800 flex items-center gap-1.5 font-medium">
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>{bunpouCount} Bunpou</span>
                  </span>
                )}
                {kotobaCount > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-[#FAF4E9] dark:bg-stone-900 border border-[#D9C5AB] dark:border-stone-800 flex items-center gap-1.5 font-medium">
                    <Layers className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{kotobaCount} Kosakata</span>
                  </span>
                )}
                {kanjiCount > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-[#FAF4E9] dark:bg-stone-900 border border-[#D9C5AB] dark:border-stone-800 flex items-center gap-1.5 font-medium">
                    <Feather className="w-3.5 h-3.5 text-rose-500" />
                    <span>{kanjiCount} Kanji</span>
                  </span>
                )}
                {dokkaiCount > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-[#FAF4E9] dark:bg-stone-900 border border-[#D9C5AB] dark:border-stone-800 flex items-center gap-1.5 font-medium">
                    <BookMarked className="w-3.5 h-3.5 text-blue-500" />
                    <span>{dokkaiCount} Dokkai</span>
                  </span>
                )}
                {choukaiCount > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-[#FAF4E9] dark:bg-stone-900 border border-[#D9C5AB] dark:border-stone-800 flex items-center gap-1.5 font-medium">
                    <Headphones className="w-3.5 h-3.5 text-purple-500" />
                    <span>{choukaiCount} Choukai</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action CTA Button: Embossed Skeuomorphic Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base font-medieval tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all text-[#FFF7EC] bg-[#57382A] hover:bg-[#442D22] border border-[#3E2718] dark:bg-[#b88912] dark:hover:bg-[#a1770e] dark:text-stone-950 dark:border-[#7a5808]"
            style={{
              boxShadow: '0 4px 0 var(--action-shadow, #3E2718), 0 8px 14px var(--lo-soft, rgba(68,45,34,0.18)), inset 0 1px 0 var(--hi-soft, rgba(255,247,236,0.3))'
            }}
          >
            {isCompleted ? <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />}
            <span>{isCompleted ? 'Mainkan Ulang Stage' : isBoss ? 'Mulai Ujian Boss Battle' : 'Mulai Petualangan Stage'}</span>
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
