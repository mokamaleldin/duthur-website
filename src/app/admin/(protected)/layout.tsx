import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '@/components/admin/AdminShell';
import {
  TEMP_ADMIN_COOKIE,
  TEMP_ADMIN_EMAIL,
  verifyTempAdminSession,
} from '@/lib/temp-admin';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const tempSession = cookieStore.get(TEMP_ADMIN_COOKIE)?.value;

  if (verifyTempAdminSession(tempSession)) {
    return (
      <AdminShell email={TEMP_ADMIN_EMAIL} tempAuth>
        {children}
      </AdminShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') redirect('/admin/login');

  return <AdminShell email={user.email}>{children}</AdminShell>;
}
