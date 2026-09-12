import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartProvider } from '@/components/CartProvider';
import { isLocale } from '@/lib/i18n';
import type { Locale } from '@/types/store';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale} className={`locale-container locale-${locale}`}>
      <CartProvider>
        <Header locale={locale as Locale} />
        {children}
        <Footer locale={locale as Locale} />
      </CartProvider>
    </div>
  );
}
