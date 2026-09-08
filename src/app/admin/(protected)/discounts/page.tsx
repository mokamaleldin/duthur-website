import { createClient } from '@/lib/supabase/server';
import { DiscountManager } from '@/components/admin/DiscountManager';

export default async function Page() {
  const s = await createClient();
  const { data, error } = await s
    .from('discount_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Admin Discounts] Error fetching discount codes:', error);
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <p>Sales</p>
          <h1>Discounts</h1>
        </div>
      </div>
      {error && (
        <div className="admin-card" style={{ borderColor: 'var(--color-danger, #ef4444)', color: 'var(--color-danger, #ef4444)' }}>
          <p>Error loading discounts: {error.message}</p>
        </div>
      )}
      <DiscountManager discounts={data || []} />
    </>
  );
}
