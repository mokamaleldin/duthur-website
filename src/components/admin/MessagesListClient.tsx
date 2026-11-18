'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MessagesListClient({ initialMessages }: { initialMessages: any[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm('هل تريد مسح هذه الرسالة نهائياً؟')) return;
    setBusyId(id);

    const res = await fetch('/api/admin/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_message', messageId: id }),
    });

    setBusyId(null);
    if (!res.ok) {
      alert('حدث خطأ أثناء مسح الرسالة');
      return;
    }

    setMessages((prev) => prev.filter((m) => m.id !== id));
    router.refresh();
  }

  return (
    <section className="admin-card messages">
      {messages.map((m) => (
        <article
          key={m.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
          }}
        >
          <div style={{ flex: 1, display: 'block' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              <strong>{m.name}</strong>
              <span>{m.email}</span>
              <time>{new Date(m.created_at).toLocaleString()}</time>
            </div>
            <p style={{ marginTop: '8px', marginBottom: 0 }}>{m.message}</p>
          </div>
          <button
            type="button"
            className="danger"
            disabled={busyId === m.id}
            onClick={() => handleDelete(m.id)}
            style={{ padding: '6px 12px', fontSize: '12px', flexShrink: 0 }}
          >
            {busyId === m.id ? '...' : 'مسح ✕'}
          </button>
        </article>
      ))}
      {messages.length === 0 && (
        <p style={{ padding: '16px', color: 'var(--color-muted, #888)' }}>
          No messages found.
        </p>
      )}
    </section>
  );
}
