export default function ConfirmModal({ message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '24px 24px 20px', width: 320,
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.55 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
