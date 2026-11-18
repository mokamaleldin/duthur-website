export type CurrencyCode = 'TRY' | 'USD';

export type TransactionStatus = 'confirmed' | 'void';

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
  source: 'historical' | 'manual' | 'store_order' | 'shopify';
  created_at: string;
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
  initial_stock: { S: number; M: number; L: number; XL: number };
};

export type DuthurFinanceLedger = {
  version: number;
  fx_rate_usd_try: number;
  designs: DesignCatalogConfig[];
  transactions: FinancialTransaction[];
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
    initial_stock: { S: 14, M: 24, L: 24, XL: 10 }, // Total 72
  },
  {
    design_key: 'min_huna',
    name_ar: 'من هنا الأصل',
    name_en: 'Min Huna Al-Asl',
    slug: 'duthur-min-huna-alasl-oversize-tshirt',
    product_id: '0109649c-ccb1-41e3-bcf4-16cb7b7295dd',
    sale_price_try: 929,
    initial_stock: { S: 16, M: 29, L: 25, XL: 10 }, // Total 80
  },
  {
    design_key: 'walilhurriya',
    name_ar: 'على الحرية الحمراء باب',
    name_en: 'Walilhurriya Alhamra Bab',
    slug: 'duthur-walilhurriya-alhamra-bab-oversize-tshirt',
    product_id: '6e4f7f49-892b-4595-a48e-c77ba50d7c21',
    sale_price_try: 999,
    initial_stock: { S: 20, M: 34, L: 37, XL: 9 }, // Total 100
  },
];

