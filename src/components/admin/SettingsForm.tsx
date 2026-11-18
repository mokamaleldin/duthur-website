'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

const DB_MARKER_PREFIX = '__DUTHUR_LEDGER_V3__:';

export function SettingsForm({ initial }: { initial: any }) {
  const s = useMemo(() => createClient(), []);
  const [msg, setMsg] = useState('');

  const cleanAnnouncementTr = String(initial.announcement_tr || '')
    .split('__DUTHUR_LEDGER_V3__:')[0]
    .split('__DUTHUR_LEDGER_V4__:')[0]
    .split('__DUTHUR_LEDGER_V5__:')[0];

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);

    // Preserve any hidden ledger data stored in announcement_tr
    const { data: currentSt } = await s
      .from('store_settings')
      .select('announcement_tr')
      .eq('id', true)
      .maybeSingle();

    const currentRaw = String(currentSt?.announcement_tr || '');
    const ledgerSuffix = currentRaw.includes('__DUTHUR_LEDGER_V5__:')
      ? `__DUTHUR_LEDGER_V5__:${currentRaw.split('__DUTHUR_LEDGER_V5__:')[1]}`
      : currentRaw.includes('__DUTHUR_LEDGER_V4__:')
      ? `__DUTHUR_LEDGER_V4__:${currentRaw.split('__DUTHUR_LEDGER_V4__:')[1]}`
      : currentRaw.includes('__DUTHUR_LEDGER_V3__:')
      ? `__DUTHUR_LEDGER_V3__:${currentRaw.split('__DUTHUR_LEDGER_V3__:')[1]}`
      : '';

    const payload: any = {
      store_name: f.get('store_name'),
      contact_email: f.get('contact_email'),
      admin_email: f.get('admin_email'),
      standard_shipping_price: Number(f.get('standard_shipping_price')),
      free_shipping_min_quantity: f.get('free_shipping_min_quantity')
        ? Number(f.get('free_shipping_min_quantity'))
        : null,
      pickup_enabled: f.get('pickup_enabled') === 'on',
      pickup_title_ar: f.get('pickup_title_ar'),
      pickup_title_en: f.get('pickup_title_en'),
      pickup_title_tr: f.get('pickup_title_tr'),
      pickup_description_ar: f.get('pickup_description_ar'),
      pickup_description_en: f.get('pickup_description_en'),
      pickup_description_tr: f.get('pickup_description_tr'),
      bank_instructions_ar: f.get('bank_instructions_ar'),
      bank_instructions_en: f.get('bank_instructions_en'),
      bank_instructions_tr: f.get('bank_instructions_tr'),
      announcement_enabled: f.get('announcement_enabled') === 'on',
      announcement_ar: f.get('announcement_ar'),
      announcement_en: f.get('announcement_en'),
      announcement_tr: `${String(f.get('announcement_tr') || '')}${ledgerSuffix}`,
    };

    const { error } = await s.from('store_settings').update(payload).eq('id', true);
    setMsg(error ? error.message : 'Saved.');
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <section className="admin-card">
        <h2>Store</h2>
        <div className="form-grid">
          <label>
            Store name
            <input name="store_name" defaultValue={initial.store_name} />
          </label>
          <label>
            Contact email
            <input type="email" name="contact_email" defaultValue={initial.contact_email} />
          </label>
          <label>
            Admin email
            <input type="email" name="admin_email" defaultValue={initial.admin_email} />
          </label>
        </div>
      </section>
      <section className="admin-card">
        <h2>Shipping</h2>
        <div className="form-grid">
          <label>
            Shipping price
            <input
              type="number"
              name="standard_shipping_price"
              defaultValue={initial.standard_shipping_price}
            />
          </label>
          <label>
            Free shipping quantity
            <input
              type="number"
              name="free_shipping_min_quantity"
              defaultValue={initial.free_shipping_min_quantity || ''}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              name="pickup_enabled"
              defaultChecked={initial.pickup_enabled}
            />{' '}
            Pickup enabled
          </label>
          {['ar', 'en', 'tr'].map((l) => (
            <div key={l} className="full nested">
              <label>
                Pickup title {l.toUpperCase()}
                <input name={`pickup_title_${l}`} defaultValue={initial[`pickup_title_${l}`]} />
              </label>
              <label>
                Pickup description {l.toUpperCase()}
                <input
                  name={`pickup_description_${l}`}
                  defaultValue={initial[`pickup_description_${l}`]}
                />
              </label>
            </div>
          ))}
        </div>
      </section>
      <section className="admin-card">
        <h2>Bank transfer</h2>
        {['ar', 'en', 'tr'].map((l) => (
          <label key={l}>
            Instructions {l.toUpperCase()}
            <textarea
              name={`bank_instructions_${l}`}
              defaultValue={initial[`bank_instructions_${l}`]}
            />
          </label>
        ))}
      </section>
      <section className="admin-card">
        <h2>Announcement</h2>
        <label className="check">
          <input
            type="checkbox"
            name="announcement_enabled"
            defaultChecked={initial.announcement_enabled}
          />{' '}
          Enabled
        </label>
        {['ar', 'en', 'tr'].map((l) => (
          <label key={l}>
            Text {l.toUpperCase()}
            <input
              name={`announcement_${l}`}
              defaultValue={
                l === 'tr' ? cleanAnnouncementTr : initial[`announcement_${l}`]
              }
            />
          </label>
        ))}
      </section>
      {msg && <p>{msg}</p>}
      <button className="primary">Save settings</button>
    </form>
  );
}
