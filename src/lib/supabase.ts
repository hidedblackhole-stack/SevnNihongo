import { createClient } from '@supabase/supabase-js';
import { PlayerStats } from '../types/rpg';

const directUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://iokhdhqnpslpwsxspvaj.supabase.co';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2hkaHFucHNscHdzeHNwdmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjQyMDUsImV4cCI6MjEwNDAwMDIwNX0.8o2UFh4VXRUObjvBq_rVRxIar7yZSU7vrCgaHutYyPE';

function getSupabaseUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // On localhost, local network IP, or Vercel, route through same-origin proxy to bypass ISP DNS / Adblock blocks
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || !hostname.includes('.');
    const isVercel = hostname.endsWith('.vercel.app');
    if (isLocal || isVercel) {
      return `${window.location.origin}/supabase-proxy`;
    }
  }
  return directUrl;
}

const supabaseUrl = getSupabaseUrl();

function initSupabase() {
  if (supabaseUrl && supabaseKey) {
    try {
      return createClient(supabaseUrl, supabaseKey);
    } catch (err) {
      console.warn('Supabase client creation failed, using fallback:', err);
    }
  }

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: 'Database offline' },
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: { message: 'Database offline' },
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => ({
      select: () => ({
        order: () => ({ limit: async () => ({ data: [], error: null }) }),
        eq: () => ({
          order: () => ({ limit: async () => ({ data: [], error: null }) }),
        }),
      }),
      upsert: async () => ({ error: null }),
    }),
    rpc: async () => ({ error: null }),
  } as any;
}

export const supabase = initSupabase();

// ==========================================
// AUTHENTICATION HELPERS
// ==========================================

export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) console.warn('Warning getting session:', error.message);
    return data?.session || null;
  } catch (err) {
    console.warn('Supabase offline or unreachable:', err);
    return null;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) console.warn('Warning signing out:', error.message);
    return error;
  } catch (err) {
    console.warn('Supabase offline on signout:', err);
    return err;
  }
}

// ==========================================
// LEADERBOARD & STATS HELPERS
// ==========================================

export interface LeaderboardEntry {
  user_id: string;
  player_name: string;
  level: number;
  total_exp: number;
  tier_index: number;
  last_updated: string;
  avatar_url?: string;
  stat_tryout?: number;
  stat_flashcard?: number;
  stat_kanji?: number;
  stat_boss?: number;
}

export interface WeeklyLeaderboardEntry {
  user_id: string;
  week_id: string;
  player_name: string;
  tier_index: number;
  score: number;
  updated_at: string;
  avatar_url?: string;
}

/**
 * Gets the current ISO week ID matching PostgreSQL 'IYYY-"W"IW'
 */
