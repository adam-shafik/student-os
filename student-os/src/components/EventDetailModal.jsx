import { useState } from 'react'
import {
  X, Calendar, Clock, MapPin, BookOpen, FlaskConical, FileCheck,
  GraduationCap, Tag, AlignLeft, ExternalLink, StickyNote, AlertTriangle, Trash2,
} from 'lucide-react'
import { resolveTypeLabel, resolveTypeColor } from '../utils/calendarEvents'
import { getAcademicWeek, getBreakForDate } from '../utils/semester'

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
function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 52, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}
function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

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

export default function EventDetailModal({ event, onClose, onViewDomain, note, onUpdateNote, onDelete, onUpdateReminder, isTutorial = false }) {
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [reminderDays,   setReminderDays]   = useState(event?.reminderDays || [])

  const toggleReminder = (d) => {
    const next = reminderDays.includes(d) ? reminderDays.filter(x => x !== d) : [...reminderDays, d]
    setReminderDays(next)
    onUpdateReminder?.(next)
  }
  if (!event) return null
  const typeColor = resolveTypeColor(event)
  const typeLabel = resolveTypeLabel(event)
  const d = event.details || {}

  const calcWeek  = event.domainId ? getAcademicWeek(event.date) : null
  const calcBreak = event.domainId ? getBreakForDate(event.date)  : null

  const typeIcons = { lecture: BookOpen, lab: FlaskConical, assignment: FileCheck, exam: GraduationCap }
  const TypeIcon  = typeIcons[event.type] || Tag

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--border-strong)',
          borderRadius: 16,
          width: 460, maxWidth: '90vw', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-modal)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', borderTop: `3px solid ${typeColor}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `${typeColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TypeIcon size={14} color={typeColor} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: typeColor, background: `${typeColor}18`, padding: '3px 8px', borderRadius: 5, letterSpacing: '0.4px' }}>
                {typeLabel.toUpperCase()}
              </span>
              {event.domainCode && event.domainColor && (
                <span style={{ fontSize: 11, fontWeight: 600, color: event.domainColor, background: `${event.domainColor}18`, padding: '3px 8px', borderRadius: 5 }}>
                  {event.domainCode}
                </span>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{event.title}</h2>
            {event.domainName && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{event.domainName}</p>}
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={14} color="var(--text-muted)" />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {event.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {d.time && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={14} color="var(--text-muted)" />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {fmtTime(d.time)}{d.duration ? ` · ${fmtDuration(d.duration)}` : ''}
                </span>
              </div>
            )}

            {event.type === 'lecture' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(calcBreak || calcWeek != null) && (
                  <Row label="Week" value={calcBreak ? calcBreak.name : `Week ${calcWeek}`} />
                )}
                <Row label="Status" value={<StatusBadge status={d.status} />} />
                {d.hasNotes && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StickyNote size={13} color="var(--accent-blue)" />
                    <span style={{ fontSize: 12, color: 'var(--accent-blue)' }}>Slides / materials available</span>
                  </div>
                )}
              </div>
            )}

            {event.type === 'lab' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(calcBreak || calcWeek != null) && (
                  <Row label="Week" value={calcBreak ? calcBreak.name : `Week ${calcWeek}`} />
                )}
                <Row label="Status" value={<StatusBadge status={d.status} />} />
              </div>
            )}

            {event.type === 'assignment' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Stat label="Weight" value={`${d.weight}%`} color="var(--accent-amber)" />
                  <Stat label="Status" value={<StatusBadge status={d.status} />} />
                  {d.grade != null && <Stat label="Grade" value={`${d.grade}%`} color={d.grade >= 70 ? 'var(--accent-green)' : 'var(--accent-red)'} />}
                </div>
                {(d.status === 'upcoming' || d.status === 'submitted') && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 8, padding: '8px 12px' }}>
                    <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4 }} />Due {event.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {d.status === 'upcoming' ? ' — not yet submitted' : ' — awaiting mark'}
                  </div>
                )}
              </div>
            )}

            {event.type === 'exam' && (
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {d.time     && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock  size={13} color="var(--text-muted)" /><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{d.time}</span></div>}
                {d.location && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={13} color="var(--text-muted)" /><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{d.location}</span></div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Worth</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-red)' }}>{d.weight}%</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>of final grade</span>
                </div>
              </div>
            )}

            {!['lecture', 'lab', 'assignment', 'exam'].includes(event.type) && d.notes && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <AlignLeft size={13} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{d.notes}</span>
              </div>
            )}

            {/* Reminder — only for custom events */}
            {onUpdateReminder && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Remind me</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[{ d: 0, label: 'Day of' }, { d: 1, label: '1 day before' }, { d: 3, label: '3 days before' }].map(({ d, label }) => {
                    const on = reminderDays.includes(d)
                    return (
                      <button key={d} onClick={() => toggleReminder(d)} style={{
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
            )}

            {/* Notes editor */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StickyNote size={12} color="var(--accent-purple)" />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</span>
                {note?.trim() && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{note.length} chars</span>}
              </div>
              <textarea
                value={note || ''}
                onChange={e => onUpdateNote?.(event.id, e.target.value)}
                placeholder="Write your notes here… (auto-saved)"
                style={{
                  width: '100%', minHeight: 110, padding: '10px 12px',
                  borderRadius: 8, border: '1px solid var(--border-strong)',
                  background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                  fontSize: 13, lineHeight: 1.7, resize: 'vertical',
                  fontFamily: 'inherit', outline: 'none',
                  boxSizing: 'border-box', transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        {(onDelete || (onViewDomain && event.domainId)) && (
          <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {onDelete ? (
              confirmDelete ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDelete(false)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  <button onClick={onDelete} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Trash2 size={13} /> Confirm Delete
                  </button>
                </div>
              ) : (
                <button
                  onClick={isTutorial ? undefined : () => setConfirmDelete(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)', borderRadius: 8, padding: '8px 14px', cursor: isTutorial ? 'not-allowed' : 'pointer', color: '#fb7185', fontSize: 13, transition: 'all 0.15s', opacity: isTutorial ? 0.4 : 1 }}
                  onMouseEnter={e => { if (!isTutorial) { e.currentTarget.style.background = 'rgba(251,113,133,0.16)'; e.currentTarget.style.borderColor = 'rgba(251,113,133,0.4)' } }}
                  onMouseLeave={e => { if (!isTutorial) { e.currentTarget.style.background = 'rgba(251,113,133,0.08)'; e.currentTarget.style.borderColor = 'rgba(251,113,133,0.2)' } }}
                >
                  <Trash2 size={13} /> Delete event
                </button>
              )
            ) : <div />}
            {onViewDomain && event.domainId && (
              <button
                onClick={isTutorial ? undefined : () => { onViewDomain(event.domainId); onClose() }}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 14px', cursor: isTutorial ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)', fontSize: 13, transition: 'all 0.15s', opacity: isTutorial ? 0.4 : 1 }}
                onMouseEnter={e => { if (!isTutorial) { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)' } }}
                onMouseLeave={e => { if (!isTutorial) { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
              >
                <ExternalLink size={13} /> View in Domains
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
