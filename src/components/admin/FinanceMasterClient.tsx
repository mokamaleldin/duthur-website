'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CurrencyCode,
  DEFAULT_FINANCE_LEDGER,
  DuthurFinanceLedger,
  FinancialTransaction,
  SupplierEntry,
} from '@/lib/finance-seed';

const CATEGORIES = [
  'تشغيل وتطوير',
  'تسويق',
  'توظيف ومستقلين',
  'أجر شريك',
  'رسوم تجهيز',
  'اشتراك شهري',
  'تطوير خاص',
  'آخر',
];

const VOID_ORDER_STATUSES = new Set(['cancelled', 'fake', 'returned']);

function fmtTry(val: number) {
  return `${Math.round(Number(val || 0)).toLocaleString('en-US')}₺`;
}

function fmtUsd(val: number) {
  return `$${Number(val || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function FinanceMasterClient() {
  const [ledger, setLedger] = useState<DuthurFinanceLedger>(DEFAULT_FINANCE_LEDGER);
  const [storeOrders, setStoreOrders] = useState<any[]>([]);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Popups (Modals)
  const [showTxModal, setShowTxModal] = useState(false);
  const [showSupModal, setShowSupModal] = useState(false);

  useEffect(() => {
    fetch('/api/admin/finance')
      .then((r) => r.json())
      .then((res) => {
        if (res.ledger) setLedger(res.ledger);
        if (res.orders) setStoreOrders(res.orders);
        if (res.products) setStoreProducts(res.products);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function persistLedger(nextLedger: DuthurFinanceLedger) {
    setLedger(nextLedger);
    try {
      await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ledger: nextLedger }),
      });
    } catch {
      // ignore error
    }
  }

  const rate = Number(ledger.fx_rate_usd_try || 50.35);

  const stats = useMemo(() => {
    const activeTx = ledger.transactions.filter((t) => t.status !== 'void');
    const expenses = activeTx.filter((t) => t.type === 'expense');
    const incomes = activeTx.filter((t) => t.type === 'income');

    const totalExpensesTry = expenses.reduce(
      (a, e) =>
        a +
        (e.currency_original === 'USD'
          ? Number(e.amount_original || 0) * rate
          : Number(e.amount_original || 0)),
      0
    );
    const totalExpensesUsd = rate > 0 ? totalExpensesTry / rate : 0;

    // Confirmed receipts from ledger
    const ledgerIncomesTry = incomes
      .filter((i) => i.status !== 'no_charge' && i.status !== 'estimated_amount')
      .reduce(
        (a, i) =>
          a +
          (i.currency_original === 'USD'
            ? Number(i.amount_original || 0) * rate
            : Number(i.amount_original || 0)),
        0
      );

    // Valid paid/confirmed website orders
    const validOrders = storeOrders.filter(
      (o) => !VOID_ORDER_STATUSES.has(o.order_status) && o.admin_note !== '__DELETED__'
    );
    const websiteSalesTry = validOrders
      .filter(
        (o) =>
          o.payment_status === 'paid' ||
          o.order_status === 'confirmed' ||
          o.order_status === 'shipped' ||
          o.order_status === 'delivered'
      )
      .reduce((a, o) => a + Number(o.total || 0), 0);

    const totalSalesTry = ledgerIncomesTry + websiteSalesTry;
    const totalSalesUsd = rate > 0 ? totalSalesTry / rate : 0;

    const remainingCapitalTry = Math.max(0, totalExpensesTry - totalSalesTry);
    const remainingCapitalUsd = rate > 0 ? remainingCapitalTry / rate : 0;

    // Remaining stock from live products (or fallback to ledger 237)
    let remainingStock = 237;
    if (storeProducts.length > 0) {
      const sumVariants = storeProducts.reduce(
        (acc, p) =>
          acc +
          (p.product_variants || []).reduce(
            (s: number, v: any) => s + Number(v.stock_quantity || 0),
            0
          ),
        0
      );
      if (sumVariants > 0) remainingStock = sumVariants;
    }

    return {
      totalExpensesTry,
      totalExpensesUsd,
      totalSalesTry,
      totalSalesUsd,
      remainingCapitalTry,
      remainingCapitalUsd,
      remainingStock,
    };
  }, [ledger.transactions, rate, storeOrders, storeProducts]);

  function handleAddTransaction(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get('title') || '').trim();
    const type = String(f.get('type') || 'expense') as 'expense' | 'income';
    const currency = String(f.get('currency') || 'TRY') as CurrencyCode;
    const amount = Number(f.get('amount') || 0);
    const date = String(f.get('date') || '') || new Date().toISOString().slice(0, 10);
    const category = String(f.get('category') || '').trim() || 'آخر';
    const details = String(f.get('details') || '').trim();

    if (!title || isNaN(amount)) return;

    const newTx: FinancialTransaction = {
      id: `tx-${Date.now()}`,
      title,
      type,
      category,
      amount_original: amount,
      currency_original: currency,
      date,
      details: details || undefined,
      status: 'confirmed',
      source: 'manual',
      fx_rate_at_transaction: rate,
      created_at: new Date().toISOString(),
    };

    setShowTxModal(false);
    persistLedger({
      ...ledger,
      transactions: [newTx, ...ledger.transactions],
    });
  }

  function handleDeleteTransaction(id: string) {
    if (!confirm('هل تريد مسح هذا البند؟')) return;
    persistLedger({
      ...ledger,
      transactions: ledger.transactions.filter((t) => t.id !== id),
    });
  }

  function handleAddSupplier(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('name') || '').trim();
    const service = String(f.get('service') || '').trim();
    const address = String(f.get('address') || '').trim();
    const phone = String(f.get('phone') || '').trim();
    const notes = String(f.get('notes') || '').trim();

    if (!name) return;

    const newSup: SupplierEntry = {
      id: `sup-${Date.now()}`,
      name,
      service,
      address,
      phone,
      notes,
    };

    setShowSupModal(false);
    persistLedger({
      ...ledger,
      suppliers: [...ledger.suppliers, newSup],
    });
  }

  function handleDeleteSupplier(id: string) {
    if (!confirm('مسح هذا المورد؟')) return;
    persistLedger({
      ...ledger,
      suppliers: ledger.suppliers.filter((s) => s.id !== id),
    });
  }

  // Visible transactions (exclude 0 TL gift or historical estimated clutter if needed, show clean list)
  const visibleTransactions = useMemo(
    () =>
      ledger.transactions.filter(
        (t) => t.status !== 'void' && Number(t.amount_original) > 0
      ),
    [ledger.transactions]
  );

  if (loading) {
    return (
      <div className="admin-card" dir="rtl" style={{ padding: '32px', textAlign: 'center' }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ fontFamily: 'var(--font-body), sans-serif', color: '#171717' }}>
      {/* SIMPLE HEADER + USD EXCHANGE RATE */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '22px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 700 }}>
          الحسابات ورأس المال
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#fff',
            border: '1px solid #dfdfdc',
            padding: '8px 14px',
            borderRadius: '10px',
          }}
        >
          <span style={{ fontSize: '13px', color: '#555', fontWeight: 600 }}>
            سعر الدولار (1$):
          </span>
          <input
            type="number"
            step="0.01"
            value={ledger.fx_rate_usd_try}
            onChange={(e) => {
              const nextRate = parseFloat(e.target.value) || 1;
              setLedger((prev) => ({ ...prev, fx_rate_usd_try: nextRate }));
            }}
            onBlur={() => persistLedger(ledger)}
            style={{
              width: '80px',
              padding: '5px 8px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontWeight: 700,
              textAlign: 'center',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: 700 }}>₺</span>
        </div>
      </div>

      {/* 4 CLEAN KPI CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <span style={{ fontSize: '13px', color: '#666', fontWeight: 600 }}>
            إجمالي المصاريف
          </span>
          <strong
            style={{
              fontSize: '28px',
              display: 'block',
              margin: '8px 0 4px',
              color: '#b94c4c',
            }}
          >
            {fmtTry(stats.totalExpensesTry)}
          </strong>
          <small style={{ color: '#777', fontSize: '14px', fontWeight: 600 }} dir="ltr">
            {fmtUsd(stats.totalExpensesUsd)}
          </small>
        </div>

        <div className="admin-card" style={{ marginBottom: 0 }}>
          <span style={{ fontSize: '13px', color: '#666', fontWeight: 600 }}>
            المبيعات المؤكدة
          </span>
          <strong
            style={{
              fontSize: '28px',
              display: 'block',
              margin: '8px 0 4px',
              color: '#2b8a3e',
            }}
          >
            {fmtTry(stats.totalSalesTry)}
          </strong>
          <small style={{ color: '#777', fontSize: '14px', fontWeight: 600 }} dir="ltr">
            {fmtUsd(stats.totalSalesUsd)}
          </small>
        </div>

        <div
          className="admin-card"
          style={{
            marginBottom: 0,
            background: '#171717',
            color: '#F3EFE6',
          }}
        >
          <span style={{ fontSize: '13px', color: '#C8C1B5', fontWeight: 600 }}>
            المتبقي لاسترداد رأس المال
          </span>
          <strong
            style={{
              fontSize: '28px',
              display: 'block',
              margin: '8px 0 4px',
              color: '#B69C7A',
            }}
          >
            {fmtTry(stats.remainingCapitalTry)}
          </strong>
          <small style={{ color: '#C8C1B5', fontSize: '14px', fontWeight: 600 }} dir="ltr">
            {fmtUsd(stats.remainingCapitalUsd)}
          </small>
        </div>

        <div className="admin-card" style={{ marginBottom: 0 }}>
          <span style={{ fontSize: '13px', color: '#666', fontWeight: 600 }}>
            المخزون الفعلي المتبقي
          </span>
          <strong style={{ fontSize: '28px', display: 'block', margin: '8px 0 4px' }}>
            {stats.remainingStock}
          </strong>
        </div>
      </div>

      {/* EXPENSES & REVENUES SECTION */}
      <section className="admin-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '19px' }}>المصاريف والأرباح</h2>
          <button
            type="button"
            className="primary inline"
            onClick={() => setShowTxModal(true)}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          >
            + إضافة
          </button>
        </div>

        <div className="table-wrap" style={{ marginTop: 0 }}>
          <table>
            <thead>
              <tr style={{ background: '#f5f5f3' }}>
                <th>البند</th>
                <th>النوع</th>
                <th>التصنيف</th>
                <th>التاريخ</th>
                <th>المبلغ</th>
                <th>مسح</th>
              </tr>
            </thead>
            <tbody>
              {visibleTransactions.map((t) => {
                const isUsd = t.currency_original === 'USD';
                const tryEquivalent = isUsd
                  ? t.amount_original * rate
                  : t.amount_original;
                const usdEquivalent = isUsd
                  ? t.amount_original
                  : t.amount_original / rate;

                return (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.title}</strong>
                      {t.details && (
                        <small style={{ display: 'block', color: '#777' }}>{t.details}</small>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: '99px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: t.type === 'expense' ? '#f4d8d8' : '#d8f0dc',
                          color: t.type === 'expense' ? '#991b1b' : '#1b5e20',
                        }}
                      >
                        {t.type === 'expense' ? 'مصروف' : 'إيراد'}
                      </span>
                    </td>
                    <td style={{ color: '#555' }}>{t.category || '-'}</td>
                    <td style={{ color: '#666', whiteSpace: 'nowrap' }}>
                      {t.date || '-'}
                    </td>
                    <td style={{ direction: 'ltr', textAlign: 'right' }}>
                      <strong
                        style={{
                          display: 'block',
                          fontSize: '15px',
                          color: t.type === 'expense' ? '#b94c4c' : '#2b8a3e',
                        }}
                      >
                        {isUsd
                          ? `$${t.amount_original.toFixed(2)}`
                          : `${t.amount_original.toFixed(2)}₺`}
                      </strong>
                      <small style={{ color: '#888', fontSize: '12px' }}>
                        {isUsd
                          ? `${tryEquivalent.toFixed(0)}₺`
                          : `$${usdEquivalent.toFixed(2)}`}
                      </small>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleDeleteTransaction(t.id)}
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        مسح ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* SUPPLIERS DIRECTORY SECTION */}
      <section className="admin-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '19px' }}>دليل الموردين</h2>
          <button
            type="button"
            className="primary inline"
            onClick={() => setShowSupModal(true)}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          >
            + إضافة مورد
          </button>
        </div>

        {ledger.suppliers.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            لا يوجد موردون حالياً.
          </p>
        ) : (
          <div className="table-wrap" style={{ marginTop: 0 }}>
            <table>
              <thead>
                <tr style={{ background: '#f5f5f3' }}>
                  <th>اسم المصنع / المورد</th>
                  <th>الخدمة</th>
                  <th>العنوان</th>
                  <th>رقم الهاتف</th>
                  <th>ملاحظة</th>
                  <th>مسح</th>
                </tr>
              </thead>
              <tbody>
                {ledger.suppliers.map((sup) => (
                  <tr key={sup.id}>
                    <td>
                      <strong>{sup.name}</strong>
                    </td>
                    <td>{sup.service || '-'}</td>
                    <td>{sup.address || '-'}</td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>
                      {sup.phone || '-'}
                    </td>
                    <td>{sup.notes || '-'}</td>
                    <td>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleDeleteSupplier(sup.id)}
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        مسح ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* POPUP MODAL 1: ADD TRANSACTION */}
      {showTxModal && (
        <div
          onClick={() => setShowTxModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '14px',
              width: 'min(480px, 100%)',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
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
              <h3 style={{ margin: 0, fontSize: '18px' }}>إضافة مصروف / إيراد</h3>
              <button
                type="button"
                onClick={() => setShowTxModal(false)}
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
              onSubmit={handleAddTransaction}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                البند *
                <input
                  required
                  name="title"
                  placeholder="اسم البند..."
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                  النوع *
                  <select
                    name="type"
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  >
                    <option value="expense">مصروف</option>
                    <option value="income">إيراد</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                  العملة *
                  <select
                    name="currency"
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  >
                    <option value="TRY">TRY (ليرة)</option>
                    <option value="USD">USD (دولار)</option>
                  </select>
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                المبلغ *
                <input
                  required
                  type="number"
                  step="0.01"
                  name="amount"
                  placeholder="0.00"
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                  التصنيف (اختياري)
                  <select
                    name="category"
                    defaultValue="تشغيل وتطوير"
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                  التاريخ (اختياري)
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                تفاصيل (اختياري)
                <input
                  name="details"
                  placeholder="ملاحظة مختصرة..."
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #ccc',
                    background: '#fff',
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="primary"
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: '#171717',
                    color: '#fff',
                  }}
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL 2: ADD SUPPLIER */}
      {showSupModal && (
        <div
          onClick={() => setShowSupModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '14px',
              width: 'min(460px, 100%)',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
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
              <h3 style={{ margin: 0, fontSize: '18px' }}>إضافة مصنع / مورد</h3>
              <button
                type="button"
                onClick={() => setShowSupModal(false)}
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
              onSubmit={handleAddSupplier}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                اسم المصنع أو المورد *
                <input
                  required
                  name="name"
                  placeholder="الاسم..."
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                الخدمة (اختياري)
                <input
                  name="service"
                  placeholder="تصنيع، طباعة، تغليف..."
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                العنوان (اختياري)
                <input
                  name="address"
                  placeholder="العنوان..."
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                رقم الهاتف (اختياري)
                <input
                  name="phone"
                  dir="ltr"
                  placeholder="+90..."
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                ملاحظة (اختياري)
                <input
                  name="notes"
                  placeholder="ملاحظة..."
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowSupModal(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #ccc',
                    background: '#fff',
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="primary"
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: '#171717',
                    color: '#fff',
                  }}
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
