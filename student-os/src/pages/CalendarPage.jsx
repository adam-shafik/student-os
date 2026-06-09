import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, X, ChevronUp, ChevronDown, Check, RotateCcw } from 'lucide-react'
import {
  EVENT_TYPES, TYPE_PRIORITY, MONTHS, WEEKDAYS, WEEKDAYS_SUN,
  getCalendarDays, dateKey,
  resolveTypeLabel, resolveTypeColor, getTypeColor,
} from '../utils/calendarEvents'
import { getDomainIcon } from '../data/domains'
import { getWeekRowInfo, getAcademicWeek, getBreakForDate, getSemesterIndexForDate, getSemesterCount } from '../utils/semester'
import { useIsMobile } from '../utils/useIsMobile'
import EventDetailModal from '../components/EventDetailModal'

const COLOR_SWATCHES = [
  '#5b8cff','#a78bfa','#34d399','#fbbf24','#fb7185','#fb923c',
  '#38bdf8','#e879f9','#4ade80','#f472b6','#22d3ee','#9ca3af',
  '#ef4444','#f59e0b','#10b981','#6366f1',
]

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
function EventChip({ event, onClick, hasNote, customColors }) {
  const typeColor   = resolveTypeColor(event, customColors)
  const typeLabel   = resolveTypeLabel(event)
  const domainColor = event.domainColor || null
  const time        = fmtTime(event.details?.time)
  const duration    = fmtDuration(event.details?.duration)
  const showDomain  = event.domainName && event.domainName !== event.title && domainColor
  const DomainIcon  = event.domainIcon ? getDomainIcon(event.domainIcon) : null

  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(event) }}
      title={`${typeLabel}: ${event.title}${time ? ' · ' + time : ''}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: 1,
        padding: '4px 7px',
        borderRadius: 5, marginBottom: 3,
        background: `${typeColor}16`,
        border: `1px solid ${typeColor}30`,
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
        {DomainIcon && (
          <DomainIcon size={9} color={domainColor || typeColor} style={{ flexShrink: 0 }} />
        )}
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
function DayCell({ day, events, isToday, onEventClick, onAddClick, eventNotes, isBreak, isWeekend, customColors }) {
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

      {visible.map(ev => (
        <EventChip key={ev.id} event={ev} onClick={onEventClick} hasNote={!!eventNotes?.[ev.id]?.trim()} customColors={customColors} />
      ))}

      {overflow > 0 && (
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

function AddEventModal({ initialDate, initialTime, domains, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '', date: toInputDate(initialDate || new Date()),
    time: initialTime || '', type: 'social', customTypeName: '', notes: '', domainId: null, reminderDays: [],
  })
  const toggleReminder = (d) => setForm(prev => ({
    ...prev,
    reminderDays: prev.reminderDays.includes(d) ? prev.reminderDays.filter(x => x !== d) : [...prev.reminderDays, d],
  }))
  const [domainPickerOpen, setDomainPickerOpen] = useState(false)
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const activeColor  = PRESET_TYPES.find(t => t.id === form.type)?.color || '#9ca3af'
  const canSave      = form.title.trim() && (form.type !== 'other' || form.customTypeName.trim())
  const linkedDomain = domains.find(d => d.id === form.domainId) || null
  const { academic, other: otherDomains } = groupDomains(domains)

  const isAcademicLink = linkedDomain?.category === 'academic'
  const formDateObj    = form.date ? (() => { const [y, m, d] = form.date.split('-').map(Number); return new Date(y, m - 1, d) })() : null
  const eventWeek  = isAcademicLink && formDateObj ? getAcademicWeek(formDateObj) : null
  const eventSem   = isAcademicLink && formDateObj && getSemesterCount() > 1 ? getSemesterIndexForDate(formDateObj) : null
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
      reminderDays: form.reminderDays,
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
                  {eventWeek ? `${eventSem ? `Semester ${eventSem} · ` : ''}Academic Week ${eventWeek}` : eventBreak.name}
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
            <Label>Remind me (optional)</Label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[{ d: 0, label: 'Day of' }, { d: 1, label: '1 day before' }, { d: 3, label: '3 days before' }].map(({ d, label }) => {
                const on = form.reminderDays.includes(d)
                return (
                  <button key={d} type="button" onClick={() => toggleReminder(d)} style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    border: `1px solid ${on ? 'var(--accent-blue)' : 'var(--border-strong)'}`,
                    background: on ? 'rgba(91,140,255,0.12)' : 'none',
                    color: on ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    fontWeight: on ? 600 : 400, transition: 'all 0.12s', fontFamily: 'inherit',
                  }}>{label}</button>
                )
              })}
            </div>
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

// ─── Type color picker popover ────────────────────────────────────────────────
function TypeColorPicker({ type, currentColor, defaultColor, onSelect, onReset, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 500,
        background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
        borderRadius: 10, padding: '10px 12px', boxShadow: 'var(--shadow-modal)',
        minWidth: 172,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
        {type} color
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5 }}>
        {COLOR_SWATCHES.map(c => (
          <button
            key={c}
            onClick={() => { onSelect(c); onClose() }}
            style={{
              width: 18, height: 18, borderRadius: 4, border: 'none',
              background: c, cursor: 'pointer', padding: 0,
              outline: c === currentColor ? '2px solid white' : '2px solid transparent',
              outlineOffset: 1, transition: 'transform 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        ))}
      </div>
      {currentColor !== defaultColor && (
        <button
          onClick={() => { onReset(); onClose() }}
          style={{
            marginTop: 8, display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 11, padding: '2px 0',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <RotateCcw size={10} /> Reset to default
        </button>
      )}
    </div>
  )
}

const navBtn = {
  width: 32, height: 32, borderRadius: 7,
  border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
  color: 'var(--text-secondary)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const HOUR_START = 7
const HOUR_END   = 22
const HOUR_H     = 64

function getWeekStart(date, weekStartSunday) {
  const d   = new Date(date)
  const day = d.getDay()
  const diff = weekStartSunday ? day : (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── Weekly view ──────────────────────────────────────────────────────────────
function WeekView({ weekDate, allEvents, onEventClick, onAddClick, customColors }) {
  const today    = new Date()
  const todayKey = dateKey(today)
  const nowH     = today.getHours()
  const nowM     = today.getMinutes()

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekDate)
    d.setDate(d.getDate() + i)
    return d
  })

  const dayData = days.map(day => {
    const k   = dateKey(day)
    const evs = allEvents.filter(ev => dateKey(ev.date) === k)
    return { date: day, key: k, timed: evs.filter(ev => ev.details?.time), allDay: evs.filter(ev => !ev.details?.time) }
  })

  const hasAllDay = dayData.some(d => d.allDay.length > 0)
  const hours     = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', height: 'calc(100vh - 188px)', display: 'flex', flexDirection: 'column' }}>

      {/* Single scroll container — header is sticky so it stays aligned with the time grid (no scrollbar offset) */}
      <div style={{ overflowY: 'auto', flex: 1 }}>

        {/* Sticky day header row */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <div />
          {dayData.map(({ date, key }, i) => {
            const isToday = key === todayKey
            return (
              <div key={i} style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid var(--border)', background: isToday ? 'rgba(91,140,255,0.04)' : 'var(--bg-elevated)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: isToday ? 'var(--accent-blue)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', margin: '4px auto 0',
                  background: isToday ? 'var(--accent-blue)' : 'transparent',
                  boxShadow: isToday ? 'var(--glow-blue)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 14, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : 'var(--text-primary)' }}>
                    {date.getDate()}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Sticky all-day row */}
        {hasAllDay && (
          <div style={{ position: 'sticky', top: 62, zIndex: 9, display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <div style={{ padding: '6px 8px 6px 0', textAlign: 'right', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', alignSelf: 'center' }}>all‑day</div>
            {dayData.map(({ allDay }, i) => (
              <div key={i} style={{ borderLeft: '1px solid var(--border)', padding: '4px 4px', minWidth: 0, overflow: 'hidden' }}>
                {allDay.map(ev => {
                  const color = resolveTypeColor(ev, customColors)
                  return (
                    <div key={ev.id} onClick={() => onEventClick(ev)}
                      style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, marginBottom: 2,
                        background: `${color}18`, border: `1px solid ${color}30`,
                        color: 'var(--text-bright)', cursor: 'pointer',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.25)'}
                      onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}>
                      {ev.title}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* Time grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', position: 'relative' }}>

          {/* Hour labels */}
          <div style={{ position: 'relative', height: (HOUR_END - HOUR_START) * HOUR_H }}>
            {hours.map((h, i) => (
              <div key={h} style={{ position: 'absolute', top: i * HOUR_H, left: 0, right: 0, height: HOUR_H, display: 'flex', alignItems: 'flex-start', paddingTop: 5, boxSizing: 'border-box' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', width: '100%', textAlign: 'right', paddingRight: 8 }}>{fmtTime(`${h}:00`)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {dayData.map(({ date, key, timed }, di) => {
            const isToday = key === todayKey
            return (
              <div key={di} onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const y = e.clientY - rect.top
                  const mins = Math.round((y / HOUR_H) * 60 / 15) * 15
                  const h = Math.min(HOUR_END - 1, Math.floor(mins / 60) + HOUR_START)
                  const m = mins % 60
                  onAddClick(date, `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
                }} style={{ position: 'relative', borderLeft: '1px solid var(--border)', background: isToday ? 'var(--bg-elevated)' : 'var(--bg-page)', cursor: 'cell', minHeight: (HOUR_END - HOUR_START) * HOUR_H, minWidth: 0, overflow: 'hidden' }}>
                {/* Hour gridlines */}
                {hours.map((_, i) => (
                  <div key={i} style={{ position: 'absolute', top: i * HOUR_H, left: 0, right: 0, borderTop: '1px solid var(--border)', pointerEvents: 'none' }} />
                ))}
                {/* Half-hour gridlines */}
                {hours.map((_, i) => (
                  <div key={`h${i}`} style={{ position: 'absolute', top: i * HOUR_H + HOUR_H / 2, left: 0, right: 0, borderTop: '1px dashed var(--border)', opacity: 0.5, pointerEvents: 'none' }} />
                ))}

                {/* Timed events */}
                {timed.map(ev => {
                  const [h, m]  = ev.details.time.split(':').map(Number)
                  const top     = (h - HOUR_START + m / 60) * HOUR_H
                  const dur     = ev.details?.duration || 60
                  const height  = Math.max(28, (dur / 60) * HOUR_H - 2)
                  const color   = resolveTypeColor(ev, customColors)
                  return (
                    <div key={ev.id} onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                      style={{ position: 'absolute', top, left: 3, right: 3, height, borderRadius: 5,
                        background: `${color}18`, border: `1px solid ${color}30`,
                        padding: '3px 6px', overflow: 'hidden', cursor: 'pointer', zIndex: 1,
                        transition: 'filter 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.25)'}
                      onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}>
                      <div style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>{resolveTypeLabel(ev)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                      {height > 44 && (
                        <div style={{ fontSize: 9, color, opacity: 0.85, marginTop: 1 }}>{fmtTime(ev.details.time)}{dur ? ` · ${fmtDuration(dur)}` : ''}</div>
                      )}
                    </div>
                  )
                })}

                {/* Current time indicator */}
                {isToday && nowH >= HOUR_START && nowH < HOUR_END && (() => {
                  const top = (nowH - HOUR_START + nowM / 60) * HOUR_H
                  return (
                    <div style={{ position: 'absolute', top, left: 0, right: 0, height: 2, background: '#fb7185', zIndex: 2, pointerEvents: 'none' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fb7185', position: 'absolute', left: -3, top: -3 }} />
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Calendar page ────────────────────────────────────────────────────────────
export default function CalendarPage({ domains = [], domainEvents = [], customEvents = [], onViewDomain, onAddCalendarEvent, onDeleteCalendarEvent, onCancelScheduleEvent, onUpdateEventReminder, onUpdateAssessmentReminder, eventNotes = {}, onUpdateNote, eventTypeColors = {}, onUpdateEventTypeColor, isTutorial = false, weekStartSunday = false }) {
  const isMobile = useIsMobile()
  const today = new Date()
  const [view,             setView]             = useState('month')
  const [viewDate,         setViewDate]         = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [weekDate,         setWeekDate]         = useState(() => getWeekStart(today, weekStartSunday))
  const [selectedEvent,    setSelectedEvent]    = useState(null)
  const [addModalDate,     setAddModalDate]     = useState(null)
  const [addModalTime,     setAddModalTime]     = useState(null)
  const [openColorPicker,  setOpenColorPicker]  = useState(null)

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))
  const prevWeek  = () => setWeekDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  const nextWeek  = () => setWeekDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  const goToday   = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setWeekDate(getWeekStart(today, weekStartSunday))
  }

  const switchView = (v) => {
    if (v === 'week' && view === 'month') setWeekDate(getWeekStart(today, weekStartSunday))
    if (v === 'month' && view === 'week') setViewDate(new Date(weekDate.getFullYear(), weekDate.getMonth(), 1))
    setView(v)
  }

  const allEvents    = useMemo(() => [...domainEvents, ...customEvents], [domainEvents, customEvents])
  const presentTypes = useMemo(() => {
    const s = new Set(allEvents.map(ev => ev.type))
    return Object.keys(EVENT_TYPES).filter(k => s.has(k))
  }, [allEvents])

  const eventsMap = useMemo(() => {
    const map = {}
    allEvents.forEach(ev => {
      const k = dateKey(ev.date)
      if (!map[k]) map[k] = []
      map[k].push(ev)
    })
    return map
  }, [allEvents])

  const days     = useMemo(() => getCalendarDays(year, month, weekStartSunday), [year, month, weekStartSunday])
  const weekRows = useMemo(() => {
    const rows = []
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7))
    return rows
  }, [days])
  const todayKey = dateKey(today)

  // Week view header label
  const weekEnd = new Date(weekDate); weekEnd.setDate(weekEnd.getDate() + 6)
  const sameMonth = weekDate.getMonth() === weekEnd.getMonth()
  const weekLabel = sameMonth
    ? `${weekDate.getDate()} – ${weekEnd.getDate()} ${MONTHS[weekDate.getMonth()]} ${weekDate.getFullYear()}`
    : `${weekDate.getDate()} ${MONTHS[weekDate.getMonth()]} – ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`

  return (
    <div style={{ padding: isMobile ? '20px 14px 24px' : '28px 32px 32px', display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 26 : 30, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.8px' }}>Calendar</h1>
            {!isMobile && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Lectures, labs, deadlines and exams</p>}
          </div>
          {isMobile && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setAddModalDate(new Date())}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-green)', color: 'var(--bg-page)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0 }}
            >
              <Plus size={14} /> Add
            </motion.button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 8, overflow: 'hidden', marginRight: isMobile ? 0 : 4 }}>
            {['month', 'week'].map(v => (
              <motion.button key={v} onClick={() => switchView(v)}
                whileTap={{ scale: 0.96 }}
                style={{
                  padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: view === v ? 600 : 400,
                  background: view === v ? 'var(--nav-active)' : 'transparent',
                  color: view === v ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  transition: 'background 0.15s, color 0.15s', textTransform: 'capitalize', fontFamily: 'inherit',
                }}>
                {v}
              </motion.button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={view === 'month' ? prevMonth : prevWeek} style={navBtn}><ChevronLeft size={16} /></motion.button>
            <span style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: 'var(--text-primary)', width: isMobile ? 'auto' : 220, flex: isMobile ? 1 : 'none', textAlign: 'center', display: 'inline-block', flexShrink: isMobile ? 1 : 0 }}>
              {view === 'month' ? `${MONTHS[month]} ${year}` : weekLabel}
            </span>
            <motion.button whileTap={{ scale: 0.9 }} onClick={view === 'month' ? nextMonth : nextWeek} style={navBtn}><ChevronRight size={16} /></motion.button>
          </div>
          <motion.button whileTap={{ scale: 0.96 }} onClick={goToday} style={{ ...navBtn, padding: '6px 14px', width: 'auto', marginLeft: isMobile ? 0 : 6, fontSize: 13, fontFamily: 'inherit' }}>Today</motion.button>
          {!isMobile && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setAddModalDate(new Date())}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-green)', color: 'var(--bg-page)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginLeft: 4, whiteSpace: 'nowrap', fontFamily: 'inherit' }}
            >
              <Plus size={14} /> Add Event
            </motion.button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
        {presentTypes.map(key => {
          const cfg   = EVENT_TYPES[key]
          const color = getTypeColor(key, eventTypeColors)
          return (
            <div key={key} style={{ position: 'relative' }}>
              <button
                onClick={() => setOpenColorPicker(p => p === key ? null : key)}
                title="Click to change color"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: openColorPicker === key ? 'var(--bg-overlay)' : 'none',
                  border: '1px solid transparent', borderRadius: 6,
                  padding: '3px 7px 3px 5px', cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
                onMouseLeave={e => { if (openColorPicker !== key) e.currentTarget.style.background = 'none' }}
              >
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{cfg.label}</span>
              </button>
              {openColorPicker === key && (
                <TypeColorPicker
                  type={cfg.label}
                  currentColor={color}
                  defaultColor={cfg.color}
                  onSelect={c => onUpdateEventTypeColor?.(key, c)}
                  onReset={() => onUpdateEventTypeColor?.(key, cfg.color)}
                  onClose={() => setOpenColorPicker(null)}
                />
              )}
            </div>
          )
        })}
        {presentTypes.length > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginLeft: 2 }}>· click to change color</span>
        )}
      </div>

      <AnimatePresence mode="wait">
      {view === 'week' ? (
        <motion.div
          key={`week-${weekDate.toISOString().slice(0,10)}`}
          data-tutorial-id="calendar-grid"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          <WeekView
            weekDate={weekDate}
            allEvents={allEvents}
            onEventClick={setSelectedEvent}
            onAddClick={(date, time) => { setAddModalDate(date); setAddModalTime(time ?? null) }}
            eventNotes={eventNotes}
            customColors={eventTypeColors}
          />
        </motion.div>
      ) : (
      <motion.div
        key={`month-${year}-${month}`}
        data-tutorial-id="calendar-grid"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '18px repeat(7, 1fr)' : '28px repeat(7, 1fr)',
        gridTemplateRows: isMobile ? `auto repeat(6, minmax(72px, auto))` : `auto repeat(6, minmax(110px, auto))`,
        gap: '1px',
        background: 'var(--border)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{ background: 'var(--bg-elevated)' }} />
        {(weekStartSunday ? WEEKDAYS_SUN : WEEKDAYS).map(day => (
          <div key={day} style={{ background: 'var(--bg-elevated)', padding: '9px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', minWidth: 0, overflow: 'hidden' }}>
            {day}
          </div>
        ))}

        {weekRows.flatMap((week, wi) => {
          const info = getWeekRowInfo(week, weekStartSunday)
          return [
            <WeekLabelCell key={`wl-${wi}`} info={info} />,
            ...week.map((day, di) => {
              const k = dateKey(day.date)
              const dow = day.date.getDay()
              const isWeekend = weekStartSunday
                ? (dow === 5 || dow === 6)
                : (dow === 0 || dow === 6)
              return (
                <DayCell
                  key={`${wi}-${di}`}
                  day={day}
                  events={eventsMap[k] || []}
                  isToday={k === todayKey}
                  onEventClick={setSelectedEvent}
                  onAddClick={d => setAddModalDate(d)}
                  eventNotes={eventNotes}
                  isBreak={info.isBreak}
                  isWeekend={isWeekend}
                  customColors={eventTypeColors}
                />
              )
            }),
          ]
        })}
      </motion.div>
      )}
      </AnimatePresence>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onViewDomain={onViewDomain}
          note={eventNotes[selectedEvent.id] || ''}
          onUpdateNote={onUpdateNote || (() => {})}
          onDelete={() => {
            if (customEvents.some(ev => ev.id === selectedEvent.id)) {
              onDeleteCalendarEvent?.(selectedEvent.id)
            } else {
              onCancelScheduleEvent?.(selectedEvent.id)
            }
            setSelectedEvent(null)
          }}
          isTutorial={isTutorial}
          onUpdateReminder={
            customEvents.some(ev => ev.id === selectedEvent.id)
              ? (days) => onUpdateEventReminder?.(selectedEvent.id, days)
              : selectedEvent.assessmentId
              ? (days) => onUpdateAssessmentReminder?.(selectedEvent.assessmentId, days)
              : null
          }
        />
      )}
      {addModalDate && (
        <AddEventModal
          initialDate={addModalDate}
          initialTime={addModalTime}
          domains={domains}
          onClose={() => { setAddModalDate(null); setAddModalTime(null) }}
          onSave={ev => { onAddCalendarEvent?.(ev); setAddModalDate(null); setAddModalTime(null) }}
        />
      )}
    </div>
  )
}
