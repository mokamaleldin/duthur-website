import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_FINANCE_LEDGER, DuthurFinanceLedger } from '@/lib/finance-seed';
import path from 'path';
import fs from 'fs';

const FINANCE_JSON_PATH = path.join(process.cwd(), 'supabase', 'duthur_finance_ledger.json');
const DB_MARKER_PREFIX = '__DUTHUR_LEDGER_V5__:';

export type ExtendedDuthurLedger = DuthurFinanceLedger & {
  deleted_order_ids?: string[];
  deleted_message_ids?: string[];
  deleted_discount_ids?: string[];
  discount_product_map?: Record<string, string[]>;
};

export async function loadLedgerFromStorageOrLocal(
  supabase: any
): Promise<ExtendedDuthurLedger> {
  let prevDeletedOrders: string[] = [];
  let prevDeletedMessages: string[] = [];
  let prevDeletedDiscounts: string[] = [];
  let prevDiscountMap: Record<string, string[]> = {};

  // 1. Primary source of truth: store_settings.announcement_tr in Supabase DB
  try {
    const { data: st } = await supabase
      .from('store_settings')
      .select('announcement_tr')
      .eq('id', true)
      .maybeSingle();

    const raw = st?.announcement_tr || '';
    if (typeof raw === 'string') {
      // Check V5 first
      if (raw.includes(DB_MARKER_PREFIX)) {
        const jsonPart = raw.split(DB_MARKER_PREFIX)[1];
        if (jsonPart) {
          const parsed = JSON.parse(jsonPart);
          if (parsed && parsed.version) {
            return {
              ...parsed,
              deleted_order_ids: parsed.deleted_order_ids || [],
              deleted_message_ids: parsed.deleted_message_ids || [],
              deleted_discount_ids: parsed.deleted_discount_ids || [],
              discount_product_map: parsed.discount_product_map || {},
            };
          }
        }
      }

      // Preserve deleted IDs from V4 or V3 if upgrading!
      for (const oldMarker of ['__DUTHUR_LEDGER_V4__:', '__DUTHUR_LEDGER_V3__:']) {
        if (raw.includes(oldMarker)) {
          const jsonPart = raw.split(oldMarker)[1]?.split('__DUTHUR_LEDGER_')[0];
          if (jsonPart) {
            const parsed = JSON.parse(jsonPart);
            prevDeletedOrders = parsed.deleted_order_ids || [];
            prevDeletedMessages = parsed.deleted_message_ids || [];
            prevDeletedDiscounts = parsed.deleted_discount_ids || [];
            prevDiscountMap = parsed.discount_product_map || {};
            break;
          }
        }
      }
    }
  } catch {
    // ignore DB read error
  }

  // 2. Fallback to local file
  try {
    if (fs.existsSync(FINANCE_JSON_PATH)) {
      const text = await fs.promises.readFile(FINANCE_JSON_PATH, 'utf8');
      const parsed = JSON.parse(text);
      if (parsed) {
        prevDeletedOrders = Array.from(
          new Set([...prevDeletedOrders, ...(parsed.deleted_order_ids || [])])
        );
        prevDeletedMessages = Array.from(
          new Set([...prevDeletedMessages, ...(parsed.deleted_message_ids || [])])
        );
        prevDeletedDiscounts = Array.from(
          new Set([...prevDeletedDiscounts, ...(parsed.deleted_discount_ids || [])])
        );
        prevDiscountMap = { ...prevDiscountMap, ...(parsed.discount_product_map || {}) };

        if (parsed.version >= 5) {
          return {
            ...parsed,
            deleted_order_ids: prevDeletedOrders,
            deleted_message_ids: prevDeletedMessages,
            deleted_discount_ids: prevDeletedDiscounts,
            discount_product_map: prevDiscountMap,
          };
        }
      }
    }
  } catch {
    // ignore file error
  }

  return {
    ...structuredClone(DEFAULT_FINANCE_LEDGER),
    deleted_order_ids: prevDeletedOrders,
    deleted_message_ids: prevDeletedMessages,
    deleted_discount_ids: prevDeletedDiscounts,
    discount_product_map: prevDiscountMap,
  };
}

