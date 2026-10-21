/**
 * Admin Trends Page
 * Admin can add and delete trend items
 */

import { useEffect, useRef, useState } from 'react';
import { getTrendItems, createTrendItem, deleteTrendItem, type TrendItem } from '@/services/admin';
import { getImageUrl } from '@/services/storage';
import { useAuth } from '@/hooks/useAuth';
import { Loader, Card, Button, Input, FilterChips } from '@/components/common';
import { StarRating } from '@/components/common';
import { ALL_CATEGORIES, categoryRequiresSize } from '@/utils/constants';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

export function AdminTrendsPage() {
  const { user }              = useAuth();
  const [items, setItems]     = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const fileRef               = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    category: ALL_CATEGORIES[0] as string,
    size: '',
    description: '',
    rating: 0,
    image: null as File | null,
    preview: '',
  });

  useEffect(() => {
    setLoading(true);
    load();
  }, []);
  useRealtimeSync(['trends', 'trend_likes'], load, { admin: true });

  async function load() {
    const { items } = await getTrendItems();
    setItems(items);
    setLoading(false);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm(f => ({ ...f, image: file, preview: reader.result as string }));
    reader.readAsDataURL(file);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.image || !user) return;
    setSaving(true);
    const { item, error } = await createTrendItem(user.id, {
      name: form.name,
      category: form.category,
      size: categoryRequiresSize(form.category) ? form.size.trim() : null,
      description: form.description,
      rating: form.rating,
      image: form.image,
    });
    if (item) setItems(prev => [item, ...prev]);
    if (error) alert('Failed to add trend: ' + error.message);
    setForm({ name: '', category: ALL_CATEGORIES[0], size: '', description: '', rating: 0, image: null, preview: '' });
    if (fileRef.current) fileRef.current.value = '';
    setSaving(false);
  }

  async function handleDelete(item: TrendItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    setDeleting(item.id);
    await deleteTrendItem(item.id, item.image_path);
    setItems(prev => prev.filter(i => i.id !== item.id));
    setDeleting(null);
  }

  const categories = ['All', ...Array.from(new Set(items.map(item => item.category)))];
  const filteredItems = selectedCategory === 'All'
    ? items
    : items.filter(item => item.category === selectedCategory);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Trends Management</h1>
        <p className="text-slate-500 mt-1">Add and manage trending style items</p>
      </div>

      {/* Add form */}
      <Card className="mb-8 p-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Add New Trend</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Trend item name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value, size: categoryRequiresSize(e.target.value) ? f.size : '' }))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {categoryRequiresSize(form.category) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Size *</label>
              <Input value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} placeholder="e.g. Medium, 38, One size" required />
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <Input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Short description (optional)"
            />
          </div>
          <div className="md:col-span-2">
            <StarRating
              label="Rating (optional)"
              value={form.rating}
              onChange={r => setForm(f => ({ ...f, rating: r }))}
              size="lg"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Image *</label>
            <div className="flex items-center gap-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
                required
              />
              {form.preview && (
                <img src={form.preview} alt="preview" className="w-16 h-16 rounded-lg object-cover border" />
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving || !form.name || !form.image}>
              {saving ? <><Loader size="sm" /><span className="ml-2">Adding…</span></> : '+ Add Trend'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Items grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader size="lg" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-400">No trend items yet. Add one above!</div>
      ) : (
        <>
          <div className="mb-6">
            <FilterChips options={categories} selected={selectedCategory} onChange={setSelectedCategory} />
          </div>
          <div className="vertical-snap-feed">
          {filteredItems.map(item => (
            <div key={item.id} className="vertical-snap-item">
            <Card className="w-full max-w-xl overflow-hidden">
              <div className="feed-card-image bg-neutral-100 rounded-lg overflow-hidden mb-3">
                <img src={getImageUrl(item.image_path)} alt={item.name} className="w-full h-full object-contain p-2 transition-transform duration-500 ease-out hover:scale-105" />
              </div>
              <div className="px-1">
                <p className="font-medium text-slate-800 truncate">{item.name}</p>
                <p className="text-xs text-slate-500">{item.category}</p>
                {item.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.description}</p>}
                {/* Star rating */}
                {(item as any).rating > 0 && (
                  <div className="mt-2">
                    <StarRating value={(item as any).rating} size="sm" />
                  </div>
                )}
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="danger"
                    fullWidth
                    onClick={() => handleDelete(item)}
                    disabled={deleting === item.id}
                  >
                    {deleting === item.id ? <Loader size="sm" /> : 'Delete'}
                  </Button>
                </div>
              </div>
            </Card>
            </div>
          ))}
          </div>
        </>
      )}
    </div>
  );
}
