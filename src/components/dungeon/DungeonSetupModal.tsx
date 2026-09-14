import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  X,
  Sparkles,
  Layers,
  Flame,
  Clock,
  Shield,
  Check,
  ChevronRight,
  Swords,
  Trophy,
  Coins
} from 'lucide-react';
import { DungeonType, DungeonLevelCategory, DungeonConfig } from '../../utils/dungeonGenerator';
import { playSound } from '../../utils/audio';

interface DungeonSetupModalProps {
  isOpen: boolean;
  dungeonType: DungeonType;
  onClose: () => void;
  onStartDungeon: (config: DungeonConfig) => void;
  soundEnabled?: boolean;
}

const DUNGEON_META: Record<DungeonType, { title: string; subtitle: string; iconEmoji: string }> = {
  writing: {
    title: 'Dungeon Menulis Aksara',
    subtitle: 'Latihan goresan kanvas kaligrafi stroke-by-stroke',
    iconEmoji: '✍️',
  },
  flashcard: {
    title: 'Dungeon Gerbang Ingatan',
    subtitle: 'Drill kilat bolak-balik arti, bacaan & audio',
    iconEmoji: '🎴',
  },
  sakubun: {
    title: 'Dungeon Kuil Tata Bahasa',
    subtitle: 'Menyusun potongan kata menjadi kalimat utuh (J-LIE)',
    iconEmoji: '🧩',
  },
  conjugation: {
    title: 'Dungeon Altar Konjugasi',
    subtitle: 'Refleks cepat perubahan bentuk kata kerja & kata sifat',
    iconEmoji: '⚡',
  },
  quiz: {
    title: 'Dungeon Arena Kuis Cepat',
    subtitle: 'Pertempuran kuis pilihan ganda acak standar JLPT',
    iconEmoji: '🎯',
  },
};

