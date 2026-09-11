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
  Sparkles
} from 'lucide-react';
import { UserDeck, DeckItemCategory, DeckType } from '../../types/rpg';
import { KotobaItem, KanjiItem, BunpouItem } from '../../types/content';
import {
  ensureUserDecks,
  createCustomDeck,
  updateCustomDeck,
  deleteCustomDeck,
  addItemToDeck,
  removeItemFromDeck,
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
  soundEnabled?: boolean;
}

export const BukuSakuView: React.FC<BukuSakuViewProps> = ({
  userDecks,
  onUpdateDecks,
  onRewardPlayer,
  soundEnabled = true,
}) => {
  const decks = useMemo(() => ensureUserDecks(userDecks), [userDecks]);

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<UserDeck | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [activeRunner, setActiveRunner] = useState<'flashcard' | 'writing' | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'kotoba' | 'kanji' | 'bunpou'>('all');

  // Item detail inspection modals
  const [selectedKotoba, setSelectedKotoba] = useState<KotobaItem | null>(null);
  const [selectedKanji, setSelectedKanji] = useState<KanjiItem | null>(null);
  const [selectedBunpou, setSelectedBunpou] = useState<BunpouItem | null>(null);

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

  // Filtered items inside active deck
  const displayedItems = useMemo(() => {
    if (categoryFilter === 'all') return resolvedItems;
    return resolvedItems.filter(it => it.category === categoryFilter);
  }, [resolvedItems, categoryFilter]);

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
  const handleSaveDeck = (data: { title: string; description: string; type: DeckType; coverIcon: string }) => {
    if (editingDeck) {
      const updated = updateCustomDeck(decks, editingDeck.id, data);
      onUpdateDecks(updated);
      setEditingDeck(null);
    } else {
      const updated = createCustomDeck(decks, data);
      onUpdateDecks(updated);
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

  const handleRemoveItem = (itemId: string, category: DeckItemCategory) => {
    if (!activeDeck) return;
    playSound('click', soundEnabled);
    const updated = removeItemFromDeck(decks, activeDeck.id, itemId, category);
    onUpdateDecks(updated);
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
          soundEnabled={soundEnabled}
        />
      )}

      {activeRunner === 'writing' && activeDeck && (
        <DeckWritingRunner
          deck={activeDeck}
          onClose={() => setActiveRunner(null)}
          onReward={onRewardPlayer}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Main Container */}
      {!activeDeck ? (
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
                  Kelola koleksi bookmark, buat deck kustom, dan latih materi favoritmu melalui Flashcard atau Menulis.
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
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedDeckId(null);
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
                  <span>Edit Deck</span>
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
                      {resolvedItems.length} item materi
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
                  <span>+ Tambah Materi</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs by Category */}
            <div className="pt-3 border-t border-border-subtle flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-[11px] font-bold text-text-secondary font-heading uppercase tracking-wider shrink-0 pl-1">
                Kategori:
              </span>
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono whitespace-nowrap transition-all border shrink-0 ${
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
          </div>

          {/* Items List inside Deck */}
          {displayedItems.length === 0 ? (
            <div className="panel p-8 sm:p-12 rounded-3xl border border-border-subtle text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-surface-inset text-gold border border-border-subtle flex items-center justify-center mx-auto shadow-inner">
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-heading font-bold text-text-primary">
                  Belum Ada Materi di Bagian Ini
                </h3>
                <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                  {resolvedItems.length === 0
                    ? 'Deck ini masih kosong. Cari kanji, kosakata, atau pola kalimat dari seluruh perpustakaan untuk ditambahkan.'
                    : 'Tidak ada item dengan kategori ini di dalam deck.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddItemModalOpen(true);
                  playSound('click', soundEnabled);
                }}
                className="px-5 py-2.5 rounded-2xl font-heading font-bold text-xs bg-surface-elevated text-text-primary border border-border-primary shadow-sm hover:scale-105 inline-flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4 text-gold" />
                <span>+ Cari & Tambah Materi Sekarang</span>
              </button>
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
        soundEnabled={soundEnabled}
      />

      {activeDeck && (
        <DeckAddItemModal
          isOpen={isAddItemModalOpen}
          onClose={() => setIsAddItemModalOpen(false)}
          targetDeck={activeDeck}
          onAddItem={handleAddItem}
          soundEnabled={soundEnabled}
        />
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
    </div>
  );
};
