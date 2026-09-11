import React, { useState, useMemo } from 'react';
import { Search, Filter, GitBranch, ChevronDown, Bookmark } from 'lucide-react';
import { ScrollIcon } from '../ui/EngravingIcons';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { ALL_GRAMMAR_FUNCTION_CATEGORIES } from '../../data/bunpouMetadata';
import { BunpouItem } from '../../types/content';
import { BunpouDetailModal } from './BunpouDetailModal';
import { playSound } from '../../utils/audio';
import { UserDeck } from '../../types/rpg';
import { isItemBookmarked } from '../../utils/decks';

const LEVEL_OPTIONS = [
  { value: 'all', label: 'Semua Level' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
];

interface BunpouLibraryViewProps {
  soundEnabled?: boolean;
  userDecks?: UserDeck[];
  onToggleBookmark?: (id: string, category: 'bunpou', notes?: string) => void;
}

export const BunpouLibraryView: React.FC<BunpouLibraryViewProps> = ({
  soundEnabled = true,
  userDecks,
  onToggleBookmark,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(40);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [functionFilter, setFunctionFilter] = useState<string>('Semua Fungsi');
  const [selectedItem, setSelectedItem] = useState<BunpouItem | null>(null);

  const allBunpou = useMemo(() => Object.values(BUNPOU_DATABASE), []);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allBunpou.length, N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
    for (const item of allBunpou) {
      if (counts[item.level] !== undefined) {
        counts[item.level]++;
      }
    }
    return counts;
  }, [allBunpou]);

  // Unique list of categories for pill filters
  const categories = useMemo(() => {
    return ['Semua Fungsi', ...ALL_GRAMMAR_FUNCTION_CATEGORIES];
  }, []);

  const filteredBunpou = useMemo(() => {
    return allBunpou.filter((item) => {
      // 1. Level Filter
      if (levelFilter !== 'all' && item.level !== levelFilter) {
        return false;
      }

      // 2. Function Category Filter
      if (functionFilter !== 'Semua Fungsi') {
        const matchesCategory = item.functions?.some(fn => 
          fn.toLowerCase().includes(functionFilter.toLowerCase())
        );
        if (!matchesCategory) return false;
      }

      // 3. Text Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const titleMatch = item.title.toLowerCase().includes(q);
      const meaningMatch = item.meaningId?.toLowerCase().includes(q);
      const formulaMatch = item.formula?.toLowerCase().includes(q);
      const functionMatch = item.functions?.some(fn => fn.toLowerCase().includes(q));

      return titleMatch || meaningMatch || formulaMatch || functionMatch;
    });
  }, [allBunpou, levelFilter, functionFilter, searchQuery]);

  const displayedBunpou = useMemo(() => {
    return filteredBunpou.slice(0, visibleCount);
  }, [filteredBunpou, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 40);
    playSound('click', soundEnabled);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
      {/* Header Banner */}
      <div className="panel p-4 sm:p-5 rounded-3xl border border-border-subtle shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center text-text-primary shrink-0 shadow-inner">
            <ScrollIcon className="w-6 h-6 text-text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-wide font-heading">
              Kamus Tata Bahasa (Bunpou)
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary font-medium">
              Kamus {allBunpou.length.toLocaleString()} pola tata bahasa JLPT (N5〜N1) terstruktur berdasarkan fungsi, rumus, dan nuansa.
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 pr-3 text-xs font-mono text-text-secondary bg-surface-inset px-3 py-1.5 rounded-xl border border-border-subtle">
          <span>{allBunpou.length.toLocaleString()} Pola</span>
        </div>
      </div>

      {/* Search & Level Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Cari rumus (みたいだ、わけ、らしい), romaji, arti, atau fungsi..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(40);
            }}
            className="w-full pl-10 pr-4 py-3 bg-surface-inset border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-primary transition-all shadow-inner font-medium"
          />
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen);
              playSound('click', soundEnabled);
            }}
            className="flex items-center gap-2.5 bg-surface-card hover:bg-surface-elevated px-4 py-3 rounded-2xl border border-border-subtle hover:border-border-primary transition-all text-xs font-bold text-text-primary shadow-sm"
          >
            <Filter className="w-4 h-4 text-text-secondary" />
            <span>{levelFilter === 'all' ? 'Semua Level' : `Level ${levelFilter}`}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-inset border border-border-subtle text-text-secondary">
              {levelFilter === 'all' ? `${allBunpou.length} Rumus` : `${(levelCounts[levelFilter] || 0).toLocaleString()} Rumus`}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsDropdownOpen(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-surface-card border border-border-subtle shadow-xl z-50 p-1.5 space-y-1 animate-fade-in backdrop-blur-xl">
                {LEVEL_OPTIONS.map((opt) => {
                  const isSelected = levelFilter === opt.value;
                  const count = levelCounts[opt.value] || 0;
                  const badgeText = opt.value === 'all' ? `${count.toLocaleString()} Rumus` : count.toLocaleString();

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setLevelFilter(opt.value);
                        setVisibleCount(40);
                        setIsDropdownOpen(false);
                        playSound('click', soundEnabled);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-surface-elevated text-text-primary border border-border-primary'
                          : 'text-text-primary hover:bg-surface-elevated border border-transparent'
                      }`}
                    >
                      <span className="font-heading tracking-wide text-sm">{opt.label}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-border-subtle bg-surface-inset text-text-secondary">
                        {badgeText}
                      </span>
                    </button>
                  );
                })}

                <div className="pt-2 px-2 pb-1 border-t border-border-subtle text-[10px] text-text-muted font-mono text-center flex items-center justify-center gap-1.5">
                  <span>{allBunpou.length} pola tata bahasa</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Function Categories Filter (Pills) */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-text-secondary font-heading uppercase tracking-wider pl-1">
          Kategori Fungsi (機能):
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {ALL_GRAMMAR_FUNCTION_CATEGORIES.map((cat) => {
            const isSelected = functionFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setFunctionFilter(cat);
                  setVisibleCount(40);
                  playSound('click', soundEnabled);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border font-jp ${
                  isSelected
                    ? 'bg-surface-elevated text-text-primary border-border-primary shadow-sm font-black'
                    : 'bg-surface-card border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-strong'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-xs text-text-muted px-1 flex items-center justify-between">
        <span>Menampilkan <strong className="text-text-primary">{displayedBunpou.length}</strong> dari <strong className="text-text-primary">{filteredBunpou.length}</strong> pola</span>
      </div>

      {/* Grammar Cards Grid: Antique Washi Karuta Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {displayedBunpou.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              setSelectedItem(item);
              playSound('click', soundEnabled);
            }}
            className="panel flex flex-col justify-between p-4 sm:p-5 group shadow-sm hover:shadow-md transition-all cursor-pointer rounded-2xl border border-border-subtle hover:border-border-primary space-y-3"
          >
            {/* Top row: Level + Function Tags + Bookmark */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-surface-inset text-text-primary text-[10px] font-mono font-bold border border-border-subtle">
                    {item.baseLevel ? `Fondasi ${item.baseLevel}` : `Level ${item.level}`}
                  </span>
                  {item.functions?.slice(0, 2).map((fn, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-lg bg-surface-inset text-text-secondary text-[10px] font-jp border border-border-subtle">
                      {fn}
                    </span>
                  ))}
                </div>

                {onToggleBookmark && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(item.id, 'bunpou');
                      playSound('click', soundEnabled);
                    }}
                    className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                      isItemBookmarked(userDecks, item.id, 'bunpou')
                        ? 'bg-surface-elevated text-gold border-gold/40 ring-1 ring-gold/30'
                        : 'bg-surface-inset text-text-muted hover:text-gold border-border-subtle'
                    }`}
                    title={isItemBookmarked(userDecks, item.id, 'bunpou') ? 'Tersimpan di Buku Saku' : 'Simpan ke Buku Saku'}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isItemBookmarked(userDecks, item.id, 'bunpou') ? 'fill-gold text-gold' : ''}`} />
                  </button>
                )}
              </div>

              {/* Title & Meaning */}
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-text-primary font-heading transition-colors leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-text-secondary line-clamp-1 pt-0.5">
                  {item.meaningId}
                </p>
              </div>

              {/* Formula Preview */}
              <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle font-mono text-xs text-text-primary line-clamp-1">
                📐 {item.formula}
              </div>

              {/* Nuance or Description */}
              {item.nuance && (
                <div className="text-xs text-text-secondary line-clamp-2 pt-0.5">
                  <span className="text-[11px] leading-relaxed text-text-muted">
                    {item.nuance}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Row: Sub-formulas count / preview */}
            <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] text-text-muted">
              {item.subFormulas && item.subFormulas.length > 0 ? (
                <div className="flex items-center gap-1 text-text-secondary font-medium">
                  <GitBranch className="w-3 h-3" />
                  <span>{item.subFormulas.length} Cabang Sub-Rumus</span>
                </div>
              ) : (
                <span>1 Rumus Standar</span>
              )}

              <span className="text-text-secondary group-hover:text-text-primary font-bold group-hover:translate-x-0.5 transition-all">
                Lihat Detail & Rumus →
              </span>
            </div>
          </div>
        ))}
      </div>


      {/* Empty State */}
      {displayedBunpou.length === 0 && (
        <div className="panel p-12 text-center rounded-3xl space-y-2">
          <p className="text-sm font-bold text-text-primary">Tidak ada tata bahasa yang cocok.</p>
          <p className="text-xs text-text-muted">Coba ubah kata kunci pencarian atau reset filter fungsi.</p>
        </div>
      )}

      {/* Load More Button */}
      {displayedBunpou.length < filteredBunpou.length && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLoadMore}
            className="btn-cta px-6 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md font-heading"
          >
            Muat Lebih Banyak ({filteredBunpou.length - displayedBunpou.length} tersisa)
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <BunpouDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          soundEnabled={soundEnabled}
          isBookmarked={Boolean(isItemBookmarked(userDecks, selectedItem.id, 'bunpou'))}
          onToggleBookmark={onToggleBookmark ? () => onToggleBookmark(selectedItem.id, 'bunpou') : undefined}
        />
      )}
    </div>
  );
};
