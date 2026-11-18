export type CurrencyCode = 'TRY' | 'USD';

export type TransactionStatus = 'confirmed' | 'estimated_amount' | 'no_charge' | 'void';

export type FinancialTransaction = {
  id: string;
  title: string;
  type: 'expense' | 'income';
  category: string;
  amount_original: number;
  currency_original: CurrencyCode;
  date: string | null;
  details?: string;
  status: TransactionStatus;
  source: 'historical' | 'manual' | 'store_order';
  external_reference?: string;
  order_id?: string;
  variant_sku?: string;
  fx_rate_at_transaction?: number;
  created_at: string;
};

export type InventoryMovementType = 'sale' | 'gift' | 'return' | 'restock' | 'adjustment';

export type InventoryMovement = {
  id: string;
  sku: string | null; // null if unresolved historical sale
  design_key: string | null; // 'bila_aqarib' | 'min_huna' | 'walilhurriya' | null
  size: 'S' | 'M' | 'L' | 'XL' | null;
  type: InventoryMovementType;
  qty: number;
  signed_delta: number; // negative for sale/gift, positive for return/restock
  date: string | null;
  financial_transaction_id?: string;
  order_id?: string;
  note?: string;
  source: 'historical' | 'manual' | 'store_order';
};

export type SupplierEntry = {
  id: string;
  name: string;
  service: string;
  address: string;
  phone: string;
  notes: string;
};

export type DesignCatalogConfig = {
  design_key: 'bila_aqarib' | 'min_huna' | 'walilhurriya';
  name_ar: string;
  slug: string;
  product_id: string;
  sale_price_try: number;
  manufacturing_unit_cost_try: number | null;
  optional_markup_percent: number;
  initial_stock: { S: number; M: number; L: number; XL: number };
};

export type DuthurFinanceLedger = {
  version: number;
  fx_rate_usd_try: number; // default 50.35
  planned_gifts_count: number; // default 20
  forecast_budget_try: number; // default 35245
  designs: DesignCatalogConfig[];
  transactions: FinancialTransaction[];
  movements: InventoryMovement[];
  suppliers: SupplierEntry[];
  store_prices_synced?: boolean;
};

export const INITIAL_DESIGNS: DesignCatalogConfig[] = [
  {
    design_key: 'bila_aqarib',
    name_ar: 'بلا عقارب',
    slug: 'duthur-bila-aqarib-oversize-tshirt',
    product_id: 'cb651880-c17e-4c30-98dd-f3ad4a43ddc2',
    sale_price_try: 899,
    manufacturing_unit_cost_try: null,
    optional_markup_percent: 2.5,
    initial_stock: { S: 14, M: 24, L: 24, XL: 10 }, // Total 72
  },
  {
    design_key: 'min_huna',
    name_ar: 'من هنا الأصل',
    slug: 'duthur-min-huna-alasl-oversize-tshirt',
    product_id: '0109649c-ccb1-41e3-bcf4-16cb7b7295dd',
    sale_price_try: 929,
    manufacturing_unit_cost_try: null,
    optional_markup_percent: 2.5,
    initial_stock: { S: 16, M: 29, L: 25, XL: 10 }, // Total 80
  },
  {
    design_key: 'walilhurriya',
    name_ar: 'على الحرية الحمراء باب',
    slug: 'duthur-walilhurriya-alhamra-bab-oversize-tshirt',
    product_id: '6e4f7f49-892b-4595-a48e-c77ba50d7c21',
    sale_price_try: 999,
    manufacturing_unit_cost_try: null,
    optional_markup_percent: 2.5,
    initial_stock: { S: 20, M: 34, L: 37, XL: 9 }, // Total 100
  },
];

