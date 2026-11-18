'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { ConfirmModal } from './ConfirmModal';

const VOID_STATUSES = new Set(['cancelled', 'returned']);

export function OrdersListClient({ initialOrders }: { initialOrders: any[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  async function restoreStockIfNeeded(orderId: string, currentStatus: string) {
    if (VOID_STATUSES.has(currentStatus)) return;
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
    if (!VOID_STATUSES.has(currentStatus)) return;
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

  function getDisplaySelectValue(o: any): string {
    if (o.order_status === 'confirmed' && o.payment_status === 'paid') return 'paid';
    return o.order_status;
  }

  async function handleStatusChange(order: any, selectedValue: string) {
    setBusyId(order.id);

    const dbOrderStatus = selectedValue === 'paid' ? 'confirmed' : selectedValue;
    const dbPaymentStatus =
      selectedValue === 'paid' || selectedValue === 'shipped' || selectedValue === 'delivered'
        ? 'paid'
        : selectedValue === 'returned'
        ? 'refunded'
        : 'pending';

    const wasVoid = VOID_STATUSES.has(order.order_status);
    const willBeVoid = VOID_STATUSES.has(dbOrderStatus);

    if (!wasVoid && willBeVoid) {
      await restoreStockIfNeeded(order.id, order.order_status);
    } else if (wasVoid && !willBeVoid) {
      await deductStockIfNeeded(order.id, order.order_status);
    }

    const { error } = await supabase
      .from('orders')
      .update({ order_status: dbOrderStatus, payment_status: dbPaymentStatus })
      .eq('id', order.id);

    setBusyId(null);
    if (error) return;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { ...o, order_status: dbOrderStatus, payment_status: dbPaymentStatus }
          : o
      )
    );
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const order = deleteTarget;
    setBusyId(order.id);
    await restoreStockIfNeeded(order.id, order.order_status);

    const res = await fetch('/api/admin/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_order', orderId: order.id }),
    });

    setBusyId(null);
    setDeleteTarget(null);
    if (!res.ok) return;

    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    router.refresh();
  }

  return (
    <>
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
          <span>Status</span>
          <span>Delete</span>
        </div>
        {orders.map((o) => {
          const isVoid = VOID_STATUSES.has(o.order_status);
          const selectVal = getDisplaySelectValue(o);

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
                  value={selectVal}
                  disabled={busyId === o.id}
                  onChange={(e) => handleStatusChange(o, e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid #d5d5d2',
                    background:
                      selectVal === 'new'
                        ? '#fff0b8'
                        : selectVal === 'confirmed' || selectVal === 'paid'
                        ? '#dbe8ff'
                        : selectVal === 'shipped'
                        ? '#dcd7ff'
                        : selectVal === 'delivered'
                        ? '#d8f0dc'
                        : '#f4d8d8',
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
              </div>
              <div>
                <button
                  type="button"
                  className="danger"
                  disabled={busyId === o.id}
                  onClick={() => setDeleteTarget(o)}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  {busyId === o.id ? '...' : 'Delete'}
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

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={`Delete Order #${deleteTarget?.order_number || ''}`}
        message="Are you sure you want to delete this order? Items will be returned to stock and excluded from revenue."
        confirmLabel="Delete Order"
        cancelLabel="Cancel"
        busy={Boolean(busyId)}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
