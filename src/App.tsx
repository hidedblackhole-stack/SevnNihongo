/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Swords, Cloud, Clock } from 'lucide-react';
import { PlayerStats, StageClearData, Mission, DEFAULT_NAMES, DeckItemCategory, UserDeck } from './types/rpg';
import { Stage, ItemMasteryRecord } from './types/content';
import { getTierForExp, calculateMaxHp, calculateMaxMp, getLevelInfo, calculateLevelFromExp } from './data/tiers';
import { getEffectiveTier, getJlptLevelForTierIndex } from './utils/ascension';
import { MAP_REGIONS, getStagesForMap } from './data/maps';
import { INITIAL_DAILY_MISSIONS, INITIAL_WEEKLY_MISSIONS } from './data/missions';
import { useStudyTimeTracker } from './hooks/useStudyTimeTracker';
import { formatStudyTime, formatDetailedStudyTime, getTodayLocalDate } from './utils/time';
import { HomeView } from './components/home/HomeView';
import { WorldView } from './components/map/WorldView';
import { StageHubView } from './components/stage/StageHubView';
import { MissionsView } from './components/missions/MissionsView';
import { SettingsView } from './components/settings/SettingsView';
import { BottomNavigation, TabType } from './components/layout/BottomNavigation';
import { CharacterStatusModal } from './components/modals/CharacterStatusModal';
import { RecallModule } from './components/learning/RecallModule';
const DungeonBattleModule = lazy(() => import('./components/dungeon/DungeonBattleModule').then(m => ({ default: m.DungeonBattleModule })));
import { LibraryView } from './components/library/LibraryView';
import { BukuSakuView } from './components/deck/BukuSakuView';
import { ensureUserDecks, createDefaultBookmarkDeck, toggleBookmarkItem, toggleItemInDeck, DEFAULT_BOOKMARK_DECK_ID } from './utils/decks';
import { playSound } from './utils/audio';
import { recordItemAttempt, recordItemInteraction, buildSmartRecallQueue } from './utils/mastery';
import { recordStudyActivity, INITIAL_STUDY_STATS } from './utils/activity';
import { v4 as uuidv4 } from 'uuid';
import { LeaderboardView } from './components/leaderboard/LeaderboardView';
import { AuthModal } from './components/auth/AuthModal';
import { supabase, getSession, saveGameToCloud, loadGameFromCloud, upsertLeaderboard } from './lib/supabase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SpotlightOnboarding } from './components/tutorial/SpotlightOnboarding';
import { useBackButton } from './hooks/useBackButton';

const STORAGE_KEY_STATS = 'nihongo_quest_player_stats_v2';
const STORAGE_KEY_STAGES = 'nihongo_quest_stage_progress_v2';
const STORAGE_KEY_DAILY = 'nihongo_quest_daily_missions_v2';
const STORAGE_KEY_WEEKLY = 'nihongo_quest_weekly_missions_v2';
const STORAGE_KEY_ONBOARDING = 'nihongo_quest_onboarding_completed';

// Seed initial item mastery for an authentic start
const INITIAL_ITEM_MASTERY: Record<string, ItemMasteryRecord> = {};

const DEFAULT_STATS: PlayerStats = {
  playerName: DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)],
  characterGender: 'male',
  level: 1,
  totalExp: 0,
  tierIndex: 0,
  hp: 110,
  maxHp: 110,
  mp: 45,
  maxMp: 45,
  str: 0,
  agi: 0,
  int: 0,
  vit: 0,
  unallocatedPoints: 0,
  gold: 0,
  gems: 0,
  streakDays: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
  todayStudySeconds: 0,
  totalStudySeconds: 0,
  lastStudyDate: getTodayLocalDate(),
  currentWorldId: 'world_training',
  currentMapId: 'map_kana_hiragana',
  currentStageId: 'stage_kana_hira_1',
  soundEnabled: true,
  theme: 'dark',
  equippedSkin: 'skin_default',
  inventory: ['pot_hp_small', 'scroll_exp_sm'],
  itemMastery: INITIAL_ITEM_MASTERY,
  recallQueue: buildSmartRecallQueue(INITIAL_ITEM_MASTERY),
  userDecks: [createDefaultBookmarkDeck()],
  studyStats: INITIAL_STUDY_STATS,
};

