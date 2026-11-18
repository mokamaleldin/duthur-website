'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_FINANCE_LEDGER, DuthurFinanceLedger } from '@/lib/finance-seed';

const SIZES: Array<'S' | 'M' | 'L' | 'XL'> = ['S', 'M', 'L', 'XL'];

export function SkusClient() {
  const [ledger, setLedger] = useState<DuthurFinanceLedger>(DEFAULT_FINANCE_LEDGER);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/finance')
      .then((r) => r.json())
      .then((res) => {
        if (res.ledger) setLedger(res.ledger);
        if (res.products) setProducts(res.products);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function updateSizeStock(
    productId: string,
    size: 'S' | 'M' | 'L' | 'XL',
    newStock: number
  ) {
    const cleanStock = Math.max(0, Number(newStock || 0));

    // Update local state immediately
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

  if (loading) {
    return (
      <div className="admin-card" dir="rtl" style={{ padding: '32px', textAlign: 'center' }}>
        جاري التحميل...
      </div>
    );
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
    <div dir="rtl" style={{ fontFamily: 'var(--font-body), sans-serif', color: '#171717' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '22px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 700 }}>
          المخزون (SKUs)
        </h1>
        {saving && (
          <span style={{ fontSize: '13px', color: '#6E705B', fontWeight: 600 }}>
            جاري المزامنة مع المتجر...
          </span>
        )}
      </div>

      <section className="admin-card">
        <div className="table-wrap" style={{ marginTop: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f3', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px' }}>التيشيرت</th>
                <th style={{ padding: '12px' }}>السعر الفعلي</th>
                {SIZES.map((sz) => (
                  <th key={sz} style={{ padding: '12px', textAlign: 'center' }}>
                    {sz}
                  </th>
                ))}
                <th style={{ padding: '12px', textAlign: 'center' }}>المصنّع</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>المتبقي بالمقاسات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.design_key} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '14px 12px' }}>
                    <strong style={{ fontSize: '16px' }}>{r.name_ar}</strong>
                  </td>
                  <td style={{ padding: '14px 12px', fontWeight: 700 }}>
                    {Number(r.price).toFixed(0)}₺
                  </td>
                  {SIZES.map((sz) => {
                    const cell = r.bySize[sz];
                    return (
                      <td key={sz} style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          value={cell.onHand}
                          onChange={(e) =>
                            updateSizeStock(r.product_id, sz, Number(e.target.value))
                          }
                          style={{
                            width: '68px',
                            padding: '6px',
                            textAlign: 'center',
                            fontSize: '17px',
                            fontWeight: 800,
                            borderRadius: '8px',
                            border: '1px solid #d5d5d2',
                            background: '#fff',
                          }}
                        />
                        <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>
                          أصل {cell.mfg} | بيع {cell.sold}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 700 }}>
                    {r.totalMfg}
                  </td>
                  <td
                    style={{
                      padding: '14px 12px',
                      textAlign: 'center',
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#2b8a3e',
                    }}
                  >
                    {r.totalRemaining}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#faf9f5', fontWeight: 800, borderTop: '2px solid #171717' }}>
                <td style={{ padding: '12px' }} colSpan={2}>
                  الإجمالي
                </td>
                {SIZES.map((sz) => {
                  const sumSz = rows.reduce((a, r) => a + r.bySize[sz].onHand, 0);
                  return (
                    <td key={sz} style={{ padding: '12px', textAlign: 'center', fontSize: '16px' }}>
                      {sumSz}
                    </td>
                  );
                })}
                <td style={{ padding: '12px', textAlign: 'center' }}>{grandMfg}</td>
                <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px', color: '#2b8a3e' }}>
                  {grandRemaining}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
