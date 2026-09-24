import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  Clock, 
  ChevronRight, 
  Trophy, 
  PenTool, 
  ShieldAlert,
  Play,
  Award,
  Layers,
  HelpCircle
} from 'lucide-react';
import { KanjiSpeedRushModal } from './KanjiSpeedRushModal';
import { SuddenDeathStreakModal } from './SuddenDeathStreakModal';
import { KotobaGuessModal } from './KotobaGuessModal';
import { playSound } from '../../utils/audio';
import { UserDeck } from '../../types/rpg';

interface ArcadeHubViewProps {
  soundEnabled?: boolean;
  userDecks?: UserDeck[];
  playerLevel?: number;
  playerTierIndex?: number;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => void;
}

export const ArcadeHubView: React.FC<ArcadeHubViewProps> = ({
  soundEnabled = true,
  userDecks = [],
  playerLevel = 1,
  playerTierIndex = 0,
  onRewardPlayer,
  onCompleteStudyItem,
}) => {
  const [activeModal, setActiveModal] = useState<'kanji_speed' | 'sudden_death' | 'kotoba_guess' | null>(null);

  return (
    <div className="space-y-6">
      
      {/* 1. HERO BANNER: ARENA ARCADE */}
      <div className="panel p-5 sm:p-6 rounded-3xl bg-surface-card border border-border-subtle shadow-md space-y-3 relative overflow-hidden">
        <div className="space-y-1.5 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-gold font-bold">
              Tantangan Kilat · Kecepatan & Akurasi
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-text-primary tracking-wide">
            Arena Arcade
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Tantang batas kecepatan menulis dan ketangkasan bahasa Jepangmu! Selesaikan tantangan dalam batas waktu dan raih kartu pencapaian terbaikmu.
          </p>
        </div>
      </div>

      {/* 2. THREE GAME CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* GAME 1: KANJI SPEED RUSH (60s) */}
        <motion.div
          whileHover={{ y: -3 }}
          className="panel p-5 rounded-3xl bg-surface-card border border-border-subtle hover:border-border-primary shadow-md flex flex-col justify-between space-y-4 group transition-all relative overflow-hidden"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full bg-surface-inset border border-border-subtle text-text-secondary text-[10px] font-mono font-bold">
                Tantangan Kecepatan
              </span>
              <span className="text-xs font-mono font-bold text-text-muted">
                60 Detik
              </span>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-surface-inset border border-border-subtle text-gold flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6 fill-current" />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-text-primary group-hover:text-gold transition-colors">
                Kanji Speed Rush
              </h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Berapa kanji bisa kamu tulis dalam 60 detik? <strong>Pewaktu otomatis berhenti saat loading kanji</strong>, menghitung murni kecepatan tanganmu!
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded-lg bg-surface-inset border border-border-subtle text-text-muted">
                Kuas HanziWriter
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-surface-inset border border-border-subtle text-text-muted">
                Pause Loading
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-surface-inset border border-border-subtle text-text-muted">
                Rank SSS
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setActiveModal('kanji_speed');
            }}
            className="w-full btn-physical-primary py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-2 cursor-pointer shadow-sm relative z-10"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Mulai Nulis (60s)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* GAME 2: SUDDEN DEATH (3 NYAWA) */}
        <motion.div
          whileHover={{ y: -3 }}
          className="panel p-5 rounded-3xl bg-surface-card border border-border-subtle hover:border-border-primary shadow-md flex flex-col justify-between space-y-4 group transition-all relative overflow-hidden"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full bg-surface-inset border border-border-subtle text-text-secondary text-[10px] font-mono font-bold">
                Survival Mode
              </span>
              <span className="text-xs font-mono font-bold text-text-muted">
                3 Nyawa
              </span>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-surface-inset border border-border-subtle text-crimson flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-text-primary group-hover:text-crimson transition-colors">
                Sudden Death 3 Nyawa
              </h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Tantang batas hafalanmu tanpa salah! Satu jawaban salah menghabiskan 1 nyawa. Seberapa panjang rekor combo streak yang bisa kamu capai?
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded-lg bg-surface-inset border border-border-subtle text-text-muted">
                1 Salah = -1 Hati
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-surface-inset border border-border-subtle text-text-muted">
                Rekor Streak
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-surface-inset border border-border-subtle text-text-muted">
                Kotoba & Bacaan
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setActiveModal('sudden_death');
            }}
            className="w-full btn-physical-primary py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-2 cursor-pointer shadow-sm relative z-10"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Uji Nyawa Sekarang</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* GAME 3: KOTOBA GUESS RELAY (45s) */}
        <motion.div
          whileHover={{ y: -3 }}
          className="panel p-5 rounded-3xl bg-surface-card border border-border-subtle hover:border-border-primary shadow-md flex flex-col justify-between space-y-4 group transition-all relative overflow-hidden"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full bg-surface-inset border border-border-subtle text-text-secondary text-[10px] font-mono font-bold">
                Sprint Relay
              </span>
              <span className="text-xs font-mono font-bold text-text-muted">
                45 Detik
              </span>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-surface-inset border border-border-subtle text-indigo flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <Clock className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-text-primary group-hover:text-teal transition-colors">
                Kotoba Guess Relay
              </h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Tebak arti kosakata secepat kilat dengan audio pengucapan asli Jepang. Pertahankan kombo tanpa terputus untuk multiplier poin raksasa!
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded-lg bg-surface-inset border border-border-subtle text-text-muted">
                Audio Native
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-surface-inset border border-border-subtle text-text-muted">
                2.0x Combo Poin
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-surface-inset border border-border-subtle text-text-muted">
                45 Detik Sprint
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setActiveModal('kotoba_guess');
            }}
            className="w-full btn-physical-primary py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-2 cursor-pointer shadow-sm relative z-10"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Mulai Sprint (45s)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

      </div>


      {/* MODAL 1: KANJI SPEED RUSH */}
      <KanjiSpeedRushModal
        isOpen={activeModal === 'kanji_speed'}
        onClose={() => setActiveModal(null)}
        soundEnabled={soundEnabled}
        userDecks={userDecks}
        playerLevel={playerLevel}
        playerTierIndex={playerTierIndex}
        onRewardPlayer={onRewardPlayer}
        onCompleteStudyItem={onCompleteStudyItem}
      />

      {/* MODAL 2: SUDDEN DEATH */}
      <SuddenDeathStreakModal
        isOpen={activeModal === 'sudden_death'}
        onClose={() => setActiveModal(null)}
        soundEnabled={soundEnabled}
        userDecks={userDecks}
        playerLevel={playerLevel}
        playerTierIndex={playerTierIndex}
        onRewardPlayer={onRewardPlayer}
        onCompleteStudyItem={onCompleteStudyItem}
      />

      {/* MODAL 3: KOTOBA GUESS */}
      <KotobaGuessModal
        isOpen={activeModal === 'kotoba_guess'}
        onClose={() => setActiveModal(null)}
        soundEnabled={soundEnabled}
        userDecks={userDecks}
        playerLevel={playerLevel}
        playerTierIndex={playerTierIndex}
        onRewardPlayer={onRewardPlayer}
        onCompleteStudyItem={onCompleteStudyItem}
      />

    </div>
  );
};
