import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OrderActions } from '@/components/admin/OrderActions';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const { data: o, error } = await s
    .from('orders')
    .select('*,order_items(*)')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`[Admin Order Detail] Error fetching order ${id}:`, error);
  }

  if (!o) notFound();

  return (
    <>
      <div className="admin-title">
        <div>
          <p>Order</p>
          <h1>#{o.order_number}</h1>
        </div>
        <span className={`status ${o.order_status}`}>{o.order_status}</span>
      </div>
      <div className="admin-two">
        <section className="admin-card">
          <h2>Items</h2>
          {(o.order_items || []).map((i: any) => (
            <div className="order-line" key={i.id}>
              <div>
                <strong>{i.product_name_snapshot}</strong>
                <small>{Object.values(i.variant_snapshot || {}).join(' / ')}</small>
              </div>
              <span>
                {i.quantity} × {Number(i.unit_price).toFixed(2)} TL
              </span>
            </div>
          ))}
          <div className="totals">
            <div>
              <span>Subtotal</span>
              <b>{Number(o.subtotal).toFixed(2)} TL</b>
            </div>
            <div>
              <span>Discount</span>
              <b>-{Number(o.discount_amount).toFixed(2)} TL</b>
            </div>
            <div>
              <span>Shipping</span>
              <b>{Number(o.shipping_amount).toFixed(2)} TL</b>
            </div>
            <div className="grand">
              <span>Total</span>
              <b>{Number(o.total).toFixed(2)} TL</b>
            </div>
          </div>
        </section>
        <section className="admin-card">
          <h2>Customer</h2>
          <p>
            <strong>
              {o.customer_first_name} {o.customer_last_name}
            </strong>
            <br />
            {o.phone}
            <br />
            {o.email}
          </p>
          <h3>Delivery</h3>
          <p>
            {o.province} / {o.district}
            <br />
            {o.full_address}
            <br />
            {o.address_details}
          </p>
          <p>
            <b>{o.shipping_method}</b>
          </p>
        </section>
      </div>
      <OrderActions order={o} />
    </>
  );
}
