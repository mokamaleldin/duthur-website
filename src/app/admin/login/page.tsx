'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

const TEMP_TEST_EMAIL = 'mohamed@admin.com';

export default function AdminLogin() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '').trim().toLowerCase();
    const password = String(form.get('password') || '');

    if (email === TEMP_TEST_EMAIL) {
      const response = await fetch('/api/admin/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setMessage('Email or password is incorrect.');
        setBusy(false);
        return;
      }

      router.replace('/admin');
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage('Email or password is incorrect.');
      setBusy(false);
      return;
    }

    router.replace('/admin');
    router.refresh();
  }

  return (
    <main className="admin-login">
      <form onSubmit={submit}>
        <div className="admin-mark">دُثُر</div>
        <h1>DUTHUR Admin</h1>
        <p>Sign in with your approved admin email and password.</p>

        <input required type="email" name="email" placeholder="Admin email" autoComplete="username" />
        <input required type="password" name="password" placeholder="Password" autoComplete="current-password" />

        <button className="primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {message && <p className="form-error">{message}</p>}
        <p><Link href="/admin/forgot-password">Forgot password?</Link></p>
      </form>
    </main>
  );
}
