import type { Category } from '@/types';

/** Convert a stored category value to the key used by the translation files. */
export function getCategoryTranslationKey(category: string): string {
  const normalized = category.trim().toLowerCase().replace(/\s+/g, '');

  const keyByCategory: Record<string, string> = {
    formalwear: 'formalWear',
    sportswear: 'sportsWear',
  };

  return keyByCategory[normalized] ?? normalized;
}

/** Return a translated category label without ever exposing an i18n key. */
export function getCategoryLabel(
  translate: (key: string) => string,
  category: Category | 'All' | string,
): string {
  const key = `categories.${getCategoryTranslationKey(category)}`;
  const translated = translate(key);

  if (translated !== key) return translated;

  return category
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}
