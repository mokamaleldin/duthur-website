import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OrderActions } from '@/components/admin/OrderActions';
import { imageUrl } from '@/lib/images';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await createClient();
  const [{ data: o, error }, { data: products }] = await Promise.all([
    s.from('orders').select('*,order_items(*)').eq('id', id).single(),
    s.from('products').select('id,title_ar,title_en,product_images(storage_path,position)'),
  ]);

  if (error) {
    console.error(`[Admin Order Detail] Error fetching order ${id}:`, error);
  }

  if (!o) notFound();

  const productsMap: Record<string, any> = {};
  for (const p of products || []) {
    const sortedImgs = [...(p.product_images || [])].sort(
      (a: any, b: any) => (a.position || 0) - (b.position || 0)
    );
    productsMap[p.id] = { ...p, product_images: sortedImgs };
  }

  return (
    <>
      <div className="admin-title" style={{ flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <p>Order Details</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1>#{o.order_number}</h1>
            <span className={`status ${o.order_status}`}>{o.order_status}</span>
          </div>
        </div>
        <OrderActions order={o} productsMap={productsMap} />
      </div>

      <div className="admin-two">
        <section className="admin-card">
          <h2>Items (التيشيرتات المطلوبة)</h2>
          {(o.order_items || []).map((i: any) => {
            const prod = productsMap[i.product_id];
            const firstImg = prod?.product_images?.[0]?.storage_path
              ? imageUrl(prod.product_images[0].storage_path)
              : '';
            const size = Object.values(i.variant_snapshot || {}).join(' / ');

            return (
              <div className="order-line" key={i.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {firstImg && (
                    <a
                      href={firstImg}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="اضغط لفتح أو تحميل صورة التيشيرت"
                    >
                      <img
                        src={firstImg}
                        alt={i.product_name_snapshot}
                        style={{
                          width: '60px',
                          height: '70px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                        }}
                      />
                    </a>
                  )}
                  <div>
                    <strong style={{ fontSize: '15px' }}>{i.product_name_snapshot}</strong>
                    <small style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>
                      المقاس (Size): {size} | الكمية: {i.quantity}
                    </small>
                    {firstImg && (
                      <a
                        href={firstImg}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        style={{
                          display: 'inline-block',
                          marginTop: '4px',
                          fontSize: '12px',
                          color: '#6E705B',
                          textDecoration: 'underline',
                          fontWeight: 600,
                        }}
                      >
                        ⬇ تحميل صورة التيشيرت
                      </a>
                    )}
                  </div>
                </div>
                <span style={{ fontWeight: 700 }}>
                  {i.quantity} × {Number(i.unit_price).toFixed(2)} TL
                </span>
              </div>
            );
          })}
          <div className="totals" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span>Subtotal</span>
              <b>{Number(o.subtotal).toFixed(2)} TL</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span>Discount</span>
              <b>-{Number(o.discount_amount).toFixed(2)} TL</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span>Shipping</span>
              <b>{Number(o.shipping_amount).toFixed(2)} TL</b>
            </div>
            <div
              className="grand"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0 0',
                borderTop: '1px solid #eee',
                fontSize: '18px',
              }}
            >
              <span>Total</span>
              <b>{Number(o.total).toFixed(2)} TL</b>
            </div>
          </div>
        </section>

        <section className="admin-card">
          <h2>Customer & Delivery (بيانات العميل والشحن)</h2>
          <p>
            <strong>
              {o.customer_first_name} {o.customer_last_name}
            </strong>
            <br />
            <span dir="ltr">{o.phone}</span>
            <br />
            {o.email}
          </p>
          <h3>Delivery Address</h3>
          <p style={{ lineHeight: 1.6 }}>
            {o.country ? `${o.country} — ` : ''}
            {o.province} / {o.district}
            <br />
            {o.full_address}
            {o.address_details ? (
              <>
                <br />
                {o.address_details}
              </>
            ) : null}
            {o.postal_code ? (
              <>
                <br />
                Postal Code: {o.postal_code}
              </>
            ) : null}
          </p>
          <p>
            Shipping Method: <b>{o.shipping_method}</b>
          </p>
        </section>

        <section className="admin-card">
          <h2>Payment Proof / Dekont</h2>
          {o.payment_proof_path ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ color: '#2b8a3e', fontWeight: 600, margin: 0 }}>
                Receipt uploaded ✓
              </p>
              {o.payment_proof_uploaded_at && (
                <small style={{ color: '#888' }}>
                  Uploaded at: {new Date(o.payment_proof_uploaded_at).toLocaleString()}
                </small>
              )}
              <div style={{ marginTop: '6px' }}>
                <a
                  href={`/api/orders/${o.id}/payment-proof`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary inline"
                  style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '8px' }}
                >
                  View / Download Receipt
                </a>
              </div>
            </div>
          ) : (
            <p style={{ color: '#888', margin: 0 }}>No payment proof uploaded yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
