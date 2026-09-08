import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function Products() {
  const s = await createClient();
  const { data, error } = await s
    .from('products')
    .select('*,product_variants(stock_quantity)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Admin Products] Error fetching products:', error);
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <p>Catalog</p>
          <h1>Products</h1>
        </div>
        <Link className="primary inline" href="/admin/products/new">
          + Add product
        </Link>
      </div>
      {error && (
        <div className="admin-card" style={{ borderColor: 'var(--color-danger, #ef4444)', color: 'var(--color-danger, #ef4444)' }}>
          <p>Error loading products: {error.message}</p>
        </div>
      )}
      <section className="admin-card">
        <div className="admin-table head">
          <span>Product</span>
          <span>Price</span>
          <span>Stock</span>
          <span>Status</span>
        </div>
        {(data || []).map((p) => (
          <Link
            className="admin-table table-row"
            key={p.id}
            href={`/admin/products/${p.id}`}
          >
            <span>{p.title_en}</span>
            <span>{Number(p.base_price).toFixed(2)} TL</span>
            <span>
              {(p.product_variants || []).reduce(
                (a: any, v: any) => a + Number(v.stock_quantity || 0),
                0
              )}
            </span>
            <span className={`status ${p.active ? 'delivered' : 'cancelled'}`}>
              {p.active ? 'active' : 'draft'}
            </span>
          </Link>
        ))}
        {!error && (!data || data.length === 0) && (
          <p style={{ padding: '24px 16px', color: 'var(--color-muted, #888)' }}>No products found.</p>
        )}
      </section>
    </>
  );
}
