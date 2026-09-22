import React, { useState } from 'react';
import { KotobaLibraryView } from './KotobaLibraryView';
import { KanjiLibraryView } from './KanjiLibraryView';
import { BunpouLibraryView } from './BunpouLibraryView';
import { QuestionLibraryView } from './QuestionLibraryView';
import { playSound } from '../../utils/audio';
import { UserDeck, DeckItemCategory } from '../../types/rpg';
import { ItemMasteryRecord } from '../../types/content';

interface LibraryViewProps {
  soundEnabled?: boolean;
  itemMastery?: Record<string, ItemMasteryRecord>;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onRecordStudy?: (category: 'tryOuts' | 'questions' | 'dokkai' | 'choukai' | 'bunpou' | 'bossBattles' | 'kanjiWriting' | 'flashcards', id: string, count?: number) => void;
  onRecordInteraction?: (
    itemId: string,
    category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
    interactionType: 'writing' | 'flashcard' | 'quiz',
    success?: boolean
  ) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number,
    interactionType?: 'writing' | 'flashcard' | 'quiz'
  ) => void;
  userDecks?: UserDeck[];
  onToggleBookmark?: (id: string, category: DeckItemCategory, notes?: string, targetDeckId?: string) => void;
  onUpdateDecks?: (decks: UserDeck[]) => void;
}

export type LibraryTab = 'kotoba' | 'kanji' | 'bunpou' | 'soal';

export const LibraryView: React.FC<LibraryViewProps> = ({
  soundEnabled = true,
  itemMastery,
  onRewardPlayer,
  onRecordStudy,
  onRecordInteraction,
  onCompleteStudyItem,
  userDecks,
  onToggleBookmark,
  onUpdateDecks,
}) => {
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('kotoba');

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Clean Header & 4 Grimoire Volume Tabs */}
      <div className="panel p-5 sm:p-6 rounded-3xl space-y-4 shadow-sm border border-border-subtle">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-5">
          <div className="text-center lg:text-left space-y-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
              Pustaka Referensi JLPT & Identity Architecture
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide">
              Perpustakaan & Grimoire Bahasa Jepang
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary font-medium">
              Ensiklopedia terpadu: Kosakata, Kanji, Pola Kalimat, dan Bank Soal berstandar resmi JLPT (N5〜N1)
            </p>
          </div>

          {/* 4 Volume Tab Switcher */}
          <div className="book-tab-nav flex-wrap justify-center sm:justify-start shrink-0">
            {/* Jilid I: Kosakata */}
            <button
              onClick={() => {
                setLibraryTab('kotoba');
                playSound('click', soundEnabled);
              }}
              className={`book-tab-btn ${
                libraryTab === 'kotoba' ? 'active' : 'inactive'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-surface-inset border border-border-subtle flex items-center justify-center text-xs font-jp font-bold text-text-primary">
                語
              </div>
              <div className="text-left">
                <span className="block text-xs leading-none font-bold">Kosakata</span>
                <span className="text-[10px] opacity-70 font-mono">Jilid I</span>
              </div>
            </button>

            {/* Jilid II: Kanji */}
            <button
              onClick={() => {
                setLibraryTab('kanji');
                playSound('click', soundEnabled);
              }}
              className={`book-tab-btn ${
                libraryTab === 'kanji' ? 'active' : 'inactive'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-surface-inset border border-border-subtle flex items-center justify-center text-xs font-jp font-bold text-text-primary">
                字
              </div>
              <div className="text-left">
                <span className="block text-xs leading-none font-bold">Kanji</span>
                <span className="text-[10px] opacity-70 font-mono">Jilid II</span>
              </div>
            </button>

            {/* Jilid III: Tata Bahasa */}
            <button
              onClick={() => {
                setLibraryTab('bunpou');
                playSound('click', soundEnabled);
              }}
              className={`book-tab-btn ${
                libraryTab === 'bunpou' ? 'active' : 'inactive'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-surface-inset border border-border-subtle flex items-center justify-center text-xs font-jp font-bold text-text-primary">
                文
              </div>
              <div className="text-left">
                <span className="block text-xs leading-none font-bold">Tata Bahasa</span>
                <span className="text-[10px] opacity-70 font-mono">Jilid III</span>
              </div>
            </button>

            {/* Jilid IV: Bank Soal JLPT */}
            <button
              onClick={() => {
                setLibraryTab('soal');
                playSound('click', soundEnabled);
              }}
              className={`book-tab-btn ${
                libraryTab === 'soal' ? 'active' : 'inactive'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-surface-inset border border-border-subtle flex items-center justify-center text-xs font-jp font-bold text-text-primary">
                問
              </div>
              <div className="text-left">
                <span className="block text-xs leading-none font-bold">Bank Soal</span>
                <span className="text-[10px] opacity-70 font-mono">Jilid IV (JLPT)</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Active Grimoire View */}
      {libraryTab === 'kotoba' && (
        <KotobaLibraryView
          soundEnabled={soundEnabled}
          itemMastery={itemMastery}
          userDecks={userDecks}
          onToggleBookmark={onToggleBookmark}
          onUpdateDecks={onUpdateDecks}
          onRewardPlayer={onRewardPlayer}
          onRecordStudy={onRecordStudy as any}
          onRecordInteraction={onRecordInteraction}
          onCompleteStudyItem={onCompleteStudyItem}
        />
      )}
      {libraryTab === 'kanji' && (
        <KanjiLibraryView
          soundEnabled={soundEnabled}
          itemMastery={itemMastery}
          userDecks={userDecks}
          onToggleBookmark={onToggleBookmark}
          onUpdateDecks={onUpdateDecks}
          onRewardPlayer={onRewardPlayer}
          onRecordStudy={onRecordStudy as any}
          onRecordInteraction={onRecordInteraction}
          onCompleteStudyItem={onCompleteStudyItem}
        />
      )}
      {libraryTab === 'bunpou' && (
        <BunpouLibraryView
          soundEnabled={soundEnabled}
          itemMastery={itemMastery}
          userDecks={userDecks}
          onToggleBookmark={onToggleBookmark}
          onUpdateDecks={onUpdateDecks}
          onRewardPlayer={onRewardPlayer}
          onRecordInteraction={onRecordInteraction}
          onCompleteStudyItem={onCompleteStudyItem}
        />
      )}
      {libraryTab === 'soal' && (
        <QuestionLibraryView
          soundEnabled={soundEnabled}
          onRewardPlayer={onRewardPlayer}
          onRecordStudy={onRecordStudy as any}
          onCompleteStudyItem={onCompleteStudyItem}
        />
      )}
    </div>
  );
};