export async function saveLedgerToStorageAndLocal(
  supabase: any,
  ledger: ExtendedDuthurLedger
) {
  const jsonStr = JSON.stringify(ledger);

  // 1. Save into store_settings.announcement_tr in Supabase DB
  try {
    const { data: st } = await supabase
      .from('store_settings')
      .select('announcement_tr')
      .eq('id', true)
      .maybeSingle();

    const currentRaw = st?.announcement_tr || '2 ürün al, ücretsiz kargo kazan';
    const cleanPrefix = currentRaw
      .split('__DUTHUR_LEDGER_V3__:')[0]
      .split('__DUTHUR_LEDGER_V4__:')[0]
      .split(DB_MARKER_PREFIX)[0];
    const encoded = `${cleanPrefix}${DB_MARKER_PREFIX}${jsonStr}`;

    await supabase
      .from('store_settings')
      .update({ announcement_tr: encoded })
      .eq('id', true);
  } catch (err) {
    console.warn('[Finance API] Could not save ledger to store_settings:', err);
  }

  // 2. Save to local JSON file if writable
  try {
    await fs.promises.mkdir(path.dirname(FINANCE_JSON_PATH), { recursive: true });
    await fs.promises.writeFile(
      FINANCE_JSON_PATH,
      JSON.stringify(ledger, null, 2),
      'utf8'
    );
  } catch {
    // ignore on read-only serverless fs
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ledger = await loadLedgerFromStorageOrLocal(supabase);

    const [{ data: products }, { data: orders }] = await Promise.all([
      supabase
        .from('products')
        .select('*,product_variants(*),product_images(*)')
        .order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select('*,order_items(*)')
        .order('created_at', { ascending: false }),
    ]);

    const deletedOrderIds = new Set(ledger.deleted_order_ids || []);
    const activeOrders = (orders || []).filter(
      (o: any) => !deletedOrderIds.has(o.id) && o.admin_note !== '__DELETED__'
    );

    return NextResponse.json({
      ledger,
      products: products || [],
      orders: activeOrders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to load finance ledger' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const current = await loadLedgerFromStorageOrLocal(supabase);

    // Action: delete order
    if (body.action === 'delete_order' && body.orderId) {
      const orderId = String(body.orderId);
      await supabase.from('order_items').delete().eq('order_id', orderId);
      const { data: deletedRows } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .select('id');

      if (!deletedRows || deletedRows.length === 0) {
        await supabase
          .from('orders')
          .update({ order_status: 'cancelled', admin_note: '__DELETED__' })
          .eq('id', orderId);
      }

      const nextDeleted = Array.from(
        new Set([...(current.deleted_order_ids || []), orderId])
      );
      const updated = { ...current, deleted_order_ids: nextDeleted };
      await saveLedgerToStorageAndLocal(supabase, updated);
      return NextResponse.json({ success: true });
    }

    // Action: delete message
    if (body.action === 'delete_message' && body.messageId) {
      const messageId = String(body.messageId);
      await supabase.from('contact_messages').delete().eq('id', messageId);

      const nextDeleted = Array.from(
        new Set([...(current.deleted_message_ids || []), messageId])
      );
      const updated = { ...current, deleted_message_ids: nextDeleted };
      await saveLedgerToStorageAndLocal(supabase, updated);
      return NextResponse.json({ success: true });
    }

    // Action: delete discount
    if (body.action === 'delete_discount' && body.discountId) {
      const discountId = String(body.discountId);
      const { data: deletedRows } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', discountId)
        .select('id');

      if (!deletedRows || deletedRows.length === 0) {
        await supabase
          .from('discount_codes')
          .update({ active: false })
          .eq('id', discountId);
      }

      const nextDeleted = Array.from(
        new Set([...(current.deleted_discount_ids || []), discountId])
      );
      const updated = { ...current, deleted_discount_ids: nextDeleted };
      await saveLedgerToStorageAndLocal(supabase, updated);
      return NextResponse.json({ success: true });
    }

    // Action: save discount products map
    if (body.action === 'save_discount_products' && body.code) {
      const code = String(body.code).toUpperCase();
      const productIds = Array.isArray(body.productIds) ? body.productIds : [];
      const updated = {
        ...current,
        discount_product_map: {
          ...(current.discount_product_map || {}),
          [code]: productIds,
        },
      };
      await saveLedgerToStorageAndLocal(supabase, updated);
      return NextResponse.json({ success: true });
    }

    const ledger = body.ledger as ExtendedDuthurLedger;
    if (!ledger || !ledger.version) {
      return NextResponse.json({ error: 'Invalid ledger payload' }, { status: 400 });
    }

    const mergedLedger: ExtendedDuthurLedger = {
      ...ledger,
      deleted_order_ids: ledger.deleted_order_ids || current.deleted_order_ids || [],
      deleted_message_ids:
        ledger.deleted_message_ids || current.deleted_message_ids || [],
      deleted_discount_ids:
        ledger.deleted_discount_ids || current.deleted_discount_ids || [],
      discount_product_map:
        ledger.discount_product_map || current.discount_product_map || {},
    };

    if (body.syncPricesToStore) {
      for (const d of mergedLedger.designs) {
        await supabase
          .from('products')
          .update({ base_price: d.sale_price_try })
          .eq('id', d.product_id);
        await supabase
          .from('product_variants')
          .update({ price: d.sale_price_try })
          .eq('product_id', d.product_id);
      }
    }

    if (body.syncStockToStore && Array.isArray(body.skuStocks)) {
      for (const item of body.skuStocks) {
        const { data: variants } = await supabase
          .from('product_variants')
          .select('id, option_values')
          .eq('product_id', item.product_id);
        const match = (variants || []).find(
          (v: any) => v.option_values?.Size === item.size
        );
        if (match) {
          await supabase
            .from('product_variants')
            .update({ stock_quantity: Math.max(0, Number(item.stock || 0)) })
            .eq('id', match.id);
        }
      }
    }

    await saveLedgerToStorageAndLocal(supabase, mergedLedger);

    return NextResponse.json({ success: true, ledger: mergedLedger });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to save finance ledger' },
      { status: 500 }
    );
  }
}
