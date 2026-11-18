import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_FINANCE_LEDGER, DuthurFinanceLedger } from '@/lib/finance-seed';
import path from 'path';
import fs from 'fs';

const FINANCE_JSON_PATH = path.join(process.cwd(), 'supabase', 'duthur_finance_ledger.json');

export type ExtendedDuthurLedger = DuthurFinanceLedger & {
  deleted_order_ids?: string[];
  deleted_message_ids?: string[];
};

export async function loadLedgerFromStorageOrLocal(
  supabase: any
): Promise<ExtendedDuthurLedger> {
  // 1. Prefer local JSON file when present (instant on local dev)
  try {
    if (fs.existsSync(FINANCE_JSON_PATH)) {
      const text = await fs.promises.readFile(FINANCE_JSON_PATH, 'utf8');
      const parsed = JSON.parse(text);
      if (parsed && parsed.version) {
        return {
          ...parsed,
          deleted_order_ids: parsed.deleted_order_ids || [],
          deleted_message_ids: parsed.deleted_message_ids || [],
        };
      }
    }
  } catch {
    // ignore file error
  }

  // 2. Fallback to Supabase storage bucket 'product-images'
  try {
    const { data, error } = await supabase.storage
      .from('product-images')
      .download('admin/finance_ledger_v2.json');
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (parsed && parsed.version) {
        const result: ExtendedDuthurLedger = {
          ...parsed,
          deleted_order_ids: parsed.deleted_order_ids || [],
          deleted_message_ids: parsed.deleted_message_ids || [],
        };
        try {
          await fs.promises.mkdir(path.dirname(FINANCE_JSON_PATH), { recursive: true });
          await fs.promises.writeFile(
            FINANCE_JSON_PATH,
            JSON.stringify(result, null, 2),
            'utf8'
          );
        } catch {}
        return result;
      }
    }
  } catch {
    // ignore storage read error
  }

  const fresh: ExtendedDuthurLedger = {
    ...structuredClone(DEFAULT_FINANCE_LEDGER),
    deleted_order_ids: [],
    deleted_message_ids: [],
  };
  return fresh;
}

export async function saveLedgerToStorageAndLocal(
  supabase: any,
  ledger: ExtendedDuthurLedger
) {
  const jsonStr = JSON.stringify(ledger, null, 2);

  // 1. Save to local JSON file if writable
  try {
    await fs.promises.mkdir(path.dirname(FINANCE_JSON_PATH), { recursive: true });
    await fs.promises.writeFile(FINANCE_JSON_PATH, jsonStr, 'utf8');
  } catch {
    // ignore on read-only serverless fs
  }

  // 2. Save to Supabase storage bucket
  try {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    await supabase.storage
      .from('product-images')
      .upload('admin/finance_ledger_v2.json', blob, {
        contentType: 'application/json',
        upsert: true,
      });
  } catch (err) {
    console.warn('[Finance API] Could not upload to Supabase storage:', err);
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

    // Sync store prices once if not synced yet
    if (!ledger.store_prices_synced) {
      for (const d of ledger.designs) {
        await supabase
          .from('products')
          .update({ base_price: d.sale_price_try })
          .eq('id', d.product_id);
        await supabase
          .from('product_variants')
          .update({ price: d.sale_price_try })
          .eq('product_id', d.product_id);
      }
      ledger.store_prices_synced = true;
      await saveLedgerToStorageAndLocal(supabase, ledger);
    }

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
    const activeOrders = (orders || []).filter((o: any) => !deletedOrderIds.has(o.id));

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
      // Try DB delete first
      await supabase.from('order_items').delete().eq('order_id', orderId);
      const { data: deletedRows } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .select('id');

      // Fallback: if RLS prevented row deletion, mark order as cancelled in DB AND record in deleted_order_ids
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

    const ledger = body.ledger as ExtendedDuthurLedger;
    if (!ledger || !ledger.version) {
      return NextResponse.json({ error: 'Invalid ledger payload' }, { status: 400 });
    }

    const mergedLedger: ExtendedDuthurLedger = {
      ...ledger,
      deleted_order_ids: ledger.deleted_order_ids || current.deleted_order_ids || [],
      deleted_message_ids:
        ledger.deleted_message_ids || current.deleted_message_ids || [],
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
