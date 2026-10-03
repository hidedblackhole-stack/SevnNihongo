import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Compass, 
  CheckCircle2, 
  ChevronRight, 
  Play, 
  Bookmark, 
  Plus, 
  Star, 
  Swords,
  Copy, 
  Check, 
  BookOpen, 
  Layers, 
  Library,
  Zap,
  Castle
} from 'lucide-react';
import { StageClearData, UserDeck, DeckItemCategory } from '../../types/rpg';
import { Stage, ItemMasteryRecord } from '../../types/content';
import { playSound } from '../../utils/audio';
import { CustomCurriculum, CustomCurriculumProgress, CurriculumConfig } from '../../types/curriculum';
import {
  loadAllCustomCurriculums,
  saveCustomCurriculum,
  loadAllCurriculumProgress,
  saveCurriculumProgress,
  generateCurriculum,
  initializeCurriculumProgress,
  getOrCreateCurriculumForDeck,
} from '../../utils/curriculumEngine';
import { ensureUserDecks, toggleBookmarkItem } from '../../utils/decks';
import { TEMPLATE_DECKS, cloneTemplateToUserDecks } from '../../data/templateDecks';
import { SelectDeckForWorldModal } from '../curriculum/SelectDeckForWorldModal';
import { CurriculumConfigModal } from '../curriculum/CurriculumConfigModal';
import { CustomWorldView } from '../curriculum/CustomWorldView';
import { TemplateDeckDetailView } from '../deck/TemplateDeckDetailView';
import { DungeonType, DungeonPayload, generateDungeonSession } from '../../utils/dungeonGenerator';
import { DungeonPortalHub } from '../dungeon/DungeonPortalHub';
import { DungeonSetupModal } from '../dungeon/DungeonSetupModal';
import { DungeonSessionRunner } from '../dungeon/DungeonSessionRunner';
import { ArcadeHubView } from '../arcade/ArcadeHubView';
import { StageJourneyPicker } from './StageJourneyPicker';
import { chapterToUserDeck, bookToFullUserDeck } from '../../data/officialBooks';
import { OfficialBook, OfficialChapter } from '../../types/books';
import { TowerMap, TowerSessionRunner } from '../tower';
import { loadTowerProgress, buildTowerPlayerProfile, TowerSavedProgress } from '../../engine/tower/world/towerProgress';

export type WorldNavView = 'world_hub' | 'level_hub' | 'maps' | 'dungeon' | 'arcade' | 'stage' | 'tower';

