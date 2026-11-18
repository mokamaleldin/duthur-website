import { createClient } from '@/lib/supabase/server';
import { FinanceMasterClient } from '@/components/admin/FinanceMasterClient';
import { loadLedgerFromStorageOrLocal } from '@/app/api/admin/finance/route';

export default async function FinancePage() {
  const s = await createClient();
  const [ledger, { data: products }, { data: orders }] = await Promise.all([
    loadLedgerFromStorageOrLocal(s),
    s
      .from('products')
      .select('id,base_price,product_variants(stock_quantity)')
      .order('created_at', { ascending: false }),
    s
      .from('orders')
      .select('id,total,order_status,payment_status,admin_note')
      .order('created_at', { ascending: false }),
  ]);

  const deletedOrderIds = new Set(ledger.deleted_order_ids || []);
  const activeOrders = (orders || []).filter(
    (o: any) => !deletedOrderIds.has(o.id) && o.admin_note !== '__DELETED__'
  );

  return (
    <FinanceMasterClient
      initialLedger={ledger}
      initialProducts={products || []}
      initialOrders={activeOrders}
    />
  );
}
