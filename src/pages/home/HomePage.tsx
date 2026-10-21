/**
 * Home Page
 * Community feed with posts
 */

import { useState } from 'react';
import { TopBar } from '@/components/layout';
import { PostCard } from '@/components/features/home/PostCard';
import { PostForm, type PostFormData } from '@/components/features/home/PostForm';
import { Button, FilterChips, EmptyState, EmptyStateIcons, SkeletonGrid, Modal, AnimatedBackground } from '@/components/common';
import { usePosts } from '@/hooks/usePosts';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useT } from '@/i18n';
import { getErrorMessage } from '@/utils/errorHandling';
import { ALL_CATEGORIES } from '@/utils/constants';
import { createPartnerPostFromExistingImage } from '@/services/partners';
import type { Category, PostWithLikes } from '@/types';

export function HomePage() {
  const t = useT();
  const { profile } = useAuth();
  const { posts, loading, selectedCategory, setSelectedCategory, createPost, deletePost, toggleLike } = usePosts();
  const { showToast } = useToast();

  const [showPostForm, setShowPostForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState<PostWithLikes | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreatePost = async (data: PostFormData) => {
    if (!profile) return;

    const { error } = await createPost({
      user_id: profile.id,
      name: data.name,
      size: data.size || null,
      category: data.category as any,
      description: data.description,
      image_path: data.imagePath!,
      rating: data.rating || null,
      brand: data.brand || null,
      brand_partner_id: data.brand_partner_id || null,
      review: data.review || null,
    } as any);

    if (error) {
      showToast(getErrorMessage(error), 'error');
      throw error;
    }

    // A partner-branded home post is also published to that partner's
    // collection. The image is copied into the partner folder and all post
    // details are preserved without linking the two records destructively.
    if (data.brand_partner_id && data.imagePath) {
      const { error: partnerPostError } = await createPartnerPostFromExistingImage(
        data.brand_partner_id,
        {
          name: data.name,
          size: data.size || null,
          category: data.category,
          description: data.description,
          rating: data.rating || null,
          imagePath: data.imagePath,
          brand: data.brand || null,
          review: data.review || null,
        },
      );

      if (partnerPostError) {
        console.error('Partner collection sync failed:', partnerPostError);
        showToast('Post created, but it could not be added to the partner collection.', 'error');
      }
    }

    setShowPostForm(false);
  };

  const handleDeleteClick = (post: PostWithLikes) => {
    setPostToDelete(post);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;

    setDeleting(true);

    try {
      // Delete from database (includes image deletion)
      const { error: deleteError } = await deletePost(postToDelete.id, postToDelete.image_path);

      if (deleteError) {
        showToast(getErrorMessage(deleteError), 'error');
        return;
      }

      showToast(t('success.postDeleted'), 'success');
      setShowDeleteConfirm(false);
      setPostToDelete(null);
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    const { error } = await toggleLike(postId);

    if (error) {
      showToast(getErrorMessage(error), 'error');
    }
  };

  const handleCategoryChange = (category: Category | 'All') => {
    setSelectedCategory(category);
  };

  return (
    <>
      <AnimatedBackground variant="home" />
      <TopBar title={t('home.title')} />

      <div className="flex-1 relative z-10">
        {/* Category Filter */}
        <div className="sticky top-16 lg:top-0 z-20 bg-white border-b border-neutral-200 py-3">
          <div className="max-w-7xl mx-auto px-4">
            <FilterChips
              options={['All', ...ALL_CATEGORIES] as const}
              selected={selectedCategory}
              onChange={handleCategoryChange}
              getLabel={(category) => 
                category === 'All' 
                  ? t('common.all') 
                  : t(`categories.${category.toLowerCase().replace(/\s+/g, '')}`)
              }
              showMoreLabel={t('common.showMore')}
              showLessLabel={t('common.showLess')}
            />
          </div>
        </div>

        {/* Posts Grid */}
        <div className="max-w-7xl mx-auto p-4 pb-24">
          {loading ? (
            <SkeletonGrid count={8} />
          ) : posts.length === 0 ? (
            <EmptyState
              icon={<EmptyStateIcons.Image />}
              title={
                selectedCategory === 'All'
                  ? t('home.emptyFeed')
                  : t('home.emptyCategory')
              }
              description={
                selectedCategory === 'All'
                  ? t('home.emptyFeedSubtitle')
                  : t('home.emptyCategorySubtitle')
              }
              action={{
                label: t('home.createPost'),
                onClick: () => setShowPostForm(true)
              }}
            />
          ) : (
            <div className="vertical-snap-feed">
              {posts.map(post => (
                <div key={post.id} className="vertical-snap-item">
                  <div className="w-full max-w-xl">
                    <PostCard
                      post={post}
                      onToggleLike={handleToggleLike}
                      onDelete={handleDeleteClick}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Cloth Button — top right, leaves bottom right for chat */}
      <button
        onClick={() => setShowPostForm(true)}
        className="fixed top-4 right-4 lg:top-6 lg:right-6 z-40
          flex items-center gap-2 px-4 py-2.5
          bg-primary-500 text-white rounded-full shadow-lg
          hover:bg-primary-600 active:bg-primary-700
          hover:scale-105 active:scale-95
          transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-primary-300"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        <span className="font-semibold text-sm whitespace-nowrap">{t('home.createPost')}</span>
      </button>

      {/* Create Post Modal */}
      <PostForm
        isOpen={showPostForm}
        onClose={() => setShowPostForm(false)}
        onSubmit={handleCreatePost}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => !deleting && setShowDeleteConfirm(false)}
        title={t('home.deletePost')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-neutral-600">{t('home.deletePostConfirm')}</p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={handleDeleteConfirm}
              loading={deleting}
            >
              {deleting ? t('common.loading') : t('common.delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
