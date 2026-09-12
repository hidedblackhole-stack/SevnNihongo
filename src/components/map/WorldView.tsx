import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  Layers, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft, 
  Play, 
  BookOpen, 
  PenTool, 
  HelpCircle,
  Bookmark
} from 'lucide-react';
import { StageClearData, UserDeck } from '../../types/rpg';
import { Stage, WorldInfo } from '../../types/content';
import { WORLDS_LIST, getMapsForWorld, getStagesForMap } from '../../data/maps';
import { playSound } from '../../utils/audio';

export type WorldNavView = 'world_hub' | 'level_hub' | 'maps' | 'dungeon';

interface WorldViewProps {
  currentMapId: string;
  currentWorldId: string;
  stageProgress: Record<string, StageClearData>;
  playerLevel: number;
  onSelectStage: (stage: Stage) => void;
  onSelectMap?: (mapId: string) => void;
  onSelectWorld?: (worldId: string) => void;
  onStartBoss?: () => void;
  soundEnabled?: boolean;
  navView?: WorldNavView;
  onNavViewChange?: (view: WorldNavView, worldId?: string) => void;
  userDecks?: UserDeck[];
  onUpdateDecks?: (decks: UserDeck[]) => void;
  onNavigateTab?: (tab: 'home' | 'maps' | 'daily' | 'weekly' | 'leaderboard' | 'library' | 'deck' | 'settings') => void;
}

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  KANA: { label: 'KANA · Pemula', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  N5: { label: 'JLPT N5 · Dasar', color: 'text-teal border-teal/30 bg-teal/10' },
  N4: { label: 'JLPT N4 · Pra-Menengah', color: 'text-matcha border-matcha/30 bg-matcha/10' },
  N3: { label: 'JLPT N3 · Menengah', color: 'text-gold border-gold/30 bg-gold/10' },
  N2: { label: 'JLPT N2 · Mahir', color: 'text-indigo border-indigo/30 bg-indigo/10' },
  N1: { label: 'JLPT N1 · Ahli', color: 'text-crimson border-crimson/30 bg-crimson/10' },
};

