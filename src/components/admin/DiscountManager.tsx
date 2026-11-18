'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import { ConfirmModal } from './ConfirmModal';

export function DiscountManager({
  discounts: initialDiscounts,
  products = [],
  initialProductMap = {},
}: {
  discounts: any[];
  products?: any[];
  initialProductMap?: Record<string, string[]>;
}) {
  const s = useMemo(() => createClient(), []);
  const r = useRouter();
  const [discounts, setDiscounts] = useState(initialDiscounts);
  const [productMap, setProductMap] = useState<Record<string, string[]>>(initialProductMap);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [allProductsSelected, setAllProductsSelected] = useState(true);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  function toggleProductSelection(id: string) {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg('');

    const f = new FormData(e.currentTarget);
    const code = String(f.get('code') || '').trim().toUpperCase();
    const type = String(f.get('type') || 'percentage');
    const value = Number(f.get('value') || 0);
    const minimum = f.get('minimum') ? Number(f.get('minimum')) : null;

    const { data: inserted, error } = await s
      .from('discount_codes')
      .insert({
        code,
        type,
        value,
        minimum_order_amount: minimum,
        active: true,
      })
      .select('*')
      .single();

    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }

    const chosenIds = allProductsSelected ? [] : selectedProducts;
    await fetch('/api/admin/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_discount_products',
        code,
        productIds: chosenIds,
      }),
    });

    setProductMap((prev) => ({ ...prev, [code]: chosenIds }));
    if (inserted) {
      setDiscounts((prev) => [inserted, ...prev]);
    }
    setBusy(false);
    setShowAddModal(false);
    setSelectedProducts([]);
    setAllProductsSelected(true);
    r.refresh();
  }

  async function toggle(id: string, active: boolean) {
    await s.from('discount_codes').update({ active: !active }).eq('id', id);
    setDiscounts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, active: !active } : d))
    );
    r.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    await fetch('/api/admin/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_discount',
        discountId: deleteTarget.id,
      }),
    });

    setDiscounts((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
    r.refresh();
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <p>Sales</p>
          <h1>Discounts</h1>
        </div>
        <button
          type="button"
          className="primary inline"
          onClick={() => {
            setMsg('');
            setShowAddModal(true);
          }}
        >
          + Add discount
        </button>
      </div>

      <section className="admin-card">
        <div
          className="admin-table head"
          style={{ gridTemplateColumns: '1fr 1fr 1.5fr .8fr auto' }}
        >
          <span>Code</span>
          <span>Discount</span>
          <span>Products</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {discounts.map((d) => {
          const assignedIds = productMap[d.code] || [];
          const assignedNames =
            assignedIds.length === 0
              ? 'All Products'
              : assignedIds
                  .map((pid) => {
                    const p = products.find((x) => x.id === pid);
                    return p?.title_ar || p?.title_en || 'Product';
                  })
                  .join(' , ');

          return (
            <div
              className="admin-table table-row"
              key={d.id}
              style={{ gridTemplateColumns: '1fr 1fr 1.5fr .8fr auto' }}
            >
              <strong>{d.code}</strong>
              <span>
                {d.type === 'percentage' ? `${d.value}%` : `${d.value} TL`}
                {d.minimum_order_amount
                  ? ` (Min: ${d.minimum_order_amount} TL)`
                  : ''}
              </span>
              <span style={{ fontSize: '13px', color: '#555' }}>
                {assignedNames}
              </span>
              <td>
                <span className={`status ${d.active ? 'delivered' : 'cancelled'}`}>
                  {d.active ? 'Active' : 'Disabled'}
                </span>
              </td>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => toggle(d.id, d.active)}
                  style={{
                    border: '1px solid #ddd',
                    background: '#fff',
                    borderRadius: '7px',
                    padding: '6px 12px',
                    fontSize: '12px',
                  }}
                >
                  {d.active ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => setDeleteTarget(d)}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {discounts.length === 0 && (
          <p style={{ padding: '20px 12px', color: '#888', margin: 0 }}>
            No discount codes yet.
          </p>
        )}
      </section>

      {/* POPUP: ADD DISCOUNT */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 15, 15, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1500,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              color: '#171717',
              borderRadius: '16px',
              width: 'min(480px, 100%)',
              padding: '26px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#888',
                    fontWeight: 700,
                  }}
                >
                  DUTHUR
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '20px' }}>
                  Add Discount Code
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  border: 0,
                  background: 'none',
                  fontSize: '18px',
                  color: '#666',
                }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={add}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                Discount Code *
                <input
                  required
                  name="code"
                  placeholder="e.g. DUTHUR10"
                  style={{
                    padding: '11px',
                    borderRadius: '8px',
                    border: '1px solid #d5d5d2',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                  Type *
                  <select
                    name="type"
                    style={{
                      padding: '11px',
                      borderRadius: '8px',
                      border: '1px solid #d5d5d2',
                    }}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (TL)</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                  Value *
                  <input
                    required
                    type="number"
                    step="0.01"
                    name="value"
                    placeholder="10"
                    style={{
                      padding: '11px',
                      borderRadius: '8px',
                      border: '1px solid #d5d5d2',
                    }}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                Minimum Order Amount (Optional TL)
                <input
                  type="number"
                  step="0.01"
                  name="minimum"
                  placeholder="Optional"
                  style={{
                    padding: '11px',
                    borderRadius: '8px',
                    border: '1px solid #d5d5d2',
                  }}
                />
              </label>

              <div
                style={{
                  border: '1px solid #e5e5e2',
                  borderRadius: '10px',
                  padding: '12px',
                  background: '#faf9f5',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '8px',
                  }}
                >
                  Applies to Products
                </span>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={allProductsSelected}
                    onChange={(e) => setAllProductsSelected(e.target.checked)}
                  />
                  <strong>All Products (كل التيشيرتات)</strong>
                </label>

                {!allProductsSelected && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      paddingTop: '6px',
                      borderTop: '1px solid #e5e5e2',
                    }}
                  >
                    {products.map((p) => (
                      <label
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(p.id)}
                          onChange={() => toggleProductSelection(p.id)}
                        />
                        <span>{p.title_ar || p.title_en}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {msg && <p className="form-error">{msg}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '9px',
                    border: '1px solid #ccc',
                    background: '#fff',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={busy}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '9px',
                    background: '#171717',
                    color: '#fff',
                  }}
                >
                  {busy ? 'Saving…' : 'Save Discount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={`Delete Code "${deleteTarget?.code || ''}"`}
        message="Are you sure you want to delete this discount code?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
