import React, { useState, useMemo, useEffect } from 'react';
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
  Bookmark,
  Sparkles,
  Plus,
  Star,
  Sliders,
  Swords
} from 'lucide-react';
import { StageClearData, UserDeck } from '../../types/rpg';
import { Stage, WorldInfo, ItemMasteryRecord } from '../../types/content';
import { WORLDS_LIST, getMapsForWorld, getStagesForMap } from '../../data/maps';
import { playSound } from '../../utils/audio';
import { CustomCurriculum, CustomCurriculumProgress, CurriculumConfig } from '../../types/curriculum';
import {
  loadAllCustomCurriculums,
  saveCustomCurriculum,
  loadAllCurriculumProgress,
  saveCurriculumProgress,
  generateCurriculum,
  initializeCurriculumProgress,
} from '../../utils/curriculumEngine';
import { ensureUserDecks } from '../../utils/decks';
import { SelectDeckForWorldModal } from '../curriculum/SelectDeckForWorldModal';
import { CurriculumConfigModal } from '../curriculum/CurriculumConfigModal';
import { CustomWorldView } from '../curriculum/CustomWorldView';
import { DungeonType, DungeonPayload, DungeonConfig, generateDungeonSession } from '../../utils/dungeonGenerator';
import { DungeonPortalHub } from '../dungeon/DungeonPortalHub';
import { DungeonSetupModal } from '../dungeon/DungeonSetupModal';
import { DungeonSessionRunner } from '../dungeon/DungeonSessionRunner';

export type WorldNavView = 'world_hub' | 'level_hub' | 'maps' | 'dungeon';