export default function App() {
  // Load or Initialize Player State
  const [stats, setStats] = useState<PlayerStats>(() => {
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
          signature: parsed.signature || localStorage.getItem('nihongo_quest_player_signature') || '',
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
  });

  // Stage Progress Data
  const [stageProgress, setStageProgress] = useState<Record<string, StageClearData>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STAGES);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Missions
  const [dailyMissions, setDailyMissions] = useState<Mission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DAILY);
      return saved ? JSON.parse(saved) : INITIAL_DAILY_MISSIONS;
    } catch {
      return INITIAL_DAILY_MISSIONS;
    }
  });

  const [weeklyMissions, setWeeklyMissions] = useState<Mission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WEEKLY);
      return saved ? JSON.parse(saved) : INITIAL_WEEKLY_MISSIONS;
    } catch {
      return INITIAL_WEEKLY_MISSIONS;
    }
  });

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [visitedTabs, setVisitedTabs] = useState<Set<TabType>>(() => new Set<TabType>(['home']));

  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isRecallActive, setIsRecallActive] = useState(false);
  const [isBossBattleActive, setIsBossBattleActive] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [worldNavView, setWorldNavView] = useState<import('./components/map/WorldView').WorldNavView>('world_hub');
  const [worldResetCount, setWorldResetCount] = useState(0);
  const [deckResetCount, setDeckResetCount] = useState(0);
  const [deckInitialSubTab, setDeckInitialSubTab] = useState<'my_pocket' | 'official_books'>('my_pocket');
  const [tabHistory, setTabHistory] = useState<TabType[]>([]);

  // Hardware / System Back Button Handlers
  useBackButton(isRecallActive, () => {
    setIsRecallActive(false);
  }, 'smart_recall_overlay');

  useBackButton(isBossBattleActive, () => {
    setIsBossBattleActive(false);
  }, 'boss_battle_overlay');

  useBackButton(isAuthModalOpen, () => {
    setIsAuthModalOpen(false);
  }, 'auth_modal');

  // When on maps tab, inside a specific world (not world_hub), back returns to world_hub
  useBackButton(
    activeTab === 'maps' && !selectedStage && !isRecallActive && !isBossBattleActive && worldNavView !== 'world_hub',
    () => {
      setWorldNavView('world_hub');
      setStats(prev => ({ ...prev, currentWorldId: '' }));
      setWorldResetCount(c => c + 1);
    },
    'maps_world_navigation'
  );

  // Tab navigation history: when on any secondary tab, back returns to previous tab or home
  useBackButton(
    activeTab !== 'home' && !selectedStage && !isRecallActive && !isBossBattleActive && !isStatusModalOpen && !isAuthModalOpen,
    () => {
      if (tabHistory.length > 0) {
        const prevTab = tabHistory[tabHistory.length - 1];
        setTabHistory(h => h.slice(0, -1));
        setActiveTab(prevTab);
      } else {
        setActiveTab('home');
      }
    },
    'tab_navigation'
  );

  const handleTabChange = useCallback((tab: TabType) => {
    // If re-tapping the current active tab (Pop to Root / Scroll to Top)
    if (tab === activeTab && !selectedStage && !isRecallActive && !isBossBattleActive) {
      if (tab === 'maps') {
        setStats(prev => ({ ...prev, currentWorldId: '' }));
        setWorldNavView('world_hub');
        setWorldResetCount(c => c + 1);
      } else if (tab === 'deck') {
        setDeckResetCount(c => c + 1);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Record tab navigation history
    if (tab !== activeTab) {
      setTabHistory(prev => [...prev.filter(t => t !== tab), activeTab]);
    }

    // Dismiss any fullscreen stage overlays or active modals
    setSelectedStage(null);
    setIsRecallActive(false);
    setIsBossBattleActive(false);
    setIsStatusModalOpen(false);

    // Reset tab to its initial "Halaman Awal" when entering
    if (tab === 'maps') {
      setStats(prev => ({ ...prev, currentWorldId: '' }));
      setWorldNavView('world_hub');
      setWorldResetCount(c => c + 1);
    } else if (tab === 'deck') {
      setDeckResetCount(c => c + 1);
    }

    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab, selectedStage, isRecallActive, isBossBattleActive]);

  const handleNavigateToOfficialBooks = useCallback(() => {
    setDeckInitialSubTab('official_books');
    handleTabChange('deck');
  }, [handleTabChange]);
  const [isOnboardingActive, setIsOnboardingActive] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY_ONBOARDING);
    } catch {
      return false;
    }
  });

  const handleCompleteOnboarding = useCallback(() => {
    setIsOnboardingActive(false);
    try {
      localStorage.setItem(STORAGE_KEY_ONBOARDING, 'true');
    } catch (e) {
      console.warn('Failed to save onboarding state', e);
    }
  }, []);

  const handleOpenAuthFromOnboarding = useCallback(() => {
    handleCompleteOnboarding();
    setIsAuthModalOpen(true);
  }, [handleCompleteOnboarding]);

  const handleReplayOnboarding = useCallback(() => {
    setSelectedStage(null);
    setIsRecallActive(false);
    setIsBossBattleActive(false);
    setActiveTab('home');
    setIsOnboardingActive(true);
  }, []);

  // Active Study Tracking (Stage Hub / Learning Modules, Recall SRS, Boss Battles, and Library)
  const isStudying = Boolean(selectedStage || isRecallActive || isBossBattleActive || activeTab === 'library');

  const { todaySeconds: activeTodayStudySeconds, isTimerActive } = useStudyTimeTracker({
    isStudying,
    initialTodaySeconds: stats.todayStudySeconds || 0,
    initialTotalSeconds: stats.totalStudySeconds || 0,
    lastStudyDate: stats.lastStudyDate,
    onSave: (todaySec, totalSec, studyDate) => {
      setStats(prev => ({
        ...prev,
        todayStudySeconds: todaySec,
        totalStudySeconds: totalSec,
        lastStudyDate: studyDate,
      }));
    },
  });

  // Cloud Sync Refs to eliminate stale closures
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const stageProgressRef = useRef(stageProgress);
  stageProgressRef.current = stageProgress;
  const dailyMissionsRef = useRef(dailyMissions);
  dailyMissionsRef.current = dailyMissions;
  const weeklyMissionsRef = useRef(weeklyMissions);
  weeklyMissionsRef.current = weeklyMissions;

  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => localStorage.getItem('n3quest_last_cloud_sync'));

  // Cloud Sync Handler
  const handleCloudSync = useCallback(async (userIdParam?: string): Promise<boolean> => {
    try {
      setCloudSyncStatus('syncing');
      const cloudData = await loadGameFromCloud();
      const currentStats = statsRef.current;
      const currentStages = stageProgressRef.current;
      const currentDaily = dailyMissionsRef.current;
      const currentWeekly = weeklyMissionsRef.current;
      const targetUserId = userIdParam || currentStats.userId;

      if (!cloudData) {
        // No cloud save exists yet, push local progress if we have any
        if (targetUserId) {
          await saveGameToCloud({
            stats: { ...currentStats, userId: targetUserId },
            stageProgress: currentStages,
            dailyMissions: currentDaily,
            weeklyMissions: currentWeekly,
            updatedAt: new Date().toISOString()
          });
        }
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSyncedAt(nowStr);
        localStorage.setItem('n3quest_last_cloud_sync', nowStr);
        setCloudSyncStatus('synced');
        return true;
      }

      // We have cloud data! Compare progress
      const cloudExp = cloudData.stats?.totalExp || 0;
      const cloudLevel = cloudData.stats?.level || 1;
      const localExp = currentStats.totalExp || 0;
      const localLevel = currentStats.level || 1;

      console.log(`[CloudSync] Cloud: Lv.${cloudLevel} (${cloudExp} EXP) vs Local: Lv.${localLevel} (${localExp} EXP)`);

      if (cloudExp > localExp || cloudLevel > localLevel) {
        // Cloud has more progress! Adopt Cloud Save
        const finalLevel = cloudData.stats?.level || calculateLevelFromExp(cloudExp);
        const finalHp = calculateMaxHp(finalLevel, cloudData.stats?.vit || 0);
        const finalMp = calculateMaxMp(finalLevel, cloudData.stats?.int || 0);
        const candidateMerged: PlayerStats = {
          ...DEFAULT_STATS,
          ...currentStats,
          ...cloudData.stats,
          userId: targetUserId || currentStats.userId,
          level: finalLevel,
          totalExp: cloudExp,
        };
        const { effectiveTierIndex } = getEffectiveTier(candidateMerged);

        const mergedStats: PlayerStats = {
          ...candidateMerged,
          tierIndex: effectiveTierIndex,
          hp: Math.max(currentStats.hp, finalHp),
          maxHp: finalHp,
          mp: Math.max(currentStats.mp, finalMp),
          maxMp: finalMp,
          theme: currentStats.theme || cloudData.stats?.theme || 'dark',
          soundEnabled: currentStats.soundEnabled !== undefined ? currentStats.soundEnabled : true,
        };

        setStats(mergedStats);
        localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(mergedStats));

        if (cloudData.stageProgress && Object.keys(cloudData.stageProgress).length > 0) {
          const mergedStages = { ...currentStages, ...cloudData.stageProgress };
          setStageProgress(mergedStages);
          localStorage.setItem(STORAGE_KEY_STAGES, JSON.stringify(mergedStages));
        }

        if (cloudData.dailyMissions && cloudData.dailyMissions.length > 0) {
          setDailyMissions(cloudData.dailyMissions);
          localStorage.setItem(STORAGE_KEY_DAILY, JSON.stringify(cloudData.dailyMissions));
        }

        if (cloudData.weeklyMissions && cloudData.weeklyMissions.length > 0) {
          setWeeklyMissions(cloudData.weeklyMissions);
          localStorage.setItem(STORAGE_KEY_WEEKLY, JSON.stringify(cloudData.weeklyMissions));
        }

        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSyncedAt(nowStr);
        localStorage.setItem('n3quest_last_cloud_sync', nowStr);
        setCloudSyncStatus('synced');
        setCloudSyncMessage(`Progres dipulihkan dari Cloud (Level ${finalLevel} • ${cloudExp.toLocaleString()} EXP)!`);
        setTimeout(() => setCloudSyncMessage(null), 5000);
        return true;
      } else if (localExp > cloudExp || localLevel > cloudLevel) {
        // Local has newer progress! Push local save to cloud
        await saveGameToCloud({
          stats: { ...currentStats, userId: targetUserId || currentStats.userId },
          stageProgress: currentStages,
          dailyMissions: currentDaily,
          weeklyMissions: currentWeekly,
          updatedAt: new Date().toISOString()
        });
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSyncedAt(nowStr);
        localStorage.setItem('n3quest_last_cloud_sync', nowStr);
        setCloudSyncStatus('synced');
        setCloudSyncMessage(`Progres lokal (Level ${localLevel}) tersimpan ke Cloud!`);
        setTimeout(() => setCloudSyncMessage(null), 4000);
        return true;
      } else {
        // Equal EXP: Merge stageProgress & ensure cloud has full snapshot
        const mergedStages = { ...currentStages, ...(cloudData.stageProgress || {}) };
        setStageProgress(mergedStages);
        localStorage.setItem(STORAGE_KEY_STAGES, JSON.stringify(mergedStages));

        await saveGameToCloud({
          stats: { ...currentStats, userId: targetUserId || currentStats.userId },
          stageProgress: mergedStages,
          dailyMissions: currentDaily,
          weeklyMissions: currentWeekly,
          updatedAt: new Date().toISOString()
        });

        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSyncedAt(nowStr);
        localStorage.setItem('n3quest_last_cloud_sync', nowStr);
        setCloudSyncStatus('synced');
        return true;
      }
    } catch (err) {
      console.error('[CloudSync] Error during sync:', err);
      setCloudSyncStatus('error');
      setCloudSyncMessage('Gagal sinkronisasi dengan cloud.');
      setTimeout(() => setCloudSyncMessage(null), 4000);
      return false;
    }
  }, []);

  // Authentication Listener & Cloud Sync
  useEffect(() => {
    getSession().then((session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        setStats(prev => ({ ...prev, userId: session.user.id }));
        handleCloudSync(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        setStats(prev => ({ ...prev, userId: session.user.id }));
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
          handleCloudSync(session.user.id);
        }
      }
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [handleCloudSync]);


  // Daily midnight reset & streak tracking
  useEffect(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const lastReset = localStorage.getItem('n3quest_last_daily_reset');
    if (lastReset !== today) {
      setDailyMissions(INITIAL_DAILY_MISSIONS);
      localStorage.setItem('n3quest_last_daily_reset', today);
    }

    setStats(prev => {
      const lastActive = prev.lastActiveDate;
      if (lastActive === today) return prev;

      let newStreak = prev.streakDays || 0;
      if (!lastActive) {
        newStreak = 1;
      } else {
        const lastDate = new Date(lastActive + 'T00:00:00');
        const currentDate = new Date(today + 'T00:00:00');
        const diffMs = currentDate.getTime() - lastDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        } else if (diffDays <= 0) {
          // Same day or clock manipulation backwards - do not increment streak
          return prev;
        }
      }

      return {
        ...prev,
        streakDays: newStreak,
        longestStreak: Math.max(prev.longestStreak || 0, newStreak),
        totalActiveDays: (prev.totalActiveDays || 0) + 1,
        lastActiveDate: today,
        todayStudySeconds: (lastActive === today) ? (prev.todayStudySeconds || 0) : 0,
        lastStudyDate: today,
      };
    });
  }, []);

  // Theme Sync
  useEffect(() => {
    const root = document.documentElement;
    if (stats.theme === 'light') {
      root.classList.add('theme-light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    } else {
      root.classList.remove('theme-light');
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    }
  }, [stats.theme]);

  // Sync to LocalStorage (debounced to avoid blocking main thread on every tiny state change)
  useEffect(() => {
    const timerId = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
      } catch (e) {
        console.warn('Failed to save player stats', e);
      }
    }, 1000);
    return () => clearTimeout(timerId);
  }, [stats]);

  // Sync to Cloud Save (debounced 3s to avoid excessive requests)
  useEffect(() => {
    if (!stats.userId) return;

    const timerId = setTimeout(async () => {
      try {
        await saveGameToCloud({
          stats,
          stageProgress,
          dailyMissions,
          weeklyMissions,
          updatedAt: new Date().toISOString()
        });
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSyncedAt(nowStr);
        localStorage.setItem('n3quest_last_cloud_sync', nowStr);
      } catch (err) {
        console.warn('Cloud auto-save error:', err);
      }
    }, 3000);

    return () => clearTimeout(timerId);
  }, [stats, stageProgress, dailyMissions, weeklyMissions, isAuthenticated]);


  useEffect(() => {
    const timerId = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_STAGES, JSON.stringify(stageProgress));
      } catch (e) {
        console.warn('Failed to save stage progress', e);
      }
    }, 1000);
    return () => clearTimeout(timerId);
  }, [stageProgress]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_DAILY, JSON.stringify(dailyMissions));
      } catch (e) {
        console.warn('Failed to save daily missions', e);
      }
    }, 1000);
    return () => clearTimeout(timerId);
  }, [dailyMissions]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_WEEKLY, JSON.stringify(weeklyMissions));
      } catch (e) {
        console.warn('Failed to save weekly missions', e);
      }
    }, 1000);
    return () => clearTimeout(timerId);
  }, [weeklyMissions]);

  // Give EXP & Gold reward directly (pure base EXP, respects JLPT Ascension gates)
  const handleRewardPlayer = (expGained: number, goldGained: number = 0) => {
    setStats(prev => {
      const newTotalExp = Math.round(Math.max(0, (prev.totalExp || 0) + expGained));
      const { effectiveTierIndex, isGated, gatedReason } = getEffectiveTier({
        ...prev,
        totalExp: newTotalExp,
      });

      const updated = {
        ...prev,
        totalExp: newTotalExp,
        tierIndex: Math.max(0, effectiveTierIndex),
        tierPromotionGated: isGated,
        gatedReason: gatedReason,
        gold: Math.round(Math.max(0, (prev.gold || 0) + goldGained)),
      };

      // Immediately sync to Supabase Leaderboard without waiting for 3s debounce
      if (updated.userId) {
        upsertLeaderboard(updated).catch(e => console.warn('Instant leaderboard sync warning:', e));
      }

      return updated;
    });
  };

  const advanceMissions = (
    category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'streak' | 'stage_clear' | 'boss' | 'quiz',
    amount: number = 1,
    extra?: { isPerfect?: boolean; streakCount?: number }
  ) => {
    setDailyMissions(prev =>
      prev.map(m => {
        let shouldIncrement = false;
        let incAmount = amount;

        if (m.id === 'dm_01' && category === 'bunpou') shouldIncrement = true;
        else if (m.id === 'dm_02' && category === 'kotoba') shouldIncrement = true;
        else if (m.id === 'dm_03' && category === 'kanji') shouldIncrement = true;
        else if (m.id === 'dm_04' && category === 'choukai') shouldIncrement = true;
        else if (m.id === 'dm_05' && (category === 'quiz' || category === 'bunpou' || category === 'kotoba' || category === 'choukai')) shouldIncrement = true;

        if (shouldIncrement) {
          const newProgress = Math.min(m.target, m.progress + incAmount);
          return {
            ...m,
            progress: newProgress,
            completed: newProgress >= m.target,
          };
        }
        return m;
      })
    );

    setWeeklyMissions(prev =>
      prev.map(m => {
        let shouldIncrement = false;
        let incAmount = amount;

        if (m.id === 'wm_01' && category === 'stage_clear') shouldIncrement = true;
        else if (m.id === 'wm_02' && category === 'streak') {
          const currentStreak = extra?.streakCount ?? stats.streakDays;
          const newProgress = Math.min(m.target, Math.max(m.progress, currentStreak));
          return {
            ...m,
            progress: newProgress,
            completed: newProgress >= m.target,
          };
        }
        else if (m.id === 'wm_03' && category === 'dokkai' && extra?.isPerfect) shouldIncrement = true;
        else if (m.id === 'wm_04' && (category === 'boss' || category === 'stage_clear')) shouldIncrement = true;

        if (shouldIncrement) {
          const newProgress = Math.min(m.target, m.progress + incAmount);
          return {
            ...m,
            progress: newProgress,
            completed: newProgress >= m.target,
          };
        }
        return m;
      })
    );
  };

  // Universal Study Activity Completion Handler (Works across Stages, Library, Decks, & Practice)
  const handleStudyComplete = (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number,
    interactionTypeOverride?: 'writing' | 'flashcard' | 'quiz'
  ) => {
    if (expGained > 0 || goldGained > 0) {
      handleRewardPlayer(expGained, goldGained);
    }

    const effectiveInteraction: 'writing' | 'flashcard' | 'quiz' =
      interactionTypeOverride || (moduleId === 'kanji' ? 'writing' : (moduleId === 'kotoba' ? 'flashcard' : 'quiz'));

    // Advance mission progress based on completed module
    if (effectiveInteraction === 'writing' || moduleId === 'kanji') advanceMissions('kanji', 1);
    if (moduleId === 'bunpou') advanceMissions('bunpou', 1);
    else if (moduleId === 'kotoba' && effectiveInteraction !== 'writing') advanceMissions('kotoba', 1);
    else if (moduleId === 'choukai') advanceMissions('choukai', 1);
    else if (moduleId === 'dokkai') {
      const isPerfect = score !== undefined && total !== undefined && total > 0 && score === total;
      advanceMissions('dokkai', 1, { isPerfect });
    }
    else if (moduleId === 'boss') {
      advanceMissions('boss', 1);
    }

    if (score && score > 0) {
      advanceMissions('quiz', score);
    }

    // Update Item Mastery, Recall Queue & Study Statistics
    setStats(prev => {
      let updatedMastery = prev.itemMastery || {};
      let updatedRecallQueue = prev.recallQueue || [];

      if (itemId && score !== undefined && total !== undefined) {
        const cat = moduleId === 'boss' ? 'bunpou' : (moduleId === 'questions' || moduleId === 'tryOuts' ? 'kotoba' : moduleId);
        const currentItem = prev.itemMastery ? prev.itemMastery[itemId] : undefined;
        const isContextual = moduleId === 'dokkai' || moduleId === 'boss';
        const updatedRecord = recordItemAttempt(
          currentItem,
          itemId,
          cat,
          score,
          total,
          undefined,
          isContextual,
          effectiveInteraction
        );
        updatedMastery = {
          ...updatedMastery,
          [itemId]: updatedRecord
        };
        try {
          updatedRecallQueue = buildSmartRecallQueue(updatedMastery);
        } catch (e) {
          console.warn('Failed to update recall queue', e);
        }
      }

      let newStats: PlayerStats = {
        ...prev,
        itemMastery: updatedMastery,
        recallQueue: updatedRecallQueue,
      };

      // Record Activity for Stats Profile (the specific module)
      const effectiveId = itemId || `study_${moduleId}_${Date.now()}`;
      if (effectiveInteraction === 'writing' || moduleId === 'kanji') newStats = recordStudyActivity(newStats, 'kanjiWriting', effectiveId);
      else if (moduleId === 'kotoba') newStats = recordStudyActivity(newStats, 'flashcards', effectiveId);
      else if (moduleId === 'boss') newStats = recordStudyActivity(newStats, 'bossBattles', effectiveId);
      else if (moduleId === 'questions') newStats = recordStudyActivity(newStats, 'questions', effectiveId, total || 1);
      else if (moduleId === 'tryOuts') newStats = recordStudyActivity(newStats, 'tryOuts', effectiveId, 1);
      else newStats = recordStudyActivity(newStats, moduleId as any, effectiveId);

      // Record total questions answered if it was a quiz
      if (total && total > 1 && moduleId !== 'kanji' && moduleId !== 'kotoba' && effectiveInteraction !== 'writing') {
        newStats = recordStudyActivity(newStats, 'questions', effectiveId, total);
      }

      return newStats;
    });
  };

  // Lightweight Item Interaction Handler (Flashcard flip, Quick Kanji draw, Bunpou practice)
  const handleRecordItemInteraction = useCallback((
    itemId: string,
    category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
    interactionType: 'writing' | 'flashcard' | 'quiz',
    success: boolean = true
  ) => {
    setStats(prev => {
      const currentItem = prev.itemMastery ? prev.itemMastery[itemId] : undefined;
      const updatedRecord = recordItemInteraction(
        currentItem,
        itemId,
        category,
        interactionType,
        success
      );
      const updatedMastery = {
        ...(prev.itemMastery || {}),
        [itemId]: updatedRecord
      };
      let newStats: PlayerStats = {
        ...prev,
        itemMastery: updatedMastery
      };

      if (interactionType === 'writing') {
        newStats = recordStudyActivity(newStats, 'kanjiWriting', itemId, 1);
      } else if (interactionType === 'flashcard') {
        newStats = recordStudyActivity(newStats, 'flashcards', itemId, 1);
      } else if (interactionType === 'quiz') {
        newStats = recordStudyActivity(newStats, category === 'bunpou' ? 'bunpou' : 'questions', itemId, 1);
      }

      return newStats;
    });
  }, []);

  // Stage Module Completion Handler (Integrates Progress & Mastery System)
  const handleStageModuleComplete = (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => {
    if (!selectedStage) return;

    handleStudyComplete(moduleId, expGained, goldGained, itemId, score, total);

    setStageProgress(prev => {
      const current = prev[selectedStage.id] || {
        stageId: selectedStage.id,
        cleared: false,
        stars: 0,
        clearedModules: [],
        lastPlayedAt: new Date().toISOString()
      };

      const validCompletionModules = ['bunpou', 'kotoba', 'kanji', 'dokkai', 'choukai', 'boss'];
      const isValidCompletion = validCompletionModules.includes(moduleId);

      let updatedModules = current.clearedModules;
      if (isValidCompletion && !current.clearedModules.includes(moduleId)) {
        updatedModules = [...current.clearedModules, moduleId];
      }

      const expectedModulesCount = [
        selectedStage.bunpouIds?.length ? 'bunpou' : null,
        selectedStage.kotobaIds?.length ? 'kotoba' : null,
        selectedStage.kanjiIds?.length ? 'kanji' : null,
        selectedStage.dokkaiIds?.length ? 'dokkai' : null,
        selectedStage.choukaiIds?.length ? 'choukai' : null,
      ].filter(Boolean).length || 1;

      const isAllCleared = updatedModules.length >= expectedModulesCount || moduleId === 'boss';
      const calculatedStars = Math.min(3, Math.max(1, Math.ceil((updatedModules.length / expectedModulesCount) * 3)));

      if (isAllCleared && !current.cleared) {
        advanceMissions('stage_clear', 1);
      }

      return {
        ...prev,
        [selectedStage.id]: {
          ...current,
          cleared: isAllCleared || current.cleared,
          stars: Math.max(current.stars, calculatedStars),
          clearedModules: updatedModules,
          lastPlayedAt: new Date().toISOString()
        }
      };
    });
  };

  // Launch targeted remediation recall directly from diagnostic
  const handleStartRemediationRecall = (_itemIds: string[]) => {
    setSelectedStage(null);
    setIsRecallActive(true);
  };

  // Recall handlers
  const handleItemReviewed = (itemId: string, category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai', isCorrect: boolean) => {
    setStats(prev => {
      const currentMastery = { ...(prev.itemMastery || {}) };
      const existing = currentMastery[itemId];
      const updated = recordItemAttempt(
        existing,
        itemId,
        category,
        isCorrect ? 7 : 4,
        7
      );
      currentMastery[itemId] = updated;
      return {
        ...prev,
        itemMastery: currentMastery,
        recallQueue: buildSmartRecallQueue(currentMastery)
      };
    });
  };

  const handleCompleteRecallSession = (totalReviewed: number, correctCount: number, expGained: number, goldGained: number) => {
    handleRewardPlayer(expGained, goldGained);

    advanceMissions('kotoba', Math.min(5, totalReviewed));
    if (correctCount > 0) {
      advanceMissions('quiz', correctCount);
    }

    setIsRecallActive(false);
  };

  // Mana usage helper (e.g. for quiz hints)
  const handleUseMp = (amount: number): boolean => {
    if (stats.mp >= amount) {
      setStats(prev => ({ ...prev, mp: prev.mp - amount }));
      return true;
    }
    return false;
  };

  // Attribute Point allocation inside CharacterStatusModal
  const handleAllocateStat = (statName: 'str' | 'agi' | 'int' | 'vit') => {
    if (stats.unallocatedPoints <= 0) return;
    playSound('coin', stats.soundEnabled);

    setStats(prev => {
      const updated = {
        ...prev,
        [statName]: prev[statName] + 1,
        unallocatedPoints: prev.unallocatedPoints - 1,
      };
      updated.maxHp = calculateMaxHp(updated.level, updated.vit);
      updated.maxMp = calculateMaxMp(updated.level, updated.int);
      return updated;
    });
  };

  // Handle Ascension across JLPT tiers
  const handleAscendTier = (targetTierIndex: number, _targetJlpt: string | null) => {
    playSound('levelup', stats.soundEnabled);
    try {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.log('Confetti effect failed', e);
    }

    setStats(prev => {
      const currentJlpt = getJlptLevelForTierIndex(prev.tierIndex ?? 0);
      const existingAscended = prev.ascendedLevels || [];
      const updatedAscended = Array.from(new Set([...existingAscended, currentJlpt as any]));

      const candidateStats: PlayerStats = {
        ...prev,
        tierIndex: targetTierIndex,
        ascendedLevels: updatedAscended as ('N5' | 'N4' | 'N3' | 'N2' | 'N1')[],
        tierPromotionGated: false,
        gatedReason: undefined,
      };

      const { effectiveTierIndex } = getEffectiveTier(candidateStats);
      candidateStats.tierIndex = Math.max(targetTierIndex, effectiveTierIndex);

      return candidateStats;
    });
  };



  // Claim Mission Reward
  const handleClaimMission = (mission: Mission) => {
    if (mission.claimed) return;
    if (!mission.completed && (mission.progress || 0) < mission.target) return;

    handleRewardPlayer(mission.rewardExp, mission.rewardGold);
    if (mission.rewardGems) {
      setStats(prev => ({ ...prev, gems: prev.gems + (mission.rewardGems || 0) }));
    }

    if (dailyMissions.some(m => m.id === mission.id)) {
      setDailyMissions(prev =>
        prev.map(m => (m.id === mission.id ? { ...m, claimed: true } : m))
      );
    } else {
      setWeeklyMissions(prev =>
        prev.map(m => (m.id === mission.id ? { ...m, claimed: true } : m))
      );
    }
  };

  // Reset Progress
  const handleGameOver = () => {
    alert('HP kamu habis! Kamu gagal menyelesaikan Stage ini. Istirahat sejenak untuk memulihkan HP.');
    playSound('wrong', stats.soundEnabled);
    setSelectedStage(null); // Force exit stage
    // Auto-heal HP for testing purposes
    setStats(prev => ({ ...prev, hp: prev.maxHp }));
  };

  const handleHpDamage = (amount: number) => {
    setStats(prev => ({ ...prev, hp: Math.max(0, prev.hp - amount) }));
  };

  const handleResetData = () => {
    setStats(DEFAULT_STATS);
    setStageProgress({});
    setDailyMissions(INITIAL_DAILY_MISSIONS);
    setWeeklyMissions(INITIAL_WEEKLY_MISSIONS);
    setSelectedStage(null);
    setIsRecallActive(false);
    setIsBossBattleActive(false);
    setActiveTab('home');
    playSound('click', true);
  };

  // Launch Stage from Stage ID
  const handleLaunchStageById = (stageId: string) => {
    let targetStage: Stage | undefined;
    let targetMapId: string | undefined;
    let targetWorldId: string | undefined;

    for (const map of MAP_REGIONS) {
      const mapStages = getStagesForMap(map.id);
      const found = mapStages.find(s => s.id === stageId);
      if (found) {
        targetStage = found;
        targetMapId = map.id;
        targetWorldId = map.worldId || 'world_n5';
        break;
      }
    }

    if (!targetStage) {
      const defaultMap = MAP_REGIONS.find(m => m.id === stats.currentMapId) || MAP_REGIONS[0];
      const defaultStages = getStagesForMap(defaultMap.id);
      targetStage = defaultStages[0];
      targetMapId = defaultMap.id;
      targetWorldId = defaultMap.worldId || 'world_n5';
    }

    if (targetStage) {
      setStats(prev => ({
        ...prev,
        currentMapId: targetMapId || prev.currentMapId,
        currentStageId: targetStage!.id,
        currentWorldId: targetWorldId || prev.currentWorldId,
      }));
      setWorldNavView('maps');
      setSelectedStage(targetStage);
    }
  };

  // Handle Name Update
  const handleUpdateName = (newName: string) => {
    const trimmed = newName.trim().slice(0, 30);
    if (!trimmed) return;
    setStats(prev => {
      const updated = { ...prev, playerName: trimmed };
      if (isAuthenticated && updated.userId) {
        upsertLeaderboard(updated);
      }
      return updated;
    });
  };

  // Handle Player Signature / Bio Motto Update
  const handleUpdateSignature = (newSignature: string) => {
    const trimmed = newSignature.trim().slice(0, 60);
    setStats(prev => {
      const updated = { ...prev, signature: trimmed };
      try {
        localStorage.setItem('nihongo_quest_player_signature', trimmed);
      } catch {}
      return updated;
    });
  };

  const handleToggleBookmark = useCallback((id: string, category: DeckItemCategory, notes?: string, targetDeckId?: string) => {
    setStats(prev => {
      let updatedDecks: UserDeck[];
      if (targetDeckId && targetDeckId !== DEFAULT_BOOKMARK_DECK_ID) {
        const { userDecks } = toggleItemInDeck(prev.userDecks, targetDeckId, id, category, notes);
        updatedDecks = userDecks;
      } else {
        const { userDecks } = toggleBookmarkItem(prev.userDecks, id, category, notes);
        updatedDecks = userDecks;
      }
      const updated = { ...prev, userDecks: updatedDecks };
      if (isAuthenticated && updated.userId) {
        saveGameToCloud({
          stats: updated,
          stageProgress: stageProgressRef.current,
          dailyMissions: dailyMissionsRef.current,
          weeklyMissions: weeklyMissionsRef.current,
          updatedAt: new Date().toISOString()
        });
      }
      return updated;
    });
  }, [isAuthenticated]);

  return (
    <div 
      className="min-h-[100dvh] flex flex-col font-sans antialiased bg-surface-base text-text-primary selection:bg-gold selection:text-surface-base md:pl-24"
      style={{
        paddingBottom: 'max(5rem, calc(4rem + env(safe-area-inset-bottom)))',
      }}
    >
      {/* Cloud Sync Floating Toast Notification */}
      <AnimatePresence>
        {cloudSyncMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full panel border border-gold/40 shadow-xl flex items-center gap-2 text-xs font-bold text-text-primary pointer-events-none"
          >
            <Cloud className="w-4 h-4 text-gold animate-pulse shrink-0" />
            <span>{cloudSyncMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Main Navigation Header */}
      <header 
        className="sticky top-0 z-30 bg-surface-card/95 backdrop-blur-md border-b border-border-subtle shadow-md px-4 py-2.5 sm:py-3"
        style={{
          paddingTop: 'max(0.625rem, env(safe-area-inset-top))',
        }}
      >
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between relative z-10">
          <div
            onClick={() => {
              setSelectedStage(null);
              setIsRecallActive(false);
              setActiveTab('home');
              playSound('click', stats.soundEnabled);
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-surface-inset text-indigo border border-border-subtle flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <Swords className="w-4 h-4 stroke-[2.5] text-gold" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold tracking-widest text-text-primary font-heading">
                SevnQuest
              </span>
              <p className="text-[10px] text-text-secondary font-mono tracking-wider">
                The Learning World
              </p>
            </div>
          </div>

          {/* Quick HUD in Header */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs">
            {/* Today's Study Time Tracker */}
            <div
              className={`py-1.5 px-3 rounded-xl bg-surface-inset border text-xs font-mono font-bold flex items-center gap-1.5 shadow-inner transition-all select-none ${
                isTimerActive
                  ? 'border-gold/50 text-gold'
                  : 'border-border-subtle text-text-secondary'
              }`}
              title={`Waktu Belajar Hari Ini: ${formatDetailedStudyTime(activeTodayStudySeconds)}${
                isTimerActive ? ' • Sesi belajar sedang aktif' : ' • Jeda'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 shrink-0 ${isTimerActive ? 'text-gold animate-pulse' : 'text-text-muted'}`} />
              <span className="font-mono text-[11px] sm:text-xs">
                {formatStudyTime(activeTodayStudySeconds)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3.5 sm:px-4 py-4 sm:py-5">
        {isRecallActive && (
          <RecallModule
            recallQueue={stats.recallQueue || []}
            playerMp={stats.mp}
            playerInt={stats.int}
            onUseMp={handleUseMp}
            onItemReviewed={handleItemReviewed}
            onCompleteRecallSession={handleCompleteRecallSession}
            onExit={() => setIsRecallActive(false)}
            soundEnabled={stats.soundEnabled}
            furiganaEnabled={stats.furiganaEnabled ?? true}
          />
        )}

        {isBossBattleActive && !isRecallActive && (
          <Suspense fallback={<div className="flex items-center justify-center h-full text-stone-400">Loading Boss Battle...</div>}>
            <DungeonBattleModule
              onComplete={(_score, _total, exp, gold, tryoutId) => {
                handleRewardPlayer(exp, gold);
                setStats(prev => recordStudyActivity(prev, 'bossBattles', tryoutId || 'tryout_n3_002'));
                setIsBossBattleActive(false);
              }}
              onBack={() => setIsBossBattleActive(false)}
              soundEnabled={stats.soundEnabled}
            />
          </Suspense>
        )}

        {selectedStage && !isRecallActive && !isBossBattleActive && (
          <ErrorBoundary>
            <StageHubView
              stage={selectedStage}
              stageProgress={stageProgress[selectedStage.id]}
              itemMastery={stats.itemMastery || {}}
              onBackToMap={() => setSelectedStage(null)}
              onBackToWorldList={() => {
                setSelectedStage(null);
                setStats(prev => ({ ...prev, currentWorldId: '' }));
              }}
              onSelectStage={(newStage) => setSelectedStage(newStage)}
              onModuleComplete={handleStageModuleComplete}
              playerMp={stats.mp}
              playerMaxMp={stats.maxMp}
              playerInt={stats.int}
              playerStr={stats.str}
              playerHp={stats.hp}
              playerMaxHp={stats.maxHp}
              onUseMp={handleUseMp}
              onHpDamage={handleHpDamage}
              onGameOver={handleGameOver}
              onStartRemediationRecall={handleStartRemediationRecall}
              soundEnabled={stats.soundEnabled}
              furiganaEnabled={stats.furiganaEnabled ?? true}
            />
          </ErrorBoundary>
        )}

        {/* Standard Tab Views (Keep-Alive Container for 0ms Instant Tab Switching) */}
        <div className={Boolean(selectedStage || isRecallActive || isBossBattleActive) ? 'hidden' : 'block'}>
          <div className="tab-views-container relative w-full">
            {/* Home Tab */}
            <div
              className={activeTab === 'home' ? 'block animate-tab-enter' : 'hidden'}
              aria-hidden={activeTab !== 'home'}
            >
              {visitedTabs.has('home') && (
                <HomeView
                  stats={stats}
                  dailyMissions={dailyMissions}
                  stageProgress={stageProgress}
                  onOpenStatusModal={() => setIsStatusModalOpen(true)}
                  onNavigateToStage={handleLaunchStageById}
                  onNavigateTab={(tab) => handleTabChange(tab as TabType)}
                  onStartRecall={() => setIsRecallActive(true)}
                />
              )}
            </div>

            {/* World / Maps Tab */}
            <div
              className={activeTab === 'maps' ? 'block animate-tab-enter' : 'hidden'}
              aria-hidden={activeTab !== 'maps'}
            >
              {visitedTabs.has('maps') && (
                <ErrorBoundary>
                  <WorldView
                    currentMapId={stats.currentMapId}
                    currentWorldId={stats.currentWorldId || ''}
                    resetSignal={worldResetCount}
                    navView={worldNavView}
                    onNavViewChange={(view, worldId) => {
                      setWorldNavView(view);
                      if (worldId) {
                        setStats(prev => ({ ...prev, currentWorldId: worldId }));
                      }
                    }}
                    stageProgress={stageProgress}
                    playerLevel={stats.level}
                    playerTierIndex={stats.tierIndex}
                    onSelectStage={(stage) => setSelectedStage(stage)}
                    onSelectMap={(mapId) => setStats(prev => ({ ...prev, currentMapId: mapId }))}
                    onSelectWorld={(worldId) => setStats(prev => ({ ...prev, currentWorldId: worldId }))}
                    onStartBoss={() => setIsBossBattleActive(true)}
                    soundEnabled={stats.soundEnabled}
                    userDecks={stats.userDecks}
                    onUpdateDecks={(updatedDecks) => {
                      setStats(prev => {
                        const next = { ...prev, userDecks: updatedDecks };
                        try {
                          localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(next));
                        } catch (e) {
                          console.warn('Failed to persist user decks', e);
                        }
                        return next;
                      });
                    }}
                    onNavigateTab={(tab) => handleTabChange(tab as TabType)}
                    onNavigateToOfficialBooks={handleNavigateToOfficialBooks}
                    onRewardPlayer={handleRewardPlayer}
                    onCompleteStudyItem={handleStudyComplete}
                    playerMp={stats.mp}
                    playerMaxMp={stats.maxMp}
                    playerInt={stats.int}
                    playerStr={stats.str}
                    playerHp={stats.hp}
                    playerMaxHp={stats.maxHp}
                    onUseMp={handleUseMp}
                    onHpDamage={handleHpDamage}
                    onGameOver={handleGameOver}
                    onStartRemediationRecall={handleStartRemediationRecall}
                    itemMastery={stats.itemMastery || {}}
                    furiganaEnabled={stats.furiganaEnabled ?? true}
                  />
                </ErrorBoundary>
              )}
            </div>

            {/* Missions Tab (Daily & Weekly) */}
            <div
              className={(activeTab === 'daily' || activeTab === 'weekly') ? 'block animate-tab-enter' : 'hidden'}
              aria-hidden={activeTab !== 'daily' && activeTab !== 'weekly'}
            >
              {(visitedTabs.has('daily') || visitedTabs.has('weekly')) && (
                <MissionsView
                  dailyMissions={dailyMissions}
                  weeklyMissions={weeklyMissions}
                  onClaimReward={handleClaimMission}
                  soundEnabled={stats.soundEnabled}
                />
              )}
            </div>

            {/* Leaderboard Tab */}
            <div
              className={activeTab === 'leaderboard' ? 'block animate-tab-enter' : 'hidden'}
              aria-hidden={activeTab !== 'leaderboard'}
            >
              {visitedTabs.has('leaderboard') && (
                <LeaderboardView
                  currentUserId={stats.userId!}
                  currentUserStats={stats}
                  soundEnabled={stats.soundEnabled}
                  onOpenStatusModal={() => setIsStatusModalOpen(true)}
                  onUpdateSignature={handleUpdateSignature}
                  isActive={activeTab === 'leaderboard'}
                />
              )}
            </div>

            {/* Library Tab */}
            <div
              className={activeTab === 'library' ? 'block animate-tab-enter' : 'hidden'}
              aria-hidden={activeTab !== 'library'}
            >
              {visitedTabs.has('library') && (
                <LibraryView
                  soundEnabled={stats.soundEnabled}
                  itemMastery={stats.itemMastery}
                  onRewardPlayer={handleRewardPlayer}
                  onRecordStudy={(cat, id, count) => setStats(prev => recordStudyActivity(prev, cat, id, count))}
                  onRecordInteraction={handleRecordItemInteraction}
                  onCompleteStudyItem={handleStudyComplete}
                  userDecks={stats.userDecks}
                  onToggleBookmark={handleToggleBookmark}
                  onUpdateDecks={(updatedDecks) => {
                    setStats(prev => {
                      const updated = { ...prev, userDecks: updatedDecks };
                      if (isAuthenticated && updated.userId) {
                        saveGameToCloud({
                          stats: updated,
                          stageProgress: stageProgressRef.current,
                          dailyMissions: dailyMissionsRef.current,
                          weeklyMissions: weeklyMissionsRef.current,
                          updatedAt: new Date().toISOString()
                        });
                      }
                      return updated;
                    });
                  }}
                />
              )}
            </div>

            {/* Deck / Buku Saku Tab */}
            <div
              className={activeTab === 'deck' ? 'block animate-tab-enter' : 'hidden'}
              aria-hidden={activeTab !== 'deck'}
            >
              {visitedTabs.has('deck') && (
                <BukuSakuView
                  userDecks={stats.userDecks}
                  resetSignal={deckResetCount}
                  initialSubTab={deckInitialSubTab}
                  onSubTabChange={(subTab) => setDeckInitialSubTab(subTab)}
                  onUpdateDecks={(updatedDecks) => {
                    setStats(prev => {
                      const updated = { ...prev, userDecks: updatedDecks };
                      if (isAuthenticated && updated.userId) {
                        saveGameToCloud({
                          stats: updated,
                          stageProgress: stageProgressRef.current,
                          dailyMissions: dailyMissionsRef.current,
                          weeklyMissions: weeklyMissionsRef.current,
                          updatedAt: new Date().toISOString()
                        });
                      }
                      return updated;
                    });
                  }}
                  onRewardPlayer={handleRewardPlayer}
                  onCompleteStudyItem={handleStudyComplete}
                  soundEnabled={stats.soundEnabled}
                  playerMp={stats.mp}
                  playerMaxMp={stats.maxMp}
                  playerInt={stats.int}
                  playerStr={stats.str}
                  playerHp={stats.hp}
                  playerMaxHp={stats.maxHp}
                  onUseMp={handleUseMp}
                  onHpDamage={handleHpDamage}
                  onGameOver={handleGameOver}
                  onStartRemediationRecall={handleStartRemediationRecall}
                  itemMastery={stats.itemMastery || {}}
                  furiganaEnabled={stats.furiganaEnabled ?? true}
                />
              )}
            </div>

            {/* Settings Tab */}
            <div
              className={activeTab === 'settings' ? 'block animate-tab-enter' : 'hidden'}
              aria-hidden={activeTab !== 'settings'}
            >
              {visitedTabs.has('settings') && (
                <SettingsView
                  stats={stats}
                  onUpdateSettings={(newSettings) => setStats(prev => ({ ...prev, ...newSettings }))}
                  onResetData={handleResetData}
                  isAuthenticated={isAuthenticated}
                  onOpenAuth={() => setIsAuthModalOpen(true)}
                  onSaveBeforeLogout={async () => {
                    if (isAuthenticated && stats.userId) {
                      await saveGameToCloud({
                        stats,
                        stageProgress,
                        dailyMissions,
                        weeklyMissions,
                        updatedAt: new Date().toISOString()
                      });
                    }
                  }}
                  syncStatus={cloudSyncStatus}
                  lastSyncedAt={lastSyncedAt}
                  onUpdateName={handleUpdateName}
                  onReplayTutorial={handleReplayOnboarding}
                />
              )}
            </div>
          </div>
        </div>
        
        <AuthModal
          isOpen={isAuthModalOpen}
          isMandatory={false}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            setIsAuthModalOpen(false);
            setIsAuthenticated(true);
          }}
          soundEnabled={stats.soundEnabled}
        />
      </main>

      {/* Character Status Modal (Triggered by Avatar click or HUD click) */}
      <CharacterStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        stats={stats}
        stageProgress={stageProgress}
        onAllocateStat={handleAllocateStat}
        onRecoverHp={() => setStats(prev => ({ ...prev, hp: prev.maxHp }))}
        onStartRecall={() => {
          setIsStatusModalOpen(false);
          setIsRecallActive(true);
        }}
        onUpdateName={handleUpdateName}
        onUpdateGender={(gender) => setStats(prev => ({ ...prev, characterGender: gender }))}
        onAscendTier={handleAscendTier}
      />

      {/* Bottom Fixed Navigation Bar */}
      <BottomNavigation
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        soundEnabled={stats.soundEnabled}
      />

      {/* Interactive Spotlight Onboarding Tour */}
      <SpotlightOnboarding
        isOpen={isOnboardingActive}
        onComplete={handleCompleteOnboarding}
        onOpenAuth={handleOpenAuthFromOnboarding}
        soundEnabled={stats.soundEnabled}
      />
    </div>
  );
}
