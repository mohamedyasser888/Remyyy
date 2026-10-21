/**
 * Item Form Component
 * Add or edit wardrobe item
 */

import { useState, useEffect, FormEvent } from 'react';
import { Modal, Button, Input, Select, FileUpload } from '@/components/common';
import { StarRating } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useT } from '@/i18n';
import { validateItemForm } from '@/utils/validation';
import { getCategoriesForGender, categoryRequiresSize } from '@/utils/constants';
import { getErrorMessage } from '@/utils/errorHandling';
import type { WardrobeItem, Size, Category } from '@/types';

interface ItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ItemFormData) => Promise<void>;
  editItem?: WardrobeItem | null;
}

export interface ItemFormData {
  name: string;
  size: Size | '';
  category: Category | '';
  rating: number;
  imagePath?: string;
}

export function ItemForm({ isOpen, onClose, onSubmit, editItem }: ItemFormProps) {
  const t = useT();
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<ItemFormData>({
    name: '',
    size: '',
    category: '',
    rating: 0,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const categories = profile ? getCategoriesForGender(profile.gender) : [];
  const sizeRequired = categoryRequiresSize(formData.category);

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name,
        size: editItem.size,
        category: editItem.category,
        rating: (editItem as any).rating || 0,
        imagePath: editItem.image_path,
      });
      setSelectedFile(null);
    } else {
      setFormData({ name: '', size: '', category: '', rating: 0 });
      setSelectedFile(null);
    }
  }, [editItem]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'category' && !categoryRequiresSize(value)) {
      setFormData(prev => ({ ...prev, category: value as Category | '', size: '' }));
      setErrors(prev => ({ ...prev, size: '' }));
    } else if (name === 'category') {
      setFormData(prev => ({ ...prev, category: value as Category }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validation = validateItemForm(formData as any);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    if (!editItem && !selectedFile) {
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
        rating: formData.rating,
        imagePath,
      });

      showToast(
        editItem ? t('success.itemUpdated') : t('success.itemAdded'),
        'success'
      );
      onClose();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editItem ? t('wardrobe.editItem') : t('wardrobe.addItem')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Image Upload */}
        <FileUpload
          onFileSelect={handleFileSelect}
          preview={editItem
            ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/clothes/${editItem.image_path}`
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
          {categories.map(category => (
            <option key={category} value={category}>
              {t(`categories.${category.toLowerCase().replace(/\s+/g, '')}`)}
            </option>
          ))}
        </Select>

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
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={handleClose}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
          >
            {loading ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
