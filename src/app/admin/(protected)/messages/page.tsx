import { createClient } from '@/lib/supabase/server';

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
        <div className="admin-card" style={{ borderColor: 'var(--color-danger, #ef4444)', color: 'var(--color-danger, #ef4444)' }}>
          <p>Error loading messages: {error.message}</p>
        </div>
      )}
      <section className="admin-card messages">
        {(data || []).map((m) => (
          <article key={m.id}>
            <div>
              <strong>{m.name}</strong>
              <span>{m.email}</span>
              <time>{new Date(m.created_at).toLocaleString()}</time>
            </div>
            <p>{m.message}</p>
          </article>
        ))}
        {!error && (!data || data.length === 0) && (
          <p style={{ padding: '16px', color: 'var(--color-muted, #888)' }}>No messages found.</p>
        )}
      </section>
    </>
  );
}
