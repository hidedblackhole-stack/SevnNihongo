import React, { useState, useRef, useEffect } from 'react';
import { Bookmark, Check, ChevronDown, Plus, Sparkles, X } from 'lucide-react';
import { UserDeck, DeckItemCategory } from '../../types/rpg';
import { playSound } from '../../utils/audio';
import { DEFAULT_BOOKMARK_DECK_ID } from '../../utils/decks';

interface DeckBookmarkPickerProps {
  itemId: string;
  category: DeckItemCategory;
  userDecks?: UserDeck[];
  onToggleDeckItem?: (deckId: string) => void;
  isDefaultBookmarked?: boolean;
  onToggleDefaultBookmark?: () => void;
  soundEnabled?: boolean;
}

export const DeckBookmarkPicker: React.FC<DeckBookmarkPickerProps> = ({
  itemId,
  category,
  userDecks,
  onToggleDeckItem,
  isDefaultBookmarked = false,
  onToggleDefaultBookmark,
  soundEnabled = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const customDecks = (userDecks || []).filter(d => !d.isDefault && d.id !== DEFAULT_BOOKMARK_DECK_ID);
  const hasMultipleDecks = customDecks.length > 0;

  // Is this item in ANY deck?
  const isInAnyDeck = (userDecks || []).some(d =>
    d.items.some(it => it.id === itemId && it.category === category)
  );

  // If there are no custom decks, simply use the 1-click default bookmark button
  if (!hasMultipleDecks) {
    if (!onToggleDefaultBookmark) return null;
    return (
      <button
        type="button"
        onClick={() => {
          onToggleDefaultBookmark();
          playSound('click', soundEnabled);
        }}
        className={`p-1.5 rounded-xl border transition-all ${
          isDefaultBookmarked
            ? 'bg-surface-elevated text-gold border-gold/40 ring-1 ring-gold/30'
            : 'bg-surface-card border-border-subtle text-text-muted hover:text-gold'
        }`}
        title={isDefaultBookmarked ? 'Tersimpan di Buku Saku Bookmark' : 'Simpan ke Buku Saku Bookmark'}
      >
        <Bookmark className={`w-4 h-4 ${isDefaultBookmarked ? 'fill-gold text-gold' : ''}`} />
      </button>
    );
  }

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(prev => !prev);
          playSound('click', soundEnabled);
        }}
        className={`px-2 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${
          isInAnyDeck
            ? 'bg-surface-elevated text-gold border-gold/40 ring-1 ring-gold/30'
            : 'bg-surface-card border-border-subtle text-text-muted hover:text-gold'
        }`}
        title="Atur simpan ke Buku Saku"
      >
        <Bookmark className={`w-4 h-4 ${isInAnyDeck ? 'fill-gold text-gold' : ''}`} />
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-surface-elevated border border-border-primary shadow-2xl p-3 z-[90] space-y-2.5 animate-fade-in backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <span className="text-xs font-heading font-bold text-text-primary flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-gold" />
              <span>Simpan ke Buku Saku</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
            {(userDecks || []).map((deck) => {
              const isIncluded = deck.items.some(
                it => it.id === itemId && it.category === category
              );
              const isDefault = deck.isDefault || deck.id === DEFAULT_BOOKMARK_DECK_ID;

              return (
                <div
                  key={deck.id}
                  onClick={() => {
                    playSound('click', soundEnabled);
                    if (isDefault && onToggleDefaultBookmark) {
                      onToggleDefaultBookmark();
                    } else if (onToggleDeckItem) {
                      onToggleDeckItem(deck.id);
                    }
                  }}
                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isIncluded
                      ? 'bg-surface-card border-gold/40 text-gold'
                      : 'bg-surface-inset border-border-subtle hover:border-border-primary text-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{deck.coverIcon || (isDefault ? '🔖' : '📖')}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-heading font-bold text-text-primary truncate">
                        {deck.title}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {deck.items.length} materi
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                      isIncluded
                        ? 'bg-gold border-gold text-surface-ground'
                        : 'border-border-subtle bg-surface-card'
                    }`}
                  >
                    {isIncluded && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
