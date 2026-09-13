import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  BookMarked,
  Layers,
  ArrowLeft,
  Trash2,
  Edit2,
  PenTool,
  Play,
  Search,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Bookmark,
  RefreshCw,
  Download,
  Sliders,
  Compass,
  X
} from 'lucide-react';
import { UserDeck, DeckItemCategory, DeckType, DeckItemRef } from '../../types/rpg';
import { CurriculumConfigModal } from '../curriculum/CurriculumConfigModal';
import { CustomWorldView } from '../curriculum/CustomWorldView';
import { CustomCurriculum, CustomCurriculumProgress } from '../../types/curriculum';
import {
  generateCurriculum,
  initializeCurriculumProgress,
  loadAllCustomCurriculums,
  saveCustomCurriculum,
  loadAllCurriculumProgress,
  saveCurriculumProgress,
} from '../../utils/curriculumEngine';
import { KotobaItem, KanjiItem, BunpouItem, ItemMasteryRecord } from '../../types/content';
import {
  ensureUserDecks,
  createCustomDeck,
  updateCustomDeck,
  deleteCustomDeck,
  addItemToDeck,
  removeItemFromDeck,
  addMultipleItemsToDeck,
  importBookmarkItemsToDeck,
  clearDeckItems,
  generatePresetDeckItems,
  resolveDeckItem,
  ResolvedDeckItem,
  DEFAULT_BOOKMARK_DECK_ID,
} from '../../utils/decks';
import { playSound } from '../../utils/audio';
import { CreateDeckModal } from './CreateDeckModal';
import { DeckAddItemModal } from './DeckAddItemModal';
import { DeckFlashcardRunner } from './DeckFlashcardRunner';
import { DeckWritingRunner } from './DeckWritingRunner';
import { KotobaDetailModal } from '../library/KotobaDetailModal';
import { KanjiDetailModal } from '../library/KanjiDetailModal';
import { BunpouDetailModal } from '../library/BunpouDetailModal';

