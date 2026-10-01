import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';
import type { PlayerStats } from '../types/rpg';
import type { Stage } from '../types/content';
import type { TabType } from '../components/layout/BottomNavigation';
import type { WorldNavView } from '../components/map/WorldView';
import { useBackButton } from './useBackButton';
import { STORAGE_KEY_ONBOARDING } from '../state/storageKeys';

/**
 * Navigasi tab, overlay (stage/recall/boss), tombol back sistem, dan onboarding.
 * Dipisah dari App.tsx; perilaku tidak berubah.
 */
export function useAppNavigation(setStats: Dispatch<SetStateAction<PlayerStats>>) {
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
  const [worldNavView, setWorldNavView] = useState<WorldNavView>('world_hub');
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

  return {
    activeTab, setActiveTab, visitedTabs,
    selectedStage, setSelectedStage,
    isStatusModalOpen, setIsStatusModalOpen,
    isRecallActive, setIsRecallActive,
    isBossBattleActive, setIsBossBattleActive,
    isAuthModalOpen, setIsAuthModalOpen,
    worldNavView, setWorldNavView, worldResetCount,
    deckResetCount, deckInitialSubTab, setDeckInitialSubTab,
    handleTabChange, handleNavigateToOfficialBooks,
    isOnboardingActive, handleCompleteOnboarding, handleOpenAuthFromOnboarding, handleReplayOnboarding,
  };
}
