import React, { useState, useMemo } from 'react';
import { BookOpen, Sparkles, ChevronRight, Layers, Award } from 'lucide-react';
import { OfficialBook } from '../../types/books';
import { OFFICIAL_BOOKS } from '../../data/officialBooks';
import { ItemMasteryRecord } from '../../types/content';
import { playSound } from '../../utils/audio';

interface BookshelfViewProps {
  onSelectBook: (book: OfficialBook) => void;
  soundEnabled?: boolean;
  itemMastery?: Record<string, ItemMasteryRecord>;
}

const BOOK_LEVEL_FILTERS = [
  { id: 'ALL', label: 'Semua Buku' },
  { id: 'KANA', label: 'KANA' },
  { id: 'N5', label: 'N5' },
  { id: 'N4', label: 'N4' },
  { id: 'N3', label: 'N3' },
  { id: 'N2', label: 'N2' },
  { id: 'N1', label: 'N1' },
  { id: 'Kaigo', label: 'Kaigo · SSW' },
];

export const BookshelfView: React.FC<BookshelfViewProps> = ({
  onSelectBook,
  soundEnabled = true,
  itemMastery = {},
}) => {
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  const filteredBooks = useMemo(() => {
    if (selectedFilter === 'ALL') return OFFICIAL_BOOKS;
    return OFFICIAL_BOOKS.filter(b => b.level === selectedFilter);
  }, [selectedFilter]);

  // Helper to calculate book mastery percentage
  const getBookStats = (book: OfficialBook) => {
    let totalItems = 0;
    let masteredCount = 0;

    for (const ch of book.chapters) {
      for (const it of ch.items) {
        totalItems++;
        const record = itemMastery[it.id];
        if (record && (record.status === 'MASTERED' || record.status === 'PERFECTED' || (record.masteryPercentage && record.masteryPercentage >= 80))) {
          masteredCount++;
        }
      }
    }

    const pct = totalItems > 0 ? Math.round((masteredCount / totalItems) * 100) : 0;
    return { totalItems, masteredCount, pct };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner / Header */}
      <div className="panel p-5 sm:p-6 rounded-3xl space-y-4 shadow-sm border border-border-subtle bg-gradient-to-br from-surface-card via-surface-card to-surface-inset">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              <span>Rak Buku Kurikulum Resmi · 本棚</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide flex items-center gap-2.5">
              <span className="text-gold">📚</span>
              <span>Buku Pelajaran & Modul Belajar</span>
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl">
              Buku teks standar kurikulum resmi Jepang yang dipecah menjadi bab-bab terfokus (15–25 materi per bab). Bebas kelelahan belajar, praktis, dan terarah.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold border border-gold/30 flex items-center justify-center font-bold font-mono text-base">
              {OFFICIAL_BOOKS.length}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-text-muted block">Koleksi Buku</span>
              <span className="text-xs font-bold text-text-primary font-heading">Siap Dipelajari</span>
            </div>
          </div>
        </div>

        {/* Level Filters */}
        <div className="pt-2 border-t border-border-subtle flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {BOOK_LEVEL_FILTERS.map(f => {
            const isActive = selectedFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setSelectedFilter(f.id);
                  playSound('click', soundEnabled);
                }}
                className={`notebook-filter-tab text-xs py-1.5 px-3 whitespace-nowrap ${isActive ? 'active' : ''}`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Books */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {filteredBooks.map((book) => {
          const { totalItems, pct } = getBookStats(book);

          return (
            <div
              key={book.id}
              onClick={() => {
                onSelectBook(book);
                playSound('click', soundEnabled);
              }}
              className={`panel p-5 sm:p-6 rounded-3xl border ${book.colorTheme.borderAccent} bg-surface-card hover:shadow-xl transition-all duration-200 cursor-pointer group flex flex-col justify-between relative overflow-hidden`}
            >
              {/* Top Accent Gradient Bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${book.colorTheme.cardBg}`} />

              <div className="space-y-4">
                {/* Header Row: Book Spine Icon + Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-14 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner flex flex-col items-center justify-center group-hover:scale-105 transition-transform shrink-0 relative">
                      <span className="text-xl font-bold font-jp text-text-primary">
                        {book.coverIcon}
                      </span>
                      <span className="text-[8px] font-mono text-text-muted mt-0.5 uppercase tracking-tighter">
                        BOOK
                      </span>
                      {/* Book spine line effect */}
                      <div className="absolute left-1.5 top-1 bottom-1 w-0.5 bg-border-subtle/50 rounded-full" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider border ${book.colorTheme.badgeBg}`}>
                          {book.level}
                        </span>
                        <span className="text-[11px] font-mono text-text-muted">
                          {book.chapters.length} Bab Terstruktur
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-text-primary font-heading group-hover:text-gold transition-colors mt-1">
                        {book.title}
                      </h2>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-surface-inset text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Bottom Details & Progress */}
              <div className="pt-4 mt-4 border-t border-border-subtle space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-text-secondary" />
                    <span>{totalItems} Materi Pembelajaran</span>
                  </span>
                  <span className="text-text-primary font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-gold" />
                    <span>{pct}% Kuasai</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-surface-inset rounded-full overflow-hidden border border-border-subtle">
                  <div
                    className="h-full bg-gradient-to-r from-gold to-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