export const WorldView: React.FC<WorldViewProps> = ({
  stageProgress = {},
  onSelectStage,
  onSelectWorld,
  soundEnabled = true,
  onNavigateTab,
}) => {
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);

  // Selected world object
  const selectedWorld = useMemo(() => {
    if (!selectedWorldId) return null;
    return WORLDS_LIST.find(w => w.id === selectedWorldId) || null;
  }, [selectedWorldId]);

  // Stages of the selected world
  const worldStages = useMemo(() => {
    if (!selectedWorldId) return [];
    const maps = getMapsForWorld(selectedWorldId);
    return maps.flatMap(m => getStagesForMap(m.id));
  }, [selectedWorldId]);

  const handleOpenWorld = (worldId: string) => {
    playSound('click', soundEnabled);
    setSelectedWorldId(worldId);
    if (onSelectWorld) onSelectWorld(worldId);
  };

  const handleBack = () => {
    playSound('click', soundEnabled);
    setSelectedWorldId(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 sm:pb-12 animate-fade-in px-2 sm:px-0">
      
      {/* 1. HEADER UTAMA: WORLD */}
      <div className="panel p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-md border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gold/15 text-gold border border-gold/30 flex items-center justify-center shrink-0 shadow-sm">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide">
              Petualangan World
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary font-body">
              Pilih jalur petualangan dan taklukkan stage pembelajaran terstruktur dari Kana hingga N1.
            </p>
          </div>
        </div>

        {onNavigateTab && (
          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              onNavigateTab('deck');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold font-heading bg-surface-inset hover:bg-surface-elevated text-text-secondary hover:text-indigo border border-border-subtle hover:border-indigo/30 transition-all self-stretch sm:self-auto justify-center shadow-xs"
            title="Buka Buku Saku untuk latihan kartu hafalan dan flashcards"
          >
            <Bookmark className="w-4 h-4 text-indigo" />
            <span>Latihan Deck (Buku Saku)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
        <>
          {selectedWorld ? (
            /* VIEW DETAIL: DAFTAR MODUL DI DALAM WORLD TERTENTU */
            <div className="space-y-4">
              {/* Back Button & Top Level Badge */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn btn-pill text-xs gap-2"
                >
                  <ArrowLeft className="w-4 h-4 text-text-primary" />
                  <span>Kembali ke Pilihan World</span>
                </button>
                <span className={`text-xs font-mono font-bold px-3 py-1 rounded-xl border ${LEVEL_CONFIG[selectedWorld.jlptLevel]?.color || 'text-gold'}`}>
                  {LEVEL_CONFIG[selectedWorld.jlptLevel]?.label || selectedWorld.jlptLevel}
                </span>
              </div>

              {/* World Header Info */}
              <div className="panel p-5 rounded-2xl bg-surface-card border border-border-subtle shadow-md space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h2 className="text-xl font-bold text-text-primary font-heading">
                      {selectedWorld.name.split('(')[0].trim()}
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-text-secondary">
                    {worldStages.length} Modul Pembelajaran
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  {selectedWorld.description}
                </p>
              </div>

              {/* List of Modules */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary font-heading px-1">
                  Daftar Modul Belajar ({worldStages.length})
                </h3>

                <div className="grid grid-cols-1 gap-2.5">
                  {worldStages.map((stage, idx) => {
                    const isCleared = stageProgress[stage.id]?.cleared;
                    const kotobaCount = stage.kotobaIds?.length || (stage as any).kotoba?.length || 0;
                    const kanjiCount = stage.kanjiIds?.length || (stage as any).kanji?.length || 0;
                    const bunpouCount = stage.bunpouIds?.length || (stage as any).bunpou?.length || 0;

                    return (
                      <motion.div
                        key={stage.id}
                        whileHover={{ scale: 1.005 }}
                        whileTap={{ scale: 0.995 }}
                        onClick={() => {
                          playSound('click', soundEnabled);
                          onSelectStage(stage);
                        }}
                        className={`panel p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCleared
                            ? 'bg-surface-card/60 border-state-success/40'
                            : 'bg-surface-card border-border-subtle hover:border-gold/50 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            isCleared
                              ? 'bg-state-success/15 text-state-success border border-state-success/30'
                              : 'bg-surface-inset text-gold border border-border-subtle'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] text-text-secondary font-jp truncate">
                              {stage.title_jp}
                            </div>
                            <h4 className="text-sm font-bold text-text-primary font-heading truncate">
                              {stage.title_en}
                            </h4>
                            
                            {/* Content Badges */}
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10px] font-mono">
                              {kotobaCount > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-indigo/10 text-indigo border border-indigo/20">
                                  🃏 Flashcard ({kotobaCount})
                                </span>
                              )}
                              {kanjiCount > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-wine-accent/10 text-wine-accent border border-wine-accent/20">
                                  ✍️ Menulis ({kanjiCount})
                                </span>
                              )}
                              {bunpouCount > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-gold/10 text-gold border border-gold/20">
                                  📖 Tata Bahasa ({bunpouCount})
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-md bg-state-success/10 text-state-success border border-state-success/20">
                                🎯 Kuis
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-subtle">
                          {isCleared && (
                            <span className="text-xs text-state-success font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Selesai
                            </span>
                          )}
                          <button
                            type="button"
                            className="btn btn-primary py-1.5 px-3.5 text-xs gap-1.5 ml-auto sm:ml-0"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Mulai Belajar</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* VIEW LIST: KARTU-KARTU WORLD */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {WORLDS_LIST.map((world) => {
                  const maps = getMapsForWorld(world.id);
                  const stages = maps.flatMap(m => getStagesForMap(m.id));
                  const totalStages = stages.length;
                  const clearedStages = stages.filter(s => stageProgress[s.id]?.cleared).length;
                  const progressPct = totalStages > 0 ? Math.round((clearedStages / totalStages) * 100) : 0;

                  // Components inside this world
                  const totalKotoba = stages.reduce((acc, s) => acc + (s.kotobaIds?.length || (s as any).kotoba?.length || 0), 0);
                  const totalKanji = stages.reduce((acc, s) => acc + (s.kanjiIds?.length || (s as any).kanji?.length || 0), 0);
                  const totalBunpou = stages.reduce((acc, s) => acc + (s.bunpouIds?.length || (s as any).bunpou?.length || 0), 0);

                  const levelInfo = LEVEL_CONFIG[world.jlptLevel] || {
                    label: world.jlptLevel,
                    color: 'text-gold border-gold/30 bg-gold/10'
                  };

                  return (
                    <motion.div
                      key={world.id}
                      whileHover={{ scale: 1.01, y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleOpenWorld(world.id)}
                      className="panel panel-stitched p-5 rounded-3xl transition-all cursor-pointer shadow-md flex flex-col justify-between min-h-[240px] group border border-border-subtle hover:border-gold/50 relative overflow-hidden"
                    >
                      {/* Top: Level & Total Stages */}
                      <div className="space-y-2 relative z-10">
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl border ${levelInfo.color}`}>
                            {levelInfo.label}
                          </span>
                          <span className="text-xs font-mono text-text-secondary">
                            {totalStages} Modul
                          </span>
                        </div>

                        {/* Judul World */}
                        <div>
                          <h3 className="text-lg font-bold text-text-primary font-heading leading-snug group-hover:text-gold transition-colors">
                            {world.name.split('(')[0].trim()}
                          </h3>
                        </div>

                        {/* Deskripsi */}
                        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                          {world.subtitle || world.description}
                        </p>

                        {/* Isinya Apa Aja: Flashcard, Menulis, Tata Bahasa, Kuis */}
                        <div className="pt-2">
                          <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1.5 font-bold">
                            Materi & Aktivitas:
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo/10 text-indigo border border-indigo/20 flex items-center gap-1">
                              🃏 Flashcard ({totalKotoba})
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-wine-accent/10 text-wine-accent border border-wine-accent/20 flex items-center gap-1">
                              ✍️ Menulis ({totalKanji})
                            </span>
                            {totalBunpou > 0 && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-gold/10 text-gold border border-gold/20 flex items-center gap-1">
                                📖 Tata Bahasa ({totalBunpou})
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-state-success/10 text-state-success border border-state-success/20 flex items-center gap-1">
                              🎯 Kuis Drill
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom: Progres & Aksi */}
                      <div className="pt-3 border-t border-border-subtle space-y-2 relative z-10">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-text-secondary">Progres:</span>
                            <span className="font-bold text-text-primary">{clearedStages} / {totalStages} ({progressPct}%)</span>
                          </div>
                          <div className="rpg-progress-track">
                            <div
                              className="rpg-progress-fill"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end text-xs font-bold text-text-primary group-hover:text-gold transition-colors pt-1">
                          <span className="flex items-center gap-1">
                            Masuk World <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Banner Menuju Buku Saku */}
              {onNavigateTab && (
                <div className="panel p-5 rounded-3xl bg-surface-card border border-border-subtle shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-indigo font-bold text-sm font-heading">
                      <Bookmark className="w-4 h-4" />
                      <span>Latihan Mandiri & Flashcard di Buku Saku</span>
                    </div>
                    <p className="text-xs text-text-secondary max-w-xl leading-relaxed">
                      Ingin drill hafalan kilat, review materi yang kamu bookmark, atau membuat deck kustom per level JLPT? Kelola dan latih deck-mu di Buku Saku.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      onNavigateTab('deck');
                    }}
                    className="btn btn-secondary text-xs gap-2 py-2.5 px-4 shrink-0 shadow-xs"
                  >
                    <span>Buka Buku Saku</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
    </div>
  );
};
