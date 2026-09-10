import React from 'react';
import { motion } from 'motion/react';
import { RPG_TIERS } from '../../data/tiers';

interface TierAvatarProps {
  tierIndex: number; // 0 to 9
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  interactive?: boolean;
  showRankBadge?: boolean;
}

export const TierAvatar: React.FC<TierAvatarProps> = ({
  tierIndex,
  size = 'lg',
  onClick,
  interactive = true,
  showRankBadge = false,
}) => {
  const currentTier = RPG_TIERS[Math.min(9, Math.max(0, tierIndex))];
  const tierNum = currentTier.tier; // 1 to 10

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-28 h-28',
    lg: 'w-48 h-48 sm:w-56 sm:h-56',
    xl: 'w-64 h-64 sm:w-72 sm:h-72',
  }[size];

  // Specific visual elements based on Tier 1 to 10
  const isPeasant = tierNum === 1;
  const isNovice = tierNum === 2;
  const isApprentice = tierNum === 3;
  const isSquire = tierNum === 4;
  const isKnight = tierNum === 5;
  const isEliteKnight = tierNum >= 6;
  const isPaladin = tierNum >= 7;
  const isHero = tierNum >= 8;
  const isChampion = tierNum >= 9;
  const isMythic = tierNum >= 10;

  return (
    <motion.div
      id={`rpg-avatar-tier-${tierNum}`}
      onClick={onClick}
      whileHover={interactive ? { scale: 1.04, y: -4 } : {}}
      whileTap={interactive ? { scale: 0.96 } : {}}
      className={`relative flex flex-col items-center justify-center select-none ${interactive ? 'cursor-pointer group' : ''}`}
    >
      {/* Background Aura & Light Rings */}
      <div className={`relative ${sizeClasses} flex items-center justify-center`}>
        
        {/* Tier 8-10 Floating or Mythic Wings Aura */}
        {isHero && (
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className={`absolute inset-[-15%] rounded-full ${
              isMythic ? 'bg-amber-400/20' :
              isChampion ? 'bg-fuchsia-500/20' :
              'bg-sky-400/20'
            } blur-xl pointer-events-none`}
          />
        )}

        {/* Tier 10 Angelic Light Wings */}
        {isMythic && (
          <motion.div
            animate={{ y: [0, -6, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-8 inset-x-[-20%] h-full flex justify-between pointer-events-none opacity-80"
          >
            {/* Left Wing */}
            <svg viewBox="0 0 100 100" className="w-24 h-24 text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] fill-current -scale-x-100">
              <path d="M10,90 Q40,30 90,10 Q60,40 70,60 Q50,60 50,80 Z" opacity="0.9" />
              <path d="M20,95 Q50,45 95,25 Q70,55 75,75 Z" opacity="0.7" fill="var(--color-amber-300)" />
            </svg>
            {/* Right Wing */}
            <svg viewBox="0 0 100 100" className="w-24 h-24 text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] fill-current">
              <path d="M10,90 Q40,30 90,10 Q60,40 70,60 Q50,60 50,80 Z" opacity="0.9" />
              <path d="M20,95 Q50,45 95,25 Q70,55 75,75 Z" opacity="0.7" fill="var(--color-amber-300)" />
            </svg>
          </motion.div>
        )}

        {/* Ambient Glow / Splash Background */}
        <div
          className={`absolute inset-0 rounded-3xl ${
            isMythic ? 'bg-amber-400/20 blur-2xl' :
            isChampion ? 'bg-fuchsia-500/20 blur-2xl' :
            isHero ? 'bg-sky-400/20 blur-2xl' :
            isPaladin ? 'bg-amber-400/20 blur-2xl' :
            isEliteKnight ? 'bg-rose-500/20 blur-2xl' :
            isKnight ? 'bg-violet-500/20 blur-2xl' :
            isSquire ? 'bg-blue-500/20 blur-2xl' :
            isApprentice ? 'bg-cyan-600/20 blur-xl' :
            isNovice ? 'bg-emerald-600/20 blur-xl' :
            'bg-stone-600/20 blur-xl'
          } pointer-events-none`}
        />

        {/* Character Visual Image (Splash Art) */}
        <div className="relative w-full h-full flex items-center justify-center pointer-events-none z-10">
          <motion.div
            animate={isChampion || isMythic ? { y: [0, -8, 0] } : { y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-full h-full flex items-center justify-center scale-125 sm:scale-110"
          >
            <img 
              src={`/avatars/tier-${tierNum}.png`}
              alt={`Tier ${tierNum} Avatar`}
              className="w-full h-full object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]"
            />
          </motion.div>
        </div>

      </div>

      {/* Optional Rank Badge & Title Below */}
      {showRankBadge && (
        <div className="mt-3 text-center">
          <div className="text-sm sm:text-base font-bold bg-clip-text text-transparent flex items-center justify-center gap-1.5">
            <span>{currentTier.name}</span>
          </div>
          <p className="text-[11px] text-stone-400 max-w-[220px] truncate">
            {currentTier.titleName}
          </p>
        </div>
      )}
    </motion.div>
  );
};
