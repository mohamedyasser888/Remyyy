/**
 * Application Constants
 * Centralized configuration and constant values
 */

import type { Size, FemaleCategory, MaleCategory, Category, Gender } from '@/types';

// ============================================================================
// Clothing Categories
// ============================================================================

/**
 * Categories available for female users
 */
export const FEMALE_CATEGORIES: readonly FemaleCategory[] = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Jackets',
  'Shoes',
  'Formal wear',
  'Sports wear',
  'Bags',
  'Accessories',
  'Socks',
  'Scarf',
  'Hijab',
  'Swimwear',
] as const;

/**
 * Categories available for male users
 */
export const MALE_CATEGORIES: readonly MaleCategory[] = [
  'Tops',
  'Bottoms',
  'Jackets',
  'Shoes',
  'Socks',
  'Belts',
  'Accessories',
] as const;

/**
 * All categories (union of female and male)
 * Used for community feed filtering
 */
export const ALL_CATEGORIES: readonly Category[] = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Jackets',
  'Shoes',
  'Formal wear',
  'Sports wear',
  'Bags',
  'Accessories',
  'Socks',
  'Scarf',
  'Hijab',
  'Swimwear',
  'Belts',
] as const;

/**
 * Get categories for a specific gender
 */
export function getCategoriesForGender(gender: Gender): readonly Category[] {
  return gender === 'female' ? FEMALE_CATEGORIES : MALE_CATEGORIES;
}

// ============================================================================
// Clothing Sizes
// ============================================================================

/**
 * Available clothing sizes
 */
export const SIZES: readonly Size[] = ['S', 'M', 'L', 'XL', '2XL', '3XL'] as const;

/** Categories where a size does not apply. */
export const SIZELESS_CATEGORIES = new Set<string>(['Belts', 'Accessories', 'Bags']);

export function categoryRequiresSize(category: string | null | undefined): boolean {
  return Boolean(category) && !SIZELESS_CATEGORIES.has(category ?? '');
}

// ============================================================================
// Image Configuration
// ============================================================================

/**
 * Image compression settings
 */
export const IMAGE_CONFIG = {
  MAX_WIDTH: 1024,
  MAX_HEIGHT: 1024,
  QUALITY: 0.8,
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml'],
  MAX_SIZE_MB: 10,
} as const;

/**
 * Storage bucket name
 */
export const STORAGE_BUCKET = 'clothes' as const;

// ============================================================================
// Pagination
// ============================================================================

/**
 * Pagination configuration
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================================================
// Validation Rules
// ============================================================================

/**
 * Form validation constraints
 */
export const VALIDATION = {
  DISPLAY_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
  PASSWORD: {
    MIN_LENGTH: 6,
  },
  ITEM_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  DESCRIPTION: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200,
  },
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// ============================================================================
// Animation Durations
// ============================================================================

/**
 * Animation timing in milliseconds
 */
export const ANIMATION = {
  FAST: 150,
  NORMAL: 200,
  SLOW: 300,
  TOAST_DURATION: 3000,
} as const;

// ============================================================================
// Breakpoints
// ============================================================================

/**
 * Responsive breakpoints (matches Tailwind)
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
} as const;

// ============================================================================
// Routes
// ============================================================================

/**
 * Application route paths
 */
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  APP: '/app',
  WARDROBE: '/app/wardrobe',
  HOME: '/app/home',
  STYLIST: '/app/stylist',
  TRENDS: '/app/trends',
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_HOME: '/admin/home',
  ADMIN_TRENDS: '/admin/trends',
  ADMIN_LEADERBOARD: '/admin/leaderboard',
  ADMIN_MESSAGES: '/admin/messages',
  ADMIN_PARTNERS: '/admin/partners',
  PARTNERS: '/app/partners',
} as const;

// ============================================================================
// Error Messages
// ============================================================================

/**
 * Common error messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  GENERIC: 'Something went wrong. Please try again.',
  IMAGE_TOO_LARGE: 'Image size must be less than 10MB.',
  INVALID_IMAGE_TYPE: 'Please upload a valid image file (JPEG, PNG, or WebP).',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  PASSWORD_TOO_SHORT: 'Password must be at least 6 characters.',
  NAME_TOO_SHORT: 'Name must be at least 2 characters.',
  DESCRIPTION_TOO_LONG: 'Description must be 200 characters or less.',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

/**
 * Common success messages
 */
export const SUCCESS_MESSAGES = {
  ITEM_ADDED: 'Item added to wardrobe',
  ITEM_UPDATED: 'Item updated successfully',
  ITEM_DELETED: 'Item deleted successfully',
  POST_CREATED: 'Post shared successfully',
  POST_DELETED: 'Post deleted successfully',
  LOGOUT: 'Logged out successfully',
} as const;

// ============================================================================
// Local Storage Keys
// ============================================================================

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  LANGUAGE: 'fashion_app_language',
  THEME: 'fashion_app_theme',
} as const;

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default values for forms and filters
 */
export const DEFAULTS = {
  CATEGORY_FILTER: 'All' as const,
  LANGUAGE: 'en' as const,
} as const;
