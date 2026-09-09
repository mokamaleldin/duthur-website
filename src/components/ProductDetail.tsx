'use client';

import Image from 'next/image';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';
import type { Locale, Product } from '@/types/store';
import { dict, getText } from '@/lib/i18n';
import { imageUrl } from '@/lib/images';
import { useCart } from './CartProvider';

export function ProductDetail({ product, locale }: { product: Product; locale: Locale }) {
  const t = dict[locale];
  const images = useMemo(
    () => [...(product.product_images || [])].sort((a, b) => a.position - b.position),
    [product.product_images]
  );
  const variants = useMemo(
    () => [...(product.product_variants || [])].sort((a, b) => a.position - b.position),
    [product.product_variants]
  );

  const [activeImage, setActiveImage] = useState(0);
  const [variantId, setVariantId] = useState(
    variants.find((v) => v.stock_quantity > 0 && v.active)?.id || variants[0]?.id
  );
  const [qty, setQty] = useState(1);
  const [qtyAnim, setQtyAnim] = useState<'up' | 'down' | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [flyingClone, setFlyingClone] = useState<{
    src: string;
    start: { x: number; y: number; width: number; height: number };
    end: { x: number; y: number };
  } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const mainImageContainerRef = useRef<HTMLDivElement>(null);

  const cart = useCart();
  const variant = useMemo(() => variants.find((v) => v.id === variantId), [variants, variantId]);

  const isSoldOut = variants.length > 0 && variants.every((v) => v.stock_quantity <= 0 || !v.active);
  const currentPrice = variant?.price ?? product.base_price;
  const compareAtPrice = variant?.compare_at_price ?? product.compare_at_price;
  const isOnSale = compareAtPrice != null && Number(compareAtPrice) > Number(currentPrice);

  // Gallery Navigation (wrapping)
  const nextImage = useCallback(() => {
    if (images.length <= 1) return;
    setActiveImage((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    if (images.length <= 1) return;
    setActiveImage((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Mouse Drag on Desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (images.length <= 1) return;
    dragStartX.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragStartX.current === null) return;
    const deltaX = e.clientX - dragStartX.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        // Dragged left
        locale === 'ar' ? prevImage() : nextImage();
      } else {
        // Dragged right
        locale === 'ar' ? nextImage() : prevImage();
      }
    }
    dragStartX.current = null;
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    dragStartX.current = null;
    setIsDragging(false);
  };

  // Touch Swipe on Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (images.length <= 1) return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        // Swiped left
        locale === 'ar' ? prevImage() : nextImage();
      } else {
        // Swiped right
        locale === 'ar' ? nextImage() : prevImage();
      }
    }
    touchStartX.current = null;
  };

  // Keyboard navigation on gallery
  const handleGalleryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      locale === 'ar' ? nextImage() : prevImage();
    } else if (e.key === 'ArrowRight') {
      locale === 'ar' ? prevImage() : nextImage();
    }
  };

  // Quantity controls
  const handleDecQty = () => {
    if (qty > 1) {
      setQtyAnim('down');
      setQty((prev) => prev - 1);
    }
  };

  const handleIncQty = () => {
    const maxStock = variant?.stock_quantity || 1;
    if (qty < maxStock) {
      setQtyAnim('up');
      setQty((prev) => prev + 1);
    }
  };

  // Add to Cart Flow with Flying Micro-interaction
  const handleAddToCart = () => {
    if (!variant || variant.stock_quantity < 1 || isAdding) return;

    const currentImg = images[activeImage] || images[0];
    const imageSrc = imageUrl(currentImg?.storage_path);
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const cartLinkEl = document.querySelector('.cart-link');
    const imageBoxEl = mainImageContainerRef.current;

    if (!prefersReduced && cartLinkEl && imageBoxEl) {
      const imgRect = imageBoxEl.getBoundingClientRect();
      const cartRect = cartLinkEl.getBoundingClientRect();

      setIsAdding(true);
      setFlyingClone({
        src: imageSrc,
        start: {
          x: imgRect.left + imgRect.width / 2 - 34,
          y: imgRect.top + imgRect.height / 2 - 34,
          width: 68,
          height: 68,
        },
        end: {
          x: cartRect.left + cartRect.width / 2 - 12,
          y: cartRect.top + cartRect.height / 2 - 12,
        },
      });

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('duthur-cart-pulse'));
        cart.add({
          variantId: variant.id,
          productId: product.id,
          slug: product.slug,
          title: getText(product, 'title', locale),
          image: imageUrl(images[0]?.storage_path),
          optionValues: variant.option_values,
          price: Number(variant.price),
          quantity: qty,
          stock: variant.stock_quantity,
        });
        setFlyingClone(null);
        setIsAdding(false);
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 1400);
      }, 550);
    } else {
      cart.add({
        variantId: variant.id,
        productId: product.id,
        slug: product.slug,
        title: getText(product, 'title', locale),
        image: imageUrl(images[0]?.storage_path),
        optionValues: variant.option_values,
        price: Number(variant.price),
        quantity: qty,
        stock: variant.stock_quantity,
      });
      window.dispatchEvent(new CustomEvent('duthur-cart-pulse'));
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1400);
    }
  };

  const productTitle = getText(product, 'title', locale);
  const productDescription = getText(product, 'description', locale);

  return (
    <main className="product-detail">
      {/* 1. PRODUCT GALLERY */}
      <section className="gallery">
        <div
          ref={mainImageContainerRef}
          className={`main-image-wrap ${isDragging ? 'is-dragging' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onKeyDown={handleGalleryKeyDown}
          tabIndex={0}
          role="region"
          aria-label={productTitle}
        >
          {images[activeImage] && (
            <div key={images[activeImage].id} className="gallery-slide">
              <Image
                src={imageUrl(images[activeImage].storage_path)}
                alt={images[activeImage].alt_text || productTitle}
                fill
                priority={activeImage === 0}
                sizes="(max-width: 900px) 100vw, 55vw"
                className="gallery-active-image"
                draggable={false}
              />
            </div>
          )}

          {/* Left / Right Gallery Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="gallery-arrow prev"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                aria-label={t.prevImage}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="gallery-arrow next"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                aria-label={t.nextImage}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* Sold out / Sale badge on gallery */}
          {isSoldOut ? (
            <span className="product-badge sold-out">{t.soldOut}</span>
          ) : isOnSale ? (
            <span className="product-badge sale">{t.sale}</span>
          ) : null}
        </div>

        {/* Thumbnail Navigation */}
        {images.length > 1 && (
          <div className="gallery-thumbs" role="tablist" aria-label="Product Thumbnails">
            {images.map((im, i) => (
              <button
                key={im.id}
                type="button"
                role="tab"
                aria-selected={i === activeImage}
                aria-label={`${productTitle} ${i + 1}`}
                className={`thumb-btn ${i === activeImage ? 'active' : ''}`}
                onClick={() => setActiveImage(i)}
              >
                <Image
                  src={imageUrl(im.storage_path)}
                  alt=""
                  fill
                  sizes="84px"
                  className="thumb-image"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 2. PRODUCT INFO & CONTROLS */}
      <section className="product-info">
        <header className="product-info-head">
          <h1 className="product-title">{productTitle}</h1>
          <div className="product-price-row">
            <span className="product-price">{Number(currentPrice).toFixed(2)} TL</span>
            {isOnSale && (
              <del className="product-compare-price">{Number(compareAtPrice).toFixed(2)} TL</del>
            )}
          </div>
        </header>

        {productDescription && <p className="product-description">{productDescription}</p>}

        {/* Size Selection */}
        {variants.length > 0 && (
          <div className="size-selector-wrap">
            <label className="section-label">{t.selectSize}</label>
            <div className="variant-grid" role="radiogroup" aria-label={t.selectSize}>
              {variants.map((v) => {
                const isOutOfStock = !v.active || v.stock_quantity <= 0;
                const isSelected = variantId === v.id;
                const label = v.option_values.Size || Object.values(v.option_values).join(' / ');
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isOutOfStock}
                    className={`size-btn ${isSelected ? 'active' : ''} ${
                      isOutOfStock ? 'out-of-stock' : ''
                    }`}
                    onClick={() => {
                      setVariantId(v.id);
                      setQty(1);
                    }}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Buy Row: Quantity & Add to Cart */}
        <div className="buy-row">
          <div className="qty-control" aria-label={t.quantity}>
            <button
              type="button"
              className="qty-btn dec"
              onClick={handleDecQty}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <div className="qty-display">
              <span
                key={qty}
                className={`qty-num ${qtyAnim ? `anim-${qtyAnim}` : ''}`}
                onAnimationEnd={() => setQtyAnim(null)}
              >
                {qty}
              </span>
            </div>
            <button
              type="button"
              className="qty-btn inc"
              onClick={handleIncQty}
              disabled={!variant || qty >= variant.stock_quantity}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            className={`primary add-to-cart-btn ${isAdded ? 'is-added' : ''} ${
              isAdding ? 'is-loading' : ''
            }`}
            disabled={!variant || variant.stock_quantity < 1 || isAdding}
            onClick={handleAddToCart}
          >
            {isAdded ? (
              <span className="btn-feedback">
                <Check size={16} className="feedback-icon" />
                <span>{t.addedToCart}</span>
              </span>
            ) : isSoldOut ? (
              <span>{t.soldOut}</span>
            ) : (
              <span>{t.addToCart}</span>
            )}
          </button>
        </div>

        {/* 3. PRODUCT ACCORDIONS */}
        <div className="product-accordions">
          {product.size_chart?.length > 0 && (
            <details className="accordion-item" open>
              <summary className="accordion-summary">
                <span>{t.sizeChart}</span>
                <ChevronDown className="accordion-chevron" size={17} />
              </summary>
              <div className="accordion-content">
                <div className="table-wrap">
                  <table className="size-table">
                    <thead>
                      <tr>
                        <th>{t.tableSize}</th>
                        <th>{t.tableLength}</th>
                        <th>{t.tableChest}</th>
                        <th>{t.tableSleeve}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.size_chart.map((r) => (
                        <tr key={r.size}>
                          <td>{r.size}</td>
                          <td>
                            {r.length} {t.unitCm}
                          </td>
                          <td>
                            {r.chest} {t.unitCm}
                          </td>
                          <td>
                            {r.sleeve} {t.unitCm}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          )}

          <details className="accordion-item">
            <summary className="accordion-summary">
              <span>{t.materialFit}</span>
              <ChevronDown className="accordion-chevron" size={17} />
            </summary>
            <div className="accordion-content">
              <p>
                {getText(product, 'material_fit', locale) ||
                  (locale === 'ar'
                    ? 'قطن فاخر 100%. قَصّة Oversized / Boxy Fit.'
                    : locale === 'tr'
                    ? '%100 Premium Pamuk. Oversize / Rahat Kalıp.'
                    : '100% Premium Cotton. Oversized / Boxy Fit.')}
              </p>
            </div>
          </details>

          <details className="accordion-item">
            <summary className="accordion-summary">
              <span>{t.shippingDelivery}</span>
              <ChevronDown className="accordion-chevron" size={17} />
            </summary>
            <div className="accordion-content">
              <p>{getText(product, 'shipping', locale) || t.defaultShipping}</p>
            </div>
          </details>

          <details className="accordion-item">
            <summary className="accordion-summary">
              <span>{t.careInstructions}</span>
              <ChevronDown className="accordion-chevron" size={17} />
            </summary>
            <div className="accordion-content">
              <p>{getText(product, 'care', locale) || t.defaultCare}</p>
            </div>
          </details>
        </div>
      </section>

      {/* 4. TEMPORARY FLYING CLONE MICRO-INTERACTION */}
      {flyingClone && (
        <div
          className="flying-cart-item"
          style={
            {
              '--start-x': `${flyingClone.start.x}px`,
              '--start-y': `${flyingClone.start.y}px`,
              '--end-x': `${flyingClone.end.x}px`,
              '--end-y': `${flyingClone.end.y}px`,
            } as React.CSSProperties
          }
        >
          <img src={flyingClone.src} alt="" />
        </div>
      )}
    </main>
  );
}

