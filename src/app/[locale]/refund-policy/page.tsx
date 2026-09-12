import { isLocale, policyContent } from '@/lib/i18n';
import type { Locale } from '@/types/store';
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const copy = policyContent.refund[locale];
  const isRtl = locale === 'ar';

  return (
    <main className="policy-page" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="policy-container">
        <h1 className="policy-heading">{copy.title}</h1>
        <div className="policy-body">
          <p className="policy-highlight">{copy.highlight}</p>
          <p>{copy.defectDesc}</p>

          <h2 className="policy-subheading">{copy.eligibleTitle}</h2>
          <ul className="policy-list">
            {copy.eligibility.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h2 className="policy-subheading">{copy.notAcceptedTitle}</h2>
          <ul className="policy-list">
            {copy.notAccepted.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <p>{copy.shippingCostNote}</p>
          <p>{copy.processNote}</p>
          <p>{copy.cancelNote}</p>

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