interface WorldViewProps {
  currentMapId?: string;
  currentWorldId?: string;
  resetSignal?: number;
  stageProgress?: Record<string, StageClearData>;
  playerLevel?: number;
  playerTierIndex?: number;
  onSelectStage?: (stage: Stage) => void;
  onSelectMap?: (mapId: string) => void;
  onSelectWorld?: (worldId: string) => void;
  onStartBoss?: () => void;
  soundEnabled?: boolean;
  navView?: WorldNavView;
  onNavViewChange?: (view: WorldNavView, worldId?: string) => void;
  userDecks?: UserDeck[];
  onUpdateDecks?: (decks: UserDeck[]) => void;
  onNavigateTab?: (tab: 'home' | 'maps' | 'daily' | 'weekly' | 'leaderboard' | 'library' | 'deck' | 'settings') => void;
  onNavigateToOfficialBooks?: () => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  /** Hasil lantai Tower (masteryGain per itemId) -> mastery/SRS pemain. */
  onTowerMastery?: (masteryGain: Record<string, number>) => void;
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

export const WorldView: React.FC<WorldViewProps> = ({
  currentWorldId,
  resetSignal,
  soundEnabled = true,
  onNavigateTab,
  onNavigateToOfficialBooks,
  userDecks,
  onUpdateDecks,
  onRewardPlayer,
  onTowerMastery,
  onCompleteStudyItem,
  playerLevel = 1,
  playerTierIndex = 0,
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
  // 4 Modes: arcade (default), dungeon, stage, tower
  const [worldMode, setWorldMode] = useState<'arcade' | 'dungeon' | 'stage' | 'tower'>(() => {
    if (navView === 'dungeon') return 'dungeon';
    if (navView === 'maps' || navView === 'stage') return 'stage';
    if (navView === 'tower') return 'tower';
    return 'arcade';
  });

  const [setupDungeonType, setSetupDungeonType] = useState<DungeonType | null>(null);
  const [activeDungeonPayload, setActiveDungeonPayload] = useState<DungeonPayload | null>(null);

  // Tower 1000 Floors States
  const [activeTowerFloor, setActiveTowerFloor] = useState<number | null>(null);
  const [towerProgress, setTowerProgress] = useState<TowerSavedProgress>(() => loadTowerProgress());

  const towerProfile = useMemo(() => {
    return buildTowerPlayerProfile(
      { userId: 'Pendaki Menara', level: playerLevel },
      itemMastery
    );
  }, [playerLevel, itemMastery]);

  // Custom World & Template Deck States
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('ALL');
  const [clonedSuccessId, setClonedSuccessId] = useState<string | null>(null);
  const [isSelectDeckModalOpen, setIsSelectDeckModalOpen] = useState(false);
  const [deckForCurriculumConfig, setDeckForCurriculumConfig] = useState<UserDeck | null>(null);
  const [activeCustomWorldDeckId, setActiveCustomWorldDeckId] = useState<string | null>(null);
  const [selectedTemplateDeck, setSelectedTemplateDeck] = useState<UserDeck | null>(null);
  const [isPlayingTemplateWorld, setIsPlayingTemplateWorld] = useState<boolean>(false);
  const [customCurriculums, setCustomCurriculums] = useState<Record<string, CustomCurriculum>>(() => loadAllCustomCurriculums());
  const [curriculumProgressMap, setCurriculumProgressMap] = useState<Record<string, CustomCurriculumProgress>>(() => loadAllCurriculumProgress());

  useEffect(() => {
    if (navView === 'dungeon') {
      setWorldMode('dungeon');
    } else if (navView === 'maps' || navView === 'stage') {
      setWorldMode('stage');
    } else if (navView === 'tower') {
      setWorldMode('tower');
    } else if (navView === 'arcade' || navView === 'world_hub') {
      setWorldMode('arcade');
    }
  }, [navView]);

  useEffect(() => {
    if (resetSignal !== undefined && resetSignal > 0) {
      setActiveCustomWorldDeckId(null);
      setSelectedTemplateDeck(null);
      setIsPlayingTemplateWorld(false);
      setDeckForCurriculumConfig(null);
      setIsSelectDeckModalOpen(false);
      setWorldMode('arcade');
      setSetupDungeonType(null);
      setActiveDungeonPayload(null);
      setActiveTowerFloor(null);
    }
  }, [resetSignal]);

  const handleSwitchMode = (mode: 'arcade' | 'dungeon' | 'stage' | 'tower') => {
    playSound('click', soundEnabled);
    setWorldMode(mode);
    if (onNavViewChange) {
      const targetNav: WorldNavView = mode === 'dungeon' ? 'dungeon' : mode === 'stage' ? 'maps' : mode === 'tower' ? 'tower' : 'world_hub';
      onNavViewChange(targetNav);
    }
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

  const handleCloneTemplate = (deck: UserDeck, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playSound('coin', soundEnabled);
    const { updatedDecks } = cloneTemplateToUserDecks(deck.id, userDecks);
    if (onUpdateDecks) {
      onUpdateDecks(updatedDecks);
    }
    setClonedSuccessId(deck.id);
    setTimeout(() => setClonedSuccessId(null), 3000);
  };

  // Launch Stage from Official Chapter
  const handleSelectChapterStage = (chapter: OfficialChapter, book: OfficialBook) => {
    const virtualDeck = chapterToUserDeck(chapter, book);
    const cur = getOrCreateCurriculumForDeck(virtualDeck);
    saveCustomCurriculum(cur);
    setCustomCurriculums(loadAllCustomCurriculums());
    setCurriculumProgressMap(loadAllCurriculumProgress());
    setActiveCustomWorldDeckId(virtualDeck.id);
  };

  // Launch Stage from Full Official Book
  const handleSelectBookStage = (book: OfficialBook) => {
    const virtualDeck = bookToFullUserDeck(book);
    const cur = getOrCreateCurriculumForDeck(virtualDeck);
    saveCustomCurriculum(cur);
    setCustomCurriculums(loadAllCustomCurriculums());
    setCurriculumProgressMap(loadAllCurriculumProgress());
    setActiveCustomWorldDeckId(virtualDeck.id);
  };

  // 1. IF PLAYING TEMPLATE DECK WORLD:
  if (selectedTemplateDeck && isPlayingTemplateWorld) {
    const currentCurriculum = customCurriculums[selectedTemplateDeck.id] || getOrCreateCurriculumForDeck(selectedTemplateDeck);
    const currentProg = curriculumProgressMap[selectedTemplateDeck.id] || initializeCurriculumProgress(currentCurriculum);

    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 sm:pb-12 animate-fade-in px-2 sm:px-0">
        <CustomWorldView
          curriculum={currentCurriculum}
          progress={currentProg}
          isTemplate={true}
          onUpdateProgress={(updated) => {
            setCurriculumProgressMap(prev => ({ ...prev, [selectedTemplateDeck.id]: updated }));
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
          onBack={() => setIsPlayingTemplateWorld(false)}
          soundEnabled={soundEnabled}
        />
      </div>
    );
  }

  const handleToggleBookmark = (id: string, category: DeckItemCategory) => {
    if (onUpdateDecks && userDecks) {
      const { userDecks: updated } = toggleBookmarkItem(userDecks, id, category);
      onUpdateDecks(updated);
    }
  };

  // 2. IF VIEWING A TEMPLATE DECK:
  if (selectedTemplateDeck) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 sm:pb-12 animate-fade-in px-2 sm:px-0">
        <TemplateDeckDetailView
          deck={selectedTemplateDeck}
          isTemplate={true}
          onBack={() => setSelectedTemplateDeck(null)}
          onPlayWorld={() => {
            playSound('click', soundEnabled);
            const cur = getOrCreateCurriculumForDeck(selectedTemplateDeck);
            saveCustomCurriculum(cur);
            setCustomCurriculums(loadAllCustomCurriculums());
            setCurriculumProgressMap(loadAllCurriculumProgress());
            setIsPlayingTemplateWorld(true);
          }}
          onCloneTemplate={() => handleCloneTemplate(selectedTemplateDeck)}
          isCloned={clonedSuccessId === selectedTemplateDeck.id}
          onToggleBookmark={handleToggleBookmark}
          soundEnabled={soundEnabled}
          onRewardPlayer={onRewardPlayer}
          onCompleteStudyItem={onCompleteStudyItem}
          itemMastery={itemMastery}
          userDecks={userDecks}
          furiganaEnabled={furiganaEnabled}
        />
      </div>
    );
  }

  // 3. IF A USER OR BOOK STAGE WORLD IS CURRENTLY OPENED FOR PLAYING:
  if (activeCustomWorldDeckId) {
    const customDeck = (userDecks || []).find(d => d.id === activeCustomWorldDeckId);

    if (customCurriculums[activeCustomWorldDeckId] || customDeck) {
      const currentCurriculum = customCurriculums[activeCustomWorldDeckId] || getOrCreateCurriculumForDeck(customDeck!);
      const currentProg = curriculumProgressMap[activeCustomWorldDeckId] || initializeCurriculumProgress(currentCurriculum);

      return (
        <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 sm:pb-12 animate-fade-in px-2 sm:px-0">
          <CustomWorldView
            curriculum={currentCurriculum}
            progress={currentProg}
            isTemplate={false}
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
              if (customDeck) {
                setDeckForCurriculumConfig(customDeck);
              }
            }}
            onBack={() => setActiveCustomWorldDeckId(null)}
            soundEnabled={soundEnabled}
          />
        </div>
      );
    }
  }

