import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Target,
  Star,
  Zap,
  Layers,
  Swords,
  PenTool,
  Crown,
  Medal,
  Award,
  Sparkles,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { TierAvatar } from '../avatar/TierAvatar';
import { RPG_TIERS, getTierForExp } from '../../data/tiers';
import { playSound } from '../../utils/audio';
import { LeaderboardEntry } from '../../lib/supabase';

export interface PlayerProfileModalProps {
  player: (LeaderboardEntry & { rank?: number; weeklyScore?: number }) | null;
  isOpen: boolean;
  onClose: () => void;
  isCurrentUser: boolean;
  soundEnabled: boolean;
  onOpenFullStatusModal?: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  player,
  isOpen,
  onClose,
  isCurrentUser,
  soundEnabled,
  onOpenFullStatusModal,
}) => {
  // Prevent background scrolling while modal is open & listen for ESC key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playSound('click', soundEnabled);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, soundEnabled]);

  if (!isOpen || !player) return null;

  const currentExp = player.total_exp ?? 0;
  // Dynamically reconcile tier with rebalanced EXP curve
  const { tierIndex: computedTierIndex } = getTierForExp(currentExp);
  const tierIndex = computedTierIndex;
  const currentTier = RPG_TIERS[tierIndex];
  const nextTier = tierIndex < RPG_TIERS.length - 1 ? RPG_TIERS[tierIndex + 1] : null;
  let progressPercent = 100;
  let expToNext = 0;
  if (nextTier) {
    const prevReq = currentTier.requiredExpTotal;
    const nextReq = nextTier.requiredExpTotal;
    const tierRange = nextReq - prevReq;
    const progressInTier = Math.max(0, currentExp - prevReq);
    progressPercent = tierRange > 0 ? Math.min(100, Math.round((progressInTier / tierRange) * 100)) : 100;
    expToNext = Math.max(0, nextReq - currentExp);
  }

  // Study stats list with rich styling matching Castle modal
  const statsList = [
    {
      label: 'Flashcards',
      value: player.stat_flashcard ?? 0,
      unit: 'Kartu Dihafal',
      icon: Layers,
      bg: 'bg-indigo/15 text-indigo border-indigo/30',
      textCol: 'text-indigo',
    },
    {
      label: 'Ujian & Kuis',
      value: player.stat_tryout ?? 0,
      unit: 'Soal Selesai',
      icon: Target,
      bg: 'bg-state-success/15 text-state-success border-state-success/30',
      textCol: 'text-state-success',
    },
    {
      label: 'Menulis Aksara',
      value: player.stat_kanji ?? 0,
      unit: 'Goresan Kanji',
      icon: PenTool,
      bg: 'bg-wine-accent/15 text-wine-accent border-wine-accent/30',
      textCol: 'text-wine-accent',
    },
    {
      label: 'Boss Battle',
      value: player.stat_boss ?? 0,
      unit: 'Musuh Dikalahkan',
      icon: Swords,
      bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      textCol: 'text-rose-400',
    },
  ];

  const getRankBadge = (rank?: number) => {
    if (!rank) return null;
    if (rank === 1) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-yellow-400 border border-yellow-500/40 flex items-center gap-1 shadow-sm">
          <Crown className="w-3.5 h-3.5 fill-yellow-400" /> Juara 1 Global
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-400/20 text-slate-300 border border-slate-400/40 flex items-center gap-1 shadow-sm">
          <Medal className="w-3.5 h-3.5 fill-slate-300" /> Peringkat 2 Global
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-700/20 text-amber-500 border border-amber-700/40 flex items-center gap-1 shadow-sm">
          <Medal className="w-3.5 h-3.5 fill-amber-600" /> Peringkat 3 Global
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-surface-inset text-text-secondary border border-border-subtle flex items-center gap-1 shadow-sm">
        <Award className="w-3.5 h-3.5 text-gold" /> Peringkat #{rank} Global
      </span>
    );
  };

  const modalContent = (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
        onClick={() => {
          playSound('click', soundEnabled);
          onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg panel border border-border-subtle rounded-3xl p-5 sm:p-6 text-text-primary shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col bg-surface-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Top Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle shrink-0 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-surface-inset border border-border-subtle text-indigo">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text-primary font-heading uppercase tracking-wider">
                  Profil Karakter Petualang
                </h2>
                <p className="text-[10px] text-text-secondary font-mono">
                  Status RPG & Kemajuan Pembelajaran
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="p-1.5 rounded-full bg-surface-inset hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-5 custom-scrollbar">
            {/* 1. CHARACTER SANCTUARY HERO */}
            <div className="flex flex-col items-center text-center space-y-3 p-4 sm:p-5 rounded-3xl bg-surface-inset border border-border-subtle shadow-inner relative overflow-hidden">
              {/* Skeuomorphic background ambient glow */}
              <div className="absolute inset-0 bg-radial from-gold/5 via-transparent to-transparent pointer-events-none" />

              {/* Full-size animated RPG Tier Avatar with Rank Aura */}
              <div className="relative py-2">
                <TierAvatar
                  tierIndex={tierIndex}
                  size="lg"
                  interactive={false}
                  showRankBadge={true}
                />
              </div>

              <div className="relative z-10 space-y-1.5 w-full">
                {/* Player Name and badges */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-black text-text-primary font-heading tracking-wide">
                    {player.player_name || 'Petualang'}
                  </h3>
                  {isCurrentUser && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      KAMU
                    </span>
                  )}
                </div>

                {/* Rank & Tier Badges */}
                <div className="flex items-center justify-center gap-2 flex-wrap pt-0.5">
                  {getRankBadge(player.rank)}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-card border border-border-subtle text-text-secondary">
                    {currentTier.name}
                  </span>
                </div>

                {/* Level & Total Study EXP Pills */}
                <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                  {player.level ? (
                    <span className="px-3 py-1 rounded-xl bg-surface-card text-gold font-bold font-mono text-xs border border-border-subtle flex items-center gap-1.5 shadow-sm">
                      <Star className="w-3.5 h-3.5 fill-gold text-gold" />
                      Level {player.level}
                    </span>
                  ) : null}
                  <span className="px-3 py-1 rounded-xl bg-surface-card text-gold font-bold font-mono text-xs border border-border-subtle flex items-center gap-1.5 shadow-sm">
                    <Zap className="w-3.5 h-3.5 text-gold fill-gold" />
                    {currentExp.toLocaleString()} Akumulasi EXP
                  </span>
                  {player.weeklyScore !== undefined && (
                    <span className="px-3 py-1 rounded-xl bg-surface-card text-rose-400 font-bold font-mono text-xs border border-border-subtle flex items-center gap-1.5 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                      {player.weeklyScore.toLocaleString()} Skor Minggu Ini
                    </span>
                  )}
                </div>

                {/* Tier Flavor Description */}
                <p className="text-xs text-text-secondary pt-1 italic max-w-sm mx-auto">
                  "{currentTier.description}"
                </p>
              </div>
            </div>

            {/* 2. TIER PROGRESSION TRACK */}
            {nextTier && (
              <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
                <div className="flex items-center justify-between text-xs font-heading">
                  <span className="font-bold text-text-primary flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-gold" />
                    Menuju {nextTier.name}
                  </span>
                  <span className="font-mono font-bold text-gold">{progressPercent}%</span>
                </div>

                <div className="h-2 w-full bg-surface-card rounded-full overflow-hidden border border-border-subtle p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
                  <span>{currentTier.name}</span>
                  <span>{expToNext.toLocaleString()} EXP lagi</span>
                  <span>{nextTier.name}</span>
                </div>
              </div>
            )}

            {/* 3. STUDY STATISTICS (SKEUOMORPHIC 4 TILES) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2 font-heading">
                <BookOpen className="w-4 h-4 text-indigo" />
                Statistik Belajar
              </h4>

              <div className="grid grid-cols-2 gap-3">
                {statsList.map((st) => {
                  const Icon = st.icon;
                  return (
                    <div
                      key={st.label}
                      className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle text-center space-y-1 shadow-sm"
                    >
                      <div className={`w-8 h-8 mx-auto rounded-xl flex items-center justify-center mb-1.5 border ${st.bg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-[11px] font-bold text-text-secondary font-heading">
                        {st.label}
                      </div>
                      <div className={`font-mono text-xl font-black ${st.textCol}`}>
                        {st.value.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-text-muted font-mono">
                        {st.unit}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. CLASS PERKS */}
            {currentTier.perks && (
              <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-gold tracking-wider block">
                  Keunggulan Tingkat (Perks)
                </span>
                <p className="text-xs text-text-secondary">
                  {currentTier.perks}
                </p>
              </div>
            )}

            {/* 5. USER ACTION (IF CURRENT USER) */}
            {isCurrentUser && onOpenFullStatusModal && (
              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  onClose();
                  onOpenFullStatusModal();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-indigo/20 hover:bg-indigo/30 text-indigo border border-indigo/40 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                <span>Buka Status Lengkap & Alokasi Atribut</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
