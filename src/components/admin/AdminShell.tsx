'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

const links = [
  ['/admin', 'Dashboard'],
  ['/admin/products', 'Products'],
  ['/admin/orders', 'Orders'],
  ['/admin/skus', 'SKUs'],
  ['/admin/finance', 'Finance'],
  ['/admin/discounts', 'Discounts'],
  ['/admin/messages', 'Messages'],
  ['/admin/settings', 'Settings'],
];

export function AdminShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string;
}) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-logo">DUTHUR</div>
        {links.map(([href, label]) => {
          const isActive =
            href === '/admin'
              ? path === '/admin'
              : path === href || path.startsWith(href + '/');
          return (
            <Link
              key={href}
              className={isActive ? 'active' : ''}
              href={href}
              prefetch={true}
            >
              {label}
            </Link>
          );
        })}
        <div className="admin-bottom">
          <small>{email}</small>
          <button onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
