import { DeckItemCategory } from './rpg';

export type ActivityType =
  | 'kanji_flashcard'
  | 'kanji_write'
  | 'kanji_quiz'
  | 'kotoba_flashcard'
  | 'kotoba_quiz'
  | 'bunpou_study'
  | 'bunpou_quiz'
  | 'mixed_exam';

export interface CurriculumConfig {
  stageCount: number; // e.g. 1 - 10 stages
  includeTypes: DeckItemCategory[]; // subset of ['kanji', 'kotoba', 'bunpou']
  kanjiSettings: {
    writeMode: boolean;
    canvasPerKanji: number; // 1 to 5 repetitions
    flashcard: boolean;
    quiz: boolean;
  };
  kotobaSettings: {
    flashcard: boolean;
    quiz: boolean;
  };
  polaSettings: {
    study: boolean;
    quiz: boolean;
  };
}

export interface CustomStageItem {
  type: DeckItemCategory;
  id: string; // Kotoba ID, Kanji ID/character, or Bunpou ID
}

export interface CustomStage {
  id: string; // e.g. 'stage_1', 'stage_exam'
  stageNumber: number;
  title: string;
  description: string;
  items: CustomStageItem[];
  activities: ActivityType[];
  isExam?: boolean; // Final mixed exam
  rewardExp: number;
  rewardGold: number;
}

export interface CustomCurriculum {
  id: string;
  deckId: string;
  deckTitle: string;
  createdAt: string;
  updatedAt: string;
  config: CurriculumConfig;
  stages: CustomStage[];
}

export type StageStatus = 'locked' | 'current' | 'completed';

export interface CustomStageProgress {
  status: StageStatus;
  score?: number;
  total?: number;
  stars?: number; // 1 - 3
  clearedAt?: string;
}

export interface CustomCurriculumProgress {
  curriculumId: string;
  deckId: string;
  currentStageIndex: number; // 0-based index of current playable stage
  stages: Record<string, CustomStageProgress>; // keyed by stage.id
  lastPlayedAt?: string;
  isFullyCompleted?: boolean;
}
