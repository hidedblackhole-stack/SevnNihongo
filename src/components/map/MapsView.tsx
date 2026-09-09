import React from 'react';
import { Stage } from '../../types/content';
import { StageClearData } from '../../types/rpg';
import { WorldJourneyCanvas } from './WorldJourneyCanvas';

interface MapsViewProps {
  currentMapId?: string;
  worldId?: string;
  stageProgress: Record<string, StageClearData>;
  playerLevel: number;
  onSelectStage: (stage: Stage) => void;
  onSelectMap?: (mapId: string) => void;
  onBackToHub?: () => void;
  soundEnabled?: boolean;
}

export const MapsView: React.FC<MapsViewProps> = ({
  worldId = 'world_n5',
  stageProgress,
  playerLevel,
  onSelectStage,
  onBackToHub = () => {},
  soundEnabled = true,
}) => {
  return (
    <WorldJourneyCanvas
      worldId={worldId}
      stageProgress={stageProgress}
      playerLevel={playerLevel}
      onSelectStage={onSelectStage}
      onBackToHub={onBackToHub}
      onStartBoss={() => {}}
      soundEnabled={soundEnabled}
    />
  );
};
