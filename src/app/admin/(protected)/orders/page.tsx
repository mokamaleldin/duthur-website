import { createClient } from '@/lib/supabase/server';
import { OrdersListClient } from '@/components/admin/OrdersListClient';

export default async function Orders() {
  const s = await createClient();
  const { data, error } = await s
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[Admin Orders] Database error fetching orders:', error);
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <p>Sales</p>
          <h1>Orders</h1>
        </div>
      </div>
      {error && (
        <div
          className="admin-card"
          style={{
            borderColor: 'var(--color-danger, #ef4444)',
            color: 'var(--color-danger, #ef4444)',
          }}
        >
          <p>Error loading orders: {error.message}</p>
        </div>
      )}
      <OrdersListClient initialOrders={data || []} />
    </>
  );
}
