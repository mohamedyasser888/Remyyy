/**
 * Wardrobe Page
 * Main wardrobe page with tabs
 */

import { useState } from 'react';
import { TopBar } from '@/components/layout';
import { OwnedTab } from '@/components/features/wardrobe/OwnedTab';
import { FavouritesTab } from '@/components/features/wardrobe/FavouritesTab';
import { LikedTab } from '@/components/features/wardrobe/LikedTab';
import { PostForm, type PostFormData } from '@/components/features/home/PostForm';
import { AnimatedBackground } from '@/components/common';
import { usePosts } from '@/hooks/usePosts';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useT } from '@/i18n';
import { getErrorMessage } from '@/utils/errorHandling';
import type { WardrobeTab, WardrobeItem } from '@/types';

export function WardrobePage() {
  const t = useT();
  const { profile } = useAuth();
  const { createPost } = usePosts();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<WardrobeTab>('owned');
  const [showShareModal, setShowShareModal] = useState(false);
  const [itemToShare, setItemToShare] = useState<WardrobeItem | null>(null);

  const tabs: { id: WardrobeTab; label: string }[] = [
    { id: 'owned', label: t('wardrobe.owned') },
    { id: 'favourites', label: t('wardrobe.favourites') },
    { id: 'liked', label: t('wardrobe.liked') },
  ];

  const handleShareToHome = (item: WardrobeItem) => {
    setItemToShare(item);
    setShowShareModal(true);
  };

  const handleShareSubmit = async (data: PostFormData) => {
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

    showToast(t('success.sharedToHome'), 'success');
    setShowShareModal(false);
    setItemToShare(null);
  };

  return (
    <>
      <AnimatedBackground variant="wardrobe" />
      <TopBar title={t('wardrobe.title')} />
      
      <div className="flex-1 relative z-10">
        {/* Tab Navigation */}
        <div className="sticky top-16 lg:top-0 z-20 bg-white border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-6 py-3 font-medium text-sm transition-smooth
                    ${activeTab === tab.id
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-neutral-600 hover:text-neutral-900'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto p-4">
          {activeTab === 'owned' && <OwnedTab onShareToHome={handleShareToHome} />}
          {activeTab === 'favourites' && <FavouritesTab onShareToHome={handleShareToHome} />}
          {activeTab === 'liked' && <LikedTab />}
        </div>
      </div>

      {/* Share to Home Modal */}
      <PostForm
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setItemToShare(null);
        }}
        onSubmit={handleShareSubmit}
        prefillItem={itemToShare}
      />
    </>
  );
}
