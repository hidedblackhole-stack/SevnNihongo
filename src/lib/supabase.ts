import { createClient } from '@supabase/supabase-js';
import { PlayerStats } from '../types/rpg';
import { UserMasteryEntity, UserActivityEntity } from '../types/identity';
import { getTierForExp } from '../data/tiers';

const directUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://iokhdhqnpslpwsxspvaj.supabase.co';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2hkaHFucHNscHdzeHNwdmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjQyMDUsImV4cCI6MjEwNDAwMDIwNX0.8o2UFh4VXRUObjvBq_rVRxIar7yZSU7vrCgaHutYyPE';

function getSupabaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Route all in-browser requests through same-origin reverse proxy (/supabase-proxy),
    // which is handled by vite.config.ts (local dev) and vercel.json (production on .vercel.app & custom domains like sevnquest.sevnsoul.site).
    // This completely bypasses Indonesian ISP DNS blocks (Nawala/Telkom/Indihome) and CORS issues.
    return `${window.location.origin}/supabase-proxy`;
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

    const effectiveTierIndex = getTierForExp(stats.totalExp || 0).tierIndex;

    const { error } = await supabase.rpc('submit_score_event', {
      p_user_id: userId,
      p_player_name: stats.playerName || 'Unknown Player',
      p_tier_index: effectiveTierIndex,
      p_event_type: eventType,
      p_ref_id: refId,
      p_is_correct: isCorrect
    });

    if (error) {
      console.error('Error submitting score event:', error);
    }

    // Also stream event to the new relational user_activity table
    logUserActivityEvent({
      userId,
      activityType: eventType,
      entityId: refId,
      result: isCorrect ? 'correct' : 'wrong',
      score: isCorrect ? 10 : 0,
      createdAt: new Date().toISOString()
    }).catch(() => {});
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
    const effectiveTierIndex = getTierForExp(stats.totalExp || 0).tierIndex;

    const { error } = await supabase
      .from('leaderboard')
      .upsert({
        user_id: stats.userId,
        player_name: stats.playerName || 'Unknown Player',
        level: stats.level,
        total_exp: stats.totalExp,
        tier_index: effectiveTierIndex,
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
 * Fetch players from the All-Time leaderboard (default limit: 100).
 */
export async function getLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_exp', { ascending: false })
      .limit(limit);

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

export interface UserRankInfo {
  entry: LeaderboardEntry;
  rank: number;
  totalPlayers: number;
  cutoffExpTop100: number;
}

/**
 * Fetch user's exact rank and leaderboard entry across all players in the database.
 */
export async function getUserLeaderboardRank(userId: string): Promise<UserRankInfo | null> {
  if (!userId) return null;
  try {
    const { data: userEntry, error } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !userEntry) return null;

    // Count how many players have higher EXP
    const { count: higherCount } = await supabase
      .from('leaderboard')
      .select('*', { count: 'exact', head: true })
      .gt('total_exp', userEntry.total_exp);

    // Get total count of players
    const { count: totalCount } = await supabase
      .from('leaderboard')
      .select('*', { count: 'exact', head: true });

    // Get 100th player's EXP for cutoff reference
    const { data: rank100Data } = await supabase
      .from('leaderboard')
      .select('total_exp')
      .order('total_exp', { ascending: false })
      .range(99, 99)
      .maybeSingle();

    return {
      entry: userEntry as LeaderboardEntry,
      rank: (higherCount ?? 0) + 1,
      totalPlayers: totalCount ?? 100,
      cutoffExpTop100: rank100Data?.total_exp ?? 0,
    };
  } catch (err) {
    console.warn('Failed to calculate user rank:', err);
    return null;
  }
}

/**
 * Fetch top 100 players from the Weekly Arena leaderboard.
 */
export async function getWeeklyLeaderboard(weekId: string, limit = 100): Promise<WeeklyLeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('weekly_scores')
      .select('*')
      .eq('week_id', weekId)
      .order('score', { ascending: false })
      .limit(limit);

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
    if (error || !targetUser) {
      // Even if unauthenticated/guest, sync the public leaderboard record
      if (saveData.stats?.userId && (saveData.stats.level || saveData.stats.totalExp)) {
        await upsertLeaderboard(saveData.stats as PlayerStats);
      }
      return false;
    }

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

    // 3. Also sync relational user_mastery table in background
    if (saveData.stats?.itemMastery) {
      const masteryRecords: UserMasteryEntity[] = Object.values(saveData.stats.itemMastery).map(item => ({
        userId: targetUser.id,
        entityType: (item.category as any) || 'grammar',
        entityId: item.itemId,
        masteryState: item.status || 'LEARNING',
        knowledgeScore: 0,
        recognitionScore: 0,
        applicationScore: 0,
        retentionScore: 0,
        trueMasteryPercentage: item.masteryPercentage || 0,
        masteryLevel: item.masteryLevel || 1,
        attemptsCount: item.attemptsCount || 0,
        correctCount: item.consecutivePerfects || 0,
        wrongCount: item.mistakeCount || 0,
        streak: item.consecutivePerfects || 0,
        consecutivePerfects: item.consecutivePerfects || 0,
        lastReviewedAt: item.lastReviewedAt || new Date().toISOString(),
        nextReviewDue: item.nextReviewDue,
        weaknessFlags: item.weaknessFlags,
        errorPatterns: item.errorPatterns
      }));
      syncUserMasteryRelational(masteryRecords).catch(() => {});
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
          characterGender: lbData.character_gender || 'male',
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

// ==========================================
// RELATIONAL IDENTITY ARCHITECTURE HELPERS
// ==========================================

/**
 * Sync relational user mastery items directly to user_mastery table.
 */
export async function syncUserMasteryRelational(masteryRecords: UserMasteryEntity[]): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUser = user || (await getSession())?.user;
    if (!targetUser || !masteryRecords.length) return false;

    const rows = masteryRecords.map(rec => ({
      user_id: targetUser.id,
      entity_type: rec.entityType,
      entity_id: rec.entityId,
      mastery_state: rec.masteryState || 'LEARNING',
      knowledge_score: rec.knowledgeScore || 0,
      recognition_score: rec.recognitionScore || 0,
      application_score: rec.applicationScore || 0,
      retention_score: rec.retentionScore || 0,
      true_mastery_percentage: rec.trueMasteryPercentage || 0,
      mastery_level: rec.masteryLevel || 1,
      attempts_count: rec.attemptsCount || 0,
      practice_count_writing: rec.writingCount || 0,
      practice_count_flashcard: rec.flashcardCount || 0,
      practice_count_quiz: rec.quizCount || 0,
      correct_count: rec.correctCount || 0,
      wrong_count: rec.wrongCount || 0,
      streak: rec.streak || 0,
      consecutive_perfects: rec.consecutivePerfects || 0,
      last_reviewed_at: rec.lastReviewedAt || new Date().toISOString(),
      next_review_due: rec.nextReviewDue || null,
      weakness_flags: rec.weaknessFlags || [],
      error_patterns: rec.errorPatterns || [],
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('user_mastery')
      .upsert(rows, { onConflict: 'user_id,entity_type,entity_id' });

    if (error) {
      console.warn('Note: user_mastery table sync error (database migration pending in Supabase):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to sync relational user mastery:', err);
    return false;
  }
}

/**
 * Log discrete user activity to user_activity event stream table.
 */
export async function logUserActivityEvent(activity: Omit<UserActivityEntity, 'id'>): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUser = user || (await getSession())?.user;
    if (!targetUser) return false;

    const { error } = await supabase
      .from('user_activity')
      .insert({
        user_id: targetUser.id,
        activity_type: activity.activityType,
        entity_type: activity.entityType || null,
        entity_id: activity.entityId || null,
        result: activity.result,
        score: activity.score || 0,
        xp_gained: activity.xpGained || 0,
        duration_seconds: activity.durationSeconds || 0,
        metadata: activity.metadata || {},
        created_at: activity.createdAt || new Date().toISOString()
      });

    if (error) {
      console.warn('Note: user_activity table insert error (database migration pending in Supabase):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to log user activity event:', err);
    return false;
  }
}

/**
 * Load relational user mastery records for current user.
 */
export async function loadUserMasteryRelational(): Promise<UserMasteryEntity[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUser = user || (await getSession())?.user;
    if (!targetUser) return [];

    const { data, error } = await supabase
      .from('user_mastery')
      .select('*')
      .eq('user_id', targetUser.id);

    if (error) {
      console.warn('Note: user_mastery table fetch error:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      masteryState: row.mastery_state,
      knowledgeScore: Number(row.knowledge_score) || 0,
      recognitionScore: Number(row.recognition_score) || 0,
      applicationScore: Number(row.application_score) || 0,
      retentionScore: Number(row.retention_score) || 0,
      trueMasteryPercentage: Number(row.true_mastery_percentage) || 0,
      masteryLevel: row.mastery_level || 1,
      attemptsCount: row.attempts_count || 0,
      writingCount: row.practice_count_writing || 0,
      flashcardCount: row.practice_count_flashcard || 0,
      quizCount: row.practice_count_quiz || 0,
      correctCount: row.correct_count || 0,
      wrongCount: row.wrong_count || 0,
      streak: row.streak || 0,
      consecutivePerfects: row.consecutive_perfects || 0,
      firstSeen: row.first_seen,
      lastReviewedAt: row.last_reviewed_at,
      nextReviewDue: row.next_review_due,
      weaknessFlags: row.weakness_flags || [],
      errorPatterns: row.error_patterns || [],
      updatedAt: row.updated_at
    }));
  } catch (err) {
    console.warn('Failed to load relational user mastery:', err);
    return [];
  }
}


