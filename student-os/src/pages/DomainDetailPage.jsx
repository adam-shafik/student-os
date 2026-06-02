import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import {
  ArrowLeft, User, Award, FileText,
  GraduationCap, CheckCircle2, Clock, ChevronDown,
  ChevronRight, StickyNote, Calendar, MapPin, TrendingUp,
  AlertCircle, ExternalLink, Tag, PenLine, Pencil, X,
  Plus, Trash2, Edit2, Check, BarChart2, MoreVertical, Archive, RotateCcw,
  Eye, EyeOff,
} from 'lucide-react'
import { DOMAIN_CATEGORIES, DOMAIN_COLORS, DOMAIN_ICON_GROUPS, getDomainIcon } from '../data/domains'
import { EVENT_TYPES, resolveTypeLabel, resolveTypeColor } from '../utils/calendarEvents'
import { totalTeachingWeeks } from '../utils/semester'
import EventDetailModal from '../components/EventDetailModal'
import ConfirmModal from '../components/ConfirmModal'

function DomainIcon({ name, size = 16, color }) {
  const Icon = getDomainIcon(name)
  if (!Icon) return null
  return <Icon size={size} color={color} />
}

const TOTAL_WEEKS = totalTeachingWeeks()
const CONF_LEVELS = [
  { key: 'not_started', label: 'Not Started', color: '#4a4c60', bg: 'rgba(74,76,96,0.15)'   },
  { key: 'reviewed',    label: 'Reviewed',    color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { key: 'confident',   label: 'Confident',   color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
]

// ─── Shared helpers ────────────────────────────────────────────────────────────
function SectionCard({ children, style }) {
  return <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', ...style }}>{children}</div>
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}


function EventRow({ event, isLast, onClick }) {
  const [hovered, setHovered] = useState(false)
  const typeColor = resolveTypeColor(event)
  const typeLabel = resolveTypeLabel(event)
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        cursor: 'pointer', background: hovered ? 'var(--row-hover)' : 'transparent', transition: 'background 0.12s' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${typeColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: typeColor }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          <span style={{ color: typeColor, fontWeight: 600 }}>{typeLabel}</span>
          {' · '}{event.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {event.details?.time && ` · ${event.details.time}`}
        </div>
      </div>
    </div>
  )
}

// ─── Note type picker (inline popover) ────────────────────────────────────────
function NoteButton({ onNewNote, meta, label = 'Note' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    if (!open) return
    const handler = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 6,
          border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-purple)'; e.currentTarget.style.borderColor = 'var(--accent-purple)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        <PenLine size={11} /> {label}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 200,
          background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 9,
          boxShadow: 'var(--shadow-modal)', overflow: 'hidden', minWidth: 140 }}>
          {[
            { type: 'handwritten', label: 'Handwritten', Icon: PenLine },
            { type: 'typed',       label: 'Typed',       Icon: FileText },
          ].map(opt => (
            <button key={opt.type}
              onClick={e => { e.stopPropagation(); setOpen(false); onNewNote({ ...meta, noteType: opt.type }) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
                color: 'var(--text-primary)', textAlign: 'left' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--nav-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <opt.Icon size={12} />{opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({ domain, domainEvents, assessments, calculatedProgress }) {
  const today     = new Date()
  const schedEvs  = domainEvents.filter(e => e.type !== 'exam' && e.type !== 'assignment')
  const completed = schedEvs.filter(e => e.date < today).length
  const upcoming  = schedEvs.filter(e => e.date >= today).length
  const total     = schedEvs.length

  const graded = assessments.filter(a => a.grade != null)
  const totalWeight = graded.reduce((s, a) => s + (a.weight || 0), 0)
  const weightedAvg = totalWeight > 0
    ? Math.round(graded.reduce((s, a) => s + (a.grade * a.weight), 0) / totalWeight)
    : null
  const ungradedCount = assessments.filter(a => a.grade == null).length

  const upcomingAssessments = assessments
    .filter(a => a.date && new Date(a.date + 'T12:00:00') >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 4)

  const nextEvent = schedEvs.filter(e => e.date >= today).sort((a, b) => a.date - b.date)[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Attended',      value: `${completed}/${total}`, icon: CheckCircle2, color: 'var(--accent-green)'  },
          { label: 'Upcoming',      value: upcoming,                icon: Clock,         color: 'var(--accent-blue)'   },
          { label: 'Avg Grade',     value: weightedAvg ? `${weightedAvg}%` : '—', icon: TrendingUp, color: 'var(--accent-green)' },
          { label: 'Not Marked',    value: ungradedCount,           icon: AlertCircle,   color: 'var(--accent-amber)'  },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</span>
                <div style={{ width: 28, height: 28, background: 'var(--bg-overlay)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color={s.color} />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SectionCard>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Upcoming Assessments</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {upcomingAssessments.length === 0
              ? <p style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No upcoming deadlines</p>
              : upcomingAssessments.map((a, i) => {
                const isExam = a.type === 'exam'
                const color  = isExam ? '#fb7185' : '#fbbf24'
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < upcomingAssessments.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {isExam ? 'Exam' : 'Assignment'} · {a.date} · {a.weight}%
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </SectionCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {nextEvent && (
            <SectionCard>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Next Session</span>
              </div>
              <div style={{ padding: '14px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                    background: `${resolveTypeColor(nextEvent)}18`, color: resolveTypeColor(nextEvent) }}>
                    {resolveTypeLabel(nextEvent).toUpperCase()}
                  </span>
                  {nextEvent.details?.week && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Week {nextEvent.details.week}</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {nextEvent.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {nextEvent.details?.time && ` · ${nextEvent.details.time}`}
                </div>
                {nextEvent.details?.location && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} />{nextEvent.details.location}
                  </div>
                )}
              </div>
            </SectionCard>
          )}
          <SectionCard>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Module Progress</span>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Sessions completed</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: domain.color }}>{calculatedProgress}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--progress-track)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${calculatedProgress}%`, borderRadius: 3,
                  background: `var(--progress-gradient, ${domain.color})` }} />
              </div>
              {weightedAvg != null && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  Weighted avg from {graded.length} graded item{graded.length !== 1 ? 's' : ''}
                  {ungradedCount > 0 && ` · ${ungradedCount} not yet marked`}
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

// ─── Schedule tab (lectures, labs, tutorials, seminars, etc.) ─────────────────
function ScheduleTab({ domain, domainEvents, onNewNote, notes, eventNotes, showContent }) {
  const [sortBy,    setSortBy]    = useState('week')
  const [openWeeks, setOpenWeeks] = useState(() => {
    const o = {}
    domainEvents.forEach(e => { if (e.details?.week) o[e.details.week] = true })
    return o
  })

  const today    = new Date()
  const schedEvs = domainEvents
    .filter(e => e.type !== 'exam' && e.type !== 'assignment')
    .sort((a, b) => a.date - b.date)

  if (schedEvs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        <Calendar size={32} color="var(--border-strong)" style={{ marginBottom: 12 }} />
        <p style={{ margin: 0, fontSize: 14 }}>No scheduled sessions yet.</p>
        <p style={{ margin: '6px 0 0', fontSize: 12 }}>Add schedule slots during onboarding or in settings.</p>
      </div>
    )
  }

  function noteTitle(event) {
    const week = event.details?.week
    const type = resolveTypeLabel(event)
    return week ? `Week ${week} – ${type}` : type
  }

  function EventItem({ event, isLast }) {
    const isPast     = event.date < today
    const typeColor  = EVENT_TYPES[event.type]?.color || '#9ca3af'
    const typeLabel  = resolveTypeLabel(event)
    const linkedNotes = (notes || []).filter(n => n.eventId === event.id)
    const hasEvNote  = !!eventNotes?.[event.id]?.trim()
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        opacity: isPast ? 0.65 : 1 }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: typeColor, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
              background: `${typeColor}18`, color: typeColor }}>{typeLabel.toUpperCase()}</span>
            {isPast && <span style={{ fontSize: 10, color: 'var(--accent-green)', fontWeight: 600 }}>✓ Attended</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {event.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            {event.details?.time && ` · ${event.details.time}`}
            {event.details?.duration && ` · ${event.details.duration}min`}
          </div>
          {event.details?.location && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={10} />{event.details.location}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {showContent && linkedNotes.map(n => (
            <span key={n.id} style={{ fontSize: 10, color: 'var(--accent-purple)', background: 'rgba(167,139,250,0.12)',
              padding: '2px 7px', borderRadius: 4 }}><PenLine size={9} style={{ display:'inline', marginRight:3 }} />{n.title || 'Note'}</span>
          ))}
          {showContent && hasEvNote && <span style={{ fontSize: 10, color: 'var(--accent-purple)', background: 'rgba(167,139,250,0.12)', padding: '2px 7px', borderRadius: 4 }}><StickyNote size={9} style={{ display:'inline', marginRight:3 }} />Notes</span>}
          {showContent && (
            <NoteButton
              onNewNote={onNewNote}
              meta={{ domainId: domain.id, academicWeek: event.details?.week || null, eventId: event.id, title: noteTitle(event) }}
            />
          )}
        </div>
      </div>
    )
  }

  if (sortBy === 'date') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          <SortBtn active={sortBy === 'week'} onClick={() => setSortBy('week')} label="By Week" />
          <SortBtn active={sortBy === 'date'} onClick={() => setSortBy('date')} label="By Date" />
        </div>
        <SectionCard>
          {schedEvs.map((ev, i) => <EventItem key={ev.id} event={ev} isLast={i === schedEvs.length - 1} />)}
        </SectionCard>
      </div>
    )
  }

  // group by week
  const byWeek = {}
  schedEvs.forEach(e => {
    const w = e.details?.week ?? 0
    if (!byWeek[w]) byWeek[w] = []
    byWeek[w].push(e)
  })
  const sortedWeeks = Object.keys(byWeek).sort((a, b) => Number(a) - Number(b))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        <SortBtn active={sortBy === 'week'} onClick={() => setSortBy('week')} label="By Week" />
        <SortBtn active={sortBy === 'date'} onClick={() => setSortBy('date')} label="By Date" />
      </div>
      {sortedWeeks.map(week => {
        const evs      = byWeek[week]
        const allPast  = evs.every(e => e.date < today)
        const anyFuture = evs.some(e => e.date >= today)
        const wNum     = Number(week)
        const wColor   = allPast ? '#34d399' : anyFuture ? '#5b8cff' : '#4a4c60'
        const isOpen   = openWeeks[week]

        return (
          <SectionCard key={week}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => setOpenWeeks(prev => ({ ...prev, [week]: !prev[week] }))}
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px',
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 7, background: `${wColor}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {wNum > 0
                    ? <span style={{ fontSize: 10, fontWeight: 700, color: wColor }}>W{week}</span>
                    : <Calendar size={13} color={wColor} />}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {wNum > 0 ? `Week ${week}` : 'No week'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {evs.length} session{evs.length > 1 ? 's' : ''}
                    {allPast && <span style={{ color: 'var(--accent-green)' }}> · All attended</span>}
                  </span>
                </div>
                {isOpen ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
              </button>
              {showContent && (
                <NoteButton
                  onNewNote={onNewNote}
                  meta={{ domainId: domain.id, academicWeek: wNum > 0 ? wNum : null, title: wNum > 0 ? `Week ${week} Notes` : 'Notes' }}
                  label="Week Note"
                />
              )}
              <div style={{ width: 14 }} />
            </div>
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {evs.map((ev, i) => <EventItem key={ev.id} event={ev} isLast={i === evs.length - 1} />)}
              </div>
            )}
          </SectionCard>
        )
      })}
    </div>
  )
}

function SortBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 6, border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border)'}`,
      background: active ? 'rgba(91,140,255,0.1)' : 'none', color: active ? 'var(--accent-blue)' : 'var(--text-muted)',
      cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400, transition: 'all 0.12s',
    }}>
      {label}
    </button>
  )
}

// ─── Assessments tab ──────────────────────────────────────────────────────────
function AssessmentModal({ domain, initial, onClose, onSave }) {
  const [form, setForm] = useState({
    type:         initial?.type         || 'exam',
    title:        initial?.title        || '',
    date:         initial?.date         || '',
    weight:       initial?.weight       != null ? String(initial.weight) : '',
    location:     initial?.location     || '',
    reminderDays: initial?.reminderDays || [],
  })
  const toggleReminder = (d) => setForm(prev => ({
    ...prev,
    reminderDays: prev.reminderDays.includes(d)
      ? prev.reminderDays.filter(x => x !== d)
      : [...prev.reminderDays, d],
  }))
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const canSave = form.title.trim() && form.weight !== ''

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border-strong)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 16, width: 440, maxWidth: '92vw', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{initial ? 'Edit' : 'Add'} Assessment</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Type</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { key: 'exam', label: 'Exam', Icon: GraduationCap, color: '#fb7185' },
                { key: 'assignment', label: 'Assignment', Icon: FileText, color: '#fbbf24' },
              ].map(opt => (
                <button key={opt.key} onClick={() => set('type', opt.key)} style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${form.type === opt.key ? opt.color : 'var(--border)'}`,
                  background: form.type === opt.key ? `${opt.color}12` : 'none',
                  color: form.type === opt.key ? opt.color : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 13, fontWeight: form.type === opt.key ? 600 : 400, transition: 'all 0.12s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}><opt.Icon size={13} />{opt.label}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Title</div>
            <input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Final Exam, Coursework 1…"
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'} onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Date</div>
              <input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={form.date} onChange={e => set('date', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'} onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Weight %</div>
              <input style={inputStyle} type="number" min={0} max={100} value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="e.g. 40"
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'} onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
            </div>
          </div>

          {form.type === 'exam' && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Location (optional)</div>
              <input style={inputStyle} value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Main Hall, Room 204"
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'} onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
            </div>
          )}

          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Remind me (optional)</div>
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
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={() => { if (!canSave) return; onSave({ type: form.type, title: form.title.trim(), date: form.date || null, weight: parseInt(form.weight) || 0, location: form.location.trim() || null, reminderDays: form.reminderDays }); onClose() }}
            disabled={!canSave} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              background: canSave ? domain.color : 'var(--border)', color: canSave ? '#fff' : 'var(--text-muted)',
              cursor: canSave ? 'pointer' : 'default', transition: 'all 0.15s' }}>
            {initial ? 'Save Changes' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

function GradeInput({ assessment, onSave, onCancel }) {
  const [val, setVal] = useState(assessment.grade != null ? String(assessment.grade) : '')
  const num = parseFloat(val)
  const valid = !isNaN(num) && num >= 0 && num <= 100
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input autoFocus type="number" min={0} max={100} step={0.1}
        value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && valid) { onSave(num); } if (e.key === 'Escape') onCancel() }}
        style={{ width: 72, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-focus)',
          background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
      />
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>%</span>
      <button onClick={() => valid && onSave(num)}
        style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: valid ? 'var(--accent-green)' : 'var(--border)', color: valid ? '#fff' : 'var(--text-muted)', cursor: valid ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={12} />
      </button>
      <button onClick={onCancel} style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={12} />
      </button>
    </div>
  )
}

function PredictInput({ assessment, onSave, onCancel }) {
  const [val, setVal] = useState(assessment.predictedGrade != null ? String(assessment.predictedGrade) : '')
  const num = parseFloat(val)
  const valid = !isNaN(num) && num >= 0 && num <= 100
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input autoFocus type="number" min={0} max={100} step={0.1}
        value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && valid) onSave(num); if (e.key === 'Escape') onCancel() }}
        style={{ width: 72, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(167,139,250,0.6)',
          background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
      />
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>%</span>
      <button onClick={() => valid && onSave(num)}
        style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: valid ? 'var(--accent-purple)' : 'var(--border)', color: valid ? '#fff' : 'var(--text-muted)', cursor: valid ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={12} />
      </button>
      <button onClick={onCancel} style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={12} />
      </button>
    </div>
  )
}

function AssessmentsTab({ domain, assessments, onAddAssessment, onUpdateAssessment, onDeleteAssessment }) {
  const [showAdd,        setShowAdd]        = useState(false)
  const [editing,        setEditing]        = useState(null)
  const [gradingId,      setGradingId]      = useState(null)
  const [predictingId,   setPredictingId]   = useState(null)
  const [targetGrade,    setTargetGrade]    = useState(70)
  const [saveError,      setSaveError]      = useState(null)
  const [confirmDelId,   setConfirmDelId]   = useState(null)

  const exams       = assessments.filter(a => a.type === 'exam').sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1)
  const assignments = assessments.filter(a => a.type === 'assignment').sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1)

  const totalWeight    = assessments.reduce((s, a) => s + (a.weight || 0), 0)
  const graded         = assessments.filter(a => a.grade != null)
  const gradedWeight   = graded.reduce((s, a) => s + (a.weight || 0), 0)
  const gradedSum      = graded.reduce((s, a) => s + a.grade * (a.weight || 0), 0)
  const weightedAvg    = gradedWeight > 0 ? (gradedSum / gradedWeight).toFixed(1) : null

  const predicted      = assessments.filter(a => a.grade == null && a.predictedGrade != null)
  const predictedWeight = predicted.reduce((s, a) => s + (a.weight || 0), 0)
  const predictedSum   = predicted.reduce((s, a) => s + a.predictedGrade * (a.weight || 0), 0)
  const coveredWeight  = gradedWeight + predictedWeight
  const coveredSum     = gradedSum + predictedSum
  const projectedAvg   = coveredWeight > 0 ? (coveredSum / coveredWeight).toFixed(1) : null

  const ungradedWeight = assessments.filter(a => a.grade == null && a.predictedGrade == null).reduce((s, a) => s + (a.weight || 0), 0)
  const neededRaw      = ungradedWeight > 0 && totalWeight > 0
    ? (targetGrade * totalWeight - coveredSum) / ungradedWeight
    : null
  const neededAvg      = neededRaw != null ? neededRaw.toFixed(1) : null
  const neededColor    = neededRaw == null ? 'var(--text-muted)'
    : neededRaw > 100 ? 'var(--accent-red)'
    : neededRaw >= 70 ? 'var(--accent-amber)'
    : 'var(--accent-green)'

  function gradeColor(v) {
    const n = Number(v)
    return n >= 50 ? 'var(--accent-green)' : n >= 30 ? 'var(--accent-amber)' : 'var(--accent-red)'
  }

  function AssessmentRow({ item }) {
    const isExam      = item.type === 'exam'
    const color       = isExam ? '#fb7185' : '#fbbf24'
    const isGrading   = gradingId === item.id
    const isPredicting = predictingId === item.id
    const today       = new Date()
    const isPast      = item.date && new Date(item.date + 'T12:00:00') < today

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>{item.title}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            {item.date && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={11} />{item.date}</span>}
            <span>Weight: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{item.weight}%</span></span>
            {item.location && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} />{item.location}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {isGrading ? (
            <GradeInput assessment={item} onSave={async g => {
              const { error } = await onUpdateAssessment(item.id, { ...item, grade: g, predictedGrade: null })
              if (error) setSaveError(error.message || 'Unknown error'); else setGradingId(null)
            }} onCancel={() => setGradingId(null)} />
          ) : isPredicting ? (
            <PredictInput assessment={item} onSave={async g => {
              const { error } = await onUpdateAssessment(item.id, { ...item, predictedGrade: g })
              if (error) setSaveError(error.message || 'Unknown error'); else setPredictingId(null)
            }} onCancel={() => setPredictingId(null)} />
          ) : item.grade != null ? (
            <button onClick={() => { setGradingId(item.id); setPredictingId(null) }} title="Edit grade"
              style={{ background: `${gradeColor(item.grade)}18`, color: gradeColor(item.grade), fontSize: 14, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: `1px solid ${gradeColor(item.grade)}40`, cursor: 'pointer' }}>
              {item.grade}%
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => { setGradingId(item.id); setPredictingId(null) }}
                style={{ padding: '5px 10px', borderRadius: 7, border: '1px dashed var(--border-strong)', background: 'none',
                  color: 'var(--text-muted)', fontSize: 12, cursor: isPast ? 'pointer' : 'default', opacity: isPast ? 1 : 0.45 }}
                title={isPast ? 'Enter actual grade' : 'Date not yet reached'}>
                + Grade
              </button>
              {item.predictedGrade != null ? (
                <button onClick={() => { setPredictingId(item.id); setGradingId(null) }} title="Edit prediction"
                  style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(167,139,250,0.35)',
                    background: 'rgba(167,139,250,0.1)', color: 'var(--accent-purple)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  ~{item.predictedGrade}%
                </button>
              ) : (
                <button onClick={() => { setPredictingId(item.id); setGradingId(null) }}
                  style={{ padding: '5px 10px', borderRadius: 7, border: '1px dashed rgba(167,139,250,0.4)', background: 'none',
                    color: 'rgba(167,139,250,0.7)', fontSize: 12, cursor: 'pointer' }}
                  title="Add predicted grade">
                  ~ Predict
                </button>
              )}
            </div>
          )}
          <button onClick={() => setEditing(item)}
            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Edit2 size={12} />
          </button>
          <button onClick={() => setConfirmDelId(item.id)}
            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.12)'; e.currentTarget.style.color = '#fb7185' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-overlay)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header stats + add button */}
      <div data-tutorial-id="assessments-stats" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, flexWrap: 'wrap' }}>

          {/* Current avg */}
          {weightedAvg != null && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Current Avg</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: gradeColor(weightedAvg) }}>{weightedAvg}%</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{graded.length} graded</span>
              </div>
            </div>
          )}

          {/* Projected */}
          {projectedAvg != null && predicted.length > 0 && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 10, color: 'rgba(167,139,250,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Projected</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent-purple)' }}>~{projectedAvg}%</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{predicted.length}/{assessments.length} predicted</span>
              </div>
            </div>
          )}

          {/* What do I need — always visible so users know it exists */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', opacity: neededAvg == null ? 0.45 : 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>What Do I Need?</div>
            {neededAvg != null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Target</span>
                <input
                  type="number" value={targetGrade} min={0} max={100}
                  onChange={e => setTargetGrade(Math.max(0, Math.min(100, Number(e.target.value))))}
                  style={{ width: 52, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-strong)',
                    background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                    textAlign: 'center', fontFamily: 'inherit' }}
                  onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>%</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→ Need</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: neededColor }}>{neededAvg}%</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>avg on {ungradedWeight}% left</span>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Add assessments to use this</div>
            )}
          </div>

          {assessments.length > 0 && weightedAvg == null && projectedAvg == null && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center' }}>No grades entered yet. Add actual grades or predictions to get started.</span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
            border: 'none', background: domain.color, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          <Plus size={14} /> Add Assessment
        </button>
      </div>

      {saveError && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.25)', color: '#fb7185', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1 }}>Save failed: {saveError}</span>
          <button onClick={() => setSaveError(null)} style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={14} /></button>
        </div>
      )}

      {assessments.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <BarChart2 size={32} color="var(--border-strong)" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 14 }}>No assessments yet.</p>
          <p style={{ margin: '6px 0 0', fontSize: 12 }}>Add exams and assignments to track your grades.</p>
        </div>
      )}

      {exams.length > 0 && (
        <SectionCard>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <GraduationCap size={14} color="#fb7185" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fb7185', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Exams</span>
          </div>
          {exams.map(a => <AssessmentRow key={a.id} item={a} />)}
          <div style={{ height: 0 }} />
        </SectionCard>
      )}

      {assignments.length > 0 && (
        <SectionCard>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={14} color="#fbbf24" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Assignments</span>
          </div>
          {assignments.map(a => <AssessmentRow key={a.id} item={a} />)}
          <div style={{ height: 0 }} />
        </SectionCard>
      )}

      {showAdd && (
        <AssessmentModal domain={domain} onClose={() => setShowAdd(false)}
          onSave={async data => {
            const { error } = await onAddAssessment({ ...data, domainId: domain.id })
            if (error) setSaveError(error.message || 'Unknown error')
          }} />
      )}
      {editing && (
        <AssessmentModal domain={domain} initial={editing} onClose={() => setEditing(null)}
          onSave={async data => {
            const { error } = await onUpdateAssessment(editing.id, { ...editing, ...data })
            if (error) setSaveError(error.message || 'Unknown error')
          }} />
      )}
      {confirmDelId && (
        <ConfirmModal
          message={`Delete "${assessments.find(a => a.id === confirmDelId)?.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => { onDeleteAssessment(confirmDelId); setConfirmDelId(null) }}
          onCancel={() => setConfirmDelId(null)}
        />
      )}
    </div>
  )
}

