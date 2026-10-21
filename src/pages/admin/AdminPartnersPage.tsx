/**
 * Admin Partners Page
 * Create partners (name + thumbnail + rating)
 * Click a partner to manage their clothes collection
 */

import { useEffect, useRef, useState } from 'react';
import {
  getPartners, createPartner, deletePartner,
  getPartnerPosts, createPartnerPost, deletePartnerPost,
  type Partner, type PartnerPost
} from '@/services/partners';
import { getImageUrl } from '@/services/storage';
import { Loader, Card, Button, Input, StarRating, FilterChips } from '@/components/common';
import { ALL_CATEGORIES, categoryRequiresSize } from '@/utils/constants';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

export function AdminPartnersPage() {
  const [partners, setPartners]       = useState<Partner[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<Partner | null>(null);
  const [posts, setPosts]             = useState<PartnerPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Partner form
  const [partnerForm, setPartnerForm] = useState({ name: '', rating: 0, website_url: '', thumbnail: null as File | null, preview: '' });
  const [savingPartner, setSavingPartner] = useState(false);
  const partnerFileRef = useRef<HTMLInputElement>(null);

  // Post form
  const [postForm, setPostForm] = useState({ name: '', category: ALL_CATEGORIES[0] as string, size: '', description: '', rating: 0, image: null as File | null, preview: '' });
  const [savingPost, setSavingPost] = useState(false);
  const postFileRef = useRef<HTMLInputElement>(null);

  const selectedRef = useRef<Partner | null>(null);
  selectedRef.current = selected;

  useEffect(() => {
    load();
  }, []);
  useRealtimeSync(['partners'], load, { admin: true });

  useEffect(() => {
    if (!selected) return;
  }, [selected?.id]);
  useRealtimeSync(['partner_posts'], async () => {
    if (!selectedRef.current) return;
    const { posts: fresh } = await getPartnerPosts(selectedRef.current.id);
    setPosts(fresh);
  }, { admin: true });

  async function load() {
    setLoading(true);
    const { partners } = await getPartners();
    setPartners(partners);
    setLoading(false);
  }

  async function openPartner(partner: Partner) {
    setSelected(partner);
    setSelectedCategory('All');
    setLoadingPosts(true);
    const { posts } = await getPartnerPosts(partner.id);
    setPosts(posts);
    setLoadingPosts(false);
  }

  const categories = ['All', ...Array.from(new Set(posts.map(post => post.category)))];
  const filteredPosts = selectedCategory === 'All'
    ? posts
    : posts.filter(post => post.category === selectedCategory);

  // ── Add partner ─────────────────────────────────────────────────────────
  async function handleAddPartner(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerForm.name || !partnerForm.thumbnail) return;
    setSavingPartner(true);
    const { partner, error } = await createPartner({
      name:        partnerForm.name,
      rating:      partnerForm.rating || null,
      website_url: partnerForm.website_url.trim() || null,
      thumbnail:   partnerForm.thumbnail,
    });
    if (partner) setPartners(prev => [partner, ...prev]);
    if (error) alert('Failed: ' + error.message);
    setPartnerForm({ name: '', rating: 0, website_url: '', thumbnail: null, preview: '' });
    if (partnerFileRef.current) partnerFileRef.current.value = '';
    setSavingPartner(false);
  }

  async function handleDeletePartner(partner: Partner) {
    if (!confirm(`Delete partner "${partner.name}"? This removes all their posts too.`)) return;
    await deletePartner(partner.id, partner.thumbnail_path);
    setPartners(prev => prev.filter(p => p.id !== partner.id));
    if (selected?.id === partner.id) setSelected(null);
  }

  // ── Add post to partner ─────────────────────────────────────────────────
  async function handleAddPost(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !postForm.name || !postForm.image) return;
    setSavingPost(true);
    const { post, error } = await createPartnerPost(selected.id, {
      name:        postForm.name,
      category:    postForm.category,
      description: postForm.description,
      rating:      postForm.rating || null,
      image:       postForm.image,
      size:        categoryRequiresSize(postForm.category) ? postForm.size.trim() : null,
    });
    if (post) setPosts(prev => [post, ...prev]);
    if (error) alert('Failed: ' + error.message);
    setPostForm({ name: '', category: ALL_CATEGORIES[0], size: '', description: '', rating: 0, image: null, preview: '' });
    if (postFileRef.current) postFileRef.current.value = '';
    setSavingPost(false);
  }

  async function handleDeletePost(post: PartnerPost) {
    if (!confirm(`Delete "${post.name}"?`)) return;
    await deletePartnerPost(post.id, post.image_path);
    setPosts(prev => prev.filter(p => p.id !== post.id));
  }

  // ── Partner detail view ─────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="p-8 min-h-full bg-slate-50 space-y-6">
        {/* Back + header */}
        <div className="flex items-center gap-4">
          <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <img src={getImageUrl(selected.thumbnail_path)} alt={selected.name} className="w-12 h-12 rounded-xl object-cover" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">{selected.name}</h1>
              <p className="text-sm text-slate-500">{posts.length} items in collection</p>
            </div>
          </div>
        </div>

        {/* Add post form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Add Item to Collection</h2>
          <form onSubmit={handleAddPost} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <Input value={postForm.name} onChange={e => setPostForm(f => ({ ...f, name: e.target.value }))} placeholder="Item name" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select
                value={postForm.category}
                onChange={e => setPostForm(f => ({ ...f, category: e.target.value, size: categoryRequiresSize(e.target.value) ? f.size : '' }))}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {categoryRequiresSize(postForm.category) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Size *</label>
                <Input value={postForm.size} onChange={e => setPostForm(f => ({ ...f, size: e.target.value }))} placeholder="e.g. Medium, 38, One size" required />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <Input value={postForm.description} onChange={e => setPostForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description (optional)" />
            </div>
            <div>
              <StarRating label="Rating (optional)" value={postForm.rating} onChange={r => setPostForm(f => ({ ...f, rating: r }))} size="lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Image *</label>
              <div className="flex items-center gap-3">
                <input
                  ref={postFileRef}
                  type="file" accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => setPostForm(f => ({ ...f, image: file, preview: reader.result as string }));
                    reader.readAsDataURL(file);
                  }}
                  className="text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
                  required
                />
                {postForm.preview && <img src={postForm.preview} alt="preview" className="w-12 h-12 rounded-lg object-cover border" />}
              </div>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={savingPost || !postForm.name || !postForm.image}>
                {savingPost ? <><Loader size="sm" /><span className="ml-2">Adding…</span></> : '+ Add Item'}
              </Button>
            </div>
          </form>
        </div>

        {/* Posts grid */}
        {loadingPosts ? (
          <div className="flex justify-center py-12"><Loader size="lg" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No items yet. Add the first one above!</div>
        ) : (
          <>
            <div className="mb-6">
              <FilterChips options={categories} selected={selectedCategory} onChange={setSelectedCategory} />
            </div>
            <div className="max-w-[1500px] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredPosts.map(post => (
              <Card key={post.id} className="overflow-hidden">
                <div className="aspect-[3/4] bg-neutral-100 rounded-lg overflow-hidden mb-3">
                  <img src={getImageUrl(post.image_path)} alt={post.name} className="w-full h-full object-cover" />
                </div>
                <div className="px-1">
                  <p className="font-medium text-slate-800 truncate">{post.name}</p>
                  <p className="text-xs text-slate-500">{post.category}</p>
                  {post.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{post.description}</p>}
                  {post.rating && <div className="mt-2"><StarRating value={post.rating} size="sm" /></div>}
                  <div className="mt-3">
                    <Button size="sm" variant="danger" fullWidth onClick={() => handleDeletePost(post)}>Delete</Button>
                  </div>
                </div>
              </Card>
            ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Partners list view ──────────────────────────────────────────────────
  return (
    <div className="p-8 min-h-full bg-slate-50 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Partners</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage brand partners and their collections</p>
      </div>

      {/* Add partner form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Add New Partner</h2>
        <form onSubmit={handleAddPartner} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Partner Name *</label>
            <Input
              value={partnerForm.name}
              onChange={e => setPartnerForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Nike, Zara, H&M"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Website / Instagram URL</label>
            <Input
              value={partnerForm.website_url}
              onChange={e => setPartnerForm(f => ({ ...f, website_url: e.target.value }))}
              placeholder="https://instagram.com/brand or https://brand.com"
            />
          </div>
          <div>
            <StarRating
              label="Rating (optional)"
              value={partnerForm.rating}
              onChange={r => setPartnerForm(f => ({ ...f, rating: r }))}
              size="lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Thumbnail *</label>
            <div className="flex items-center gap-3">
              <input
                ref={partnerFileRef}
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onloadend = () => setPartnerForm(f => ({ ...f, thumbnail: file, preview: reader.result as string }));
                  reader.readAsDataURL(file);
                }}
                className="text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
                required
              />
              {partnerForm.preview && <img src={partnerForm.preview} alt="preview" className="w-12 h-12 rounded-xl object-cover border" />}
            </div>
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={savingPartner || !partnerForm.name || !partnerForm.thumbnail}>
              {savingPartner ? <><Loader size="sm" /><span className="ml-2">Adding…</span></> : '+ Add Partner'}
            </Button>
          </div>
        </form>
      </div>

      {/* Partners grid — horizontal cards so URL fits fully */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader size="lg" /></div>
      ) : partners.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No partners yet. Add one above!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partners.map(partner => (
            <Card key={partner.id} className="overflow-hidden">
              <div className="flex gap-4 p-2">
                {/* Clickable thumbnail */}
                <div
                  className="w-28 h-28 flex-shrink-0 bg-neutral-100 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all group relative"
                  onClick={() => openPartner(partner)}
                >
                  <img src={getImageUrl(partner.thumbnail_path)} alt={partner.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 bg-white text-slate-800 text-xs font-semibold px-2 py-1 rounded-full shadow transition-opacity text-center">
                      Manage
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <p className="font-bold text-slate-800 text-base truncate">{partner.name}</p>
                    {partner.rating && <div className="mt-1"><StarRating value={partner.rating} size="sm" /></div>}

                    {/* Full-width link button */}
                    {partner.website_url && (
                      <a
                        href={partner.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-2 w-full px-3 py-2 bg-gradient-to-r from-primary-50 to-pink-50 hover:from-primary-100 hover:to-pink-100 border border-primary-200 rounded-xl text-sm text-primary-600 hover:text-primary-700 transition-all font-medium"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span className="truncate">{partner.website_url}</span>
                      </a>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => openPartner(partner)}
                      className="flex-1 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Manage Collection
                    </button>
                    <button
                      onClick={() => handleDeletePartner(partner)}
                      className="flex-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
