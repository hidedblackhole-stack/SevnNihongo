import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  ArrowRight,
  BookOpen,
  Plus,
  Compass,
  AlertCircle,
} from 'lucide-react';
import { UserDeck } from '../../types/rpg';
import { CustomCurriculum } from '../../types/curriculum';
import { playSound } from '../../utils/audio';

interface SelectDeckForWorldModalProps {
  isOpen: boolean;
  onClose: () => void;
  decks: UserDeck[];
  onSelectDeck: (deck: UserDeck) => void;
  onGoToBukuSaku: () => void;
  customCurriculums?: Record<string, CustomCurriculum>;
  soundEnabled?: boolean;
}

export const SelectDeckForWorldModal: React.FC<SelectDeckForWorldModalProps> = ({
  isOpen,
  onClose,
  decks,
  onSelectDeck,
  onGoToBukuSaku,
  customCurriculums = {},
  soundEnabled = true,
}) => {
  if (!isOpen) return null;

  // Decks that actually have items
  const validDecks = decks.filter(d => (d.items || []).length > 0);
  const hasNoValidDecks = validDecks.length === 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="panel panel-stitched w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl sm:rounded-3xl shadow-2xl bg-surface-card border border-border-subtle overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between gap-3 bg-surface-elevated/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo/15 text-indigo border border-indigo/30 flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text-primary font-heading tracking-wide">
                  {hasNoValidDecks ? 'Belum Ada Deck di Buku Saku' : 'Pilih Deck untuk Kustom World'}
                </h2>
                <p className="text-[11px] sm:text-xs text-text-secondary">
                  {hasNoValidDecks
                    ? 'Kustom World memerlukan materi dari Buku Saku'
                    : 'Pilih salah satu deck materi untuk dirancang menjadi World belajar'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-inset transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {hasNoValidDecks ? (
              /* EMPTY STATE: USER HAS NO DECKS */
              <div className="text-center py-6 sm:py-8 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center justify-center mx-auto shadow-sm">
                  <AlertCircle className="w-8 h-8" />
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-text-primary font-heading">
                    Deck Buku Saku Masih Kosong
                  </h3>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    Kustom World dirancang dari materi (Kanji, Kosakata, atau Pola Kalimat) yang ada di <strong>Buku Saku</strong> kamu.
                    <br />
                    Silakan buat deck baru atau isi materi terlebih dahulu di Buku Saku, baru setelah itu kamu dapat mengkustomisasi stage-nya.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      onClose();
                      onGoToBukuSaku();
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo hover:bg-indigo/90 text-white font-heading font-bold text-xs shadow-sm border border-indigo/30 transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Buka Buku Saku & Buat Deck</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      onClose();
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold border border-border-subtle bg-surface-inset hover:bg-surface-elevated text-text-secondary"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              /* DECK LIST: USER SELECTS A DECK */
              <div className="space-y-3">
                <p className="text-xs text-text-secondary">
                  Pilih deck yang ingin kamu ubah menjadi petualangan stage bertahap:
                </p>

                <div className="grid grid-cols-1 gap-2.5">
                  {validDecks.map(deck => {
                    const kanjiCount = (deck.items || []).filter(i => i.category === 'kanji').length;
                    const kotobaCount = (deck.items || []).filter(i => i.category === 'kotoba').length;
                    const bunpouCount = (deck.items || []).filter(i => i.category === 'bunpou').length;
                    const hasCurriculum = !!customCurriculums[deck.id];

                    return (
                      <motion.div
                        key={deck.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          playSound('click', soundEnabled);
                          onSelectDeck(deck);
                        }}
                        className="panel p-4 rounded-2xl border border-border-subtle hover:border-indigo/50 bg-surface-card hover:bg-surface-elevated transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-center shrink-0 text-indigo group-hover:border-indigo/40 group-hover:text-amber-300 transition-colors">
                            <Compass className="w-5 h-5" />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-text-primary font-heading group-hover:text-indigo transition-colors">
                                {deck.title}
                              </h4>
                              {hasCurriculum && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                                  🗺️ World Siap
                                </span>
                              )}
                              {deck.level && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-surface-inset text-text-muted border border-border-subtle">
                                  {deck.level}
                                </span>
                              )}
                            </div>

                            {deck.description && (
                              <p className="text-xs text-text-secondary line-clamp-1">
                                {deck.description}
                              </p>
                            )}

                            {/* Item stats */}
                            <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] font-mono">
                              {kanjiCount > 0 && (
                                <span className="text-gold font-bold">
                                  {kanjiCount} Kanji
                                </span>
                              )}
                              {kotobaCount > 0 && (
                                <span className="text-emerald-400 font-bold">
                                  {kotobaCount} Kotoba
                                </span>
                              )}
                              {bunpouCount > 0 && (
                                <span className="text-indigo font-bold">
                                  {bunpouCount} Pola
                                </span>
                              )}
                              <span className="text-text-muted">
                                ({deck.items.length} total item)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="w-full sm:w-auto flex justify-end shrink-0 pt-2 sm:pt-0">
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo/10 text-indigo border border-indigo/25 text-xs font-bold font-heading group-hover:bg-indigo group-hover:text-white transition-all">
                            <span>Kustomisasi Stage</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!hasNoValidDecks && (
            <div className="p-3 sm:p-4 border-t border-border-subtle bg-surface-elevated/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <span className="text-text-muted">
                Ingin materi lain?
              </span>
              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  onClose();
                  onGoToBukuSaku();
                }}
                className="text-indigo hover:text-indigo/80 font-bold flex items-center gap-1 font-heading"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Deck Baru di Buku Saku</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
