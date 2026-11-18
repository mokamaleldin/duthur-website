export type CurrencyCode = 'TRY' | 'USD';

export type SaleClassification =
  | 'shopify_confirmed'
  | 'manual_confirmed'
  | 'duplicate'
  | 'estimated_unverified'
  | 'personal_withdrawal'
  | 'gift'
  | 'pending_review'
  | 'excluded_shopify';

export type TransactionStatus =
  | 'confirmed'
  | 'estimated_amount'
  | 'no_charge'
  | 'void'
  | 'duplicate_archived'
  | 'pending_review';

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
  classification?: SaleClassification;
  source: 'historical' | 'manual' | 'store_order' | 'shopify';
  external_reference?: string;
  order_id?: string;
  variant_sku?: string; // e.g. 'bila_aqarib:S' or 'bila_aqarib:PENDING' or undefined
  qty?: number;
  fx_rate_at_transaction?: number;
  created_at: string;
};

export type InventoryMovementType =
  | 'sale'
  | 'gift'
  | 'personal_use'
  | 'return'
  | 'restock'
  | 'damaged'
  | 'adjustment';

export type InventoryMovement = {
  id: string;
  sku: string | null; // e.g. 'bila_aqarib:S'; null if unallocated
  design_key: 'bila_aqarib' | 'min_huna' | 'walilhurriya' | null;
  size: 'S' | 'M' | 'L' | 'XL' | null;
  type: InventoryMovementType;
  qty: number;
  signed_delta: number; // negative for sale/gift/personal_use, positive for return/restock
  date: string | null;
  financial_transaction_id?: string;
  order_id?: string;
  note?: string;
  source: 'historical' | 'manual' | 'store_order' | 'shopify';
  archived?: boolean;
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
  name_en: string;
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
  planned_gifts_count: number; // default 20 (planned marketing, not deducted)
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
    name_en: 'Bila Aqarib',
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
    name_en: 'Min Huna Al-Asl',
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
    name_en: 'Walilhurriya Alhamra Bab',
    slug: 'duthur-walilhurriya-alhamra-bab-oversize-tshirt',
    product_id: '6e4f7f49-892b-4595-a48e-c77ba50d7c21',
    sale_price_try: 999,
    manufacturing_unit_cost_try: null,
    optional_markup_percent: 2.5,
    initial_stock: { S: 20, M: 34, L: 37, XL: 9 }, // Total 100
  },
];

