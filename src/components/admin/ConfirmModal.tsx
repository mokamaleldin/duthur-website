'use client';

import React from 'react';

export function ConfirmModal({
  open,
  title = 'Confirm Delete',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 15, 15, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 2000,
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#171717',
          color: '#F3EFE6',
          border: '1px solid #3c3a35',
          borderRadius: '16px',
          width: 'min(420px, 100%)',
          padding: '26px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#B69C7A',
            fontWeight: 700,
            marginBottom: '6px',
          }}
        >
          DUTHUR — دُثُر
        </div>
        <h3 style={{ margin: '0 0 10px', fontSize: '20px', color: '#F3EFE6' }}>
          {title}
        </h3>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: '14px',
            color: '#C8C1B5',
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            style={{
              padding: '10px 18px',
              borderRadius: '9px',
              border: '1px solid #3c3a35',
              background: 'transparent',
              color: '#F3EFE6',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              borderRadius: '9px',
              border: 0,
              background: '#b94c4c',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
