/**
 * Validation Utilities
 * Form validation rules and helper functions
 */

import { VALIDATION, ERROR_MESSAGES, categoryRequiresSize } from './constants';

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || email.trim() === '') {
    return { valid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }

  if (!VALIDATION.EMAIL_PATTERN.test(email)) {
    return { valid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
  }

  return { valid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.trim() === '') {
    return { valid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }

  if (password.length < VALIDATION.PASSWORD.MIN_LENGTH) {
    return { valid: false, error: ERROR_MESSAGES.PASSWORD_TOO_SHORT };
  }

  return { valid: true };
}

/**
 * Validate display name
 */
export function validateDisplayName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim() === '') {
    return { valid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }

  if (name.trim().length < VALIDATION.DISPLAY_NAME.MIN_LENGTH) {
    return { valid: false, error: ERROR_MESSAGES.NAME_TOO_SHORT };
  }

  if (name.length > VALIDATION.DISPLAY_NAME.MAX_LENGTH) {
    return { valid: false, error: `Name must be ${VALIDATION.DISPLAY_NAME.MAX_LENGTH} characters or less` };
  }

  return { valid: true };
}

/**
 * Validate item name
 */
export function validateItemName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim() === '') {
    return { valid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }

  if (name.length > VALIDATION.ITEM_NAME.MAX_LENGTH) {
    return { valid: false, error: `Name must be ${VALIDATION.ITEM_NAME.MAX_LENGTH} characters or less` };
  }

  return { valid: true };
}

/**
 * Validate description
 */
export function validateDescription(description: string): { valid: boolean; error?: string } {
  if (!description || description.trim() === '') {
    return { valid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }

  if (description.length > VALIDATION.DESCRIPTION.MAX_LENGTH) {
    return { valid: false, error: ERROR_MESSAGES.DESCRIPTION_TOO_LONG };
  }

  return { valid: true };
}

/**
 * Validate required field
 */
export function validateRequired(value: string | null | undefined): { valid: boolean; error?: string } {
  if (!value || value.trim() === '') {
    return { valid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }

  return { valid: true };
}

// ============================================================================
// Form Validation
// ============================================================================

/**
 * Validate sign up form
 */
export interface SignUpFormData {
  email: string;
  password: string;
  displayName: string;
  gender: string;
}

export type ValidationErrors = Record<string, string>;

export function validateSignUpForm(data: SignUpFormData): {
  valid: boolean;
  errors: ValidationErrors;
} {
  const errors: ValidationErrors = {};

  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.error!;
  }

  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.error!;
  }

  const nameValidation = validateDisplayName(data.displayName);
  if (!nameValidation.valid) {
    errors.displayName = nameValidation.error!;
  }

  const genderValidation = validateRequired(data.gender);
  if (!genderValidation.valid) {
    errors.gender = genderValidation.error!;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate sign in form
 */
export interface SignInFormData {
  email: string;
  password: string;
}

export function validateSignInForm(data: SignInFormData): {
  valid: boolean;
  errors: ValidationErrors;
} {
  const errors: ValidationErrors = {};

  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.error!;
  }

  const passwordValidation = validateRequired(data.password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.error!;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate wardrobe item form
 */
export interface ItemFormData {
  name: string;
  size: string;
  category: string;
}

export function validateItemForm(data: ItemFormData): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const nameValidation = validateItemName(data.name);
  if (!nameValidation.valid) {
    errors.name = nameValidation.error!;
  }

  if (categoryRequiresSize(data.category)) {
    const sizeValidation = validateRequired(data.size);
    if (!sizeValidation.valid) {
      errors.size = sizeValidation.error!;
    }
  }

  const categoryValidation = validateRequired(data.category);
  if (!categoryValidation.valid) {
    errors.category = categoryValidation.error!;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate post form
 */
export interface PostFormData extends ItemFormData {
  description: string;
}

export function validatePostForm(data: PostFormData): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Validate item fields
  const itemValidation = validateItemForm(data);
  Object.assign(errors, itemValidation.errors);

  // Validate description
  const descriptionValidation = validateDescription(data.description);
  if (!descriptionValidation.valid) {
    errors.description = descriptionValidation.error!;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