interface WorldViewProps {
  currentMapId: string;
  currentWorldId: string;
  resetSignal?: number;
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
  onRewardPlayer?: (exp: number, gold: number) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => void;
  playerMp?: number;
  playerMaxMp?: number;
  playerInt?: number;
  playerStr?: number;
  playerHp?: number;
  playerMaxHp?: number;
  onUseMp?: (amount: number) => boolean;
  onHpDamage?: (amount: number) => void;
  onGameOver?: () => void;
  onStartRemediationRecall?: (itemIds: string[]) => void;
  itemMastery?: Record<string, ItemMasteryRecord>;
  furiganaEnabled?: boolean;
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
  currentWorldId,
  resetSignal,
  stageProgress = {},
  onSelectStage,
  onSelectWorld,
  soundEnabled = true,
  onNavigateTab,
  userDecks,
  onRewardPlayer,
  onCompleteStudyItem,
  playerMp = 100,
  playerMaxMp = 100,
  playerInt = 10,
  playerStr = 10,
  playerHp = 100,
  playerMaxHp = 100,
  onUseMp = () => true,
  onHpDamage,
  onGameOver,
  onStartRemediationRecall,
  itemMastery = {},
  furiganaEnabled = true,
  navView,
  onNavViewChange,
}) => {
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(() => currentWorldId || null);

  useEffect(() => {
    if (currentWorldId !== undefined) {
      setSelectedWorldId(currentWorldId || null);
      if (!currentWorldId) {
        setActiveCustomWorldDeckId(null);
      }
    }
  }, [currentWorldId]);

  // Reset to initial World Selection screen when navbar triggers reset
  const [worldMode, setWorldMode] = useState<'training' | 'dungeon'>(() => {
    return navView === 'dungeon' ? 'dungeon' : 'training';
  });
  const [setupDungeonType, setSetupDungeonType] = useState<DungeonType | null>(null);
  const [activeDungeonPayload, setActiveDungeonPayload] = useState<DungeonPayload | null>(null);

  useEffect(() => {
    if (navView === 'dungeon') {
      setWorldMode('dungeon');
    } else if (navView === 'world_hub') {
      setWorldMode('training');
    }
  }, [navView]);

  useEffect(() => {
    if (resetSignal !== undefined && resetSignal > 0) {
      setSelectedWorldId(null);
      setActiveCustomWorldDeckId(null);
      setDeckForCurriculumConfig(null);
      setIsSelectDeckModalOpen(false);
      setWorldMode('training');
      setSetupDungeonType(null);
      setActiveDungeonPayload(null);
    }
  }, [resetSignal]);

  const handleSwitchMode = (mode: 'training' | 'dungeon') => {
    playSound('click', soundEnabled);
    setWorldMode(mode);
    if (onNavViewChange) {
      onNavViewChange(mode === 'dungeon' ? 'dungeon' : 'world_hub');
    }
  };

  // Custom World & Curriculum States
  const [isSelectDeckModalOpen, setIsSelectDeckModalOpen] = useState(false);
  const [deckForCurriculumConfig, setDeckForCurriculumConfig] = useState<UserDeck | null>(null);
  const [activeCustomWorldDeckId, setActiveCustomWorldDeckId] = useState<string | null>(null);
  const [customCurriculums, setCustomCurriculums] = useState<Record<string, CustomCurriculum>>(() => loadAllCustomCurriculums());
  const [curriculumProgressMap, setCurriculumProgressMap] = useState<Record<string, CustomCurriculumProgress>>(() => loadAllCurriculumProgress());

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
    if (onSelectWorld) onSelectWorld('');
  };

  const handleOpenCreateCustomWorld = () => {
    playSound('click', soundEnabled);
    setIsSelectDeckModalOpen(true);
  };

  const handleSaveCurriculum = (config: CurriculumConfig) => {
    if (!deckForCurriculumConfig) return;
    const generated = generateCurriculum(deckForCurriculumConfig, config);
    saveCustomCurriculum(generated);

    const initialProg = curriculumProgressMap[deckForCurriculumConfig.id] || initializeCurriculumProgress(generated);
    saveCurriculumProgress(initialProg);

    setCustomCurriculums(loadAllCustomCurriculums());
    setCurriculumProgressMap(loadAllCurriculumProgress());

    setDeckForCurriculumConfig(null);
    setActiveCustomWorldDeckId(deckForCurriculumConfig.id);
  };

  // IF A CUSTOM WORLD IS CURRENTLY OPENED FOR PLAYING:
  if (activeCustomWorldDeckId && customCurriculums[activeCustomWorldDeckId]) {
    const currentCurriculum = customCurriculums[activeCustomWorldDeckId];
    const currentProg = curriculumProgressMap[activeCustomWorldDeckId] || initializeCurriculumProgress(currentCurriculum);

    return (
      <CustomWorldView
        curriculum={currentCurriculum}
        progress={currentProg}
        onUpdateProgress={(updated) => {
          setCurriculumProgressMap(prev => ({ ...prev, [activeCustomWorldDeckId]: updated }));
          saveCurriculumProgress(updated);
        }}
        onRewardPlayer={onRewardPlayer}
        onCompleteStudyItem={onCompleteStudyItem}
        playerMp={playerMp}
        playerMaxMp={playerMaxMp}
        playerInt={playerInt}
        playerStr={playerStr}
        playerHp={playerHp}
        playerMaxHp={playerMaxHp}
        onUseMp={onUseMp}
        onHpDamage={onHpDamage}
        onGameOver={onGameOver}
        onStartRemediationRecall={onStartRemediationRecall}
        itemMastery={itemMastery}
        furiganaEnabled={furiganaEnabled}
        onReconfigure={() => {
          const deck = (userDecks || []).find(d => d.id === activeCustomWorldDeckId);
          if (deck) {
            setDeckForCurriculumConfig(deck);
          }
        }}
        onBack={() => setActiveCustomWorldDeckId(null)}
        soundEnabled={soundEnabled}
      />
    );
  }

  const customWorldList = Object.values(customCurriculums);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 sm:pb-12 animate-fade-in px-2 sm:px-0">
      
      {/* 1. HEADER UTAMA: WORLD */}
      <div className="panel p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-md border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-2xl ${worldMode === 'dungeon' ? 'bg-crimson/15 text-crimson border-crimson/30' : 'bg-gold/15 text-gold border-gold/30'} border flex items-center justify-center shrink-0 shadow-sm`}>
            {worldMode === 'dungeon' ? <Swords className="w-6 h-6" /> : <Compass className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide">
              {worldMode === 'dungeon' ? 'Petualangan Dungeon' : 'Petualangan World'}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary font-body">
              {worldMode === 'dungeon'
                ? 'Latihan bebas: menulis aksara, flashcard kilat, susun pola kalimat, ubah bentuk kata, dan kuis cepat.'
                : 'Pilih jalur petualangan dan taklukkan stage pembelajaran terstruktur dari Kana hingga N1.'}
            </p>
          </div>
        </div>

        {/* TOMBOL: BUAT KUSTOM WORLD */}
        {worldMode === 'training' && (
          <button
            type="button"
            onClick={handleOpenCreateCustomWorld}
            className="btn-skeuo-indigo self-stretch sm:self-auto justify-center text-xs py-2.5 px-4 shadow-md active:scale-95 transition-all"
            title="Buat Kustom World baru dari materi Buku Saku"
          >
            <Sparkles className="w-4 h-4 text-gold shrink-0" />
            <span className="whitespace-nowrap font-bold">Buat Kustom World</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />
          </button>
        )}
      </div>

      {/* 2. MODE SWITCHER BAR: TRAINING VS DUNGEON */}
      <div className="panel p-1.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-center gap-2 shadow-inner">
        <button
          type="button"
          onClick={() => handleSwitchMode('training')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all whitespace-nowrap ${
            worldMode === 'training'
              ? 'bg-surface-card text-text-primary shadow-sm border border-border-subtle'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Compass className={`w-4 h-4 shrink-0 ${worldMode === 'training' ? 'text-gold' : ''}`} />
          <span>
            <span className="inline sm:hidden">Training</span>
            <span className="hidden sm:inline">Mode Training (Kurikulum)</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchMode('dungeon')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all whitespace-nowrap ${
            worldMode === 'dungeon'
              ? 'bg-surface-card text-crimson shadow-sm border border-crimson/30'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Swords className={`w-4 h-4 shrink-0 ${worldMode === 'dungeon' ? 'text-crimson' : ''}`} />
          <span>
            <span className="inline sm:hidden">Dungeon</span>
            <span className="hidden sm:inline">Mode Dungeon (Latihan Bebas)</span>
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-crimson/20 text-crimson font-black uppercase tracking-wider shrink-0">
            Baru
          </span>
        </button>
      </div>

      {worldMode === 'dungeon' ? (
        /* VIEW MODE DUNGEON: PORTAL HUB */
        <DungeonPortalHub
          onSelectDungeon={(type) => {
            setSetupDungeonType(type);
          }}
          soundEnabled={soundEnabled}
        />
      ) : (

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
          <div className="space-y-6">

            {/* SEKSI: WORLD KUSTOM PETUALANG (JIKA SUDAH PERNAH DIBUAT) */}
            {customWorldList.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary font-heading flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>World Kustom Petualang ({customWorldList.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleOpenCreateCustomWorld}
                    className="text-xs text-indigo hover:text-indigo/80 font-bold flex items-center gap-1 font-heading"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Buat World Baru</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customWorldList.map((curriculum) => {
                    const prog = curriculumProgressMap[curriculum.deckId];
                    const totalStages = curriculum.stages.length;
                    const clearedCount = Object.values(prog?.stages || {}).filter(s => s.status === 'completed').length;
                    const pct = Math.round((clearedCount / Math.max(1, totalStages)) * 100);
                    const totalStars = Object.values(prog?.stages || {}).reduce((acc, s) => acc + (s.stars || 0), 0);

                    return (
                      <motion.div
                        key={curriculum.id}
                        whileHover={{ scale: 1.01, y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          playSound('click', soundEnabled);
                          setActiveCustomWorldDeckId(curriculum.deckId);
                        }}
                        className="panel panel-stitched p-5 rounded-3xl transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between min-h-[220px] group border border-border-subtle hover:border-indigo/40 bg-surface-card hover:bg-surface-elevated relative overflow-hidden"
                      >
                        <div className="space-y-2 relative z-10">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl border bg-indigo/15 text-indigo border-indigo/30 uppercase">
                              Kustom World
                            </span>
                            <div className="flex items-center gap-2 text-xs font-mono">
                              <span className="text-gold flex items-center gap-1 font-bold">
                                <Star className="w-3.5 h-3.5 fill-gold" />
                                <span>{totalStars}</span>
                              </span>
                              <span className="text-text-secondary">{totalStages} Stage</span>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-bold text-text-primary font-heading leading-snug group-hover:text-indigo transition-colors">
                              {curriculum.deckTitle}
                            </h3>
                          </div>

                          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                            Petualangan kustom beranggotakan {totalStages} stage materi belajar Kanji, Kotoba, dan Pola Kalimat.
                          </p>
                        </div>

                        <div className="pt-3 border-t border-border-subtle space-y-2 relative z-10">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-mono">
                              <span className="text-text-secondary">Progres:</span>
                              <span className="font-bold text-text-primary">{clearedCount} / {totalStages} ({pct}%)</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-surface-inset border border-border-subtle overflow-hidden">
                              <div
                                className="h-full bg-indigo rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end text-xs font-bold text-indigo group-hover:text-indigo/80 transition-colors pt-1">
                            <span className="flex items-center gap-1">
                              Masuk World <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SEKSI: JALUR PETUALANGAN UTAMA (KANA - N1) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary font-heading px-1">
                Jalur Petualangan Standar (Kana - N1)
              </h3>

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
            </div>

            {/* Banner Menuju Buku Saku */}
            {onNavigateTab && (
              <div className="panel p-5 rounded-3xl bg-surface-card border border-border-subtle shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-indigo font-bold text-sm font-heading">
                    <Bookmark className="w-4 h-4" />
                    <span>Buat Deck di Buku Saku untuk Kustom World</span>
                  </div>
                  <p className="text-xs text-text-secondary max-w-xl leading-relaxed">
                    Kelola koleksi kartu hafalan dan materi bookmark di Buku Saku. Gunakan deck tersebut untuk merancang stage petualangan Kustom World sendiri!
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
      )}

      {/* MODAL 1: PILIH DECK DARI BUKU SAKU */}
      <SelectDeckForWorldModal
        isOpen={isSelectDeckModalOpen}
        onClose={() => setIsSelectDeckModalOpen(false)}
        decks={ensureUserDecks(userDecks)}
        customCurriculums={customCurriculums}
        onSelectDeck={(deck) => {
          setIsSelectDeckModalOpen(false);
          setDeckForCurriculumConfig(deck);
        }}
        onGoToBukuSaku={() => {
          if (onNavigateTab) onNavigateTab('deck');
        }}
        soundEnabled={soundEnabled}
      />

      {/* MODAL 2: KUSTOMISASI STAGE (CURRICULUM CONFIG MODAL) */}
      {deckForCurriculumConfig && (
        <CurriculumConfigModal
          deck={deckForCurriculumConfig}
          existingConfig={customCurriculums[deckForCurriculumConfig.id]?.config}
          onSave={handleSaveCurriculum}
          onClose={() => setDeckForCurriculumConfig(null)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* MODAL 3: DUNGEON SETUP MODAL */}
      {setupDungeonType && (
        <DungeonSetupModal
          isOpen={true}
          dungeonType={setupDungeonType}
          userDecks={userDecks}
          onNavigateTab={onNavigateTab}
          onClose={() => setSetupDungeonType(null)}
          onStartDungeon={(cfg) => {
            try {
              const payload = generateDungeonSession(cfg, userDecks);
              setSetupDungeonType(null);
              setActiveDungeonPayload(payload);
            } catch (err) {
              console.error('Failed to start dungeon session:', err);
            }
          }}
          soundEnabled={soundEnabled}
        />
      )}

      {/* MODAL 4: DUNGEON SESSION RUNNER */}
      {activeDungeonPayload && (
        <DungeonSessionRunner
          payload={activeDungeonPayload}
          onClose={() => setActiveDungeonPayload(null)}
          onRestart={(cfg) => {
            const payload = generateDungeonSession(cfg, userDecks);
            setActiveDungeonPayload(payload);
          }}
          onRewardPlayer={onRewardPlayer}
          onCompleteStudyItem={onCompleteStudyItem}
          soundEnabled={soundEnabled}
        />
      )}
    </div>
  );
};
