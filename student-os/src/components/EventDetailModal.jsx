import {
  X, Calendar, Clock, MapPin, BookOpen, FlaskConical, FileCheck,
  GraduationCap, Tag, AlignLeft, ExternalLink, StickyNote, AlertTriangle,
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

export default function EventDetailModal({ event, onClose, onViewDomain, note, onUpdateNote }) {
  if (!event) return null
  const typeColor = resolveTypeColor(event)
  const typeLabel = resolveTypeLabel(event)
  const d = event.details || {}

  // Auto-calculate academic week from date (only for domain-linked events)
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
          background: '#14151e', border: '1px solid #2a2c40', borderRadius: 16,
          width: 460, maxWidth: '90vw', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #1e2030', borderTop: `3px solid ${typeColor}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
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
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#e6e7f0', lineHeight: 1.4 }}>{event.title}</h2>
            {event.domainName && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7c7e96' }}>{event.domainName}</p>}
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#1e2030', color: '#7c7e96', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={14} color="#4a4c60" />
              <span style={{ fontSize: 13, color: '#7c7e96' }}>
                {event.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {event.type === 'lecture' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(calcBreak || calcWeek != null) && (
                  <Row label="Week" value={calcBreak ? calcBreak.name : `Week ${calcWeek}`} />
                )}
                <Row label="Status" value={<StatusBadge status={d.status} />} />
                {d.hasNotes && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StickyNote size={13} color="#5b8cff" />
                    <span style={{ fontSize: 12, color: '#5b8cff' }}>Slides / materials available</span>
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
                <div style={{ background: '#0f1018', borderRadius: 10, padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Stat label="Weight" value={`${d.weight}%`} color="#fbbf24" />
                  <Stat label="Status" value={<StatusBadge status={d.status} />} />
                  {d.grade != null && <Stat label="Grade" value={`${d.grade}%`} color={d.grade >= 70 ? '#34d399' : '#fb7185'} />}
                </div>
                {(d.status === 'upcoming' || d.status === 'submitted') && (
                  <div style={{ fontSize: 12, color: '#7c7e96', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 8, padding: '8px 12px' }}>
                    <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4 }} />Due {event.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
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

            {!['lecture', 'lab', 'assignment', 'exam'].includes(event.type) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {d.time  && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={13} color="#4a4c60" /><span style={{ fontSize: 13, color: '#7c7e96' }}>{d.time}</span></div>}
                {d.notes && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><AlignLeft size={13} color="#4a4c60" style={{ marginTop: 2, flexShrink: 0 }} /><span style={{ fontSize: 13, color: '#7c7e96', lineHeight: 1.5 }}>{d.notes}</span></div>}
              </div>
            )}

            {/* Notes editor — always visible */}
            <div style={{ borderTop: '1px solid #1e2030', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StickyNote size={12} color="#a78bfa" />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</span>
                {note?.trim() && <span style={{ fontSize: 10, color: '#4a4c60', marginLeft: 'auto' }}>{note.length} chars</span>}
              </div>
              <textarea
                value={note || ''}
                onChange={e => onUpdateNote?.(event.id, e.target.value)}
                placeholder="Write your notes here… (auto-saved)"
                style={{
                  width: '100%', minHeight: 110, padding: '10px 12px',
                  borderRadius: 8, border: '1px solid #2a2c40',
                  background: '#0a0b11', color: '#e6e7f0',
                  fontSize: 13, lineHeight: 1.7, resize: 'vertical',
                  fontFamily: 'inherit', outline: 'none',
                  boxSizing: 'border-box', transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#a78bfa55'}
                onBlur={e => e.target.style.borderColor = '#2a2c40'}
              />
            </div>
          </div>
        </div>

        {/* Footer — "View in Domains" cross-link */}
        {onViewDomain && event.domainId && (
          <div style={{ padding: '12px 22px', borderTop: '1px solid #1e2030', flexShrink: 0 }}>
            <button
              onClick={() => { onViewDomain(event.domainId); onClose() }}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: '1px solid #2a2c40', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: '#7c7e96', fontSize: 13, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#5b8cff'; e.currentTarget.style.color = '#5b8cff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2c40'; e.currentTarget.style.color = '#7c7e96' }}
            >
              <ExternalLink size={13} /> View in Domains
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
