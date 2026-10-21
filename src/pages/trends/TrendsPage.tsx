/**
 * Trends Page
 * Shows admin-curated trend items. Users can like items — sorted by likes.
 */

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout';
import { AnimatedBackground, Card, Loader, EmptyState, EmptyStateIcons, WatermarkOverlay, FilterChips } from '@/components/common';
import { StarRating } from '@/components/common';
import { useT } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { getTrendItems, toggleTrendLike, type TrendItem } from '@/services/admin';
import { getImageUrl } from '@/services/storage';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

export function TrendsPage() {
  const t = useT();
  const { user } = useAuth();
  const [items, setItems]     = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking]   = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    setLoading(true);
    load();
  }, [user?.id]);
  useRealtimeSync(['trends', 'trend_likes'], load);

  async function load() {
    const { items } = await getTrendItems(user?.id);
    setItems(items);
    setLoading(false);
  }

  async function handleLike(item: TrendItem) {
    if (!user || liking) return;
    setLiking(item.id);

    const wasLiked = item.is_liked_by_user || false;

    // Optimistic update — update count and flag immediately
    setItems(prev => {
      const updated = prev.map(i =>
        i.id === item.id
          ? {
              ...i,
              is_liked_by_user: !wasLiked,
              likes_count: wasLiked
                ? Math.max(0, (i.likes_count || 0) - 1)
                : (i.likes_count || 0) + 1,
            }
          : i
      );
      // Re-sort by likes descending
      return [...updated].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    });

    // Persist to DB
    const { error } = await toggleTrendLike(user.id, item.id, wasLiked);

    if (error) {
      // Revert on failure
      console.error('Like failed:', error);
      setItems(prev => {
        const reverted = prev.map(i =>
          i.id === item.id
            ? {
                ...i,
                is_liked_by_user: wasLiked,
                likes_count: wasLiked
                  ? (i.likes_count || 0) + 1
                  : Math.max(0, (i.likes_count || 0) - 1),
              }
            : i
        );
        return [...reverted].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      });
    }

    setLiking(null);
  }

  const categories = ['All', ...Array.from(new Set(items.map(item => item.category)))];
  const filteredItems = selectedCategory === 'All'
    ? items
    : items.filter(item => item.category === selectedCategory);

  return (
    <>
      <AnimatedBackground variant="home" />
      <TopBar title={t('trends.title')} showProfile={false} />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
        <div className="max-w-7xl mx-auto">

          <div className="mb-6">
            <p className="text-sm text-neutral-500">{t('trends.subtitle')}</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader size="lg" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<EmptyStateIcons.Heart />}
              title={t('trends.empty')}
              description={t('trends.emptySubtitle')}
            />
          ) : (
            <>
              {categories.length > 1 && (
                <div className="mb-6">
                  <FilterChips options={categories} selected={selectedCategory} onChange={setSelectedCategory} />
                </div>
              )}
              <div className="vertical-snap-feed">
              {filteredItems.map((item, idx) => (
                <div key={item.id} className="vertical-snap-item">
                <Card hover className="w-full max-w-xl overflow-hidden relative">

                  {/* Rank badge top 3 */}
                  {idx < 3 && (
                    <div className={`absolute top-2 left-2 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md ${
                      idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-400' : 'bg-amber-600'
                    }`}>
                      {idx + 1}
                    </div>
                  )}

                  {/* Image */}
                  <div className="feed-card-image relative bg-neutral-100 rounded-lg overflow-hidden mb-3">
                    <img
                      src={getImageUrl(item.image_path)}
                      alt={item.name}
                      className="w-full h-full object-contain p-2 transition-transform duration-500 ease-out hover:scale-105"
                    />
                    <WatermarkOverlay visible />
                  </div>

                  {/* Info */}
                  <div className="px-1">
                    <p className="font-medium text-neutral-900 truncate">{item.name}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{item.category}</p>
                    {item.description && (
                      <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{item.description}</p>
                    )}
                    {/* Star rating */}
                    {(item as any).rating > 0 && (
                      <div className="mt-2">
                        <StarRating value={(item as any).rating} size="sm" />
                      </div>
                    )}

                    {/* Bottom row: admin badge + like button */}
                    <div className="flex items-center justify-between mt-3">
                      {/* Created by admin */}
                      <span className="text-xs text-neutral-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Admin
                      </span>

                      {/* Like button */}
                      <button
                        onClick={() => handleLike(item)}
                        disabled={!user || liking === item.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-90 ${
                          item.is_liked_by_user
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
                            : 'bg-neutral-100 text-neutral-500 hover:bg-rose-50 hover:text-rose-500'
                        } disabled:opacity-50`}
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${item.is_liked_by_user ? 'scale-110' : ''}`}
                          fill={item.is_liked_by_user ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth={item.is_liked_by_user ? 0 : 2}
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        <span>{item.likes_count || 0}</span>
                      </button>
                    </div>
                  </div>
                </Card>
                </div>
              ))}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
