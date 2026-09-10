import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Loader2, RefreshCw, Flame, Crown } from 'lucide-react';
import { getLeaderboard, getWeeklyLeaderboard, getCurrentWeekId, LeaderboardEntry, WeeklyLeaderboardEntry } from '../../lib/supabase';
import { playSound } from '../../utils/audio';
import { RPG_TIERS } from '../../data/tiers';

interface LeaderboardViewProps {
  currentUserId: string;
  soundEnabled: boolean;
}

type LeaderboardTab = 'all-time' | 'weekly';

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ currentUserId, soundEnabled }) => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('all-time');
  const [allTimeEntries, setAllTimeEntries] = useState<LeaderboardEntry[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyLeaderboardEntry[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLeaderboard = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
      playSound('click', soundEnabled);
    } else {
      setIsLoading(true);
    }

    if (activeTab === 'all-time') {
      const data = await getLeaderboard();
      setAllTimeEntries(data);
    } else {
      const currentWeekId = getCurrentWeekId();
      const data = await getWeeklyLeaderboard(currentWeekId);
      setWeeklyEntries(data);
    }
    
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" fill="currentColor" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-300" fill="currentColor" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-700" fill="currentColor" />;
    return <span className="text-sm font-bold text-stone-500 w-5 text-center">{index + 1}</span>;
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
      <div className="px-3 py-2 text-xs text-center text-text-secondary bg-surface-inset rounded-xl border border-border-subtle">
        {activeTab === 'all-time' 
          ? "Peringkat didasarkan pada Total XP seumur hidup. Dedikasi tanpa batas!"
          : "Peringkat mingguan dari skor Quiz dan Kanji. Direset setiap hari Senin!"}
      </div>

      {/* Leaderboard List mapped to Skeuomorphic Canvas Card */}
      <div className="journey-canvas-card rounded-3xl overflow-hidden border shadow-md relative min-h-[400px]">
        {/* Grayscale SVG Turbulence Grain Background Overlay */}
        <div className="skeuo-grain rounded-3xl" />
        
        <div className="relative z-10 h-full p-2 sm:p-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-[#765F50] dark:text-stone-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#B88912] dark:text-amber-500/50" />
              <span className="text-sm font-bold">Mencari juara...</span>
            </div>
          ) : currentEntries.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-[#765F50] dark:text-stone-500 text-sm">
              {activeTab === 'all-time' ? <Trophy className="w-12 h-12 mb-3 opacity-30" /> : <Flame className="w-12 h-12 mb-3 opacity-30" />}
              <p className="font-bold">Belum ada yang menaklukkan arena ini.</p>
              <p className="text-xs mt-1">Jadilah yang pertama untuk meraih kemenangan!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentEntries.map((entry, index) => {
              const isMe = entry.user_id === currentUserId;
              const tier = RPG_TIERS[Math.min(entry.tier_index, RPG_TIERS.length - 1)];

              // Type coercion for dynamic rendering
              const expToDisplay = activeTab === 'all-time' 
                ? (entry as LeaderboardEntry).total_exp 
                : (entry as WeeklyLeaderboardEntry).score;
                
              const levelToDisplay = activeTab === 'all-time'
                ? (entry as LeaderboardEntry).level
                : null; // Weekly doesn't have level

                return (
                  <div
                    key={entry.user_id}
                    onClick={() => {
                      if (activeTab === 'all-time') {
                        setSelectedPlayer(entry as LeaderboardEntry);
                      }
                    }}
                    className={`flex items-center gap-3 p-3 sm:px-4 rounded-2xl transition-all border shadow-sm ${getRankStyle(index)} ${isMe ? 'ring-2 ring-amber-500/50 scale-[1.01]' : ''} ${activeTab === 'all-time' ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center w-8 shrink-0">
                      {getRankIcon(index)}
                    </div>

                    {/* Avatar / Class Icon placeholder */}
                    <div className="w-10 h-10 rounded-xl bg-stone-950 flex flex-col items-center justify-center shrink-0 border border-stone-800 overflow-hidden shadow-inner relative">
                      {entry.avatar_url ? (
                        <span className="text-xl leading-none" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}>
                          {entry.avatar_url}
                        </span>
                      ) : tier ? (
                        <span className="font-bold text-stone-400 opacity-80">{tier.name.charAt(0)}</span>
                      ) : (
                        <div className="w-6 h-6 bg-stone-800 rounded-full" />
                      )}
                      {levelToDisplay && (
                        <span className="absolute bottom-0 text-[9px] font-bold text-amber-400">Lv.{levelToDisplay}</span>
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
            </div>
          )}
        </div>
      </div>

        {/* Player Profile Flex Modal */}
        {/* Player Profile Flex Modal */}
        {selectedPlayer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPlayer(null)}>
            <div 
              className="bg-stone-900 border border-stone-700 p-6 rounded-3xl w-full max-w-sm shadow-2xl space-y-6 relative overflow-hidden text-center"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="absolute top-4 right-4 text-stone-500 hover:text-stone-300"
              >
                &times;
              </button>

              <div className="space-y-2">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-stone-950 border-2 border-amber-500/30 flex items-center justify-center text-4xl shadow-inner">
                  {selectedPlayer.avatar_url || '👤'}
                </div>
                <h3 className="text-xl font-bold font-medieval text-stone-100">{selectedPlayer.player_name}</h3>
                <p className="text-sm font-bold text-amber-400">Level {selectedPlayer.level}</p>
                <p className="text-xs text-stone-400">{RPG_TIERS[Math.min(selectedPlayer.tier_index, RPG_TIERS.length - 1)]?.name || 'Novice'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="text-[10px] text-stone-500 font-bold uppercase">Ujian</div>
                  <div className="font-mono text-lg text-emerald-400 font-bold">{selectedPlayer.stat_tryout || 0}</div>
                </div>
                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="text-[10px] text-stone-500 font-bold uppercase">Flashcard</div>
                  <div className="font-mono text-lg text-blue-400 font-bold">{selectedPlayer.stat_flashcard || 0}</div>
                </div>
                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="text-[10px] text-stone-500 font-bold uppercase">Kanji</div>
                  <div className="font-mono text-lg text-amber-400 font-bold">{selectedPlayer.stat_kanji || 0}</div>
                </div>
                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="text-[10px] text-stone-500 font-bold uppercase">Boss Mati</div>
                  <div className="font-mono text-lg text-rose-400 font-bold">{selectedPlayer.stat_boss || 0}</div>
                </div>
              </div>

              <div className="text-xs text-stone-500">
                TOTAL EXP: <span className="font-bold text-stone-300">{selectedPlayer.total_exp.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
