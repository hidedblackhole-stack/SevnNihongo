import { v4 as uuidv4 } from 'uuid';
import { PlayerStats, StageClearData, Mission, DEFAULT_NAMES } from '../types/rpg';
import { MAP_REGIONS, getStagesForMap } from '../data/maps';
import { INITIAL_DAILY_MISSIONS, INITIAL_WEEKLY_MISSIONS } from '../data/missions';
import { ensureUserDecks, createDefaultBookmarkDeck } from '../utils/decks';
import { buildSmartRecallQueue } from '../utils/mastery';
import { INITIAL_STUDY_STATS } from '../utils/activity';
import { getTodayLocalDate } from '../utils/time';
import { DEFAULT_STATS, INITIAL_ITEM_MASTERY } from './defaultStats';
import {
  STORAGE_KEY_STATS,
  STORAGE_KEY_STAGES,
  STORAGE_KEY_DAILY,
  STORAGE_KEY_WEEKLY,
  STORAGE_KEY_SIGNATURE,
} from './storageKeys';

/** Muat PlayerStats dari localStorage (dengan migrasi/validasi) atau buat state baru. */
export function loadInitialStats(): PlayerStats {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STATS);
    if (saved) {
      const parsed = JSON.parse(saved);

      // Check if player has cleared stages
      let savedStages: Record<string, any> = {};
      try {
        const rawStages = localStorage.getItem(STORAGE_KEY_STAGES);
        if (rawStages) savedStages = JSON.parse(rawStages);
      } catch {}

      const hasAnyCleared = Object.values(savedStages).some((s: any) => s?.cleared);
      const isLegacyN3Initial = !hasAnyCleared && (parsed.currentMapId === 'map_bunpou_w1' || parsed.currentStageId === 'stage_1' || parsed.currentMapId === 'map_n5_training');

      const validMap = isLegacyN3Initial ? MAP_REGIONS.find(m => m.id === 'map_kana_hiragana') : (MAP_REGIONS.find(m => m.id === parsed.currentMapId) || MAP_REGIONS.find(m => m.id === 'map_kana_hiragana') || MAP_REGIONS[0]);
      const validStages = getStagesForMap(validMap?.id || 'map_kana_hiragana');
      const validStage = isLegacyN3Initial ? validStages.find(s => s.id === 'stage_kana_hira_1') : (validStages.find(s => s.id === parsed.currentStageId) || validStages[0]);
      const loadedMastery = parsed.itemMastery || INITIAL_ITEM_MASTERY;
      
      // Migrate old default name to random name
      let loadedName = parsed.playerName;
      if (!loadedName || loadedName === 'Pemilik WebApp') {
        loadedName = DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)];
      }

      const todayStr = getTodayLocalDate();
      const loadedTodaySeconds = (parsed.lastStudyDate === todayStr) ? (parsed.todayStudySeconds || 0) : 0;

      return {
        ...DEFAULT_STATS,
        ...parsed,
        totalExp: Math.round(Number(parsed.totalExp) || 0),
        level: Math.round(Number(parsed.level) || 1),
        gold: Math.round(Number(parsed.gold) || 0),
        gems: Math.round(Number(parsed.gems) || 0),
        playerName: loadedName,
        signature: parsed.signature || localStorage.getItem(STORAGE_KEY_SIGNATURE) || '',
        itemMastery: loadedMastery,
        recallQueue: (() => {
          try {
            return buildSmartRecallQueue(loadedMastery);
          } catch (e) {
            console.warn('Failed to build initial recall queue', e);
            return [];
          }
        })(),
        currentWorldId: isLegacyN3Initial ? 'world_training' : (parsed.currentWorldId || 'world_training'),
        currentMapId: validMap ? validMap.id : 'map_kana_hiragana',
        currentStageId: validStage ? validStage.id : 'stage_kana_hira_1',
        userId: parsed.userId || uuidv4(),
        todayStudySeconds: loadedTodaySeconds,
        totalStudySeconds: parsed.totalStudySeconds || 0,
        lastStudyDate: todayStr,
        userDecks: ensureUserDecks(parsed.userDecks),
        studyStats: {
          ...INITIAL_STUDY_STATS,
          ...(parsed.studyStats || {}),
        },
      };
    }
    return { ...DEFAULT_STATS, userId: uuidv4(), lastStudyDate: getTodayLocalDate(), userDecks: [createDefaultBookmarkDeck()] };
  } catch {
    return { ...DEFAULT_STATS, userId: uuidv4(), lastStudyDate: getTodayLocalDate(), userDecks: [createDefaultBookmarkDeck()] };
  }
}

/** Muat progres stage dari localStorage. */
export function loadStageProgress(): Record<string, StageClearData> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STAGES);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function loadMissions(key: string, fallback: Mission[]): Mission[] {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export const loadDailyMissions = () => loadMissions(STORAGE_KEY_DAILY, INITIAL_DAILY_MISSIONS);
export const loadWeeklyMissions = () => loadMissions(STORAGE_KEY_WEEKLY, INITIAL_WEEKLY_MISSIONS);
