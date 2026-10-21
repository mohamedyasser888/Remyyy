/**
 * Points Service
 * - 10 RMS when user uploads a post
 * - 1 RMS when one of the user's posts receives a like
 * - Points are never removed when unlike happens
 */

import { supabase, supabaseAdmin } from './supabase';

// Use admin client when available (bypasses RLS for admin-only reads)
// Falls back to regular client if service role key is not configured
const db = supabaseAdmin ?? supabase;

export const RMS_PER_POST = 10;
export const RMS_PER_RECEIVED_LIKE = 1;

export type RemyTierId = 'rems_muse' | 'remy_icon' | 'remy_ulite';

export interface RemyTier {
  id: RemyTierId;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  description: string;
  icon: string;
  className: string;
}

// Boundaries are intentionally non-overlapping: Muse < 100, Icon 100–499,
// and Ulite 500+.
export const REMY_TIERS: RemyTier[] = [
  {
    id: 'rems_muse', name: 'Rems Muse', minPoints: 0, maxPoints: 99,
    description: '0–99 RMS', icon: '✦', className: 'from-fuchsia-400 to-purple-500',
  },
  {
    id: 'remy_icon', name: 'Remy Icon', minPoints: 100, maxPoints: 499,
    description: '100–499 RMS', icon: '◇', className: 'from-sky-400 to-indigo-500',
  },
  {
    id: 'remy_ulite', name: 'Remy Ulite', minPoints: 500, maxPoints: null,
    description: '500+ RMS', icon: '♛', className: 'from-amber-400 to-orange-500',
  },
];

export function getRemyTier(points: number): RemyTier {
  return points >= 500 ? REMY_TIERS[2] : points >= 100 ? REMY_TIERS[1] : REMY_TIERS[0];
}

function pointsForAction(action: string | null | undefined, storedPoints = 0): number {
  if (action === 'post_upload') return RMS_PER_POST;
  if (action === 'post_received_like') return RMS_PER_RECEIVED_LIKE;
  return storedPoints;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_points: number;
  rank: number;
  tier: RemyTier;
}

// ── Award points ──────────────────────────────────────────────────────────────

export async function awardUploadPoints(userId: string, postId: string): Promise<void> {
  try {
    await supabase.from('user_points').upsert(
      { user_id: userId, action: 'post_upload', reference_id: postId, points: RMS_PER_POST },
      { onConflict: 'user_id,action,reference_id', ignoreDuplicates: true }
    );
  } catch (e) {
    console.warn('awardUploadPoints failed:', e);
  }
}

// ── Get points for one user ───────────────────────────────────────────────────

export async function getUserPoints(userId: string): Promise<number> {
  try {
    const { data, error } = await db
      .from('user_points')
      .select('action, points')
      .eq('user_id', userId);

    if (error) throw error;
    return (data || []).reduce((sum, row) => sum + pointsForAction(row.action, row.points), 0);
  } catch {
    return 0;
  }
}

// ── Leaderboard — ALL users, ALL time ────────────────────────────────────────
// Uses .limit(10000) on every query to never hit the default 1000-row cap.

export async function getLeaderboard(): Promise<{ entries: LeaderboardEntry[]; error: Error | null }> {
  try {
    // Fetch everything in parallel — explicit high limit so no rows are dropped
    // Uses admin client (db) to bypass RLS — admin panel has no Supabase auth session
    const [
      { data: profiles,   error: prErr },
      { data: pointsData, error: ptErr },
      { data: postsData,  error: poErr },
      { data: likesData,  error: liErr },
    ] = await Promise.all([
      db.from('profiles').select('id, display_name').limit(10000),
      db.from('user_points').select('user_id, action, points').limit(10000),
      db.from('posts').select('id, user_id').limit(10000),
      db.from('post_likes').select('post_id').limit(10000),
    ]);

    if (prErr) throw prErr;
    if (!profiles || profiles.length === 0) return { entries: [], error: null };

    if (ptErr) console.warn('user_points error:', ptErr.message);
    if (poErr) console.warn('posts error:', poErr.message);
    if (liErr) console.warn('post_likes error:', liErr.message);

    // ── Sum points from user_points table ──────────────────────────────────
    const pointsTotals: Record<string, number> = {};
    (pointsData || []).forEach(row => {
      pointsTotals[row.user_id] = (pointsTotals[row.user_id] || 0) + pointsForAction(row.action, row.points);
    });

    // ── Fallback: calculate directly from posts + likes ────────────────────
    //    Ensures users that pre-date the points system are always shown
    const directTotals: Record<string, number> = {};
    (postsData || []).forEach(row => {
      directTotals[row.user_id] = (directTotals[row.user_id] || 0) + RMS_PER_POST;
    });
    const postOwners: Record<string, string> = {};
    (postsData || []).forEach(row => {
      postOwners[row.id] = row.user_id;
    });
    (likesData || []).forEach(row => {
      const ownerId = postOwners[row.post_id];
      if (ownerId) {
        directTotals[ownerId] = (directTotals[ownerId] || 0) + RMS_PER_RECEIVED_LIKE;
      }
    });

    // ── Merge: take whichever is higher ────────────────────────────────────
    const finalTotals: Record<string, number> = {};
    const allUserIds = new Set([
      ...Object.keys(pointsTotals),
      ...Object.keys(directTotals),
    ]);
    allUserIds.forEach(uid => {
      finalTotals[uid] = Math.max(pointsTotals[uid] || 0, directTotals[uid] || 0);
    });

    // ── Build leaderboard: EVERY profile row, 0 points if no activity ──────
    const entries: LeaderboardEntry[] = profiles
      .map(p => ({
        user_id:      p.id,
        display_name: p.display_name || `User ${p.id.slice(0, 8)}`,
        total_points: finalTotals[p.id] || 0,
        rank:         0,
        tier:         getRemyTier(finalTotals[p.id] || 0),
      }))
      .sort((a, b) => b.total_points - a.total_points || a.display_name.localeCompare(b.display_name))
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    return { entries, error: null };
  } catch (error) {
    return { entries: [], error: error as Error };
  }
}

// ── Realtime subscription helpers ─────────────────────────────────────────────
// Subscribe to any change in user_points, posts, or post_likes and call onRefresh.

export function subscribeLeaderboard(onRefresh: () => void): () => void {
  const channel = supabase
    .channel('leaderboard-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_points' },  onRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' },        onRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' },   onRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' },     onRefresh)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
