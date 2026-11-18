import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductsListClient } from '@/components/admin/ProductsListClient';

export default async function Products() {
  const s = await createClient();
  const { data, error } = await s
    .from('products')
    .select('*,product_variants(stock_quantity),product_images(id,storage_path,position)')
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
        <div
          className="admin-card"
          style={{
            borderColor: 'var(--color-danger, #ef4444)',
            color: 'var(--color-danger, #ef4444)',
          }}
        >
          <p>Error loading products: {error.message}</p>
        </div>
      )}
      <ProductsListClient initialProducts={data || []} />
    </>
  );
}
