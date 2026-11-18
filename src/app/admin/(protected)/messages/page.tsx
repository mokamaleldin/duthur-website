import { createClient } from '@/lib/supabase/server';
import { MessagesListClient } from '@/components/admin/MessagesListClient';

export default async function Page() {
  const s = await createClient();
  const { data, error } = await s
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Admin Messages] Error fetching contact messages:', error);
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <p>Inbox</p>
          <h1>Messages</h1>
        </div>
      </div>
      {error && (
        <div
          className="admin-card"
          style={{
            borderColor: 'var(--color-danger, #ef4444)',
            color: 'var(--color-danger, #ef4444)',
          }}
        >
          <p>Error loading messages: {error.message}</p>
        </div>
      )}
      <MessagesListClient initialMessages={data || []} />
    </>
  );
}
