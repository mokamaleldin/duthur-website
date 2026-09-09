'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { isLocale } from '@/lib/i18n';
import type { Locale } from '@/types/store';

const contactCopy = {
  en: {
    title: 'Contact us',
    name: 'Name',
    email: 'Email',
    message: 'Message',
    submit: 'Submit',
    sending: 'Sending...',
    sent: 'Message sent.',
  },
  ar: {
    title: 'تواصل معنا',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    message: 'الرسالة',
    submit: 'إرسال',
    sending: 'جارٍ الإرسال...',
    sent: 'تم إرسال رسالتك.',
  },
  tr: {
    title: 'Bize ulaşın',
    name: 'Ad',
    email: 'E-posta',
    message: 'Mesaj',
    submit: 'Gönder',
    sending: 'Gönderiliyor...',
    sent: 'Mesajınız gönderildi.',
  },
} satisfies Record<
  Locale,
  {
    title: string;
    name: string;
    email: string;
    message: string;
    submit: string;
    sending: string;
    sent: string;
  }
>;

export default function Contact() {
  const params = useParams<{ locale: string }>();
  const locale = isLocale(params.locale) ? params.locale : 'tr';
  const copy = contactCopy[locale];
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElement = e.currentTarget;
    setSubmitting(true);
    setState(copy.sending);
    const form = new FormData(formElement);
    const { error } = await supabase.rpc('submit_contact_message', {
      p_name: form.get('name'),
      p_email: form.get('email'),
      p_message: form.get('message'),
    });
    setSubmitting(false);
    setState(error ? error.message : copy.sent);
    if (!error) formElement.reset();
  }

  return (
    <main className="contact-page">
      <section className="contact-content" aria-labelledby="contact-title">
        <h1 id="contact-title">{copy.title}</h1>
        <form className="contact-form" onSubmit={submit}>
          <div className="contact-grid">
            <label>
              <span>{copy.name}</span>
              <input required name="name" autoComplete="name" />
            </label>
            <label>
              <span>{copy.email}</span>
              <input required type="email" name="email" autoComplete="email" />
            </label>
          </div>
          <label>
            <span>{copy.message}</span>
            <textarea required name="message" rows={5} />
          </label>
          <button className="contact-submit" type="submit" disabled={submitting}>
            {submitting ? copy.sending : copy.submit}
          </button>
          {state && (
            <p className="contact-state" role="status">
              {state}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
