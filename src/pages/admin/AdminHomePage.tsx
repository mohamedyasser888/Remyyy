/** Admin Home Feed: Instagram-style single-column feed. */

import { useEffect, useState } from 'react';
import { supabase, supabaseAdmin } from '@/services/supabase';
import { deletePost } from '@/services/posts';
import { getImageUrl } from '@/services/storage';
import { Card, Loader } from '@/components/common';
import { ALL_CATEGORIES } from '@/utils/constants';
import type { PostWithLikes } from '@/types';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

const db = supabaseAdmin ?? supabase;
const INITIAL_CATEGORY_COUNT = 5;

type AdminPost = PostWithLikes & { rating?: number | null; updated_at?: string | null };

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value));
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="min-w-0 border-b border-neutral-100 py-2 last:border-0">
      <dt className="text-xs font-medium text-neutral-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm leading-5 text-neutral-800">{String(value)}</dd>
    </div>
  );
}

function CompactRating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm" aria-label={`Rating ${value} out of 5`}>
      <span className="tracking-tight text-primary-500">{'★'.repeat(value)}<span className="text-neutral-300">{'★'.repeat(Math.max(0, 5 - value))}</span></span>
      <span className="text-xs text-neutral-500">{value}/5</span>
    </span>
  );
}

function AdminPostCard({ post, email, deleting, onDelete }: {
  post: AdminPost; email?: string; deleting: boolean; onDelete: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const authorName = post.display_name || 'Unknown user';
  const initials = authorName.trim().charAt(0).toUpperCase() || '?';
  const hasLongCaption = `${post.name}. ${post.description || ''}`.length > 150;
  const edited = post.updated_at && new Date(post.updated_at).getTime() > new Date(post.created_at).getTime() + 1000;

  return (
    <Card style={{ maxWidth: '340px' }} className="w-full max-w-[340px] overflow-hidden p-0 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white">{initials}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900">{authorName}</p>
          <p className="truncate text-xs leading-5 text-neutral-500">{post.category}{post.size ? ` · ${post.size}` : ''}</p>
        </div>
        <button type="button" onClick={onDelete} disabled={deleting} aria-label={`Delete ${post.name}`} className="shrink-0 rounded-lg border border-primary-200 px-2.5 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60">
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>

      <div className="relative h-[280px] max-h-[38vh] overflow-hidden bg-neutral-100">
        <img src={getImageUrl(post.image_path)} alt={post.name} loading="lazy" className="h-full w-full object-contain transition-transform duration-500 ease-out hover:scale-[1.02]" />
      </div>

      <div className="flex items-center gap-4 px-4 pt-3 text-sm text-neutral-700">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <svg className="h-5 w-5 text-primary-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
          {post.likes_count}
        </span>
        {post.rating ? <CompactRating value={post.rating} /> : null}
      </div>

      <div className="px-4 pt-3">
        <p className={`text-sm leading-6 text-neutral-800 ${showCaption ? '' : 'line-clamp-2'}`}>
          <span className="font-semibold text-neutral-900">{authorName}</span>{' '}
          <span className="font-semibold">{post.name}</span>{post.description ? `. ${post.description}` : ''}
        </p>
        {hasLongCaption && <button type="button" onClick={() => setShowCaption(value => !value)} className="mt-1 text-xs font-semibold text-primary-600 hover:text-primary-700">{showCaption ? 'less' : 'more'}</button>}
      </div>

      <div className="px-4 pt-3">
        <button type="button" onClick={() => setShowDetails(value => !value)} aria-expanded={showDetails} className="flex w-full items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-left text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50">
          <span>{showDetails ? 'Hide details' : 'View details'}</span>
          <svg className={`h-4 w-4 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        {showDetails && <div className="animate-slide-up">
          <dl className="divide-y divide-neutral-100 pt-1 sm:grid sm:grid-cols-2 sm:gap-x-4 sm:divide-y-0">
            <DetailRow label="Author username" value={authorName} />
            <DetailRow label="Author email" value={email} />
            <DetailRow label="Title" value={post.name} />
            <DetailRow label="Description" value={post.description} />
            <DetailRow label="Category" value={post.category} />
            <DetailRow label="Size" value={post.size} />
            <DetailRow label="Brand" value={post.brand} />
            <DetailRow label="Brand partner ID" value={post.brand_partner_id} />
            <DetailRow label="Review" value={post.review} />
            <DetailRow label="Rating" value={post.rating ? `${post.rating}/5` : null} />
          </dl>
        </div>}
      </div>

      <div className="px-4 pb-4 pt-3 text-xs leading-5 text-neutral-500">
        <p title={post.created_at}>Created {formatDate(post.created_at)}</p>
        {edited && <p title={post.updated_at || undefined}>Edited {formatDate(post.updated_at)}</p>}
      </div>
    </Card>
  );
}

export function AdminHomePage() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => { setLoading(true); load(); }, []);
  useRealtimeSync(['posts', 'post_likes', 'profiles'], load, { admin: true });

  async function load() {
    const [{ data, error }, usersResult] = await Promise.all([
      db.from('posts').select('*, profiles!posts_user_id_fkey(display_name, gender)').order('created_at', { ascending: false }),
      db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (!error && data) {
      const postIds = data.map(post => post.id);
      const { data: likes } = postIds.length ? await db.from('post_likes').select('post_id').in('post_id', postIds) : { data: [] };
      const counts: Record<string, number> = {};
      (likes || []).forEach(like => { counts[like.post_id] = (counts[like.post_id] || 0) + 1; });
      setPosts(data.map(post => ({ ...post, display_name: post.profiles?.display_name || 'Unknown user', poster_gender: post.profiles?.gender || 'female', likes_count: counts[post.id] || 0 })) as AdminPost[]);
    }
    const emailMap: Record<string, string> = {};
    (usersResult.data?.users || []).forEach(user => { if (user.email) emailMap[user.id] = user.email; });
    setEmails(emailMap);
    setLoading(false);
  }

  async function handleDelete(post: AdminPost) {
    if (!confirm(`Delete "${post.name}"? This cannot be undone.`)) return;
    setDeleting(post.id);
    await deletePost(post.id, post.image_path);
    setPosts(current => current.filter(item => item.id !== post.id));
    setDeleting(null);
  }

  const categoryOptions = ['All', ...ALL_CATEGORIES];
  const visibleCategories = showAllCategories ? categoryOptions : categoryOptions.slice(0, INITIAL_CATEGORY_COUNT);
  const filteredPosts = selectedCategory === 'All' ? posts : posts.filter(post => post.category === selectedCategory);

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
      <div style={{ maxWidth: '340px' }} className="mx-auto max-w-[340px] pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Home Feed</h1>
        <p className="mt-1 text-sm text-slate-500">{posts.length} posts — you can delete any</p>
      </div>
      <div style={{ maxWidth: '340px' }} className="mx-auto mb-5 flex max-w-[340px] items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {visibleCategories.map(category => <button key={category} type="button" onClick={() => setSelectedCategory(category)} aria-pressed={selectedCategory === category} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200 ${selectedCategory === category ? 'border-primary-500 bg-primary-500 text-white shadow-sm' : 'border-neutral-200 bg-white text-primary-700 hover:border-primary-200 hover:bg-primary-50'}`}>{category}</button>)}
        {categoryOptions.length > INITIAL_CATEGORY_COUNT && <button type="button" onClick={() => setShowAllCategories(value => !value)} className="shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50">{showAllCategories ? 'Show less' : 'Show more'}</button>}
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader size="lg" /></div> : filteredPosts.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">No posts in this category.</p> : <div style={{ maxWidth: '340px' }} className="mx-auto flex max-w-[340px] flex-col gap-5">{filteredPosts.map(post => <AdminPostCard key={post.id} post={post} email={emails[post.user_id]} deleting={deleting === post.id} onDelete={() => handleDelete(post)} />)}</div>}
    </div>
  );
}
