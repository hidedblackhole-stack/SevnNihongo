import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Loader2, RefreshCw, Flame, Crown, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getLeaderboard,
  getWeeklyLeaderboard,
  getCurrentWeekId,
  getUserLeaderboardRank,
  LeaderboardEntry,
  WeeklyLeaderboardEntry,
  UserRankInfo
} from '../../lib/supabase';
import { playSound } from '../../utils/audio';
import { RPG_TIERS, getTierForExp } from '../../data/tiers';
import { TIER_AVATAR_MAP, TIER_AVATAR_FEMALE_MAP } from '../avatar/TierAvatar';
import { PlayerProfileModal } from './PlayerProfileModal';

interface LeaderboardViewProps {
  currentUserId: string;
  soundEnabled: boolean;
  onOpenStatusModal?: () => void;
  isActive?: boolean;
}

type LeaderboardTab = 'all-time' | 'weekly';

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ currentUserId, soundEnabled, onOpenStatusModal, isActive = true }) => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('all-time');
  const [allTimeEntries, setAllTimeEntries] = useState<LeaderboardEntry[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyLeaderboardEntry[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<(LeaderboardEntry & { rank?: number; weeklyScore?: number }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [displayLimit, setDisplayLimit] = useState<number>(100);
  const [totalDbCount, setTotalDbCount] = useState<number>(185);
  const [myRankInfo, setMyRankInfo] = useState<UserRankInfo | null>(null);

  const fetchLeaderboard = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
      playSound('click', soundEnabled);
    } else {
      setIsLoading(true);
    }

    if (activeTab === 'all-time') {
      const data = await getLeaderboard(displayLimit);
      setAllTimeEntries(data);
      if (currentUserId) {
        const rankInfo = await getUserLeaderboardRank(currentUserId);
        setMyRankInfo(rankInfo);
        if (rankInfo?.totalPlayers) {
          setTotalDbCount(rankInfo.totalPlayers);
        }
      }
    } else {
      const currentWeekId = getCurrentWeekId();
      const data = await getWeeklyLeaderboard(currentWeekId, displayLimit);
      setWeeklyEntries(data);
    }
    
    setIsLoading(false);
    setIsRefreshing(false);
  };

  // Re-fetch when switching tabs or expanding display limit
  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab, displayLimit]);

  // Auto-refresh when user navigates back to Leaderboard tab in App.tsx
  useEffect(() => {
    if (isActive) {
      fetchLeaderboard();
    }
  }, [isActive]);

  const handleSelectPlayer = (entry: LeaderboardEntry | WeeklyLeaderboardEntry, index: number) => {
    playSound('open_modal', soundEnabled);
    if (activeTab === 'all-time') {
      const allTime = entry as LeaderboardEntry;
      const totalExp = allTime.total_exp || 0;
      const computedTierIndex = getTierForExp(totalExp).tierIndex;
      setSelectedPlayer({
        ...allTime,
        tier_index: computedTierIndex,
        rank: index + 1,
      });
    } else {
      const weekly = entry as WeeklyLeaderboardEntry;
      const allTimeMatch = allTimeEntries.find((e) => e.user_id === weekly.user_id);
      const totalExp = allTimeMatch?.total_exp || weekly.score;
      const computedTierIndex = getTierForExp(totalExp).tierIndex;
      setSelectedPlayer({
        user_id: weekly.user_id,
        player_name: weekly.player_name,
        level: allTimeMatch?.level || 1,
        total_exp: totalExp,
        tier_index: computedTierIndex,
        last_updated: weekly.updated_at,
        avatar_url: weekly.avatar_url || allTimeMatch?.avatar_url,
        stat_tryout: allTimeMatch?.stat_tryout || 0,
        stat_flashcard: allTimeMatch?.stat_flashcard || 0,
        stat_kanji: allTimeMatch?.stat_kanji || 0,
        stat_boss: allTimeMatch?.stat_boss || 0,
        rank: index + 1,
        weeklyScore: weekly.score,
      });
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] shrink-0" fill="currentColor" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-300 shrink-0" fill="currentColor" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-700 shrink-0" fill="currentColor" />;

    const rankNum = index + 1;
    const isLarge = rankNum >= 100;

    return (
      <span
        className={`font-bold font-mono tabular-nums text-text-muted text-center whitespace-nowrap leading-none ${
          isLarge ? 'text-xs tracking-tight' : 'text-sm'
        }`}
      >
        {rankNum}
      </span>
    );
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return 'panel border-2 border-gold shadow-md text-text-primary';
    if (index === 1) return 'panel border border-border-primary shadow-sm text-text-primary';
    if (index === 2) return 'panel border border-border-subtle shadow-sm text-text-primary';
    return 'panel border border-border-subtle/50 shadow-sm text-text-primary';
  };

  const currentEntries = activeTab === 'all-time' ? allTimeEntries : weeklyEntries;

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="panel p-4 sm:p-5 mb-4 shadow-md border border-border-subtle flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-heading tracking-wide text-text-primary flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold" />
            Global Rankings
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">Compete with scholars around the world</p>
        </div>
        <button
          onClick={() => fetchLeaderboard(true)}
          disabled={isRefreshing || isLoading}
          className="py-2 px-3.5 rounded-xl bg-surface-inset hover:bg-surface-elevated text-text-secondary hover:text-text-primary border border-border-subtle flex items-center gap-1.5 shrink-0 text-xs font-mono font-bold transition-all shadow-inner"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-gold' : ''}`} />
          <span>REFRESH</span>
        </button>
      </div>

      {/* Tabs as Skeuomorphic Pills */}
      <div className="skeuo-tier-row mb-4">
        <button
          onClick={() => {
            setActiveTab('all-time');
            playSound('click', soundEnabled);
          }}
          className={`skeuo-tier-pill flex-1 flex justify-center items-center gap-2 ${activeTab === 'all-time' ? 'active' : ''}`}
        >
          <Trophy className="w-4 h-4" />
          Hall of Fame
        </button>
        <button
          onClick={() => {
            setActiveTab('weekly');
            playSound('click', soundEnabled);
          }}
          className={`skeuo-tier-pill flex-1 flex justify-center items-center gap-2 ${activeTab === 'weekly' ? 'active' : ''}`}
        >
          <Flame className="w-4 h-4" />
          Weekly Arena
        </button>
      </div>

      {/* Description Context */}
      <div className="px-3.5 py-2.5 text-xs text-center text-text-secondary bg-surface-inset rounded-xl border border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-1.5 shadow-inner">
        <span className="font-medium">
          {activeTab === 'all-time' 
            ? `Total EXP seumur hidup • Menampilkan ${displayLimit === 100 ? 'Top 100' : 'Semua'} (${currentEntries.length} dari ${totalDbCount} petualang).`
            : "Peringkat mingguan dari skor Quiz dan Kanji. Direset setiap hari Senin!"}
        </span>
        <span className="text-[10px] text-emerald-400 font-bold font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
          Real-time Synced
        </span>
      </div>

      {/* Leaderboard List mapped to Skeuomorphic Canvas Card */}
      <div className="journey-canvas-card rounded-3xl overflow-hidden border shadow-md relative min-h-[400px]">
        {/* Grayscale SVG Turbulence Grain Background Overlay */}
        <div className="skeuo-grain rounded-3xl" />
        
        <div className="relative z-10 h-full p-2 sm:p-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-text-secondary gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-gold" />
              <span className="text-sm font-bold font-heading">Mencari juara...</span>
            </div>
          ) : currentEntries.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-text-secondary text-sm">
              {activeTab === 'all-time' ? <Trophy className="w-12 h-12 mb-3 opacity-30 text-gold" /> : <Flame className="w-12 h-12 mb-3 opacity-30 text-gold" />}
              <p className="font-bold font-heading">Belum ada yang menaklukkan arena ini.</p>
              <p className="text-xs mt-1 text-text-muted">Jadilah yang pertama untuk meraih kemenangan!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentEntries.map((entry, index) => {
                const isMe = entry.user_id === currentUserId;

                // Type coercion for dynamic rendering
                const expToDisplay = activeTab === 'all-time' 
                  ? (entry as LeaderboardEntry).total_exp 
                  : (entry as WeeklyLeaderboardEntry).score;

                // Dynamically reconcile tier with rebalanced EXP curve
                const { tierIndex: computedTierIndex } = getTierForExp(expToDisplay);
                const tier = RPG_TIERS[computedTierIndex];
                const userGender = (entry as any)?.character_gender || (entry as any)?.characterGender || 'male';
                const avatarMap = userGender === 'female' ? TIER_AVATAR_FEMALE_MAP : TIER_AVATAR_MAP;
                const avatarThumbnail = avatarMap[tier?.tier || 1];
                  
                const levelToDisplay = activeTab === 'all-time'
                  ? (entry as LeaderboardEntry).level
                  : null; // Weekly doesn't have level

                return (
                  <div
                    key={entry.user_id}
                    onClick={() => handleSelectPlayer(entry, index)}
                    className={`flex items-center gap-3 p-3 sm:px-4 rounded-2xl transition-all border shadow-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${getRankStyle(index)} ${isMe ? 'ring-2 ring-amber-500/50 scale-[1.01]' : ''}`}
                    title="Klik untuk melihat profil karakter petualang"
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center min-w-[2.25rem] sm:min-w-[2.5rem] w-auto shrink-0 px-0.5 text-center">
                      {getRankIcon(index)}
                    </div>

                    {/* Avatar / Character Portrait */}
                    <div className="w-10 h-10 rounded-xl bg-surface-inset flex flex-col items-center justify-center shrink-0 border border-border-subtle overflow-hidden shadow-inner relative">
                      {entry.avatar_url ? (
                        <span className="text-xl leading-none" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}>
                          {entry.avatar_url}
                        </span>
                      ) : avatarThumbnail ? (
                        <img
                          src={avatarThumbnail}
                          alt={tier?.name || 'Avatar'}
                          className="w-full h-full object-cover object-top filter drop-shadow-sm"
                          loading="lazy"
                        />
                      ) : tier ? (
                        <span className="font-bold text-text-muted opacity-80">{tier.name.charAt(0)}</span>
                      ) : (
                        <div className="w-6 h-6 bg-surface-elevated rounded-full" />
                      )}
                      {levelToDisplay && (
                        <span className="absolute bottom-0 text-[8px] font-mono font-bold text-gold bg-black/70 px-1 rounded-t">
                          Lv.{levelToDisplay}
                        </span>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold truncate max-w-[120px] sm:max-w-[200px]">
                          {entry.player_name}
                        </span>
                        {isMe && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            activeTab === 'all-time' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-xs opacity-70 truncate">
                        {tier?.name || 'Novice'}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <div className={`font-mono font-bold text-sm sm:text-base tracking-tight drop-shadow-md ${
                        activeTab === 'all-time' ? 'text-amber-300' : 'text-rose-300'
                      }`}>
                        {expToDisplay.toLocaleString()}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest opacity-60">
                        {activeTab === 'all-time' ? 'TOTAL XP' : 'WEEK SCORE'}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Expand All / Collapse Toggle if DB has more than 100 players */}
              {activeTab === 'all-time' && totalDbCount > 100 && (
                <div className="text-center pt-3 pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayLimit(prev => prev === 100 ? 500 : 100);
                      playSound('click', soundEnabled);
                    }}
                    className="px-4 py-2 rounded-xl bg-surface-inset hover:bg-surface-elevated text-text-secondary hover:text-text-primary border border-border-subtle text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 mx-auto"
                  >
                    {displayLimit === 100 ? (
                      <>
                        <ChevronDown className="w-4 h-4 text-gold" />
                        <span>Tampilkan Seluruh Petualang ({totalDbCount} Pemain)</span>
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-4 h-4 text-gold" />
                        <span>Kembali ke Top 100 Hall of Fame</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bar for Current Player's Rank & Standing */}
      {myRankInfo && (
        <div className="sticky bottom-2 z-20 mt-3 animate-fade-in">
          <div
            onClick={() => {
              handleSelectPlayer(myRankInfo.entry, myRankInfo.rank - 1);
            }}
            className="p-3 sm:px-4 rounded-2xl bg-surface-elevated/95 backdrop-blur-md border-2 border-amber-500/80 shadow-2xl flex items-center justify-between gap-3 cursor-pointer hover:border-amber-400 transition-all hover:scale-[1.01] active:scale-[0.99] ring-2 ring-amber-500/30"
            title="Klik untuk melihat detail profil petualang kamu"
          >
            {/* Rank badge */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shrink-0 text-amber-400 font-mono font-black text-xs shadow-inner">
                #{myRankInfo.rank}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm truncate text-text-primary">
                    {myRankInfo.entry.player_name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-black uppercase tracking-wider">
                    YOU
                  </span>
                </div>
                <div className="text-[11px] text-text-muted flex items-center gap-1 truncate">
                  {myRankInfo.rank <= 100 ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      Masuk Top 100 Dunia!
                    </span>
                  ) : (
                    <span className="text-amber-300 font-medium">
                      ⚔️ Butuh {Math.max(1, myRankInfo.cutoffExpTop100 - (myRankInfo.entry.total_exp || 0) + 1)} EXP lagi ke Top 100
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* EXP Score */}
            <div className="text-right shrink-0">
              <div className="font-mono font-black text-sm sm:text-base text-amber-300">
                {myRankInfo.entry.total_exp.toLocaleString()}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-text-muted">
                Peringkat #{myRankInfo.rank} / {myRankInfo.totalPlayers}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Profile Portal Modal (Teleported to document.body) */}
      <PlayerProfileModal
        player={selectedPlayer}
        isOpen={Boolean(selectedPlayer)}
        onClose={() => setSelectedPlayer(null)}
        isCurrentUser={selectedPlayer?.user_id === currentUserId}
        soundEnabled={soundEnabled}
        onOpenFullStatusModal={onOpenStatusModal}
      />
    </div>
  );
};
