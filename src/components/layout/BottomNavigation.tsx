import React from 'react';
import { Settings } from 'lucide-react';
import { Trophy } from 'lucide-react';
import { CastleIcon, CompassIcon, ScrollIcon, SwordIcon, BookIcon, TreasureIcon } from '../ui/EngravingIcons';
import { playSound } from '../../utils/audio';

export type TabType = 'home' | 'maps' | 'daily' | 'weekly' | 'leaderboard' | 'library' | 'shop' | 'settings';

interface BottomNavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  soundEnabled?: boolean;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onChangeTab,
  soundEnabled = true,
}) => {
  const navItems: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Castle', icon: CastleIcon },
    { id: 'maps', label: 'World', icon: CompassIcon },
    { id: 'daily', label: 'Misi', icon: ScrollIcon },
    { id: 'leaderboard', label: 'Rank', icon: Trophy },
    { id: 'library', label: 'Buku', icon: BookIcon },

    { id: 'settings', label: 'Menu', icon: Settings },
  ];

  return (
    <nav
      aria-label="Navigasi Utama"
      className="fixed z-40 skeuo-navbar bottom-0 inset-x-0 md:inset-x-auto md:top-0 md:bottom-0 md:left-0 md:right-auto md:w-24 md:h-screen px-1 py-1.5 sm:px-2 sm:py-2 md:py-8 overflow-y-auto"
    >
      <div className="max-w-xl md:max-w-none mx-auto w-full md:h-full flex md:flex-col items-center justify-around md:justify-start md:gap-6 relative z-10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                onChangeTab(item.id);
                playSound('click', soundEnabled);
              }}
              className={`flex flex-col items-center justify-center py-1 px-1.5 sm:px-3 rounded-2xl transition-all duration-150 min-w-0 ${
                isActive
                  ? 'text-indigo font-bold scale-105'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <div
                className={`p-1.5 sm:p-2 rounded-xl transition-all ${
                  isActive
                    ? 'bg-surface-elevated shadow-md text-indigo ring-1 ring-indigo/40'
                    : 'bg-surface-inset/40 text-text-secondary border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[9px] sm:text-[10px] mt-1 tracking-wider font-heading font-bold truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
