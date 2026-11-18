import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_FINANCE_LEDGER, DuthurFinanceLedger } from '@/lib/finance-seed';
import path from 'path';
import fs from 'fs';

const FINANCE_JSON_PATH = path.join(process.cwd(), 'supabase', 'duthur_finance_ledger.json');

async function loadLedgerFromStorageOrLocal(supabase: any): Promise<DuthurFinanceLedger> {
  // 1. Try reading from Supabase storage bucket 'product-images' under 'admin/finance_ledger_v1.json'
  try {
    const { data, error } = await supabase.storage
      .from('product-images')
      .download('admin/finance_ledger_v1.json');
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (parsed && parsed.version) {
        return parsed as DuthurFinanceLedger;
      }
    }
  } catch {
    // ignore storage read error
  }

  // 2. Fallback to local file
  try {
    if (fs.existsSync(FINANCE_JSON_PATH)) {
      const text = await fs.promises.readFile(FINANCE_JSON_PATH, 'utf8');
      const parsed = JSON.parse(text);
      if (parsed && parsed.version) {
        return parsed as DuthurFinanceLedger;
      }
    }
  } catch {
    // ignore file error
  }

  return structuredClone(DEFAULT_FINANCE_LEDGER);
}

async function saveLedgerToStorageAndLocal(supabase: any, ledger: DuthurFinanceLedger) {
  const jsonStr = JSON.stringify(ledger, null, 2);

  // 1. Save to Supabase storage bucket
  try {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    await supabase.storage
      .from('product-images')
      .upload('admin/finance_ledger_v1.json', blob, {
        contentType: 'application/json',
        upsert: true,
      });
  } catch (err) {
    console.warn('[Finance API] Could not upload to Supabase storage:', err);
  }

  // 2. Save to local JSON file if writable
  try {
    await fs.promises.mkdir(path.dirname(FINANCE_JSON_PATH), { recursive: true });
    await fs.promises.writeFile(FINANCE_JSON_PATH, jsonStr, 'utf8');
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

    // If store prices haven't been synced to the baseline (899 / 929 / 999) yet, sync them automatically!
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

    return NextResponse.json({
      ledger,
      products: products || [],
      orders: orders || [],
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
    const ledger = body.ledger as DuthurFinanceLedger;

    if (!ledger || !ledger.version) {
      return NextResponse.json({ error: 'Invalid ledger payload' }, { status: 400 });
    }

    // Optional: if syncPricesToStore is requested or variant stocks need syncing
    if (body.syncPricesToStore) {
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
    }

    if (body.syncStockToStore && Array.isArray(body.skuStocks)) {
      // body.skuStocks: Array<{ product_id: string; size: string; stock: number }>
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

    await saveLedgerToStorageAndLocal(supabase, ledger);

    return NextResponse.json({ success: true, ledger });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to save finance ledger' },
      { status: 500 }
    );
  }
}
