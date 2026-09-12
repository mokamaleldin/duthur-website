'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Copy, Check, Upload, CheckCircle2 } from 'lucide-react';
import { useCart } from '@/components/CartProvider';
import { createClient } from '@/lib/supabase/browser';
import { dict, isLocale } from '@/lib/i18n';
import { turkeyProvinces } from '@/lib/turkey';
import { imageUrl } from '@/lib/images';

type Settings = {
  standard_shipping_price: number;
  free_shipping_min_quantity: number | null;
  pickup_enabled: boolean;
  pickup_title_ar: string;
  pickup_title_en: string;
  pickup_title_tr: string;
  pickup_description_ar: string;
  pickup_description_en: string;
  pickup_description_tr: string;
  bank_instructions_ar: string;
  bank_instructions_en: string;
  bank_instructions_tr: string;
  bank_account_holder?: string;
  bank_iban?: string;
};

type AppliedDiscount = {
  code: string;
  amount: number;
  type: 'percentage' | 'fixed';
  value: number;
};

export default function Checkout() {
  const params = useParams<{ locale: string }>();
  const locale = isLocale(params.locale) ? params.locale : 'en';
  const t = dict[locale];
  const isRtl = locale === 'ar';
  const cart = useCart();
  const supabase = useMemo(() => createClient(), []);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'pickup'>('standard');
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [discountMsg, setDiscountMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<any>(null);

  const [copiedIban, setCopiedIban] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofStatus, setProofStatus] = useState<{ message: string; isError: boolean } | null>(null);

  useEffect(() => {
    supabase
      .from('store_settings')
      .select('*')
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as Settings);
      });
  }, [supabase]);

  // Bank transfer constant fallbacks
  const bankIban = settings?.bank_iban || 'TR 3200 0100 9011 0528 0760 5005';
  const bankHolder = settings?.bank_account_holder || 'Mohamed Kamaleldin Mohamed Attia Eliwa';

  // Shipping calculation
  const shipping =
    shippingMethod === 'pickup'
      ? 0
      : settings?.free_shipping_min_quantity && cart.count >= settings.free_shipping_min_quantity
      ? 0
      : Number(settings?.standard_shipping_price || 0);

  // Discount amount calculation
  const discountAmount = appliedDiscount ? appliedDiscount.amount : 0;

  // Final Total calculation: subtotal - discount + shipping
  const calculatedTotal = Math.max(0, cart.subtotal - discountAmount + shipping);

  function copyIban() {
    navigator.clipboard.writeText(bankIban.replace(/\s+/g, ''));
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2400);
  }

  async function applyDiscountCode() {
    const trimmed = discountCodeInput.trim().toUpperCase();
    if (!trimmed) {
      setAppliedDiscount(null);
      setDiscountMsg(null);
      return;
    }

    setValidatingDiscount(true);
    setDiscountMsg(null);

    const { data: codeData, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', trimmed)
      .eq('active', true)
      .maybeSingle();

    setValidatingDiscount(false);

    if (error || !codeData) {
      setAppliedDiscount(null);
      setDiscountMsg({
        text: locale === 'ar' ? 'كود الخصم غير صالح.' : locale === 'tr' ? 'Geçersiz indirim kodu.' : 'Invalid discount code.',
        isError: true,
      });
      return;
    }

    if (codeData.minimum_order_amount && cart.subtotal < Number(codeData.minimum_order_amount)) {
      setAppliedDiscount(null);
      setDiscountMsg({
        text: locale === 'ar'
          ? `الحد الأدنى لتطبيق هذا الكود هو ${codeData.minimum_order_amount} TL.`
          : locale === 'tr'
          ? `Bu kod için minimum sipariş tutarı ${codeData.minimum_order_amount} TL'dir.`
          : `Minimum order amount for this code is ${codeData.minimum_order_amount} TL.`,
        isError: true,
      });
      return;
    }

    let calculatedDsc = 0;
    if (codeData.type === 'percentage') {
      calculatedDsc = (cart.subtotal * Number(codeData.value)) / 100;
    } else {
      calculatedDsc = Number(codeData.value);
    }
    calculatedDsc = Math.min(calculatedDsc, cart.subtotal);

    setAppliedDiscount({
      code: codeData.code,
      amount: calculatedDsc,
      type: codeData.type,
      value: Number(codeData.value),
    });
    setDiscountMsg({
      text: locale === 'ar' ? 'تم تطبيق كود الخصم بنجاح ✓' : locale === 'tr' ? 'İndirim uygulandı ✓' : 'Discount code applied ✓',
      isError: false,
    });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cart.items.length) return;

    setSubmitError('');
    const formElement = e.currentTarget;
    const form = new FormData(formElement);

    const firstName = String(form.get('firstName') || '').trim();
    const lastName = String(form.get('lastName') || '').trim();
    const email = String(form.get('email') || '').trim();
    const phone = String(form.get('phone') || '').trim();
    const province = String(form.get('province') || '').trim();
    const district = String(form.get('district') || '').trim();
    const address = String(form.get('address') || '').trim();
    const addressDetails = String(form.get('addressDetails') || '').trim();
    const postalCode = String(form.get('postalCode') || '').trim();

    // Localized application validation
    const errors: Record<string, string> = {};

    if (!email) {
      errors.email = t.requiredField;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t.invalidEmail;
    }

    if (!phone) {
      errors.phone = t.requiredField;
    } else if (phone.replace(/\D/g, '').length < 7) {
      errors.phone = t.invalidPhone;
    }

    if (!firstName) {
      errors.firstName = t.enterFirstName;
    }
    if (!lastName) {
      errors.lastName = t.enterLastName;
    }
    if (!province) {
      errors.province = t.selectProvince;
    }
    if (!district) {
      errors.district = t.enterDistrict;
    }
    if (!address) {
      errors.address = t.enterAddress;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstErrorField = Object.keys(errors)[0];
      const el = formElement.elements.namedItem(firstErrorField) as HTMLElement | null;
      if (el && typeof el.focus === 'function') el.focus();
      return;
    }

    setFieldErrors({});
    setLoading(true);

    const customer = {
      firstName,
      lastName,
      email,
      phone,
      province,
      district,
      address,
      addressDetails: addressDetails || null,
      postalCode: postalCode || null,
    };

    const { data, error } = await supabase.rpc('create_store_order', {
      p_customer: customer,
      p_items: cart.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      p_discount_code: appliedDiscount ? appliedDiscount.code : discountCodeInput.trim() || null,
      p_shipping_method: shippingMethod,
      p_locale: locale,
    });

    if (error) {
      setSubmitError(error.message);
      setLoading(false);
      return;
    }

    setOrder(data);
    cart.clear();
    setLoading(false);
  }

  async function handleProofUpload(orderId: string) {
    if (!proofFile) return;

    if (proofFile.size > 5 * 1024 * 1024) {
      setProofStatus({ message: t.fileSizeError, isError: true });
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(proofFile.type)) {
      setProofStatus({ message: t.fileTypeError, isError: true });
      return;
    }

    setUploadingProof(true);
    setProofStatus(null);

    const formData = new FormData();
    formData.append('file', proofFile);

    try {
      const res = await fetch(`/api/orders/${orderId}/payment-proof`, {
        method: 'POST',
        body: formData,
      });
      const resJson = await res.json();

      setUploadingProof(false);
      if (res.ok && resJson.success) {
        setProofStatus({ message: t.receiptUploaded, isError: false });
      } else {
        setProofStatus({
          message: resJson.error || t.receiptUploadError,
          isError: true,
        });
      }
    } catch {
      setUploadingProof(false);
      setProofStatus({ message: t.receiptUploadError, isError: true });
    }
  }

  // SUCCESS VIEW
  if (order) {
    const bankInstructions =
      settings?.[`bank_instructions_${locale}` as keyof Settings] ||
      settings?.bank_instructions_en ||
      `${bankIban} — ${bankHolder}`;

    return (
      <main className="checkout-success-view" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="checkout-success-container">
          <div className="success-card">
            <div className="success-logo-wrap">
              <Image
                src="/images/logo-full-light.png"
                alt="DUTHUR"
                width={120}
                height={42}
                priority
              />
            </div>
            <p className="success-eyebrow">DUTHUR</p>
            <h1 className="success-title">{t.orderConfirmed}</h1>

            <div className="success-order-box">
              <span className="order-label">{t.orderNumber}</span>
              <strong className="order-val">#{order.orderNumber}</strong>
            </div>

            {/* Totals Breakdown */}
            <div className="success-totals">
              <div className="success-row">
                <span>{t.subtotal}</span>
                <b>{Number(order.subtotal).toFixed(2)} TL</b>
              </div>
              {Number(order.discount) > 0 && (
                <div className="success-row discount">
                  <span>{t.discount}</span>
                  <b>-{Number(order.discount).toFixed(2)} TL</b>
                </div>
              )}
              <div className="success-row">
                <span>{t.shipping}</span>
                <b>
                  {Number(order.shipping) === 0 ? t.freeShippingBadge : `${Number(order.shipping).toFixed(2)} TL`}
                </b>
              </div>
              <div className="success-row grand">
                <span>{t.total}</span>
                <b>{Number(order.total).toFixed(2)} TL</b>
              </div>
            </div>

            {/* Bank Transfer Instructions Card */}
            <div className="success-bank-box">
              <h3>{t.bankTransfer}</h3>
              <p className="bank-card-desc">{t.bankTransferDesc}</p>
              <div className="success-bank-details">
                <div className="bank-detail-item">
                  <span className="bank-detail-label">{t.accountHolder}</span>
                  <strong className="bank-detail-val" dir="ltr">{bankHolder}</strong>
                </div>
                <div className="bank-detail-item">
                  <span className="bank-detail-label">{t.iban}</span>
                  <div className="bank-iban-row">
                    <strong className="bank-detail-val bank-iban-val" dir="ltr">{bankIban}</strong>
                    <button
                      type="button"
                      className={`copy-iban-btn ${copiedIban ? 'copied' : ''}`}
                      onClick={copyIban}
                      aria-label={t.copyIban}
                    >
                      {copiedIban ? (
                        <>
                          <Check size={14} />
                          <span>{t.copiedIban}</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>{t.copyIban}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {bankInstructions && (
                <small style={{ color: '#888', marginTop: '6px', display: 'block', fontSize: '12px' }}>
                  {bankInstructions}
                </small>
              )}
            </div>

            {/* Optional Payment Proof Upload */}
            <div className="payment-proof-box">
              <div className="payment-proof-header">
                <h3>{t.uploadReceiptTitle}</h3>
                <p>{t.uploadReceiptDesc}</p>
              </div>

              {proofStatus?.isError === false ? (
                <p className="payment-proof-success">
                  <CheckCircle2 size={16} />
                  <span>{proofStatus.message}</span>
                </p>
              ) : (
                <form
                  className="payment-proof-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleProofUpload(order.id);
                  }}
                >
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="payment-proof-file-input"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setProofFile(f);
                      setProofStatus(null);
                    }}
                  />
                  {proofStatus?.isError && (
                    <p className="payment-proof-error" role="alert">
                      {proofStatus.message}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="payment-proof-upload-btn"
                    disabled={!proofFile || uploadingProof}
                  >
                    <Upload size={14} />
                    <span>{uploadingProof ? t.uploadingReceipt : t.uploadButton}</span>
                  </button>
                </form>
              )}
            </div>

            <Link href={`/${locale}/products`} className="success-btn">
              {t.continueShopping}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // CHECKOUT FORM VIEW
  return (
    <main className="checkout-page" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="checkout-page-container">
        {/* Top Brand Bar */}
        <div className="checkout-top-bar">
          <Link href={`/${locale}`} className="checkout-logo-link" aria-label="DUTHUR">
            <Image
              src="/images/logo-full-dark.png"
              alt="DUTHUR"
              width={112}
              height={40}
              priority
              className="checkout-logo-img"
            />
          </Link>
        </div>

        <div className="checkout-grid-layout">
          {/* FORM COLUMN */}
          <div className="checkout-form-column">
            <form onSubmit={submit} className="checkout-form-inner" noValidate>
              <h1 className="checkout-heading">{t.checkoutTitle}</h1>

              {/* CONTACT SECTION */}
              <section className="checkout-section">
                <h2 className="checkout-subheading">{t.contactTitle}</h2>
                <div className="grid2">
                  <div>
                    <input
                      type="email"
                      name="email"
                      placeholder={t.email}
                      className="checkout-field"
                      dir="ltr"
                      autoComplete="email"
                      onChange={() => fieldErrors.email && setFieldErrors(prev => ({ ...prev, email: '' }))}
                    />
                    {fieldErrors.email && (
                      <p className="form-error" role="alert">{fieldErrors.email}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="tel"
                      name="phone"
                      placeholder={t.phone}
                      className="checkout-field"
                      dir="ltr"
                      autoComplete="tel"
                      onChange={() => fieldErrors.phone && setFieldErrors(prev => ({ ...prev, phone: '' }))}
                    />
                    {fieldErrors.phone && (
                      <p className="form-error" role="alert">{fieldErrors.phone}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* DELIVERY SECTION */}
              <section className="checkout-section">
                <h2 className="checkout-subheading">{t.delivery}</h2>
                <div className="fixed-country-field">Türkiye</div>
                <div className="grid2">
                  <div>
                    <input
                      name="firstName"
                      placeholder={t.firstName}
                      className="checkout-field"
                      autoComplete="given-name"
                      onChange={() => fieldErrors.firstName && setFieldErrors(prev => ({ ...prev, firstName: '' }))}
                    />
                    {fieldErrors.firstName && (
                      <p className="form-error" role="alert">{fieldErrors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <input
                      name="lastName"
                      placeholder={t.lastName}
                      className="checkout-field"
                      autoComplete="family-name"
                      onChange={() => fieldErrors.lastName && setFieldErrors(prev => ({ ...prev, lastName: '' }))}
                    />
                    {fieldErrors.lastName && (
                      <p className="form-error" role="alert">{fieldErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid2">
                  <div>
                    <select
                      name="province"
                      defaultValue=""
                      className="checkout-field checkout-select"
                      onChange={() => fieldErrors.province && setFieldErrors(prev => ({ ...prev, province: '' }))}
                    >
                      <option value="" disabled>
                        {t.province}
                      </option>
                      {turkeyProvinces.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.province && (
                      <p className="form-error" role="alert">{fieldErrors.province}</p>
                    )}
                  </div>
                  <div>
                    <input
                      name="district"
                      placeholder={t.district}
                      className="checkout-field"
                      onChange={() => fieldErrors.district && setFieldErrors(prev => ({ ...prev, district: '' }))}
                    />
                    {fieldErrors.district && (
                      <p className="form-error" role="alert">{fieldErrors.district}</p>
                    )}
                  </div>
                </div>

                <div>
                  <input
                    name="address"
                    placeholder={t.address}
                    className="checkout-field"
                    autoComplete="street-address"
                    onChange={() => fieldErrors.address && setFieldErrors(prev => ({ ...prev, address: '' }))}
                  />
                  {fieldErrors.address && (
                    <p className="form-error" role="alert">{fieldErrors.address}</p>
                  )}
                </div>

                <input
                  name="addressDetails"
                  placeholder={t.addressDetails}
                  className="checkout-field"
                />
                <input
                  name="postalCode"
                  placeholder={t.postalCode}
                  className="checkout-field"
                  dir="ltr"
                />
              </section>

              {/* SHIPPING METHOD */}
              <section className="checkout-section">
                <h2 className="checkout-subheading">{t.shippingMethod}</h2>
                <div className="shipping-choices-group">
                  <label
                    className={`choice-card ${
                      shippingMethod === 'standard' ? 'is-selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="shippingMethod"
                      checked={shippingMethod === 'standard'}
                      onChange={() => setShippingMethod('standard')}
                      className="choice-radio"
                    />
                    <div className="choice-text">
                      <span className="choice-main-title">{t.standardShipping}</span>
                    </div>
                    <b className="choice-price-tag">
                      {shipping === 0 ? t.freeShippingBadge : `${settings?.standard_shipping_price || 0} TL`}
                    </b>
                  </label>

                  {settings?.pickup_enabled && (
                    <label
                      className={`choice-card ${
                        shippingMethod === 'pickup' ? 'is-selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="shippingMethod"
                        checked={shippingMethod === 'pickup'}
                        onChange={() => setShippingMethod('pickup')}
                        className="choice-radio"
                      />
                      <div className="choice-text">
                        <span className="choice-main-title">
                          {(settings[`pickup_title_${locale}` as keyof Settings] as string) ||
                            t.pickup}
                        </span>
                        {settings[`pickup_description_${locale}` as keyof Settings] && (
                          <small className="choice-desc">
                            {settings[`pickup_description_${locale}` as keyof Settings] as string}
                          </small>
                        )}
                      </div>
                      <b className="choice-price-tag">{t.freeShippingBadge}</b>
                    </label>
                  )}
                </div>
              </section>

              {/* PAYMENT SECTION (BEFORE SUBMISSION) */}
              <section className="checkout-section">
                <h2 className="checkout-subheading">{t.paymentTitle}</h2>
                <div className="checkout-bank-card">
                  <div className="bank-card-header">
                    <span className="bank-badge">{t.bankTransfer}</span>
                  </div>
                  <p className="bank-card-desc">{t.bankTransferDesc}</p>

                  <div className="bank-details-grid">
                    <div className="bank-detail-item">
                      <span className="bank-detail-label">{t.accountHolder}</span>
                      <strong className="bank-detail-val" dir="ltr">{bankHolder}</strong>
                    </div>

                    <div className="bank-detail-item">
                      <span className="bank-detail-label">{t.iban}</span>
                      <div className="bank-iban-row">
                        <strong className="bank-detail-val bank-iban-val" dir="ltr">{bankIban}</strong>
                        <button
                          type="button"
                          className={`copy-iban-btn ${copiedIban ? 'copied' : ''}`}
                          onClick={copyIban}
                          aria-label={t.copyIban}
                        >
                          {copiedIban ? (
                            <>
                              <Check size={14} />
                              <span>{t.copiedIban}</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span>{t.copyIban}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* DISCOUNT CODE */}
              <section className="checkout-section">
                <div className="discount-row">
                  <input
                    value={discountCodeInput}
                    onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyDiscountCode();
                      }
                    }}
                    placeholder={t.discountCode}
                    className="checkout-field discount-field"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="discount-apply-btn"
                    onClick={applyDiscountCode}
                    disabled={validatingDiscount || !discountCodeInput.trim()}
                  >
                    {validatingDiscount ? '...' : t.applyDiscount}
                  </button>
                </div>
                {discountMsg && (
                  <p
                    className={discountMsg.isError ? 'form-error' : 'discount-success-tag'}
                    role="status"
                  >
                    {discountMsg.text}
                  </p>
                )}
              </section>

              {submitError && (
                <p className="form-error" role="alert">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                className="checkout-cta-btn"
                disabled={loading || !cart.items.length}
              >
                {loading ? t.placingOrder : t.placeOrder}
              </button>
            </form>
          </div>

          {/* ORDER SUMMARY COLUMN */}
          <aside className="checkout-summary-column">
            <div className="checkout-summary-panel">
              <h2 className="summary-title">{t.yourCart}</h2>

              <div className="summary-items-box">
                {cart.items.map((i) => (
                  <div className="summary-item-row" key={i.variantId}>
                    {i.image && (
                      <div className="summary-thumb-box">
                        <Image
                          src={imageUrl(i.image)}
                          alt={i.title}
                          fill
                          sizes="60px"
                          className="summary-thumb-img"
                        />
                      </div>
                    )}
                    <div className="summary-info">
                      <span className="summary-name">{i.title}</span>
                      <span className="summary-variant">
                        {Object.values(i.optionValues).join(' / ')}
                      </span>
                      <span className="summary-qty">× {i.quantity}</span>
                    </div>
                    <b className="summary-price">{(i.price * i.quantity).toFixed(2)} TL</b>
                  </div>
                ))}
              </div>

              {/* Reactive Totals: subtotal - discount + shipping */}
              <div className="summary-totals-box">
                <div className="totals-line">
                  <span>{t.subtotal}</span>
                  <b>{cart.subtotal.toFixed(2)} TL</b>
                </div>
                {discountAmount > 0 && (
                  <div className="totals-line">
                    <span>{t.discount}</span>
                    <b style={{ color: '#2b8a3e' }}>-{discountAmount.toFixed(2)} TL</b>
                  </div>
                )}
                <div className="totals-line">
                  <span>{t.shipping}</span>
                  <b>{shipping === 0 ? t.freeShippingBadge : `${shipping.toFixed(2)} TL`}</b>
                </div>
                <div className="totals-line grand">
                  <span>{t.total}</span>
                  <b>{calculatedTotal.toFixed(2)} TL*</b>
                </div>
              </div>

              <small className="summary-note">
                *{' '}{t.checkoutNote}
              </small>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

