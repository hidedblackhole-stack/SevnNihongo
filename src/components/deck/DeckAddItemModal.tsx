import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Plus, Check, Filter } from 'lucide-react';
import { UserDeck, DeckItemCategory } from '../../types/rpg';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { playSound } from '../../utils/audio';

interface SearchResultItem {
  id: string;
  category: DeckItemCategory;
  title: string;
  reading?: string;
  meaning: string;
  level: string;
}

interface DeckAddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDeck: UserDeck;
  onAddItem: (item: { id: string; category: DeckItemCategory }) => void;
  soundEnabled?: boolean;
}

export const DeckAddItemModal: React.FC<DeckAddItemModalProps> = ({
  isOpen,
  onClose,
  targetDeck,
  onAddItem,
  soundEnabled = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'kotoba' | 'kanji' | 'bunpou'>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(30);

  // Set of existing item keys: "category:id"
  const existingItemKeys = useMemo(() => {
    return new Set(targetDeck.items.map(it => `${it.category}:${it.id}`));
  }, [targetDeck.items]);

  // Unified list of searchable items
  const allSearchableItems: SearchResultItem[] = useMemo(() => {
    const results: SearchResultItem[] = [];

    // Kotoba
    for (const item of Object.values(KOTOBA_DATABASE)) {
      results.push({
        id: item.id,
        category: 'kotoba',
        title: item.word,
        reading: item.reading,
        meaning: item.meaningId || item.meaningEn || '',
        level: item.jlpt || 'N5',
      });
    }

    // Kanji
    const seenKanji = new Set<string>();
    for (const item of Object.values(KANJI_DATABASE)) {
      if (item && item.character && !seenKanji.has(item.character)) {
        seenKanji.add(item.character);
        const kunStr = (item.kunyomi || []).join('、');
        const onStr = (item.onyomi || []).join('、');
        const reading = [kunStr, onStr].filter(Boolean).join(' | ');

        results.push({
          id: item.id || item.character,
          category: 'kanji',
          title: item.character,
          reading,
          meaning: item.meaningId || item.meaningEn || '',
          level: item.jlpt || 'N5',
        });
      }
    }

    // Bunpou
    for (const item of Object.values(BUNPOU_DATABASE)) {
      results.push({
        id: item.id,
        category: 'bunpou',
        title: item.title,
        reading: item.formula,
        meaning: item.meaningId || '',
        level: item.level || 'N3',
      });
    }

    return results;
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return allSearchableItems.filter(item => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (levelFilter !== 'all' && item.level !== levelFilter) return false;

      if (!q) return true;

      const titleMatch = item.title.toLowerCase().includes(q);
      const readingMatch = item.reading ? item.reading.toLowerCase().includes(q) : false;
      const meaningMatch = item.meaning.toLowerCase().includes(q);

      return titleMatch || readingMatch || meaningMatch;
    });
  }, [allSearchableItems, searchQuery, categoryFilter, levelFilter]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-surface-ground/80 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="panel w-full max-w-2xl border border-border-subtle rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-surface-inset">
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-text-primary flex items-center gap-2">
                <span>{targetDeck.coverIcon || '📖'}</span>
                <span>Tambah Materi ke &quot;{targetDeck.title}&quot;</span>
              </h3>
              <p className="text-xs text-text-secondary">
                Cari dari ribuan kosakata, kanji, dan tata bahasa
              </p>
            </div>

            <button
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-card transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-border-subtle space-y-3 bg-surface-card">
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(30);
                }}
                placeholder="Cari kanji, kata, pola kalimat, atau arti bahasa Indonesia..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-inset border border-border-subtle focus:border-border-primary focus:outline-none text-xs sm:text-sm text-text-primary font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {/* Category Pills */}
              {[
                { id: 'all', label: 'Semua Kategori' },
                { id: 'kotoba', label: 'Kosakata' },
                { id: 'kanji', label: 'Kanji' },
                { id: 'bunpou', label: 'Tata Bahasa' },
              ].map((c) => {
                const isSelected = categoryFilter === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCategoryFilter(c.id as any);
                      setVisibleCount(30);
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

              <div className="h-4 w-px bg-border-subtle shrink-0 mx-1" />

              {/* Level Filter */}
              {['all', 'N5', 'N4', 'N3', 'N2', 'N1'].map((lvl) => {
                const isSelected = levelFilter === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => {
                      setLevelFilter(lvl);
                      setVisibleCount(30);
                      playSound('click', soundEnabled);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all border shrink-0 ${
                      isSelected
                        ? 'bg-surface-elevated text-gold border-gold/40'
                        : 'bg-surface-inset/60 text-text-muted border-border-subtle hover:text-text-secondary'
                    }`}
                  >
                    {lvl === 'all' ? 'Semua JLPT' : lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {displayedItems.length === 0 ? (
              <div className="text-center py-12 text-text-muted text-xs">
                Tidak ada materi yang cocok dengan pencarian &quot;{searchQuery}&quot;
              </div>
            ) : (
              <>
                <p className="text-[11px] font-mono text-text-muted px-1">
                  Menampilkan {displayedItems.length} dari {filteredItems.length} hasil
                </p>

                <div className="space-y-2">
                  {displayedItems.map((item) => {
                    const key = `${item.category}:${item.id}`;
                    const isAlreadyInDeck = existingItemKeys.has(key);

                    return (
                      <div
                        key={key}
                        className="panel p-3 sm:p-3.5 rounded-2xl border border-border-subtle flex items-center justify-between gap-3 hover:border-border-primary transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border border-border-subtle bg-surface-inset text-text-secondary">
                              {item.category}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border border-border-subtle bg-surface-inset text-text-primary">
                              {item.level}
                            </span>
                            {item.reading && (
                              <span className="text-[11px] font-mono text-text-secondary truncate max-w-[200px]">
                                {item.reading}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm sm:text-base font-jp text-text-primary">
                            {item.title}
                          </h4>
                          <p className="text-xs text-text-secondary truncate">
                            {item.meaning}
                          </p>
                        </div>

                        <button
                          disabled={isAlreadyInDeck}
                          onClick={() => {
                            playSound('click', soundEnabled);
                            onAddItem({ id: item.id, category: item.category });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-heading flex items-center gap-1.5 transition-all shrink-0 ${
                            isAlreadyInDeck
                              ? 'bg-surface-inset text-text-muted border border-border-subtle cursor-default'
                              : 'bg-surface-elevated text-text-primary border border-border-primary hover:scale-105 shadow-sm'
                          }`}
                        >
                          {isAlreadyInDeck ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-gold" />
                              <span>Sudah Ada</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {displayedItems.length < filteredItems.length && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setVisibleCount(prev => prev + 30)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-text-primary bg-surface-inset border border-border-subtle hover:bg-surface-elevated transition-colors"
                    >
                      Muat Lebih Banyak ({filteredItems.length - displayedItems.length} sisa)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
