/* eslint-disable @typescript-eslint/no-explicit-any */
import { lazy } from 'react';
import type { PlayerStats, StageClearData, Mission } from '../types/rpg';
import type { TabType } from '../components/layout/BottomNavigation';
import { HomeView } from '../components/home/HomeView';
import { MissionsView } from '../components/missions/MissionsView';
import { AuthModal } from '../components/auth/AuthModal';
import { ModuleBoundary } from '../components/common/ModuleBoundary';
import { recordStudyActivity } from '../utils/activity';
import type { useAppNavigation } from '../hooks/useAppNavigation';
import type { usePlayerActions } from '../hooks/usePlayerActions';
import type { CloudSyncStatus } from '../hooks/useCloudSync';
import type { Dispatch, SetStateAction } from 'react';

// Modul berat di-lazy-load: tidak ikut chunk awal (kode + dataset tryout, hanzi-writer, dst.).
// Semuanya berada di dalam <ModuleBoundary> yang menyediakan Suspense + ErrorBoundary per modul.
const WorldView = lazy(() => import('../components/map/WorldView').then(m => ({ default: m.WorldView })));
const StageHubView = lazy(() => import('../components/stage/StageHubView').then(m => ({ default: m.StageHubView })));
const SettingsView = lazy(() => import('../components/settings/SettingsView').then(m => ({ default: m.SettingsView })));
const RecallModule = lazy(() => import('../components/learning/RecallModule').then(m => ({ default: m.RecallModule })));
const LibraryView = lazy(() => import('../components/library/LibraryView').then(m => ({ default: m.LibraryView })));
const BukuSakuView = lazy(() => import('../components/deck/BukuSakuView').then(m => ({ default: m.BukuSakuView })));
const LeaderboardView = lazy(() => import('../components/leaderboard/LeaderboardView').then(m => ({ default: m.LeaderboardView })));
const DungeonBattleModule = lazy(() => import('../components/dungeon/DungeonBattleModule').then(m => ({ default: m.DungeonBattleModule })));

type Nav = ReturnType<typeof useAppNavigation>;
type Actions = ReturnType<typeof usePlayerActions>;

export interface MainContentProps extends Nav, Actions {
  stats: PlayerStats;
  stageProgress: Record<string, StageClearData>;
  dailyMissions: Mission[];
  weeklyMissions: Mission[];
  setStats: Dispatch<SetStateAction<PlayerStats>>;
  isAuthenticated: boolean;
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>;
  cloudSyncStatus: CloudSyncStatus;
  lastSyncedAt: string | null;
  saveToCloud: (payload: import('../lib/supabase').CloudSavePayload) => Promise<boolean>;
}

