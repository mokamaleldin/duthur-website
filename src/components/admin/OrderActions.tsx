'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { imageUrl } from '@/lib/images';
import { ConfirmModal } from './ConfirmModal';

const VOID_STATUSES = new Set(['cancelled', 'returned']);

export function OrderActions({
  order,
  productsMap,
}: {
  order: any;
  productsMap?: Record<string, any>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [status, setStatus] = useState<string>(() => {
    if (order.order_status === 'confirmed' && order.payment_status === 'paid') {
      return 'paid';
    }
    return order.order_status;
  });
  const [busy, setBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function restoreStockIfNeeded(currentStatus: string) {
    const rawCurrent = currentStatus === 'paid' ? 'confirmed' : currentStatus;
    if (VOID_STATUSES.has(rawCurrent)) return;
    const items = order.order_items || [];
    for (const item of items) {
      if (!item.variant_id) continue;
      const { data: v } = await supabase
        .from('product_variants')
        .select('stock_quantity')
        .eq('id', item.variant_id)
        .maybeSingle();
      if (v) {
        await supabase
          .from('product_variants')
          .update({
            stock_quantity: Number(v.stock_quantity || 0) + Number(item.quantity || 0),
          })
          .eq('id', item.variant_id);
      }
    }
  }

  async function deductStockIfNeeded(currentStatus: string) {
    const rawCurrent = currentStatus === 'paid' ? 'confirmed' : currentStatus;
    if (!VOID_STATUSES.has(rawCurrent)) return;
    const items = order.order_items || [];
    for (const item of items) {
      if (!item.variant_id) continue;
      const { data: v } = await supabase
        .from('product_variants')
        .select('stock_quantity')
        .eq('id', item.variant_id)
        .maybeSingle();
      if (v) {
        await supabase
          .from('product_variants')
          .update({
            stock_quantity: Math.max(
              0,
              Number(v.stock_quantity || 0) - Number(item.quantity || 0)
            ),
          })
          .eq('id', item.variant_id);
      }
    }
  }

  async function quickStatus(selectedValue: string) {
    if (status === selectedValue) return;
    setBusy(true);

    const dbOrderStatus = selectedValue === 'paid' ? 'confirmed' : selectedValue;
    const dbPaymentStatus =
      selectedValue === 'paid' || selectedValue === 'shipped' || selectedValue === 'delivered'
        ? 'paid'
        : selectedValue === 'returned'
        ? 'refunded'
        : 'pending';

    const rawCurrent = status === 'paid' ? 'confirmed' : status;
    const wasVoid = VOID_STATUSES.has(rawCurrent);
    const willBeVoid = VOID_STATUSES.has(dbOrderStatus);

    if (!wasVoid && willBeVoid) {
      await restoreStockIfNeeded(status);
    } else if (wasVoid && !willBeVoid) {
      await deductStockIfNeeded(status);
    }

    const { error } = await supabase
      .from('orders')
      .update({ order_status: dbOrderStatus, payment_status: dbPaymentStatus })
      .eq('id', order.id);

    setBusy(false);
    if (error) return;
    setStatus(selectedValue);
    router.refresh();
  }

  async function confirmDeleteOrder() {
    setBusy(true);
    await restoreStockIfNeeded(status);

    const res = await fetch('/api/admin/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_order', orderId: order.id }),
    });

    setBusy(false);
    setShowDeleteConfirm(false);
    if (!res.ok) return;
    router.push('/admin/orders');
    router.refresh();
  }

  function downloadSlip() {
    const items = order.order_items || [];
    const itemsHtml = items
      .map((i: any) => {
        const size = Object.values(i.variant_snapshot || {}).join(' / ') || '-';
        const prod = productsMap?.[i.product_id];
        const imgPath = prod?.product_images?.[0]?.storage_path
          ? imageUrl(prod.product_images[0].storage_path)
          : '';
        return `
          <tr>
            <td style="padding:12px;border-bottom:1px solid #ddd;">
              <div style="display:flex;align-items:center;gap:12px;">
                ${
                  imgPath
                    ? `<img src="${imgPath}" style="width:64px;height:74px;object-fit:cover;border-radius:6px;border:1px solid #ccc;" />`
                    : ''
                }
                <div>
                  <strong style="font-size:16px;display:block;">${i.product_name_snapshot}</strong>
                  <span style="color:#555;font-size:13px;">SKU / Tag: DUTHUR-${size}</span>
                </div>
              </div>
            </td>
            <td style="padding:12px;border-bottom:1px solid #ddd;font-size:18px;font-weight:700;text-align:center;">${size}</td>
            <td style="padding:12px;border-bottom:1px solid #ddd;font-size:18px;font-weight:700;text-align:center;">${i.quantity}</td>
            <td style="padding:12px;border-bottom:1px solid #ddd;text-align:end;font-weight:600;">${Number(i.unit_price).toFixed(2)} TL</td>
          </tr>
        `;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>DUTHUR - Order #${order.order_number}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f5f5f3; color: #171717; padding: 30px; margin: 0; }
    .sheet { max-width: 820px; margin: 0 auto; background: #fff; border: 2px solid #171717; border-radius: 12px; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #171717; padding-bottom: 18px; margin-bottom: 24px; }
    .brand { font-size: 28px; font-weight: 900; letter-spacing: 0.12em; }
    .tag-box { border: 2px dashed #171717; padding: 16px; border-radius: 10px; background: #faf9f5; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #171717; color: #fff; padding: 10px 12px; text-align: right; font-size: 13px; }
    .actions { text-align: center; margin-bottom: 20px; }
    .btn { background: #171717; color: #fff; border: 0; padding: 10px 22px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
    @media print { .actions { display: none; } body { background: #fff; padding: 0; } .sheet { border: none; } }
  </style>
</head>
<body>
  <div class="actions">
    <button class="btn" onclick="window.print()">Print / Save PDF</button>
  </div>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="brand">DUTHUR — دُثُر</div>
        <div style="color:#555;font-size:13px;margin-top:4px;">Order Fulfillment & Shipping Tag</div>
      </div>
      <div style="text-align:left;">
        <div style="font-size:24px;font-weight:800;">#${order.order_number}</div>
        <div style="font-size:13px;color:#666;">${new Date(order.created_at).toLocaleDateString()}</div>
      </div>
    </div>

    <div class="tag-box">
      <div style="font-size:12px;color:#666;font-weight:700;margin-bottom:6px;">SHIPPING TAG</div>
      <div style="font-size:20px;font-weight:800;margin-bottom:6px;">${order.customer_first_name} ${order.customer_last_name} — <span dir="ltr">${order.phone || ''}</span></div>
      <div style="font-size:16px;line-height:1.5;">
        <strong>${order.country || 'Türkiye'} — ${order.province} / ${order.district}</strong><br/>
        ${order.full_address}<br/>
        ${order.address_details ? `${order.address_details}<br/>` : ''}
        ${order.postal_code ? `Postal Code: ${order.postal_code}` : ''}
      </div>
      <div style="margin-top:8px;font-size:13px;color:#444;">Shipping: <b>${order.shipping_method}</b></div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align:center;">Size</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:end;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;">
      <div style="width:260px;border:1px solid #ddd;border-radius:8px;padding:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Subtotal:</span><b>${Number(order.subtotal).toFixed(2)} TL</b></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Discount:</span><b>-${Number(order.discount_amount).toFixed(2)} TL</b></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Shipping:</span><b>${Number(order.shipping_amount).toFixed(2)} TL</b></div>
        <div style="display:flex;justify-content:space-between;border-top:2px solid #171717;padding-top:8px;font-size:18px;"><span>Total:</span><b>${Number(order.total).toFixed(2)} TL</b></div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <button
          type="button"
          className="primary inline"
          onClick={downloadSlip}
          style={{
            background: '#171717',
            color: '#f3efe6',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          ⬇ Download T-Shirt & Shipping Tag
        </button>

        <select
          value={status}
          disabled={busy}
          onChange={(e) => quickStatus(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontWeight: 600,
            fontSize: '13px',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          <option value="new">جديد</option>
          <option value="confirmed">مؤكد</option>
          <option value="paid">مدفوع</option>
          <option value="shipped">تم الشحن</option>
          <option value="delivered">تم التسليم</option>
          <option value="cancelled">ملغي</option>
          <option value="returned">مرتجع</option>
        </select>

        <button
          type="button"
          className="danger"
          disabled={busy}
          onClick={() => setShowDeleteConfirm(true)}
          style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 700 }}
        >
          {busy ? '...' : 'Delete'}
        </button>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title={`Delete Order #${order.order_number}`}
        message="Are you sure you want to permanently delete this order? Stock will be restored automatically."
        confirmLabel="Delete Order"
        cancelLabel="Cancel"
        busy={busy}
        onConfirm={confirmDeleteOrder}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
