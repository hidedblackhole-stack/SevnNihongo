import React from 'react';
import { motion } from 'motion/react';
import {
  PenTool,
  Layers,
  BookOpen,
  Zap,
  Swords,
  Sparkles,
  ChevronRight,
  Flame,
  Trophy,
  Compass
} from 'lucide-react';
import { DungeonType } from '../../utils/dungeonGenerator';
import { playSound } from '../../utils/audio';

interface DungeonPortalHubProps {
  onSelectDungeon: (type: DungeonType) => void;
  soundEnabled?: boolean;
}

interface DungeonGateInfo {
  type: DungeonType;
  title: string;
  jpTitle: string;
  badge: string;
  badgeColor: string;
  accentColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  tags: string[];
  expPerQuestion: number;
  goldPerQuestion: number;
}

const DUNGEON_GATES: DungeonGateInfo[] = [
  {
    type: 'writing',
    title: 'Dungeon Menulis Aksara',
    jpTitle: '書道の試練 (Kanji & Kotoba Writing)',
    badge: 'Menulis',
    badgeColor: 'bg-wine-accent/15 text-wine-accent border-wine-accent/30',
    accentColor: 'hover:border-wine-accent/50',
    icon: PenTool,
    description: 'Latih ketelitian goresan kanji dan kosakata urutan demi urutan langsung di layar. Latih memori motorik tanganmu.',
    tags: ['Kanji', 'Kosakata', 'Urutan Goresan', 'Onyomi & Kunyomi'],
    expPerQuestion: 25,
    goldPerQuestion: 12,
  },
  {
    type: 'flashcard',
    title: 'Dungeon Gerbang Ingatan',
    jpTitle: '記憶の回廊 (Speed Flashcard Drill)',
    badge: 'Flashcard Kilat',
    badgeColor: 'bg-teal/15 text-teal border-teal/30',
    accentColor: 'hover:border-teal/50',
    icon: Layers,
    description: 'Hafalan kilat bolak-balik arti, bacaan furigana, dan suara pengucapan native speaker. Cocok untuk mengulang banyak materi.',
    tags: ['Kosakata', 'Kanji', 'Audio Pengucapan', 'Bolak-Balik'],
    expPerQuestion: 20,
    goldPerQuestion: 10,
  },
  {
    type: 'sakubun',
    title: 'Dungeon Kuil Tata Bahasa',
    jpTitle: '作文の神殿 (Sakubun Sentence Builder)',
    badge: 'Susun Pola Kalimat',
    badgeColor: 'bg-gold/15 text-gold border-gold/30',
    accentColor: 'hover:border-gold/50',
    icon: BookOpen,
    description: 'Susun potongan kata dan partikel menjadi kalimat utuh dengan tata bahasa Jepang yang tepat.',
    tags: ['Pola Kalimat', 'Partikel', 'Sintaksis', 'Tata Bahasa'],
    expPerQuestion: 30,
    goldPerQuestion: 15,
  },
  {
    type: 'conjugation',
    title: 'Dungeon Altar Konjugasi',
    jpTitle: '活用の祭壇 (Conjugation Drill)',
    badge: 'Ubah Bentuk Kata',
    badgeColor: 'bg-indigo/15 text-indigo border-indigo/30',
    accentColor: 'hover:border-indigo/50',
    icon: Zap,
    description: 'Uji kecepatan refleks mengubah kata kerja & kata sifat ke bentuk Te, Nai, Ta, Masu, Potensial, hingga Pasif/Kausatif.',
    tags: ['Godan/Ichidan', 'Bentuk Te/Nai', 'Bentuk Potensial', 'Kata Sifat'],
    expPerQuestion: 25,
    goldPerQuestion: 12,
  },
  {
    type: 'quiz',
    title: 'Dungeon Arena Kuis Cepat',
    jpTitle: '闘技場の戦い (Rapid Battle Quiz)',
    badge: 'Kuis Pilihan Ganda',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    accentColor: 'hover:border-emerald-500/50',
    icon: Swords,
    description: 'Kuis pilihan ganda acak dari bank soal berstandar resmi JLPT untuk menguji pemahaman komprehensif secara cepat.',
    tags: ['Huruf & Kosakata', 'Tata Bahasa', 'Penjelasan Lengkap', 'Pilihan Ganda'],
    expPerQuestion: 20,
    goldPerQuestion: 10,
  },
  {
    type: 'extreme',
    title: 'Dungeon Gerbang Kanji Extreme',
    jpTitle: '極・漢字の百連試練 (100 Extreme Stages)',
    badge: '100 Stage (3.000 Soal)',
    badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    accentColor: 'hover:border-rose-500/50',
    icon: Flame,
    description: 'Uji ketahanan mental dan kecepatan membaca 3.000 soal tebak Onyomi & Kunyomi bergradasi 100 stage.',
    tags: ['3.000 Soal', '100 Stage', 'Onyomi & Kunyomi', 'Refleks Cepat'],
    expPerQuestion: 25,
    goldPerQuestion: 15,
  },
];

