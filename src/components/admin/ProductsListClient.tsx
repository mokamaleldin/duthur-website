'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { imageUrl } from '@/lib/images';

type ProductStatus = 'active' | 'inactive' | 'hidden';

function getProductStatus(p: any): ProductStatus {
  if (!p.active) return 'inactive';
  if (!p.featured) return 'hidden';
  return 'active';
}

export function ProductsListClient({ initialProducts }: { initialProducts: any[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleStatusChange(id: string, newStatus: ProductStatus) {
    setBusyId(id);
    const active = newStatus !== 'inactive';
    const featured = newStatus === 'active';

    const { error } = await supabase
      .from('products')
      .update({ active, featured })
      .eq('id', id);

    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active, featured } : p))
    );
    router.refresh();
  }

  return (
    <section className="admin-card">
      <div
        className="admin-table head"
        style={{ gridTemplateColumns: '64px 2fr 1fr 1fr 1.2fr' }}
      >
        <span>Image</span>
        <span>Product</span>
        <span>Price</span>
        <span>Stock</span>
        <span>Status</span>
      </div>
      {products.map((p) => {
        const images = [...(p.product_images || [])].sort(
          (a: any, b: any) => (a.position || 0) - (b.position || 0)
        );
        const thumb = images[0]?.storage_path ? imageUrl(images[0].storage_path) : '';
        const totalStock = (p.product_variants || []).reduce(
          (a: number, v: any) => a + Number(v.stock_quantity || 0),
          0
        );
        const currentStatus = getProductStatus(p);

        return (
          <div
            className="admin-table table-row"
            key={p.id}
            style={{ gridTemplateColumns: '64px 2fr 1fr 1fr 1.2fr' }}
          >
            <Link href={`/admin/products/${p.id}`} style={{ display: 'flex', alignItems: 'center' }}>
              {thumb ? (
                <img
                  src={thumb}
                  alt={p.title_en}
                  style={{
                    width: '48px',
                    height: '56px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #e5e5e2',
                    background: '#f5f5f3',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '48px',
                    height: '56px',
                    borderRadius: '8px',
                    background: '#eee',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '10px',
                    color: '#888',
                  }}
                >
                  No img
                </div>
              )}
            </Link>

            <Link
              href={`/admin/products/${p.id}`}
              style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
            >
              <strong style={{ fontSize: '15px', color: '#171717' }}>
                {p.title_ar || p.title_en}
              </strong>
              <small style={{ color: '#777', fontSize: '12px' }}>{p.title_en}</small>
            </Link>

            <Link href={`/admin/products/${p.id}`}>
              <span style={{ fontWeight: 600 }}>{Number(p.base_price).toFixed(2)} TL</span>
            </Link>

            <Link href={`/admin/products/${p.id}`}>
              <span style={{ fontWeight: 600 }}>{totalStock}</span>
            </Link>

            <div onClick={(e) => e.stopPropagation()}>
              <select
                value={currentStatus}
                disabled={busyId === p.id}
                onChange={(e) =>
                  handleStatusChange(p.id, e.target.value as ProductStatus)
                }
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid #d5d5d2',
                  background:
                    currentStatus === 'active'
                      ? '#d8f0dc'
                      : currentStatus === 'hidden'
                      ? '#fff0b8'
                      : '#f4d8d8',
                  color: '#171717',
                  cursor: 'pointer',
                }}
              >
                <option value="active">Active (نشط بالمتجر)</option>
                <option value="hidden">Hidden (مخفي من الرئيسية)</option>
                <option value="inactive">Inactive (غير نشط / مخفي كلياً)</option>
              </select>
            </div>
          </div>
        );
      })}
      {products.length === 0 && (
        <p style={{ padding: '24px 16px', color: 'var(--color-muted, #888)' }}>
          No products found.
        </p>
      )}
    </section>
  );
}
