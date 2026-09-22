import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Compass, 
  CheckCircle2, 
  ChevronRight, 
  Play, 
  Bookmark, 
  Sparkles, 
  Plus, 
  Star, 
  Swords,
  Copy,
  Check,
  BookOpen,
  Layers,
  Library
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
import { TEMPLATE_DECKS, getTemplateDeckById, cloneTemplateToUserDecks } from '../../data/templateDecks';
import { SelectDeckForWorldModal } from '../curriculum/SelectDeckForWorldModal';
import { CurriculumConfigModal } from '../curriculum/CurriculumConfigModal';
import { CustomWorldView } from '../curriculum/CustomWorldView';
import { TemplateDeckDetailView } from '../deck/TemplateDeckDetailView';
import { DungeonType, DungeonPayload, generateDungeonSession } from '../../utils/dungeonGenerator';
import { DungeonPortalHub } from '../dungeon/DungeonPortalHub';
import { DungeonSetupModal } from '../dungeon/DungeonSetupModal';
import { DungeonSessionRunner } from '../dungeon/DungeonSessionRunner';

export type WorldNavView = 'world_hub' | 'level_hub' | 'maps' | 'dungeon';

interface WorldViewProps {
  currentMapId?: string;
  currentWorldId?: string;
  resetSignal?: number;
  stageProgress?: Record<string, StageClearData>;
  playerLevel?: number;
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

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  KANA: { label: 'KANA · Pemula', color: 'text-emerald-400 border-emerald-500/30', bg: 'bg-emerald-500/10' },
  N5: { label: 'JLPT N5 · Dasar', color: 'text-teal border-teal/30', bg: 'bg-teal/10' },
  N4: { label: 'JLPT N4 · Pra-Menengah', color: 'text-matcha border-matcha/30', bg: 'bg-matcha/10' },
  N3: { label: 'JLPT N3 · Menengah', color: 'text-gold border-gold/30', bg: 'bg-gold/10' },
  N2: { label: 'JLPT N2 · Mahir', color: 'text-indigo border-indigo/30', bg: 'bg-indigo/10' },
  N1: { label: 'JLPT N1 · Ahli', color: 'text-crimson border-crimson/30', bg: 'bg-crimson/10' },
  Kaigo: { label: 'Kaigo · SSW', color: 'text-amber-400 border-amber-500/30', bg: 'bg-amber-500/10' },
};

const LEVEL_FILTERS = [
  { id: 'ALL', label: 'Semua Level' },
  { id: 'KANA', label: 'KANA' },
  { id: 'N5', label: 'N5' },
  { id: 'N4', label: 'N4' },
  { id: 'N3', label: 'N3' },
  { id: 'N2', label: 'N2' },
  { id: 'N1', label: 'N1' },
  { id: 'Kaigo', label: 'Kaigo · SSW' },
];