// ─── Study tab ────────────────────────────────────────────────────────────────
function StudyTab({ domain, studySessions, notes, weekConfidence, onSetWeekConfidence, onNewNote, onOpenNote, showContent }) {
  const [openWeeks, setOpenWeeks] = useState({})
  const domainConf = (weekConfidence || {})[domain.id] || {}

  function cycleConf(week, e) {
    e.stopPropagation()
    const current = domainConf[week] || 'not_started'
    const idx = CONF_LEVELS.findIndex(l => l.key === current)
    const next = CONF_LEVELS[(idx + 1) % CONF_LEVELS.length].key
    onSetWeekConfidence?.(domain.id, week, next)
  }

  const domainSessions   = (studySessions || []).filter(s => s.domainId === domain.id)
  const domainNotes      = (notes || []).filter(n => n.domainId === domain.id && !n.studySessionId)
  const generalSessions  = domainSessions.filter(s => s.academicWeek == null)
  const generalNotes     = domainNotes.filter(n => n.academicWeek == null)

  function WeekContent({ sessions, weekNotes }) {
    return (
      <>
        {sessions.map((s, i) => {
          const isLast   = i === sessions.length - 1 && weekNotes.length === 0
          const sColor   = s.status === 'completed' ? '#34d399' : '#fbbf24'
          const totalMins = s.pomodoroWork * s.roundsCompleted
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: sColor, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{s.topic || 'Study Session'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {s.roundsCompleted}/{s.totalRounds} rounds · {totalMins}min
                  {' · '}{new Date(s.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {s.noteId && onOpenNote && (
                  <button onClick={() => onOpenNote(s.noteId)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5,
                      border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.08)', color: 'var(--accent-purple)', cursor: 'pointer', fontSize: 10 }}>
                    <PenLine size={9} /> Open Note
                  </button>
                )}
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: `${sColor}18`, color: sColor }}>{s.status}</span>
              </div>
            </div>
          )
        })}
        {weekNotes.map((note, i) => (
          <div key={note.id} onClick={() => onOpenNote?.(note.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px',
              borderBottom: i < weekNotes.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
            <PenLine size={13} color="var(--accent-purple)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{note.title || 'Untitled Note'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Note · {new Date(note.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </div>
            </div>
            <ChevronRight size={14} color="var(--text-muted)" />
          </div>
        ))}
      </>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(week => {
        const sessions  = domainSessions.filter(s => s.academicWeek === week)
        const weekNotes = domainNotes.filter(n => n.academicWeek === week)
        const conf      = domainConf[week] || 'not_started'
        const confCfg   = CONF_LEVELS.find(l => l.key === conf) || CONF_LEVELS[0]
        const hasData   = sessions.length > 0 || weekNotes.length > 0
        const isOpen    = openWeeks[week]
        return (
          <SectionCard key={week}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${confCfg.color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: confCfg.color }}>W{week}</span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Week {week}</span>
                {hasData && showContent && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {[sessions.length > 0 && `${sessions.length} session${sessions.length > 1 ? 's' : ''}`,
                      weekNotes.length > 0 && `${weekNotes.length} note${weekNotes.length > 1 ? 's' : ''}`
                    ].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
              {showContent && <NoteButton onNewNote={onNewNote} meta={{ domainId: domain.id, academicWeek: week, title: `Week ${week} – Study Notes` }} />}
              <button onClick={e => cycleConf(week, e)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6,
                  border: `1px solid ${confCfg.color}40`, background: confCfg.bg, color: confCfg.color,
                  cursor: 'pointer', fontSize: 11, fontWeight: 600, flexShrink: 0, transition: 'all 0.12s' }}>
                {confCfg.label}
              </button>
              {hasData && showContent && (
                <button onClick={() => setOpenWeeks(prev => ({ ...prev, [week]: !prev[week] }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4, borderRadius: 5, flexShrink: 0 }}>
                  {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
              )}
            </div>
            {isOpen && hasData && showContent && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                <WeekContent sessions={sessions} weekNotes={weekNotes} />
              </div>
            )}
          </SectionCard>
        )
      })}

      {/* General / no-week section */}
      {showContent && (generalSessions.length > 0 || generalNotes.length > 0) && (
        <SectionCard style={{ marginTop: 8 }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>General</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Not linked to a specific week</span>
          </div>
          <WeekContent sessions={generalSessions} weekNotes={generalNotes} />
        </SectionCard>
      )}
    </div>
  )
}

// ─── General domain tabs ───────────────────────────────────────────────────────
function GeneralOverviewTab({ domain, linkedEvents, onOpenEvent }) {
  const upcoming = linkedEvents.filter(e => e.date >= new Date()).sort((a, b) => a.date - b.date)
  const past     = linkedEvents.filter(e => e.date  < new Date()).sort((a, b) => b.date - a.date)
  const catCfg   = DOMAIN_CATEGORIES[domain.category] || DOMAIN_CATEGORIES.other
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionCard>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>About</span>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{domain.description || 'No description.'}</p>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>Type</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: catCfg.color, background: `${catCfg.color}18`, padding: '3px 8px', borderRadius: 5 }}>{catCfg.label}</span>
            </div>
            {domain.role && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>Your Role</div>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{domain.role}</span>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}><Stat label="Linked Events" value={linkedEvents.length} color={domain.color} /></div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}><Stat label="Upcoming" value={upcoming.length} color="var(--accent-green)" /></div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}><Stat label="Past" value={past.length} color="var(--text-secondary)" /></div>
      </div>

      {upcoming.length > 0 && (
        <SectionCard>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Upcoming</span>
          </div>
          {upcoming.slice(0, 4).map((ev, i) => <EventRow key={ev.id} event={ev} isLast={i === Math.min(3, upcoming.length - 1)} onClick={() => onOpenEvent(ev)} />)}
        </SectionCard>
      )}
    </div>
  )
}

