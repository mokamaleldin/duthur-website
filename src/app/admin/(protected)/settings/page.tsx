import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { PasswordForm } from '@/components/admin/PasswordForm';

export default async function Page() {
  const s = await createClient();
  const { data, error } = await s.from('store_settings').select('*').single();

  if (error) {
    console.error('[Admin Settings] Error fetching store settings:', error);
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <p>Configuration</p>
          <h1>Settings</h1>
        </div>
      </div>
      {error && (
        <div className="admin-card" style={{ borderColor: 'var(--color-danger, #ef4444)', color: 'var(--color-danger, #ef4444)' }}>
          <p>Error loading settings: {error.message}</p>
        </div>
      )}
      {data && <SettingsForm initial={data} />}
      <PasswordForm />
    </>
  );
}