export const INITIAL_EXPENSES: FinancialTransaction[] = [
  { id: 'exp-1', date: '2026-05-14', title: 'باقي دفعة تصنيع 1', type: 'expense', category: 'تصنيع وإنتاج', amount_original: 1200.00, currency_original: 'USD', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-05-14T10:00:00Z' },
  { id: 'exp-2', date: '2026-06-25', title: 'باقي دفعة تصنيع 2', type: 'expense', category: 'تصنيع وإنتاج', amount_original: 600.00, currency_original: 'USD', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-25T10:00:00Z' },
  { id: 'exp-3', date: '2026-06-25', title: 'دفعة تصنيع إضافية', type: 'expense', category: 'تصنيع وإنتاج', amount_original: 9250.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-25T11:00:00Z' },
  { id: 'exp-4', date: '2026-05-20', title: '200 كارت شكر', type: 'expense', category: 'تغليف ومطبوعات', amount_original: 900.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-05-20T10:00:00Z' },
  { id: 'exp-5', date: '2026-04-28', title: 'عينة أولى', type: 'expense', category: 'تصنيع وإنتاج', amount_original: 500.00, currency_original: 'USD', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-04-28T10:00:00Z' },
  { id: 'exp-6', date: '2026-04-15', title: 'Tech Pack & Pattern', type: 'expense', category: 'تصميم وباترون', amount_original: 3590.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-04-15T10:00:00Z' },
  { id: 'exp-7', date: '2026-05-13', title: '2000 ليبل رقبة وعناية', type: 'expense', category: 'تغليف ومطبوعات', amount_original: 2150.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-05-13T10:00:00Z' },
  { id: 'exp-8', date: '2026-04-30', title: 'ستكرات البراند', type: 'expense', category: 'تغليف ومطبوعات', amount_original: 840.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-04-30T10:00:00Z' },
  { id: 'exp-9', date: '2026-04-16', title: 'Domain Duthur.co', type: 'expense', category: 'اشتراكات وتقنية', amount_original: 16.40, currency_original: 'USD', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-04-16T10:00:00Z' },
  { id: 'exp-10', date: '2026-05-05', title: 'ChatGPT May', type: 'expense', category: 'اشتراكات وتقنية', amount_original: 24.00, currency_original: 'USD', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-05-05T10:00:00Z' },
  { id: 'exp-11', date: '2026-06-05', title: 'ChatGPT June', type: 'expense', category: 'اشتراكات وتقنية', amount_original: 24.00, currency_original: 'USD', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-05T10:00:00Z' },
  { id: 'exp-12', date: '2026-05-21', title: 'Meta Ads — Paid', type: 'expense', category: 'إعلانات وتسويق', amount_original: 102.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-05-21T10:00:00Z' },
  { id: 'exp-13', date: '2026-05-21', title: 'Meta Ads — Paid', type: 'expense', category: 'إعلانات وتسويق', amount_original: 110.40, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-05-21T11:00:00Z' },
  { id: 'exp-14', date: '2026-06-28', title: 'Meta Ads — Paid', type: 'expense', category: 'إعلانات وتسويق', amount_original: 1.51, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-28T10:00:00Z' },
  { id: 'exp-15', date: '2026-06-28', title: 'Meta Ads — Paid', type: 'expense', category: 'إعلانات وتسويق', amount_original: 159.37, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-28T11:00:00Z' },
  { id: 'exp-16', date: '2026-06-29', title: 'Meta Ads — Paid', type: 'expense', category: 'إعلانات وتسويق', amount_original: 158.40, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-29T10:00:00Z' },
  { id: 'exp-17', date: '2026-06-29', title: 'Meta Ads — Paid', type: 'expense', category: 'إعلانات وتسويق', amount_original: 158.40, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-29T11:00:00Z' },
  { id: 'exp-18', date: '2026-06-30', title: 'Meta Ads — Paid', type: 'expense', category: 'إعلانات وتسويق', amount_original: 201.60, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-30T10:00:00Z' },
  { id: 'exp-19', date: '2026-07-01', title: 'Meta Ads — Paid', type: 'expense', category: 'إعلانات وتسويق', amount_original: 231.14, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-07-01T10:00:00Z' },
  { id: 'exp-20', date: '2026-07-03', title: 'Meta Ads — Paid', type: 'expense', category: 'إعلانات وتسويق', amount_original: 235.55, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-07-03T10:00:00Z' },
  { id: 'exp-21', date: '2026-07-05', title: 'Meta Ads — Paid', type: 'expense', category: 'إعلانات وتسويق', amount_original: 414.50, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-07-05T10:00:00Z' },
  { id: 'exp-22', date: '2026-07-12', title: 'Meta Ads — Paid', type: 'expense', category: 'إعلانات وتسويق', amount_original: 472.44, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-07-12T10:00:00Z' },
  { id: 'exp-23', date: '2026-07-21', title: 'Meta Ads — Paid', type: 'expense', category: 'إعلانات وتسويق', amount_original: 684.88, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-07-21T10:00:00Z' },
  { id: 'exp-24', date: '2026-08-21', title: 'Meta Ads — Paid', type: 'expense', category: 'إعلانات وتسويق', amount_original: 607.97, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-08-21T10:00:00Z' },
];

export const INITIAL_SALES_TRANSACTIONS: FinancialTransaction[] = [
  { id: 'inc-1', date: '2026-05-26', title: 'بيع: على الحرية الحمراء باب (L)', type: 'income', category: 'مبيعات', amount_original: 1049.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', variant_sku: 'walilhurriya:L', created_at: '2026-05-26T10:00:00Z' },
  { id: 'inc-2', date: '2026-06-25', title: 'بيع: من هنا الأصل (L)', type: 'income', category: 'مبيعات', amount_original: 999.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', variant_sku: 'min_huna:L', created_at: '2026-06-25T10:00:00Z' },
  { id: 'inc-3', date: '2026-06-26', title: 'بيع: بلا عقارب (S)', type: 'income', category: 'مبيعات', amount_original: 950.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', variant_sku: 'bila_aqarib:S', created_at: '2026-06-26T10:00:00Z' },
  { id: 'inc-4', date: '2026-06-26', title: 'بيع: من هنا الأصل (L)', type: 'income', category: 'مبيعات', amount_original: 999.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', variant_sku: 'min_huna:L', created_at: '2026-06-26T11:00:00Z' },
  { id: 'inc-5', date: '2026-06-26', title: 'بيع: على الحرية الحمراء باب (S)', type: 'income', category: 'مبيعات', amount_original: 1049.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', variant_sku: 'walilhurriya:S', created_at: '2026-06-26T12:00:00Z' },
  { id: 'inc-6', date: '2026-06-30', title: 'هدية ترويجية: بلا عقارب (S)', type: 'income', category: 'هدية', amount_original: 0.00, currency_original: 'TRY', status: 'no_charge', source: 'historical', variant_sku: 'bila_aqarib:S', created_at: '2026-06-30T10:00:00Z' },
  { id: 'inc-7', date: '2026-07-02', title: 'بيع: بلا عقارب (L)', type: 'income', category: 'مبيعات', amount_original: 950.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', variant_sku: 'bila_aqarib:L', created_at: '2026-07-02T10:00:00Z' },
  { id: 'inc-8', date: '2026-07-02', title: 'بيع: على الحرية الحمراء باب (M)', type: 'income', category: 'مبيعات', amount_original: 1049.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', variant_sku: 'walilhurriya:M', created_at: '2026-07-02T11:00:00Z' },
  { id: 'inc-9', date: '2026-07-02', title: 'بيع: على الحرية الحمراء باب (M)', type: 'income', category: 'مبيعات', amount_original: 1219.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', variant_sku: 'walilhurriya:M', created_at: '2026-07-02T12:00:00Z' },
  { id: 'inc-10', date: null, title: 'بيع: على الحرية الحمراء باب (XL)', type: 'income', category: 'مبيعات', amount_original: 1049.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', variant_sku: 'walilhurriya:XL', created_at: '2026-07-10T10:00:00Z' },
  { id: 'inc-11', date: null, title: 'بيع تاريخي (تصميم/مقاس غير محدد #1)', type: 'income', category: 'مبيعات', amount_original: 870.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', variant_sku: undefined, created_at: '2026-07-15T10:00:00Z' },
  { id: 'inc-12', date: null, title: 'بيع تاريخي (تصميم/مقاس غير محدد #2)', type: 'income', category: 'مبيعات', amount_original: 850.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', variant_sku: undefined, created_at: '2026-07-15T11:00:00Z' },
  { id: 'inc-13', date: null, title: 'بيع تاريخي تقديري (غير محدد #3)', type: 'income', category: 'مبيعات تقديرية', amount_original: 900.00, currency_original: 'TRY', status: 'estimated_amount', source: 'historical', variant_sku: undefined, created_at: '2026-07-20T10:00:00Z' },
  { id: 'inc-14', date: null, title: 'بيع تاريخي تقديري (غير محدد #4)', type: 'income', category: 'مبيعات تقديرية', amount_original: 900.00, currency_original: 'TRY', status: 'estimated_amount', source: 'historical', variant_sku: undefined, created_at: '2026-07-20T11:00:00Z' },
  { id: 'inc-15', date: null, title: 'بيع تاريخي تقديري (غير محدد #5)', type: 'income', category: 'مبيعات تقديرية', amount_original: 900.00, currency_original: 'TRY', status: 'estimated_amount', source: 'historical', variant_sku: undefined, created_at: '2026-07-20T12:00:00Z' },
];

export const INITIAL_MOVEMENTS: InventoryMovement[] = [
  { id: 'mov-1', sku: 'walilhurriya:L', design_key: 'walilhurriya', size: 'L', type: 'sale', qty: 1, signed_delta: -1, date: '2026-05-26', financial_transaction_id: 'inc-1', source: 'historical', note: 'بيع مؤكد (1,049 TL)' },
  { id: 'mov-2', sku: 'min_huna:L', design_key: 'min_huna', size: 'L', type: 'sale', qty: 1, signed_delta: -1, date: '2026-06-25', financial_transaction_id: 'inc-2', source: 'historical', note: 'بيع مؤكد (999 TL)' },
  { id: 'mov-3', sku: 'bila_aqarib:S', design_key: 'bila_aqarib', size: 'S', type: 'sale', qty: 1, signed_delta: -1, date: '2026-06-26', financial_transaction_id: 'inc-3', source: 'historical', note: 'بيع مؤكد (950 TL)' },
  { id: 'mov-4', sku: 'min_huna:L', design_key: 'min_huna', size: 'L', type: 'sale', qty: 1, signed_delta: -1, date: '2026-06-26', financial_transaction_id: 'inc-4', source: 'historical', note: 'بيع مؤكد (999 TL)' },
  { id: 'mov-5', sku: 'walilhurriya:S', design_key: 'walilhurriya', size: 'S', type: 'sale', qty: 1, signed_delta: -1, date: '2026-06-26', financial_transaction_id: 'inc-5', source: 'historical', note: 'بيع مؤكد (1,049 TL)' },
  { id: 'mov-6', sku: 'bila_aqarib:S', design_key: 'bila_aqarib', size: 'S', type: 'gift', qty: 1, signed_delta: -1, date: '2026-06-30', financial_transaction_id: 'inc-6', source: 'historical', note: 'هدية بدون مقابل (0 TL)' },
  { id: 'mov-7', sku: 'bila_aqarib:L', design_key: 'bila_aqarib', size: 'L', type: 'sale', qty: 1, signed_delta: -1, date: '2026-07-02', financial_transaction_id: 'inc-7', source: 'historical', note: 'بيع مؤكد (950 TL)' },
  { id: 'mov-8', sku: 'walilhurriya:M', design_key: 'walilhurriya', size: 'M', type: 'sale', qty: 1, signed_delta: -1, date: '2026-07-02', financial_transaction_id: 'inc-8', source: 'historical', note: 'بيع مؤكد (1,049 TL)' },
  { id: 'mov-9', sku: 'walilhurriya:M', design_key: 'walilhurriya', size: 'M', type: 'sale', qty: 1, signed_delta: -1, date: '2026-07-02', financial_transaction_id: 'inc-9', source: 'historical', note: 'بيع مؤكد (1,219 TL)' },
  { id: 'mov-10', sku: 'walilhurriya:XL', design_key: 'walilhurriya', size: 'XL', type: 'sale', qty: 1, signed_delta: -1, date: null, financial_transaction_id: 'inc-10', source: 'historical', note: 'بيع مؤكد (1,049 TL)' },
  { id: 'mov-11', sku: null, design_key: null, size: null, type: 'sale', qty: 1, signed_delta: -1, date: null, financial_transaction_id: 'inc-11', source: 'historical', note: 'بيع مؤكد (870 TL) — بانتظار تحديد التيشيرت والمقاس' },
  { id: 'mov-12', sku: null, design_key: null, size: null, type: 'sale', qty: 1, signed_delta: -1, date: null, financial_transaction_id: 'inc-12', source: 'historical', note: 'بيع مؤكد (850 TL) — بانتظار تحديد التيشيرت والمقاس' },
  { id: 'mov-13', sku: null, design_key: null, size: null, type: 'sale', qty: 1, signed_delta: -1, date: null, financial_transaction_id: 'inc-13', source: 'historical', note: 'بيع تقديري (900 TL) — بانتظار تحديد التيشيرت والمقاس' },
  { id: 'mov-14', sku: null, design_key: null, size: null, type: 'sale', qty: 1, signed_delta: -1, date: null, financial_transaction_id: 'inc-14', source: 'historical', note: 'بيع تقديري (900 TL) — بانتظار تحديد التيشيرت والمقاس' },
  { id: 'mov-15', sku: null, design_key: null, size: null, type: 'sale', qty: 1, signed_delta: -1, date: null, financial_transaction_id: 'inc-15', source: 'historical', note: 'بيع تقديري (900 TL) — بانتظار تحديد التيشيرت والمقاس' },
];

export const DEFAULT_FINANCE_LEDGER: DuthurFinanceLedger = {
  version: 1,
  fx_rate_usd_try: 50.35,
  planned_gifts_count: 20,
  forecast_budget_try: 35245,
  designs: INITIAL_DESIGNS,
  transactions: [...INITIAL_EXPENSES, ...INITIAL_SALES_TRANSACTIONS],
  movements: INITIAL_MOVEMENTS,
  suppliers: [],
  store_prices_synced: false,
};
