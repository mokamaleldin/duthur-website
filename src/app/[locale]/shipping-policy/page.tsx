import { isLocale, policyContent } from '@/lib/i18n';
import type { Locale } from '@/types/store';
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const copy = policyContent.shipping[locale];
  const isRtl = locale === 'ar';

  return (
    <main className="policy-page" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="policy-container">
        <h1 className="policy-heading">{copy.title}</h1>
        <div className="policy-body">
          <p>{copy.intro}</p>

          <h2 className="policy-subheading">{copy.processingTitle}</h2>
          <p>{copy.processingDesc}</p>

          <h2 className="policy-subheading">{copy.deliveryTitle}</h2>
          <p>{copy.deliveryDesc}</p>

          <h2 className="policy-subheading">{copy.notesTitle}</h2>
          <ul className="policy-list">
            {copy.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>

          <p>{copy.returnedNote}</p>
          <p>{copy.trackingNote}</p>

          <p>
            {copy.contactNote}{' '}
            <a href="mailto:duthurco@gmail.com" className="policy-email" dir="ltr">
              duthurco@gmail.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
