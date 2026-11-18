import { createClient } from '@/lib/supabase/server';
import { SkusClient } from '@/components/admin/SkusClient';
import { loadLedgerFromStorageOrLocal } from '@/app/api/admin/finance/route';

export default async function SkusPage() {
  const s = await createClient();
  const [ledger, { data: products }] = await Promise.all([
    loadLedgerFromStorageOrLocal(s),
    s
      .from('products')
      .select('id,base_price,product_variants(id,option_values,stock_quantity)')
      .order('created_at', { ascending: false }),
  ]);

  return (
    <SkusClient
      initialLedger={ledger}
      initialProducts={products || []}
    />
  );
}
