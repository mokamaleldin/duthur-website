import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/ProductCard';
import { dict, isLocale } from '@/lib/i18n';
import type { Locale, Product } from '@/types/store';

export default async function Products({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*,product_images(*),product_variants(*)')
    .eq('active', true)
    .order('created_at', { ascending: false });

  const t = dict[locale as Locale];
  const products = (data as Product[]) || [];

  return (
    <main className="products-page">
      <div className="products-container">
        <header className="products-head">
          <p className="eyebrow">{t.productsEyebrow}</p>
          <h1 className="page-title">{t.products}</h1>
        </header>

        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale as Locale} />
          ))}
        </div>
      </div>
    </main>
  );
}

