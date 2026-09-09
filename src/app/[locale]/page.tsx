import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/ProductCard';
import { dict, isLocale } from '@/lib/i18n';
import type { Product } from '@/types/store';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*,product_images(*),product_variants(*)')
    .eq('active', true)
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(6);

  const t = dict[locale];
  const products = ((data as Product[]) || []).slice(0, 3);

  return (
    <main className="home-main">
      {/* 1. HERO SECTION WITH IMAGE & EDITORIAL OVERLAY */}
      <section className="hero-section" aria-label="Hero">
        <div className="hero-media-wrap">
          <Image
            src="/images/hero.png"
            alt="DUTHUR — دُثُر"
            fill
            priority
            quality={90}
            sizes="100vw"
            className="hero-media-image"
          />
          <div className="hero-scrim" />
        </div>

        <div className="hero-content-wrap">
          <div className="hero-inner">
            <p className="hero-eyebrow">{t.heroEyebrow}</p>
            <h1 className="hero-heading">
              {t.heroTitle.split('\n').map((line, idx) => (
                <span key={idx} className="hero-title-line">
                  {line}
                  {idx === 0 && <br />}
                </span>
              ))}
            </h1>
            <p className="hero-description">{t.heroDesc}</p>
            <div className="hero-cta-wrap">
              <Link className="primary hero-cta" href={`/${locale}/products`}>
                {t.shopNow}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EDITORIAL COLLECTION SECTION */}
      <section className="collection-section" aria-label={t.ourCollection}>
        <div className="collection-header">
          <h2 className="collection-title">{t.ourCollection}</h2>
        </div>

        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} locale={locale} />
          ))}
        </div>

        <div className="collection-footer-cta">
          <Link href={`/${locale}/products`} className="view-all-link">
            <span>{t.viewAll}</span>
            <span className="view-all-arrow" aria-hidden="true">
              {locale === 'ar' ? '←' : '→'}
            </span>
          </Link>
        </div>
      </section>

      {/* 3. DUTHUR HORIZONTAL BRAND MARQUEE STRIP */}
      <section className="brand-marquee" aria-hidden="true">
        <div className="marquee-track">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={`m1-${i}`} className="marquee-item">
              <span className="marquee-brand">DUTHUR</span>
              <span className="marquee-sep">—</span>
              <span className="marquee-arabic">دُثُر</span>
              <span className="marquee-dot">•</span>
            </span>
          ))}
        </div>
        <div className="marquee-track" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={`m2-${i}`} className="marquee-item">
              <span className="marquee-brand">DUTHUR</span>
              <span className="marquee-sep">—</span>
              <span className="marquee-arabic">دُثُر</span>
              <span className="marquee-dot">•</span>
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
