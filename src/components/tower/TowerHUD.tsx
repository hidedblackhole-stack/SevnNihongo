// ==============================================================================
// NIHONGO TOWER — HEADS-UP DISPLAY (HUD) (STAGE 4B)
// ==============================================================================

import React from 'react';
import { Heart, Shield, Pause, Play, Flame, Award, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RoundPhase, TowerArc } from '../../types/tower';

interface TowerHUDProps {
  floor: number;
  theme?: string;
  arc?: TowerArc;
  hp: number;
  maxHp: number;
  round: number;
  totalRounds: number;
  phases?: RoundPhase[];
  isPaused?: boolean;
  score?: number;
  shieldCount?: number;
  onPauseToggle?: () => void;
  className?: string;
}

export const TowerHUD: React.FC<TowerHUDProps> = ({
  floor,
  theme,
  arc,
  hp,
  maxHp,
  round,
  totalRounds,
  phases = [],
  isPaused = false,
  score = 0,
  shieldCount = 0,
  onPauseToggle,
  className = ''
}) => {
  return (
    <header className={`w-full bg-surface-card/95 backdrop-blur-md border-b border-border-subtle px-4 py-3 select-none transition-all ${className}`}>
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Floor & Theme Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border-subtle flex flex-col items-center justify-center shrink-0 shadow-inner">
            <span className="text-[10px] font-bold text-wine-accent uppercase tracking-wider leading-none">F.</span>
            <span className="text-base font-black text-wine-accent font-heading leading-tight">{floor}</span>
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-text-primary uppercase tracking-wider font-heading truncate">
                {theme || `Lantai ${floor}`}
              </span>
              {arc && (
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-surface-elevated text-text-muted border border-border-subtle">
                  {arc}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-text-secondary">
              <span>Ronde {round} dari {totalRounds}</span>
              {score > 0 && (
                <>
                  <span className="text-border-subtle">•</span>
                  <span className="flex items-center gap-1 text-gold font-bold">
                    <Award className="w-3 h-3" /> {score}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Phase Pills (Desktop / Tablet) */}
        {phases.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 bg-surface-inset/60 px-2.5 py-1 rounded-full border border-border-subtle">
            {phases.map((p, idx) => {
              const isPast = idx < round - 1;
              const isCurrent = idx === round - 1;
              return (
                <div
                  key={`${p}_${idx}`}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    isCurrent
                      ? 'bg-wine-accent text-white shadow-sm shadow-wine-accent/30 scale-105'
                      : isPast
                        ? 'bg-surface-elevated text-emerald-400 border border-border-subtle'
                        : 'text-text-muted opacity-50'
                  }`}
                >
                  <span className="capitalize">{p.replace('jlpt_', '')}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Right: Hearts HP & Pause Control */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Heart Container */}
          <div className="flex items-center gap-1 bg-surface-inset/80 px-2.5 py-1.5 rounded-xl border border-border-subtle shadow-sm">
            {Array.from({ length: maxHp }).map((_, idx) => {
              const isFilled = idx < hp;
              return (
                <motion.div
                  key={idx}
                  animate={{
                    scale: isFilled ? [1, 1.15, 1] : 1,
                    opacity: isFilled ? 1 : 0.25
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${
                      isFilled
                        ? 'text-red-500 fill-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                        : 'text-text-muted fill-transparent'
                    }`}
                  />
                </motion.div>
              );
            })}

            {/* Shield counter if player earned protective shield */}
            {shieldCount > 0 && (
              <div className="ml-1 pl-1.5 border-l border-border-subtle flex items-center gap-0.5 text-cyan-400">
                <Shield className="w-4 h-4 fill-cyan-400/20" />
                <span className="text-xs font-bold font-mono">{shieldCount}</span>
              </div>
            )}
          </div>

          {/* Pause / Resume Button */}
          {onPauseToggle && (
            <button
              type="button"
              onClick={onPauseToggle}
              className="p-2 rounded-xl bg-surface-inset hover:bg-surface-elevated text-text-secondary hover:text-text-primary border border-border-subtle transition-all active:scale-95 cursor-pointer shadow-sm"
              title={isPaused ? 'Lanjutkan tantangan' : 'Jeda tantangan'}
            >
              {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
