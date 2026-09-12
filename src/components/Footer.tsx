import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/types/store';
import { dict } from '@/lib/i18n';

export function Footer({ locale }: { locale: Locale }) {
  const t = dict[locale];
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-inner">
        <div className="footer-grid">
          {/* COLUMN 1: BRAND & CONTACT */}
          <div className="footer-col footer-col-brand">
            <Link href={`/${locale}`} className="footer-brand-logo" aria-label="DUTHUR">
              <Image
                src="/images/logo-full-light.png"
                alt="DUTHUR"
                width={132}
                height={47}
                className="footer-logo-img"
              />
            </Link>
            <p className="footer-tagline">{t.footerTagline}</p>
            <a href="mailto:duthurco@gmail.com" className="footer-email-link" dir="ltr">
              duthurco@gmail.com
            </a>
          </div>

          {/* COLUMN 2: NAVIGATION */}
          <div className="footer-col">
            <h3 className="footer-heading">{t.navigation}</h3>
            <ul className="footer-list">
              <li><Link href={`/${locale}`}>{t.home}</Link></li>
              <li><Link href={`/${locale}/products`}>{t.shop}</Link></li>
              <li><Link href={`/${locale}/your-size`}>{t.size}</Link></li>
              <li><Link href={`/${locale}/about`}>{t.about}</Link></li>
              <li><Link href={`/${locale}/contact`}>{t.contact}</Link></li>
            </ul>
          </div>

          {/* COLUMN 3: POLICIES */}
          <div className="footer-col">
            <h3 className="footer-heading">{t.policies}</h3>
            <ul className="footer-list">
              <li><Link href={`/${locale}/shipping-policy`}>{t.shippingPolicy}</Link></li>
              <li><Link href={`/${locale}/refund-policy`}>{t.refundPolicy}</Link></li>
              <li><Link href={`/${locale}/privacy-policy`}>{t.privacyPolicy}</Link></li>
            </ul>
          </div>

          {/* COLUMN 4: SOCIAL */}
          <div className="footer-col">
            <h3 className="footer-heading">{t.social}</h3>
            <ul className="footer-list">
              <li>
                <a href="https://www.instagram.com/duthur.co/" target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://www.tiktok.com/@duthur.co" target="_blank" rel="noopener noreferrer">
                  TikTok
                </a>
              </li>
              <li>
                <a href="https://www.facebook.com/duthur.co" target="_blank" rel="noopener noreferrer">
                  Facebook
                </a>
              </li>
              <li>
                <a href="https://www.youtube.com/@duthurco" target="_blank" rel="noopener noreferrer">
                  YouTube
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* BOTTOM ROW: COPYRIGHT */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} Duthur. {t.allRightsReserved}
          </p>
        </div>
      </div>
    </footer>
  );
}
