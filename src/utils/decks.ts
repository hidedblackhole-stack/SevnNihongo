import { UserDeck, DeckItemRef, DeckItemCategory, DeckType } from '../types/rpg';
import { KotobaItem, KanjiItem, BunpouItem } from '../types/content';
import { KOTOBA_DATABASE } from '../data/kotoba';
import { KANJI_DATABASE } from '../data/kanji';
import { BUNPOU_DATABASE } from '../data/bunpou';

export const DEFAULT_BOOKMARK_DECK_ID = 'default_bookmark';

export function createDefaultBookmarkDeck(): UserDeck {
  return {
    id: DEFAULT_BOOKMARK_DECK_ID,
    title: 'Buku Saku Bookmark',
    description: 'Koleksi otomatis materi dan catatan yang kamu tandai sebagai favorit dari perpustakaan.',
    type: 'mixed',
    isDefault: true,
    coverIcon: '🔖',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
  };
}

export function ensureUserDecks(decks?: UserDeck[]): UserDeck[] {
  if (!decks || !Array.isArray(decks) || decks.length === 0) {
    return [createDefaultBookmarkDeck()];
  }
  const hasDefault = decks.some(d => d.id === DEFAULT_BOOKMARK_DECK_ID || d.isDefault);
  if (!hasDefault) {
    return [createDefaultBookmarkDeck(), ...decks];
  }
  return decks;
}

export function isItemBookmarked(
  userDecks: UserDeck[] | undefined,
  id: string,
  category: DeckItemCategory
): boolean {
  const decks = ensureUserDecks(userDecks);
  const bookmarkDeck = decks.find(d => d.id === DEFAULT_BOOKMARK_DECK_ID || d.isDefault);
  if (!bookmarkDeck) return false;

  return bookmarkDeck.items.some(
    item => item.id === id && item.category === category
  );
}

export function toggleBookmarkItem(
  userDecks: UserDeck[] | undefined,
  id: string,
  category: DeckItemCategory,
  notes?: string
): { userDecks: UserDeck[]; added: boolean } {
  const currentDecks = ensureUserDecks(userDecks);
  const now = new Date().toISOString();

  let added = false;
  const updatedDecks = currentDecks.map(deck => {
    if (deck.id === DEFAULT_BOOKMARK_DECK_ID || deck.isDefault) {
      const exists = deck.items.some(it => it.id === id && it.category === category);
      if (exists) {
        added = false;
        return {
          ...deck,
          updatedAt: now,
          items: deck.items.filter(it => !(it.id === id && it.category === category)),
        };
      } else {
        added = true;
        const newItem: DeckItemRef = {
          id,
          category,
          addedAt: now,
          notes,
        };
        return {
          ...deck,
          updatedAt: now,
          items: [newItem, ...deck.items],
        };
      }
    }
    return deck;
  });

  return { userDecks: updatedDecks, added };
}

export function addItemToDeck(
  userDecks: UserDeck[] | undefined,
  deckId: string,
  itemRef: Omit<DeckItemRef, 'addedAt'>
): UserDeck[] {
  const currentDecks = ensureUserDecks(userDecks);
  const now = new Date().toISOString();

  return currentDecks.map(deck => {
    if (deck.id === deckId) {
      const exists = deck.items.some(it => it.id === itemRef.id && it.category === itemRef.category);
      if (exists) return deck;

      const newItem: DeckItemRef = {
        ...itemRef,
        addedAt: now,
      };
      return {
        ...deck,
        updatedAt: now,
        items: [newItem, ...deck.items],
      };
    }
    return deck;
  });
}

export function removeItemFromDeck(
  userDecks: UserDeck[] | undefined,
  deckId: string,
  itemId: string,
  category: DeckItemCategory
): UserDeck[] {
  const currentDecks = ensureUserDecks(userDecks);
  const now = new Date().toISOString();

  return currentDecks.map(deck => {
    if (deck.id === deckId) {
      return {
        ...deck,
        updatedAt: now,
        items: deck.items.filter(it => !(it.id === itemId && it.category === category)),
      };
    }
    return deck;
  });
}

export function createCustomDeck(
  userDecks: UserDeck[] | undefined,
  data: {
    title: string;
    description?: string;
    type: DeckType;
    coverIcon?: string;
  }
): UserDeck[] {
  const currentDecks = ensureUserDecks(userDecks);
  const now = new Date().toISOString();
  const id = `deck_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const newDeck: UserDeck = {
    id,
    title: data.title.trim() || 'Deck Baru',
    description: data.description?.trim() || '',
    type: data.type || 'mixed',
    coverIcon: data.coverIcon || '📖',
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    items: [],
  };

  return [...currentDecks, newDeck];
}

export function updateCustomDeck(
  userDecks: UserDeck[] | undefined,
  deckId: string,
  updates: Partial<Pick<UserDeck, 'title' | 'description' | 'type' | 'coverIcon'>>
): UserDeck[] {
  const currentDecks = ensureUserDecks(userDecks);
  const now = new Date().toISOString();

  return currentDecks.map(deck => {
    if (deck.id === deckId) {
      return {
        ...deck,
        ...updates,
        updatedAt: now,
      };
    }
    return deck;
  });
}

export function deleteCustomDeck(
  userDecks: UserDeck[] | undefined,
  deckId: string
): UserDeck[] {
  const currentDecks = ensureUserDecks(userDecks);
  // Never delete default deck
  return currentDecks.filter(deck => deck.id !== deckId || deck.isDefault);
}

export interface ResolvedDeckItem {
  ref: DeckItemRef;
  category: DeckItemCategory;
  kotoba?: KotobaItem;
  kanji?: KanjiItem;
  bunpou?: BunpouItem;
  displayTitle: string;
  displayReading?: string;
  displayMeaning: string;
  level: string;
}

export function resolveDeckItem(ref: DeckItemRef): ResolvedDeckItem | null {
  if (ref.category === 'kotoba') {
    const item = KOTOBA_DATABASE[ref.id];
    if (!item) return null;
    return {
      ref,
      category: 'kotoba',
      kotoba: item,
      displayTitle: item.word,
      displayReading: item.reading,
      displayMeaning: item.meaningId || item.meaningEn || '',
      level: item.jlpt || 'N5',
    };
  }

  if (ref.category === 'kanji') {
    const item = KANJI_DATABASE[ref.id];
    if (!item) return null;
    const kunStr = (item.kunyomi || []).join('、');
    const onStr = (item.onyomi || []).join('、');
    const reading = [kunStr, onStr].filter(Boolean).join(' | ');

    return {
      ref,
      category: 'kanji',
      kanji: item,
      displayTitle: item.character,
      displayReading: reading,
      displayMeaning: item.meaningId || item.meaningEn || '',
      level: item.jlpt || 'N5',
    };
  }

  if (ref.category === 'bunpou') {
    const item = BUNPOU_DATABASE[ref.id];
    if (!item) return null;
    return {
      ref,
      category: 'bunpou',
      bunpou: item,
      displayTitle: item.title,
      displayReading: item.formula,
      displayMeaning: item.meaningId || '',
      level: item.level || 'N3',
    };
  }

  return null;
}
