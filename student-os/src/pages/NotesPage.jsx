import { useState, useMemo } from 'react'
import { StickyNote, Search, Calendar, X } from 'lucide-react'
import { getDomainEvents, resolveTypeLabel, resolveTypeColor } from '../utils/calendarEvents'

export default function NotesPage({ eventNotes, customCalendarEvents, domains, onOpenEvent }) {
  const [search, setSearch] = useState('')
  const [filterDomain, setFilterDomain] = useState('all')

  const allEvents = useMemo(
    () => [...getDomainEvents(), ...(customCalendarEvents || [])],
    [customCalendarEvents],
  )

  const notedEvents = useMemo(() => {
    return allEvents
      .filter(ev => eventNotes?.[ev.id]?.trim())
      .filter(ev => {
        if (filterDomain !== 'all' && ev.domainId !== filterDomain) return false
        const q = search.toLowerCase()
        if (!q) return true
        return (
          ev.title.toLowerCase().includes(q) ||
          (ev.domainName || '').toLowerCase().includes(q) ||
          (eventNotes[ev.id] || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => b.date - a.date)
  }, [allEvents, eventNotes, search, filterDomain])

  const domainsWithNotes = useMemo(() => {
    const ids = new Set(allEvents.filter(ev => eventNotes?.[ev.id]?.trim()).map(ev => ev.domainId).filter(Boolean))
    return (domains || []).filter(d => ids.has(d.id))
  }, [allEvents, eventNotes, domains])

  return (
    <div style={{ padding: '28px 32px 40px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 860 }}>

      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>Notes</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          {notedEvents.length > 0
            ? `${Object.keys(eventNotes || {}).filter(id => eventNotes[id]?.trim()).length} note${Object.keys(eventNotes || {}).filter(id => eventNotes[id]?.trim()).length === 1 ? '' : 's'} across your events`
            : 'Open any event in the Calendar to start taking notes'}
        </p>
      </div>

      {notedEvents.length === 0 && !search && filterDomain === 'all' ? (
        <EmptyState />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
              <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notes…"
                style={{
                  width: '100%', padding: '8px 12px 8px 32px',
                  borderRadius: 8, border: '1px solid var(--border-strong)',
                  background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13,
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
                  <X size={12} />
                </button>
              )}
            </div>

            {domainsWithNotes.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <FilterChip label="All" active={filterDomain === 'all'} color="var(--accent-blue)" onClick={() => setFilterDomain('all')} />
                {domainsWithNotes.map(d => (
                  <FilterChip key={d.id} label={d.code} active={filterDomain === d.id} color={d.color} onClick={() => setFilterDomain(filterDomain === d.id ? 'all' : d.id)} />
                ))}
              </div>
            )}
          </div>

          {notedEvents.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>No notes match your search.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {notedEvents.map(ev => (
                <NoteCard key={ev.id} event={ev} note={eventNotes[ev.id]} onOpenEvent={onOpenEvent} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function NoteCard({ event, note, onOpenEvent }) {
  const [expanded, setExpanded] = useState(false)
  const typeColor  = resolveTypeColor(event)
  const typeLabel  = resolveTypeLabel(event)
  const preview    = note.trim().slice(0, 200)
  const isLong     = note.trim().length > 200

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden',
      borderLeft: `3px solid ${typeColor}`,
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: typeColor, background: `${typeColor}18`, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              {typeLabel}
            </span>
            {event.domainCode && event.domainColor && (
              <span style={{ fontSize: 10, fontWeight: 700, color: event.domainColor, background: `${event.domainColor}18`, padding: '2px 7px', borderRadius: 4 }}>
                {event.domainCode}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={10} />
              {event.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{event.title}</h3>
          {event.domainName && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{event.domainName}</p>}
        </div>

        {onOpenEvent && (
          <button
            onClick={() => onOpenEvent(event)}
            style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            Open event
          </button>
        )}
      </div>

      <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--border)' }}>
        <div style={{ marginTop: 12 }}>
          <pre style={{
            margin: 0, fontFamily: 'inherit', fontSize: 13,
            color: 'var(--text-bright)', lineHeight: 1.7,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {expanded ? note.trim() : preview}{isLong && !expanded ? '…' : ''}
          </pre>
          {isLong && (
            <button
              onClick={() => setExpanded(v => !v)}
              style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', fontSize: 12, padding: 0 }}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterChip({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
        background: active ? `${color}22` : 'var(--bg-overlay)',
        color: active ? color : 'var(--text-secondary)',
        outline: active ? `1.5px solid ${color}44` : '1.5px solid transparent',
        transition: 'all 0.12s',
      }}
    >
      {label}
    </button>
  )
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '60px 0', color: 'var(--text-muted)', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <StickyNote size={28} color="var(--border-strong)" />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>No notes yet</p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)', maxWidth: 300, lineHeight: 1.6 }}>
          Open any event in the Calendar and write notes directly inside the event panel.
        </p>
      </div>
    </div>
  )
}
