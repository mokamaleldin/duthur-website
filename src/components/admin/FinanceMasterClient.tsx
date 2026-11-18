'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CurrencyCode,
  DEFAULT_FINANCE_LEDGER,
  DuthurFinanceLedger,
  FinancialTransaction,
  InventoryMovement,
  SupplierEntry,
} from '@/lib/finance-seed';

const SIZES: Array<'S' | 'M' | 'L' | 'XL'> = ['S', 'M', 'L', 'XL'];
const VOID_ORDER_STATUSES = new Set(['cancelled', 'fake', 'returned']);

function fmtMoney(val: number, cur: 'TRY' | 'USD' = 'TRY', roundInt = false) {
  const num = Number(val || 0);
  const formatted = roundInt
    ? Math.round(num).toLocaleString('en-US')
    : num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  return cur === 'TRY' ? `${formatted}₺` : `$${formatted}`;
}

export function FinanceMasterClient() {
  const [ledger, setLedger] = useState<DuthurFinanceLedger>(DEFAULT_FINANCE_LEDGER);
  const [storeOrders, setStoreOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Filters for financial table
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCurrency, setFilterCurrency] = useState<'all' | 'TRY' | 'USD'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [includeStoreOrdersInFinance, setIncludeStoreOrdersInFinance] = useState<boolean>(true);

  // Unresolved assignment selections
  const [unresolvedSelect, setUnresolvedSelect] = useState<Record<string, string>>({});

  // Custom sale / movement modal or inline form state
  const [actionDesign, setActionDesign] = useState<'bila_aqarib' | 'min_huna' | 'walilhurriya'>('bila_aqarib');
  const [actionSize, setActionSize] = useState<'S' | 'M' | 'L' | 'XL'>('M');
  const [actionType, setActionType] = useState<'sale' | 'gift' | 'return' | 'restock' | 'adjustment'>('sale');
  const [actionQty, setActionQty] = useState<number>(1);
  const [actionPrice, setActionPrice] = useState<number>(899);
  const [actionStatus, setActionStatus] = useState<'confirmed' | 'estimated_amount' | 'no_charge'>('confirmed');
  const [actionNote, setActionNote] = useState<string>('');

  useEffect(() => {
    fetch('/api/admin/finance')
      .then((r) => r.json())
      .then((res) => {
        if (res.ledger) setLedger(res.ledger);
        if (res.orders) setStoreOrders(res.orders);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Update actionPrice default when design changes
  useEffect(() => {
    const d = ledger.designs.find((x) => x.design_key === actionDesign);
    if (d && actionType === 'sale') {
      setActionPrice(d.sale_price_try);
    } else if (actionType === 'gift') {
      setActionPrice(0);
    }
  }, [actionDesign, actionType, ledger.designs]);

  // Helper to persist ledger + optionally sync store stocks/prices
  async function persistLedger(
    nextLedger: DuthurFinanceLedger,
    options?: { syncPrices?: boolean; syncStocks?: boolean; msg?: string }
  ) {
    setLedger(nextLedger);
    setSaving(true);
    setSaveBanner(null);

    // Compute current SKU stocks if syncStocks is requested
    let skuStocks: Array<{ product_id: string; size: string; stock: number }> | undefined;
    if (options?.syncStocks) {
      skuStocks = [];
      for (const d of nextLedger.designs) {
        for (const sz of SIZES) {
          const skuKey = `${d.design_key}:${sz}`;
          const delta = nextLedger.movements
            .filter((m) => m.sku === skuKey)
            .reduce((acc, m) => acc + Number(m.signed_delta || 0), 0);
          const onHand = Number(d.initial_stock[sz] || 0) + delta;
          skuStocks.push({
            product_id: d.product_id,
            size: sz,
            stock: Math.max(0, onHand),
          });
        }
      }
    }

    try {
      await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ledger: nextLedger,
          syncPricesToStore: options?.syncPrices,
          syncStockToStore: options?.syncStocks,
          skuStocks,
        }),
      });
      setSaveBanner(options?.msg || 'تم الحفظ وتحديث الحسابات تلقائياً ✓');
      setTimeout(() => setSaveBanner(null), 3500);
    } catch {
      setSaveBanner('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  }

  // ============================================================================
  // DERIVED CALCULATIONS (FINANCIALS & INVENTORY)
  // ============================================================================
  const rate = Number(ledger.fx_rate_usd_try || 50.35);

  const financialStats = useMemo(() => {
    const activeTx = ledger.transactions.filter((t) => t.status !== 'void');
    const expenses = activeTx.filter((t) => t.type === 'expense');
    const incomes = activeTx.filter((t) => t.type === 'income');

    const expensesUsdOrig = expenses
      .filter((e) => e.currency_original === 'USD')
      .reduce((a, e) => a + Number(e.amount_original || 0), 0);

    const expensesTryOrig = expenses
      .filter((e) => e.currency_original === 'TRY')
      .reduce((a, e) => a + Number(e.amount_original || 0), 0);

    const totalExpensesTry = expensesUsdOrig * rate + expensesTryOrig;
    const totalExpensesUsd = totalExpensesTry / rate;

    // Confirmed receipts from ledger
    const ledgerConfirmedTry = incomes
      .filter((i) => i.status === 'confirmed')
      .reduce(
        (a, i) =>
          a +
          (i.currency_original === 'USD'
            ? Number(i.amount_original) * rate
            : Number(i.amount_original)),
        0
      );

    // Estimated receipts from ledger
    const ledgerEstimatedTry = incomes
      .filter((i) => i.status === 'estimated_amount')
      .reduce(
        (a, i) =>
          a +
          (i.currency_original === 'USD'
            ? Number(i.amount_original) * rate
            : Number(i.amount_original)),
        0
      );

    // Live Store Orders (non-cancelled, non-fake, non-returned)
    const validWebsiteOrders = storeOrders.filter(
      (o) => !VOID_ORDER_STATUSES.has(o.order_status)
    );
    const paidWebsiteOrdersTry = validWebsiteOrders
      .filter(
        (o) =>
          o.payment_status === 'paid' ||
          o.order_status === 'confirmed' ||
          o.order_status === 'shipped' ||
          o.order_status === 'delivered'
      )
      .reduce((a, o) => a + Number(o.total || 0), 0);

    const pendingWebsiteOrdersTry = validWebsiteOrders
      .filter(
        (o) =>
          o.payment_status !== 'paid' &&
          o.order_status === 'new'
      )
      .reduce((a, o) => a + Number(o.total || 0), 0);

    const confirmedReceiptsTry =
      ledgerConfirmedTry + (includeStoreOrdersInFinance ? paidWebsiteOrdersTry : 0);

    const estimatedReceiptsTry =
      ledgerEstimatedTry + (includeStoreOrdersInFinance ? pendingWebsiteOrdersTry : 0);

    const totalRevenueWithEstimatesTry = confirmedReceiptsTry + estimatedReceiptsTry;

    const remainingCapitalTry = Math.max(0, totalExpensesTry - confirmedReceiptsTry);
    const remainingCapitalWithEstTry = Math.max(
      0,
      totalExpensesTry - totalRevenueWithEstimatesTry
    );

    const recoveryPercent =
      totalExpensesTry > 0
        ? Math.min(100, (confirmedReceiptsTry / totalExpensesTry) * 100)
        : 0;

    return {
      expensesUsdOrig,
      expensesTryOrig,
      totalExpensesTry,
      totalExpensesUsd,
      ledgerConfirmedTry,
      ledgerEstimatedTry,
      paidWebsiteOrdersTry,
      pendingWebsiteOrdersTry,
      confirmedReceiptsTry,
      estimatedReceiptsTry,
      totalRevenueWithEstimatesTry,
      remainingCapitalTry,
      remainingCapitalWithEstTry,
      recoveryPercent,
      validWebsiteOrdersCount: validWebsiteOrders.length,
    };
  }, [ledger.transactions, rate, storeOrders, includeStoreOrdersInFinance]);

  const inventoryStats = useMemo(() => {
    let totalManufactured = 0;
    let totalClassifiedOnHand = 0;
    let totalSold = 0;
    let totalGifted = 0;

    const designRows = ledger.designs.map((d) => {
      const mfgS = Number(d.initial_stock.S || 0);
      const mfgM = Number(d.initial_stock.M || 0);
      const mfgL = Number(d.initial_stock.L || 0);
      const mfgXL = Number(d.initial_stock.XL || 0);
      const mfgTotal = mfgS + mfgM + mfgL + mfgXL;
      totalManufactured += mfgTotal;

      const bySize: Record<'S' | 'M' | 'L' | 'XL', { mfg: number; onHand: number; sold: number; gifted: number }> = {
        S: { mfg: mfgS, onHand: mfgS, sold: 0, gifted: 0 },
        M: { mfg: mfgM, onHand: mfgM, sold: 0, gifted: 0 },
        L: { mfg: mfgL, onHand: mfgL, sold: 0, gifted: 0 },
        XL: { mfg: mfgXL, onHand: mfgXL, sold: 0, gifted: 0 },
      };

      for (const sz of SIZES) {
        const sku = `${d.design_key}:${sz}`;
        const movs = ledger.movements.filter((m) => m.sku === sku);
        const delta = movs.reduce((a, m) => a + Number(m.signed_delta || 0), 0);
        const sold = movs
          .filter((m) => m.type === 'sale')
          .reduce((a, m) => a + Math.abs(Number(m.signed_delta || 0)), 0);
        const returned = movs
          .filter((m) => m.type === 'return')
          .reduce((a, m) => a + Math.abs(Number(m.signed_delta || 0)), 0);
        const gifted = movs
          .filter((m) => m.type === 'gift')
          .reduce((a, m) => a + Math.abs(Number(m.signed_delta || 0)), 0);

        bySize[sz].onHand = mfgS === bySize[sz].mfg ? bySize[sz].mfg + delta : d.initial_stock[sz] + delta;
        bySize[sz].sold = Math.max(0, sold - returned);
        bySize[sz].gifted = gifted;
      }

      const designOnHand =
        bySize.S.onHand + bySize.M.onHand + bySize.L.onHand + bySize.XL.onHand;
      const designSold =
        bySize.S.sold + bySize.M.sold + bySize.L.sold + bySize.XL.sold;
      const designGifted =
        bySize.S.gifted + bySize.M.gifted + bySize.L.gifted + bySize.XL.gifted;

      totalClassifiedOnHand += designOnHand;

      return {
        ...d,
        mfgTotal,
        bySize,
        designOnHand,
        designSold,
        designGifted,
      };
    });

    // Global movements (including unresolved)
    const allNetDelta = ledger.movements.reduce(
      (a, m) => a + Number(m.signed_delta || 0),
      0
    );
    totalSold = ledger.movements
      .filter((m) => m.type === 'sale')
      .reduce((a, m) => a + Math.abs(Number(m.signed_delta || 0)), 0) -
      ledger.movements
        .filter((m) => m.type === 'return')
        .reduce((a, m) => a + Math.abs(Number(m.signed_delta || 0)), 0);

    totalGifted = ledger.movements
      .filter((m) => m.type === 'gift')
      .reduce((a, m) => a + Math.abs(Number(m.signed_delta || 0)), 0);

    const unresolvedMovements = ledger.movements.filter((m) => !m.sku);
    const unresolvedCount = unresolvedMovements.reduce(
      (a, m) => a + Math.abs(Number(m.signed_delta || 0)),
      0
    );

    const actualGlobalRemaining = totalManufactured + allNetDelta;
    const sellThroughPercent =
      totalManufactured > 0
        ? ((totalManufactured - actualGlobalRemaining) / totalManufactured) * 100
        : 0;

    return {
      designRows,
      totalManufactured,
      totalClassifiedOnHand,
      actualGlobalRemaining,
      totalSold,
      totalGifted,
      unresolvedMovements,
      unresolvedCount,
      sellThroughPercent,
    };
  }, [ledger.designs, ledger.movements]);

  // ============================================================================
  // INTERACTIVE ACTIONS
  // ============================================================================

  // 1. Quick 1-Click Sale ("بيع 1") or Gift ("هدية 1") directly from a SKU cell
  function handleQuickSkuAction(
    designKey: 'bila_aqarib' | 'min_huna' | 'walilhurriya',
    size: 'S' | 'M' | 'L' | 'XL',
    mode: 'sale' | 'gift'
  ) {
    const design = ledger.designs.find((d) => d.design_key === designKey);
    if (!design) return;

    const sku = `${designKey}:${size}`;
    const today = new Date().toISOString().slice(0, 10);
    const txId = `tx-${Date.now()}`;
    const movId = `mov-${Date.now()}`;
    const price = mode === 'sale' ? Number(design.sale_price_try) : 0;

    const newTx: FinancialTransaction = {
      id: txId,
      date: today,
      title:
        mode === 'sale'
          ? `بيع مباشر: ${design.name_ar} (${size})`
          : `هدية: ${design.name_ar} (${size})`,
      type: 'income',
      category: mode === 'sale' ? 'مبيعات' : 'هدية',
      amount_original: price,
      currency_original: 'TRY',
      status: mode === 'sale' ? 'confirmed' : 'no_charge',
      source: 'manual',
      variant_sku: sku,
      created_at: new Date().toISOString(),
    };

    const newMov: InventoryMovement = {
      id: movId,
      sku,
      design_key: designKey,
      size,
      type: mode,
      qty: 1,
      signed_delta: -1,
      date: today,
      financial_transaction_id: txId,
      source: 'manual',
      note:
        mode === 'sale'
          ? `بيع 1 قطعة (${price} TL)`
          : `هدية 1 قطعة (0 TL)`,
    };

    const nextLedger: DuthurFinanceLedger = {
      ...ledger,
      transactions: [newTx, ...ledger.transactions],
      movements: [newMov, ...ledger.movements],
    };

    persistLedger(nextLedger, {
      syncStocks: true,
      msg:
        mode === 'sale'
          ? `تم تسجيل بيع 1 من "${design.name_ar} (${size})" بقيمة ${price}₺ وخصمها من المخزون ✓`
          : `تم تسجيل هدية 1 من "${design.name_ar} (${size})" وخصمها من المخزون ✓`,
    });
  }

  // 2. Custom Inventory + Financial Movement Form
  function handleCustomMovementSubmit(e: FormEvent) {
    e.preventDefault();
    const design = ledger.designs.find((d) => d.design_key === actionDesign);
    if (!design) return;

    const sku = `${actionDesign}:${actionSize}`;
    const today = new Date().toISOString().slice(0, 10);
    const qty = Math.max(1, Number(actionQty || 1));
    const totalAmount = Number(actionPrice || 0) * qty;

    const txId = `tx-${Date.now()}`;
    const movId = `mov-${Date.now()}`;

    let signedDelta = -qty;
    if (actionType === 'return' || actionType === 'restock') {
      signedDelta = qty;
    } else if (actionType === 'adjustment') {
      signedDelta = Number(actionQty); // allow positive or negative if needed
    }

    const nextTransactions = [...ledger.transactions];

    if (actionType === 'sale' || actionType === 'gift') {
      nextTransactions.unshift({
        id: txId,
        date: today,
        title:
          actionType === 'sale'
            ? `بيع (${qty}×): ${design.name_ar} (${actionSize})`
            : `هدية (${qty}×): ${design.name_ar} (${actionSize})`,
        type: 'income',
        category: actionType === 'sale' ? 'مبيعات' : 'هدية',
        amount_original: actionType === 'gift' ? 0 : totalAmount,
        currency_original: 'TRY',
        status: actionType === 'gift' ? 'no_charge' : actionStatus,
        source: 'manual',
        variant_sku: sku,
        details: actionNote || undefined,
        created_at: new Date().toISOString(),
      });
    } else if (actionType === 'return' && totalAmount > 0) {
      // Negative income or refund record
      nextTransactions.unshift({
        id: txId,
        date: today,
        title: `مرتجع (${qty}×): ${design.name_ar} (${actionSize})`,
        type: 'income',
        category: 'مرتجع مبيعات',
        amount_original: -Math.abs(totalAmount),
        currency_original: 'TRY',
        status: 'confirmed',
        source: 'manual',
        variant_sku: sku,
        details: actionNote || undefined,
        created_at: new Date().toISOString(),
      });
    }

    const newMov: InventoryMovement = {
      id: movId,
      sku,
      design_key: actionDesign,
      size: actionSize,
      type: actionType,
      qty: Math.abs(qty),
      signed_delta: signedDelta,
      date: today,
      financial_transaction_id:
        actionType === 'sale' || actionType === 'gift' || (actionType === 'return' && totalAmount > 0)
          ? txId
          : undefined,
      source: 'manual',
      note: actionNote || `${actionType} (${qty}×)`,
    };

    persistLedger(
      {
        ...ledger,
        transactions: nextTransactions,
        movements: [newMov, ...ledger.movements],
      },
      { syncStocks: true, msg: 'تم تسجيل حركة المخزون والحسابات بنجاح ✓' }
    );
    setActionNote('');
  }

  // 3. Assign one of the 5 Unresolved Historical Sales to an exact Design + Size
  function handleResolveMovement(movId: string) {
    const selectedSku = unresolvedSelect[movId];
    if (!selectedSku) {
      alert('يرجى اختيار التصميم والمقاس أولاً');
      return;
    }
    const [designKey, size] = selectedSku.split(':') as [
      'bila_aqarib' | 'min_huna' | 'walilhurriya',
      'S' | 'M' | 'L' | 'XL'
    ];
    const design = ledger.designs.find((d) => d.design_key === designKey);

    const nextMovements = ledger.movements.map((m) =>
      m.id === movId
        ? {
            ...m,
            sku: selectedSku,
            design_key: designKey,
            size,
            note: `${m.note || ''} — تم التخصيص إلى ${design?.name_ar} (${size})`,
          }
        : m
    );

    const targetMov = ledger.movements.find((m) => m.id === movId);
    const nextTransactions = ledger.transactions.map((t) =>
      t.id === targetMov?.financial_transaction_id
        ? {
            ...t,
            variant_sku: selectedSku,
            title: `${t.title} → [${design?.name_ar} ${size}]`,
          }
        : t
    );

    persistLedger(
      {
        ...ledger,
        movements: nextMovements,
        transactions: nextTransactions,
      },
      {
        syncStocks: true,
        msg: `تم ربط القطعة بـ ${design?.name_ar} (${size}) وتحديث المخزون تلقائياً ✓`,
      }
    );
  }

  // 4. Add a new Financial Transaction (Expense or Income)
  function handleAddTransaction(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get('title') || '').trim();
    const type = String(f.get('type') || 'expense') as 'expense' | 'income';
    const category = String(f.get('category') || 'أخرى').trim();
    const amount = Number(f.get('amount') || 0);
    const currency = String(f.get('currency') || 'TRY') as CurrencyCode;
    const date = String(f.get('date') || '') || new Date().toISOString().slice(0, 10);
    const status = String(f.get('status') || 'confirmed') as
      | 'confirmed'
      | 'estimated_amount'
      | 'no_charge';

    if (!title || isNaN(amount)) return;

    const newTx: FinancialTransaction = {
      id: `tx-${Date.now()}`,
      title,
      type,
      category,
      amount_original: amount,
      currency_original: currency,
      date,
      status,
      source: 'manual',
      fx_rate_at_transaction: rate,
      created_at: new Date().toISOString(),
    };

    e.currentTarget.reset();
    persistLedger(
      {
        ...ledger,
        transactions: [newTx, ...ledger.transactions],
      },
      { msg: 'تمت إضافة المعاملة المالية وحساب الإجماليات ✓' }
    );
  }

  // 5. Delete or Void a Financial Transaction (and reverse its inventory movement if linked!)
  function handleDeleteTransaction(tx: FinancialTransaction) {
    if (
      !confirm(
        `هل تريد مسح/إلغاء "${tx.title}"؟ إذا كانت عملية بيع مرتبطة بمخزون فسيتم إرجاع القطعة للمخزون تلقائياً.`
      )
    )
      return;

    const nextTransactions = ledger.transactions.filter((t) => t.id !== tx.id);
    const nextMovements = ledger.movements.filter(
      (m) => m.financial_transaction_id !== tx.id
    );

    persistLedger(
      {
        ...ledger,
        transactions: nextTransactions,
        movements: nextMovements,
      },
      {
        syncStocks: true,
        msg: 'تم مسح المعاملة وإعادة ضبط المخزون والحسابات ✓',
      }
    );
  }

  // 6. Toggle Estimated -> Confirmed on a transaction
  function handleToggleTxStatus(tx: FinancialTransaction) {
    const nextStatus =
      tx.status === 'confirmed' ? 'estimated_amount' : 'confirmed';
    const nextTransactions = ledger.transactions.map((t) =>
      t.id === tx.id ? { ...t, status: nextStatus as any } : t
    );
    persistLedger({
      ...ledger,
      transactions: nextTransactions,
    });
  }

  // 7. Delete a standalone movement (and its financial transaction if any)
  function handleDeleteMovement(mov: InventoryMovement) {
    if (
      !confirm(
        'هل تريد إلغاء/مسح هذه الحركة وإرجاع الكمية للمخزون؟'
      )
    )
      return;
    const nextMovements = ledger.movements.filter((m) => m.id !== mov.id);
    const nextTransactions = mov.financial_transaction_id
      ? ledger.transactions.filter((t) => t.id !== mov.financial_transaction_id)
      : ledger.transactions;

    persistLedger(
      {
        ...ledger,
        movements: nextMovements,
        transactions: nextTransactions,
      },
      { syncStocks: true, msg: 'تم إلغاء الحركة وإرجاع الرصيد للمخزون ✓' }
    );
  }

  // 8. Add Supplier
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
    e.currentTarget.reset();
    persistLedger(
      {
        ...ledger,
        suppliers: [...ledger.suppliers, newSup],
      },
      { msg: 'تمت إضافة المورد بنجاح ✓' }
    );
  }

  function handleDeleteSupplier(id: string) {
    if (!confirm('حذف هذا المورد؟')) return;
    persistLedger({
      ...ledger,
      suppliers: ledger.suppliers.filter((s) => s.id !== id),
    });
  }

  // 9. Export CSV
  function exportTransactionsCsv() {
    const headers = [
      'Date',
      'Title',
      'Type',
      'Category',
      'Original Amount',
      'Original Currency',
      'TRY Value',
      'USD Value',
      'Status',
      'SKU',
    ];
    const rows = ledger.transactions.map((t) => {
      const tryVal =
        t.currency_original === 'USD'
          ? t.amount_original * rate
          : t.amount_original;
      const usdVal =
        t.currency_original === 'TRY'
          ? t.amount_original / rate
          : t.amount_original;
      return [
        t.date || 'Unknown',
        `"${t.title.replace(/"/g, '""')}"`,
        t.type,
        `"${t.category}"`,
        t.amount_original.toFixed(2),
        t.currency_original,
        tryVal.toFixed(2),
        usdVal.toFixed(2),
        t.status,
        t.variant_sku || '',
      ].join(',');
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DUTHUR_finance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // Filtered transactions for table display
  const filteredTransactions = useMemo(() => {
    return ledger.transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterCurrency !== 'all' && t.currency_original !== filterCurrency)
        return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      return true;
    });
  }, [ledger.transactions, filterType, filterCurrency, filterCategory]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    ledger.transactions.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [ledger.transactions]);

  if (loading) {
    return (
      <div className="admin-card" dir="rtl" style={{ padding: '40px', textAlign: 'center' }}>
        جاري تحميل منظومة الحسابات والمخزون لـ دُثُر...
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ fontFamily: 'var(--font-body), sans-serif', color: '#171717' }}>
      {/* TOP STICKY BAR */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          background: '#171717',
          color: '#F3EFE6',
          padding: '22px 26px',
          borderRadius: '14px',
          marginBottom: '24px',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '12px',
              color: '#B69C7A',
              letterSpacing: '0.08em',
              fontWeight: 700,
            }}
          >
            DUTHUR — دُثُر • الإدارة المالية والمخزون الموحدة
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: '28px', color: '#F3EFE6' }}>
            الحسابات، رأس المال، والمخزون في صفحة واحدة
          </h1>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#242424',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #3c3a35',
            }}
          >
            <span style={{ fontSize: '13px', color: '#C8C1B5' }}>سعر الصرف (1$ = TRY):</span>
            <input
              type="number"
              step="0.01"
              value={ledger.fx_rate_usd_try}
              onChange={(e) => {
                const nextRate = parseFloat(e.target.value) || 1;
                setLedger((prev) => ({ ...prev, fx_rate_usd_try: nextRate }));
              }}
              onBlur={() =>
                persistLedger(ledger, {
                  msg: `تم تحديث سعر الصرف المرجعي إلى ${ledger.fx_rate_usd_try} TRY ✓`,
                })
              }
              style={{
                width: '84px',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #6E705B',
                background: '#171717',
                color: '#F3EFE6',
                fontWeight: 700,
                textAlign: 'center',
              }}
            />
          </div>

          <button
            type="button"
            onClick={exportTransactionsCsv}
            style={{
              background: '#6E705B',
              color: '#fff',
              border: 0,
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            ⬇ تصدير CSV
          </button>

          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  'هل تريد إعادة ضبط البيانات المالية والمخزنية إلى نقطة البداية الموثقة (Baseline 252 / 237)؟'
                )
              ) {
                persistLedger(structuredClone(DEFAULT_FINANCE_LEDGER), {
                  syncPrices: true,
                  syncStocks: true,
                  msg: 'تم استرجاع نقطة الأساس الموثقة ومزامنة المتجر ✓',
                });
              }
            }}
            style={{
              background: 'transparent',
              color: '#C8C1B5',
              border: '1px solid #3c3a35',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          >
            استرجاع بيانات الأساس
          </button>
        </div>
      </div>

      {saveBanner && (
        <div
          style={{
            background: '#d8f0dc',
            border: '1px solid #2b8a3e',
            color: '#1b5e20',
            padding: '12px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontWeight: 700,
          }}
        >
          {saveBanner}
        </div>
      )}

      {/* ========================================================================
          SECTION 1: CAPITAL RECOVERY & EXECUTIVE KPIs
          ======================================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div
          className="admin-card"
          style={{
            marginBottom: 0,
            borderTop: '4px solid #b94c4c',
            background: '#fff',
          }}
        >
          <span style={{ fontSize: '13px', color: '#666', fontWeight: 600 }}>
            إجمالي المصاريف والتكاليف الموثقة
          </span>
          <strong style={{ fontSize: '28px', display: 'block', margin: '8px 0 4px' }}>
            {fmtMoney(financialStats.totalExpensesTry, 'TRY', true)}
          </strong>
          <small style={{ color: '#666', display: 'block', fontSize: '12px' }}>
            دقيق: {fmtMoney(financialStats.totalExpensesTry, 'TRY')} (
            {fmtMoney(financialStats.totalExpensesUsd, 'USD')})
          </small>
          <small style={{ color: '#888', display: 'block', marginTop: '4px', fontSize: '11px' }}>
            أصل العملات: ${financialStats.expensesUsdOrig.toFixed(2)} +{' '}
            {financialStats.expensesTryOrig.toFixed(2)}₺
          </small>
        </div>

        <div
          className="admin-card"
          style={{
            marginBottom: 0,
            borderTop: '4px solid #2b8a3e',
            background: '#fff',
          }}
        >
          <span style={{ fontSize: '13px', color: '#666', fontWeight: 600 }}>
            المبيعات المؤكدة (المقبوضة فعلياً)
          </span>
          <strong
            style={{
              fontSize: '28px',
              display: 'block',
              margin: '8px 0 4px',
              color: '#2b8a3e',
            }}
          >
            {fmtMoney(financialStats.confirmedReceiptsTry, 'TRY', true)}
          </strong>
          <small style={{ color: '#666', display: 'block', fontSize: '12px' }}>
            دقيق: {fmtMoney(financialStats.confirmedReceiptsTry, 'TRY')} (
            {fmtMoney(financialStats.confirmedReceiptsTry / rate, 'USD')})
          </small>
          <small style={{ color: '#888', display: 'block', marginTop: '4px', fontSize: '11px' }}>
            مبيعات تقديرية غير مؤكدة: {fmtMoney(financialStats.estimatedReceiptsTry, 'TRY')} (إجمالي شامل التقديري:{' '}
            {fmtMoney(financialStats.totalRevenueWithEstimatesTry, 'TRY', true)})
          </small>
        </div>

        <div
          className="admin-card"
          style={{
            marginBottom: 0,
            borderTop: '4px solid #B69C7A',
            background: '#171717',
            color: '#F3EFE6',
          }}
        >
          <span style={{ fontSize: '13px', color: '#C8C1B5', fontWeight: 600 }}>
            المتبقي لاسترداد رأس المال (Cash Gap)
          </span>
          <strong
            style={{
              fontSize: '28px',
              display: 'block',
              margin: '8px 0 4px',
              color: '#B69C7A',
            }}
          >
            {fmtMoney(financialStats.remainingCapitalTry, 'TRY', true)}
          </strong>
          <small style={{ color: '#C8C1B5', display: 'block', fontSize: '12px' }}>
            دقيق (مؤكد فقط): {fmtMoney(financialStats.remainingCapitalTry, 'TRY')}
          </small>
          <small style={{ color: '#aaa', display: 'block', marginTop: '4px', fontSize: '11px' }}>
            مع احتساب المبيعات التقديرية:{' '}
            <b>{fmtMoney(financialStats.remainingCapitalWithEstTry, 'TRY', true)}</b> (
            {fmtMoney(financialStats.remainingCapitalWithEstTry, 'TRY')})
          </small>
        </div>

        <div
          className="admin-card"
          style={{
            marginBottom: 0,
            borderTop: '4px solid #6E705B',
            background: '#fff',
          }}
        >
          <span style={{ fontSize: '13px', color: '#666', fontWeight: 600 }}>
            المخزون الفعلي المتبقي (On-Hand)
          </span>
          <strong style={{ fontSize: '28px', display: 'block', margin: '8px 0 4px' }}>
            {inventoryStats.actualGlobalRemaining} قطعة
          </strong>
          <small style={{ color: '#666', display: 'block', fontSize: '12px' }}>
            من أصل {inventoryStats.totalManufactured} مصنّعة | خَرج:{' '}
            {inventoryStats.totalSold} بيع + {inventoryStats.totalGifted} هدية
          </small>
          <small style={{ color: '#888', display: 'block', marginTop: '4px', fontSize: '11px' }}>
            مُصنّف بالمقاسات: {inventoryStats.totalClassifiedOnHand} | غير محدد الموديل:{' '}
            {inventoryStats.unresolvedCount} | هدايا مخططة: {ledger.planned_gifts_count}
          </small>
        </div>
      </div>

      {/* CAPITAL RECOVERY BAR & WEBSITE ORDERS TOGGLE */}
      <section className="admin-card" style={{ padding: '18px 22px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '10px',
          }}
        >
          <div>
            <strong>نسبة استرداد رأس المال النقدي: {financialStats.recoveryPercent.toFixed(1)}%</strong>
            <span style={{ color: '#666', fontSize: '13px', marginRight: '12px' }}>
              (المحصّل المؤكد {fmtMoney(financialStats.confirmedReceiptsTry, 'TRY')} من أصل مصاريف{' '}
              {fmtMoney(financialStats.totalExpensesTry, 'TRY')})
            </span>
          </div>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              cursor: 'pointer',
              background: '#f5f5f3',
              padding: '6px 12px',
              borderRadius: '8px',
            }}
          >
            <input
              type="checkbox"
              checked={includeStoreOrdersInFinance}
              onChange={(e) => setIncludeStoreOrdersInFinance(e.target.checked)}
            />
            <span>
              دمج طلبات الموقع غير الملغاة تلقائياً ({financialStats.validWebsiteOrdersCount} طلب: مدفوع{' '}
              {fmtMoney(financialStats.paidWebsiteOrdersTry, 'TRY')} / معلق{' '}
              {fmtMoney(financialStats.pendingWebsiteOrdersTry, 'TRY')})
            </span>
          </label>
        </div>
        <div
          style={{
            height: '12px',
            background: '#eee',
            borderRadius: '99px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${financialStats.recoveryPercent}%`,
              height: '100%',
              background: '#6E705B',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </section>

      {/* ========================================================================
          SECTION 2: INVENTORY MATRIX BY DESIGN & SIZE + QUICK "بيع 1" BUTTONS
          ======================================================================== */}
      <section className="admin-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>
              1) المخزون وحركاته حسب التصميم والمقاس (SKUs)
            </h2>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              اضغط &quot;بيع 1&quot; أو &quot;هدية 1&quot; تحت أي مقاس لخصمه فوراً من المخزون وإضافة قيمته للمبيعات المؤكدة تلقائياً.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              persistLedger(ledger, {
                syncStocks: true,
                syncPrices: true,
                msg: 'تمت مزامنة جميع كميات المقاسات والأسعار مع المتجر العام ✓',
              })
            }
            style={{
              background: '#171717',
              color: '#F3EFE6',
              border: 0,
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            مزامنة الأرصدة والأسعار مع المتجر الآن ↻
          </button>
        </div>

        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f3', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px' }}>التصميم (Design)</th>
                <th style={{ padding: '12px' }}>السعر الفعلي</th>
                {SIZES.map((sz) => (
                  <th key={sz} style={{ padding: '12px', textAlign: 'center' }}>
                    مقاس {sz}
                  </th>
                ))}
                <th style={{ padding: '12px', textAlign: 'center' }}>المصنّع</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>المباع / هدايا</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>المتبقي بالمقاسات</th>
              </tr>
            </thead>
            <tbody>
              {inventoryStats.designRows.map((row) => (
                <tr key={row.design_key} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '14px 12px' }}>
                    <strong style={{ fontSize: '16px', display: 'block' }}>{row.name_ar}</strong>
                    <small style={{ color: '#777' }}>{row.slug}</small>
                  </td>
                  <td style={{ padding: '14px 12px', fontWeight: 700 }}>
                    {row.sale_price_try} TL
                  </td>
                  {SIZES.map((sz) => {
                    const cell = row.bySize[sz];
                    return (
                      <td
                        key={sz}
                        style={{
                          padding: '12px 8px',
                          textAlign: 'center',
                          background: cell.onHand <= 3 ? '#fff8f8' : 'transparent',
                        }}
                      >
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#171717' }}>
                          {cell.onHand}
                        </div>
                        <div style={{ fontSize: '11px', color: '#777', marginBottom: '6px' }}>
                          أصل {cell.mfg} | بيع {cell.sold}
                          {cell.gifted > 0 ? ` | هدية ${cell.gifted}` : ''}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <button
                            type="button"
                            disabled={saving || cell.onHand <= 0}
                            onClick={() =>
                              handleQuickSkuAction(row.design_key, sz, 'sale')
                            }
                            style={{
                              background: '#171717',
                              color: '#fff',
                              border: 0,
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            بيع 1
                          </button>
                          <button
                            type="button"
                            disabled={saving || cell.onHand <= 0}
                            onClick={() =>
                              handleQuickSkuAction(row.design_key, sz, 'gift')
                            }
                            style={{
                              background: '#f0ede6',
                              color: '#171717',
                              border: '1px solid #ccc',
                              borderRadius: '6px',
                              padding: '4px 7px',
                              fontSize: '11px',
                            }}
                          >
                            هدية
                          </button>
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 700 }}>
                    {row.mfgTotal}
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                    <b>{row.designSold}</b> مباع
                    {row.designGifted > 0 ? ` + ${row.designGifted} هدية` : ''}
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
                    {row.designOnHand}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#faf9f5', fontWeight: 800, borderTop: '2px solid #171717' }}>
                <td style={{ padding: '12px' }} colSpan={2}>
                  الإجمالي الكلي للبراند
                </td>
                {SIZES.map((sz) => {
                  const sumSz = inventoryStats.designRows.reduce(
                    (a, r) => a + r.bySize[sz].onHand,
                    0
                  );
                  return (
                    <td key={sz} style={{ padding: '12px', textAlign: 'center', fontSize: '16px' }}>
                      {sumSz}
                    </td>
                  );
                })}
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {inventoryStats.totalManufactured}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {inventoryStats.totalSold} بيع + {inventoryStats.totalGifted} هدية
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px' }}>
                  {inventoryStats.totalClassifiedOnHand} (الفعلي بعد خصم غير المحدد:{' '}
                  <span style={{ color: '#b94c4c' }}>{inventoryStats.actualGlobalRemaining}</span>)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* UNRESOLVED HISTORICAL OUTGOING QUEUE (5 UNITS) */}
        {inventoryStats.unresolvedMovements.length > 0 && (
          <div
            style={{
              marginTop: '20px',
              background: '#fffbeb',
              border: '1px solid #f59e0b',
              borderRadius: '10px',
              padding: '16px',
            }}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#92400e' }}>
              ⚠️ مبيعات تاريخية غير محددة التصميم/المقاس ({inventoryStats.unresolvedMovements.length}{' '}
              قطع مخصومة من الإجمالي العام {inventoryStats.actualGlobalRemaining})
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#78350f' }}>
              بمجرد معرفة التصميم والمقاس لأي قطعة منها، اختره واضغط &quot;تخصيص&quot; ليتم خصمها من المقاس المحدد مع بقاء الإجمالي الفعلي {inventoryStats.actualGlobalRemaining} كما هو.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {inventoryStats.unresolvedMovements.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#fff',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #fde68a',
                  }}
                >
                  <div>
                    <strong>{m.note}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={unresolvedSelect[m.id] || ''}
                      onChange={(e) =>
                        setUnresolvedSelect((prev) => ({
                          ...prev,
                          [m.id]: e.target.value,
                        }))
                      }
                      style={{ padding: '6px 10px', borderRadius: '6px' }}
                    >
                      <option value="">-- اختر التصميم والمقاس --</option>
                      {ledger.designs.map((d) =>
                        SIZES.map((sz) => (
                          <option key={`${d.design_key}:${sz}`} value={`${d.design_key}:${sz}`}>
                            {d.name_ar} — مقاس {sz}
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleResolveMovement(m.id)}
                      style={{
                        background: '#171717',
                        color: '#fff',
                        border: 0,
                        padding: '7px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      تخصيص وخصم من المقاس
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MANUAL MOVEMENT FORM (SALE / GIFT / RETURN / RESTOCK / ADJUSTMENT) */}
        <form
          onSubmit={handleCustomMovementSubmit}
          style={{
            marginTop: '20px',
            background: '#faf9f5',
            border: '1px solid #e2dfd7',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>
            تسجيل حركة مخزون / بيع / هدية / مرتجع
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px',
              alignItems: 'end',
            }}
          >
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              نوع الحركة
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value as any)}
                style={{ padding: '9px' }}
              >
                <option value="sale">بيع (Sale - يخصم مخزون ويضيف ربح)</option>
                <option value="gift">هدية (Gift - يخصم مخزون بدون ربح)</option>
                <option value="return">مرتجع (Return - يرجع للمخزون ويخصم ربح)</option>
                <option value="restock">توريد إضافي (Restock - يزود المخزون)</option>
                <option value="adjustment">تسوية جرد (Adjustment)</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              التصميم
              <select
                value={actionDesign}
                onChange={(e) => setActionDesign(e.target.value as any)}
                style={{ padding: '9px' }}
              >
                {ledger.designs.map((d) => (
                  <option key={d.design_key} value={d.design_key}>
                    {d.name_ar}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              المقاس
              <select
                value={actionSize}
                onChange={(e) => setActionSize(e.target.value as any)}
                style={{ padding: '9px' }}
              >
                {SIZES.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              الكمية
              <input
                type="number"
                min="1"
                value={actionQty}
                onChange={(e) => setActionQty(Number(e.target.value))}
                style={{ padding: '9px' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              سعر القطعة (TRY)
              <input
                type="number"
                step="0.01"
                value={actionPrice}
                disabled={actionType === 'gift' || actionType === 'restock' || actionType === 'adjustment'}
                onChange={(e) => setActionPrice(Number(e.target.value))}
                style={{ padding: '9px' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              حالة المبلغ
              <select
                value={actionStatus}
                disabled={actionType !== 'sale'}
                onChange={(e) => setActionStatus(e.target.value as any)}
                style={{ padding: '9px' }}
              >
                <option value="confirmed">مؤكد / مقبوض</option>
                <option value="estimated_amount">تقديري (غير مقبوض بعد)</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              ملاحظة
              <input
                placeholder="اختياري..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                style={{ padding: '9px' }}
              />
            </label>

            <button
              type="submit"
              className="primary"
              disabled={saving}
              style={{ height: '40px', padding: '0 18px' }}
            >
              تسجيل الحركة +
            </button>
          </div>
        </form>

        {/* RECENT MOVEMENTS LOG WITH CANCEL/RESTORE */}
        <details style={{ marginTop: '16px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#444' }}>
            سجل حركات المخزون التفصيلي ({ledger.movements.length} حركة — يمكنك مسح أي حركة لإرجاع القطعة للمخزون)
          </summary>
          <div className="table-wrap" style={{ marginTop: '10px' }}>
            <table>
              <thead>
                <tr style={{ background: '#f5f5f3' }}>
                  <th>التاريخ</th>
                  <th>النوع</th>
                  <th>التصميم والمقاس</th>
                  <th>الأثر على المخزون</th>
                  <th>ملاحظات</th>
                  <th>إلغاء / استرجاع</th>
                </tr>
              </thead>
              <tbody>
                {ledger.movements.map((m) => (
                  <tr key={m.id}>
                    <td>{m.date || 'غير محدد'}</td>
                    <td>
                      <span className="status">{m.type}</span>
                    </td>
                    <td>{m.sku || 'غير محدد (Unresolved)'}</td>
                    <td
                      style={{
                        fontWeight: 700,
                        color: m.signed_delta < 0 ? '#b94c4c' : '#2b8a3e',
                      }}
                    >
                      {m.signed_delta > 0 ? `+${m.signed_delta}` : m.signed_delta}
                    </td>
                    <td>{m.note}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleDeleteMovement(m)}
                        className="danger"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        إلغاء وإرجاع للمخزون ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {/* ========================================================================
          SECTION 3: PRICING & CATALOG SIMULATOR (899 / 929 / 999 TRY)
          ======================================================================== */}
      <section className="admin-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '14px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>
              2) تسعير المنتجات ومحاكاة الهامش (Pricing & What-If)
            </h2>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              الأسعار المعتمدة حالياً: بلا عقارب (899₺)، من هنا الأصل (929₺)، على الحرية الحمراء باب (999₺). تعديل السعر هنا لا يغيّر المبيعات التاريخية السابقة.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              persistLedger(ledger, {
                syncPrices: true,
                msg: 'تم نشر الأسعار المعتمدة إلى المتجر العام بنجاح ✓',
              })
            }
            style={{
              background: '#6E705B',
              color: '#fff',
              border: 0,
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            حفظ ونشر الأسعار للمتجر ✓
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr style={{ background: '#f5f5f3' }}>
                <th>التصميم</th>
                <th>سعر البيع الفعلي (TRY)</th>
                <th>تكلفة تصنيع القطعة (اختياري TRY)</th>
                <th>نسبة محاكاة إضافية % (What-If)</th>
                <th>السعر بعد المحاكاة</th>
                <th>هامش الربح التقديري للقطعة</th>
              </tr>
            </thead>
            <tbody>
              {ledger.designs.map((d, idx) => {
                const simulated =
                  d.sale_price_try * (1 + Number(d.optional_markup_percent || 0) / 100);
                const margin =
                  d.manufacturing_unit_cost_try != null && d.manufacturing_unit_cost_try > 0
                    ? d.sale_price_try - d.manufacturing_unit_cost_try
                    : null;

                return (
                  <tr key={d.design_key}>
                    <td>
                      <strong>{d.name_ar}</strong>
                    </td>
                    <td>
                      <input
                        type="number"
                        step="1"
                        value={d.sale_price_try}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setLedger((prev) => ({
                            ...prev,
                            designs: prev.designs.map((item, i) =>
                              i === idx ? { ...item, sale_price_try: val } : item
                            ),
                          }));
                        }}
                        style={{ width: '110px', padding: '7px', fontWeight: 700 }}
                      />{' '}
                      TL
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="غير محدد بعد"
                        value={d.manufacturing_unit_cost_try ?? ''}
                        onChange={(e) => {
                          const val =
                            e.target.value === '' ? null : Number(e.target.value);
                          setLedger((prev) => ({
                            ...prev,
                            designs: prev.designs.map((item, i) =>
                              i === idx
                                ? { ...item, manufacturing_unit_cost_try: val }
                                : item
                            ),
                          }));
                        }}
                        style={{ width: '130px', padding: '7px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        value={d.optional_markup_percent}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setLedger((prev) => ({
                            ...prev,
                            designs: prev.designs.map((item, i) =>
                              i === idx
                                ? { ...item, optional_markup_percent: val }
                                : item
                            ),
                          }));
                        }}
                        style={{ width: '90px', padding: '7px' }}
                      />{' '}
                      %
                    </td>
                    <td style={{ fontWeight: 600, color: '#555' }}>
                      {simulated.toFixed(2)} TL
                    </td>
                    <td style={{ fontWeight: 700, color: margin != null ? '#2b8a3e' : '#888' }}>
                      {margin != null
                        ? `${margin.toFixed(2)} TL (${((margin / d.sale_price_try) * 100).toFixed(1)}%)`
                        : 'بانتظار تحديد تكلفة القطعة'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================
          SECTION 4: EXPENSES & REVENUES LEDGER
          ======================================================================== */}
      <section className="admin-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>
              3) سجل المصاريف والإيرادات (Financial Transactions)
            </h2>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              كل معاملة تحتفظ بعملتها الأصلية (USD أو TRY) ويتم تحويلها فورياً حسب سعر الصرف المرجعي ({rate} TRY).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              style={{ padding: '7px 10px' }}
            >
              <option value="all">كل الأنواع (مصاريف + مبيعات)</option>
              <option value="expense">المصاريف فقط (Expenses)</option>
              <option value="income">المبيعات والإيرادات فقط (Income)</option>
            </select>

            <select
              value={filterCurrency}
              onChange={(e) => setFilterCurrency(e.target.value as any)}
              style={{ padding: '7px 10px' }}
            >
              <option value="all">كل العملات (TRY + USD)</option>
              <option value="TRY">الليرة التركية (TRY)</option>
              <option value="USD">الدولار (USD)</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ padding: '7px 10px' }}
            >
              <option value="all">كل التصنيفات</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ADD NEW EXPENSE / INCOME FORM */}
        <form
          onSubmit={handleAddTransaction}
          style={{
            background: '#faf9f5',
            border: '1px solid #e2dfd7',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
            gap: '10px',
            alignItems: 'end',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            البند / الوصف
            <input required name="title" placeholder="مثال: إعلانات ميتا / شحن..." style={{ padding: '8px' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            النوع
            <select name="type" style={{ padding: '8px' }}>
              <option value="expense">مصروف (Expense)</option>
              <option value="income">إيراد / بيع (Income)</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            التصنيف
            <input name="category" defaultValue="إعلانات وتسويق" style={{ padding: '8px' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            المبلغ الأصلي
            <input required type="number" step="0.01" name="amount" placeholder="0.00" style={{ padding: '8px' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            العملة
            <select name="currency" style={{ padding: '8px' }}>
              <option value="TRY">TRY (ليرة)</option>
              <option value="USD">USD (دولار)</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            الحالة
            <select name="status" style={{ padding: '8px' }}>
              <option value="confirmed">مؤكد / مدفوع</option>
              <option value="estimated_amount">تقديري</option>
              <option value="no_charge">بدون مقابل (هدية)</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            التاريخ
            <input
              type="date"
              name="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              style={{ padding: '8px' }}
            />
          </label>
          <button type="submit" className="primary" style={{ height: '38px' }}>
            + إضافة بند
          </button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr style={{ background: '#f5f5f3' }}>
                <th>التاريخ</th>
                <th>البند</th>
                <th>التصنيف</th>
                <th>المبلغ الأصلي</th>
                <th>المعادل بالليرة (TRY)</th>
                <th>المعادل بالدولار (USD)</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((t) => {
                const tryVal =
                  t.currency_original === 'USD'
                    ? t.amount_original * rate
                    : t.amount_original;
                const usdVal =
                  t.currency_original === 'TRY'
                    ? t.amount_original / rate
                    : t.amount_original;

                return (
                  <tr key={t.id}>
                    <td style={{ whiteSpace: 'nowrap', color: '#666' }}>
                      {t.date || 'غير محدد'}
                    </td>
                    <td>
                      <strong>{t.title}</strong>
                      {t.details && (
                        <small style={{ display: 'block', color: '#777' }}>{t.details}</small>
                      )}
                    </td>
                    <td>{t.category}</td>
                    <td style={{ fontWeight: 700, direction: 'ltr', textAlign: 'right' }}>
                      {fmtMoney(t.amount_original, t.currency_original)}
                    </td>
                    <td
                      style={{
                        fontWeight: 700,
                        color: t.type === 'expense' ? '#b94c4c' : '#2b8a3e',
                        direction: 'ltr',
                        textAlign: 'right',
                      }}
                    >
                      {t.type === 'expense' ? '-' : '+'}
                      {fmtMoney(tryVal, 'TRY')}
                    </td>
                    <td style={{ color: '#666', direction: 'ltr', textAlign: 'right' }}>
                      {fmtMoney(usdVal, 'USD')}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleTxStatus(t)}
                        title="اضغط للتبديل بين مؤكد وتقديري"
                        style={{
                          border: '1px solid #ddd',
                          borderRadius: '99px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background:
                            t.status === 'confirmed'
                              ? '#d8f0dc'
                              : t.status === 'estimated_amount'
                              ? '#fff0b8'
                              : '#eee',
                        }}
                      >
                        {t.status === 'confirmed'
                          ? 'مؤكد ✓'
                          : t.status === 'estimated_amount'
                          ? 'تقديري (Estimated)'
                          : 'بدون مقابل (Gift)'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleDeleteTransaction(t)}
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

        {/* FORECAST OPERATING BUDGET INFO CARD (EXCLUDED FROM ACTUAL EXPENSES) */}
        <div
          style={{
            marginTop: '18px',
            background: '#f5f5f3',
            border: '1px solid #ddd',
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <strong>الميزانية التشغيلية والتسويقية التقديرية القادمة (Forecast Only — غير مضافة للمصاريف الفعلية):</strong>
            <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
              إعلانات ميتا: 21,000₺ | أجور لوجستيات (3 أشهر): 4,500₺ | تصوير: 6,000₺ | احتياطي: 3,745₺ —{' '}
              <b>الإجمالي المخطط: 35,245₺</b>
            </div>
          </div>
          <span
            style={{
              background: '#e5e5e0',
              padding: '6px 12px',
              borderRadius: '99px',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            مخطط مستقبلي (معزول عن رأس المال المصروف)
          </span>
        </div>
      </section>

      {/* ========================================================================
          SECTION 5: SUPPLIERS DIRECTORY
          ======================================================================== */}
      <section className="admin-card">
        <h2 style={{ margin: '0 0 6px', fontSize: '20px' }}>4) دليل الموردين والمصانع (Suppliers)</h2>
        <p className="muted" style={{ margin: '0 0 14px' }}>
          سجّل بيانات المصانع وموردي القماش والتغليف والطباعة للرجوع إليها بسهولة.
        </p>

        <form
          onSubmit={handleAddSupplier}
          style={{
            background: '#faf9f5',
            border: '1px solid #e2dfd7',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '10px',
            alignItems: 'end',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            اسم المورد
            <input required name="name" placeholder="اسم المصنع / المورد" style={{ padding: '8px' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            الخدمة التي يوردها
            <input required name="service" placeholder="تصنيع / ليبل / كروت..." style={{ padding: '8px' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            العنوان الفعلي
            <input name="address" placeholder="المدينة / المنطقة" style={{ padding: '8px' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            رقم الهاتف
            <input name="phone" placeholder="+90..." dir="ltr" style={{ padding: '8px' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            ملاحظات
            <input name="notes" placeholder="ملاحظات..." style={{ padding: '8px' }} />
          </label>
          <button type="submit" className="primary" style={{ height: '38px' }}>
            + إضافة مورد
          </button>
        </form>

        {ledger.suppliers.length === 0 ? (
          <p className="muted" style={{ padding: '12px 0', margin: 0 }}>
            لا يوجد موردون مسجلون حالياً. يمكنك إضافة الموردين من النموذج أعلاه.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr style={{ background: '#f5f5f3' }}>
                  <th>اسم المورد</th>
                  <th>الخدمة الموردة</th>
                  <th>العنوان الفعلي</th>
                  <th>رقم الهاتف</th>
                  <th>ملاحظات</th>
                  <th>مسح</th>
                </tr>
              </thead>
              <tbody>
                {ledger.suppliers.map((sup) => (
                  <tr key={sup.id}>
                    <td>
                      <strong>{sup.name}</strong>
                    </td>
                    <td>{sup.service}</td>
                    <td>{sup.address || '-'}</td>
                    <td dir="ltr">{sup.phone || '-'}</td>
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
    </div>
  );
}
