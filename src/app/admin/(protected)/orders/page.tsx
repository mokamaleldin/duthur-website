import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

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
        <div className="admin-card" style={{ borderColor: 'var(--color-danger, #ef4444)', color: 'var(--color-danger, #ef4444)' }}>
          <p>Error loading orders: {error.message}</p>
        </div>
      )}
      <section className="admin-card">
        <div className="admin-table orders-head">
          <span>Order</span>
          <span>Date</span>
          <span>Customer</span>
          <span>Total</span>
          <span>Payment</span>
          <span>Status</span>
        </div>
        {(data || []).map((o) => (
          <Link
            className="admin-table orders-head table-row"
            key={o.id}
            href={`/admin/orders/${o.id}`}
          >
            <span>#{o.order_number}</span>
            <span>{new Date(o.created_at).toLocaleDateString()}</span>
            <span>
              {o.customer_first_name} {o.customer_last_name}
            </span>
            <span>{Number(o.total).toFixed(2)} TL</span>
            <span>{o.payment_status}</span>
            <span className={`status ${o.order_status}`}>{o.order_status}</span>
          </Link>
        ))}
        {!error && (!data || data.length === 0) && (
          <p style={{ padding: '24px 16px', color: 'var(--color-muted, #888)' }}>No orders found.</p>
        )}
      </section>
    </>
  );
}
