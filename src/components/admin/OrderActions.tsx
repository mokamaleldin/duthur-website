'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { imageUrl } from '@/lib/images';

const VOID_STATUSES = new Set(['cancelled', 'fake', 'returned']);

export function OrderActions({
  order,
  productsMap,
}: {
  order: any;
  productsMap?: Record<string, any>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [status, setStatus] = useState<string>(order.order_status);
  const [busy, setBusy] = useState(false);

  async function restoreStockIfNeeded(currentStatus: string) {
    if (VOID_STATUSES.has(currentStatus)) return;
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
    if (!VOID_STATUSES.has(currentStatus)) return;
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

  async function quickStatus(nextStatus: string) {
    if (status === nextStatus) return;
    setBusy(true);

    const wasVoid = VOID_STATUSES.has(status);
    const willBeVoid = VOID_STATUSES.has(nextStatus);

    if (!wasVoid && willBeVoid) {
      await restoreStockIfNeeded(status);
    } else if (wasVoid && !willBeVoid) {
      await deductStockIfNeeded(status);
    }

    const nextPayment =
      nextStatus === 'confirmed' || nextStatus === 'shipped' || nextStatus === 'delivered'
        ? 'paid'
        : nextStatus === 'returned'
        ? 'refunded'
        : order.payment_status;

    const { error } = await supabase
      .from('orders')
      .update({ order_status: nextStatus, payment_status: nextPayment })
      .eq('id', order.id);

    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    setStatus(nextStatus);
    router.refresh();
  }

  async function deleteOrder() {
    if (
      !confirm(
        `هل أنت متأكد من مسح الطلب #${order.order_number} نهائياً؟ سيتم استرجاع القطع للمخزون وإلغاء حسابه من الأرباح.`
      )
    )
      return;

    setBusy(true);
    await restoreStockIfNeeded(status);
    await supabase.from('order_items').delete().eq('order_id', order.id);
    const { error } = await supabase.from('orders').delete().eq('id', order.id);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
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
  <title>DUTHUR - Order #${order.order_number} Fulfillment Slip</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f5f5f3; color: #171717; padding: 30px; margin: 0; }
    .sheet { max-width: 820px; margin: 0 auto; background: #fff; border: 2px solid #171717; border-radius: 12px; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #171717; padding-bottom: 18px; margin-bottom: 24px; }
    .brand { font-size: 28px; font-weight: 900; letter-spacing: 0.12em; }
    .tag-box { border: 2px dashed #171717; padding: 16px; border-radius: 10px; background: #faf9f5; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .box { border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
    .box h3 { margin: 0 0 10px; font-size: 14px; color: #666; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #171717; color: #fff; padding: 10px 12px; text-align: right; font-size: 13px; }
    .actions { text-align: center; margin-bottom: 20px; }
    .btn { background: #171717; color: #fff; border: 0; padding: 10px 22px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
    @media print { .actions { display: none; } body { background: #fff; padding: 0; } .sheet { border: none; } }
  </style>
</head>
<body>
  <div class="actions">
    <button class="btn" onclick="window.print()">طباعة / حفظ كـ PDF (Print / Save PDF)</button>
  </div>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="brand">DUTHUR — دُثُر</div>
        <div style="color:#555;font-size:13px;margin-top:4px;">بوليصة تجهيز وشحن الطلب (Fulfillment & Shipping Tag)</div>
      </div>
      <div style="text-align:left;">
        <div style="font-size:24px;font-weight:800;">#${order.order_number}</div>
        <div style="font-size:13px;color:#666;">${new Date(order.created_at).toLocaleDateString()}</div>
      </div>
    </div>

    <div class="tag-box">
      <div style="font-size:12px;color:#666;font-weight:700;margin-bottom:6px;">ملصق الشحن السريع (SHIPPING LABEL / TAG)</div>
      <div style="font-size:20px;font-weight:800;margin-bottom:6px;">${order.customer_first_name} ${order.customer_last_name} — <span dir="ltr">${order.phone || ''}</span></div>
      <div style="font-size:16px;line-height:1.5;">
        <strong>${order.country || 'Türkiye'} — ${order.province} / ${order.district}</strong><br/>
        ${order.full_address}<br/>
        ${order.address_details ? `${order.address_details}<br/>` : ''}
        ${order.postal_code ? `Postal Code: ${order.postal_code}` : ''}
      </div>
      <div style="margin-top:8px;font-size:13px;color:#444;">طريقة الشحن: <b>${order.shipping_method}</b></div>
    </div>

    <table>
      <thead>
        <tr>
          <th>التيشيرت المطلوب (Item)</th>
          <th style="text-align:center;">المقاس (Size)</th>
          <th style="text-align:center;">الكمية (Qty)</th>
          <th style="text-align:end;">السعر</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;">
      <div style="width:260px;border:1px solid #ddd;border-radius:8px;padding:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>المجموع الفرعي:</span><b>${Number(order.subtotal).toFixed(2)} TL</b></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>الخصم:</span><b>-${Number(order.discount_amount).toFixed(2)} TL</b></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>الشحن:</span><b>${Number(order.shipping_amount).toFixed(2)} TL</b></div>
        <div style="display:flex;justify-content:space-between;border-top:2px solid #171717;padding-top:8px;font-size:18px;"><span>الإجمالي:</span><b>${Number(order.total).toFixed(2)} TL</b></div>
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
        ⬇ تحميل بوليصة التيشيرت والشحن والتاج
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
        <option value="new">الحالة: جديد (New)</option>
        <option value="confirmed">تأكيد الطلب (Confirmed / Paid)</option>
        <option value="shipped">تم الشحن (Shipped)</option>
        <option value="delivered">تم التسليم (Delivered)</option>
        <option value="cancelled">إلغاء الطلب (Cancelled — يرجع للمخزون)</option>
        <option value="fake">طلب وهمي / تجربة (Fake — يرجع للمخزون)</option>
        <option value="returned">مرتجع (Returned — يرجع للمخزون)</option>
      </select>

      <button
        type="button"
        className="danger"
        disabled={busy}
        onClick={deleteOrder}
        style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 700 }}
      >
        {busy ? 'جاري التنفيذ...' : 'مسح الطلب نهائياً ✕'}
      </button>
    </div>
  );
}
