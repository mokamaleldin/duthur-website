'use client';

import { useState } from 'react';
import { DEFAULT_FINANCE_LEDGER, DuthurFinanceLedger } from '@/lib/finance-seed';

const SIZES: Array<'S' | 'M' | 'L' | 'XL'> = ['S', 'M', 'L', 'XL'];

export function SkusClient({
  initialLedger = DEFAULT_FINANCE_LEDGER,
  initialProducts = [],
}: {
  initialLedger?: DuthurFinanceLedger;
  initialProducts?: any[];
}) {
  const [ledger] = useState<DuthurFinanceLedger>(initialLedger);
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [saving, setSaving] = useState(false);

  async function updateSizeStock(
    productId: string,
    size: 'S' | 'M' | 'L' | 'XL',
    newStock: number
  ) {
    const cleanStock = Math.max(0, Number(newStock || 0));

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          product_variants: (p.product_variants || []).map((v: any) =>
            v.option_values?.Size === size
              ? { ...v, stock_quantity: cleanStock }
              : v
          ),
        };
      })
    );

    setSaving(true);
    await fetch('/api/admin/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ledger,
        syncStockToStore: true,
        skuStocks: [{ product_id: productId, size, stock: cleanStock }],
      }),
    });
    setSaving(false);
  }

  const rows = ledger.designs.map((d) => {
    const prod = products.find((p) => p.id === d.product_id);
    const variants = prod?.product_variants || [];

    const bySize: Record<'S' | 'M' | 'L' | 'XL', { mfg: number; onHand: number; sold: number }> = {
      S: { mfg: d.initial_stock.S, onHand: d.initial_stock.S, sold: 0 },
      M: { mfg: d.initial_stock.M, onHand: d.initial_stock.M, sold: 0 },
      L: { mfg: d.initial_stock.L, onHand: d.initial_stock.L, sold: 0 },
      XL: { mfg: d.initial_stock.XL, onHand: d.initial_stock.XL, sold: 0 },
    };

    for (const sz of SIZES) {
      const mfg = Number(d.initial_stock[sz] || 0);
      const foundVar = variants.find((v: any) => v.option_values?.Size === sz);
      const onHand = foundVar ? Number(foundVar.stock_quantity || 0) : mfg;
      const sold = Math.max(0, mfg - onHand);
      bySize[sz] = { mfg, onHand, sold };
    }

    const totalMfg = bySize.S.mfg + bySize.M.mfg + bySize.L.mfg + bySize.XL.mfg;
    const totalRemaining =
      bySize.S.onHand + bySize.M.onHand + bySize.L.onHand + bySize.XL.onHand;

    return {
      ...d,
      price: prod?.base_price ?? d.sale_price_try,
      bySize,
      totalMfg,
      totalRemaining,
    };
  });

  const grandMfg = rows.reduce((a, r) => a + r.totalMfg, 0);
  const grandRemaining = rows.reduce((a, r) => a + r.totalRemaining, 0);

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

      <section className="admin-card">
        <div
          className="admin-table head"
          style={{ gridTemplateColumns: '1.6fr .8fr 1fr 1fr 1fr 1fr .8fr .8fr' }}
        >
          <span>Design</span>
          <span>Price</span>
          {SIZES.map((sz) => (
            <span key={sz} style={{ textAlign: 'center' }}>
              {sz}
            </span>
          ))}
          <span style={{ textAlign: 'center' }}>Initial</span>
          <span style={{ textAlign: 'center' }}>Remaining</span>
        </div>

        {rows.map((r) => (
          <div
            className="admin-table table-row"
            key={r.design_key}
            style={{ gridTemplateColumns: '1.6fr .8fr 1fr 1fr 1fr 1fr .8fr .8fr' }}
          >
            <strong style={{ fontSize: '15px' }}>{r.name_ar}</strong>
            <span style={{ fontWeight: 600 }}>{Number(r.price).toFixed(0)} TL</span>
            {SIZES.map((sz) => {
              const cell = r.bySize[sz];
              return (
                <div key={sz} style={{ textAlign: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    value={cell.onHand}
                    onChange={(e) =>
                      updateSizeStock(r.product_id, sz, Number(e.target.value))
                    }
                    style={{
                      width: '64px',
                      padding: '6px',
                      textAlign: 'center',
                      fontSize: '15px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      border: '1px solid #d5d5d2',
                      background: '#fff',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                    أصل {cell.mfg} | بيع {cell.sold}
                  </div>
                </div>
              );
            })}
            <span style={{ textAlign: 'center', fontWeight: 600 }}>{r.totalMfg}</span>
            <strong
              style={{
                textAlign: 'center',
                fontSize: '16px',
                color: '#2b8a3e',
              }}
            >
              {r.totalRemaining}
            </strong>
          </div>
        ))}

        <div
          className="admin-table"
          style={{
            gridTemplateColumns: '1.6fr .8fr 1fr 1fr 1fr 1fr .8fr .8fr',
            borderTop: '2px solid #e5e5e2',
            paddingTop: '14px',
            marginTop: '6px',
            fontWeight: 700,
          }}
        >
          <span>Total</span>
          <span></span>
          {SIZES.map((sz) => {
            const sumSz = rows.reduce((a, r) => a + r.bySize[sz].onHand, 0);
            return (
              <span key={sz} style={{ textAlign: 'center', fontSize: '15px' }}>
                {sumSz}
              </span>
            );
          })}
          <span style={{ textAlign: 'center' }}>{grandMfg}</span>
          <span style={{ textAlign: 'center', fontSize: '16px', color: '#2b8a3e' }}>
            {grandRemaining}
          </span>
        </div>
      </section>
    </>
  );
}
