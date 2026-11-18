'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { imageUrl } from '@/lib/images';
import { ConfirmModal } from './ConfirmModal';

const defaultSizes = ['S', 'M', 'L', 'XL'];

type Initial = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  title_tr: string;
  description_ar: string;
  description_en: string;
  description_tr: string;
  base_price: number;
  compare_at_price: number | null;
  active: boolean;
  featured: boolean;
  product_variants?: any[];
  product_images?: any[];
};

export function ProductForm({ initial }: { initial?: Initial }) {
  const s = useMemo(() => createClient(), []);
  const router = useRouter();

  const [sizes, setSizes] = useState(() =>
    defaultSizes.map((size) => {
      const v = initial?.product_variants?.find(
        (v) => v.option_values?.Size === size
      );
      return {
        size,
        stock: v?.stock_quantity || 0,
        price: v?.price || initial?.base_price || 0,
      };
    })
  );

  const [existingImages, setExistingImages] = useState<any[]>(() =>
    [...(initial?.product_images || [])].sort(
      (a, b) => (a.position || 0) - (b.position || 0)
    )
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [visibilityState, setVisibilityState] = useState<
    'active' | 'hidden' | 'inactive'
  >(() => {
    if (!initial) return 'active';
    if (!initial.active) return 'inactive';
    if (!initial.featured) return 'hidden';
    return 'active';
  });

  const [busy, setBusy] = useState(false);
  const [deletingImgId, setDeletingImgId] = useState<string | null>(null);
  const [imgToDelete, setImgToDelete] = useState<any | null>(null);
  const [msg, setMsg] = useState('');

  function slugify(v: string) {
    return v
      .toLowerCase()
      .trim()
      .replace(/[“”"']/g, '')
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function confirmDeleteImage() {
    if (!imgToDelete) return;
    const img = imgToDelete;
    setDeletingImgId(img.id);
    const { error } = await s.from('product_images').delete().eq('id', img.id);
    if (error) {
      alert(error.message);
      setDeletingImgId(null);
      setImgToDelete(null);
      return;
    }
    if (img.storage_path && !/^https?:\/\//.test(img.storage_path)) {
      await s.storage.from('product-images').remove([img.storage_path]);
    }
    setExistingImages((prev) => prev.filter((x) => x.id !== img.id));
    setDeletingImgId(null);
    setImgToDelete(null);
  }

  async function moveImage(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= existingImages.length) return;
    const updated = [...existingImages];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    const reindexed = updated.map((im, idx) => ({ ...im, position: idx }));
    setExistingImages(reindexed);

    for (const im of reindexed) {
      await s
        .from('product_images')
        .update({ position: im.position })
        .eq('id', im.id);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const f = new FormData(e.currentTarget);

    const active = visibilityState !== 'inactive';
    const featured = visibilityState === 'active';

    const payload = {
      slug: String(f.get('slug') || slugify(String(f.get('title_en')))),
      title_ar: String(f.get('title_ar')),
      title_en: String(f.get('title_en')),
      title_tr: String(f.get('title_tr')),
      description_ar: String(f.get('description_ar') || ''),
      description_en: String(f.get('description_en') || ''),
      description_tr: String(f.get('description_tr') || ''),
      base_price: Number(f.get('base_price')),
      compare_at_price: f.get('compare_at_price')
        ? Number(f.get('compare_at_price'))
        : null,
      active,
      featured,
      material_fit_ar: 'قصة Oversized / Box Fit.',
      material_fit_en: 'Oversized / Box Fit.',
      material_fit_tr: 'Oversize / Box Fit.',
      size_chart: [
        { size: 'S', length: 73, chest: 56, sleeve: 23 },
        { size: 'M', length: 75, chest: 58, sleeve: 24 },
        { size: 'L', length: 77, chest: 61, sleeve: 24.5 },
        { size: 'XL', length: 78, chest: 64, sleeve: 25 },
        { size: 'XXL', length: 80, chest: 66, sleeve: 25.5 },
      ],
    };

    let id = initial?.id;
    let error: any;
    if (id) {
      ({ error } = await s.from('products').update(payload).eq('id', id));
    } else {
      const r = await s
        .from('products')
        .insert(payload)
        .select('id')
        .single();
      error = r.error;
      id = r.data?.id;
    }

    if (error || !id) {
      setMsg(error?.message || 'Could not save product');
      setBusy(false);
      return;
    }

    // Update or insert variants without breaking foreign keys if possible
    const existingVars = initial?.product_variants || [];
    const trimmedSizes = sizes.filter((x) => x.size.trim());

    for (let i = 0; i < trimmedSizes.length; i++) {
      const x = trimmedSizes[i];
      const sizeName = x.size.trim();
      const found = existingVars.find((v) => v.option_values?.Size === sizeName);
      if (found) {
        await s
          .from('product_variants')
          .update({
            price: Number(x.price || payload.base_price),
            stock_quantity: Number(x.stock || 0),
            active: true,
            position: i,
          })
          .eq('id', found.id);
      } else {
        await s.from('product_variants').insert({
          product_id: id,
          option_values: { Size: sizeName },
          price: Number(x.price || payload.base_price),
          stock_quantity: Number(x.stock || 0),
          active: true,
          position: i,
        });
      }
    }

    // Upload new files
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024)
        continue;
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${id}/${crypto.randomUUID()}.${ext}`;
      const up = await s.storage
        .from('product-images')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (!up.error) {
        await s.from('product_images').insert({
          product_id: id,
          storage_path: path,
          position: existingImages.length + i,
        });
      }
    }

    router.push('/admin/products');
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <section className="admin-card">
        <h2>Product info</h2>
        <div className="form-grid">
          <label>
            Arabic title
            <input
              required
              name="title_ar"
              defaultValue={initial?.title_ar}
            />
          </label>
          <label>
            English title
            <input
              required
              name="title_en"
              defaultValue={initial?.title_en}
            />
          </label>
          <label>
            Turkish title
            <input
              required
              name="title_tr"
              defaultValue={initial?.title_tr}
            />
          </label>
          <label>
            Slug
            <input name="slug" defaultValue={initial?.slug} />
          </label>
          <label className="full">
            Arabic description
            <textarea
              name="description_ar"
              defaultValue={initial?.description_ar}
            />
          </label>
          <label className="full">
            English description
            <textarea
              name="description_en"
              defaultValue={initial?.description_en}
            />
          </label>
          <label className="full">
            Turkish description
            <textarea
              name="description_tr"
              defaultValue={initial?.description_tr}
            />
          </label>
        </div>
      </section>

      <section className="admin-card">
        <h2>Pricing & visibility</h2>
        <div className="form-grid">
          <label>
            Price (TL)
            <input
              required
              type="number"
              step="0.01"
              name="base_price"
              defaultValue={initial?.base_price}
            />
          </label>
          <label>
            Compare-at price
            <input
              type="number"
              step="0.01"
              name="compare_at_price"
              defaultValue={initial?.compare_at_price || ''}
            />
          </label>
          <label className="full">
            حالة ظهور المنتج (Product State)
            <select
              value={visibilityState}
              onChange={(e) =>
                setVisibilityState(
                  e.target.value as 'active' | 'hidden' | 'inactive'
                )
              }
            >
              <option value="active">Active — نشط ويظهر في المتجر والصفحة الرئيسية</option>
              <option value="hidden">Hidden — مخفي من الرئيسية (متاح عبر الرابط المباشر)</option>
              <option value="inactive">Inactive — غير نشط (مخفي تماماً من المتجر)</option>
            </select>
          </label>
        </div>
      </section>

      <section className="admin-card">
        <h2>الصور الحالية والجديدة (Images)</h2>
        {existingImages.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '14px',
              marginBottom: '18px',
            }}
          >
            {existingImages.map((img, idx) => (
              <div
                key={img.id}
                style={{
                  border: '1px solid #e2e2df',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: '#fafaf8',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ position: 'relative', aspectRatio: '0.85', background: '#eee' }}>
                  <img
                    src={imageUrl(img.storage_path)}
                    alt={`Image ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  {idx === 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        background: '#171717',
                        color: '#fff',
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '99px',
                        fontWeight: 600,
                      }}
                    >
                      الرئيسية (Primary)
                    </span>
                  )}
                </div>
                <div
                  style={{
                    padding: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveImage(idx, -1)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #ddd',
                        background: '#fff',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                      title="تحريك لليمين/الأول"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={idx === existingImages.length - 1}
                      onClick={() => moveImage(idx, 1)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #ddd',
                        background: '#fff',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                      title="تحريك لليسار/التالي"
                    >
                      →
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={deletingImgId === img.id}
                    onClick={() => setImgToDelete(img)}
                    style={{
                      padding: '4px 10px',
                      border: '1px solid #e5a0a0',
                      background: '#fff5f5',
                      color: '#b91c1c',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {deletingImgId === img.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ marginBottom: '14px' }}>
            لا توجد صور مرفوعة حالياً لهذا المنتج.
          </p>
        )}

        <div
          style={{
            border: '1px dashed #c8c1b5',
            borderRadius: '10px',
            padding: '16px',
            background: '#faf9f5',
          }}
        >
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
            إضافة صور جديدة
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const selected = Array.from(e.target.files || []);
              setNewFiles((prev) => [...prev, ...selected]);
            }}
          />
          {newFiles.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                marginTop: '12px',
              }}
            >
              {newFiles.map((file, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                  }}
                >
                  <span>{file.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewFiles((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    style={{
                      border: 0,
                      background: 'none',
                      color: '#b91c1c',
                      fontWeight: 700,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="admin-card">
        <h2>Sizes & stock</h2>
        {sizes.map((x, i) => (
          <div className="variant-admin" key={i}>
            <input
              value={x.size}
              onChange={(e) =>
                setSizes((a) =>
                  a.map((v, j) => (j === i ? { ...v, size: e.target.value } : v))
                )
              }
            />
            <label>
              Stock
              <input
                type="number"
                min="0"
                value={x.stock}
                onChange={(e) =>
                  setSizes((a) =>
                    a.map((v, j) =>
                      j === i ? { ...v, stock: +e.target.value } : v
                    )
                  )
                }
              />
            </label>
            <label>
              Price
              <input
                type="number"
                min="0"
                step="0.01"
                value={x.price}
                onChange={(e) =>
                  setSizes((a) =>
                    a.map((v, j) =>
                      j === i ? { ...v, price: +e.target.value } : v
                    )
                  )
                }
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setSizes((a) => [
              ...a,
              { size: '', stock: 0, price: Number(initial?.base_price || 0) },
            ])
          }
        >
          + Add size
        </button>
      </section>

      {msg && <p className="form-error">{msg}</p>}
      <button className="primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save product'}
      </button>

      <ConfirmModal
        open={Boolean(imgToDelete)}
        title="Delete Image"
        message="Are you sure you want to permanently delete this product image?"
        confirmLabel="Delete Image"
        cancelLabel="Cancel"
        busy={Boolean(deletingImgId)}
        onConfirm={confirmDeleteImage}
        onCancel={() => setImgToDelete(null)}
      />
    </form>
  );
}
