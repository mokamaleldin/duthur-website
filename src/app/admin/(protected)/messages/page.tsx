import { createClient } from '@/lib/supabase/server';
import { MessagesListClient } from '@/components/admin/MessagesListClient';
import { loadLedgerFromStorageOrLocal } from '@/app/api/admin/finance/route';

export default async function Page() {
  const s = await createClient();
  const [{ data, error }, ledger] = await Promise.all([
    s.from('contact_messages').select('*').order('created_at', { ascending: false }),
    loadLedgerFromStorageOrLocal(s),
  ]);

  if (error) {
    console.error('[Admin Messages] Error fetching contact messages:', error);
  }

  const deletedIds = new Set(ledger.deleted_message_ids || []);
  const visibleMessages = (data || []).filter((m) => !deletedIds.has(m.id));

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
      <MessagesListClient initialMessages={visibleMessages} />
    </>
  );
}
