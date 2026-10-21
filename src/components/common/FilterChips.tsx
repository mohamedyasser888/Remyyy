/**
 * Filter Chips Component
 * Horizontal scrollable category filter chips
 */

import { useEffect, useState } from 'react';

interface FilterChipsProps<T extends string> {
  options: readonly T[];
  selected: T;
  onChange: (value: T) => void;
  getLabel?: (value: T) => string;
  initialVisibleCount?: number;
  visibleStep?: number;
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
  showMoreLabel = 'Show more',
  showLessLabel = 'Show less',
}: FilterChipsProps<T>) {
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const optionsKey = options.join('\u0001');

  useEffect(() => {
    setVisibleCount(initialVisibleCount);
  }, [initialVisibleCount, optionsKey]);

  const hasMore = visibleCount < options.length;
  const visibleOptions = options.slice(0, visibleCount);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {visibleOptions.map((option, index) => {
        const isSelected = selected === option;
        
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            style={{ animationDelay: `${index * 45}ms` }}
            className={`animate-slide-up shrink-0 min-w-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200
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

      {options.length > initialVisibleCount && (
        <button
          type="button"
          onClick={() => setVisibleCount(hasMore ? Math.min(visibleCount + visibleStep, options.length) : initialVisibleCount)}
          className="shrink-0 rounded-full border border-primary-200 bg-primary-50/70 px-3.5 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-100"
          aria-expanded={!hasMore}
        >
          {hasMore ? showMoreLabel : showLessLabel}
        </button>
      )}
    </div>
  );
}
