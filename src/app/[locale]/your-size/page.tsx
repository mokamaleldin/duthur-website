import { notFound } from 'next/navigation';
import { SizeFinder } from '@/components/SizeFinder';
import { dict, isLocale } from '@/lib/i18n';
import type { Locale } from '@/types/store';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = dict[locale as Locale];

  return (
    <main className="section page size-page">
      <p className="eyebrow">{t.sizeEyebrow}</p>
      <h1 className="page-title">{t.sizePageTitle}</h1>
      <SizeFinder locale={locale as Locale} />
    </main>
  );
}

