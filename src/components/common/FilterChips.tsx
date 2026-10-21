/**
 * Filter Chips Component
 * Category filter chips shown five at a time with arrow navigation.
 */

import { useEffect, useState } from 'react';

interface FilterChipsProps<T extends string> {
  options: readonly T[];
  selected: T;
  onChange: (value: T) => void;
  getLabel?: (value: T) => string;
  initialVisibleCount?: number;
  visibleStep?: number;
  // Kept for backwards compatibility with existing callers.
  showMoreLabel?: string;
  showLessLabel?: string;
}

export function FilterChips<T extends string>({
  options,
  selected,
  onChange,
  getLabel = (value) => value,
  initialVisibleCount = 5,
  visibleStep = 5,
}: FilterChipsProps<T>) {
  const pageSize = visibleStep || initialVisibleCount;
  const [page, setPage] = useState(0);
  const optionsKey = options.join('\u0001');

  useEffect(() => {
    setPage(0);
  }, [optionsKey, pageSize]);

  useEffect(() => {
    const selectedIndex = options.indexOf(selected);
    if (selectedIndex >= 0) setPage(Math.floor(selectedIndex / pageSize));
  }, [options, selected, pageSize]);

  const pageCount = Math.max(1, Math.ceil(options.length / pageSize));
  const visibleOptions = options.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="flex min-h-9 items-center gap-2 pb-1">
      <button
        type="button"
        onClick={() => setPage(current => Math.max(0, current - 1))}
        disabled={page === 0}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-primary-700 shadow-sm transition-colors hover:bg-primary-50 disabled:pointer-events-none disabled:opacity-30"
        aria-label="Previous categories"
      >
        <span aria-hidden="true">‹</span>
      </button>

      <div className="grid min-w-0 flex-1 grid-cols-5 items-center gap-1">
      {visibleOptions.map((option, index) => {
        const isSelected = selected === option;
        
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            style={{ animationDelay: `${index * 45}ms` }}
            className={`animate-slide-up min-w-0 rounded-full px-1.5 py-1.5 text-[11px] font-medium transition-all duration-200
              ${
                isSelected
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20 ring-2 ring-primary-200 ring-offset-1'
                  : 'bg-white text-neutral-700 shadow-sm ring-1 ring-neutral-200 hover:-translate-y-0.5 hover:bg-primary-50 hover:text-primary-700 hover:ring-primary-200'
              }
            `}
            aria-pressed={isSelected}
          >
            <span className="block truncate">{getLabel(option)}</span>
          </button>
        );
      })}
      </div>

      <button
        type="button"
        onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))}
        disabled={page >= pageCount - 1}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-primary-700 shadow-sm transition-colors hover:bg-primary-50 disabled:pointer-events-none disabled:opacity-30"
        aria-label="Next categories"
      >
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}