export const WorldView: React.FC<WorldViewProps> = ({
  currentWorldId,
  resetSignal,
  soundEnabled = true,
  onNavigateTab,
  onNavigateToOfficialBooks,
  userDecks,
  onUpdateDecks,
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
  const [worldMode, setWorldMode] = useState<'training' | 'dungeon'>(() => {
    return navView === 'dungeon' ? 'dungeon' : 'training';
  });
  const [setupDungeonType, setSetupDungeonType] = useState<DungeonType | null>(null);
  const [activeDungeonPayload, setActiveDungeonPayload] = useState<DungeonPayload | null>(null);

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
    } else if (navView === 'world_hub') {
      setWorldMode('training');
    }
  }, [navView]);

  useEffect(() => {
    if (resetSignal !== undefined && resetSignal > 0) {
      setActiveCustomWorldDeckId(null);
      setSelectedTemplateDeck(null);
      setIsPlayingTemplateWorld(false);
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

  // Filtered official template decks
  const filteredTemplates = useMemo(() => {
    if (selectedLevelFilter === 'ALL') return TEMPLATE_DECKS;
    return TEMPLATE_DECKS.filter(d => d.level === selectedLevelFilter);
  }, [selectedLevelFilter]);

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

  // 2. IF VIEWING A TEMPLATE DECK (EXACTLY LIKE BUKU SAKU DECK LIBRARY VIEW):
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

  // 3. IF A USER CUSTOM WORLD IS CURRENTLY OPENED FOR PLAYING:
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
                : 'Tantang stage petualangan RPG untuk menguji pemahaman materi dan mengumpulkan EXP & Gold.'}
            </p>
          </div>
        </div>

      </div>

      {/* 2. MODE SWITCHER BAR: WORLD VS DUNGEON */}
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
            <span className="inline sm:hidden">Petualangan</span>
            <span className="hidden sm:inline">Petualangan World (Grinding EXP)</span>
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
      ) : (

      /* VIEW MODE PETUALANGAN: WORLD GRINDING & PUSAT MATERI */
      <div className="space-y-6">

        {/* 1. SHORTCUT: BELAJAR MATERI DI RAK BUKU */}
        <div className="panel p-4 sm:p-5 rounded-2xl bg-surface-card border border-border-subtle shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0">
              <Library className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gold font-heading">
                  Belajar Materi
                </span>
                <span className="text-[11px] text-text-muted font-mono">• 7 Modul Kurikulum Resmi</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-text-primary font-heading truncate">
                Rak Buku Kurikulum Resmi
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed line-clamp-1">
                Kuasai materi terstruktur per bab (Minna no Nihongo, Soumatome, dll.) dengan Flashcard & Menulis di Rak Buku.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              if (onNavigateToOfficialBooks) {
                onNavigateToOfficialBooks();
              } else if (onNavigateTab) {
                onNavigateTab('deck');
              }
            }}
            className="btn-physical-primary text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto font-heading cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4" />
            <span>Buka Rak Buku Kurikulum</span>
            <ChevronRight className="w-4 h-4 opacity-70" />
          </button>
        </div>

        {/* 2. SEKSI: WORLD PETUALANGAN & GRINDING EXP */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-primary font-heading flex items-center gap-2">
                <Compass className="w-4 h-4 text-gold" />
                <span>World Petualangan & Grinding EXP ({userCustomWorldList.length})</span>
              </h3>
              <p className="text-xs text-text-secondary font-body mt-0.5">
                Mainkan stage petualangan RPG untuk mengumpulkan EXP, Gold, dan Mastery item.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateCustomWorld}
              className="text-xs text-indigo hover:text-indigo/80 font-bold flex items-center gap-1 font-heading cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat World Baru</span>
            </button>
          </div>

          {userCustomWorldList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userCustomWorldList.map((curriculum) => {
                const prog = curriculumProgressMap[curriculum.deckId];
                const totalStages = curriculum.stages.length;
                const clearedCount = Object.values(prog?.stages || {}).filter(s => s.status === 'completed').length;
                const pct = Math.round((clearedCount / Math.max(1, totalStages)) * 100);
                const totalStars = Object.values(prog?.stages || {}).reduce((acc, s) => acc + (s.stars || 0), 0);

                return (
                  <motion.div
                    key={curriculum.id}
                    whileHover={{ y: -2 }}
                    className="notebook-adventure-card group cursor-pointer"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      setActiveCustomWorldDeckId(curriculum.deckId);
                    }}
                  >
                    <div className="space-y-2 relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="notebook-level-stamp uppercase">
                          Petualangan Aktif
                        </span>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="text-gold flex items-center gap-1 font-bold">
                            <Star className="w-3.5 h-3.5 fill-gold" />
                            <span>{totalStars}</span>
                          </span>
                          <span className="text-text-secondary font-bold">{totalStages} Stage</span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-text-primary font-heading leading-snug group-hover:text-gold transition-colors">
                          {curriculum.deckTitle}
                        </h3>
                      </div>

                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed mt-1">
                        Petualangan beranggotakan {totalStages} stage materi belajar Kanji, Kotoba, dan Pola Kalimat untuk tantangan battler dan pengumpulan EXP.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border-subtle/70 space-y-3 relative z-10 mt-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-text-muted font-medium">Progres Stage:</span>
                          <span className="font-bold text-text-primary">{clearedCount} / {totalStages} ({pct}%)</span>
                        </div>
                        <div className="notebook-ruler-track">
                          <div
                            className="notebook-ruler-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-1">
                        <button
                          type="button"
                          className="btn-physical-primary text-xs"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Masuk World</span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 sm:p-10 text-center panel rounded-3xl border border-dashed border-border-subtle bg-surface-card/40 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mx-auto shadow-inner">
                <Compass className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold font-heading text-text-primary">
                  Belum Ada Petualangan World yang Aktif
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  World adalah tempat bermain untuk menguji kemampuan dan mengumpulkan EXP! Buka bab materi di <strong>Rak Buku Kurikulum</strong> lalu klik tombol <strong>⚔️ Petualangan World</strong>, atau buat World baru dari Buku Saku kamu.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playSound('click', soundEnabled);
                    if (onNavigateToOfficialBooks) {
                      onNavigateToOfficialBooks();
                    } else if (onNavigateTab) {
                      onNavigateTab('deck');
                    }
                  }}
                  className="btn-physical-primary text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer font-heading"
                >
                  <Library className="w-3.5 h-3.5" />
                  <span>Buka Rak Buku Kurikulum</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleOpenCreateCustomWorld}
                  className="btn-physical-secondary text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer font-heading"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat World dari Buku Saku</span>
                </button>
              </div>
            </div>
          )}
        </div>


        {/* 6. BANNER MENUJU BUKU SAKU */}
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
