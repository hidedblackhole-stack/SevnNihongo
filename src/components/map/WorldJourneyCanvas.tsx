import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  Lock, 
  Check,
  Star, 
  Skull, 
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Stage } from '../../types/content';
import { StageClearData } from '../../types/rpg';
import { getMapsForWorld, getStagesForMap, getWorldById } from '../../data/maps';
import { playSound } from '../../utils/audio';
import { StageDetailSheet } from './StageDetailSheet';

interface WorldJourneyCanvasProps {
  worldId: string;
  currentMapId?: string;
  stageProgress: Record<string, StageClearData>;
  playerLevel: number;
  onSelectStage: (stage: Stage) => void;
  onSelectMap?: (mapId: string) => void;
  onBackToHub: () => void;
  onStartBoss: () => void;
  soundEnabled?: boolean;
}

// Percentage offsets from center (bounded safely between -20% and +20% for rock-solid multi-device stability)
const REGION_OFFSETS_PRESETS: number[][] = [
  [0, 15, 22, 14, 0, -14, -22, -15], // Wilayah 1: Winding S-Curve
  [-18, 6, 20, 22, 14, 0, -18],      // Wilayah 2: Crescent Arc
  [-20, 20, -18, 18, -12, 12, 0],    // Wilayah 3: Switchbacks
  [16, 22, 12, -12, -22, -12, 0],    // Wilayah 4: Valley Meander
];

const ROW_HEIGHT = 104;

