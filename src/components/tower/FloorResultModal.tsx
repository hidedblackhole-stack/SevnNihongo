// ==============================================================================
// NIHONGO TOWER — FLOOR RESULT MODAL (STAGE 4B)
// ==============================================================================

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Skull, Award, Coins, Sparkles, ArrowRight, RotateCcw, X, Heart } from 'lucide-react';
import { FloorCompletionReport } from '../../types/tower';

interface FloorResultModalProps {
  report: FloorCompletionReport | null;
  isOpen: boolean;
  onNextFloor?: () => void;
  onRetry?: () => void;
  onClose: () => void;
}

export const FloorResultModal: React.FC<FloorResultModalProps> = ({
  report,
  isOpen,
  onNextFloor,
  onRetry,
  onClose
}) => {
  if (!isOpen || !report) return null;

  const isClear = report.status === 'CLEAR';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 25 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 25 }}
          className="w-full max-w-md bg-surface-card rounded-3xl p-6 border border-border-subtle shadow-2xl relative overflow-hidden"
        >
          {/* Top Decorative Stripe */}
          <div
            className={`absolute top-0 left-0 right-0 h-2 ${
              isClear
                ? 'bg-gradient-to-r from-emerald-400 via-amber-400 to-wine-accent'
                : 'bg-gradient-to-r from-red-600 to-gray-800'
            }`}
          />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-surface-elevated transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Result Icon & Title */}
          <div className="text-center my-4">
            <div
              className={`w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-inner ${
                isClear
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/15 border border-red-500/30 text-red-400'
              }`}
            >
              {isClear ? <Trophy className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
            </div>

            <span
              className={`text-[11px] font-bold uppercase tracking-widest font-heading ${
                isClear ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isClear ? 'Lantai Ditaklukkan!' : 'Tantangan Terhenti'}
            </span>
            <h2 className="text-2xl font-black text-text-primary font-heading mt-0.5">
              Lantai {report.floor}
            </h2>

            {/* Flawless Victor Badge */}
            {report.isFlawless && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-bold font-heading mt-2 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Kemenangan Sempurna (Flawless)</span>
              </div>
            )}
          </div>

          {/* Performance Summary Pill */}
          <div className="grid grid-cols-3 gap-2 my-4 text-center">
            <div className="p-2.5 rounded-2xl bg-surface-inset border border-border-subtle">
              <span className="text-[10px] text-text-muted block">Akurasi</span>
              <span className="text-base font-black text-text-primary font-heading">{report.accuracy}%</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-surface-inset border border-border-subtle">
              <span className="text-[10px] text-text-muted block">Sisa Hati</span>
              <div className="flex items-center justify-center gap-1 text-red-500 font-bold mt-0.5">
                <Heart className="w-4 h-4 fill-red-500" />
                <span className="text-sm font-mono">{report.hpRemaining}</span>
              </div>
            </div>
            <div className="p-2.5 rounded-2xl bg-surface-inset border border-border-subtle">
              <span className="text-[10px] text-text-muted block">Ronde</span>
              <span className="text-base font-black text-text-primary font-heading">
                {report.roundsCompleted}/{report.totalRounds}
              </span>
            </div>
          </div>

          {/* Reward Section */}
          <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle my-4">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2 font-heading">
              Hadiah Diperoleh
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-wine-accent">
                <Award className="w-5 h-5 shrink-0" />
                <div>
                  <span className="text-sm font-black font-heading leading-tight block">+{report.totalExp} EXP</span>
                  {report.bonusExp > 0 && (
                    <span className="text-[10px] text-emerald-400">(+{report.bonusExp} Bonus)</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-amber-400">
                <Coins className="w-5 h-5 shrink-0" />
                <div>
                  <span className="text-sm font-black font-heading leading-tight block">+{report.totalGold} Gold</span>
                  {report.bonusGold > 0 && (
                    <span className="text-[10px] text-emerald-400">(+{report.bonusGold} Bonus)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Title / Gems Unlock */}
            {report.baseReward.titleReward && isClear && (
              <div className="mt-3 pt-2.5 border-t border-border-subtle text-xs text-amber-300 font-bold flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Gelar: 「{report.baseReward.titleReward}」</span>
              </div>
            )}
          </div>

          {/* Mastery Progression Preview */}
          {Object.keys(report.masteryGain).length > 0 && (
            <div className="mb-5 text-xs">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5 font-heading">
                Peningkatan Penguasaan Kata:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {Object.entries(report.masteryGain).map(([id, delta]) => (
                  <span
                    key={id}
                    className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${
                      delta > 0
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}
                  >
                    {id.replace(/^(kt_|kj_|bp_)/, '')} {delta > 0 ? `+${delta}` : delta}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {isClear && onNextFloor ? (
              <button
                type="button"
                onClick={onNextFloor}
                className="w-full py-3.5 rounded-2xl bg-wine-accent hover:opacity-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-wine-accent/25 transition-all cursor-pointer active:scale-95"
              >
                <span>Lanjut Lantai {report.floor + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="w-full py-3.5 rounded-2xl bg-wine-accent hover:opacity-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-wine-accent/25 transition-all cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Coba Lagi Lantai {report.floor}</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-surface-inset hover:bg-surface-elevated border border-border-subtle text-text-secondary text-xs font-bold transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
