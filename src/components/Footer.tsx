import Link from 'next/link';
import type { Locale } from '@/types/store';
import { dict } from '@/lib/i18n';

export function Footer({locale}:{locale:Locale}){
  const t = dict[locale];
  return <footer className="footer"><div><strong>DUTHUR — دُثُر</strong><p>{t.footerTagline}</p></div><div className="footer-links">
    <Link href={`/${locale}/shipping-policy`}>{t.shippingPolicy}</Link><Link href={`/${locale}/refund-policy`}>{t.refundPolicy}</Link><Link href={`/${locale}/privacy-policy`}>{t.privacyPolicy}</Link>
  </div><div>© {new Date().getFullYear()} DUTHUR</div></footer>;
}