const LEVEL_CATEGORY_OPTIONS: { id: DungeonLevelCategory; label: string; desc: string; badge: string; color: string }[] = [
  { id: 'all', label: 'Semua Tingkat', desc: 'Campuran materi dari dasar hingga mahir', badge: 'Campuran', color: 'text-indigo border-indigo/30 bg-indigo/10' },
  { id: 'N5', label: 'JLPT N5', desc: 'Kosakata, kanji, dan tata bahasa tingkat pemula', badge: 'Dasar', color: 'text-teal border-teal/30 bg-teal/10' },
  { id: 'N4', label: 'JLPT N4', desc: 'Pola percakapan harian & perubahan bentuk kata', badge: 'Pra-Menengah', color: 'text-matcha border-matcha/30 bg-matcha/10' },
  { id: 'N3', label: 'JLPT N3', desc: 'Kosakata menengah & teks situasi umum', badge: 'Menengah', color: 'text-gold border-gold/30 bg-gold/10' },
  { id: 'N2', label: 'JLPT N2', desc: 'Nuansa formal, ekspresi bisnis & opini', badge: 'Mahir', color: 'text-indigo border-indigo/30 bg-indigo/10' },
  { id: 'N1', label: 'JLPT N1', desc: 'Aksara tingkat tinggi, sastra & idiom klasik', badge: 'Ahli', color: 'text-crimson border-crimson/30 bg-crimson/10' },
  { id: 'Kaigo', label: 'Kaigo (Caregiver)', desc: 'Istilah keperawatan, perawat lansia, & instruksi fisik', badge: 'Profesi', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { id: 'PM', label: 'PM / Medis', desc: 'Palang Merah, organ tubuh, & tindakan medis darurat', badge: 'Kesehatan', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
];

const FLOOR_COUNT_OPTIONS = [
  { count: 5, label: '5 Lantai', sub: 'Quick Raid (~3 Menit)', expEst: 100, goldEst: 50 },
  { count: 10, label: '10 Lantai', sub: 'Standard (~7 Menit)', expEst: 200, goldEst: 100 },
  { count: 15, label: '15 Lantai', sub: 'Deep Descent (~12 Menit)', expEst: 320, goldEst: 170 },
  { count: 20, label: '20 Lantai', sub: 'Grand Trial (~18 Menit)', expEst: 450, goldEst: 250 },
];

export const DungeonSetupModal: React.FC<DungeonSetupModalProps> = ({
  isOpen,
  dungeonType,
  onClose,
  onStartDungeon,
  soundEnabled = true,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<DungeonLevelCategory>('N5');
  const [selectedFloorCount, setSelectedFloorCount] = useState<number>(10);
  const [mode, setMode] = useState<'standard' | 'survival'>('standard');

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const meta = DUNGEON_META[dungeonType] || DUNGEON_META.writing;
  const activeFloorOption = FLOOR_COUNT_OPTIONS.find(f => f.count === selectedFloorCount) || FLOOR_COUNT_OPTIONS[1];

  const handleStart = () => {
    playSound('attack', soundEnabled);
    onStartDungeon({
      type: dungeonType,
      levelCategory: selectedCategory,
      floorCount: selectedFloorCount,
      mode,
    });
  };

  return createPortal(
    <motion.div
      key="dungeon-setup-modal-container"
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          playSound('click', soundEnabled);
          onClose();
        }}
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative z-10 panel w-full max-w-xl border border-border-subtle rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] bg-surface-card"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between gap-3 bg-surface-inset">
          <div className="flex items-center gap-3">
            <span className="text-2xl select-none">{meta.iconEmoji}</span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-text-primary font-heading tracking-wide">
                {meta.title}
              </h2>
              <p className="text-xs text-text-secondary">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              onClose();
            }}
            className="p-2 rounded-2xl bg-surface-card hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors border border-border-subtle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Setup Options */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto scrollbar-thin flex-1">
          {/* Section 1: Level / Kategori */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted font-heading flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
                <span>1. Pilih Tingkat atau Kategori:</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-indigo">
                {LEVEL_CATEGORY_OPTIONS.find(c => c.id === selectedCategory)?.badge}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LEVEL_CATEGORY_OPTIONS.map((opt) => {
                const isSelected = selectedCategory === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      setSelectedCategory(opt.id);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-surface-elevated border-indigo shadow-md ring-1 ring-indigo/40'
                        : 'bg-surface-inset border-border-subtle hover:border-border-primary hover:bg-surface-elevated/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold font-heading text-text-primary">
                        {opt.label}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo" />}
                    </div>
                    <span className="text-[10px] text-text-muted line-clamp-1 mt-1 font-body">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Jumlah Soal / Kedalaman Lantai */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-text-muted font-heading flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-gold" />
              <span>2. Kedalaman Lantai Dungeon (Jumlah Soal):</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FLOOR_COUNT_OPTIONS.map((opt) => {
                const isSelected = selectedFloorCount === opt.count;
                return (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      setSelectedFloorCount(opt.count);
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'bg-gold/15 border-gold shadow-md ring-1 ring-gold/40'
                        : 'bg-surface-inset border-border-subtle hover:border-border-primary'
                    }`}
                  >
                    <span className={`block text-sm font-bold font-heading ${isSelected ? 'text-gold' : 'text-text-primary'}`}>
                      {opt.label}
                    </span>
                    <span className="block text-[10px] text-text-muted mt-0.5">
                      {opt.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Mode Tantangan (Normal vs Survival) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-text-muted font-heading flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-gold" />
              <span>3. Mode Eksplorasi:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  setMode('standard');
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  mode === 'standard'
                    ? 'bg-surface-elevated border-indigo shadow-md ring-1 ring-indigo/40'
                    : 'bg-surface-inset border-border-subtle hover:bg-surface-elevated/50'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-surface-card border border-border-subtle flex items-center justify-center shrink-0 text-teal">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-bold font-heading text-text-primary">
                    Mode Santai (Standard)
                  </span>
                  <span className="block text-[11px] text-text-muted font-body mt-0.5">
                    Tanpa batas waktu, fokus menyerap pemahaman dan ketelitian.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  setMode('survival');
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  mode === 'survival'
                    ? 'bg-surface-elevated border-rose-500 shadow-md ring-1 ring-rose-500/40'
                    : 'bg-surface-inset border-border-subtle hover:bg-surface-elevated/50'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-surface-card border border-border-subtle flex items-center justify-center shrink-0 text-rose-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-bold font-heading text-text-primary">
                    Mode Survival (Timer)
                  </span>
                  <span className="block text-[11px] text-text-muted font-body mt-0.5">
                    Waktu terbatas per soal untuk melatih refleks instan.
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Reward Estimation Preview */}
          <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-text-secondary">
              <Trophy className="w-4 h-4 text-gold" />
              <span>Estimasi Hadiah Selesai:</span>
            </div>
            <div className="flex items-center gap-3 font-mono font-bold">
              <span className="text-indigo">+{activeFloorOption.expEst} EXP</span>
              <span className="text-gold">+{activeFloorOption.goldEst} Gold</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle flex items-center justify-between gap-3 bg-surface-inset">
          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl border border-border-subtle bg-surface-card hover:bg-surface-elevated text-xs font-bold text-text-secondary transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleStart}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo hover:bg-indigo/90 text-white font-heading font-bold text-xs shadow-md border border-indigo/30 transition-all hover:scale-[1.02]"
          >
            <Swords className="w-4 h-4 text-amber-300" />
            <span>Mulai Ekspedisi Dungeon</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};