export function getCurrentWeekId(): string {
  const date = new Date();
  const tdt = new Date(date.valueOf());
  const dayn = (date.getDay() + 6) % 7;
  tdt.setDate(tdt.getDate() - dayn + 3);
  const firstThursday = tdt.valueOf();
  tdt.setMonth(0, 1);
  if (tdt.getDay() !== 4) {
    tdt.setMonth(0, 1 + ((4 - tdt.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - tdt.valueOf()) / 604800000);
  const year = tdt.getFullYear();
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Send a raw score event to the server.
 * The server securely calculates and updates the leaderboards.
 */
export async function sendScoreEvent(eventType: 'quiz_answer' | 'kanji_write', refId: string, isCorrect: boolean) {
  try {
    const statsRaw = localStorage.getItem('nihongo_quest_player_stats_v2');
    if (!statsRaw) return;
    const stats = JSON.parse(statsRaw);
    const userId = stats.userId;
    if (!userId) return;

    const { error } = await supabase.rpc('submit_score_event', {
      p_user_id: userId,
      p_player_name: stats.playerName || 'Unknown Player',
      p_tier_index: stats.tierIndex || 0,
      p_event_type: eventType,
      p_ref_id: refId,
      p_is_correct: isCorrect
    });

    if (error) {
      console.error('Error submitting score event:', error);
    }
  } catch (err) {
    console.error('Failed to submit score event:', err);
  }
}

/**
 * Force sync total EXP and Level to the leaderboard table.
 * Used for legacy users who gained EXP before connecting to the cloud.
 */
export async function upsertLeaderboard(stats: PlayerStats) {
  if (!stats.userId) return;
  
  try {
    const { error } = await supabase
      .from('leaderboard')
      .upsert({
        user_id: stats.userId,
        player_name: stats.playerName || 'Unknown Player',
        level: stats.level,
        total_exp: stats.totalExp,
        tier_index: stats.tierIndex || 0,
        avatar_url: stats.avatar || null,
        stat_tryout: stats.studyStats?.tryOuts?.total || 0,
        stat_flashcard: stats.studyStats?.flashcards?.total || 0,
        stat_kanji: stats.studyStats?.kanjiWriting?.total || 0,
        stat_boss: stats.studyStats?.bossBattles?.total || 0,
        last_updated: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error upserting leaderboard:', error);
    }
  } catch (err) {
    console.error('Failed to upsert leaderboard:', err);
  }
}

/**
 * Fetch top 100 players from the All-Time leaderboard.
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_exp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return data as LeaderboardEntry[];
  } catch (err) {
    console.error('Failed to get leaderboard:', err);
    return [];
  }
}

/**
 * Fetch top 100 players from the Weekly Arena leaderboard.
 */
export async function getWeeklyLeaderboard(weekId: string): Promise<WeeklyLeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('weekly_scores')
      .select('*')
      .eq('week_id', weekId)
      .order('score', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching weekly leaderboard:', error);
      return [];
    }

    return data as WeeklyLeaderboardEntry[];
  } catch (err) {
    console.error('Failed to get weekly leaderboard:', err);
    return [];
  }
}

// ==========================================
// CLOUD SAVE & CROSS-DEVICE SYNC
// ==========================================

export interface CloudSavePayload {
  stats: Partial<PlayerStats>;
  stageProgress: Record<string, any>;
  dailyMissions: any[];
  weeklyMissions: any[];
  updatedAt: string;
}

/**
 * Save complete game progress to Supabase user_metadata and leaderboard
 */
export async function saveGameToCloud(saveData: CloudSavePayload): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    const targetUser = user || (await getSession())?.user;
    if (error || !targetUser) return false;

    // 1. Save full game state to user_metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        cloud_save: saveData,
        cloud_save_updated_at: saveData.updatedAt
      }
    });

    if (updateError) {
      console.warn('Failed to update cloud_save metadata:', updateError.message);
    }

    // 2. Also ensure leaderboard row is synced
    if (saveData.stats && (saveData.stats.level || saveData.stats.totalExp)) {
      await upsertLeaderboard({
        ...saveData.stats,
        userId: targetUser.id
      } as PlayerStats);
    }

    return true;
  } catch (err) {
    console.warn('Failed to save game to cloud:', err);
    return false;
  }
}

/**
 * Load complete game progress from Supabase user_metadata or fallback to leaderboard
 */
export async function loadGameFromCloud(): Promise<CloudSavePayload | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUser = user || (await getSession())?.user;
    if (!targetUser) return null;

    // 1. Check user_metadata for full cloud_save
    if (targetUser.user_metadata?.cloud_save) {
      return targetUser.user_metadata.cloud_save as CloudSavePayload;
    }

    // 2. Fallback: check leaderboard table for level & exp
    const { data: lbData } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('user_id', targetUser.id)
      .single();

    if (lbData && (lbData.level || lbData.total_exp)) {
      return {
        stats: {
          level: lbData.level || 1,
          totalExp: lbData.total_exp || 0,
          playerName: lbData.player_name,
          avatar: lbData.avatar_url,
          tierIndex: lbData.tier_index || 0,
          studyStats: {
            questions: { total: 0, uniqueIds: [] },
            flashcards: { total: lbData.stat_flashcard || 0, uniqueIds: [] },
            kanjiWriting: { total: lbData.stat_kanji || 0, uniqueIds: [] },
            tryOuts: { total: lbData.stat_tryout || 0, uniqueIds: [] },
            dokkai: { total: 0, uniqueIds: [] },
            choukai: { total: 0, uniqueIds: [] },
            bunpou: { total: 0, uniqueIds: [] },
            stages: { total: 0, uniqueIds: [] },
            bossBattles: { total: lbData.stat_boss || 0, uniqueIds: [] }
          }
        },
        stageProgress: {},
        dailyMissions: [],
        weeklyMissions: [],
        updatedAt: lbData.last_updated || new Date().toISOString()
      };
    }

    return null;
  } catch (err) {
    console.warn('Failed to load game from cloud:', err);
    return null;
  }
}


