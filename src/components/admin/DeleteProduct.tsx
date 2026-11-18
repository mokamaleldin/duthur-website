'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { ConfirmModal } from './ConfirmModal';

export function DeleteProduct({ id }: { id: string }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del() {
    setBusy(true);
    const { error } = await createClient().from('products').delete().eq('id', id);
    setBusy(false);
    setOpen(false);
    if (error) {
      alert(error.message);
    } else {
      r.push('/admin/products');
      r.refresh();
    }
  }

  return (
    <>
      <button type="button" className="danger" onClick={() => setOpen(true)}>
        Delete product
      </button>
      <ConfirmModal
        open={open}
        title="Delete Product"
        message="Are you sure you want to permanently delete this product?"
        confirmLabel="Delete Product"
        cancelLabel="Cancel"
        busy={busy}
        onConfirm={del}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
