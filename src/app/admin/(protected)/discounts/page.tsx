import { createClient } from '@/lib/supabase/server';
import { DiscountManager } from '@/components/admin/DiscountManager';
import { loadLedgerFromStorageOrLocal } from '@/app/api/admin/finance/route';

export default async function Page() {
  const s = await createClient();
  const [{ data, error }, { data: products }, ledger] = await Promise.all([
    s.from('discount_codes').select('*').order('created_at', { ascending: false }),
    s.from('products').select('id,title_ar,title_en').order('created_at', { ascending: false }),
    loadLedgerFromStorageOrLocal(s),
  ]);

  if (error) {
    console.error('[Admin Discounts] Error fetching discount codes:', error);
  }

  const deletedIds = new Set(ledger.deleted_discount_ids || []);
  const visibleDiscounts = (data || []).filter((d) => !deletedIds.has(d.id));

  return (
    <>
      {error && (
        <div
          className="admin-card"
          style={{
            borderColor: 'var(--color-danger, #ef4444)',
            color: 'var(--color-danger, #ef4444)',
          }}
        >
          <p>Error loading discounts: {error.message}</p>
        </div>
      )}
      <DiscountManager
        discounts={visibleDiscounts}
        products={products || []}
        initialProductMap={ledger.discount_product_map || {}}
      />
    </>
  );
}