export const WorldJourneyCanvas: React.FC<WorldJourneyCanvasProps> = ({
  worldId,
  currentMapId,
  stageProgress = {},
  onSelectStage,
  onSelectMap,
  onBackToHub,
  onStartBoss,
  soundEnabled = true,
}) => {
  const currentWorld = getWorldById(worldId);
  const mapsInWorld = useMemo(() => getMapsForWorld(worldId), [worldId]);

  // Selected region state — Each Wilayah has its own focused map canvas
  const [selectedRegionId, setSelectedRegionId] = useState<string>(() => {
    if (currentMapId && mapsInWorld.some(m => m.id === currentMapId)) {
      return currentMapId;
    }
    return mapsInWorld.length > 0 ? mapsInWorld[0].id : '';
  });

  // Sync with parent when currentMapId changes
  useEffect(() => {
    if (currentMapId && mapsInWorld.some(m => m.id === currentMapId)) {
      setSelectedRegionId(currentMapId);
    }
  }, [currentMapId, mapsInWorld]);

  const activeRegion = useMemo(() => {
    return mapsInWorld.find(m => m.id === selectedRegionId) || mapsInWorld[0];
  }, [mapsInWorld, selectedRegionId]);

  const activeRegionIndex = useMemo(() => {
    return mapsInWorld.findIndex(m => m.id === activeRegion?.id);
  }, [mapsInWorld, activeRegion]);

  const [selectedStageForSheet, setSelectedStageForSheet] = useState<Stage | null>(null);

  // Switch region handler
  const handleSelectRegion = (regionId: string) => {
    playSound('click', soundEnabled);
    setSelectedRegionId(regionId);
    if (onSelectMap) onSelectMap(regionId);
  };

  // Get stages for CURRENT active region ONLY (typically 5 to 7 stages)
  const regionStages = useMemo(() => {
    if (!activeRegion) return [];
    return getStagesForMap(activeRegion.id);
  }, [activeRegion]);

  // Choose offset pattern based on region mapNumber
  const regionOffsets = useMemo(() => {
    const patternIdx = ((activeRegion?.mapNumber || 1) - 1) % REGION_OFFSETS_PRESETS.length;
    return REGION_OFFSETS_PRESETS[patternIdx];
  }, [activeRegion]);

  // Process stage items for state and percentage offset
  const processedStages = useMemo(() => {
    const halfCount = Math.ceil(regionStages.length / 2);
    let targetIdx = -1;

    return regionStages.map((stage, idx) => {
      const clearData = stageProgress[stage.id];
      const isCompleted = clearData?.cleared || false;
      const prevStage = idx > 0 ? regionStages[idx - 1] : null;

      const isFirstHalf = idx < halfCount;
      const isUnlocked = (
        isFirstHalf ||
        (prevStage && stageProgress[prevStage.id]?.cleared) ||
        stage.stageNumber <= 1
      );

      let state: 'done' | 'current' | 'available' | 'locked' | 'dungeon' = 'locked';
      if (stage.isBoss) {
        state = isCompleted ? 'done' : 'dungeon';
      } else if (isCompleted) {
        state = 'done';
      } else if (isUnlocked && targetIdx === -1) {
        state = 'current';
        targetIdx = idx;
      } else if (isUnlocked) {
        state = 'available';
      }

      const offsetPercent = regionOffsets[idx % regionOffsets.length];

      return {
        stage,
        state,
        isUnlocked,
        isCompleted,
        offset: offsetPercent,
        stars: clearData?.stars || 0
      };
    });
  }, [regionStages, stageProgress, regionOffsets]);

  const totalHeight = processedStages.length * ROW_HEIGHT;

  // Smooth Cubic Bézier S-curve connecting dead-center of each node
  const pathData = useMemo(() => {
    if (!processedStages.length) return '';
    let d = '';
    processedStages.forEach((item, i) => {
      // In 1000-width viewBox, (50 + offsetPercent) * 10 is exact pixel equivalent to left: (50 + offsetPercent)%
      const x = (50 + item.offset) * 10;
      const y = ROW_HEIGHT * i + ROW_HEIGHT / 2;
      if (i === 0) {
        d = `M ${x} ${y}`;
      } else {
        const prev = processedStages[i - 1];
        const prevX = (50 + prev.offset) * 10;
        const prevY = ROW_HEIGHT * (i - 1) + ROW_HEIGHT / 2;
        const midY = (prevY + y) / 2;
        d += ` C ${prevX} ${midY}, ${x} ${midY}, ${x} ${y}`;
      }
    });
    return d;
  }, [processedStages]);

  // Next / Previous region navigation
  const prevRegion = activeRegionIndex > 0 ? mapsInWorld[activeRegionIndex - 1] : null;
  const nextRegion = activeRegionIndex < mapsInWorld.length - 1 ? mapsInWorld[activeRegionIndex + 1] : null;
  const isRegionAllCleared = regionStages.length > 0 && regionStages.every(s => stageProgress[s.id]?.cleared);

  const handleNodeClick = (stage: Stage, isUnlocked: boolean) => {
    if (!isUnlocked) {
      playSound('wrong', soundEnabled);
      return;
    }
    playSound('click', soundEnabled);
    setSelectedStageForSheet(stage);
  };

  const handleStartFromSheet = (stage: Stage) => {
    setSelectedStageForSheet(null);
    onSelectStage(stage);
  };

  return (
    <div className="w-full max-w-[480px] mx-auto relative px-2 sm:px-4 pb-20 animate-fade-in select-none">
      {/* 1. SKEUOMORPHIC LEATHER HEADER */}
      <div className="skeuo-header mb-4">
        <div className="min-w-0 flex-1 pr-2.5">
          <div className="crumb flex items-center gap-1.5 text-xs font-mono font-bold text-text-secondary">
            <button
              onClick={() => {
                playSound('click', soundEnabled);
                onBackToHub();
              }}
              className="back hover:opacity-80 transition-opacity flex items-center gap-1 text-text-primary"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{currentWorld.jlptLevel}</span>
            </button>
            <span className="opacity-50">•</span>
            <span>WILAYAH 0{activeRegion?.mapNumber || 1}</span>
          </div>
          <h1 className="text-sm sm:text-base font-bold font-heading tracking-wide text-text-primary truncate mt-0.5" title={activeRegion?.japaneseName || activeRegion?.name}>
            {activeRegion?.japaneseName || activeRegion?.name}
          </h1>
        </div>

        {/* Boss Dungeon Quick Action Button */}
        <button
          onClick={() => {
            playSound('attack', soundEnabled);
            onStartBoss();
          }}
          className="dungeon-btn flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          title="Uji Kemampuan Boss Lapis"
        >
          <Skull className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span>DUNGEON</span>
        </button>
      </div>

      {/* 2. TIER / WILAYAH LADDER: Clean Carved Pebble Pills */}
      {mapsInWorld.length > 1 && (
        <div className="skeuo-tier-row mb-4">
          {mapsInWorld.map((reg) => {
            const isSelected = activeRegion?.id === reg.id;
            const regStages = getStagesForMap(reg.id);
            const isCleared = regStages.length > 0 && regStages.every(s => stageProgress[s.id]?.cleared);

            return (
              <button
                key={reg.id}
                type="button"
                onClick={() => handleSelectRegion(reg.id)}
                className={`skeuo-tier-pill ${isSelected ? 'active' : ''}`}
              >
                <span>W0{reg.mapNumber}</span>
                {isCleared && <span className="ml-1 text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. CLEAN JOURNEY MAP CANVAS CARD */}
      <div className="journey-canvas-card rounded-3xl p-4 sm:p-6 relative overflow-hidden border shadow-md">
        {/* Grayscale SVG Turbulence Grain Background Overlay */}
        <div className="skeuo-grain rounded-3xl" />

        {/* Map Journey Track */}
        <div 
          className="path-wrap relative w-full"
          style={{ height: `${totalHeight}px`, minHeight: `${totalHeight}px` }}
        >
          {/* Smooth Carved Groove SVG Path: 3 Adaptive Layers */}
          <svg
            className="path-line absolute inset-0 w-full h-full pointer-events-none z-0"
            viewBox={`0 0 1000 ${totalHeight}`}
            preserveAspectRatio="none"
          >
            {/* Layer 1: Dark Carved Groove Shadow */}
            <path
              d={pathData}
              fill="none"
              className="path-groove-shadow"
              strokeWidth="10"
              strokeLinecap="round"
              transform="translate(0, 2)"
            />
            {/* Layer 2: Light Relief Highlight */}
            <path
              d={pathData}
              fill="none"
              className="path-groove-highlight"
              strokeWidth="10"
              strokeLinecap="round"
              transform="translate(0, -1)"
            />
            {/* Layer 3: Dashed Stitch Thread */}
            <path
              d={pathData}
              fill="none"
              className="path-thread"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="4 16"
            />
          </svg>

          {/* Medallion Coin Nodes (Mathematically Aligned to SVG Curve) */}
          {processedStages.map((item, i) => {
            const stateClass = item.state === 'dungeon' ? 'node-dungeon'
              : item.state === 'done' ? 'node-done'
              : item.state === 'current' ? 'node-current'
              : item.state === 'available' ? 'node-available'
              : 'node-locked';

            const nodeY = ROW_HEIGHT * i + ROW_HEIGHT / 2;
            const nodeLeftPercent = 50 + item.offset;

            return (
              <div
                key={item.stage.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
                style={{
                  left: `${nodeLeftPercent}%`,
                  top: `${nodeY}px`,
                }}
              >
                {/* Tactical Coin Button */}
                <button
                  onClick={() => handleNodeClick(item.stage, item.isUnlocked)}
                  className={`node-btn ${stateClass}`}
                  aria-label={`Stage ${item.stage.stageNumber}: ${item.stage.title}`}
                >
                  {item.state === 'done' ? (
                    <Check className="w-6 h-6 stroke-[3]" />
                  ) : item.state === 'dungeon' ? (
                    <Skull className="w-6 h-6 transform -rotate-45" />
                  ) : item.state === 'current' ? (
                    <span className="font-medieval font-black text-lg sm:text-xl text-[#FFF7EC] drop-shadow">
                      {item.stage.stageNumber}
                    </span>
                  ) : item.state === 'available' ? (
                    <span className="font-medieval font-bold text-base sm:text-lg">
                      {item.stage.stageNumber}
                    </span>
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </button>

                {/* 3 Completion Stars Under the Node */}
                <div className="mt-1.5 flex items-center justify-center gap-1">
                  {[0, 1, 2].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 transition-all ${
                        s < item.stars
                          ? 'fill-[#B88912] dark:fill-[#D4AF37] text-[#B88912] dark:text-[#D4AF37] scale-110 drop-shadow-sm'
                          : 'text-[#D9C5AB] dark:text-stone-600 stroke-[1.5]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. FOOTER: Navigation to Next / Previous Wilayah */}
      <div className="mt-4 flex items-center justify-between gap-3 px-1">
        {prevRegion ? (
          <button
            onClick={() => handleSelectRegion(prevRegion.id)}
            className="guide-btn flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4 text-[#B88912] dark:text-[#d4af37]" />
            <span>Wilayah 0{prevRegion.mapNumber}</span>
          </button>
        ) : <div />}

        {nextRegion && (
          <button
            onClick={() => handleSelectRegion(nextRegion.id)}
            className={`guide-btn flex items-center gap-1.5 ${
              isRegionAllCleared ? 'border-[#B88912] text-[#B88912] dark:text-[#d4af37] font-bold' : ''
            }`}
          >
            <span>Wilayah 0{nextRegion.mapNumber}</span>
            <ChevronRight className="w-4 h-4 text-[#B88912] dark:text-[#d4af37]" />
          </button>
        )}
      </div>

      {/* 5. INSTANT STAGE DETAIL BOTTOM-SHEET / MODAL */}
      <StageDetailSheet
        stage={selectedStageForSheet}
        stageProgress={selectedStageForSheet ? stageProgress[selectedStageForSheet.id] : undefined}
        isOpen={Boolean(selectedStageForSheet)}
        onClose={() => setSelectedStageForSheet(null)}
        onStartStage={handleStartFromSheet}
        soundEnabled={soundEnabled}
      />
    </div>
  );
};
