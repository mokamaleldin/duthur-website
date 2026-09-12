import { isLocale, policyContent } from '@/lib/i18n';
import type { Locale } from '@/types/store';
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const copy = policyContent.privacy[locale];
  const isRtl = locale === 'ar';

  return (
    <main className="policy-page" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="policy-container">
        <h1 className="policy-heading">{copy.title}</h1>
        <div className="policy-body">
          <p className="policy-highlight">{copy.highlight}</p>

          <h2 className="policy-subheading">{copy.collectTitle}</h2>
          <ul className="policy-list">
            {copy.collected.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h2 className="policy-subheading">{copy.useTitle}</h2>
          <ul className="policy-list">
            {copy.uses.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <p>{copy.noSellNote}</p>
          <p>{copy.securePaymentNote}</p>
          <p>{copy.cookiesNote}</p>
          <p>{copy.consentNote}</p>

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
