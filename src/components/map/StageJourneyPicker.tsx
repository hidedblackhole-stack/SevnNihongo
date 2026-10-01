import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  BookOpen, 
  Layers, 
  ChevronRight, 
  ChevronDown, 
  Play, 
  Star, 
  Library, 
  Plus, 
  Award,
  Bookmark
} from 'lucide-react';
import { OFFICIAL_BOOKS } from '../../data/officialBooks';
import { OfficialBook, OfficialChapter } from '../../types/books';
import { CustomCurriculum, CustomCurriculumProgress } from '../../types/curriculum';
import { ItemMasteryRecord } from '../../types/content';
import { playSound } from '../../utils/audio';

interface StageJourneyPickerProps {
  soundEnabled?: boolean;
  onSelectChapterStage: (chapter: OfficialChapter, book: OfficialBook) => void;
  onSelectBookStage: (book: OfficialBook) => void;
  onSelectCustomWorld: (curriculum: CustomCurriculum) => void;
  onOpenCreateCustomWorld: () => void;
  onNavigateToBookshelf?: () => void;
  userCustomWorldList: CustomCurriculum[];
  curriculumProgressMap: Record<string, CustomCurriculumProgress>;
  itemMastery?: Record<string, ItemMasteryRecord>;
}

export const StageJourneyPicker: React.FC<StageJourneyPickerProps> = ({
  soundEnabled = true,
  onSelectChapterStage,
  onSelectBookStage,
  onSelectCustomWorld,
  onOpenCreateCustomWorld,
  onNavigateToBookshelf,
  userCustomWorldList,
  curriculumProgressMap,
  itemMastery = {},
}) => {
  const [activeTab, setActiveTab] = useState<'curriculum' | 'thematic' | 'custom'>('curriculum');
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);

  // Group official books into curriculum vs thematic
  const curriculumBooks = useMemo(() => {
    return OFFICIAL_BOOKS.filter(b => b.category !== 'thematic');
  }, []);

  const thematicBooks = useMemo(() => {
    return OFFICIAL_BOOKS.filter(b => b.category === 'thematic');
  }, []);

  const handleToggleExpandBook = (bookId: string) => {
    playSound('click', soundEnabled);
    setExpandedBookId(prev => prev === bookId ? null : bookId);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER: PERJALANAN PETUALANGAN */}
      <div className="panel panel-stitched p-5 rounded-3xl bg-surface-card border border-border-subtle shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-gold font-bold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>Peta Perjalanan & Stage Petualangan</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-text-primary tracking-wide">
              Pilih Perjalanan Belajar
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
              Pilih kurikulum resmi, rak tematik situasional, atau deck Buku Sakumu untuk langsung menjelajahi peta stage RPG dan bertarung melawan musuh materi!
            </p>
          </div>

          {onNavigateToBookshelf && (
            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onNavigateToBookshelf();
              }}
              className="btn-physical-secondary text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 shrink-0 font-heading cursor-pointer whitespace-nowrap"
            >
              <Library className="w-3.5 h-3.5 text-gold" />
              <span>Buka Rak Buku Materi</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </button>
          )}
        </div>

        {/* 2. CATEGORY TABS */}
        <div className="pt-3 border-t border-border-subtle flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setActiveTab('curriculum');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-heading transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'curriculum'
                ? 'bg-gold/15 text-gold border border-border-subtle shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Kurikulum Resmi ({curriculumBooks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setActiveTab('thematic');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-heading transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'thematic'
                ? 'bg-rose-500/15 text-rose-400 border border-border-subtle shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Rak Tematik ({thematicBooks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setActiveTab('custom');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-heading transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'custom'
                ? 'bg-indigo/15 text-indigo border border-border-subtle shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Buku Saku Saya ({userCustomWorldList.length})</span>
          </button>
        </div>
      </div>

      {/* 3. LIST OF BOOKS / JOURNEYS */}
      {activeTab === 'custom' ? (
        /* CUSTOM WORLDS LIST */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold font-heading text-text-primary uppercase tracking-wider">
              World Kustom dari Koleksi Bookmark ({userCustomWorldList.length})
            </span>
            <button
              type="button"
              onClick={onOpenCreateCustomWorld}
              className="text-xs text-indigo hover:text-indigo/80 font-bold flex items-center gap-1 font-heading cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat World Baru</span>
            </button>
          </div>

          {userCustomWorldList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userCustomWorldList.map(curriculum => {
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
                      onSelectCustomWorld(curriculum);
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

                      <h3 className="text-base sm:text-lg font-bold text-text-primary font-heading leading-snug group-hover:text-gold transition-colors">
                        {curriculum.deckTitle}
                      </h3>

                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                        Petualangan dengan {totalStages} stage materi belajar Kanji, Kotoba, dan Pola Kalimat untuk tantangan battler dan pengumpulan EXP.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border-subtle/70 space-y-3 relative z-10 mt-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-text-muted font-medium">Progres Stage:</span>
                          <span className="font-bold text-text-primary">{clearedCount} / {totalStages} ({pct}%)</span>
                        </div>
                        <div className="notebook-ruler-track">
                          <div className="notebook-ruler-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-1">
                        <button type="button" className="btn-physical-primary text-xs">
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Masuk Stage Peta</span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center panel panel-stitched rounded-3xl border border-dashed border-border-subtle bg-surface-card/40 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo/10 border border-border-subtle flex items-center justify-center text-indigo mx-auto">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold font-heading text-text-primary">
                Belum Ada Petualangan Kustom
              </h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                Kamu bisa membuat petualangan stage RPG dari bookmark kata atau kanji yang kamu simpan di Buku Saku!
              </p>
              <button
                type="button"
                onClick={onOpenCreateCustomWorld}
                className="btn-physical-primary text-xs py-2 px-4 rounded-xl inline-flex items-center gap-1.5 mt-2 cursor-pointer font-heading"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Rancang World Dari Buku Saku</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* OFFICIAL OR THEMATIC BOOKS LIST */
        <div className="space-y-4">
          {(activeTab === 'curriculum' ? curriculumBooks : thematicBooks).map(book => {
            const isExpanded = expandedBookId === book.id;
            const totalItems = book.chapters.reduce((acc, c) => acc + c.items.length, 0);

            return (
              <div
                key={book.id}
                className="panel panel-stitched rounded-3xl bg-surface-card border border-border-subtle shadow-xs overflow-hidden transition-all"
              >
                {/* Book Card Header */}
                <div 
                  onClick={() => handleToggleExpandBook(book.id)}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-inset/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gold/15 text-gold border border-border-subtle flex items-center justify-center text-2xl shrink-0 shadow-xs">
                      {book.coverIcon || '📖'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-inset border border-border-subtle text-text-muted font-bold uppercase">
                          {book.level}
                        </span>
                        <span className="text-[11px] font-mono text-text-muted">
                          {book.chapters.length} Bab · {totalItems} Materi
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-text-primary font-heading leading-snug mt-0.5">
                        {book.title}
                      </h3>
                      <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
                        {book.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playSound('attack', soundEnabled);
                        onSelectBookStage(book);
                      }}
                      className="btn-physical-primary text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 font-heading cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Masuk Stage Seluruh Bab</span>
                    </button>

                    <div className="p-2 rounded-xl bg-surface-inset border border-border-subtle text-text-muted">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Chapter List */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border-subtle bg-surface-inset/30 p-4 sm:p-5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs font-mono text-text-muted px-1 pb-1">
                        <span>Pilih Bab / Deck untuk Masuk Stage Peta:</span>
                        <span>{book.chapters.length} Bab Tersedia</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {book.chapters.map(chapter => (
                          <div
                            key={chapter.id}
                            className="p-3.5 rounded-2xl bg-surface-card border border-border-subtle hover:border-border-primary shadow-2xs flex items-center justify-between gap-3 group transition-all"
                          >
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono text-gold font-bold uppercase block">
                                Bab {chapter.chapterNumber}
                              </span>
                              <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading truncate group-hover:text-gold transition-colors">
                                {chapter.titleId}
                              </h4>
                              <span className="text-[10px] font-mono text-text-muted mt-0.5 block">
                                {chapter.items.length} Kartu Materi
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                playSound('attack', soundEnabled);
                                onSelectChapterStage(chapter, book);
                              }}
                              className="btn-physical-primary text-[11px] py-1.5 px-3 rounded-lg flex items-center gap-1 font-heading cursor-pointer shrink-0"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Mainkan</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
