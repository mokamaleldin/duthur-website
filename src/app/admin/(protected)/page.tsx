import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { loadLedgerFromStorageOrLocal } from '@/app/api/admin/finance/route';

export default async function Dashboard() {
  const s = await createClient();
  const [
    { count: products, error: productsError },
    { data: orderRows, error: orderRowsError },
    { data: recent, error: recentError },
    ledger,
  ] = await Promise.all([
    s.from('products').select('*', { count: 'exact', head: true }),
    s.from('orders').select('id,total,order_status,payment_status,admin_note'),
    s.from('orders').select('*').order('created_at', { ascending: false }).limit(12),
    loadLedgerFromStorageOrLocal(s),
  ]);

  if (productsError) console.error('[Dashboard] Error fetching products count:', productsError);
  if (orderRowsError) console.error('[Dashboard] Error fetching order rows:', orderRowsError);
  if (recentError) console.error('[Dashboard] Error fetching recent orders:', recentError);

  const deletedIds = new Set(ledger.deleted_order_ids || []);
  const nonVoidStatuses = new Set(['cancelled', 'fake', 'returned']);

  const activeOrderRows = (orderRows || []).filter(
    (o) => !deletedIds.has(o.id) && o.admin_note !== '__DELETED__'
  );
  const validOrders = activeOrderRows.filter((o) => !nonVoidStatuses.has(o.order_status));
  const paidWebsiteSales = validOrders
    .filter(
      (o) =>
        o.payment_status === 'paid' ||
        o.order_status === 'confirmed' ||
        o.order_status === 'shipped' ||
        o.order_status === 'delivered'
    )
    .reduce((a, o) => a + Number(o.total || 0), 0);

  // Confirmed sales from reconciled ledger (12 Shopify + 2 Manual = 14 orders, 15,531.48 TL)
  const confirmedLedgerSales = (ledger.transactions || []).filter(
    (t) => t.type === 'income' && t.status === 'confirmed'
  );
  const confirmedLedgerRevenue = confirmedLedgerSales.reduce(
    (a, t) => a + Number(t.amount_original || 0),
    0
  );

  const totalConfirmedSales = confirmedLedgerRevenue + paidWebsiteSales;
  const totalConfirmedOrdersCount = confirmedLedgerSales.length + validOrders.length;

  const visibleRecent = (recent || [])
    .filter((o) => !deletedIds.has(o.id) && o.admin_note !== '__DELETED__')
    .slice(0, 8);

  return (
    <>
      <div className="admin-title">
        <div>
          <p>Overview</p>
          <h1>Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link className="primary inline" href="/admin/finance" style={{ background: '#6E705B' }}>
            Finance
          </Link>
          <Link className="primary inline" href="/admin/products/new">
            + Add product
          </Link>
        </div>
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div>
          <span>Products</span>
          <strong>{products || 0}</strong>
        </div>
        <div>
          <span>Orders</span>
          <strong>{totalConfirmedOrdersCount}</strong>
          <small style={{ color: '#777', fontSize: '12px', display: 'block', marginTop: '4px' }}>
            12 Shopify + 2 Manual {validOrders.length > 0 ? `+ ${validOrders.length} Store` : ''}
          </small>
        </div>
        <div>
          <span>Sales</span>
          <strong>{totalConfirmedSales.toFixed(2)} TL</strong>
          <small style={{ color: '#777', fontSize: '12px', display: 'block', marginTop: '4px' }}>
            Confirmed Revenue (15 T-shirts sold)
          </small>
        </div>
      </div>
      <section className="admin-card">
        <h2>Recent store orders</h2>
        <div className="admin-table">
          {visibleRecent.map((o) => (
            <Link className="table-row" key={o.id} href={`/admin/orders/${o.id}`}>
              <span>#{o.order_number}</span>
              <span>
                {o.customer_first_name} {o.customer_last_name}
              </span>
              <span>{Number(o.total).toFixed(2)} TL</span>
              <span className={`status ${o.order_status}`}>{o.order_status}</span>
            </Link>
          ))}
          {visibleRecent.length === 0 && (
            <p style={{ padding: '16px', color: 'var(--color-muted, #888)' }}>No recent orders.</p>
          )}
        </div>
      </section>
    </>
  );
}
