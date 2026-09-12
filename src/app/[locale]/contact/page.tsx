'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { isLocale, dict } from '@/lib/i18n';

export default function Contact() {
  const params = useParams<{ locale: string }>();
  const locale = isLocale(params.locale) ? params.locale : 'en';
  const t = dict[locale];
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<{ message: string; isError?: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});

  const isRtl = locale === 'ar';

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim();
    const message = String(form.get('message') || '').trim();

    const newErrors: { name?: string; email?: string; message?: string } = {};

    if (!name) {
      newErrors.name = t.requiredField;
    }
    if (!email) {
      newErrors.email = t.requiredField;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t.invalidEmail;
    }
    if (!message) {
      newErrors.message = t.requiredField;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    setState(null);

    const { error } = await supabase.rpc('submit_contact_message', {
      p_name: name,
      p_email: email,
      p_message: message,
    });

    setSubmitting(false);
    if (error) {
      setState({ message: t.messageFailed, isError: true });
    } else {
      setState({ message: t.messageSent, isError: false });
      formElement.reset();
    }
  }

  return (
    <main className="contact-page" dir={isRtl ? 'rtl' : 'ltr'}>
      <section className="contact-content" aria-labelledby="contact-title">
        <h1 id="contact-title">{t.contactPageTitle}</h1>
        <form className="contact-form" onSubmit={submit} noValidate>
          <div className="contact-grid">
            <label>
              <span>{t.name}</span>
              <input
                name="name"
                autoComplete="name"
                onChange={() => errors.name && setErrors(prev => ({ ...prev, name: undefined }))}
              />
              {errors.name && <span className="form-error" role="alert">{errors.name}</span>}
            </label>
            <label>
              <span>{t.email}</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                dir="ltr"
                onChange={() => errors.email && setErrors(prev => ({ ...prev, email: undefined }))}
              />
              {errors.email && <span className="form-error" role="alert">{errors.email}</span>}
            </label>
          </div>
          <label>
            <span>{t.message}</span>
            <textarea
              name="message"
              rows={5}
              onChange={() => errors.message && setErrors(prev => ({ ...prev, message: undefined }))}
            />
            {errors.message && <span className="form-error" role="alert">{errors.message}</span>}
          </label>
          <button className="contact-submit" type="submit" disabled={submitting}>
            {submitting ? t.sending : t.send}
          </button>
          {state && (
            <p
              className={`contact-state ${state.isError ? 'form-error' : ''}`}
              role="status"
            >
              {state.message}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
