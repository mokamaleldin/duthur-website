import Image from 'next/image';
import Link from 'next/link';
import type { Locale, Product } from '@/types/store';
import { getText, dict } from '@/lib/i18n';
import { imageUrl } from '@/lib/images';

export function ProductCard({ product, locale }: { product: Product; locale: Locale }) {
  const images = [...(product.product_images || [])].sort((a, b) => a.position - b.position);
  const img1 = images[0];
  const img2 = images[1];

  const variants = product.product_variants || [];
  const isSoldOut = variants.length > 0 && variants.every(v => v.stock_quantity <= 0 || !v.active);
  const activeVariant = variants.find(v => v.active);
  const currentPrice = activeVariant?.price ?? product.base_price;
  const compareAtPrice = activeVariant?.compare_at_price ?? product.compare_at_price;
  const isOnSale = compareAtPrice != null && Number(compareAtPrice) > Number(currentPrice);

  const title = getText(product, 'title', locale);

  return (
    <Link href={`/${locale}/products/${product.slug}`} className="product-card">
      <div className={`product-image-wrap ${img2 ? 'has-hover-image' : ''}`}>
        {img1 && (
          <Image
            src={imageUrl(img1.storage_path)}
            alt={img1.alt_text || title}
            fill
            sizes="(max-width: 700px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="product-card-image primary-image"
          />
        )}
        {img2 && (
          <Image
            src={imageUrl(img2.storage_path)}
            alt={img2.alt_text || `${title} - Alternate View`}
            fill
            sizes="(max-width: 700px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="product-card-image hover-image"
          />
        )}
        {isSoldOut ? (
          <span className="product-badge sold-out">{dict[locale].soldOut}</span>
        ) : isOnSale ? (
          <span className="product-badge sale">{dict[locale].sale}</span>
        ) : null}
      </div>

      <div className="product-card-meta">
        <h3 className="product-card-title">{title}</h3>
        <div className="product-card-pricing">
          <span className="product-price">{Number(currentPrice).toFixed(2)} TL</span>
          {isOnSale && (
            <del className="product-compare-price">{Number(compareAtPrice).toFixed(2)} TL</del>
          )}
        </div>
      </div>
    </Link>
  );
}