// 24 Documented Expenses: $2,364.40 USD + 20,268.16 TRY = 139,315.70 TRY at 50.35
export const INITIAL_EXPENSES: FinancialTransaction[] = [
  { id: 'exp-1', date: '2026-05-14', title: 'باقي دفعة تصنيع 1', type: 'expense', category: 'تشغيل وتطوير', amount_original: 1200.00, currency_original: 'USD', status: 'confirmed', source: 'historical', created_at: '2026-05-14T10:00:00Z' },
  { id: 'exp-2', date: '2026-06-25', title: 'باقي دفعة تصنيع 2', type: 'expense', category: 'تشغيل وتطوير', amount_original: 600.00, currency_original: 'USD', status: 'confirmed', source: 'historical', created_at: '2026-06-25T10:00:00Z' },
  { id: 'exp-3', date: '2026-06-25', title: 'دفعة تصنيع إضافية', type: 'expense', category: 'تشغيل وتطوير', amount_original: 9250.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-06-25T11:00:00Z' },
  { id: 'exp-4', date: '2026-05-20', title: '200 كارت شكر', type: 'expense', category: 'رسوم تجهيز', amount_original: 900.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-05-20T10:00:00Z' },
  { id: 'exp-5', date: '2026-04-28', title: 'عينة أولى', type: 'expense', category: 'تشغيل وتطوير', amount_original: 500.00, currency_original: 'USD', status: 'confirmed', source: 'historical', created_at: '2026-04-28T10:00:00Z' },
  { id: 'exp-6', date: '2026-04-15', title: 'Tech Pack & Pattern', type: 'expense', category: 'تطوير خاص', amount_original: 3590.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-04-15T10:00:00Z' },
  { id: 'exp-7', date: '2026-05-13', title: '2000 ليبل رقبة وعناية', type: 'expense', category: 'رسوم تجهيز', amount_original: 2150.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-05-13T10:00:00Z' },
  { id: 'exp-8', date: '2026-04-30', title: 'ستكرات البراند', type: 'expense', category: 'رسوم تجهيز', amount_original: 840.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-04-30T10:00:00Z' },
  { id: 'exp-9', date: '2026-04-16', title: 'Domain Duthur.co', type: 'expense', category: 'اشتراك شهري', amount_original: 16.40, currency_original: 'USD', status: 'confirmed', source: 'historical', created_at: '2026-04-16T10:00:00Z' },
  { id: 'exp-10', date: '2026-05-05', title: 'ChatGPT May', type: 'expense', category: 'اشتراك شهري', amount_original: 24.00, currency_original: 'USD', status: 'confirmed', source: 'historical', created_at: '2026-05-05T10:00:00Z' },
  { id: 'exp-11', date: '2026-06-05', title: 'ChatGPT June', type: 'expense', category: 'اشتراك شهري', amount_original: 24.00, currency_original: 'USD', status: 'confirmed', source: 'historical', created_at: '2026-06-05T10:00:00Z' },
  { id: 'exp-12', date: '2026-05-21', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 102.00, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-05-21T10:00:00Z' },
  { id: 'exp-13', date: '2026-05-21', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 110.40, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-05-21T11:00:00Z' },
  { id: 'exp-14', date: '2026-06-28', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 1.51, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-06-28T10:00:00Z' },
  { id: 'exp-15', date: '2026-06-28', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 159.37, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-06-28T11:00:00Z' },
  { id: 'exp-16', date: '2026-06-29', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 158.40, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-06-29T10:00:00Z' },
  { id: 'exp-17', date: '2026-06-29', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 158.40, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-06-29T11:00:00Z' },
  { id: 'exp-18', date: '2026-06-30', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 201.60, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-06-30T10:00:00Z' },
  { id: 'exp-19', date: '2026-07-01', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 231.14, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-07-01T10:00:00Z' },
  { id: 'exp-20', date: '2026-07-03', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 235.55, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-07-03T10:00:00Z' },
  { id: 'exp-21', date: '2026-07-05', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 414.50, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-07-05T10:00:00Z' },
  { id: 'exp-22', date: '2026-07-12', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 472.44, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-07-12T10:00:00Z' },
  { id: 'exp-23', date: '2026-07-21', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 684.88, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-07-21T10:00:00Z' },
  { id: 'exp-24', date: '2026-08-21', title: 'Meta Ads — Paid', type: 'expense', category: 'تسويق', amount_original: 607.97, currency_original: 'TRY', status: 'confirmed', source: 'historical', created_at: '2026-08-21T10:00:00Z' },
];

// Clean confirmed sales only (12 Shopify + 2 Manual = 15,531.48 TRY)
// All uncertain/pending/estimated rows removed completely!
export const INITIAL_SALES_TRANSACTIONS: FinancialTransaction[] = [
  { id: 'shop-d1003', date: '2026-05-26', title: 'Shopify #d1003 — على الحرية الحمراء باب (L)', type: 'income', category: 'مبيعات', amount_original: 1049.00, currency_original: 'TRY', status: 'confirmed', source: 'shopify', created_at: '2026-05-26T10:00:00Z' },
  { id: 'shop-d1004', date: '2026-06-26', title: 'Shopify #d1004 — من هنا الأصل (L)', type: 'income', category: 'مبيعات', amount_original: 999.00, currency_original: 'TRY', status: 'confirmed', source: 'shopify', created_at: '2026-06-26T10:00:00Z' },
  { id: 'shop-d1005', date: '2026-06-26', title: 'Shopify #d1005 — من هنا الأصل (L) + الحرية الحمراء (S)', type: 'income', category: 'مبيعات', amount_original: 2048.00, currency_original: 'TRY', status: 'confirmed', source: 'shopify', created_at: '2026-06-26T12:00:00Z' },
  { id: 'shop-d1006', date: '2026-07-01', title: 'Shopify #d1006', type: 'income', category: 'مبيعات', amount_original: 1219.00, currency_original: 'TRY', status: 'confirmed', source: 'shopify', created_at: '2026-07-01T10:00:00Z' },
  { id: 'shop-d1007', date: '2026-07-01', title: 'Shopify #d1007 — بلا عقارب', type: 'income', category: 'مبيعات', amount_original: 949.00, currency_original: 'TRY', status: 'confirmed', source: 'shopify', created_at: '2026-07-01T12:00:00Z' },
  { id: 'shop-d1010', date: '2026-07-02', title: 'Shopify #d1010 — على الحرية الحمراء باب (M)', type: 'income', category: 'مبيعات', amount_original: 1219.00, currency_original: 'TRY', status: 'confirmed', source: 'shopify', created_at: '2026-07-02T11:00:00Z' },
  { id: 'shop-d1011', date: '2026-07-03', title: 'Shopify #d1011 — على الحرية الحمراء باب (M)', type: 'income', category: 'مبيعات', amount_original: 1049.00, currency_original: 'TRY', status: 'confirmed', source: 'shopify', created_at: '2026-07-03T10:00:00Z' },
  { id: 'shop-d1013', date: '2026-07-05', title: 'Shopify #d1013', type: 'income', category: 'مبيعات', amount_original: 923.12, currency_original: 'TRY', status: 'confirmed', source: 'shopify', created_at: '2026-07-05T10:00:00Z' },
  { id: 'shop-d1014', date: '2026-07-05', title: 'Shopify #d1014', type: 'income', category: 'مبيعات', amount_original: 1093.12, currency_original: 'TRY', status: 'confirmed', source: 'shopify', created_at: '2026-07-05T11:00:00Z' },
  { id: 'shop-d1015', date: '2026-07-05', title: 'Shopify #d1015', type: 'income', category: 'مبيعات', amount_original: 1093.12, currency_original: 'TRY', status: 'confirmed', source: 'shopify', created_at: '2026-07-05T12:00:00Z' },
  { id: 'shop-d1016', date: '2026-07-06', title: 'Shopify #d1016', type: 'income', category: 'مبيعات', amount_original: 1123.12, currency_original: 'TRY', status: 'confirmed', source: 'shopify', created_at: '2026-07-06T10:00:00Z' },
  { id: 'shop-d1019', date: '2026-07-30', title: 'Shopify #d1019', type: 'income', category: 'مبيعات', amount_original: 939.00, currency_original: 'TRY', status: 'confirmed', source: 'shopify', created_at: '2026-07-30T10:00:00Z' },
  { id: 'man-bila-899', date: '2026-08-01', title: 'بيع: بلا عقارب', type: 'income', category: 'مبيعات', amount_original: 899.00, currency_original: 'TRY', status: 'confirmed', source: 'manual', created_at: '2026-08-01T10:00:00Z' },
  { id: 'man-minhuna-929', date: '2026-08-01', title: 'بيع: من هنا الأصل', type: 'income', category: 'مبيعات', amount_original: 929.00, currency_original: 'TRY', status: 'confirmed', source: 'manual', created_at: '2026-08-01T11:00:00Z' },
];

export const DEFAULT_FINANCE_LEDGER: DuthurFinanceLedger = {
  version: 5,
  fx_rate_usd_try: 50.35,
  designs: INITIAL_DESIGNS,
  transactions: [...INITIAL_EXPENSES, ...INITIAL_SALES_TRANSACTIONS],
  suppliers: [],
  store_prices_synced: false,
};