interface BukuSakuViewProps {
  userDecks?: UserDeck[];
  onUpdateDecks: (decks: UserDeck[]) => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => void;
  soundEnabled?: boolean;
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

export const BukuSakuView: React.FC<BukuSakuViewProps> = ({
  userDecks,
  onUpdateDecks,
  onRewardPlayer,
  onCompleteStudyItem,
  soundEnabled = true,
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
}) => {
  const decks = useMemo(() => ensureUserDecks(userDecks), [userDecks]);

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<UserDeck | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [activeRunner, setActiveRunner] = useState<'flashcard' | 'writing' | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'kotoba' | 'kanji' | 'bunpou'>('all');
  const [deckSearch, setDeckSearch] = useState('');

  // Quick preset generator modal for active deck
  const [isQuickPresetModalOpen, setIsQuickPresetModalOpen] = useState(false);
  const [quickPresetLevel, setQuickPresetLevel] = useState<'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'>('N5');
  const [quickPresetCount, setQuickPresetCount] = useState<number>(10);

  // Item detail inspection modals
  const [selectedKotoba, setSelectedKotoba] = useState<KotobaItem | null>(null);
  const [selectedKanji, setSelectedKanji] = useState<KanjiItem | null>(null);
  const [selectedBunpou, setSelectedBunpou] = useState<BunpouItem | null>(null);

  // Custom Curriculum & World state
  const [activeWorldDeckId, setActiveWorldDeckId] = useState<string | null>(null);
  const [isCurriculumConfigOpen, setIsCurriculumConfigOpen] = useState(false);
  const [curriculums, setCurriculums] = useState<Record<string, CustomCurriculum>>(() => loadAllCustomCurriculums());
  const [curriculumProgressMap, setCurriculumProgressMap] = useState<Record<string, CustomCurriculumProgress>>(() => loadAllCurriculumProgress());

  // Active selected deck object
  const activeDeck = useMemo(() => {
    if (!selectedDeckId) return null;
    return decks.find(d => d.id === selectedDeckId) || null;
  }, [decks, selectedDeckId]);

  // Resolved items for active deck
  const resolvedItems = useMemo(() => {
    if (!activeDeck) return [];
    return activeDeck.items
      .map(ref => resolveDeckItem(ref))
      .filter((it): it is ResolvedDeckItem => it !== null);
  }, [activeDeck]);

  // Filtered items inside active deck (category + search)
  const displayedItems = useMemo(() => {
    let list = resolvedItems;
    if (categoryFilter !== 'all') {
      list = list.filter(it => it.category === categoryFilter);
    }
    const q = deckSearch.toLowerCase().trim();
    if (q) {
      list = list.filter(it =>
        it.displayTitle.toLowerCase().includes(q) ||
        (it.displayReading && it.displayReading.toLowerCase().includes(q)) ||
        it.displayMeaning.toLowerCase().includes(q)
      );
    }
    return list;
  }, [resolvedItems, categoryFilter, deckSearch]);

  // Overall Statistics across all decks
  const statsSummary = useMemo(() => {
    let totalItems = 0;
    let kotobaCount = 0;
    let kanjiCount = 0;
    let bunpouCount = 0;

    for (const d of decks) {
      for (const it of d.items) {
        totalItems++;
        if (it.category === 'kotoba') kotobaCount++;
        else if (it.category === 'kanji') kanjiCount++;
        else if (it.category === 'bunpou') bunpouCount++;
      }
    }

    return { totalDecks: decks.length, totalItems, kotobaCount, kanjiCount, bunpouCount };
  }, [decks]);

  // Handlers for Deck Management
  const handleSaveDeck = (data: {
    title: string;
    description: string;
    type: DeckType;
    coverIcon: string;
    initialItems?: DeckItemRef[];
  }) => {
    if (editingDeck) {
      const updated = updateCustomDeck(decks, editingDeck.id, data);
      onUpdateDecks(updated);
      setEditingDeck(null);
    } else {
      const { userDecks: updated, newDeck } = createCustomDeck(decks, data);
      onUpdateDecks(updated);
      setSelectedDeckId(newDeck.id);
      playSound('correct', soundEnabled);
    }
  };

  const handleDeleteDeck = (deckId: string) => {
    if (window.confirm('Hapus deck ini beserta daftar latihannya?')) {
      playSound('click', soundEnabled);
      const updated = deleteCustomDeck(decks, deckId);
      onUpdateDecks(updated);
      if (selectedDeckId === deckId) {
        setSelectedDeckId(null);
      }
    }
  };

  const handleAddItem = (item: { id: string; category: DeckItemCategory }) => {
    if (!activeDeck) return;
    const updated = addItemToDeck(decks, activeDeck.id, item);
    onUpdateDecks(updated);
  };

  const handleAddMultipleItems = (items: { id: string; category: DeckItemCategory }[]) => {
    if (!activeDeck) return;
    const updated = addMultipleItemsToDeck(decks, activeDeck.id, items);
    onUpdateDecks(updated);
  };

  const handleRemoveItem = (itemId: string, category: DeckItemCategory) => {
    if (!activeDeck) return;
    playSound('click', soundEnabled);
    const updated = removeItemFromDeck(decks, activeDeck.id, itemId, category);
    onUpdateDecks(updated);
  };

  const handleImportBookmarks = () => {
    if (!activeDeck) return;
    const { userDecks: updated, importedCount } = importBookmarkItemsToDeck(decks, activeDeck.id);
    if (importedCount > 0) {
      playSound('correct', soundEnabled);
      onUpdateDecks(updated);
      alert(`Berhasil mengimpor ${importedCount} materi baru dari Buku Saku Bookmark!`);
    } else {
      alert('Semua materi dari Bookmark sudah ada di dalam deck ini.');
    }
  };

  const handleClearDeck = () => {
    if (!activeDeck) return;
    if (window.confirm('Kosongkan semua materi dari deck ini? (Deck tidak akan terhapus)')) {
      playSound('click', soundEnabled);
      const updated = clearDeckItems(decks, activeDeck.id);
      onUpdateDecks(updated);
    }
  };

  const handleApplyQuickPreset = () => {
    if (!activeDeck) return;
    const items = generatePresetDeckItems({
      type: activeDeck.type || 'mixed',
      level: quickPresetLevel,
      count: quickPresetCount,
    });
    const updated = addMultipleItemsToDeck(decks, activeDeck.id, items);
    onUpdateDecks(updated);
    setIsQuickPresetModalOpen(false);
    playSound('correct', soundEnabled);
  };

  const writableCount = useMemo(() => {
    return resolvedItems.filter(it => it.category === 'kanji' || it.category === 'kotoba').length;
  }, [resolvedItems]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Runner Modes */}
      {activeRunner === 'flashcard' && activeDeck && (
        <DeckFlashcardRunner
          deck={activeDeck}
          onClose={() => setActiveRunner(null)}
          onReward={onRewardPlayer}
          onCompleteStudyItem={onCompleteStudyItem}
          soundEnabled={soundEnabled}
        />
      )}

      {activeRunner === 'writing' && activeDeck && (
        <DeckWritingRunner
          deck={activeDeck}
          onClose={() => setActiveRunner(null)}
          onReward={onRewardPlayer}
          onCompleteStudyItem={onCompleteStudyItem}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Main Container */}
      {activeWorldDeckId && curriculums[activeWorldDeckId] ? (
        <CustomWorldView
          curriculum={curriculums[activeWorldDeckId]}
          progress={curriculumProgressMap[activeWorldDeckId] || initializeCurriculumProgress(curriculums[activeWorldDeckId])}
          onUpdateProgress={(updated) => {
            setCurriculumProgressMap(prev => ({ ...prev, [activeWorldDeckId]: updated }));
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
          onReconfigure={() => setIsCurriculumConfigOpen(true)}
          onBack={() => setActiveWorldDeckId(null)}
          soundEnabled={soundEnabled}
        />
      ) : !activeDeck ? (
        /* ================= DECK LIST VIEW ================= */
        <div className="space-y-6">
          {/* Header & Stats Banner */}
          <div className="panel p-5 sm:p-6 rounded-3xl space-y-4 shadow-sm border border-border-subtle">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
                  Buku Catatan Mandiri & Sistem Koleksi
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide flex items-center gap-2.5">
                  <span className="text-gold">手帳</span>
                  <span>Buku Saku Petualang</span>
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary">
                  Kelola koleksi bookmark, buat deck kustom dengan preset otomatis, dan latih hafalanmu secara intensif.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingDeck(null);
                  setIsCreateModalOpen(true);
                  playSound('click', soundEnabled);
                }}
                className="px-4 py-2.5 rounded-2xl bg-surface-elevated text-text-primary font-heading font-bold text-xs border border-border-primary shadow-sm hover:scale-105 flex items-center gap-2 transition-all shrink-0"
              >
                <Plus className="w-4 h-4 text-gold" />
                <span>Buat Deck Baru</span>
              </button>
            </div>

            {/* Quick Summary Pill Bar */}
            <div className="pt-2 border-t border-border-subtle grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle">
                <span className="text-[10px] font-mono text-text-muted uppercase">Total Deck</span>
                <p className="text-base font-bold font-mono text-text-primary">{statsSummary.totalDecks}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle">
                <span className="text-[10px] font-mono text-text-muted uppercase">Total Materi Tersimpan</span>
                <p className="text-base font-bold font-mono text-gold">{statsSummary.totalItems}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle">
                <span className="text-[10px] font-mono text-text-muted uppercase">Kosakata Disimpan</span>
                <p className="text-base font-bold font-mono text-text-primary">{statsSummary.kotobaCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle">
                <span className="text-[10px] font-mono text-text-muted uppercase">Kanji & Pola Kalimat</span>
                <p className="text-base font-bold font-mono text-text-primary">{statsSummary.kanjiCount + statsSummary.bunpouCount}</p>
              </div>
            </div>
          </div>

          {/* Grid of Decks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => {
              const isDefault = deck.isDefault || deck.id === DEFAULT_BOOKMARK_DECK_ID;
              const itemCount = deck.items.length;
              const kotobaCount = deck.items.filter(it => it.category === 'kotoba').length;
              const kanjiCount = deck.items.filter(it => it.category === 'kanji').length;
              const bunpouCount = deck.items.filter(it => it.category === 'bunpou').length;

              return (
                <div
                  key={deck.id}
                  onClick={() => {
                    setSelectedDeckId(deck.id);
                    setCategoryFilter('all');
                    setDeckSearch('');
                    playSound('click', soundEnabled);
                  }}
                  className={`panel p-5 rounded-3xl border cursor-pointer group transition-all duration-200 flex flex-col justify-between hover:shadow-lg ${
                    isDefault
                      ? 'border-gold/40 bg-surface-card hover:border-gold/70'
                      : 'border-border-subtle hover:border-border-primary bg-surface-card'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Icon, Badge, and Quick Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl sm:text-3xl p-2 rounded-2xl bg-surface-inset border border-border-subtle group-hover:scale-110 transition-transform">
                          {deck.coverIcon || (isDefault ? '🔖' : '📖')}
                        </span>
                        <div>
                          {isDefault ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider font-mono text-gold bg-gold/10 px-2 py-0.5 rounded-md border border-gold/30">
                              ⭐ Bookmark Utama
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider font-mono text-text-secondary bg-surface-inset px-2 py-0.5 rounded-md border border-border-subtle">
                              {deck.type || 'mixed'}
                            </span>
                          )}
                          {curriculums[deck.id] && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider font-mono text-indigo bg-indigo/10 px-2 py-0.5 rounded-md border border-indigo/30">
                              🗺️ World
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Options menu (for custom decks) */}
                      {!isDefault && (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setEditingDeck(deck);
                              setIsCreateModalOpen(true);
                              playSound('click', soundEnabled);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-inset transition-colors"
                            title="Edit Deck"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDeck(deck.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-wine-accent hover:bg-surface-inset transition-colors"
                            title="Hapus Deck"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="font-heading font-bold text-base text-text-primary group-hover:text-gold transition-colors">
                        {deck.title}
                      </h3>
                      <p className="text-xs text-text-secondary line-clamp-2 mt-1">
                        {deck.description || 'Tidak ada deskripsi tambahan.'}
                      </p>
                    </div>
                  </div>

                  {/* Footer Meta */}
                  <div className="pt-4 mt-4 border-t border-border-subtle flex items-center justify-between text-xs">
                    <div className="text-[11px] font-mono text-text-muted">
                      {itemCount === 0 ? (
                        <span>0 materi</span>
                      ) : (
                        <span>
                          {itemCount} materi ({kotobaCount} 語 • {kanjiCount} 字 • {bunpouCount} 文)
                        </span>
                      )}
                    </div>

                    <span className="font-heading font-bold text-xs text-text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Buka Deck &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= DECK DETAIL VIEW ================= */
        <div className="space-y-5">
          {/* Back & Breadcrumb Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              onClick={() => {
                setSelectedDeckId(null);
                setDeckSearch('');
                playSound('click', soundEnabled);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold font-heading text-text-secondary hover:text-text-primary bg-surface-card border border-border-subtle hover:border-border-primary flex items-center gap-2 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Daftar Buku Saku</span>
            </button>

            {activeDeck && !activeDeck.isDefault && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingDeck(activeDeck);
                    setIsCreateModalOpen(true);
                    playSound('click', soundEnabled);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary bg-surface-card border border-border-subtle hover:border-border-primary flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Info Deck</span>
                </button>
                <button
                  onClick={() => handleDeleteDeck(activeDeck.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-wine-accent hover:bg-surface-inset border border-wine-accent/30 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            )}
          </div>

          {/* Deck Header Banner */}
          <div className="panel p-5 sm:p-6 rounded-3xl border border-border-subtle space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="text-3xl sm:text-4xl p-2.5 rounded-2xl bg-surface-inset border border-border-subtle shrink-0">
                  {activeDeck.coverIcon || '📖'}
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeDeck.isDefault ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-gold bg-gold/10 px-2 py-0.5 rounded-md border border-gold/30">
                        ⭐ Bookmark Utama
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-text-secondary bg-surface-inset px-2 py-0.5 rounded-md border border-border-subtle">
                        Tipe: {activeDeck.type}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-text-muted">
                      {resolvedItems.length} item materi tersimpan
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold font-heading text-text-primary">
                    {activeDeck.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary">
                    {activeDeck.description || 'Koleksi catatan materi pilihan untuk dipelajari intensif.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Practice Launchers & Add Material */}
              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end">
                {/* Custom World / Curriculum Button */}
                <button
                  disabled={resolvedItems.length === 0}
                  onClick={() => {
                    playSound('click', soundEnabled);
                    if (curriculums[activeDeck.id]) {
                      setActiveWorldDeckId(activeDeck.id);
                    } else {
                      setIsCurriculumConfigOpen(true);
                    }
                  }}
                  className={`px-4 py-2.5 rounded-2xl font-heading font-bold text-xs flex items-center gap-2 transition-all ${
                    resolvedItems.length === 0
                      ? 'opacity-40 cursor-not-allowed bg-surface-inset text-text-muted border border-border-subtle'
                      : 'bg-indigo hover:bg-indigo/90 text-white border border-indigo/30 shadow-sm hover:scale-[1.02]'
                  }`}
                  title="Jadikan deck ini kurikulum petualangan stage bergaya World"
                >
                  <Compass className="w-3.5 h-3.5 text-gold" />
                  <span>{curriculums[activeDeck.id] ? 'Petualangan World' : 'Rancang World Stage'}</span>
                </button>

                {/* Flashcard Button */}
                <button
                  disabled={resolvedItems.length === 0}
                  onClick={() => {
                    setActiveRunner('flashcard');
                    playSound('click', soundEnabled);
                  }}
                  className={`px-4 py-2.5 rounded-2xl font-heading font-bold text-xs flex items-center gap-2 transition-all ${
                    resolvedItems.length === 0
                      ? 'opacity-40 cursor-not-allowed bg-surface-inset text-text-muted border border-border-subtle'
                      : 'bg-surface-elevated text-text-primary border border-border-primary shadow-sm hover:scale-105'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 text-gold fill-gold" />
                  <span>Mulai Flashcard</span>
                </button>

                {/* Writing Button */}
                <button
                  disabled={writableCount === 0}
                  onClick={() => {
                    setActiveRunner('writing');
                    playSound('click', soundEnabled);
                  }}
                  className={`px-4 py-2.5 rounded-2xl font-heading font-bold text-xs flex items-center gap-2 transition-all ${
                    writableCount === 0
                      ? 'opacity-40 cursor-not-allowed bg-surface-inset text-text-muted border border-border-subtle'
                      : 'bg-surface-elevated text-text-primary border border-border-primary shadow-sm hover:scale-105'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5 text-indigo" />
                  <span>Latihan Menulis ({writableCount})</span>
                </button>

                {/* Add Material Button */}
                <button
                  onClick={() => {
                    setIsAddItemModalOpen(true);
                    playSound('click', soundEnabled);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-surface-inset hover:bg-surface-elevated text-text-primary font-heading font-bold text-xs border border-border-subtle hover:border-border-primary flex items-center gap-2 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-gold" />
                  <span>+ Cari Materi</span>
                </button>
              </div>
            </div>

            {/* Secondary Toolbar: Preset & Tools */}
            <div className="pt-3 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {[
                  { id: 'all', label: `Semua (${resolvedItems.length})` },
                  { id: 'kotoba', label: `Kosakata (${resolvedItems.filter(i => i.category === 'kotoba').length})` },
                  { id: 'kanji', label: `Kanji (${resolvedItems.filter(i => i.category === 'kanji').length})` },
                  { id: 'bunpou', label: `Tata Bahasa (${resolvedItems.filter(i => i.category === 'bunpou').length})` },
                ].map((c) => {
                  const isSelected = categoryFilter === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCategoryFilter(c.id as any);
                        playSound('click', soundEnabled);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono whitespace-nowrap transition-all border shrink-0 ${
                        isSelected
                          ? 'bg-surface-elevated text-text-primary border-border-primary shadow-sm font-black'
                          : 'bg-surface-inset text-text-secondary border-border-subtle hover:text-text-primary'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions Group */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* In-deck search input */}
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={deckSearch}
                    onChange={(e) => setDeckSearch(e.target.value)}
                    placeholder="Cari di deck..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs rounded-xl bg-surface-inset border border-border-subtle text-text-primary focus:outline-none focus:border-border-primary"
                  />
                </div>

                {/* Quick Preset Generator Button */}
                <button
                  onClick={() => {
                    setIsQuickPresetModalOpen(true);
                    playSound('click', soundEnabled);
                  }}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary bg-surface-inset hover:bg-surface-elevated border border-border-subtle flex items-center gap-1.5 transition-colors"
                  title="Isi Cepat Berdasarkan Level JLPT"
                >
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  <span>Isi Preset JLPT</span>
                </button>

                {/* Import Bookmarks Button (only for non-default decks) */}
                {!activeDeck.isDefault && (
                  <button
                    onClick={handleImportBookmarks}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary bg-surface-inset hover:bg-surface-elevated border border-border-subtle flex items-center gap-1.5 transition-colors"
                    title="Salin materi dari Buku Saku Bookmark ke deck ini"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-gold" />
                    <span>Impor Bookmark</span>
                  </button>
                )}

                {/* Clear Deck Button */}
                {resolvedItems.length > 0 && (
                  <button
                    onClick={handleClearDeck}
                    className="p-1 rounded-xl text-text-muted hover:text-wine-accent hover:bg-surface-inset border border-transparent hover:border-border-subtle transition-colors"
                    title="Kosongkan semua materi dari deck ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Items List inside Deck */}
          {displayedItems.length === 0 ? (
            <div className="panel p-8 sm:p-12 rounded-3xl border border-border-subtle text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-surface-inset text-gold border border-border-subtle flex items-center justify-center mx-auto shadow-inner">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-heading font-bold text-text-primary">
                  {resolvedItems.length === 0 ? 'Buku Saku Ini Masih Kosong' : 'Tidak Ada Materi Yang Cocok'}
                </h3>
                <p className="text-xs text-text-secondary max-w-md mx-auto">
                  {resolvedItems.length === 0
                    ? 'Pilih salah satu opsi di bawah untuk mengisi deck ini secara instan atau cari materi favoritmu.'
                    : 'Coba ubah kata kunci pencarian atau ganti filter kategori di atas.'}
                </p>
              </div>

              {resolvedItems.length === 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsQuickPresetModalOpen(true);
                      playSound('click', soundEnabled);
                    }}
                    className="px-4 py-2.5 rounded-2xl font-heading font-bold text-xs bg-surface-elevated text-text-primary border border-border-primary shadow-sm hover:scale-105 inline-flex items-center gap-2 transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-gold" />
                    <span>⚡ Isi Cepat Otomatis (Preset Level)</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsAddItemModalOpen(true);
                      playSound('click', soundEnabled);
                    }}
                    className="px-4 py-2.5 rounded-2xl font-heading font-bold text-xs bg-surface-inset hover:bg-surface-elevated text-text-primary border border-border-subtle inline-flex items-center gap-2 transition-all"
                  >
                    <Plus className="w-4 h-4 text-gold" />
                    <span>+ Cari Materi di Perpustakaan</span>
                  </button>

                  {!activeDeck.isDefault && (
                    <button
                      onClick={handleImportBookmarks}
                      className="px-4 py-2.5 rounded-2xl font-heading font-bold text-xs bg-surface-inset hover:bg-surface-elevated text-text-secondary hover:text-text-primary border border-border-subtle inline-flex items-center gap-2 transition-all"
                    >
                      <Bookmark className="w-4 h-4 text-gold" />
                      <span>🔖 Impor dari Bookmark</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setDeckSearch('');
                    setCategoryFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-inset hover:bg-surface-elevated text-text-primary border border-border-subtle transition-colors"
                >
                  Reset Pencarian & Filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {displayedItems.map((item) => {
                return (
                  <div
                    key={`${item.category}:${item.ref.id}`}
                    className="panel p-4 sm:p-5 rounded-2xl border border-border-subtle hover:border-border-primary transition-all flex items-start justify-between gap-3 group shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase border border-border-subtle bg-surface-inset text-text-secondary">
                          {item.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border border-border-subtle bg-surface-inset text-text-primary">
                          {item.level}
                        </span>
                        {item.displayReading && (
                          <span className="text-xs font-mono text-wine-accent font-bold truncate max-w-[200px]">
                            {item.displayReading}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-base sm:text-lg font-jp text-text-primary">
                        {item.displayTitle}
                      </h4>
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                        {item.displayMeaning}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-1">
                      <button
                        onClick={() => {
                          playSound('click', soundEnabled);
                          if (item.category === 'kotoba' && item.kotoba) {
                            setSelectedKotoba(item.kotoba);
                          } else if (item.category === 'kanji' && item.kanji) {
                            setSelectedKanji(item.kanji);
                          } else if (item.category === 'bunpou' && item.bunpou) {
                            setSelectedBunpou(item.bunpou);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-surface-inset hover:bg-surface-elevated text-text-secondary hover:text-text-primary text-xs font-bold border border-border-subtle transition-colors"
                        title="Lihat Detail Lengkap"
                      >
                        Detail
                      </button>

                      <button
                        onClick={() => handleRemoveItem(item.ref.id, item.category)}
                        className="p-1.5 rounded-xl text-text-muted hover:text-wine-accent hover:bg-surface-inset transition-colors"
                        title="Hapus dari deck ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateDeckModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingDeck(null);
        }}
        onSave={handleSaveDeck}
        editingDeck={editingDeck}
        userDecks={decks}
        soundEnabled={soundEnabled}
      />

      {activeDeck && (
        <DeckAddItemModal
          isOpen={isAddItemModalOpen}
          onClose={() => setIsAddItemModalOpen(false)}
          targetDeck={activeDeck}
          onAddItem={handleAddItem}
          onAddMultipleItems={handleAddMultipleItems}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Quick Preset Generator Modal for Active Deck */}
      {isQuickPresetModalOpen && activeDeck && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-surface-ground/80 backdrop-blur-sm animate-fade-in">
          <div className="panel w-full max-w-md border border-border-subtle rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold" />
                <h3 className="font-heading font-bold text-base text-text-primary">
                  Isi Cepat Preset JLPT
                </h3>
              </div>
              <button
                onClick={() => setIsQuickPresetModalOpen(false)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Target Level JLPT
                </label>
                <div className="grid grid-cols-6 gap-1">
                  {(['all', 'N5', 'N4', 'N3', 'N2', 'N1'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setQuickPresetLevel(lvl)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                        quickPresetLevel === lvl
                          ? 'bg-surface-elevated text-gold border-gold/40 shadow-sm'
                          : 'bg-surface-inset text-text-muted border-border-subtle'
                      }`}
                    >
                      {lvl === 'all' ? 'Semua' : lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Jumlah Materi Ditambahkan
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 20, 30, 50].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuickPresetCount(cnt)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                        quickPresetCount === cnt
                          ? 'bg-surface-elevated text-text-primary border-border-primary'
                          : 'bg-surface-inset text-text-muted border-border-subtle'
                      }`}
                    >
                      {cnt} Item
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle text-text-secondary">
                Materi akan disaring sesuai tipe deck (<strong>{activeDeck.type}</strong>) dan dimasukkan langsung ke dalam deck ini tanpa menghapus materi yang sudah ada.
              </div>
            </div>

            <div className="pt-2 border-t border-border-subtle flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsQuickPresetModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-text-secondary hover:bg-surface-inset"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyQuickPreset}
                className="px-4 py-1.5 rounded-xl text-xs font-heading font-bold bg-surface-elevated text-text-primary border border-border-primary shadow-sm hover:scale-102 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-gold" />
                <span>Tambahkan {quickPresetCount} Item</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modals */}
      <KotobaDetailModal
        isOpen={Boolean(selectedKotoba)}
        item={selectedKotoba}
        onClose={() => setSelectedKotoba(null)}
        soundEnabled={soundEnabled}
      />

      <KanjiDetailModal
        isOpen={Boolean(selectedKanji)}
        item={selectedKanji}
        onClose={() => setSelectedKanji(null)}
        soundEnabled={soundEnabled}
      />

      {selectedBunpou && (
        <BunpouDetailModal
          item={selectedBunpou}
          onClose={() => setSelectedBunpou(null)}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Curriculum Config Modal */}
      <CurriculumConfigModal
        isOpen={isCurriculumConfigOpen}
        deck={activeDeck || (activeWorldDeckId ? decks.find(d => d.id === activeWorldDeckId) || null : null)}
        onClose={() => setIsCurriculumConfigOpen(false)}
        onGenerate={(config) => {
          const targetDeck = activeDeck || (activeWorldDeckId ? decks.find(d => d.id === activeWorldDeckId) || null : null);
          if (!targetDeck) return;
          const generated = generateCurriculum(targetDeck, config);
          saveCustomCurriculum(generated);
          setCurriculums(prev => ({ ...prev, [targetDeck.id]: generated }));

          const initialProg = initializeCurriculumProgress(generated);
          saveCurriculumProgress(initialProg);
          setCurriculumProgressMap(prev => ({ ...prev, [targetDeck.id]: initialProg }));

          setIsCurriculumConfigOpen(false);
          setActiveWorldDeckId(targetDeck.id);
        }}
        soundEnabled={soundEnabled}
      />
    </div>
  );
};
