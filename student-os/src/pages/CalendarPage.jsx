import { useState, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar, Clock,
  MapPin, BookOpen, FlaskConical, FileCheck, GraduationCap,
  StickyNote, ExternalLink, Tag, AlignLeft,
} from 'lucide-react'
import {
  EVENT_TYPES, TYPE_PRIORITY, MONTHS, WEEKDAYS,
  getSubjectEvents, getCalendarDays, dateKey,
  resolveTypeLabel, resolveTypeColor,
} from '../utils/calendarEvents'

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  completed:     { label: 'Completed',   color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  'in-progress': { label: 'In Progress', color: '#5b8cff', bg: 'rgba(91,140,255,0.12)'  },
  upcoming:      { label: 'Upcoming',    color: '#7c7e96', bg: 'rgba(74,76,96,0.15)'     },
  submitted:     { label: 'Submitted',   color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  graded:        { label: 'Graded',      color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
}
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.upcoming
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

// ─── Event chip (inside calendar cell) ───────────────────────────────────────
function EventChip({ event, onClick }) {
  const color = resolveTypeColor(event)
  const label = resolveTypeLabel(event)
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(event) }}
      title={`${label}${event.subjectCode ? ' · ' + event.subjectCode : ''}: ${event.title}`}
      style={{
        display: 'flex', flexDirection: 'column',
        padding: '3px 6px 3px 5px', borderRadius: 4, marginBottom: 2,
        background: `${color}12`,
        borderLeft: `2.5px solid ${color}`,
        cursor: 'pointer', overflow: 'hidden',
        transition: 'filter 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'}
      onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
    >
      {/* Type label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        {event.subjectCode && (
          <span style={{ fontSize: 9, color: '#4a4c60', whiteSpace: 'nowrap' }}>· {event.subjectCode}</span>
        )}
      </div>
      {/* Title row */}
      <span style={{ fontSize: 10, color: '#c4c5d4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
        {event.title}
      </span>
    </div>
  )
}

// ─── Day cell ─────────────────────────────────────────────────────────────────
const MAX_VISIBLE = 3

function DayCell({ day, events, isToday, onEventClick, onAddClick, onOverflowClick }) {
  const [hovered, setHovered] = useState(false)

  const sorted = useMemo(() =>
    [...events].sort((a, b) => TYPE_PRIORITY.indexOf(a.type) - TYPE_PRIORITY.indexOf(b.type)),
    [events]
  )
  const visible  = sorted.slice(0, MAX_VISIBLE)
  const overflow = sorted.length - MAX_VISIBLE   // total hidden, not just 1

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered && day.isCurrentMonth ? '#111220' : '#0b0c13',
        transition: 'background 0.12s',
        padding: '7px 7px 5px',
        display: 'flex', flexDirection: 'column',
        minHeight: 110,
        position: 'relative',
      }}
    >
      {/* Date number + hover add button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{
          fontSize: 12, fontWeight: isToday ? 700 : 400,
          width: 22, height: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%',
          background: isToday ? '#5b8cff' : 'transparent',
          color: isToday ? '#fff' : day.isCurrentMonth ? '#e6e7f0' : '#2e3048',
          flexShrink: 0,
        }}>
          {day.date.getDate()}
        </span>

        {hovered && day.isCurrentMonth && (
          <button
            onClick={() => onAddClick(day.date)}
            style={{
              width: 18, height: 18, borderRadius: 4, border: 'none',
              background: '#252738', color: '#7c7e96', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Plus size={11} />
          </button>
        )}
      </div>

      {/* Event chips */}
      <div style={{ flex: 1 }}>
        {day.isCurrentMonth && visible.map(ev => (
          <EventChip key={ev.id} event={ev} onClick={onEventClick} />
        ))}
      </div>

      {/* Overflow: shows ALL remaining count, opens day modal */}
      {day.isCurrentMonth && overflow > 0 && (
        <button
          onClick={e => { e.stopPropagation(); onOverflowClick(day.date, sorted) }}
          style={{
            fontSize: 10, fontWeight: 600, color: '#5b8cff',
            cursor: 'pointer', border: 'none', background: 'none',
            padding: '1px 4px', textAlign: 'left',
            borderRadius: 3,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(91,140,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          +{overflow} more
        </button>
      )}
    </div>
  )
}

// ─── Day events modal (all events for a single day) ───────────────────────────
function DayEventsModal({ date, events, onClose, onEventClick }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#14151e', border: '1px solid #2a2c40', borderRadius: 14,
          width: 360, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e2030', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e6e7f0' }}>
              {date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div style={{ fontSize: 12, color: '#4a4c60', marginTop: 2 }}>{events.length} event{events.length !== 1 ? 's' : ''}</div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: '#1e2030', color: '#7c7e96', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <X size={13} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {events.map(ev => {
            const color = resolveTypeColor(ev)
            const label = resolveTypeLabel(ev)
            return (
              <div
                key={ev.id}
                onClick={() => { onEventClick(ev); onClose() }}
                style={{
                  padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                  background: '#191a28', borderLeft: `3px solid ${color}`,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1e2038'}
                onMouseLeave={e => e.currentTarget.style.background = '#191a28'}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>
                  {label}{ev.subjectCode ? ` · ${ev.subjectCode}` : ''}
                </div>
                <div style={{ fontSize: 13, color: '#e6e7f0', lineHeight: 1.35 }}>{ev.title}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Event detail modal ───────────────────────────────────────────────────────
function EventDetailModal({ event, onClose, onViewSubject }) {
  if (!event) return null
  const color = resolveTypeColor(event)
  const label = resolveTypeLabel(event)
  const d = event.details || {}

  const typeIcons = {
    lecture: BookOpen, lab: FlaskConical,
    assignment: FileCheck, exam: GraduationCap,
  }
  const TypeIcon = typeIcons[event.type] || Tag

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#14151e', border: '1px solid #2a2c40', borderRadius: 16,
          width: 440, maxWidth: '90vw',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #1e2030', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, borderTop: `3px solid ${color}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TypeIcon size={14} color={color} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '3px 8px', borderRadius: 5, letterSpacing: '0.4px' }}>
                {label.toUpperCase()}
              </span>
              {event.subjectCode && (
                <span style={{ fontSize: 11, fontWeight: 600, color: event.subjectColor, background: `${event.subjectColor}18`, padding: '3px 8px', borderRadius: 5 }}>
                  {event.subjectCode}
                </span>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#e6e7f0', lineHeight: 1.4 }}>{event.title}</h2>
            {event.subjectName && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7c7e96' }}>{event.subjectName}</p>}
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#1e2030', color: '#7c7e96', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={14} color="#4a4c60" />
            <span style={{ fontSize: 13, color: '#7c7e96' }}>
              {event.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {event.type === 'lecture' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Row label="Week"   value={`Week ${d.week}`} />
              <Row label="Status" value={<StatusBadge status={d.status} />} />
              {d.hasNotes && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><StickyNote size={13} color="#5b8cff" /><span style={{ fontSize: 12, color: '#5b8cff' }}>Notes available</span></div>}
            </div>
          )}

          {event.type === 'lab' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Row label="Week"   value={`Week ${d.week}`} />
              <Row label="Status" value={<StatusBadge status={d.status} />} />
            </div>
          )}

          {event.type === 'assignment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: '#0f1018', borderRadius: 10, padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Stat label="Weight"  value={`${d.weight}%`}  color="#fbbf24" />
                <Stat label="Status"  value={<StatusBadge status={d.status} />} />
                {d.grade !== null && <Stat label="Grade" value={`${d.grade}%`} color={d.grade >= 70 ? '#34d399' : '#fb7185'} />}
              </div>
              {(d.status === 'upcoming' || d.status === 'submitted') && (
                <div style={{ fontSize: 12, color: '#7c7e96', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 8, padding: '8px 12px' }}>
                  ⚠ Due {event.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {d.status === 'upcoming' ? ' — not yet submitted' : ' — awaiting mark'}
                </div>
              )}
            </div>
          )}

          {event.type === 'exam' && (
            <div style={{ background: '#0f1018', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.time     && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock  size={13} color="#4a4c60" /><span style={{ fontSize: 13, color: '#7c7e96' }}>{d.time}</span></div>}
              {d.location && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={13} color="#4a4c60" /><span style={{ fontSize: 13, color: '#7c7e96' }}>{d.location}</span></div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#4a4c60' }}>Worth</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fb7185' }}>{d.weight}%</span>
                <span style={{ fontSize: 12, color: '#4a4c60' }}>of final grade</span>
              </div>
            </div>
          )}

          {/* Custom / personal event */}
          {!['lecture','lab','assignment','exam'].includes(event.type) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {d.time && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={13} color="#4a4c60" /><span style={{ fontSize: 13, color: '#7c7e96' }}>{d.time}</span></div>}
              {d.notes && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlignLeft size={13} color="#4a4c60" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#7c7e96', lineHeight: 1.5 }}>{d.notes}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {event.subjectId && (
          <div style={{ padding: '12px 22px', borderTop: '1px solid #1e2030' }}>
            <button
              onClick={() => { onViewSubject(event.subjectId); onClose() }}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: '1px solid #2a2c40', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: '#7c7e96', fontSize: 13, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#5b8cff'; e.currentTarget.style.color = '#5b8cff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2c40'; e.currentTarget.style.color = '#7c7e96' }}
            >
              <ExternalLink size={13} /> View in Subjects
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: '#4a4c60', width: 52, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#e6e7f0' }}>{value}</span>
    </div>
  )
}
function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || '#e6e7f0' }}>{value}</div>
    </div>
  )
}

// ─── Add event modal ──────────────────────────────────────────────────────────
// Preset types the user can pick — includes academic types for manual logging
const PRESET_TYPES = [
  { id: 'social',      label: 'Social',       color: '#fb923c' },
  { id: 'appointment', label: 'Appointment',   color: '#22d3ee' },
  { id: 'reminder',    label: 'Reminder',      color: '#f472b6' },
  { id: 'study',       label: 'Study',         color: '#34d399' },
  { id: 'lecture',     label: 'Lecture',       color: '#5b8cff' },
  { id: 'lab',         label: 'Lab',           color: '#a78bfa' },
  { id: 'exam',        label: 'Exam',          color: '#fb7185' },
  { id: 'other',       label: 'Other…',        color: '#9ca3af' },
]

function toInputDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function AddEventModal({ initialDate, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '',
    date: toInputDate(initialDate || new Date()),
    time: '',
    type: 'social',
    customTypeName: '',
    notes: '',
  })

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const activeColor = PRESET_TYPES.find(t => t.id === form.type)?.color || '#9ca3af'
  const canSave = form.title.trim() && (form.type !== 'other' || form.customTypeName.trim())

  const handleSave = () => {
    if (!canSave) return
    const [y, m, d] = form.date.split('-').map(Number)
    onSave({
      id: `custom-${Date.now()}`,
      type: form.type,
      title: form.title.trim(),
      date: new Date(y, m - 1, d),
      subjectId: null, subjectCode: null, subjectName: null, subjectColor: null,
      details: {
        time: form.time,
        notes: form.notes,
        customTypeName: form.type === 'other' ? form.customTypeName.trim() : undefined,
      },
    })
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid #2a2c40', background: '#0f1018',
    color: '#e6e7f0', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#14151e', border: '1px solid #2a2c40', borderRadius: 16, width: 420, maxWidth: '90vw', boxShadow: '0 24px 60px rgba(0,0,0,0.5)', overflow: 'hidden' }}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid #1e2030', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} color={activeColor} />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#e6e7f0' }}>Add Event</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#1e2030', color: '#7c7e96', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Title */}
          <div>
            <Label>Title</Label>
            <input
              style={inputStyle}
              placeholder="Event title"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>

          {/* Date + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <Label>Date</Label>
              <input type="date" style={{ ...inputStyle, colorScheme: 'dark' }} value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <Label>Time (optional)</Label>
              <input type="time" style={{ ...inputStyle, colorScheme: 'dark' }} value={form.time} onChange={e => set('time', e.target.value)} />
            </div>
          </div>

          {/* Event type */}
          <div>
            <Label>Event Type</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {PRESET_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => set('type', t.id)}
                  style={{
                    padding: '7px 4px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                    background: form.type === t.id ? `${t.color}22` : '#1a1b28',
                    color: form.type === t.id ? t.color : '#7c7e96',
                    outline: form.type === t.id ? `1.5px solid ${t.color}55` : '1.5px solid transparent',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (form.type !== t.id) e.currentTarget.style.background = '#252738' }}
                  onMouseLeave={e => { if (form.type !== t.id) e.currentTarget.style.background = '#1a1b28' }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* "Other" custom type text input */}
            {form.type === 'other' && (
              <div style={{ marginTop: 8 }}>
                <input
                  style={{ ...inputStyle, borderColor: form.customTypeName.trim() ? '#9ca3af55' : '#2a2c40' }}
                  placeholder="e.g. Tutorial, Workshop, Revision session…"
                  value={form.customTypeName}
                  onChange={e => set('customTypeName', e.target.value)}
                  autoFocus
                />
                <div style={{ fontSize: 11, color: '#4a4c60', marginTop: 5 }}>
                  This label will appear on the calendar chip.
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label>Notes (optional)</Label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 60, fontFamily: 'inherit', lineHeight: 1.5 }}
              placeholder="Add notes…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #1e2030', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #2a2c40', background: 'none', color: '#7c7e96', cursor: 'pointer', fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              background: canSave ? activeColor : '#1e2030',
              color: canSave ? '#0b0c13' : '#4a4c60',
              cursor: canSave ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}
          >
            Add Event
          </button>
        </div>
      </div>
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: 11, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>{children}</div>
}

// ─── Calendar page ────────────────────────────────────────────────────────────
export default function CalendarPage({ onViewSubject }) {
  const today = new Date()
  const [viewDate,      setViewDate]      = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [dayOverflow,   setDayOverflow]   = useState(null)   // { date, events }
  const [addModalDate,  setAddModalDate]  = useState(null)
  const [customEvents,  setCustomEvents]  = useState([])

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))
  const goToday   = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))

  const subjectEvents = useMemo(() => getSubjectEvents(), [])
  const allEvents     = useMemo(() => [...subjectEvents, ...customEvents], [subjectEvents, customEvents])

  const eventsMap = useMemo(() => {
    const map = {}
    allEvents.forEach(ev => {
      const k = dateKey(ev.date)
      if (!map[k]) map[k] = []
      map[k].push(ev)
    })
    return map
  }, [allEvents])

  const days    = useMemo(() => getCalendarDays(year, month), [year, month])
  const todayKey = dateKey(today)

  const handleOverflowClick = (date, events) => {
    setDayOverflow({ date, events })
  }

  const handleAddSave = (event) => setCustomEvents(prev => [...prev, event])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '28px 32px 24px', boxSizing: 'border-box' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#e6e7f0', letterSpacing: '-0.4px' }}>Calendar</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#4a4c60' }}>All lectures, labs, deadlines and exams in one place</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevMonth} style={navBtnStyle}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#e6e7f0', minWidth: 148, textAlign: 'center' }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} style={navBtnStyle}><ChevronRight size={16} /></button>

          <button onClick={goToday} style={{ ...navBtnStyle, padding: '6px 14px', width: 'auto', marginLeft: 6, fontSize: 13 }}>
            Today
          </button>

          <button
            onClick={() => setAddModalDate(new Date())}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#34d399', color: '#0b0c13', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginLeft: 4 }}
          >
            <Plus size={14} /> Add Event
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap', flexShrink: 0 }}>
        {Object.entries(EVENT_TYPES).map(([key, cfg]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: cfg.color }} />
            <span style={{ fontSize: 11, color: '#7c7e96' }}>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* ── UNIFIED CALENDAR GRID ───────────────────────────────────────────────
          Header cells + day cells are all in ONE CSS grid so columns are guaranteed
          to align. background + gap:1px creates the grid-line effect. */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridTemplateRows: 'auto repeat(6, 1fr)',
        gap: '1px',
        background: '#1e2030',   /* gap color = grid line color */
        border: '1px solid #1e2030',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {/* Weekday header cells — same grid as day cells, guaranteed alignment */}
        {WEEKDAYS.map(day => (
          <div
            key={day}
            style={{
              background: '#0f1018',
              padding: '9px 0',
              textAlign: 'center',
              fontSize: 11, fontWeight: 600, color: '#4a4c60',
              letterSpacing: '0.5px', textTransform: 'uppercase',
            }}
          >
            {day}
          </div>
        ))}

        {/* 42 day cells */}
        {days.map((day, i) => {
          const k = dateKey(day.date)
          return (
            <DayCell
              key={i}
              day={day}
              events={eventsMap[k] || []}
              isToday={k === todayKey}
              onEventClick={setSelectedEvent}
              onAddClick={setAddModalDate}
              onOverflowClick={handleOverflowClick}
            />
          )
        })}
      </div>

      {/* Modals — z-index layering: day overflow (999) under event detail (1000) */}
      {dayOverflow && !selectedEvent && (
        <DayEventsModal
          date={dayOverflow.date}
          events={dayOverflow.events}
          onClose={() => setDayOverflow(null)}
          onEventClick={ev => { setSelectedEvent(ev); setDayOverflow(null) }}
        />
      )}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onViewSubject={onViewSubject}
        />
      )}
      {addModalDate && (
        <AddEventModal
          initialDate={addModalDate}
          onClose={() => setAddModalDate(null)}
          onSave={handleAddSave}
        />
      )}
    </div>
  )
}

const navBtnStyle = {
  width: 32, height: 32, borderRadius: 7,
  border: '1px solid #2a2c40', background: '#14151e',
  color: '#7c7e96', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13,
}
