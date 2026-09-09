import React from 'react';
import { motion } from 'motion/react';
import { 
  ChevronRight, 
  Lock, 
  CheckCircle2, 
  Map as MapIcon, 
  Skull, 
  ArrowLeft,
  Compass,
  Swords,
  DoorOpen,
  Sparkles
} from 'lucide-react';
import { StageClearData } from '../../types/rpg';
import { Stage } from '../../types/content';
import { WORLDS_LIST, getMapsForWorld, WORLD_STAGES_MAP } from '../../data/maps';
import { playSound } from '../../utils/audio';
import { MapsView } from './MapsView';
import { DungeonView } from './DungeonView';
import { WorldJourneyCanvas } from './WorldJourneyCanvas';

export type WorldNavView = 'world_hub' | 'level_hub' | 'maps' | 'dungeon';

interface WorldViewProps {
  currentMapId: string;
  currentWorldId: string;
  stageProgress: Record<string, StageClearData>;
  playerLevel: number;
  onSelectStage: (stage: Stage) => void;
  onSelectMap?: (mapId: string) => void;
  onSelectWorld?: (worldId: string) => void;
  onStartBoss: () => void;
  soundEnabled?: boolean;
  navView?: WorldNavView;
  onNavViewChange?: (view: WorldNavView, worldId?: string) => void;
}

const PRO_WORLD_ACCENTS: Record<string, {
  watermark: string;
  glow: string;
  accentBorder: string;
  barColor: string;
  levelBox: string;
}> = {
  world_training: {
    watermark: '道',
    glow: 'bg-gold/5',
    accentBorder: 'border-gold/40 hover:border-gold',
    barColor: 'bg-gold',
    levelBox: 'bg-gold/15 border-gold/40 text-gold'
  },
  world_n5: {
    watermark: '初',
    glow: 'bg-teal/5',
    accentBorder: 'border-teal/40 hover:border-teal',
    barColor: 'bg-teal',
    levelBox: 'bg-teal/15 border-teal/40 text-teal'
  },
  world_n4: {
    watermark: '旅',
    glow: 'bg-matcha/5',
    accentBorder: 'border-matcha/40 hover:border-matcha',
    barColor: 'bg-matcha',
    levelBox: 'bg-matcha/15 border-matcha/40 text-matcha'
  },
  world_n3: {
    watermark: '志',
    glow: 'bg-gold/5',
    accentBorder: 'border-gold/40 hover:border-gold',
    barColor: 'bg-gold',
    levelBox: 'bg-gold/15 border-gold/40 text-gold'
  },
  world_n2: {
    watermark: '熟',
    glow: 'bg-indigo/5',
    accentBorder: 'border-indigo/40 hover:border-indigo',
    barColor: 'bg-indigo',
    levelBox: 'bg-indigo/15 border-indigo/40 text-indigo'
  },
  world_n1: {
    watermark: '極',
    glow: 'bg-crimson/5',
    accentBorder: 'border-crimson/40 hover:border-crimson',
    barColor: 'bg-crimson',
    levelBox: 'bg-crimson/15 border-crimson/40 text-crimson'
  }
};

