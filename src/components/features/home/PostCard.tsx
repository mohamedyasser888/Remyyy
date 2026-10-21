/**
 * Post Card Component
 * Display community post with like functionality
 */

import { useState } from 'react';
import { Card, HeartButton, ImageZoomModal, WatermarkOverlay } from '@/components/common';
import { StarRating } from '@/components/common';
import { getImageUrl } from '@/services/storage';
import { useAuth } from '@/hooks/useAuth';
import type { PostWithLikes } from '@/types';

interface PostCardProps {
  post: PostWithLikes;
  onToggleLike: (postId: string) => void;
  onDelete?: (post: PostWithLikes) => void;
}

export function PostCard({ post, onToggleLike, onDelete }: PostCardProps) {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const imageUrl = getImageUrl(post.image_path);
  const isOwnPost = user?.id === post.user_id;

  return (
    <Card hover className="relative overflow-hidden">
      {/* Image */}
      <div 
        className="post-card-image relative bg-neutral-200 rounded-lg overflow-hidden mb-3 cursor-pointer hover:opacity-95 transition-smooth"
        onClick={() => setShowZoom(true)}
      >
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-15 blur-2xl"
        />
        <img
          src={imageUrl}
          alt={post.name}
          className="relative z-[1] w-full h-full object-cover transition-transform duration-500 ease-out hover:scale-105"
          loading="lazy"
        />
        {/* Keep the mark visible in the UI even if an older upload is served from cache. */}
        <WatermarkOverlay visible />
      </div>

      {/* Delete Button (own posts only) */}
      {isOwnPost && onDelete && (
        <div className="absolute top-2 left-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="touch-target p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-smooth"
            aria-label="More options"
          >
            <svg className="w-5 h-5 text-neutral-700" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute left-0 top-12 z-20 w-40 bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden">
                <button
                  onClick={() => {
                    onDelete(post);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-smooth flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions below the image so the count never covers the clothing. */}
      <div className="flex items-center gap-1 px-1 pt-1 text-sm font-medium text-neutral-600">
        <HeartButton
          isFilled={post.is_liked_by_user || false}
          onClick={() => onToggleLike(post.id)}
          size="sm"
          className="-ml-2"
        />
        <span>{post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}</span>
      </div>

      {/* Info */}
      <div className="min-w-0 space-y-2">
        <h3 className="text-base font-semibold leading-snug text-neutral-900 break-words">{post.name}</h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 text-neutral-600">
          {post.size && <span className="font-medium">Size: {post.size}</span>}
          <span>•</span>
          <span className="break-words">{post.category}</span>
        </div>

        {/* Brand badge */}
        {post.brand && (
          <div className="flex items-center gap-1.5">
            {post.brand_partner_id ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-50 text-primary-600 border border-primary-200 px-2 py-0.5 rounded-full">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {post.brand}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {post.brand}
              </span>
            )}
          </div>
        )}

        {post.description && (
          <p className="post-card-description text-sm leading-6 text-neutral-600 line-clamp-3 break-words">
            {post.description}
          </p>
        )}

        {/* Review */}
        {post.review && (
          <div className="bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-1 mb-1.5">
              <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-semibold text-neutral-500">Review</span>
            </div>
            <p className="post-card-review text-xs leading-5 text-neutral-600 line-clamp-3 italic break-words">"{post.review}"</p>
          </div>
        )}

        {/* Star rating */}
        {(post as any).rating > 0 && (
          <div>
            <StarRating value={(post as any).rating} size="sm" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowDetails(value => !value)}
          aria-expanded={showDetails}
          className="flex w-full items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-left text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50"
        >
          <span>{showDetails ? 'Hide details' : 'View details'}</span>
          <svg className={`h-4 w-4 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showDetails && (
          <div className="animate-slide-up rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-600">
            {post.brand && <p><span className="font-semibold text-neutral-700">Brand:</span> {post.brand}</p>}
            {post.brand_partner_id && <p><span className="font-semibold text-neutral-700">Partner:</span> {post.brand_partner_id}</p>}
            {post.review && <p><span className="font-semibold text-neutral-700">Review:</span> {post.review}</p>}
            <p><span className="font-semibold text-neutral-700">Category:</span> {post.category}</p>
            {post.size && <p><span className="font-semibold text-neutral-700">Size:</span> {post.size}</p>}
          </div>
        )}
        <div className="flex items-center gap-1 text-xs leading-5 text-neutral-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="truncate">{post.display_name}</span>
        </div>
      </div>

      {/* Image Zoom Modal */}
      <ImageZoomModal
        isOpen={showZoom}
        onClose={() => setShowZoom(false)}
        imageUrl={imageUrl}
        title={post.name}
      />
    </Card>
  );
}
