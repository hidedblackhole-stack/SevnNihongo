import React from 'react';
import { motion } from 'motion/react';
import { Swords, Skull, ChevronLeft, Ghost, DoorOpen, Flame, Clock, Trophy, Sparkles, ShieldAlert, Coins } from 'lucide-react';
import { playSound } from '../../utils/audio';

interface DungeonViewProps {
  onBack: () => void;
  onStartBoss: () => void;
  worldId?: string;
  soundEnabled?: boolean;
}

const LEVEL_DUNGEONS: Record<string, {
  level: string;
  name: string;
  subtitle: string;
  description: string;
  bossName: string;
  duration: string;
  expReward: number;
  goldReward: number;
}> = {
  world_n5: {
    level: 'N5',
    name: 'Dungeon Golem Batu Aksara',
    subtitle: 'Simulasi JLPT N5 — Huruf Kana, Partikel & Kosakata Dasar',
    description: 'Ujian komprehensif tingkat dasar N5. Kalahkan Golem Aksara dengan ketepatan menjawab partikel, hiragana/katakana, dan kosakata dasar.',
    bossName: 'Ancient Stone Golem (N5)',
    duration: '60 Menit',
    expReward: 600,
    goldReward: 350,
  },
  world_n4: {
    level: 'N4',
    name: 'Dungeon Serigala Bayangan',
    subtitle: 'Simulasi JLPT N4 — Bentuk Potensial, Lampau & Pengandaian',
    description: 'Ujian kemampuan bertualang N4. Taklukkan Shadow Wolf dengan kecerdasan memahami perubahan bentuk kata kerja dan percakapan harian.',
    bossName: 'Shadow Wolf of Plains (N4)',
    duration: '80 Menit',
    expReward: 900,
    goldReward: 500,
  },
  world_n3: {
    level: 'N3',
    name: 'Dungeon Naga Hitam (Kuro-Ryuu)',
    subtitle: 'Simulasi JLPT N3 Resmi — Ujian Lengkap 140 Menit',
    description: 'Simulasi JLPT N3 resmi dengan kurikulum Soumatome penuh. Kalahkan Naga Hitam legendaris untuk membuktikan penguasaan menengahmu.',
    bossName: 'Black Dragon of Soumatome (N3)',
    duration: '140 Menit',
    expReward: 1400,
    goldReward: 800,
  },
  world_n2: {
    level: 'N2',
    name: 'Dungeon Naga Kuno Kemahiran',
    subtitle: 'Simulasi JLPT N2 — Wacana Formal, Opini & Teks Panjang',
    description: 'Ujian tingkat kemahiran tinggi N2. Tunjukkan pemahaman nuansa halus tata bahasa formal di hadapan Sang Naga Kuno Kemahiran.',
    bossName: 'Ancient Wyrm of Fluency (N2)',
    duration: '155 Menit',
    expReward: 2000,
    goldReward: 1200,
  },
  world_n1: {
    level: 'N1',
    name: 'Dungeon Kaisar Naga Transenden',
    subtitle: 'Simulasi JLPT N1 — Sastra Klasik, Filosofis & Dewa Bahasa',
    description: 'Puncak tertinggi ujian kemampuan bahasa Jepang. Hadapi Kaisar Naga Abadi untuk meraih gelar tertinggi Mythic Deity of Knowledge.',
    bossName: 'Transcendent Emperor Dragon (N1)',
    duration: '170 Menit',
    expReward: 3000,
    goldReward: 2000,
  }
};

