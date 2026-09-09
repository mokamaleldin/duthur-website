'use client';
import Link from 'next/link';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useCart } from './CartProvider';
import type { Locale } from '@/types/store';
import { dict } from '@/lib/i18n';

export function Header({locale}:{locale:Locale}){
  const t=dict[locale]; const {count}=useCart(); const pathname=usePathname() || ''; const router=useRouter(); const [open,setOpen]=useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const prevCountRef = useRef(count);

  useEffect(() => {
    const handlePulse = () => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 300);
    };
    window.addEventListener('duthur-cart-pulse', handlePulse);
    return () => window.removeEventListener('duthur-cart-pulse', handlePulse);
  }, []);

  useEffect(() => {
    if (count > prevCountRef.current) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 300);
      prevCountRef.current = count;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = count;
  }, [count]);

  const nav=[['',t.home],['/products',t.products],['/your-size',t.size],['/about',t.about],['/contact',t.contact]];
  
  function isRouteActive(p: string) {
    const fullTarget = `/${locale}${p}`;
    if (p === '') {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    return pathname === fullTarget || pathname.startsWith(`${fullTarget}/`);
  }

  function switchLang(next:string){ const parts=pathname.split('/'); parts[1]=next; router.push(parts.join('/')||`/${next}`); }
  return <header className="site-header">
    <nav className={`nav-links ${open?'open':''}`} aria-label="Main Navigation">
      {nav.map(([p,l])=>{
        const active = isRouteActive(p);
        return (
          <Link
            key={p}
            href={`/${locale}${p}`}
            className={active ? 'active' : ''}
            aria-current={active ? 'page' : undefined}
            onClick={()=>setOpen(false)}
          >
            {l}
          </Link>
        );
      })}
    </nav>
    <button className="mobile-menu" onClick={()=>setOpen(!open)} aria-label="menu">{open?<X/>:<Menu/>}</button>
    <Link href={`/${locale}`} className="logo" aria-label="DUTHUR">دُثُر</Link>
    <div className="nav-actions">
      <select aria-label="Language" value={locale} onChange={e=>switchLang(e.target.value)}>
        <option value="tr">TR</option><option value="en">EN</option><option value="ar">AR</option>
      </select>
      <Link className={`cart-link ${isPulsing ? 'cart-link-pulse' : ''}`} href={`/${locale}/cart`} aria-label={t.cart}>
        <ShoppingBag size={21}/>
        {count>0&&<span className={`cart-badge ${isPulsing ? 'badge-pulse' : ''}`}>{count}</span>}
      </Link>
    </div>
  </header>;
}
