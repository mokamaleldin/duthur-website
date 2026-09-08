import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function Dashboard() {
  const s = await createClient();
  const [
    { count: products, error: productsError },
    { count: orders, error: ordersError },
    { data: orderRows, error: orderRowsError },
    { data: recent, error: recentError },
  ] = await Promise.all([
    s.from('products').select('*', { count: 'exact', head: true }),
    s.from('orders').select('*', { count: 'exact', head: true }),
    s.from('orders').select('total,order_status'),
    s.from('orders').select('*').order('created_at', { ascending: false }).limit(8),
  ]);

  if (productsError) console.error('[Dashboard] Error fetching products count:', productsError);
  if (ordersError) console.error('[Dashboard] Error fetching orders count:', ordersError);
  if (orderRowsError) console.error('[Dashboard] Error fetching order rows:', orderRowsError);
  if (recentError) console.error('[Dashboard] Error fetching recent orders:', recentError);

  const sales = (orderRows || [])
    .filter((o) => o.order_status !== 'cancelled')
    .reduce((a, o) => a + Number(o.total || 0), 0);

  return (
    <>
      <div className="admin-title">
        <div>
          <p>Overview</p>
          <h1>Dashboard</h1>
        </div>
        <Link className="primary inline" href="/admin/products/new">
          + Add product
        </Link>
      </div>
      <div className="stat-grid">
        <div>
          <span>Products</span>
          <strong>{products || 0}</strong>
        </div>
        <div>
          <span>Orders</span>
          <strong>{orders || 0}</strong>
        </div>
        <div>
          <span>Sales</span>
          <strong>{sales.toFixed(2)} TL</strong>
        </div>
        <div>
          <span>New orders</span>
          <strong>{(orderRows || []).filter((o) => o.order_status === 'new').length}</strong>
        </div>
      </div>
      <section className="admin-card">
        <h2>Recent orders</h2>
        <div className="admin-table">
          {(recent || []).map((o) => (
            <Link className="table-row" key={o.id} href={`/admin/orders/${o.id}`}>
              <span>#{o.order_number}</span>
              <span>
                {o.customer_first_name} {o.customer_last_name}
              </span>
              <span>{Number(o.total).toFixed(2)} TL</span>
              <span className={`status ${o.order_status}`}>{o.order_status}</span>
            </Link>
          ))}
          {(!recent || recent.length === 0) && (
            <p style={{ padding: '16px', color: 'var(--color-muted, #888)' }}>No recent orders.</p>
          )}
        </div>
      </section>
    </>
  );
}