  // Filter custom worlds: exclude templates
  const templateIds = new Set(TEMPLATE_DECKS.map(t => t.id));
  const userCustomWorldList = Object.values(customCurriculums).filter(c => !templateIds.has(c.deckId));

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 sm:pb-12 animate-fade-in px-2 sm:px-0">
      
      {/* 1. HEADER UTAMA: WORLD */}
      <div className="panel panel-stitched p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-md border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-2xl ${
            worldMode === 'arcade'
              ? 'bg-amber-500/15 text-amber-400 border-border-subtle'
              : worldMode === 'dungeon'
                ? 'bg-crimson/15 text-crimson border-border-subtle'
                : worldMode === 'tower'
                  ? 'bg-wine-accent/15 text-wine-accent border-border-subtle'
                  : 'bg-gold/15 text-gold border-border-subtle'
          } border flex items-center justify-center shrink-0 shadow-sm`}>
            {worldMode === 'arcade' ? (
              <Zap className="w-6 h-6 fill-amber-400/20" />
            ) : worldMode === 'dungeon' ? (
              <Swords className="w-6 h-6" />
            ) : worldMode === 'tower' ? (
              <Castle className="w-6 h-6" />
            ) : (
              <Compass className="w-6 h-6" />
            )}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide">
              {worldMode === 'arcade'
                ? 'Petualangan World · Arena Game'
                : worldMode === 'dungeon'
                  ? 'Petualangan World · Mode Dungeon'
                  : worldMode === 'tower'
                    ? 'Petualangan World · Menara 1.000 (Nihongo Tower)'
                    : 'Petualangan World · Peta Stage'}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary font-body">
              {worldMode === 'arcade'
                ? 'Uji kecepatan menulis dan refleksmu di game arcade dengan tantangan rekor terbaik.'
                : worldMode === 'dungeon'
                  ? 'Latihan bebas tanpa beban: menulis aksara, flashcard kilat, susun pola kalimat, ubah bentuk kata, dan kuis cepat.'
                  : worldMode === 'tower'
                    ? 'Daki 1.000 lantai menara legendaris secara vertikal. Taklukkan 10 wilayah, pos peristirahatan suci, dan bos ujian akbar JLPT.'
                    : 'Pilih kurikulum resmi atau rak tematik untuk langsung bertarung dan menjelajahi stage RPG.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. FOUR-MODE SWITCHER BAR */}
      <div className="panel p-1.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-center gap-1.5 sm:gap-2 shadow-inner overflow-x-auto scrollbar-none">
        
        {/* TAB 1: ARENA ARCADE */}
        <button
          type="button"
          onClick={() => handleSwitchMode('arcade')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all whitespace-nowrap ${
            worldMode === 'arcade'
              ? 'bg-surface-card text-amber-400 shadow-sm border border-border-subtle'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Zap className={`w-4 h-4 shrink-0 ${worldMode === 'arcade' ? 'text-amber-400 fill-amber-400/20' : ''}`} />
          <span>
            <span className="inline sm:hidden">Arcade</span>
            <span className="hidden sm:inline">Arena Arcade</span>
          </span>
        </button>

        {/* TAB 2: MODE DUNGEON */}
        <button
          type="button"
          onClick={() => handleSwitchMode('dungeon')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all whitespace-nowrap ${
            worldMode === 'dungeon'
              ? 'bg-surface-card text-crimson shadow-sm border border-border-subtle'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Swords className={`w-4 h-4 shrink-0 ${worldMode === 'dungeon' ? 'text-crimson' : ''}`} />
          <span>
            <span className="inline sm:hidden">Dungeon</span>
            <span className="hidden sm:inline">Mode Dungeon</span>
          </span>
        </button>

        {/* TAB 3: PETUALANGAN STAGE */}
        <button
          type="button"
          onClick={() => handleSwitchMode('stage')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all whitespace-nowrap ${
            worldMode === 'stage'
              ? 'bg-surface-card text-gold shadow-sm border border-border-subtle'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Compass className={`w-4 h-4 shrink-0 ${worldMode === 'stage' ? 'text-gold' : ''}`} />
          <span>
            <span className="inline sm:hidden">Stage</span>
            <span className="hidden sm:inline">Petualangan Stage</span>
          </span>
        </button>

        {/* TAB 4: MENARA 1.000 */}
        <button
          type="button"
          onClick={() => handleSwitchMode('tower')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all whitespace-nowrap ${
            worldMode === 'tower'
              ? 'bg-surface-card text-wine-accent shadow-sm border border-border-subtle'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Castle className={`w-4 h-4 shrink-0 ${worldMode === 'tower' ? 'text-wine-accent' : ''}`} />
          <span>
            <span className="inline sm:hidden">Tower</span>
            <span className="hidden sm:inline">Menara 1.000</span>
          </span>
        </button>

      </div>

      {/* 3. CONTENT PER ACTIVE MODE */}
      {worldMode === 'arcade' && (
        /* MODE 1: ARENA ARCADE */
        <ArcadeHubView
          soundEnabled={soundEnabled}
          userDecks={userDecks}
          playerLevel={playerLevel}
          playerTierIndex={playerTierIndex}
          onOpenTower={() => handleSwitchMode('tower')}
          onRewardPlayer={onRewardPlayer}
          onCompleteStudyItem={onCompleteStudyItem}
        />
      )}

      {worldMode === 'dungeon' && (
        /* MODE 2: DUNGEON PORTAL HUB */
        <DungeonPortalHub
          onSelectDungeon={(type) => {
            if (type === 'blackboard') {
              try {
                playSound('attack', soundEnabled);
                const payload = generateDungeonSession(
                  {
                    type: 'blackboard',
                    levelCategory: 'all',
                    floorCount: 15,
                    mode: 'standard',
                  },
                  userDecks
                );
                setActiveDungeonPayload(payload);
              } catch (err) {
                console.error('Failed to start blackboard playground:', err);
              }
            } else {
              setSetupDungeonType(type);
            }
          }}
          soundEnabled={soundEnabled}
        />
      )}

      {worldMode === 'stage' && (
        /* MODE 3: PETUALANGAN STAGE (PETA PERJALANAN KURIKULUM & RAK TEMATIK) */
        <StageJourneyPicker
          soundEnabled={soundEnabled}
          onSelectChapterStage={handleSelectChapterStage}
          onSelectBookStage={handleSelectBookStage}
          onSelectCustomWorld={(curriculum) => {
            setActiveCustomWorldDeckId(curriculum.deckId);
          }}
          onOpenCreateCustomWorld={handleOpenCreateCustomWorld}
          onNavigateToBookshelf={() => {
            if (onNavigateToOfficialBooks) {
              onNavigateToOfficialBooks();
            } else if (onNavigateTab) {
              onNavigateTab('deck');
            }
          }}
          userCustomWorldList={userCustomWorldList}
          curriculumProgressMap={curriculumProgressMap}
          itemMastery={itemMastery}
        />
      )}

      {worldMode === 'tower' && (
        /* MODE 4: MENARA 1.000 LANTAI (NIHONGO TOWER) */
        activeTowerFloor !== null ? (
          <div className="w-full">
            <TowerSessionRunner
              initialFloor={activeTowerFloor}
              playerProfile={towerProfile}
              soundEnabled={soundEnabled}
              onRewardPlayer={onRewardPlayer}
              onFloorCleared={(_floor, report) => {
                onTowerMastery?.(report.masteryGain);
                setTowerProgress(loadTowerProgress());
              }}
              onExit={() => {
                setActiveTowerFloor(null);
                setTowerProgress(loadTowerProgress());
              }}
            />
          </div>
        ) : (
          <div className="h-[75vh] w-full rounded-3xl overflow-hidden border border-border-subtle shadow-xl bg-surface-base">
            <TowerMap
              currentFloor={towerProgress.currentFloor}
              highestClearedFloor={towerProgress.highestFloorCleared}
              playerProfile={towerProfile}
              onSelectFloor={(floor) => setActiveTowerFloor(floor)}
            />
          </div>
        )
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
          userDecks={userDecks}
          onUpdateDecks={onUpdateDecks}
        />
      )}
    </div>
  );
};
