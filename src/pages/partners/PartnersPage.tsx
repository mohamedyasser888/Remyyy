/**
 * Partners Page — User view
 * Shows all brand partners. Tap a partner to see their clothes collection.
 */

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout';
import { AnimatedBackground, Card, Loader, EmptyState, EmptyStateIcons, StarRating, WatermarkOverlay, FilterChips } from '@/components/common';
import { getPartners, getPartnerPosts, type Partner, type PartnerPost } from '@/services/partners';
import { getImageUrl } from '@/services/storage';
import { useT } from '@/i18n';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

export function PartnersPage() {
  const t = useT();
  const [partners, setPartners]       = useState<Partner[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<Partner | null>(null);
  const [posts, setPosts]             = useState<PartnerPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Poll partners list every 5s
  useEffect(() => {
    getPartners().then(({ partners }) => {
      setPartners(partners);
      setLoading(false);
    });
  }, []);
  useRealtimeSync(['partners'], async () => {
    const { partners: fresh } = await getPartners();
    setPartners(fresh);
    setLoading(false);
  });

  // Poll selected partner's posts every 5s
  useEffect(() => {
    if (!selected) return;
  }, [selected?.id]);
  useRealtimeSync(['partner_posts'], async () => {
    if (!selected) return;
    const { posts: fresh } = await getPartnerPosts(selected.id);
    setPosts(fresh);
  });

  const openPartner = async (partner: Partner) => {
    setSelected(partner);
    setLoadingPosts(true);
    setCategoryFilter('All');
    const { posts } = await getPartnerPosts(partner.id);
    setPosts(posts);
    setLoadingPosts(false);
  };

  const filteredPosts = categoryFilter === 'All'
    ? posts
    : posts.filter(p => p.category === categoryFilter);

  const categories = ['All', ...Array.from(new Set(posts.map(p => p.category)))];

  // ── Partner detail view ──────────────────────────────────────────────────
  if (selected) {
    return (
      <>
        <AnimatedBackground variant="home" />
        <TopBar title={selected.name} showProfile={false} />

        <div className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Partner header */}
            <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-5">
              <div
                className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-neutral-100 shadow cursor-pointer hover:scale-105 transition-transform"
              >
                <img src={getImageUrl(selected.thumbnail_path)} alt={selected.name} className="w-full h-full object-cover" />
                <WatermarkOverlay visible />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-neutral-900">{selected.name}</h2>
                {selected.rating && (
                  <div className="mt-1">
                    <StarRating value={selected.rating} size="sm" />
                  </div>
                )}
                {selected.website_url && (
                  <a
                    href={selected.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-700 mt-2 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {selected.website_url.replace(/^https?:\/\//, '')}
                  </a>
                )}
                <p className="text-sm text-neutral-500 mt-1">{posts.length} items</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Category filter */}
            {categories.length > 1 && (
              <FilterChips
                options={categories}
                selected={categoryFilter}
                onChange={setCategoryFilter}
                showMoreLabel={t('common.showMore')}
                showLessLabel={t('common.showLess')}
              />
            )}

            {/* Posts grid */}
            {loadingPosts ? (
              <div className="flex justify-center py-16"><Loader size="lg" /></div>
            ) : filteredPosts.length === 0 ? (
              <EmptyState
                icon={<EmptyStateIcons.Wardrobe />}
                title="No items yet"
                description="This partner hasn't added any items yet"
              />
            ) : (
              <div className="max-w-[1500px] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredPosts.map((post, index) => (
                  <Card
                    key={post.id}
                    className="partner-post-card group overflow-hidden rounded-2xl border border-white/80 bg-white/90 p-2 shadow-[0_12px_32px_rgba(86,55,100,0.08)] transition-all duration-300 hover:shadow-[0_22px_42px_rgba(86,55,100,0.16)]"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-neutral-100">
                      <img
                        src={getImageUrl(post.image_path)}
                        alt={post.name}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                      <WatermarkOverlay visible />
                      <div className="absolute inset-x-2 bottom-2 flex items-end justify-between gap-2">
                        <span className="max-w-[70%] truncate rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">{post.name}</span>
                        <span className="rounded-full bg-white/90 px-2 py-1 text-[9px] font-bold uppercase text-primary-700 shadow-sm">{post.category}</span>
                      </div>
                    </div>

                    <div className="space-y-2 px-2 pb-2 pt-3">
                      <div>
                        <h3 className="truncate text-sm font-bold text-neutral-900" title={post.name}>{post.name}</h3>
                        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-primary-600">{post.category}</p>
                      </div>

                      {(post.brand || post.size) && (
                        <div className="flex flex-wrap gap-1.5">
                          {post.brand && <span className="rounded-full bg-primary-50 px-2 py-1 text-[10px] font-semibold text-primary-700">{post.brand}</span>}
                          {post.size && <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-600">Size {post.size}</span>}
                        </div>
                      )}

                      {post.description && <p className="line-clamp-3 text-xs leading-relaxed text-neutral-600">{post.description}</p>}

                      {post.rating ? (
                        <div className="flex items-center gap-2 border-t border-neutral-100 pt-2">
                          <StarRating value={post.rating} size="sm" />
                          <span className="text-[10px] font-semibold text-neutral-500">{post.rating}/5</span>
                        </div>
                      ) : null}

                      {post.review && (
                        <div className="rounded-xl bg-primary-50/60 px-3 py-2">
                          <p className="line-clamp-3 text-[11px] italic leading-relaxed text-neutral-600">“{post.review}”</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Partners list view ───────────────────────────────────────────────────
  return (
    <>
      <AnimatedBackground variant="home" />
      <TopBar title={t('partners.title')} showProfile={false} />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-neutral-500 mb-6">{t('partners.subtitle')}</p>

          {loading ? (
            <div className="flex justify-center py-20"><Loader size="lg" /></div>
          ) : partners.length === 0 ? (
            <EmptyState
              icon={<EmptyStateIcons.Heart />}
              title={t('partners.empty')}
              description={t('partners.emptySubtitle')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {partners.map(partner => (
                <div key={partner.id} className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Thumbnail — full width, click to view collection */}
                  <div
                    className="w-full h-48 bg-neutral-100 overflow-hidden cursor-pointer group relative"
                    onClick={() => openPartner(partner)}
                  >
                    <img
                      src={getImageUrl(partner.thumbnail_path)}
                      alt={partner.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <WatermarkOverlay visible />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 bg-white text-neutral-900 text-sm font-semibold px-4 py-2 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0l-7 7m7-7l-7-7" />
                        </svg>
                        View Collection
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-neutral-900 text-lg leading-tight">{partner.name}</h3>
                    </div>

                    {partner.rating && (
                      <StarRating value={partner.rating} size="sm" />
                    )}

                    {/* Full URL button — always fully visible */}
                    {partner.website_url && (
                      <a
                        href={partner.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-primary-500 to-pink-500 hover:from-primary-600 hover:to-pink-600 text-white rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span className="flex-1 text-left break-all leading-tight text-xs">
                          {partner.website_url}
                        </span>
                      </a>
                    )}

                    <button
                      onClick={() => openPartner(partner)}
                      className="w-full py-2 text-sm font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors"
                    >
                      View Collection →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