export const DungeonPortalHub: React.FC<DungeonPortalHubProps> = ({
  onSelectDungeon,
  soundEnabled = true,
}) => {
  return (
    <div className="space-y-6">
      {/* Hero Header Banner */}
      <div className="panel p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-md bg-surface-card relative overflow-hidden space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-crimson/15 text-crimson border border-crimson/30 flex items-center justify-center shrink-0 shadow-sm">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-text-primary font-heading tracking-wide">
                  Gerbang Dungeon Latihan Bebas
                </h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-crimson/20 text-crimson border border-crimson/30 uppercase tracking-wider">
                  Grinding & Drill
                </span>
              </div>
              <p className="text-xs sm:text-sm text-text-secondary font-medium">
                Pilih dungeon yang ingin kamu taklukkan, tentukan level atau profesi (Kaigo, PM/Medis), dan mulai latihan prosedural acak.
              </p>
            </div>
          </div>
        </div>

        {/* Highlight Feature Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border-subtle text-xs text-text-secondary">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-gold shrink-0" />
            <span>Soal Dinamis & Acak</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Trophy className="w-3.5 h-3.5 text-gold shrink-0" />
            <span>Panen EXP & Gold</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Compass className="w-3.5 h-3.5 text-indigo shrink-0" />
            <span>Filter Kaigo & PM Medis</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Atur Jumlah Lantai (5〜20)</span>
          </div>
        </div>
      </div>

      {/* Grid of Dungeon Gates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DUNGEON_GATES.map((gate) => {
          const Icon = gate.icon;

          return (
            <motion.div
              key={gate.type}
              whileHover={{ scale: 1.015, y: -2 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => {
                playSound('click', soundEnabled);
                onSelectDungeon(gate.type);
              }}
              className={`panel p-5 rounded-3xl border border-border-subtle ${gate.accentColor} bg-surface-card hover:bg-surface-elevated transition-all cursor-pointer shadow-sm hover:shadow-xl flex flex-col justify-between space-y-4 group`}
            >
              {/* Top Row: Icon + Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center text-text-primary group-hover:scale-110 group-hover:text-gold transition-all shadow-inner">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-text-muted block">
                      {gate.jpTitle}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-text-primary font-heading group-hover:text-gold transition-colors">
                      {gate.title}
                    </h3>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-xl text-[11px] font-heading font-bold border shrink-0 ${gate.badgeColor}`}>
                  {gate.badge}
                </span>
              </div>

              {/* Middle: Description */}
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-body">
                {gate.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {gate.tags.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="px-2 py-0.5 rounded-lg bg-surface-inset border border-border-subtle text-[10px] font-mono font-medium text-text-muted"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Bottom: Reward Preview & CTA */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-gold flex items-center gap-1">
                  <span>+{gate.expPerQuestion} EXP</span>
                  <span className="text-text-muted">·</span>
                  <span>+{gate.goldPerQuestion} Gold / soal</span>
                </span>

                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-bold text-indigo group-hover:text-indigo-light group-hover:translate-x-1 transition-all font-heading"
                >
                  <span>Masuk Gerbang</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
