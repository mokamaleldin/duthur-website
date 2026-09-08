'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');

    const form = new FormData(e.currentTarget);
    const password = String(form.get('password') || '');
    const confirm = String(form.get('confirm') || '');

    if (password.length < 10) {
      setMessage('Use at least 10 characters.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Password updated. Redirecting to admin…');
    setTimeout(() => {
      router.replace('/admin');
      router.refresh();
    }, 700);
  }

  return (
    <main className="admin-login">
      <form onSubmit={submit}>
        <div className="admin-mark">دُثُر</div>
        <h1>Choose a new password</h1>
        <p>Set the password for your DUTHUR admin account.</p>
        <input required minLength={10} type="password" name="password" placeholder="New password" autoComplete="new-password" />
        <input required minLength={10} type="password" name="confirm" placeholder="Confirm password" autoComplete="new-password" />
        <button className="primary" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
        {message && <p>{message}</p>}
      </form>
    </main>
  );
}
