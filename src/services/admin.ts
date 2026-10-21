/**
 * Admin Service
 * Data fetching for admin dashboard and trends management
 */

import { supabase, supabaseAdmin } from './supabase';
import { uploadImage, deleteImage } from './storage';
import type { Category, Size } from '@/types';

// Admin client bypasses RLS — admin panel has no Supabase auth session
const db = supabaseAdmin ?? supabase;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalLikes: number;
  dailyVisits: number;
  // Age range breakdown instead of average
  ageRanges: { range: string; count: number }[];
  topPost: {
    id: string;
    name: string;
    image_path: string;
    likes_count: number;
    display_name: string;
  } | null;
  // Chart data
  visitsLast7Days: { date: string; visitors: number }[];
  postsLast7Days:  { date: string; posts: number }[];
  likesLast7Days:  { date: string; likes: number }[];
  categoryBreakdown: { name: string; count: number }[];
}

export interface TrendItem {
  id: string;
  admin_id: string;
  name: string;
  category: string;
  size?: string | null;
  description: string;
  image_path: string;
  created_at: string;
  likes_count?: number;
  is_liked_by_user?: boolean;
}

export interface TrendPost {
  id: string;
  user_id: string;
  name: string;
  size: Size;
  category: Category;
  description: string;
  image_path: string;
  created_at: string;
  display_name: string;
  poster_gender: string;
  likes_count: number;
  is_liked_by_user?: boolean;
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export async function getDashboardStats(date?: string): Promise<{ stats: DashboardStats | null; error: Error | null }> {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];

    // ── All via SECURITY DEFINER RPCs — work without Supabase auth ───────
    const [
      { data: totalUsers,    error: e1 },
      { data: totalPosts,    error: e2 },
      { data: totalLikes,    error: e3 },
      { data: ageRows,       error: e4 },
      { data: uniqueVis,     error: e5 },
      { data: visits7,       error: e6 },
      { data: posts7,        error: e7 },
      { data: likes7,        error: e8 },
      { data: topPostRow,    error: e9 },
      { data: catRows,       error: e10 },
    ] = await Promise.all([
      db.rpc('get_users_count'),
      db.rpc('get_posts_count'),
      db.rpc('get_likes_count'),
      db.rpc('get_profiles_age'),
      db.rpc('get_unique_visitors', { target_date: targetDate }),
      db.rpc('get_visits_last_7_days'),
      db.rpc('get_posts_last_7_days'),
      db.rpc('get_likes_last_7_days'),
      db.rpc('get_top_post'),
      db.rpc('get_category_breakdown'),
    ]);

    // Log any RPC errors for debugging
    [e1,e2,e3,e4,e5,e6,e7,e8,e9,e10].forEach((e, i) => {
      if (e) console.warn(`RPC ${i+1} error:`, e.message);
    });

    // ── Age ranges ────────────────────────────────────────────────────────
    const rangeDefs = [
      { label: '<18',   min: 0,  max: 17  },
      { label: '18–24', min: 18, max: 24  },
      { label: '25–34', min: 25, max: 34  },
      { label: '35–44', min: 35, max: 44  },
      { label: '45–54', min: 45, max: 54  },
      { label: '55+',   min: 55, max: 999 },
    ];
    const validAges = ((ageRows as any[]) || []).map((r: any) => r.age as number);
    const ageRanges = rangeDefs
      .map(r => ({ range: r.label, count: validAges.filter(a => a >= r.min && a <= r.max).length }))
      .filter(r => r.count > 0);

    // ── Fill 7-day arrays ensuring all 7 days are present ────────────────
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    const fmt = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const visitsMap: Record<string, number> = {};
    ((visits7 as any[]) || []).forEach((r: any) => { visitsMap[r.day] = r.unique_visitors; });
    const postsMap: Record<string, number> = {};
    ((posts7 as any[]) || []).forEach((r: any) => { postsMap[r.day] = r.post_count; });
    const likesMap: Record<string, number> = {};
    ((likes7 as any[]) || []).forEach((r: any) => { likesMap[r.day] = r.like_count; });

    const visitsLast7Days = days.map(d => ({ date: fmt(d), visitors: visitsMap[d] || 0 }));
    const postsLast7Days  = days.map(d => ({ date: fmt(d), posts:    postsMap[d]  || 0 }));
    const likesLast7Days  = days.map(d => ({ date: fmt(d), likes:    likesMap[d]  || 0 }));

    // ── Category breakdown ────────────────────────────────────────────────
    const categoryBreakdown = ((catRows as any[]) || []).map((r: any) => ({
      name: r.category, count: r.post_count,
    }));

