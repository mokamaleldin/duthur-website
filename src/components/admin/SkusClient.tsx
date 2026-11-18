'use client';

import { useMemo, useState } from 'react';
import { DEFAULT_FINANCE_LEDGER, DuthurFinanceLedger, InventoryMovement } from '@/lib/finance-seed';

const SIZES: Array<'S' | 'M' | 'L' | 'XL'> = ['S', 'M', 'L', 'XL'];

export function SkusClient({
  initialLedger = DEFAULT_FINANCE_LEDGER,
  initialProducts = [],
}: {
  initialLedger?: DuthurFinanceLedger;
  initialProducts?: any[];
}) {
  const [ledger, setLedger] = useState<DuthurFinanceLedger>(initialLedger);
  const [products] = useState<any[]>(initialProducts);
  const [saving, setSaving] = useState(false);
  const [skuSelections, setSkuSelections] = useState<Record<string, string>>({});

  async function persistLedgerAndSync(nextLedger: DuthurFinanceLedger) {
    setLedger(nextLedger);
    setSaving(true);

    // Compute exact per-SKU stock from initial_stock + movements
    const skuStocks: Array<{ product_id: string; size: string; stock: number }> = [];
    for (const d of nextLedger.designs) {
      for (const sz of SIZES) {
        const skuKey = `${d.design_key}:${sz}`;
        const delta = (nextLedger.movements || [])
          .filter((m) => !m.archived && m.sku === skuKey)
          .reduce((a, m) => a + Number(m.signed_delta || 0), 0);
        const onHand = Number(d.initial_stock[sz] || 0) + delta;
        skuStocks.push({
          product_id: d.product_id,
          size: sz,
          stock: Math.max(0, onHand),
        });
      }
    }

    await fetch('/api/admin/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ledger: nextLedger,
        syncStockToStore: true,
        skuStocks,
      }),
    });
    setSaving(false);
  }

  function handleAssignMovementSku(mov: InventoryMovement) {
    const chosenSku = skuSelections[mov.id];
    if (!chosenSku) return;

    const [designKey, size] = chosenSku.split(':') as [
      'bila_aqarib' | 'min_huna' | 'walilhurriya',
      'S' | 'M' | 'L' | 'XL'
    ];
    const design = ledger.designs.find((d) => d.design_key === designKey);

    // If movement had qty > 1 (e.g. 3 personal use), allocate 1 unit at a time or all if qty === 1
    let nextMovements: InventoryMovement[];
    if (mov.qty > 1) {
      nextMovements = ledger.movements.flatMap((m) => {
        if (m.id !== mov.id) return [m];
        const remainingQty = m.qty - 1;
        return [
          {
            ...m,
            qty: remainingQty,
            signed_delta: -remainingQty,
          },
          {
            id: `${m.id}-alloc-${Date.now()}`,
            sku: chosenSku,
            design_key: designKey,
            size,
            type: m.type,
            qty: 1,
            signed_delta: -1,
            date: m.date,
            source: m.source,
            note: `${m.note || ''} → [${design?.name_ar} ${size}]`,
          },
        ];
      });
    } else {
      nextMovements = ledger.movements.map((m) =>
        m.id === mov.id
          ? {
              ...m,
              sku: chosenSku,
              design_key: designKey,
              size,
              note: `${m.note || ''} → [${design?.name_ar} ${size}]`,
            }
          : m
      );
    }

    const nextTransactions = ledger.transactions.map((t) =>
      t.id === mov.financial_transaction_id
        ? {
            ...t,
            variant_sku: chosenSku,
            title: `${t.title.split(' — (')[0]} — ${design?.name_ar} (${size})`,
          }
        : t
    );

    persistLedgerAndSync({
      ...ledger,
      movements: nextMovements,
      transactions: nextTransactions,
    });
  }

  const invData = useMemo(() => {
    const activeMovs = (ledger.movements || []).filter((m) => !m.archived);

    const rows = ledger.designs.map((d) => {
      const prod = products.find((p) => p.id === d.product_id);
      const bySize: Record<'S' | 'M' | 'L' | 'XL', { mfg: number; onHand: number; sold: number }> = {
        S: { mfg: d.initial_stock.S, onHand: d.initial_stock.S, sold: 0 },
        M: { mfg: d.initial_stock.M, onHand: d.initial_stock.M, sold: 0 },
        L: { mfg: d.initial_stock.L, onHand: d.initial_stock.L, sold: 0 },
        XL: { mfg: d.initial_stock.XL, onHand: d.initial_stock.XL, sold: 0 },
      };

      for (const sz of SIZES) {
        const mfg = Number(d.initial_stock[sz] || 0);
        const skuKey = `${d.design_key}:${sz}`;
        const skuMovs = activeMovs.filter((m) => m.sku === skuKey);
        const delta = skuMovs.reduce((a, m) => a + Number(m.signed_delta || 0), 0);
        const sold = skuMovs
          .filter((m) => m.type === 'sale')
          .reduce((a, m) => a + Math.abs(Number(m.signed_delta || 0)), 0);

        bySize[sz] = {
          mfg,
          onHand: mfg + delta,
          sold,
        };
      }

      // Count design-known but size-pending movements
      const designPendingOut = activeMovs
        .filter((m) => !m.sku && m.design_key === d.design_key)
        .reduce((a, m) => a + Math.abs(Number(m.signed_delta || 0)), 0);

      const totalMfg = bySize.S.mfg + bySize.M.mfg + bySize.L.mfg + bySize.XL.mfg;
      const classifiedRemaining =
        bySize.S.onHand + bySize.M.onHand + bySize.L.onHand + bySize.XL.onHand;

      return {
        ...d,
        price: prod?.base_price ?? d.sale_price_try,
        bySize,
        totalMfg,
        classifiedRemaining,
        designPendingOut,
        actualDesignRemaining: classifiedRemaining - designPendingOut,
      };
    });

    const totalManufactured = rows.reduce((a, r) => a + r.totalMfg, 0);
    const totalSold = activeMovs
      .filter((m) => m.type === 'sale')
      .reduce((a, m) => a + Math.abs(Number(m.signed_delta || 0)), 0);
    const totalPersonalUse = activeMovs
      .filter((m) => m.type === 'personal_use')
      .reduce((a, m) => a + Math.abs(Number(m.signed_delta || 0)), 0);
    const totalGifts = activeMovs
      .filter((m) => m.type === 'gift')
      .reduce((a, m) => a + Math.abs(Number(m.signed_delta || 0)), 0);
    const totalReturns = activeMovs
      .filter((m) => m.type === 'return')
      .reduce((a, m) => a + Math.abs(Number(m.signed_delta || 0)), 0);

    const unallocatedMovs = activeMovs.filter((m) => !m.sku);
    const unallocatedCount = unallocatedMovs.reduce(
      (a, m) => a + Math.abs(Number(m.signed_delta || 0)),
      0
    );

    const netDelta = activeMovs.reduce((a, m) => a + Number(m.signed_delta || 0), 0);
    const currentAvailableStock = totalManufactured + netDelta;
    const classifiedSkuSum = rows.reduce((a, r) => a + r.classifiedRemaining, 0);

    return {
      rows,
      totalManufactured,
      totalSold,
      totalPersonalUse,
      totalGifts,
      totalReturns,
      unallocatedMovs,
      unallocatedCount,
      currentAvailableStock,
      classifiedSkuSum,
    };
  }, [ledger.designs, ledger.movements, products]);

  return (
    <>
      <div className="admin-title">
        <div>
          <p>Inventory</p>
          <h1>SKUs</h1>
        </div>
        {saving && (
          <span style={{ fontSize: '13px', color: '#6E705B', fontWeight: 600 }}>
            Syncing...
          </span>
        )}
      </div>

      {/* INVENTORY SUMMARY KPIs */}
      <div
        className="stat-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))' }}
      >
        <div>
          <span>Total Manufactured</span>
          <strong>{invData.totalManufactured}</strong>
        </div>
        <div>
          <span>Total Sold</span>
          <strong style={{ color: '#2b8a3e' }}>{invData.totalSold}</strong>
          <small style={{ color: '#777', fontSize: '12px' }}>13 Shopify + 2 Manual</small>
        </div>
        <div>
          <span>Personal Use & Gifts</span>
          <strong>{invData.totalPersonalUse + invData.totalGifts}</strong>
          <small style={{ color: '#777', fontSize: '12px' }}>
            {invData.totalPersonalUse} Personal + {invData.totalGifts} Gift
          </small>
        </div>
        <div>
          <span>Unallocated Out</span>
          <strong style={{ color: '#92400e' }}>{invData.unallocatedCount}</strong>
          <small style={{ color: '#777', fontSize: '12px' }}>Pending SKU</small>
        </div>
        <div style={{ background: '#171717', color: '#F3EFE6' }}>
          <span style={{ color: '#C8C1B5' }}>Available Stock</span>
          <strong style={{ color: '#B69C7A' }}>{invData.currentAvailableStock}</strong>
          <small style={{ color: '#C8C1B5', fontSize: '12px' }}>
            Provisional (252 - 19)
          </small>
        </div>
      </div>

      {/* SKU MATRIX TABLE */}
      <section className="admin-card">
        <div
          className="admin-table head"
          style={{ gridTemplateColumns: '1.6fr .8fr 1fr 1fr 1fr 1fr .8fr 1fr' }}
        >
          <span>Design</span>
          <span>Price</span>
          {SIZES.map((sz) => (
            <span key={sz} style={{ textAlign: 'center' }}>
              {sz}
            </span>
          ))}
          <span style={{ textAlign: 'center' }}>Initial</span>
          <span style={{ textAlign: 'center' }}>By Sizes</span>
        </div>

        {invData.rows.map((r) => (
          <div
            className="admin-table table-row"
            key={r.design_key}
            style={{ gridTemplateColumns: '1.6fr .8fr 1fr 1fr 1fr 1fr .8fr 1fr' }}
          >
            <div>
              <strong style={{ fontSize: '15px', display: 'block' }}>{r.name_ar}</strong>
              {r.designPendingOut > 0 && (
                <small style={{ color: '#92400e', fontSize: '11px' }}>
                  -{r.designPendingOut} مبيعة بانتظار تحديد المقاس (الفعلي: {r.actualDesignRemaining})
                </small>
              )}
            </div>
            <span style={{ fontWeight: 600 }}>{Number(r.price).toFixed(0)}₺</span>
            {SIZES.map((sz) => {
              const cell = r.bySize[sz];
              return (
                <div key={sz} style={{ textAlign: 'center' }}>
                  <strong style={{ fontSize: '18px', display: 'block' }}>
                    {cell.onHand}
                  </strong>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    أصل {cell.mfg} | بيع {cell.sold}
                  </div>
                </div>
              );
            })}
            <span style={{ textAlign: 'center', fontWeight: 600 }}>{r.totalMfg}</span>
            <div style={{ textAlign: 'center' }}>
              <strong style={{ fontSize: '16px', color: '#2b8a3e' }}>
                {r.classifiedRemaining}
              </strong>
            </div>
          </div>
        ))}

        <div
          className="admin-table"
          style={{
            gridTemplateColumns: '1.6fr .8fr 1fr 1fr 1fr 1fr .8fr 1fr',
            borderTop: '2px solid #e5e5e2',
            paddingTop: '14px',
            marginTop: '6px',
            fontWeight: 700,
          }}
        >
          <span>Total Classified</span>
          <span></span>
          {SIZES.map((sz) => {
            const sumSz = invData.rows.reduce((a, r) => a + r.bySize[sz].onHand, 0);
            return (
              <span key={sz} style={{ textAlign: 'center', fontSize: '15px' }}>
                {sumSz}
              </span>
            );
          })}
          <span style={{ textAlign: 'center' }}>{invData.totalManufactured}</span>
          <span style={{ textAlign: 'center', fontSize: '15px' }}>
            {invData.classifiedSkuSum} (Actual:{' '}
            <b style={{ color: '#b94c4c' }}>{invData.currentAvailableStock}</b>)
          </span>
        </div>
      </section>

      {/* PENDING SKU REVIEW / UNALLOCATED STOCK OUT */}
      {invData.unallocatedMovs.length > 0 && (
        <section className="admin-card">
          <h2 style={{ margin: '0 0 6px' }}>
            Pending SKU Review — Unallocated Stock Out ({invData.unallocatedCount} units)
          </h2>
          <p className="muted" style={{ margin: '0 0 14px' }}>
            These {invData.unallocatedCount} outgoing units are already deducted from the global stock ({invData.currentAvailableStock} remaining), but wait for exact Design & Size confirmation before deducting from a specific size column above.
          </p>

          {invData.unallocatedMovs.map((m) => (
            <div
              key={m.id}
              className="admin-table table-row"
              style={{ gridTemplateColumns: '2fr .8fr 1.4fr auto' }}
            >
              <div>
                <strong>{m.note}</strong>
                <small style={{ display: 'block', color: '#777' }}>
                  Date: {m.date || 'Pending'} | Qty: {m.qty}
                </small>
              </div>
              <div>
                <span
                  className={`status ${
                    m.type === 'sale'
                      ? 'confirmed'
                      : m.type === 'personal_use'
                      ? 'shipped'
                      : 'new'
                  }`}
                >
                  {m.type === 'sale'
                    ? 'Sale'
                    : m.type === 'personal_use'
                    ? 'Personal Use'
                    : 'Gift'}
                </span>
              </div>
              <div>
                <select
                  value={skuSelections[m.id] || ''}
                  onChange={(e) =>
                    setSkuSelections((prev) => ({
                      ...prev,
                      [m.id]: e.target.value,
                    }))
                  }
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="">-- Select Design & Size --</option>
                  {ledger.designs
                    .filter((d) => !m.design_key || d.design_key === m.design_key)
                    .map((d) =>
                      SIZES.map((sz) => (
                        <option
                          key={`${d.design_key}:${sz}`}
                          value={`${d.design_key}:${sz}`}
                        >
                          {d.name_ar} — {sz}
                        </option>
                      ))
                    )}
                </select>
              </div>
              <div>
                <button
                  type="button"
                  className="primary inline"
                  disabled={!skuSelections[m.id] || saving}
                  onClick={() => handleAssignMovementSku(m)}
                  style={{ padding: '8px 14px', fontSize: '12px' }}
                >
                  Assign SKU
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
