/**
 * Post Form Component
 * Create new post — includes Brand (free / partner) and Review fields
 */

import { useState, useEffect, FormEvent } from 'react';
import { Modal, Button, Input, Select, FileUpload } from '@/components/common';
import { StarRating } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useT } from '@/i18n';
import { validatePostForm } from '@/utils/validation';
import { ALL_CATEGORIES, categoryRequiresSize } from '@/utils/constants';
import { getErrorMessage } from '@/utils/errorHandling';
import { getPartners } from '@/services/partners';
import type { Partner } from '@/services/partners';
import type { WardrobeItem, Size, Category } from '@/types';

interface PostFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PostFormData) => Promise<void>;
  prefillItem?: WardrobeItem | null;
}

export interface PostFormData {
  name: string;
  size: Size | '';
  category: Category | '';
  description: string;
  rating: number;
  imagePath?: string;
  brand?: string;
  brand_partner_id?: string | null;
  review?: string;
}

export function PostForm({ isOpen, onClose, onSubmit, prefillItem }: PostFormProps) {
  const t = useT();
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<PostFormData>({
    name: '',
    size: '',
    category: '',
    description: '',
    rating: 0,
    brand: '',
    brand_partner_id: null,
    review: '',
  });
  const [selectedFile, setSelectedFile]   = useState<File | null>(null);
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const [loading, setLoading]             = useState(false);
  const [charCount, setCharCount]         = useState(0);
  const [reviewCount, setReviewCount]     = useState(0);

  // Brand partner toggle
  const [isPartnerBrand, setIsPartnerBrand] = useState(false);
  const [partners, setPartners]             = useState<Partner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const sizeRequired = categoryRequiresSize(formData.category);

  // Load partners when toggled on
  useEffect(() => {
    if (!isPartnerBrand) return;
    setPartnersLoading(true);
    getPartners().then(({ partners: p }) => {
      setPartners(p);
      setPartnersLoading(false);
    });
  }, [isPartnerBrand]);

  useEffect(() => {
    if (prefillItem) {
      setFormData({
        name: prefillItem.name,
        size: prefillItem.size,
        category: prefillItem.category,
        description: '',
        rating: 0,
        imagePath: prefillItem.image_path,
        brand: '',
        brand_partner_id: null,
        review: '',
      });
      setCharCount(0);
      setReviewCount(0);
      setSelectedFile(null);
    } else {
      setFormData({ name: '', size: '', category: '', description: '', rating: 0, brand: '', brand_partner_id: null, review: '' });
      setCharCount(0);
      setReviewCount(0);
      setSelectedFile(null);
    }
    setIsPartnerBrand(false);
    setSelectedPartner(null);
  }, [prefillItem, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'description') {
      if (value.length <= 200) {
        setFormData(prev => ({ ...prev, [name]: value }));
        setCharCount(value.length);
      }
    } else if (name === 'review') {
      if (value.length <= 300) {
        setFormData(prev => ({ ...prev, [name]: value }));
        setReviewCount(value.length);
      }
    } else {
      if (name === 'category' && !categoryRequiresSize(value)) {
        setFormData(prev => ({ ...prev, category: value as Category | '', size: '' }));
        setErrors(prev => ({ ...prev, size: '' }));
      } else if (name === 'category') {
        setFormData(prev => ({ ...prev, category: value as Category }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Please upload a valid image file (JPEG, PNG, WebP, GIF, BMP, or SVG)', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size must be less than 10MB', 'error');
      return;
    }
    setSelectedFile(file);
  };

  const handlePartnerSelect = (partner: Partner) => {
    setSelectedPartner(partner);
    setFormData(prev => ({ ...prev, brand: partner.name, brand_partner_id: partner.id }));
  };

  const handleTogglePartner = () => {
    const next = !isPartnerBrand;
    setIsPartnerBrand(next);
    if (!next) {
      // Reset partner selection
      setSelectedPartner(null);
      setFormData(prev => ({ ...prev, brand: '', brand_partner_id: null }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validation = validatePostForm(formData as any);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    if (!prefillItem && !selectedFile) {
      showToast(t('validation.required'), 'error');
      return;
    }

    if (!profile) return;

    setLoading(true);
    setErrors({});

    try {
      let imagePath = formData.imagePath;

      if (selectedFile) {
        const { uploadImage } = await import('@/services/storage');
        const { path, error: uploadErr } = await uploadImage(selectedFile, profile.id);
        if (uploadErr) {
          showToast(getErrorMessage(uploadErr), 'error');
          setLoading(false);
          return;
        }
        imagePath = path!;
      }

      await onSubmit({
        name: formData.name,
        size: sizeRequired ? formData.size.trim() : '',
        category: formData.category,
        description: formData.description,
        rating: formData.rating,
        imagePath,
        brand: formData.brand || undefined,
        brand_partner_id: formData.brand_partner_id || null,
        review: formData.review || undefined,
      });

      showToast(t('success.postCreated'), 'success');
      onClose();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { if (!loading) onClose(); };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('home.createPost')} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Image Upload */}
        <FileUpload
          onFileSelect={handleFileSelect}
          preview={prefillItem
            ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/clothes/${prefillItem.image_path}`
            : null}
          disabled={loading}
        />

        {/* Name */}
        <Input
          label={t('wardrobe.itemName')}
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          required
          disabled={loading}
        />

        {/* Size is free text for applicable categories and hidden for accessories. */}
        {sizeRequired ? (
          <Input
            label={t('wardrobe.size')}
            name="size"
            value={formData.size}
            onChange={handleChange}
            error={errors.size}
            required
            disabled={loading}
            placeholder="e.g. Medium, 38, One size"
          />
        ) : formData.category ? (
          <p className="text-xs text-neutral-500">Size is not required for this category.</p>
        ) : null}

        {/* Category */}
        <Select
          label={t('wardrobe.category')}
          name="category"
          value={formData.category}
          onChange={handleChange}
          error={errors.category}
          required
          disabled={loading}
        >
          <option value="">{t('wardrobe.selectCategory')}</option>
          {ALL_CATEGORIES.map(category => (
            <option key={category} value={category}>
              {t(`categories.${category.toLowerCase().replace(/\s+/g, '')}`)}
            </option>
          ))}
        </Select>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            {t('home.description')} <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            required
            disabled={loading}
            className={`
              w-full px-4 py-2.5 rounded-lg border
              text-neutral-900 placeholder:text-neutral-400
              transition-smooth
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:bg-neutral-100 disabled:cursor-not-allowed
              ${errors.description ? 'border-red-500' : 'border-neutral-300'}
            `}
            placeholder={t('home.description')}
          />
          <div className="flex justify-between items-center mt-1.5">
            {errors.description ? (
              <p className="text-sm text-red-600">{errors.description}</p>
            ) : (
              <span className="text-xs text-neutral-500">Share your style story</span>
            )}
            <span className={`text-xs ${charCount > 180 ? 'text-red-600' : 'text-neutral-500'}`}>
              {charCount}/200
            </span>
          </div>
        </div>

        {/* ── Brand ─────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-neutral-700">Brand</label>
            {/* Partner toggle */}
            <button
              type="button"
              onClick={handleTogglePartner}
              disabled={loading}
              className={`
                flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all
                ${isPartnerBrand
                  ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                  : 'bg-white text-neutral-500 border-neutral-300 hover:border-primary-400 hover:text-primary-500'
                }
              `}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {isPartnerBrand ? 'Partner ✓' : 'Partner Brand?'}
            </button>
          </div>

          {isPartnerBrand ? (
            /* Partner scroll picker */
            <div className="border border-primary-200 rounded-xl bg-primary-50/40 overflow-hidden">
              {partnersLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : partners.length === 0 ? (
                <p className="text-center text-sm text-neutral-400 py-5">No partners available</p>
              ) : (
                <div className="max-h-44 overflow-y-auto divide-y divide-primary-100">
                  {partners.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePartnerSelect(p)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                        ${selectedPartner?.id === p.id
                          ? 'bg-primary-100 text-primary-700'
                          : 'hover:bg-primary-50 text-neutral-700'
                        }
                      `}
                    >
                      {/* Partner thumbnail */}
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-neutral-100">
                        <img
                          src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/clothes/${p.thumbnail_path}`}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{p.name}</p>
                        {p.rating && (
                          <p className="text-xs text-neutral-400">{p.rating}★</p>
                        )}
                      </div>
                      {selectedPartner?.id === p.id && (
                        <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {selectedPartner && (
                <div className="px-4 py-2 bg-primary-100 border-t border-primary-200 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-medium text-primary-700">Selected: {selectedPartner.name}</span>
                </div>
              )}
            </div>
          ) : (
            /* Free-text brand input */
            <input
              type="text"
              name="brand"
              value={formData.brand || ''}
              onChange={handleChange}
              disabled={loading}
              placeholder="e.g. Zara, H&M, Nike…"
              className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-400
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                disabled:bg-neutral-100 disabled:cursor-not-allowed text-sm"
            />
          )}
        </div>

        {/* ── Review ────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Review <span className="text-xs text-neutral-400 font-normal">(optional)</span>
          </label>
          <textarea
            name="review"
            value={formData.review || ''}
            onChange={handleChange}
            rows={2}
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-400
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:bg-neutral-100 disabled:cursor-not-allowed text-sm resize-none"
            placeholder="What do you think about this item? Quality, fit, comfort…"
          />
          <div className="flex justify-end mt-1">
            <span className={`text-xs ${reviewCount > 270 ? 'text-red-600' : 'text-neutral-400'}`}>
              {reviewCount}/300
            </span>
          </div>
        </div>

        {/* Rating */}
        <StarRating
          label="Rating (optional)"
          value={formData.rating || 0}
          onChange={r => setFormData(prev => ({ ...prev, rating: r }))}
          size="lg"
          disabled={loading}
        />

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" fullWidth onClick={handleClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            {loading ? t('common.loading') : t('home.createPost')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