export const WorldView: React.FC<WorldViewProps> = ({
  currentMapId,
  currentWorldId = 'world_n5',
  stageProgress = {},
  playerLevel = 1,
  onSelectStage,
  onSelectMap,
  onSelectWorld,
  onStartBoss,
  soundEnabled = true,
  navView = 'world_hub',
  onNavViewChange,
}) => {
  const safeWorldId = currentWorldId || 'world_n5';
  const selectedWorld = WORLDS_LIST.find(w => w.id === safeWorldId) || WORLDS_LIST[0];
  const proAccent = PRO_WORLD_ACCENTS[safeWorldId] || PRO_WORLD_ACCENTS.world_n3;
  const progress = stageProgress || {};

  const handleOpenWorld = (worldId: string) => {
    playSound('click', soundEnabled);
    if (onSelectWorld) onSelectWorld(worldId);
    const worldMaps = getMapsForWorld(worldId);
    if (worldMaps.length > 0 && onSelectMap) {
      onSelectMap(worldMaps[0].id);
    }
    if (onNavViewChange) onNavViewChange('maps', worldId);
  };

  const handleOpenLevelHub = (worldId: string) => {
    handleOpenWorld(worldId);
  };

  const handleOpenMaps = () => {
    playSound('click', soundEnabled);
    if (onNavViewChange) onNavViewChange('maps', safeWorldId);
  };

  const handleOpenDungeon = () => {
    playSound('click', soundEnabled);
    if (onNavViewChange) onNavViewChange('dungeon', safeWorldId);
  };

  const handleBackToLevelHub = () => {
    playSound('click', soundEnabled);
    if (onNavViewChange) onNavViewChange('world_hub', safeWorldId);
  };

  const handleBackToWorldHub = () => {
    playSound('click', soundEnabled);
    if (onNavViewChange) onNavViewChange('world_hub', safeWorldId);
  };

  // 1. VIEW: MAPS -> WORLD JOURNEY CANVAS (Perjalanan Node-Based Adventure Map)
  if (navView === 'maps') {
    return (
      <WorldJourneyCanvas
        worldId={safeWorldId}
        currentMapId={currentMapId}
        stageProgress={progress}
        playerLevel={playerLevel}
        onSelectStage={onSelectStage}
        onSelectMap={onSelectMap}
        onBackToHub={handleBackToWorldHub}
        onStartBoss={handleOpenDungeon}
        soundEnabled={soundEnabled}
      />
    );
  }

  // 2. VIEW: DUNGEON (Try Out Boss Arena)
  if (navView === 'dungeon') {
    return (
      <DungeonView 
        onBack={handleOpenMaps} 
        onStartBoss={onStartBoss}
        worldId={safeWorldId}
        soundEnabled={soundEnabled} 
      />
    );
  }

  // 3. VIEW: LEVEL HUB (Pusat Level: Minimalis, Bersih, Nyaman Dilihat)
  if (navView === 'level_hub') {
    const worldMaps = getMapsForWorld(safeWorldId);
    const stageIds = WORLD_STAGES_MAP[safeWorldId] || [];
    const totalStages = stageIds.length;
    const clearedStages = stageIds.filter(id => progress[id]?.cleared).length;
    const clearPercent = totalStages > 0 ? Math.round((clearedStages / totalStages) * 100) : 0;

    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToWorldHub}
            className="btn btn-pill text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#3c2a1a] dark:text-white" />
            <span>Kembali ke Gerbang World</span>
          </button>

          <span className={`text-xs px-3 py-1 rounded-xl font-mono font-bold border ${proAccent.levelBox}`}>
            JLPT {selectedWorld.jlptLevel}
          </span>
        </div>

        {/* Level Header Banner - Pure Visual Portal */}
        <div className={`panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl ${proAccent.glow} border-2 ${proAccent.accentBorder} shadow-2xl relative overflow-hidden flex flex-col justify-between gap-4 min-h-[130px] sm:min-h-[140px]`}>
          <div className="absolute right-4 -bottom-6 pointer-events-none select-none text-text-primary/[0.04] font-jp font-black text-9xl leading-none">
            {proAccent.watermark}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10 relative">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center border font-mono font-black shadow-md shrink-0 ${proAccent.levelBox}`}>
                <span className="text-[9px] tracking-widest text-text-muted font-sans font-bold">JLPT</span>
                <span className="text-xl sm:text-2xl leading-none font-extrabold">{selectedWorld.jlptLevel}</span>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-text-secondary font-jp">
                  {selectedWorld.japaneseName}
                </div>
                <h1 className="text-lg sm:text-2xl font-black text-text-primary font-heading tracking-wide leading-snug">
                  {selectedWorld.name.split('(')[0].trim()}
                </h1>
              </div>
            </div>

            <span className="text-xs font-mono px-3 py-1 rounded-xl bg-surface-inset text-text-secondary border border-border-subtle self-start sm:self-auto shrink-0">
              {worldMaps.length} Wilayah • {totalStages} Stage
            </span>
          </div>

          {/* Minimal Progress Bar */}
          <div className="space-y-1.5 relative z-10">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-text-secondary">Progres Level:</span>
              <span className="font-bold text-[#3c2a1a] dark:text-white">
                {clearedStages} / {totalStages} Stage ({clearPercent}%)
              </span>
            </div>
            <div className="rpg-progress-track">
              <div
                className={`h-full rounded-full transition-all duration-500 ${proAccent.barColor}`}
                style={{ width: `${clearPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2 Destination Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Card 1: Peta Pembelajaran */}
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            whileTap={{ scale: 0.985 }}
            onClick={handleOpenMaps}
            className="panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl hover:border-gold/50 transition-all cursor-pointer shadow-xl flex flex-col justify-between min-h-[135px] sm:min-h-[160px] group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center text-[#3c2a1a] dark:text-white group-hover:scale-105 transition-transform">
                <MapIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-xl bg-surface-inset text-text-secondary border border-border-subtle">
                {worldMaps.length} Wilayah
              </span>
            </div>

            <div className="my-2">
              <h3 className="text-base sm:text-lg font-bold text-text-primary font-heading group-hover:text-[#3c2a1a] dark:group-hover:text-white transition-colors">
                Peta Wilayah Pembelajaran
              </h3>
            </div>

            <div className="pt-2.5 border-t border-border-subtle flex items-center justify-between text-xs font-bold text-[#3c2a1a] dark:text-white">
              <span>Buka Peta Wilayah</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Card 2: Dungeon Try Out */}
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            whileTap={{ scale: 0.985 }}
            onClick={handleOpenDungeon}
            className="panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl hover:border-crimson/50 transition-all cursor-pointer shadow-xl flex flex-col justify-between min-h-[135px] sm:min-h-[160px] group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-crimson/10 border border-crimson/30 flex items-center justify-center text-crimson group-hover:scale-105 transition-transform">
                <Skull className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-xl bg-surface-inset text-crimson border border-crimson/30 font-bold">
                Boss Trial
              </span>
            </div>

            <div className="my-2">
              <h3 className="text-base sm:text-lg font-bold text-text-primary font-heading group-hover:text-crimson transition-colors">
                Dungeon Try Out ({selectedWorld.jlptLevel})
              </h3>
            </div>

            <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-bold text-crimson">
              <span className="flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" /> Masuk Dungeon Boss
              </span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // 4. VIEW: WORLD HUB (Gerbang Murni: BOLD LEVEL, Bersih, Tanpa Teks Penjelasan)
  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-12 animate-fade-in">
      {/* Pure Gateway Header */}
      <div className="panel py-3.5 sm:py-4 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-heading tracking-wide flex items-center gap-2 text-text-primary">
            <DoorOpen className="w-5 h-5 text-[#3c2a1a] dark:text-white" />
            <span>Gerbang Dunia (World Gates)</span>
          </h2>
        </div>
      </div>

      {/* 6 Levels Grid - Bold, Clean, Pure Gate UI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {WORLDS_LIST.map((world) => {
          const worldStages = WORLD_STAGES_MAP[world.id] || [];
          const totalStages = worldStages.length;
          const clearedStages = worldStages.filter(id => stageProgress[id]?.cleared).length;
          const progressPct = totalStages > 0 ? Math.round((clearedStages / totalStages) * 100) : 0;
          const isGateCleared = progressPct >= 77;
          const cleanWorldName = world.name.split('(')[0].trim();

          return (
            <motion.div
              key={world.id}
              whileHover={{ scale: 1.015, y: -2 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => handleOpenLevelHub(world.id)}
              className="panel panel-stitched transition-all cursor-pointer shadow-xl flex flex-col justify-between min-h-[165px] group relative overflow-hidden"
            >
              {/* Main Gateway Card Header: Bold Level + World Name */}
              <div className="flex items-center justify-between z-10 relative">
                <div className="flex items-center gap-3.5">
                  <div className="world-gate-emblem shrink-0">
                    <span className="text-[9px] tracking-widest text-text-muted font-sans font-bold">
                      {world.jlptLevel === 'KANA' ? 'DOJO' : 'JLPT'}
                    </span>
                    <span className={`leading-none text-[#3c2a1a] dark:text-white font-extrabold ${world.jlptLevel === 'KANA' ? 'text-sm font-bold tracking-tight' : 'text-2xl'}`}>
                      {world.jlptLevel}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary font-jp">
                      {world.japaneseName}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-text-primary font-heading group-hover:text-[#3c2a1a] dark:group-hover:text-white transition-colors">
                      {cleanWorldName}
                    </h3>
                  </div>
                </div>

                <span className="world-gate-pill font-mono">
                  {totalStages} Stage
                </span>
              </div>

              {/* Minimal Progress & Gate */}
              <div className="space-y-1.5 pt-4 border-t border-border-subtle z-10 relative">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-text-secondary">Progres:</span>
                  <span className="font-bold text-[#3c2a1a] dark:text-white">
                    {clearedStages} / {totalStages} ({progressPct}%)
                  </span>
                </div>

                <div className="rpg-progress-track">
                  <div
                    className="rpg-progress-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  {isGateCleared ? (
                    <span className="text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-1 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Gate Selesai
                    </span>
                  ) : (
                    <div />
                  )}

                  <span className="text-[#3c2a1a] dark:text-white font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform text-xs">
                    Masuk Gerbang <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