export const DungeonView: React.FC<DungeonViewProps> = ({
  onBack,
  onStartBoss,
  worldId = 'world_n3',
  soundEnabled = true,
}) => {
  const dungeon = LEVEL_DUNGEONS[worldId] || LEVEL_DUNGEONS['world_n3'];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16 animate-fade-in select-none">
      {/* Header / Back Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            playSound('click', soundEnabled);
            onBack();
          }}
          className="p-2.5 rounded-2xl bg-[#EDE1D0] dark:bg-stone-900 border border-[#D9C5AB] dark:border-stone-800 text-[#765F50] dark:text-stone-400 hover:text-[#442D22] dark:hover:text-stone-200 transition-all shadow-sm"
          title="Kembali ke Peta Wilayah"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-400 font-medieval flex items-center gap-2">
            <DoorOpen className="w-4 h-4" />
            <span>Gerbang Dungeon Boss Trial</span>
          </h2>
          <p className="text-xs text-[#765F50] dark:text-stone-400 font-mono">
            Simulasi Ujian Resmi JLPT Tingkat {dungeon.level}
          </p>
        </div>
      </div>

      {/* Hero Banner: Ancient Volcanic Hall */}
      <div 
        className="p-6 sm:p-8 rounded-3xl bg-[#2A0E0B] border-2 border-red-900/60 text-[#FFF7EC] shadow-2xl relative overflow-hidden space-y-3"
        style={{
          boxShadow: '0 12px 36px -8px rgba(220, 38, 38, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
        }}
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Ghost className="w-48 h-48 text-red-400" />
        </div>
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-red-950/90 text-red-300 font-mono font-bold border border-red-600/40 flex items-center gap-1.5 shadow-sm">
              <Flame className="w-3.5 h-3.5 text-red-400 fill-red-400 animate-pulse" />
              <span>LEVEL {dungeon.level} • BOSS ARENA</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#FFF7EC] font-medieval tracking-wide">
            {dungeon.name}
          </h1>
          <p className="text-sm text-stone-300 max-w-2xl leading-relaxed">
            {dungeon.description}
          </p>
        </div>
      </div>

      {/* Two Column Layout: Boss Trial Card & Rewards/Rules Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Active Boss Trial Card */}
        <motion.div
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => {
            playSound('attack', soundEnabled);
            onStartBoss();
          }}
          className="relative p-6 rounded-3xl bg-[#FAF4E9] dark:bg-[#1c1410] border-2 border-red-500/50 dark:border-red-600/50 text-[#442D22] dark:text-[#f4e8c1] flex flex-col justify-between min-h-[280px] overflow-hidden cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(220,38,38,0.2)] transition-all group"
          style={{
            boxShadow: '0 8px 24px -4px rgba(68,45,34,0.12), inset 0 1px 0 rgba(255,255,255,0.6)'
          }}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Skull className="w-32 h-32 text-red-500" />
          </div>

          <div className="space-y-3.5 z-10 relative">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 shadow-md">
                <Skull className="w-6 h-6" />
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-red-500/15 text-red-700 dark:text-red-400 font-mono font-bold border border-red-500/30 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>TERSEDIA</span>
              </span>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold font-medieval text-red-700 dark:text-red-300 group-hover:text-red-600 dark:group-hover:text-red-200 transition-colors">
                {dungeon.bossName}
              </h3>
              <p className="text-xs text-[#765F50] dark:text-stone-400 mt-1 leading-relaxed">
                {dungeon.subtitle}
              </p>
            </div>

            {/* Estimated Duration & Rewards Pills */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs px-2.5 py-1 rounded-lg bg-[#F0E4D3] dark:bg-stone-900/80 border border-[#D9C5AB] dark:border-stone-800 flex items-center gap-1.5 font-mono text-[#765F50] dark:text-stone-300">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>{dungeon.duration}</span>
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-mono font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>+{dungeon.expReward} EXP</span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#E7D8C3] dark:border-stone-800 z-10 relative text-xs">
            <span className="text-xs text-[#765F50] dark:text-stone-400 font-mono">
              Ketuk untuk memasuki arena
            </span>
            <span className="font-bold text-red-700 dark:text-red-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-medieval text-sm">
              Mulai Ujian <Swords className="w-4 h-4 ml-1" />
            </span>
          </div>
        </motion.div>

        {/* 2. Secondary Info Card: Rewards & Rules */}
        <div 
          className="p-6 rounded-3xl bg-[#FAF4E9] dark:bg-[#1c1410] border border-[#D9C5AB] dark:border-[#3d2b22] text-[#442D22] dark:text-[#f4e8c1] flex flex-col justify-between min-h-[280px] shadow-lg space-y-4"
          style={{
            boxShadow: '0 8px 24px -4px rgba(68,45,34,0.12), inset 0 1px 0 rgba(255,255,255,0.6)'
          }}
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#B88912] dark:text-amber-400 shadow-sm">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold font-medieval text-[#442D22] dark:text-stone-100">
              Mekanisme Pertarungan & Hadiah
            </h3>
            <ul className="text-xs text-[#765F50] dark:text-stone-400 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span><strong>Jawaban Benar:</strong> Memberikan damage besar secara langsung ke HP Boss.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <span><strong>Jawaban Salah:</strong> Karakter pemain terkena serangan balik yang mengurangi HP.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span><strong>Kemenangan Penuh:</strong> Memberikan hadiah masif <strong>+{dungeon.expReward} EXP</strong> dan <strong>+{dungeon.goldReward} Koin Emas</strong> untuk Leaderboard.</span>
              </li>
            </ul>
          </div>

          <div className="text-[11px] text-[#9A8573] dark:text-stone-500 font-mono pt-3 border-t border-[#E7D8C3] dark:border-stone-800 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Skor tersinkronisasi otomatis dengan profil RPG & Cloud Leaderboard.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