// 24 Documented Expenses: $2,364.40 USD + 20,268.16 TRY = 139,315.70 TRY at 50.35
export const INITIAL_EXPENSES: FinancialTransaction[] = [
  { id: 'exp-1', date: '2026-05-14', title: 'باقي دفعة تصنيع 1', type: 'expense', category: 'تشغيل وتطوير', amount_original: 1200.00, currency_original: 'USD', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-05-14T10:00:00Z' },
  { id: 'exp-2', date: '2026-06-25', title: 'باقي دفعة تصنيع 2', type: 'expense', category: 'تشغيل وتطوير', amount_original: 600.00, currency_original: 'USD', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-25T10:00:00Z' },
  { id: 'exp-3', date: '2026-06-25', title: 'دفعة تصنيع إضافية', type: 'expense', category: 'تشغيل وتطوير', amount_original: 9250.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-25T11:00:00Z' },
  { id: 'exp-4', date: '2026-05-20', title: '200 كارت شكر', type: 'expense', category: 'رسوم تجهيز', amount_original: 900.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-05-20T10:00:00Z' },
  { id: 'exp-5', date: '2026-04-28', title: 'عينة أولى', type: 'expense', category: 'تشغيل وتطوير', amount_original: 500.00, currency_original: 'USD', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-04-28T10:00:00Z' },
  { id: 'exp-6', date: '2026-04-15', title: 'Tech Pack & Pattern', type: 'expense', category: 'تطوير خاص', amount_original: 3590.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-04-15T10:00:00Z' },
  { id: 'exp-7', date: '2026-05-13', title: '2000 ليبل رقبة وعناية', type: 'expense', category: 'رسوم تجهيز', amount_original: 2150.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-05-13T10:00:00Z' },
  { id: 'exp-8', date: '2026-04-30', title: 'ستكرات البراند', type: 'expense', category: 'رسوم تجهيز', amount_original: 840.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-04-30T10:00:00Z' },
  { id: 'exp-9', date: '2026-04-16', title: 'Domain Duthur.co', type: 'expense', category: 'اشتراك شهري', amount_original: 16.40, currency_original: 'USD', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-04-16T10:00:00Z' },
  { id: 'exp-10', date: '2026-05-05', title: 'ChatGPT May', type: 'expense', category: 'اشتراك شهري', amount_original: 24.00, currency_original: 'USD', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-05-05T10:00:00Z' },
  { id: 'exp-11', date: '2026-06-05', title: 'ChatGPT June', type: 'expense', category: 'اشتراك شهري', amount_original: 24.00, currency_original: 'USD', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-05T10:00:00Z' },
  { id: 'exp-12', date: '2026-05-21', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 102.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-05-21T10:00:00Z' },
  { id: 'exp-13', date: '2026-05-21', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 110.40, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-05-21T11:00:00Z' },
  { id: 'exp-14', date: '2026-06-28', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 1.51, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-28T10:00:00Z' },
  { id: 'exp-15', date: '2026-06-28', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 159.37, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-28T11:00:00Z' },
  { id: 'exp-16', date: '2026-06-29', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 158.40, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-29T10:00:00Z' },
  { id: 'exp-17', date: '2026-06-29', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 158.40, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-29T11:00:00Z' },
  { id: 'exp-18', date: '2026-06-30', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 201.60, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-06-30T10:00:00Z' },
  { id: 'exp-19', date: '2026-07-01', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 231.14, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-07-01T10:00:00Z' },
  { id: 'exp-20', date: '2026-07-03', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 235.55, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-07-03T10:00:00Z' },
  { id: 'exp-21', date: '2026-07-05', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 414.50, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-07-05T10:00:00Z' },
  { id: 'exp-22', date: '2026-07-12', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 472.44, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-07-12T10:00:00Z' },
  { id: 'exp-23', date: '2026-07-21', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 684.88, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-07-21T10:00:00Z' },
  { id: 'exp-24', date: '2026-08-21', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 607.97, currency_original: 'TRY', status: 'confirmed', source: 'historical', fx_rate_at_transaction: 50.35, created_at: '2026-08-21T10:00:00Z' },
];

// ============================================================================
// RECONCILED SALES & AUDIT RECORDS
// 1) 12 Paid Shopify Orders = 13 T-shirts = 13,703.48 TRY
// 2) 2 Confirmed Manual Sales = 2 T-shirts = 1,828.00 TRY (899 + 929)
//    -> Total Confirmed Revenue = 15,531.48 TRY (15 T-shirts sold)
// 3) Archived Duplicates (9 manual rows that overlapped with Shopify orders)
// 4) Archived Estimated Sales (3 x 900 TRY = 2,700 TRY — excluded from revenue & stock)
// 5) Pending Review (870 TRY & 850 TRY — excluded from confirmed totals until verified)
// 6) Excluded Shopify Orders (#d1008, #d1009, #d1012, #d1017, #d1018, #d1020)
// ============================================================================
export const INITIAL_SALES_TRANSACTIONS: FinancialTransaction[] = [
  // --- 12 CONFIRMED SHOPIFY ORDERS (13,703.48 TRY, 13 units) ---
  {
    id: 'shop-d1003',
    date: '2026-05-26',
    title: 'Shopify #d1003 — على الحرية الحمراء باب (L)',
    type: 'income',
    category: 'Shopify Confirmed Sale',
    amount_original: 1049.00,
    currency_original: 'TRY',
    status: 'confirmed',
    classification: 'shopify_confirmed',
    source: 'shopify',
    external_reference: '#d1003',
    variant_sku: 'walilhurriya:L',
    qty: 1,
    details: 'مطابق مع سجل 2026-05-26 (الحرية الحمراء L)',
    created_at: '2026-05-26T10:00:00Z',
  },
  {
    id: 'shop-d1004',
    date: '2026-06-26',
    title: 'Shopify #d1004 — من هنا الأصل (L)',
    type: 'income',
    category: 'Shopify Confirmed Sale',
    amount_original: 999.00,
    currency_original: 'TRY',
    status: 'confirmed',
    classification: 'shopify_confirmed',
    source: 'shopify',
    external_reference: '#d1004',
    variant_sku: 'min_huna:L',
    qty: 1,
    details: 'مطابق مع سجل 25/26 يونيو (من هنا الأصل L)',
    created_at: '2026-06-26T10:00:00Z',
  },
  {
    id: 'shop-d1005',
    date: '2026-06-26',
    title: 'Shopify #d1005 — (2× تيشيرت: من هنا الأصل L + الحرية الحمراء S)',
    type: 'income',
    category: 'Shopify Confirmed Sale',
    amount_original: 2048.00,
    currency_original: 'TRY',
    status: 'confirmed',
    classification: 'shopify_confirmed',
    source: 'shopify',
    external_reference: '#d1005',
    variant_sku: 'min_huna:L+walilhurriya:S',
    qty: 2,
    details: 'طلب مكون من تيشيرتين (999₺ + 1,049₺ = 2,048₺)',
    created_at: '2026-06-26T12:00:00Z',
  },
  {
    id: 'shop-d1006',
    date: '2026-07-01',
    title: 'Shopify #d1006 — (1× تيشيرت - Pending SKU Review)',
    type: 'income',
    category: 'Shopify Confirmed Sale',
    amount_original: 1219.00,
    currency_original: 'TRY',
    status: 'confirmed',
    classification: 'shopify_confirmed',
    source: 'shopify',
    external_reference: '#d1006',
    variant_sku: undefined,
    qty: 1,
    details: 'إجمالي الطلب 1,219₺ (غالباً يشمل شحن — بانتظار تأكيد التصميم/المقاس)',
    created_at: '2026-07-01T10:00:00Z',
  },
  {
    id: 'shop-d1007',
    date: '2026-07-01',
    title: 'Shopify #d1007 — بلا عقارب (S / L - Pending Verification)',
    type: 'income',
    category: 'Shopify Confirmed Sale',
    amount_original: 949.00,
    currency_original: 'TRY',
    status: 'confirmed',
    classification: 'shopify_confirmed',
    source: 'shopify',
    external_reference: '#d1007',
    variant_sku: 'bila_aqarib:L',
    qty: 1,
    details: 'مطابق مع السجل اليدوي المسجل قديماً بـ 950₺',
    created_at: '2026-07-01T12:00:00Z',
  },
  {
    id: 'shop-d1010',
    date: '2026-07-02',
    title: 'Shopify #d1010 — على الحرية الحمراء باب (M)',
    type: 'income',
    category: 'Shopify Confirmed Sale',
    amount_original: 1219.00,
    currency_original: 'TRY',
    status: 'confirmed',
    classification: 'shopify_confirmed',
    source: 'shopify',
    external_reference: '#d1010',
    variant_sku: 'walilhurriya:M',
    qty: 1,
    details: 'مطابق مع سجل 2026-07-02 (الحرية الحمراء M — 1,219₺)',
    created_at: '2026-07-02T11:00:00Z',
  },
  {
    id: 'shop-d1011',
    date: '2026-07-03',
    title: 'Shopify #d1011 — على الحرية الحمراء باب (M)',
    type: 'income',
    category: 'Shopify Confirmed Sale',
    amount_original: 1049.00,
    currency_original: 'TRY',
    status: 'confirmed',
    classification: 'shopify_confirmed',
    source: 'shopify',
    external_reference: '#d1011',
    variant_sku: 'walilhurriya:M',
    qty: 1,
    details: 'مطابق مع سجل الحرية الحمراء M (1,049₺)',
    created_at: '2026-07-03T10:00:00Z',
  },
  {
    id: 'shop-d1013',
    date: '2026-07-05',
    title: 'Shopify #d1013 — (1× تيشيرت - Pending SKU Review)',
    type: 'income',
    category: 'Shopify Confirmed Sale',
    amount_original: 923.12,
    currency_original: 'TRY',
    status: 'confirmed',
    classification: 'shopify_confirmed',
    source: 'shopify',
    external_reference: '#d1013',
    variant_sku: undefined,
    qty: 1,
    details: 'طلب مدفوع في Shopify — بانتظار تحديد التصميم والمقاس وتفصيل الشحن/الخصم',
    created_at: '2026-07-05T10:00:00Z',
  },
  {
    id: 'shop-d1014',
    date: '2026-07-05',
    title: 'Shopify #d1014 — (1× تيشيرت - Pending SKU Review)',
    type: 'income',
    category: 'Shopify Confirmed Sale',
    amount_original: 1093.12,
    currency_original: 'TRY',
    status: 'confirmed',
    classification: 'shopify_confirmed',
    source: 'shopify',
    external_reference: '#d1014',
    variant_sku: undefined,
    qty: 1,
    details: 'طلب مدفوع في Shopify — بانتظار تحديد التصميم والمقاس وتفصيل الشحن/الخصم',
    created_at: '2026-07-05T11:00:00Z',
  },
  {
    id: 'shop-d1015',
    date: '2026-07-05',
    title: 'Shopify #d1015 — (1× تيشيرت - Pending SKU Review)',
    type: 'income',
    category: 'Shopify Confirmed Sale',
    amount_original: 1093.12,
    currency_original: 'TRY',
    status: 'confirmed',
    classification: 'shopify_confirmed',
    source: 'shopify',
    external_reference: '#d1015',
    variant_sku: undefined,
    qty: 1,
    details: 'طلب مدفوع في Shopify — بانتظار تحديد التصميم والمقاس وتفصيل الشحن/الخصم',
    created_at: '2026-07-05T12:00:00Z',
  },
  {
    id: 'shop-d1016',
    date: '2026-07-06',
    title: 'Shopify #d1016 — (1× تيشيرت - Pending SKU Review)',
    type: 'income',
    category: 'Shopify Confirmed Sale',
    amount_original: 1123.12,
    currency_original: 'TRY',
    status: 'confirmed',
    classification: 'shopify_confirmed',
    source: 'shopify',
    external_reference: '#d1016',
    variant_sku: undefined,
    qty: 1,
    details: 'طلب مدفوع في Shopify — بانتظار تحديد التصميم والمقاس وتفصيل الشحن/الخصم',
    created_at: '2026-07-06T10:00:00Z',
  },
  {
    id: 'shop-d1019',
    date: '2026-07-30',
    title: 'Shopify #d1019 — (1× تيشيرت - Pending SKU Review)',
    type: 'income',
    category: 'Shopify Confirmed Sale',
    amount_original: 939.00,
    currency_original: 'TRY',
    status: 'confirmed',
    classification: 'shopify_confirmed',
    source: 'shopify',
    external_reference: '#d1019',
    variant_sku: undefined,
    qty: 1,
    details: 'طلب مدفوع في Shopify — بانتظار تحديد التصميم والمقاس',
    created_at: '2026-07-30T10:00:00Z',
  },

  // --- 2 CONFIRMED NEW MANUAL SALES (1,828.00 TRY, 2 units) ---
  {
    id: 'man-bila-899',
    date: '2026-08-01',
    title: 'Manual Sale — بلا عقارب (مقاس غير محدد Pending Size)',
    type: 'income',
    category: 'Confirmed Manual Sale',
    amount_original: 899.00,
    currency_original: 'TRY',
    status: 'confirmed',
    classification: 'manual_confirmed',
    source: 'manual',
    variant_sku: 'bila_aqarib:PENDING',
    qty: 1,
    details: 'بيعة يدوية مؤكدة خارج Shopify — التصميم: بلا عقارب (المقاس Pending)',
    created_at: '2026-08-01T10:00:00Z',
  },
  {
    id: 'man-minhuna-929',
    date: '2026-08-01',
    title: 'Manual Sale — من هنا الأصل (مقاس غير محدد Pending Size)',
    type: 'income',
    category: 'Confirmed Manual Sale',
    amount_original: 929.00,
    currency_original: 'TRY',
    status: 'confirmed',
    classification: 'manual_confirmed',
    source: 'manual',
    variant_sku: 'min_huna:PENDING',
    qty: 1,
    details: 'بيعة يدوية مؤكدة خارج Shopify — التصميم: من هنا الأصل (المقاس Pending)',
    created_at: '2026-08-01T11:00:00Z',
  },

  // --- PENDING RECONCILIATION (870 TRY & 850 TRY — NOT included in confirmed totals until verified) ---
  {
    id: 'rev-870',
    date: null,
    title: 'سجل تاريخي قيد المراجعة (870₺)',
    type: 'income',
    category: 'Pending Review',
    amount_original: 870.00,
    currency_original: 'TRY',
    status: 'pending_review',
    classification: 'pending_review',
    source: 'historical',
    qty: 1,
    details: 'معلق للمراجعة: هل هو بيع يدوي مستقل أم متداخل مع طلبات Shopify المخصومة؟ مستبعد من الإجمالي المؤكد حالياً.',
    created_at: '2026-07-15T10:00:00Z',
  },
  {
    id: 'rev-850',
    date: null,
    title: 'سجل تاريخي قيد المراجعة (850₺)',
    type: 'income',
    category: 'Pending Review',
    amount_original: 850.00,
    currency_original: 'TRY',
    status: 'pending_review',
    classification: 'pending_review',
    source: 'historical',
    qty: 1,
    details: 'معلق للمراجعة: هل هو بيع يدوي مستقل أم متداخل مع طلبات Shopify المخصومة؟ مستبعد من الإجمالي المؤكد حالياً.',
    created_at: '2026-07-15T11:00:00Z',
  },
  {
    id: 'rev-gift-june30',
    date: '2026-06-30',
    title: 'سجل تاريخي 0₺ — بلا عقارب (S) بتاريخ 2026-06-30',
    type: 'income',
    category: 'Pending Review',
    amount_original: 0.00,
    currency_original: 'TRY',
    status: 'pending_review',
    classification: 'pending_review',
    source: 'historical',
    variant_sku: 'bila_aqarib:S',
    qty: 1,
    details: 'معلق للتأكيد: هل هذه القطعة هي نفسها هدية الأخت (1) أو ضمن السحب الشخصي (3)، أم هدية خامسة مستقلة؟ لم تُخصم مرتين.',
    created_at: '2026-06-30T10:00:00Z',
  },

  // --- ARCHIVED DUPLICATES & ESTIMATED SALES (Excluded from active revenue & stock) ---
  {
    id: 'est-1',
    date: null,
    title: 'تقدير قديم مستبعد #1 (900₺)',
    type: 'income',
    category: 'Estimated / Unverified Sale',
    amount_original: 900.00,
    currency_original: 'TRY',
    status: 'estimated_amount',
    classification: 'estimated_unverified',
    source: 'historical',
    details: 'مستبعد بالكامل من الإيرادات الفعلية ومن المخزون (تقدير غير مؤكد)',
    created_at: '2026-07-20T10:00:00Z',
  },
  {
    id: 'est-2',
    date: null,
    title: 'تقدير قديم مستبعد #2 (900₺)',
    type: 'income',
    category: 'Estimated / Unverified Sale',
    amount_original: 900.00,
    currency_original: 'TRY',
    status: 'estimated_amount',
    classification: 'estimated_unverified',
    source: 'historical',
    details: 'مستبعد بالكامل من الإيرادات الفعلية ومن المخزون (تقدير غير مؤكد)',
    created_at: '2026-07-20T11:00:00Z',
  },
  {
    id: 'est-3',
    date: null,
    title: 'تقدير قديم مستبعد #3 (900₺)',
    type: 'income',
    category: 'Estimated / Unverified Sale',
    amount_original: 900.00,
    currency_original: 'TRY',
    status: 'estimated_amount',
    classification: 'estimated_unverified',
    source: 'historical',
    details: 'مستبعد بالكامل من الإيرادات الفعلية ومن المخزون (تقدير غير مؤكد)',
    created_at: '2026-07-20T12:00:00Z',
  },
  {
    id: 'dup-manual-batch',
    date: '2026-07-02',
    title: 'سجلات يدوية قديمة متداخلة مع Shopify (مؤرشفة لمنع الازدواج)',
    type: 'income',
    category: 'Duplicate Sale',
    amount_original: 9312.00,
    currency_original: 'TRY',
    status: 'duplicate_archived',
    classification: 'duplicate',
    source: 'historical',
    details: 'تشمل السجلات اليدوية الـ 9 التي تم دمجها ومطابقتها مع طلبات Shopify (#d1003, #d1004, #d1005, #d1007, #d1010, #d1011) لمنع احتسابها مرتين.',
    created_at: '2026-07-02T15:00:00Z',
  },
];

// ============================================================================
// RECONCILED INVENTORY MOVEMENTS (TOTAL OUT = 19 -> REMAINING = 233 of 252)
// - 13 Shopify Sold (6 mapped from historical records + 7 unallocated pending SKU)
// - 2 Manual Sold (1 Bila Aqarib pending size + 1 Min Huna pending size)
// - 3 Personal Use (Founder — unallocated)
// - 1 Gift (Sister — unallocated)
// ============================================================================
export const INITIAL_MOVEMENTS: InventoryMovement[] = [
  // Shopify Sold — Known SKUs from historical overlap (6 units)
  { id: 'mov-shop-1003', sku: 'walilhurriya:L', design_key: 'walilhurriya', size: 'L', type: 'sale', qty: 1, signed_delta: -1, date: '2026-05-26', financial_transaction_id: 'shop-d1003', source: 'shopify', note: 'Shopify #d1003 (1,049₺)' },
  { id: 'mov-shop-1004', sku: 'min_huna:L', design_key: 'min_huna', size: 'L', type: 'sale', qty: 1, signed_delta: -1, date: '2026-06-26', financial_transaction_id: 'shop-d1004', source: 'shopify', note: 'Shopify #d1004 (999₺)' },
  { id: 'mov-shop-1005a', sku: 'min_huna:L', design_key: 'min_huna', size: 'L', type: 'sale', qty: 1, signed_delta: -1, date: '2026-06-26', financial_transaction_id: 'shop-d1005', source: 'shopify', note: 'Shopify #d1005 — قطعة 1 من 2' },
  { id: 'mov-shop-1005b', sku: 'walilhurriya:S', design_key: 'walilhurriya', size: 'S', type: 'sale', qty: 1, signed_delta: -1, date: '2026-06-26', financial_transaction_id: 'shop-d1005', source: 'shopify', note: 'Shopify #d1005 — قطعة 2 من 2' },
  { id: 'mov-shop-1010', sku: 'walilhurriya:M', design_key: 'walilhurriya', size: 'M', type: 'sale', qty: 1, signed_delta: -1, date: '2026-07-02', financial_transaction_id: 'shop-d1010', source: 'shopify', note: 'Shopify #d1010 (1,219₺)' },
  { id: 'mov-shop-1011', sku: 'walilhurriya:M', design_key: 'walilhurriya', size: 'M', type: 'sale', qty: 1, signed_delta: -1, date: '2026-07-03', financial_transaction_id: 'shop-d1011', source: 'shopify', note: 'Shopify #d1011 (1,049₺)' },

  // Shopify Sold — Pending SKU Verification (7 units)
  { id: 'mov-shop-1006', sku: null, design_key: null, size: null, type: 'sale', qty: 1, signed_delta: -1, date: '2026-07-01', financial_transaction_id: 'shop-d1006', source: 'shopify', note: 'Shopify #d1006 (1,219₺) — بانتظار تحديد التصميم والمقاس' },
  { id: 'mov-shop-1007', sku: null, design_key: 'bila_aqarib', size: null, type: 'sale', qty: 1, signed_delta: -1, date: '2026-07-01', financial_transaction_id: 'shop-d1007', source: 'shopify', note: 'Shopify #d1007 (949₺) — بلا عقارب (بانتظار تأكيد المقاس S أو L)' },
  { id: 'mov-shop-1013', sku: null, design_key: null, size: null, type: 'sale', qty: 1, signed_delta: -1, date: '2026-07-05', financial_transaction_id: 'shop-d1013', source: 'shopify', note: 'Shopify #d1013 (923.12₺) — بانتظار تحديد التصميم والمقاس' },
  { id: 'mov-shop-1014', sku: null, design_key: null, size: null, type: 'sale', qty: 1, signed_delta: -1, date: '2026-07-05', financial_transaction_id: 'shop-d1014', source: 'shopify', note: 'Shopify #d1014 (1,093.12₺) — بانتظار تحديد التصميم والمقاس' },
  { id: 'mov-shop-1015', sku: null, design_key: null, size: null, type: 'sale', qty: 1, signed_delta: -1, date: '2026-07-05', financial_transaction_id: 'shop-d1015', source: 'shopify', note: 'Shopify #d1015 (1,093.12₺) — بانتظار تحديد التصميم والمقاس' },
  { id: 'mov-shop-1016', sku: null, design_key: null, size: null, type: 'sale', qty: 1, signed_delta: -1, date: '2026-07-06', financial_transaction_id: 'shop-d1016', source: 'shopify', note: 'Shopify #d1016 (1,123.12₺) — بانتظار تحديد التصميم والمقاس' },
  { id: 'mov-shop-1019', sku: null, design_key: null, size: null, type: 'sale', qty: 1, signed_delta: -1, date: '2026-07-30', financial_transaction_id: 'shop-d1019', source: 'shopify', note: 'Shopify #d1019 (939₺) — بانتظار تحديد التصميم والمقاس' },

  // Manual Confirmed Sales — Design Known, Size Pending (2 units)
  { id: 'mov-man-bila', sku: null, design_key: 'bila_aqarib', size: null, type: 'sale', qty: 1, signed_delta: -1, date: '2026-08-01', financial_transaction_id: 'man-bila-899', source: 'manual', note: 'بيع يدوي مؤكد: بلا عقارب (899₺) — بانتظار تحديد المقاس' },
  { id: 'mov-man-minhuna', sku: null, design_key: 'min_huna', size: null, type: 'sale', qty: 1, signed_delta: -1, date: '2026-08-01', financial_transaction_id: 'man-minhuna-929', source: 'manual', note: 'بيع يدوي مؤكد: من هنا الأصل (929₺) — بانتظار تحديد المقاس' },

  // Personal Use (Founder: 3 units, 0 TRY, Unallocated SKU)
  { id: 'mov-pers-1', sku: null, design_key: null, size: null, type: 'personal_use', qty: 3, signed_delta: -3, date: '2026-06-30', source: 'manual', note: 'سحب شخصي للمؤسس (3 تيشيرتات — بدون مقابل 0₺ — بانتظار تحديد التصميم والمقاس)' },

  // Gift to Sister (1 unit, 0 TRY, Unallocated SKU)
  { id: 'mov-gift-1', sku: null, design_key: null, size: null, type: 'gift', qty: 1, signed_delta: -1, date: '2026-06-30', source: 'manual', note: 'هدية للأخت (1 تيشيرت — بدون مقابل 0₺ — بانتظار تحديد التصميم والمقاس)' },
];

export const EXCLUDED_SHOPIFY_ORDERS = [
  { order_number: '#d1008', status: 'Voided', amount: null, reason: 'طلب ملغي (Voided) — لا يحتسب في الإيرادات أو المخزون' },
  { order_number: '#d1009', status: 'Refunded', amount: null, reason: 'طلب مسترد (Refunded) — لا يحتسب في الإيرادات النهائية' },
  { order_number: '#d1012', status: 'Refunded', amount: null, reason: 'طلب مسترد (Refunded) — لا يحتسب في الإيرادات النهائية' },
  { order_number: '#d1017', status: 'Voided', amount: null, reason: 'طلب ملغي (Voided) — لا يحتسب في الإيرادات أو المخزون' },
  { order_number: '#d1018', status: 'Voided', amount: null, reason: 'طلب ملغي (Voided) — لا يحتسب في الإيرادات أو المخزون' },
  { order_number: '#d1020', status: 'Payment Pending', amount: 939.00, reason: 'الدفع معلق (Payment Pending 939₺) — لا يحتسب حتى تأكيد التحصيل' },
];

export const DEFAULT_FINANCE_LEDGER: DuthurFinanceLedger = {
  version: 4,
  fx_rate_usd_try: 50.35,
  planned_gifts_count: 20,
  forecast_budget_try: 35245,
  designs: INITIAL_DESIGNS,
  transactions: [...INITIAL_EXPENSES, ...INITIAL_SALES_TRANSACTIONS],
  movements: INITIAL_MOVEMENTS,
  suppliers: [],
  store_prices_synced: false,
};
