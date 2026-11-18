'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  CurrencyCode,
  DEFAULT_FINANCE_LEDGER,
  DuthurFinanceLedger,
  EXCLUDED_SHOPIFY_ORDERS,
  FinancialTransaction,
  SupplierEntry,
} from '@/lib/finance-seed';
import { ConfirmModal } from './ConfirmModal';

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

export function FinanceMasterClient({
  initialLedger = DEFAULT_FINANCE_LEDGER,
  initialProducts = [],
  initialOrders = [],
}: {
  initialLedger?: DuthurFinanceLedger;
  initialProducts?: any[];
  initialOrders?: any[];
}) {
  const [ledger, setLedger] = useState<DuthurFinanceLedger>(initialLedger);
  const [storeOrders] = useState<any[]>(initialOrders);
  const [storeProducts] = useState<any[]>(initialProducts);

  // Popups (Modals)
  const [showTxModal, setShowTxModal] = useState(false);
  const [showSupModal, setShowSupModal] = useState(false);
  const [deleteTxTarget, setDeleteTxTarget] = useState<FinancialTransaction | null>(null);
  const [deleteSupTarget, setDeleteSupTarget] = useState<SupplierEntry | null>(null);

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

    // ONLY include status === 'confirmed' in Confirmed Sales (excludes estimated_amount, duplicate_archived, pending_review, no_charge)
    const confirmedIncomes = incomes.filter((i) => i.status === 'confirmed');
    const ledgerIncomesTry = confirmedIncomes.reduce(
      (a, i) =>
        a +
        (i.currency_original === 'USD'
          ? Number(i.amount_original || 0) * rate
          : Number(i.amount_original || 0)),
      0
    );

    const shopifySalesTry = confirmedIncomes
      .filter((i) => i.source === 'shopify')
      .reduce((a, i) => a + Number(i.amount_original || 0), 0);

    const manualSalesTry = confirmedIncomes
      .filter((i) => i.source !== 'shopify')
      .reduce(
        (a, i) =>
          a +
          (i.currency_original === 'USD'
            ? Number(i.amount_original || 0) * rate
            : Number(i.amount_original || 0)),
        0
      );

    // Paid website orders from the new Next.js store (if any are marked paid)
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

    // Inventory calculation from reconciled movements: 252 + sum(signed_delta) = 233
    const totalManufactured = ledger.designs.reduce(
      (acc, d) =>
        acc +
        Number(d.initial_stock.S || 0) +
        Number(d.initial_stock.M || 0) +
        Number(d.initial_stock.L || 0) +
        Number(d.initial_stock.XL || 0),
      0
    );
    const activeMovements = (ledger.movements || []).filter((m) => !m.archived);
    const totalMovementDelta = activeMovements.reduce(
      (acc, m) => acc + Number(m.signed_delta || 0),
      0
    );
    const remainingStock = totalManufactured + totalMovementDelta;

    const totalSoldUnits = activeMovements
      .filter((m) => m.type === 'sale')
      .reduce((acc, m) => acc + Math.abs(Number(m.signed_delta || 0)), 0);

    const personalUseUnits = activeMovements
      .filter((m) => m.type === 'personal_use')
      .reduce((acc, m) => acc + Math.abs(Number(m.signed_delta || 0)), 0);

    const giftUnits = activeMovements
      .filter((m) => m.type === 'gift')
      .reduce((acc, m) => acc + Math.abs(Number(m.signed_delta || 0)), 0);

    return {
      totalExpensesTry,
      totalExpensesUsd,
      shopifySalesTry,
      manualSalesTry,
      websiteSalesTry,
      totalSalesTry,
      totalSalesUsd,
      remainingCapitalTry,
      remainingCapitalUsd,
      remainingStock,
      totalSoldUnits,
      personalUseUnits,
      giftUnits,
    };
  }, [ledger.transactions, ledger.movements, ledger.designs, rate, storeOrders, storeProducts]);

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
      classification: type === 'income' ? 'manual_confirmed' : undefined,
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

  function handleApprovePendingTx(tx: FinancialTransaction) {
    const nextTransactions = ledger.transactions.map((t) =>
      t.id === tx.id
        ? {
            ...t,
            status: 'confirmed' as const,
            classification: 'manual_confirmed' as const,
            category: 'Confirmed Manual Sale',
          }
        : t
    );

    // Also add stock movement if it's a sale or gift
    const nextMovements = [...ledger.movements];
    if (tx.id === 'rev-870' || tx.id === 'rev-850') {
      nextMovements.push({
        id: `mov-${tx.id}`,
        sku: null,
        design_key: null,
        size: null,
        type: 'sale',
        qty: 1,
        signed_delta: -1,
        date: tx.date,
        financial_transaction_id: tx.id,
        source: 'manual',
        note: `مبيعات يدوية مؤكدة بعد المراجعة (${tx.amount_original}₺)`,
      });
    } else if (tx.id === 'rev-gift-june30') {
      nextMovements.push({
        id: `mov-${tx.id}`,
        sku: 'bila_aqarib:S',
        design_key: 'bila_aqarib',
        size: 'S',
        type: 'gift',
        qty: 1,
        signed_delta: -1,
        date: tx.date,
        financial_transaction_id: tx.id,
        source: 'historical',
        note: 'هدية مستقلة مؤكدة: بلا عقارب (S) — 2026-06-30',
      });
    }

    persistLedger({
      ...ledger,
      transactions: nextTransactions,
      movements: nextMovements,
    });
  }

  function handleArchivePendingTx(tx: FinancialTransaction) {
    const nextTransactions = ledger.transactions.map((t) =>
      t.id === tx.id
        ? {
            ...t,
            status: 'duplicate_archived' as const,
            classification: 'duplicate' as const,
            category: 'Duplicate Sale',
          }
        : t
    );
    persistLedger({
      ...ledger,
      transactions: nextTransactions,
    });
  }

  function confirmDeleteTransaction() {
    if (!deleteTxTarget) return;
    const id = deleteTxTarget.id;
    setDeleteTxTarget(null);
    persistLedger({
      ...ledger,
      transactions: ledger.transactions.filter((t) => t.id !== id),
      movements: ledger.movements.filter((m) => m.financial_transaction_id !== id),
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

  function confirmDeleteSupplier() {
    if (!deleteSupTarget) return;
    const id = deleteSupTarget.id;
    setDeleteSupTarget(null);
    persistLedger({
      ...ledger,
      suppliers: ledger.suppliers.filter((s) => s.id !== id),
    });
  }

  // Active confirmed transactions (expenses + confirmed incomes)
  const confirmedTransactions = useMemo(
    () => ledger.transactions.filter((t) => t.status === 'confirmed'),
    [ledger.transactions]
  );

  // Pending review items (870, 850, June 30 0 TL)
  const pendingReviewTransactions = useMemo(
    () => ledger.transactions.filter((t) => t.status === 'pending_review'),
    [ledger.transactions]
  );

  // Archived / Excluded (Estimates 2,700 + Overlapping Manual Batch)
  const archivedTransactions = useMemo(
    () =>
      ledger.transactions.filter(
        (t) =>
          t.status === 'estimated_amount' || t.status === 'duplicate_archived'
      ),
    [ledger.transactions]
  );

  return (
    <>
      <div className="admin-title">
        <div>
          <p>Accounting</p>
          <h1>Finance</h1>
        </div>

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
            USD Rate (1$):
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
      <div className="stat-grid">
        <div>
          <span>Total Expenses</span>
          <strong style={{ color: '#b94c4c', marginBottom: '4px' }}>
            {fmtTry(stats.totalExpensesTry)}
          </strong>
          <small style={{ color: '#777', fontSize: '14px', fontWeight: 600 }}>
            {fmtUsd(stats.totalExpensesUsd)}
          </small>
        </div>

        <div>
          <span>Confirmed Sales</span>
          <strong style={{ color: '#2b8a3e', marginBottom: '4px' }}>
            {fmtTry(stats.totalSalesTry)}
          </strong>
          <small style={{ color: '#777', fontSize: '14px', fontWeight: 600 }}>
            {fmtUsd(stats.totalSalesUsd)}
          </small>
        </div>

        <div style={{ background: '#171717', color: '#F3EFE6' }}>
          <span style={{ color: '#C8C1B5' }}>Remaining Capital</span>
          <strong style={{ color: '#B69C7A', marginBottom: '4px' }}>
            {fmtTry(stats.remainingCapitalTry)}
          </strong>
          <small style={{ color: '#C8C1B5', fontSize: '14px', fontWeight: 600 }}>
            {fmtUsd(stats.remainingCapitalUsd)}
          </small>
        </div>

        <div>
          <span>Remaining Stock</span>
          <strong>{stats.remainingStock}</strong>
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
          <div>
            <h2 style={{ margin: 0 }}>Expenses & Revenue</h2>
            <small style={{ color: '#777' }}>
              Shopify Confirmed: {stats.shopifySalesTry.toFixed(2)}₺ (12 orders / 13 units) + Manual Confirmed: {stats.manualSalesTry.toFixed(2)}₺ (2 units) = {stats.totalSalesTry.toFixed(2)}₺ | Expenses: {stats.totalExpensesTry.toFixed(2)}₺ | Cash Gap: {stats.remainingCapitalTry.toFixed(2)}₺
            </small>
          </div>
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
            + Add Entry
          </button>
        </div>

        <div
          className="admin-table head"
          style={{ gridTemplateColumns: '1.8fr .8fr 1fr .9fr 1fr auto' }}
        >
          <span>Title</span>
          <span>Type</span>
          <span>Category</span>
          <span>Date</span>
          <span>Amount</span>
          <span>Delete</span>
        </div>

        {confirmedTransactions.map((t) => {
          const isUsd = t.currency_original === 'USD';
          const tryEquivalent = isUsd
            ? t.amount_original * rate
            : t.amount_original;
          const usdEquivalent = isUsd
            ? t.amount_original
            : t.amount_original / rate;

          return (
            <div
              className="admin-table table-row"
              key={t.id}
              style={{ gridTemplateColumns: '1.8fr .8fr 1fr .9fr 1fr auto' }}
            >
              <div>
                <strong>{t.title}</strong>
                {t.details && (
                  <small style={{ display: 'block', color: '#777' }}>{t.details}</small>
                )}
              </div>
              <div>
                <span
                  className={`status ${t.type === 'expense' ? 'cancelled' : 'delivered'}`}
                >
                  {t.type === 'expense' ? 'Expense' : 'Income'}
                </span>
              </div>
              <span style={{ color: '#555', fontSize: '13px' }}>
                {t.category || '-'}
              </span>
              <span style={{ color: '#666', fontSize: '13px' }}>
                {t.date || '-'}
              </span>
              <div>
                <strong
                  style={{
                    display: 'block',
                    fontSize: '14px',
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
              </div>
              <div>
                <button
                  type="button"
                  className="danger"
                  onClick={() => setDeleteTxTarget(t)}
                  style={{ padding: '5px 12px', fontSize: '12px' }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* RECONCILIATION & PENDING REVIEW SECTION */}
      <section className="admin-card">
        <h2 style={{ margin: '0 0 8px' }}>Sales Reconciliation & Audit Archive</h2>
        <p className="muted" style={{ margin: '0 0 14px' }}>
          Records below are excluded from Confirmed Sales until verified, or archived as duplicates/estimates so nothing is double-counted.
        </p>

        {pendingReviewTransactions.length > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '15px', margin: '0 0 10px', color: '#92400e' }}>
              Pending Review ({pendingReviewTransactions.length})
            </h3>
            {pendingReviewTransactions.map((t) => (
              <div
                key={t.id}
                className="admin-table table-row"
                style={{ gridTemplateColumns: '2fr 1fr auto' }}
              >
                <div>
                  <strong>{t.title}</strong>
                  <small style={{ display: 'block', color: '#777' }}>{t.details}</small>
                </div>
                <strong style={{ color: '#92400e' }}>
                  {t.amount_original.toFixed(2)}₺
                </strong>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleApprovePendingTx(t)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '7px',
                      border: '1px solid #2b8a3e',
                      background: '#d8f0dc',
                      color: '#1b5e20',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Approve as Independent
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchivePendingTx(t)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '7px',
                      border: '1px solid #ddd',
                      background: '#fff',
                      color: '#666',
                      fontSize: '12px',
                    }}
                  >
                    Mark Duplicate / Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <details>
          <summary style={{ fontSize: '14px', color: '#555' }}>
            View Excluded & Archived Records (Duplicates, 2,700₺ Estimates & Voided/Refunded Shopify Orders)
          </summary>
          <div style={{ marginTop: '12px' }}>
            {archivedTransactions.map((t) => (
              <div
                key={t.id}
                className="admin-table table-row"
                style={{ gridTemplateColumns: '2fr 1fr 1fr', opacity: 0.7 }}
              >
                <div>
                  <strong>{t.title}</strong>
                  <small style={{ display: 'block', color: '#777' }}>{t.details}</small>
                </div>
                <span className="status cancelled">{t.category}</span>
                <span style={{ textDecoration: 'line-through' }}>
                  {t.amount_original.toFixed(2)}₺
                </span>
              </div>
            ))}
            {EXCLUDED_SHOPIFY_ORDERS.map((eo) => (
              <div
                key={eo.order_number}
                className="admin-table table-row"
                style={{ gridTemplateColumns: '2fr 1fr 1fr', opacity: 0.7 }}
              >
                <div>
                  <strong>Shopify {eo.order_number}</strong>
                  <small style={{ display: 'block', color: '#777' }}>{eo.reason}</small>
                </div>
                <span className="status cancelled">{eo.status}</span>
                <span>{eo.amount ? `${eo.amount.toFixed(2)}₺` : '-'}</span>
              </div>
            ))}
          </div>
        </details>
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
          <h2 style={{ margin: 0 }}>Suppliers</h2>
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
            + Add Supplier
          </button>
        </div>

        <div
          className="admin-table head"
          style={{ gridTemplateColumns: '1.4fr 1.2fr 1.2fr 1fr 1.2fr auto' }}
        >
          <span>Name</span>
          <span>Service</span>
          <span>Address</span>
          <span>Phone</span>
          <span>Notes</span>
          <span>Delete</span>
        </div>

        {ledger.suppliers.map((sup) => (
          <div
            className="admin-table table-row"
            key={sup.id}
            style={{ gridTemplateColumns: '1.4fr 1.2fr 1.2fr 1fr 1.2fr auto' }}
          >
            <strong>{sup.name}</strong>
            <span>{sup.service || '-'}</span>
            <span>{sup.address || '-'}</span>
            <span dir="ltr">{sup.phone || '-'}</span>
            <span>{sup.notes || '-'}</span>
            <div>
              <button
                type="button"
                className="danger"
                onClick={() => setDeleteSupTarget(sup)}
                style={{ padding: '5px 12px', fontSize: '12px' }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {ledger.suppliers.length === 0 && (
          <p className="muted" style={{ padding: '16px 0 4px', margin: 0 }}>
            No suppliers added yet.
          </p>
        )}
      </section>

      {/* POPUP MODAL 1: ADD TRANSACTION */}
      {showTxModal && (
        <div
          onClick={() => setShowTxModal(false)}
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
              borderRadius: '16px',
              width: 'min(480px, 100%)',
              padding: '26px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
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
                <h3 style={{ margin: '2px 0 0', fontSize: '20px' }}>Add Entry</h3>
              </div>
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
                Title (البند) *
                <input
                  required
                  name="title"
                  placeholder="Entry title..."
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                  Type (النوع) *
                  <select
                    name="type"
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  >
                    <option value="expense">Expense (مصروف)</option>
                    <option value="income">Income (إيراد)</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                  Currency (العملة) *
                  <select
                    name="currency"
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  >
                    <option value="TRY">TRY (₺)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                Amount (المبلغ) *
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
                  Category (التصنيف)
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
                  Date (التاريخ)
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                Details (تفاصيل اختياري)
                <input
                  name="details"
                  placeholder="Optional note..."
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
                  Cancel
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
                  Save
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
              borderRadius: '16px',
              width: 'min(460px, 100%)',
              padding: '26px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
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
                <h3 style={{ margin: '2px 0 0', fontSize: '20px' }}>Add Supplier</h3>
              </div>
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
                Supplier Name *
                <input
                  required
                  name="name"
                  placeholder="Name..."
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                Service (Optional)
                <input
                  name="service"
                  placeholder="Manufacturing, printing, packaging..."
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                Address (Optional)
                <input
                  name="address"
                  placeholder="Address..."
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                Phone Number (Optional)
                <input
                  name="phone"
                  dir="ltr"
                  placeholder="+90..."
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                Notes (Optional)
                <input
                  name="notes"
                  placeholder="Notes..."
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
                  Cancel
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
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM BRANDED DELETE CONFIRMATIONS */}
      <ConfirmModal
        open={Boolean(deleteTxTarget)}
        title="Delete Entry"
        message={`Are you sure you want to delete "${deleteTxTarget?.title || ''}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteTransaction}
        onCancel={() => setDeleteTxTarget(null)}
      />

      <ConfirmModal
        open={Boolean(deleteSupTarget)}
        title="Delete Supplier"
        message={`Are you sure you want to delete supplier "${deleteSupTarget?.name || ''}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteSupplier}
        onCancel={() => setDeleteSupTarget(null)}
      />
    </>
  );
}
