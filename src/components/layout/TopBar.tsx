/**
 * Top Bar Component
 * Mobile header with title and actions
 */

import { ReactNode, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BrandLogo, LanguageSwitcher, RemyTierBadge } from '@/components/common';
import { usePoints } from '@/hooks/usePoints';

interface TopBarProps {
  title: string;
  action?: ReactNode;
  showProfile?: boolean;
  children?: ReactNode;
}

export function TopBar({ title, action, showProfile = true, children }: TopBarProps) {
  const { profile } = useAuth();
  const { points, tier } = usePoints();
  const [bump, setBump] = useState(false);
  const prevPoints = useRef(points);

  // Animate badge when points change
  useEffect(() => {
    if (points !== prevPoints.current) {
      setBump(true);
      setTimeout(() => setBump(false), 600);
      prevPoints.current = points;
    }
  }, [points]);

  return (
    <header className="lg:hidden sticky top-0 z-30 border-b border-white/80 bg-white/80 shadow-[0_8px_24px_rgba(86,55,100,0.08)] backdrop-blur-xl transition-all duration-300">
      <div className="flex items-center justify-between px-4 h-16">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo className="w-28 h-10 shrink-0 lg:hidden" />
          {showProfile && profile && (
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">
                  {profile.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="max-w-28 truncate text-xs font-semibold text-neutral-700">{profile.display_name}</span>
              {/* Points pill */}
              <div
                className={`flex items-center gap-1.5 bg-primary-500 rounded-full px-3 py-1.5 shadow-md transition-transform ${
                  bump ? 'scale-125' : 'scale-100'
                }`}
              >
                <span className="text-base leading-none">⭐</span>
                <span className="text-white font-extrabold text-sm leading-none">{points}</span>
                <span className="text-white/80 text-xs leading-none">RMS</span>
              </div>
              <RemyTierBadge tier={tier} size="md" />
            </div>
          )}
          <h1 className="animate-slide-up truncate text-xl font-bold text-neutral-900">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {action}
          {children}
        </div>
      </div>
    </header>
  );
}
