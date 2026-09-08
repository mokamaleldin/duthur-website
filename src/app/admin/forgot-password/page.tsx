'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '').trim().toLowerCase();
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/admin/reset-password`,
    });

    setBusy(false);
    setMessage(error ? error.message : 'Password reset email sent. Open the newest email only.');
  }

  return (
    <main className="admin-login">
      <form onSubmit={submit}>
        <div className="admin-mark">دُثُر</div>
        <h1>Reset password</h1>
        <p>Enter the approved admin email. We will send a fresh reset link.</p>
        <input required type="email" name="email" placeholder="Admin email" autoComplete="email" />
        <button className="primary" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        {message && <p>{message}</p>}
        <p><Link href="/admin/login">Back to sign in</Link></p>
      </form>
    </main>
  );
}
