import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/admin/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[Admin Layout] Failed to verify admin profile:', profileError);
    redirect('/admin/login');
  }

  if (!profile || profile.role !== 'admin') {
    console.warn(`[Admin Layout] User ${user.email} (${user.id}) is not an admin.`);
    redirect('/admin/login');
  }

  return <AdminShell email={user.email}>{children}</AdminShell>;
}