    // ── Top post ──────────────────────────────────────────────────────────
    const tp = ((topPostRow as any[]) || [])[0];
    const topPost: DashboardStats['topPost'] = tp ? {
      id: tp.id, name: tp.name, image_path: tp.image_path,
      likes_count: tp.likes_count, display_name: tp.display_name,
    } : null;

    return {
      stats: {
        totalUsers:        (totalUsers  as number) || 0,
        totalPosts:        (totalPosts  as number) || 0,
        totalLikes:        (totalLikes  as number) || 0,
        dailyVisits:       (uniqueVis   as number) || 0,
        ageRanges,
        topPost,
        visitsLast7Days,
        postsLast7Days,
        likesLast7Days,
        categoryBreakdown,
      },
      error: null,
    };
  } catch (error) {
    return { stats: null, error: error as Error };
  }
}

// ── Trending Posts (ordered by likes) ────────────────────────────────────────

export async function getTrendingPosts(userId?: string): Promise<{ posts: TrendPost[]; error: Error | null }> {
  try {
    const { data: posts, error } = await db
      .from('posts')
      .select(`*, profiles!posts_user_id_fkey(display_name, gender)`);

    if (error) throw error;
    if (!posts || posts.length === 0) return { posts: [], error: null };

    const postIds = posts.map(p => p.id);

    const { data: allLikes } = await db
      .from('post_likes')
      .select('post_id, user_id')
      .in('post_id', postIds);

    const likeCounts: Record<string, number> = {};
    const userLikedIds = new Set<string>();

    (allLikes || []).forEach(l => {
      likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1;
      if (userId && l.user_id === userId) userLikedIds.add(l.post_id);
    });

    const formatted: TrendPost[] = posts
      .map(p => ({
        ...p,
        display_name: p.profiles?.display_name || 'Unknown',
        poster_gender: p.profiles?.gender || 'female',
        likes_count: likeCounts[p.id] || 0,
        is_liked_by_user: userLikedIds.has(p.id),
      }))
      .sort((a, b) => b.likes_count - a.likes_count);

    return { posts: formatted, error: null };
  } catch (error) {
    return { posts: [], error: error as Error };
  }
}

// ── Admin-only Trend Items ────────────────────────────────────────────────────

export async function getTrendItems(userId?: string): Promise<{ items: TrendItem[]; error: Error | null }> {
  try {
    const { data, error } = await db
      .from('trends')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return { items: [], error: null };

    // Get like counts
    const trendIds = data.map(t => t.id);
    const { data: likes } = await db
      .from('trend_likes')
      .select('trend_id, user_id')
      .in('trend_id', trendIds);

    const likeCounts: Record<string, number> = {};
    const userLiked = new Set<string>();
    (likes || []).forEach(l => {
      likeCounts[l.trend_id] = (likeCounts[l.trend_id] || 0) + 1;
      if (userId && l.user_id === userId) userLiked.add(l.trend_id);
    });

    const items: TrendItem[] = data
      .map(t => ({
        ...t,
        likes_count: likeCounts[t.id] || 0,
        is_liked_by_user: userLiked.has(t.id),
      }))
      .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)); // order by likes

    return { items, error: null };
  } catch (error) {
    return { items: [], error: error as Error };
  }
}

export async function toggleTrendLike(
  userId: string,
  trendId: string,
  isLiked: boolean
): Promise<{ error: Error | null }> {
  try {
    if (isLiked) {
      const { error } = await db
        .from('trend_likes')
        .delete()
        .eq('user_id', userId)
        .eq('trend_id', trendId);
      if (error) throw error;
    } else {
      const { error } = await db
        .from('trend_likes')
        .insert({ user_id: userId, trend_id: trendId });
      if (error) throw error;
    }
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function createTrendItem(
  _adminId: string,
  item: { name: string; category: string; size?: string | null; description: string; rating: number; image: File }
): Promise<{ item: TrendItem | null; error: Error | null }> {
  try {
    const { path, error: uploadErr } = await uploadImage(item.image, 'admin');
    if (uploadErr || !path) throw uploadErr || new Error('Upload failed');

    const { data, error } = await db
      .from('trends')
      .insert({
        name:        item.name,
        category:    item.category,
        size:        item.size || null,
        description: item.description,
        rating:      item.rating || null,
        image_path:  path,
      })
      .select()
      .single();

    if (error) throw error;
    return { item: data, error: null };
  } catch (error) {
    return { item: null, error: error as Error };
  }
}

export async function deleteTrendItem(
  id: string,
  imagePath: string
): Promise<{ error: Error | null }> {
  try {
    await deleteImage(imagePath);
    const { error } = await db.from('trends').delete().eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

// ── Record page visit ─────────────────────────────────────────────────────────

export async function recordVisit(userId: string): Promise<void> {
  try {
    await db.from('page_visits').insert({ user_id: userId });
  } catch { /* silent */ }
}
