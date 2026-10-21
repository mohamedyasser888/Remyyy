/**
 * usePosts Hook
 * Manages community posts state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import * as postsService from '@/services/posts';
import type { Post, PostWithLikes, Category } from '@/types';
import { handleSupabaseError, logError } from '@/utils/errorHandling';
import { useAuth } from './useAuth';
import { awardUploadPoints, RMS_PER_POST } from '@/services/points';
import { usePointsContext } from '@/contexts/PointsContext';
import { useRealtimeSync } from './useRealtimeSync';

interface UsePostsResult {
  posts: PostWithLikes[];
  loading: boolean;
  error: Error | null;
  selectedCategory: Category | 'All';
  setSelectedCategory: (category: Category | 'All') => void;
  createPost: (post: Omit<Post, 'id' | 'created_at'>) => Promise<{ post: Post | null; error: Error | null }>;
  deletePost: (postId: string, imagePath: string) => Promise<{ error: Error | null }>;
  toggleLike: (postId: string) => Promise<{ error: Error | null }>;
  setCategory: (category: Category | 'All') => void;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing community posts
 */
export function usePosts(initialCategory?: Category | 'All'): UsePostsResult {
  const { user } = useAuth();
  const { addPoints, refresh: refreshPoints } = usePointsContext();
  const [posts, setPosts] = useState<PostWithLikes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [category, setCategory] = useState<Category | 'All'>(initialCategory || 'All');

  // Fetch posts — silent (no loading flash) so polls don't blank the UI
  const fetchPosts = useCallback(async () => {
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setError(null);

    const { posts: fetchedPosts, error: fetchError } = await postsService.getPostsWithLikeStatus(
      user.id,
      category
    );

    if (fetchError) {
      setError(handleSupabaseError(fetchError));
      logError(fetchError, 'Fetch posts');
    } else {
      setPosts(fetchedPosts);
    }

    setLoading(false); // clears the initial spinner; no-op on polls
  }, [user, category]);

  // Initial load (shows spinner) + silent 5s poll (no spinner)
  useEffect(() => {
    setLoading(true);   // show skeleton only on first load / category change
    fetchPosts();
  }, [fetchPosts]);
  useRealtimeSync(['posts', 'post_likes', 'profiles'], fetchPosts);

  // Create post — award 10 RMS
  const createPost = async (
    post: Omit<Post, 'id' | 'created_at'>
  ): Promise<{ post: Post | null; error: Error | null }> => {
    try {
      const { post: newPost, error: createError } = await postsService.createPost(post);

      if (createError) {
        return { post: null, error: handleSupabaseError(createError) };
      }

      // Award 10 RMS instantly, then persist
      if (newPost && user) {
        addPoints(RMS_PER_POST);
        awardUploadPoints(user.id, newPost.id);
      }

      // Refresh to get complete post with profile
      await fetchPosts();

      return { post: newPost, error: null };
    } catch (error) {
      logError(error, 'Create post');
      return { post: null, error: handleSupabaseError(error) };
    }
  };

  // Delete post
  const deletePost = async (
    postId: string,
    imagePath: string
  ): Promise<{ error: Error | null }> => {
    try {
      // Optimistically remove from UI
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));

      const { error: deleteError } = await postsService.deletePost(postId, imagePath);

      if (deleteError) {
        // Revert on error
        await fetchPosts();
        return { error: handleSupabaseError(deleteError) };
      }

      return { error: null };
    } catch (error) {
      // Revert on error
      await fetchPosts();
      logError(error, 'Delete post');
      return { error: handleSupabaseError(error) };
    }
  };

  // Toggle like
  const toggleLike = async (postId: string): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    try {
      // Find the post and its current like status
      const post = posts.find(p => p.id === postId);
      if (!post) {
        return { error: new Error('Post not found') };
      }

      const wasLiked = post.is_liked_by_user || false;

      // Optimistic update
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === postId
            ? {
                ...p,
                is_liked_by_user: !wasLiked,
                likes_count: wasLiked ? p.likes_count - 1 : p.likes_count + 1,
              }
            : p
        )
      );

      const { error: toggleError } = await postsService.toggleLike(user.id, postId);

      if (toggleError) {
        // Revert on error
        setPosts(prevPosts =>
          prevPosts.map(p =>
            p.id === postId
              ? {
                  ...p,
                  is_liked_by_user: wasLiked,
                  likes_count: wasLiked ? p.likes_count + 1 : p.likes_count - 1,
                }
              : p
          )
        );
        return { error: handleSupabaseError(toggleError) };
      }

      // The database awards 1 RMS to the post owner for each received like.
      // Refresh immediately when the current user owns the liked post.
      if (!wasLiked && post.user_id === user.id) {
        await refreshPoints();
      }

      return { error: null };
    } catch (error) {
      // Revert on error
      await fetchPosts();
      logError(error, 'Toggle like');
      return { error: handleSupabaseError(error) };
    }
  };

  // Refresh posts
  const refresh = async () => {
    await fetchPosts();
  };

  return {
    posts,
    loading,
    error,
    selectedCategory: category,
    setSelectedCategory: setCategory,
    createPost,
    deletePost,
    toggleLike,
    setCategory,
    refresh,
  };
}

/**
 * Hook for liked posts (for Wardrobe "Liked" tab)
 */
export function useLikedPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithLikes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLikedPosts = useCallback(async () => {
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setError(null);

    const { posts: fetchedPosts, error: fetchError } = await postsService.getLikedPosts(user.id);

    if (fetchError) {
      setError(handleSupabaseError(fetchError));
      logError(fetchError, 'Fetch liked posts');
    } else {
      setPosts(fetchedPosts);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchLikedPosts();
  }, [fetchLikedPosts]);
  useRealtimeSync(['posts', 'post_likes'], fetchLikedPosts);

  // Toggle like (for unliking from this view)
  const toggleLike = async (postId: string): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    try {
      // Optimistically remove from list (since this is liked posts)
      setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));

      const { error: toggleError } = await postsService.toggleLike(user.id, postId);

      if (toggleError) {
        // Revert on error
        await fetchLikedPosts();
        return { error: handleSupabaseError(toggleError) };
      }

      return { error: null };
    } catch (error) {
      // Revert on error
      await fetchLikedPosts();
      logError(error, 'Unlike post');
      return { error: handleSupabaseError(error) };
    }
  };

  return {
    posts,
    loading,
    error,
    toggleLike,
    refresh: fetchLikedPosts,
  };
}
