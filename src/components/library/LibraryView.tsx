import React, { useState } from 'react';
import { BookIcon, ScrollIcon } from '../ui/EngravingIcons';
import { KotobaLibraryView } from './KotobaLibraryView';
import { BunpouLibraryView } from './BunpouLibraryView';
import { playSound } from '../../utils/audio';

interface LibraryViewProps {
  soundEnabled?: boolean;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ soundEnabled = true }) => {
  const [libraryTab, setLibraryTab] = useState<'kotoba' | 'bunpou'>('kotoba');

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Clean Header & Index Tabs */}
      <div className="panel p-5 sm:p-6 rounded-3xl space-y-4 shadow-sm border border-border-subtle">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
              Pustaka Referensi JLPT
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide">
              Perpustakaan & Grimoire Bahasa Jepang
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary font-medium">
              Ensiklopedia lengkap kosakata, kanji, dan rumus tata bahasa standar JLPT (N5〜N1)
            </p>
          </div>

          {/* Simple Clean Tab Switcher */}
          <div className="book-tab-nav shrink-0">
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
                <span className="text-[10px] opacity-70 font-mono">Jilid II</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Active Grimoire View */}
      {libraryTab === 'kotoba' ? (
        <KotobaLibraryView soundEnabled={soundEnabled} />
      ) : (
        <BunpouLibraryView soundEnabled={soundEnabled} />
      )}
    </div>
  );
};
