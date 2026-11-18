'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

const VOID_STATUSES = new Set(['cancelled', 'fake', 'returned']);

export function OrdersListClient({ initialOrders }: { initialOrders: any[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function restoreStockIfNeeded(orderId: string, currentStatus: string) {
    if (VOID_STATUSES.has(currentStatus)) return; // Already restored
    const { data: items } = await supabase
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', orderId);

    if (items && items.length > 0) {
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
  }

  async function deductStockIfNeeded(orderId: string, currentStatus: string) {
    if (!VOID_STATUSES.has(currentStatus)) return; // Already deducted
    const { data: items } = await supabase
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', orderId);

    if (items && items.length > 0) {
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
  }

  async function handleStatusChange(order: any, nextStatus: string) {
    if (order.order_status === nextStatus) return;
    setBusyId(order.id);

    const wasVoid = VOID_STATUSES.has(order.order_status);
    const willBeVoid = VOID_STATUSES.has(nextStatus);

    if (!wasVoid && willBeVoid) {
      await restoreStockIfNeeded(order.id, order.order_status);
    } else if (wasVoid && !willBeVoid) {
      await deductStockIfNeeded(order.id, order.order_status);
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

    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { ...o, order_status: nextStatus, payment_status: nextPayment }
          : o
      )
    );
    router.refresh();
  }

  async function handleDelete(order: any) {
    if (
      !confirm(
        `هل تريد مسح الطلب #${order.order_number} نهائياً؟ (سيتم استرجاع القطع للمخزون تلقائياً وإلغاء حسابه من المبيعات)`
      )
    )
      return;

    setBusyId(order.id);
    await restoreStockIfNeeded(order.id, order.order_status);

    await supabase.from('order_items').delete().eq('order_id', order.id);
    const { error } = await supabase.from('orders').delete().eq('id', order.id);

    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }

    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    router.refresh();
  }

  return (
    <section className="admin-card">
      <div
        className="admin-table orders-head head"
        style={{
          gridTemplateColumns: '.6fr .9fr 1.4fr .8fr .8fr 1.2fr auto',
        }}
      >
        <span>Order</span>
        <span>Date</span>
        <span>Customer</span>
        <span>Total</span>
        <span>Payment</span>
        <span>Status (الحالة)</span>
        <span>مسح</span>
      </div>
      {orders.map((o) => {
        const isVoid = VOID_STATUSES.has(o.order_status);
        return (
          <div
            className="admin-table orders-head table-row"
            key={o.id}
            style={{
              gridTemplateColumns: '.6fr .9fr 1.4fr .8fr .8fr 1.2fr auto',
              opacity: isVoid ? 0.65 : 1,
            }}
          >
            <Link href={`/admin/orders/${o.id}`}>
              <strong>#{o.order_number}</strong>
            </Link>
            <Link href={`/admin/orders/${o.id}`}>
              <span>{new Date(o.created_at).toLocaleDateString()}</span>
            </Link>
            <Link href={`/admin/orders/${o.id}`}>
              <span>
                {o.customer_first_name} {o.customer_last_name}
              </span>
            </Link>
            <Link href={`/admin/orders/${o.id}`}>
              <span style={{ textDecoration: isVoid ? 'line-through' : 'none' }}>
                {Number(o.total).toFixed(2)} TL
              </span>
            </Link>
            <Link href={`/admin/orders/${o.id}`}>
              <span>{o.payment_status}</span>
            </Link>
            <div onClick={(e) => e.stopPropagation()}>
              <select
                value={o.order_status}
                disabled={busyId === o.id}
                onChange={(e) => handleStatusChange(o, e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid #d5d5d2',
                  background:
                    o.order_status === 'new'
                      ? '#fff0b8'
                      : o.order_status === 'confirmed'
                      ? '#dbe8ff'
                      : o.order_status === 'shipped'
                      ? '#dcd7ff'
                      : o.order_status === 'delivered'
                      ? '#d8f0dc'
                      : '#f4d8d8',
                  cursor: 'pointer',
                }}
              >
                <option value="new">New (جديد)</option>
                <option value="confirmed">Confirmed (مؤكد / مدفوع)</option>
                <option value="shipped">Shipped (تم الشحن)</option>
                <option value="delivered">Delivered (تم التسليم)</option>
                <option value="cancelled">Cancelled (ملغي - يرجع للمخزون)</option>
                <option value="fake">Fake / Test (وهمي / تجربة - يرجع للمخزون)</option>
                <option value="returned">Returned (مرتجع - يرجع للمخزون)</option>
              </select>
            </div>
            <div>
              <button
                type="button"
                className="danger"
                disabled={busyId === o.id}
                onClick={() => handleDelete(o)}
                style={{ padding: '6px 10px', fontSize: '12px' }}
              >
                {busyId === o.id ? '...' : 'مسح ✕'}
              </button>
            </div>
          </div>
        );
      })}
      {orders.length === 0 && (
        <p style={{ padding: '24px 16px', color: 'var(--color-muted, #888)' }}>
          No orders found.
        </p>
      )}
    </section>
  );
}
