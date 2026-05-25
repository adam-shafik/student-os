import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, ChevronUp, ChevronDown, Check } from 'lucide-react'
import {
  EVENT_TYPES, TYPE_PRIORITY, MONTHS, WEEKDAYS,
  getCalendarDays, dateKey,
  resolveTypeLabel, resolveTypeColor,
} from '../utils/calendarEvents'
import { getWeekRowInfo, getAcademicWeek, getBreakForDate } from '../utils/semester'
import EventDetailModal from '../components/EventDetailModal'

const MAX_VISIBLE = 3

function fmtTime(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${h >= 12 ? 'pm' : 'am'}`
}
function fmtDuration(mins) {
  if (!mins) return null
  const h = Math.floor(mins / 60), m = mins % 60
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`
}

// ─── Event chip ───────────────────────────────────────────────────────────────
function EventChip({ event, onClick, hasNote }) {
  const typeColor   = resolveTypeColor(event)
  const typeLabel   = resolveTypeLabel(event)
  const domainColor = event.domainColor || null
  const time        = fmtTime(event.details?.time)
  const duration    = fmtDuration(event.details?.duration)
  // Show domain name only when it adds info (i.e. the title is NOT already the domain name)
  const showDomain  = event.domainName && event.domainName !== event.title && domainColor

  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(event) }}
      title={`${typeLabel}: ${event.title}${time ? ' · ' + time : ''}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: 1,
        padding: '4px 7px 4px 6px',
        borderRadius: 5, marginBottom: 3,
        background: `${typeColor}15`,
        borderLeft: `2.5px solid ${typeColor}`,
        cursor: 'pointer', overflow: 'hidden',
        transition: 'filter 0.1s',
        minWidth: 0, width: '100%', boxSizing: 'border-box',
      }}
      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.25)'}
      onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
    >
      <span style={{ fontSize: 9, fontWeight: 700, color: typeColor, textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
        {typeLabel}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
        <span style={{ fontSize: 10.5, color: 'var(--text-bright)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
          {event.title}
        </span>
        {hasNote && (
          <span title="Has notes" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-purple)', flexShrink: 0 }} />
        )}
      </div>
      {(time || showDomain) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1, flexWrap: 'nowrap', overflow: 'hidden' }}>
          {time && (
            <span style={{ fontSize: 9, fontWeight: 600, color: typeColor, opacity: 0.85, whiteSpace: 'nowrap' }}>
              {time}{duration ? ` · ${duration}` : ''}
            </span>
          )}
          {time && showDomain && <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>·</span>}
          {showDomain && (
            <span style={{ fontSize: 9, fontWeight: 600, color: domainColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {event.domainName}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Week label cell ──────────────────────────────────────────────────────────
function WeekLabelCell({ info }) {
  return (
    <div style={{
      background: info.isBreak ? `${info.breakColor}0f` : 'var(--bg-page)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', padding: '2px 0',
    }}>
      {info.label && (
        <span style={{
          fontSize: 8.5, fontWeight: 700,
          color: info.isBreak ? info.breakColor : 'var(--border-strong)',
          writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          letterSpacing: '0.4px', textTransform: 'uppercase',
          lineHeight: 1, userSelect: 'none',
        }}>
          {info.label}
        </span>
      )}
    </div>
  )
}

// ─── Day cell ─────────────────────────────────────────────────────────────────
function DayCell({ day, events, isToday, onEventClick, onAddClick, eventNotes, isBreak, isWeekend }) {
  const [hovered,  setHovered]  = useState(false)
  const [expanded, setExpanded] = useState(false)

  const sorted = useMemo(
    () => [...events].sort((a, b) => TYPE_PRIORITY.indexOf(a.type) - TYPE_PRIORITY.indexOf(b.type)),
    [events],
  )

  const overflow = Math.max(0, sorted.length - MAX_VISIBLE)
  const visible  = expanded || overflow === 0 ? sorted : sorted.slice(0, MAX_VISIBLE)

  const bg = isBreak
    ? (hovered && day.isCurrentMonth ? 'rgba(251,191,36,0.07)' : 'rgba(251,191,36,0.04)')
    : isWeekend
    ? (hovered && day.isCurrentMonth ? 'var(--bg-overlay)' : 'var(--bg-elevated)')
    : (hovered && day.isCurrentMonth ? 'var(--nav-hover)' : 'var(--bg-page)')

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: bg, transition: 'background 0.12s', padding: '7px 7px 6px', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, flexShrink: 0 }}>
        <span style={{
          fontSize: 12, fontWeight: isToday ? 700 : 400,
          width: 22, height: 22, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isToday ? 'var(--accent-blue)' : 'transparent',
          color: isToday ? '#fff' : day.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-disabled)',
          flexShrink: 0,
          boxShadow: isToday ? 'var(--glow-blue)' : 'none',
        }}>
          {day.date.getDate()}
        </span>

        {hovered && day.isCurrentMonth && (
          <button
            onClick={() => onAddClick(day.date)}
            style={{ width: 18, height: 18, borderRadius: 4, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={11} />
          </button>
        )}
      </div>

      {day.isCurrentMonth && visible.map(ev => (
        <EventChip key={ev.id} event={ev} onClick={onEventClick} hasNote={!!eventNotes?.[ev.id]?.trim()} />
      ))}

      {day.isCurrentMonth && overflow > 0 && (
        <button
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          style={{
            marginTop: 1, fontSize: 10, fontWeight: 600,
            color: expanded ? 'var(--text-secondary)' : 'var(--accent-blue)',
            border: 'none', background: 'none',
            cursor: 'pointer', padding: '1px 4px',
            display: 'flex', alignItems: 'center', gap: 2,
            borderRadius: 3, alignSelf: 'flex-start',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(91,140,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          {expanded ? <><ChevronUp size={10} /> Less</> : `+${overflow} more`}
        </button>
      )}
    </div>
  )
}

// ─── Add event modal ──────────────────────────────────────────────────────────
const PRESET_TYPES = [
  { id: 'social',      label: 'Social',      color: '#fb923c' },
  { id: 'appointment', label: 'Appointment', color: '#22d3ee' },
  { id: 'reminder',    label: 'Reminder',    color: '#f472b6' },
  { id: 'study',       label: 'Study',       color: '#34d399' },
  { id: 'lecture',     label: 'Lecture',     color: '#5b8cff' },
  { id: 'lab',         label: 'Lab',         color: '#a78bfa' },
  { id: 'exam',        label: 'Exam',        color: '#fb7185' },
  { id: 'other',       label: 'Other…',      color: '#9ca3af' },
]

function toInputDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function groupDomains(domains) {
  return {
    academic: domains.filter(d => d.category === 'academic'),
    other:    domains.filter(d => d.category !== 'academic'),
  }
}

function AddEventModal({ initialDate, domains, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '', date: toInputDate(initialDate || new Date()),
    time: '', type: 'social', customTypeName: '', notes: '', domainId: null,
  })
  const [domainPickerOpen, setDomainPickerOpen] = useState(false)
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const activeColor  = PRESET_TYPES.find(t => t.id === form.type)?.color || '#9ca3af'
  const canSave      = form.title.trim() && (form.type !== 'other' || form.customTypeName.trim())
  const linkedDomain = domains.find(d => d.id === form.domainId) || null
  const { academic, other: otherDomains } = groupDomains(domains)

  const isAcademicLink = linkedDomain?.category === 'academic'
  const formDateObj    = form.date ? (() => { const [y, m, d] = form.date.split('-').map(Number); return new Date(y, m - 1, d) })() : null
  const eventWeek  = isAcademicLink && formDateObj ? getAcademicWeek(formDateObj) : null
  const eventBreak = isAcademicLink && formDateObj ? getBreakForDate(formDateObj) : null

  const handleSave = () => {
    if (!canSave) return
    const [y, m, d] = form.date.split('-').map(Number)
    const domain = linkedDomain
    onSave({
      id: `custom-${Date.now()}`, type: form.type,
      title: form.title.trim(), date: new Date(y, m - 1, d),
      domainId:    domain?.id   || null,
      domainCode:  domain?.code || null,
      domainName:  domain?.name || null,
      domainColor: domain?.color || null,
      details: { time: form.time, notes: form.notes, customTypeName: form.type === 'other' ? form.customTypeName.trim() : undefined },
    })
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border-strong)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--border-strong)', borderRadius: 16, width: 440, maxWidth: '90vw', maxHeight: '90vh', boxShadow: 'var(--shadow-modal)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} color={activeColor} />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Add Event</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>

          <div>
            <Label>Title</Label>
            <input style={inputStyle} placeholder="Event title" value={form.title} onChange={e => set('title', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} autoFocus
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <Label>Date</Label>
                <input type="date" style={{ ...inputStyle, colorScheme: 'dark' }} value={form.date} onChange={e => set('date', e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                />
              </div>
              <div>
                <Label>Time (optional)</Label>
                <input type="time" style={{ ...inputStyle, colorScheme: 'dark' }} value={form.time} onChange={e => set('time', e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                />
              </div>
            </div>
            {isAcademicLink && (eventWeek || eventBreak) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 5,
                  background: eventBreak ? 'rgba(251,191,36,0.12)' : 'rgba(91,140,255,0.12)',
                  color: eventBreak ? 'var(--accent-amber)' : 'var(--accent-blue)',
                }}>
                  {eventWeek ? `Academic Week ${eventWeek}` : eventBreak.name}
                </span>
              </div>
            )}
          </div>

          <div>
            <Label>Event Type</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {PRESET_TYPES.map(t => (
                <button key={t.id} onClick={() => set('type', t.id)}
                  style={{ padding: '7px 4px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: form.type === t.id ? `${t.color}22` : 'var(--bg-overlay)', color: form.type === t.id ? t.color : 'var(--text-secondary)', outline: form.type === t.id ? `1.5px solid ${t.color}55` : '1.5px solid transparent', transition: 'all 0.12s' }}
                  onMouseEnter={e => { if (form.type !== t.id) e.currentTarget.style.background = 'var(--bg-overlay-hover)' }}
                  onMouseLeave={e => { if (form.type !== t.id) e.currentTarget.style.background = 'var(--bg-overlay)' }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {form.type === 'other' && (
              <div style={{ marginTop: 8 }}>
                <input style={{ ...inputStyle, borderColor: form.customTypeName.trim() ? 'var(--border-focus)' : 'var(--border-strong)' }} placeholder="e.g. Tutorial, Workshop, Revision session…" value={form.customTypeName} onChange={e => set('customTypeName', e.target.value)} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>This label will appear on the calendar chip.</div>
              </div>
            )}
          </div>

          <div>
            <Label>Link to Domain (optional)</Label>
            <button
              onClick={() => setDomainPickerOpen(v => !v)}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: `1px solid ${linkedDomain ? linkedDomain.color + '55' : 'var(--border-strong)'}`,
                background: 'var(--bg-input)', color: linkedDomain ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 13, cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {linkedDomain ? (
                  <>
                    <span style={{ fontSize: 11, fontWeight: 700, color: linkedDomain.color, background: `${linkedDomain.color}20`, padding: '2px 6px', borderRadius: 4 }}>{linkedDomain.code}</span>
                    <span style={{ color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{linkedDomain.name}</span>
                  </>
                ) : (
                  <span>No domain linked</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                {linkedDomain && (
                  <span
                    onClick={e => { e.stopPropagation(); set('domainId', null); setDomainPickerOpen(false) }}
                    style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >✕</span>
                )}
                {domainPickerOpen ? <ChevronUp size={13} color="var(--text-muted)" /> : <ChevronDown size={13} color="var(--text-muted)" />}
              </div>
            </button>

            {domainPickerOpen && (
              <div style={{ marginTop: 4, border: '1px solid var(--border-strong)', borderRadius: 10, background: 'var(--bg-input)', overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                {academic.length > 0 && (
                  <>
                    <div style={{ padding: '7px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Academic</div>
                    {academic.map(d => <DomainOption key={d.id} domain={d} selected={form.domainId === d.id} onSelect={() => { set('domainId', d.id); setDomainPickerOpen(false) }} />)}
                  </>
                )}
                {otherDomains.length > 0 && (
                  <>
                    <div style={{ padding: '7px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderTop: academic.length > 0 ? '1px solid var(--border)' : 'none' }}>Other</div>
                    {otherDomains.map(d => <DomainOption key={d.id} domain={d} selected={form.domainId === d.id} onSelect={() => { set('domainId', d.id); setDomainPickerOpen(false) }} />)}
                  </>
                )}
                {domains.length === 0 && (
                  <div style={{ padding: '14px 12px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>No domains yet</div>
                )}
              </div>
            )}
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60, fontFamily: 'inherit', lineHeight: 1.5 }} placeholder="Add notes…" value={form.notes} onChange={e => set('notes', e.target.value)}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
            />
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={!canSave} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, background: canSave ? activeColor : 'var(--border)', color: canSave ? '#fff' : 'var(--text-muted)', cursor: canSave ? 'pointer' : 'default', transition: 'all 0.15s' }}>Add Event</button>
        </div>
      </div>
    </div>
  )
}

function DomainOption({ domain, selected, onSelect }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', cursor: 'pointer',
        background: selected ? `${domain.color}12` : hovered ? 'var(--nav-hover)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: domain.color, background: `${domain.color}20`, padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>{domain.code}</span>
      <span style={{ fontSize: 13, color: selected ? 'var(--text-primary)' : 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{domain.name}</span>
      {selected && <Check size={12} color={domain.color} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>{children}</div>
}

const navBtn = {
  width: 32, height: 32, borderRadius: 7,
  border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
  color: 'var(--text-secondary)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

// ─── Calendar page ────────────────────────────────────────────────────────────
export default function CalendarPage({ domains = [], domainEvents = [], customEvents = [], onViewDomain, onAddCalendarEvent, onDeleteCalendarEvent, eventNotes = {}, onUpdateNote }) {
  const today = new Date()
  const [viewDate,      setViewDate]      = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [addModalDate,  setAddModalDate]  = useState(null)

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))
  const goToday   = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))

  const allEvents = useMemo(() => [...domainEvents, ...customEvents], [domainEvents, customEvents])

  const eventsMap = useMemo(() => {
    const map = {}
    allEvents.forEach(ev => {
      const k = dateKey(ev.date)
      if (!map[k]) map[k] = []
      map[k].push(ev)
    })
    return map
  }, [allEvents])

  const days     = useMemo(() => getCalendarDays(year, month), [year, month])
  const weekRows = useMemo(() => {
    const rows = []
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7))
    return rows
  }, [days])
  const todayKey = dateKey(today)

  return (
    <div style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>Calendar</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>All lectures, labs, deadlines and exams in one place</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevMonth} style={navBtn}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', minWidth: 148, textAlign: 'center' }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} style={navBtn}><ChevronRight size={16} /></button>
          <button onClick={goToday} style={{ ...navBtn, padding: '6px 14px', width: 'auto', marginLeft: 6, fontSize: 13 }}>Today</button>
          <button
            onClick={() => setAddModalDate(new Date())}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-green)', color: 'var(--bg-page)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginLeft: 4 }}
          >
            <Plus size={14} /> Add Event
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        {Object.entries(EVENT_TYPES).map(([key, cfg]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: cfg.color }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{cfg.label}</span>
          </div>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '28px repeat(7, 1fr)',
        gridTemplateRows: `auto repeat(6, minmax(110px, auto))`,
        gap: '1px',
        background: 'var(--border)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{ background: 'var(--bg-elevated)' }} />
        {WEEKDAYS.map(day => (
          <div key={day} style={{ background: 'var(--bg-elevated)', padding: '9px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', minWidth: 0, overflow: 'hidden' }}>
            {day}
          </div>
        ))}

        {weekRows.flatMap((week, wi) => {
          const info = getWeekRowInfo(week)
          return [
            <WeekLabelCell key={`wl-${wi}`} info={info} />,
            ...week.map((day, di) => {
              const k = dateKey(day.date)
              return (
                <DayCell
                  key={`${wi}-${di}`}
                  day={day}
                  events={eventsMap[k] || []}
                  isToday={k === todayKey}
                  onEventClick={setSelectedEvent}
                  onAddClick={setAddModalDate}
                  eventNotes={eventNotes}
                  isBreak={info.isBreak}
                  isWeekend={day.date.getDay() === 0 || day.date.getDay() === 6}
                />
              )
            }),
          ]
        })}
      </div>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onViewDomain={onViewDomain}
          note={eventNotes[selectedEvent.id] || ''}
          onUpdateNote={onUpdateNote || (() => {})}
          onDelete={customEvents.some(ev => ev.id === selectedEvent.id)
            ? () => { onDeleteCalendarEvent?.(selectedEvent.id); setSelectedEvent(null) }
            : undefined}
        />
      )}
      {addModalDate && (
        <AddEventModal
          initialDate={addModalDate}
          domains={domains}
          onClose={() => setAddModalDate(null)}
          onSave={ev => { onAddCalendarEvent?.(ev); setAddModalDate(null) }}
        />
      )}
    </div>
  )
}