function DomainEventsTab({ linkedEvents, onOpenEvent }) {
  const upcoming = linkedEvents.filter(e => e.date >= new Date()).sort((a, b) => a.date - b.date)
  const past     = linkedEvents.filter(e => e.date  < new Date()).sort((a, b) => b.date - a.date)
  if (linkedEvents.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        <Calendar size={32} color="var(--border-strong)" style={{ marginBottom: 12 }} />
        <p style={{ margin: 0, fontSize: 14 }}>No events linked to this domain yet.</p>
        <p style={{ margin: '6px 0 0', fontSize: 12 }}>Go to Calendar → Add Event → select this domain.</p>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {upcoming.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Upcoming</div>
          <SectionCard>{upcoming.map((ev, i) => <EventRow key={ev.id} event={ev} isLast={i === upcoming.length - 1} onClick={() => onOpenEvent(ev)} />)}</SectionCard>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Past</div>
          <SectionCard style={{ opacity: 0.7 }}>{past.map((ev, i) => <EventRow key={ev.id} event={ev} isLast={i === past.length - 1} onClick={() => onOpenEvent(ev)} />)}</SectionCard>
        </div>
      )}
    </div>
  )
}

// ─── Edit domain modal ─────────────────────────────────────────────────────────
function EditDomainModal({ domain, onClose, onSave }) {
  const isAcademic = domain.category === 'academic'
  const [form, setForm] = useState({
    name: domain.name || '', code: domain.code || '',
    icon: domain.icon || 'BookOpen', color: domain.color || '#5b8cff',
    description: domain.description || '',
    professor: domain.professor || '', credits: domain.credits ? String(domain.credits) : '',
    semester: domain.semester || '', role: domain.role || '',
  })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const canSave = form.name.trim() && form.code.trim()

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border-strong)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--border-strong)', borderRadius: 16, width: 500, maxWidth: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `${form.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DomainIcon name={form.icon} size={14} color={form.color} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Edit Domain</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Name</div>
              <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} autoFocus
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'} onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Code</div>
              <input style={{ ...inputStyle, textTransform: 'uppercase', fontWeight: 600 }} value={form.code} onChange={e => set('code', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'} onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Icon</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DOMAIN_ICON_GROUPS.map(group => (
                <div key={group.label}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>{group.label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {group.icons.map(name => (
                      <button key={name} onClick={() => set('icon', name)} title={name}
                        style={{ width: 32, height: 32, borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: form.icon === name ? `${form.color}22` : 'var(--bg-overlay)',
                          outline: form.icon === name ? `1.5px solid ${form.color}66` : '1.5px solid transparent', transition: 'all 0.12s' }}
                        onMouseEnter={e => { if (form.icon !== name) e.currentTarget.style.background = 'var(--bg-overlay-hover)' }}
                        onMouseLeave={e => { if (form.icon !== name) e.currentTarget.style.background = 'var(--bg-overlay)' }}>
                        <DomainIcon name={name} size={13} color={form.icon === name ? form.color : 'var(--text-secondary)'} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Colour</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {DOMAIN_COLORS.map(c => (
                <button key={c} onClick={() => set('color', c)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer', background: c,
                  outline: form.color === c ? `2.5px solid ${c}` : '2.5px solid transparent', outlineOffset: 2,
                  transform: form.color === c ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.12s' }} />
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Description (optional)</div>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 64, lineHeight: 1.5 }} value={form.description} onChange={e => set('description', e.target.value)}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'} onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
          </div>

          {isAcademic && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Academic Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Professor</div>
                  <input style={inputStyle} placeholder="Dr. Name" value={form.professor} onChange={e => set('professor', e.target.value)}
                    onFocus={e => e.target.style.borderColor = 'var(--border-focus)'} onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Credits</div>
                  <input style={inputStyle} type="number" placeholder="20" value={form.credits} onChange={e => set('credits', e.target.value)}
                    onFocus={e => e.target.style.borderColor = 'var(--border-focus)'} onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Semester</div>
                <input style={inputStyle} placeholder="Semester 2 · Year 2" value={form.semester} onChange={e => set('semester', e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'var(--border-focus)'} onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
              </div>
            </div>
          )}

          {!isAcademic && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>Your Role (optional)</div>
              <input style={inputStyle} placeholder="e.g. Team Lead, Member, President…" value={form.role} onChange={e => set('role', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'} onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={() => { if (!canSave) return; onSave({ name: form.name.trim(), code: form.code.trim().toUpperCase(), icon: form.icon, color: form.color, colorMuted: `${form.color}18`, description: form.description.trim(), ...(isAcademic ? { professor: form.professor.trim(), credits: parseInt(form.credits) || 0, semester: form.semester.trim() } : { role: form.role.trim() }) }); onClose() }}
            disabled={!canSave} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, background: canSave ? form.color : 'var(--border)', color: canSave ? '#fff' : 'var(--text-muted)', cursor: canSave ? 'pointer' : 'default', transition: 'all 0.15s' }}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function DomainDetailPage({
  domain, domainEvents = [], linkedEvents = [], onBack, eventNotes, onUpdateNote,
  onNewNote, onUpdateDomain, studySessions, notes, weekConfidence, onSetWeekConfidence,
  onOpenNote, assessments = [], onAddAssessment, onUpdateAssessment, onDeleteAssessment,
}) {
  const isAcademic = domain.category === 'academic'
  const TABS = isAcademic
    ? ['Overview', 'Schedule', 'Assessments', 'Study']
    : ['Overview', 'Events']
  const [activeTab,    setActiveTab]    = useState('Overview')
  const [openEvent,    setOpenEvent]    = useState(null)
  const [showEdit,     setShowEdit]     = useState(false)
  const [showLinked, setShowLinked] = useState(() => {
    const stored = localStorage.getItem(`showLinked:${domain.id}`)
    return stored === null ? true : stored === 'true'
  })
  function toggleShowLinked() {
    const next = !showLinked
    setShowLinked(next)
    localStorage.setItem(`showLinked:${domain.id}`, String(next))
  }
  const [showMenu,   setShowMenu]   = useState(false)
  const [menuPos,    setMenuPos]    = useState({ top: 0, left: 0 })
  const menuBtnRef      = useRef()
  const menuDropdownRef = useRef()
  const tabBarRef       = useRef()
  const tabBtnRefs      = useRef({})

  useEffect(() => {
    if (!showMenu) return
    function onDown(e) {
      if (
        !menuBtnRef.current?.contains(e.target) &&
        !menuDropdownRef.current?.contains(e.target)
      ) setShowMenu(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showMenu])

  function openContextMenu() {
    const r = menuBtnRef.current.getBoundingClientRect()
    setMenuPos({ top: r.bottom + 4, left: r.right })
    setShowMenu(true)
  }
  const [pillStyle, setPillStyle] = useState({ width: 0, left: 0, ready: false })

  useLayoutEffect(() => {
    const btn = tabBtnRefs.current[activeTab]
    const bar = tabBarRef.current
    if (!btn || !bar) return
    const bRect = btn.getBoundingClientRect()
    const cRect = bar.getBoundingClientRect()
    setPillStyle(prev => ({ width: bRect.width, left: bRect.left - cRect.left, ready: prev.ready || true }))
  }, [activeTab])

  const _today = new Date()
  const _schedEvs = domainEvents.filter(e => e.type !== 'exam' && e.type !== 'assignment')
  const calculatedProgress = _schedEvs.length > 0
    ? Math.round(_schedEvs.filter(e => e.date < _today).length / _schedEvs.length * 100)
    : 0

  const catCfg = DOMAIN_CATEGORIES[domain.category] || DOMAIN_CATEGORIES.other

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, padding: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
          <ArrowLeft size={15} /> Back to Domains
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={toggleShowLinked}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border-strong)', background: showLinked ? 'none' : 'var(--bg-overlay)', color: showLinked ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-purple)'; e.currentTarget.style.color = 'var(--accent-purple)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = showLinked ? 'var(--text-secondary)' : 'var(--text-muted)' }}
          >
            {showLinked ? <EyeOff size={13} /> : <Eye size={13} />}
            {showLinked ? 'Hide sessions & notes' : 'Show sessions & notes'}
          </button>
          <button onClick={() => setShowEdit(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = domain.color; e.currentTarget.style.color = domain.color }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
            <Pencil size={13} /> Edit Domain
          </button>
        </div>
      </div>

      {showEdit && (
        <EditDomainModal domain={domain} onClose={() => setShowEdit(false)}
          onSave={updates => { onUpdateDomain?.(domain.id, updates); setShowEdit(false) }} />
      )}

      {/* Domain header */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '26px 30px', marginBottom: 22, position: 'relative', overflow: 'hidden' }}>
        {/* 3-dot menu */}
        <button
          ref={menuBtnRef}
          onClick={openContextMenu}
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 2,
            width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)',
            background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <MoreVertical size={14} />
        </button>

        {showMenu && (
          <div
            ref={menuDropdownRef}
            style={{
              position: 'fixed', top: menuPos.top, left: menuPos.left, transform: 'translateX(-100%)',
              zIndex: 9999, background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
              borderRadius: 9, boxShadow: 'var(--shadow-modal)', overflow: 'hidden', minWidth: 190,
            }}
          >
            <button
              onClick={() => { onUpdateDomain?.(domain.id, { isPast: !domain.isPast }); setShowMenu(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: domain.isPast ? 'var(--accent-green)' : 'var(--text-secondary)',
                textAlign: 'left', fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              {domain.isPast ? <RotateCcw size={13} /> : <Archive size={13} />}
              {domain.isPast ? 'Mark as active' : 'Mark as past module'}
            </button>
            <div style={{ height: 1, background: 'var(--border)', margin: '0 10px' }} />
            <button
              onClick={() => { onUpdateDomain?.(domain.id, { excludeFromGrade: !domain.excludeFromGrade }); setShowMenu(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--text-secondary)',
                textAlign: 'left', fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <BarChart2 size={13} />
              {domain.excludeFromGrade ? 'Include in grade avg' : 'Exclude from grade avg'}
            </button>
          </div>
        )}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: domain.color, borderRadius: '16px 0 0 16px' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 0% 50%, ${domain.color}07 0%, transparent 60%)`, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', color: domain.color, background: domain.colorMuted || `${domain.color}18`, padding: '4px 10px', borderRadius: 6 }}>{domain.code}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: catCfg.color, background: `${catCfg.color}18`, padding: '4px 10px', borderRadius: 6 }}>{catCfg.label}</span>
              {domain.icon && <DomainIcon name={domain.icon} size={16} color={domain.color} />}
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>{domain.name}</h1>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 520 }}>{domain.description}</p>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {domain.professor && <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}><User size={13} color="var(--text-muted)" />{domain.professor}</span>}
              {domain.credits   && <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}><Award size={13} color="var(--text-muted)" />{domain.credits} credits</span>}
              {domain.semester  && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{domain.semester}</span>}
              {domain.role      && <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}><Tag size={13} color="var(--text-muted)" />{domain.role}</span>}
              {!isAcademic && <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}><ExternalLink size={13} color="var(--text-muted)" />{linkedEvents.length} linked event{linkedEvents.length !== 1 ? 's' : ''}</span>}
            </div>

          </div>

          {isAcademic && (
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: `conic-gradient(${domain.color} ${calculatedProgress * 3.6}deg, var(--progress-track) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: domain.color }}>{calculatedProgress}%</span>
                </div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Progress</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div data-tutorial-id="domain-detail-tabs" ref={tabBarRef} style={{ position: 'relative', display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
        <div style={{
          position: 'absolute', top: 4, height: 'calc(100% - 8px)',
          left: pillStyle.left, width: pillStyle.width,
          background: 'var(--nav-active)', borderRadius: 7,
          transition: pillStyle.ready ? 'left 0.28s cubic-bezier(0.32, 0.72, 0, 1), width 0.28s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
          pointerEvents: 'none',
        }} />
        {TABS.map(tab => (
          <button
            key={tab}
            ref={el => { if (el) tabBtnRefs.current[tab] = el; else delete tabBtnRefs.current[tab] }}
            onClick={() => setActiveTab(tab)}
            {...(tab === 'Assessments' ? { 'data-tutorial-id': 'assessments-tab-btn' } : {})}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
              background: 'transparent',
              color: activeTab === tab ? domain.color : 'var(--text-secondary)',
              transition: 'color 0.2s ease, font-weight 0.2s ease',
              position: 'relative', zIndex: 1,
            }}
            onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.color = 'var(--text-bright)' }}
            onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.color = 'var(--text-secondary)' }}>
            {tab}
          </button>
        ))}
      </div>

      {isAcademic ? (
        <>
          {activeTab === 'Overview'    && <OverviewTab    domain={domain} domainEvents={domainEvents} assessments={assessments} calculatedProgress={calculatedProgress} />}
          {activeTab === 'Schedule'    && <ScheduleTab    domain={domain} domainEvents={domainEvents} onNewNote={onNewNote} notes={notes} eventNotes={eventNotes} showContent={showLinked} />}
          {activeTab === 'Assessments' && <AssessmentsTab domain={domain} assessments={assessments} onAddAssessment={onAddAssessment} onUpdateAssessment={onUpdateAssessment} onDeleteAssessment={onDeleteAssessment} />}
          {activeTab === 'Study'       && <StudyTab       domain={domain} studySessions={studySessions} notes={notes} weekConfidence={weekConfidence} onSetWeekConfidence={onSetWeekConfidence} onNewNote={onNewNote} onOpenNote={onOpenNote} showContent={showLinked} />}
        </>
      ) : (
        <>
          {activeTab === 'Overview' && <GeneralOverviewTab domain={domain} linkedEvents={linkedEvents} onOpenEvent={setOpenEvent} />}
          {activeTab === 'Events'   && <DomainEventsTab linkedEvents={linkedEvents} onOpenEvent={setOpenEvent} />}
        </>
      )}

      {openEvent && (
        <EventDetailModal event={openEvent} onClose={() => setOpenEvent(null)}
          note={eventNotes?.[openEvent.id] || ''} onUpdateNote={onUpdateNote} />
      )}
    </div>
  )
}