/** Konten utama: overlay (recall/boss/stage) + tab keep-alive. Dipindah apa adanya dari App.tsx. */
export function MainContent(props: MainContentProps) {
  const {
    stats, setStats, stageProgress, dailyMissions, weeklyMissions,
    activeTab, setActiveTab, visitedTabs, selectedStage, setSelectedStage,
    isStatusModalOpen, setIsStatusModalOpen, isRecallActive, setIsRecallActive,
    isBossBattleActive, setIsBossBattleActive, isAuthModalOpen, setIsAuthModalOpen,
    worldNavView, setWorldNavView, worldResetCount, deckResetCount, deckInitialSubTab, setDeckInitialSubTab,
    handleTabChange, handleNavigateToOfficialBooks,
    handleRewardPlayer, handleStudyComplete, handleRecordItemInteraction, handleStageModuleComplete,
    handleStartRemediationRecall, handleItemReviewed, handleCompleteRecallSession, handleUseMp,
    handleClaimMission, handleGameOver, handleHpDamage, handleResetData, handleLaunchStageById,
    handleUpdateName, handleUpdateSignature, handleToggleBookmark, handleUpdateDecks, handleReplayOnboarding,
    isAuthenticated, setIsAuthenticated, cloudSyncStatus, lastSyncedAt, saveToCloud,
  } = props;

  return (
    <>
        {/* Main Content Area */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-3.5 sm:px-4 py-4 sm:py-5">
          {isRecallActive && (
            <ModuleBoundary label="Recall SRS" onReset={() => setIsRecallActive(false)}>
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
            </ModuleBoundary>
          )}

          {isBossBattleActive && !isRecallActive && (
            <ModuleBoundary label="Boss Battle" onReset={() => setIsBossBattleActive(false)}>
              <DungeonBattleModule
                onComplete={(_score, _total, exp, gold, tryoutId) => {
                  handleRewardPlayer(exp, gold);
                  setStats(prev => recordStudyActivity(prev, 'bossBattles', tryoutId || 'tryout_n3_002'));
                  setIsBossBattleActive(false);
                }}
                onBack={() => setIsBossBattleActive(false)}
                soundEnabled={stats.soundEnabled}
              />
            </ModuleBoundary>
          )}

          {selectedStage && !isRecallActive && !isBossBattleActive && (
            <ModuleBoundary label="Stage" onReset={() => setSelectedStage(null)}>
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
            </ModuleBoundary>
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
                  <ModuleBoundary label="Beranda">
                  <HomeView
                    stats={stats}
                    dailyMissions={dailyMissions}
                    stageProgress={stageProgress}
                    onOpenStatusModal={() => setIsStatusModalOpen(true)}
                    onNavigateToStage={handleLaunchStageById}
                    onNavigateTab={(tab) => handleTabChange(tab as TabType)}
                    onStartRecall={() => setIsRecallActive(true)}
                  />
                  </ModuleBoundary>
                )}
              </div>

              {/* World / Maps Tab */}
              <div
                className={activeTab === 'maps' ? 'block animate-tab-enter' : 'hidden'}
                aria-hidden={activeTab !== 'maps'}
              >
                {visitedTabs.has('maps') && (
                  <ModuleBoundary label="Peta Dunia">
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
                      onUpdateDecks={handleUpdateDecks}
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
                  </ModuleBoundary>
                )}
              </div>

              {/* Missions Tab (Daily & Weekly) */}
              <div
                className={(activeTab === 'daily' || activeTab === 'weekly') ? 'block animate-tab-enter' : 'hidden'}
                aria-hidden={activeTab !== 'daily' && activeTab !== 'weekly'}
              >
                {(visitedTabs.has('daily') || visitedTabs.has('weekly')) && (
                  <ModuleBoundary label="Misi">
                  <MissionsView
                    dailyMissions={dailyMissions}
                    weeklyMissions={weeklyMissions}
                    onClaimReward={handleClaimMission}
                    soundEnabled={stats.soundEnabled}
                  />
                  </ModuleBoundary>
                )}
              </div>

              {/* Leaderboard Tab */}
              <div
                className={activeTab === 'leaderboard' ? 'block animate-tab-enter' : 'hidden'}
                aria-hidden={activeTab !== 'leaderboard'}
              >
                {visitedTabs.has('leaderboard') && (
                  <ModuleBoundary label="Papan Peringkat">
                  <LeaderboardView
                    currentUserId={stats.userId!}
                    currentUserStats={stats}
                    soundEnabled={stats.soundEnabled}
                    onOpenStatusModal={() => setIsStatusModalOpen(true)}
                    onUpdateSignature={handleUpdateSignature}
                    isActive={activeTab === 'leaderboard'}
                  />
                  </ModuleBoundary>
                )}
              </div>

              {/* Library Tab */}
              <div
                className={activeTab === 'library' ? 'block animate-tab-enter' : 'hidden'}
                aria-hidden={activeTab !== 'library'}
              >
                {visitedTabs.has('library') && (
                  <ModuleBoundary label="Perpustakaan">
                  <LibraryView
                    soundEnabled={stats.soundEnabled}
                    itemMastery={stats.itemMastery}
                    onRewardPlayer={handleRewardPlayer}
                    onRecordStudy={(cat, id, count) => setStats(prev => recordStudyActivity(prev, cat, id, count))}
                    onRecordInteraction={handleRecordItemInteraction}
                    onCompleteStudyItem={handleStudyComplete}
                    userDecks={stats.userDecks}
                    onToggleBookmark={handleToggleBookmark}
                    onUpdateDecks={handleUpdateDecks}
                  />
                  </ModuleBoundary>
                )}
              </div>

              {/* Deck / Buku Saku Tab */}
              <div
                className={activeTab === 'deck' ? 'block animate-tab-enter' : 'hidden'}
                aria-hidden={activeTab !== 'deck'}
              >
                {visitedTabs.has('deck') && (
                  <ModuleBoundary label="Buku Saku">
                  <BukuSakuView
                    userDecks={stats.userDecks}
                    resetSignal={deckResetCount}
                    initialSubTab={deckInitialSubTab}
                    onSubTabChange={(subTab) => setDeckInitialSubTab(subTab)}
                    onUpdateDecks={handleUpdateDecks}
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
                  </ModuleBoundary>
                )}
              </div>

              {/* Settings Tab */}
              <div
                className={activeTab === 'settings' ? 'block animate-tab-enter' : 'hidden'}
                aria-hidden={activeTab !== 'settings'}
              >
                {visitedTabs.has('settings') && (
                  <ModuleBoundary label="Pengaturan">
                  <SettingsView
                    stats={stats}
                    onUpdateSettings={(newSettings) => setStats(prev => ({ ...prev, ...newSettings }))}
                    onResetData={handleResetData}
                    isAuthenticated={isAuthenticated}
                    onOpenAuth={() => setIsAuthModalOpen(true)}
                    onSaveBeforeLogout={async () => {
                      if (isAuthenticated && stats.userId) {
                        await saveToCloud({
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
                  </ModuleBoundary>
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
    </>
  );
}
