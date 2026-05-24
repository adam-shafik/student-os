import { useState } from 'react'
import {
  ArrowLeft, User, Award, BookOpen, FileText, FlaskConical,
  GraduationCap, CheckCircle2, Clock, Circle, ChevronDown,
  ChevronRight, StickyNote, Calendar, MapPin, TrendingUp,
  AlertCircle, ExternalLink, Tag, PenLine,
} from 'lucide-react'
import { DOMAIN_CATEGORIES } from '../data/domains'
import {
  GitBranch, Database, Code2, Globe, Server, Brain, Monitor, Zap, Users as UsersIcon, FileText as FileTextIcon,
  Cpu, Network, Layers, Shield, Terminal, BarChart2, Wrench, Microscope, Rocket, Star, Building2, Briefcase,
} from 'lucide-react'

const ICON_COMPONENT_MAP = {
  GitBranch, Database, Code2, Globe, Server, Brain, Monitor, Zap, Users: UsersIcon, FileText: FileTextIcon,
  Cpu, Network, Layers, Shield, Terminal, BarChart2, BookOpen, Wrench, Microscope, FlaskConical, Rocket, Star, Building2, Briefcase,
}
function DomainIcon({ name, size = 16, color }) {
  const Icon = ICON_COMPONENT_MAP[name]
  if (!Icon) return null
  return <Icon size={size} color={color} />
}

import { resolveTypeLabel, resolveTypeColor, parseSubjectDate } from '../utils/calendarEvents'
import { totalTeachingWeeks } from '../utils/semester'
import EventDetailModal from '../components/EventDetailModal'

const TOTAL_WEEKS = totalTeachingWeeks()
const CONF_LEVELS = [
  { key: 'not_started', label: 'Not Started', color: '#4a4c60', bg: 'rgba(74,76,96,0.15)'   },
  { key: 'reviewed',    label: 'Reviewed',    color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { key: 'confident',   label: 'Confident',   color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
]

function lectureEvent(domain, lecture, idx) {
  return {
    id: `${domain.id}-lecture-w${lecture.week}-${idx}`,
    type: 'lecture', title: lecture.title,
    date: parseSubjectDate(lecture.date),
    domainId: domain.id, domainCode: domain.code,
    domainName: domain.name, domainColor: domain.color,
    details: { week: lecture.week, status: lecture.status, hasNotes: lecture.hasNotes },
  }
}
function labEvent(domain, lab) {
  return {
    id: `${domain.id}-${lab.id}`, type: 'lab', title: lab.title,
    date: parseSubjectDate(lab.date),
    domainId: domain.id, domainCode: domain.code,
    domainName: domain.name, domainColor: domain.color,
    details: { week: lab.week, status: lab.status },
  }
}
function assignmentEvent(domain, assignment) {
  return {
    id: `${domain.id}-${assignment.id}`, type: 'assignment', title: assignment.title,
    date: parseSubjectDate(assignment.dueDate),
    domainId: domain.id, domainCode: domain.code,
    domainName: domain.name, domainColor: domain.color,
    details: { weight: assignment.weight, status: assignment.status, grade: assignment.grade },
  }
}
function examEvent(domain, exam) {
  return {
    id: `${domain.id}-${exam.id}`, type: 'exam', title: exam.title,
    date: parseSubjectDate(exam.date),
    domainId: domain.id, domainCode: domain.code,
    domainName: domain.name, domainColor: domain.color,
    details: { time: exam.time, location: exam.location, weight: exam.weight, status: exam.status },
  }
}

// ─── Shared helpers ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  completed:     { label: 'Completed',   color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  'in-progress': { label: 'In Progress', color: '#5b8cff', bg: 'rgba(91,140,255,0.12)'  },
  upcoming:      { label: 'Upcoming',    color: '#7c7e96', bg: 'rgba(74,76,96,0.15)'     },
  submitted:     { label: 'Submitted',   color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  graded:        { label: 'Graded',      color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
}
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.upcoming
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
}
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

function ClickableRow({ onClick, children, style }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer', background: hovered ? 'var(--row-hover)' : 'transparent', transition: 'background 0.12s', ...style }}
    >
      {children}
    </div>
  )
}

// ─── Academic tabs ─────────────────────────────────────────────────────────────
function OverviewTab({ domain, onOpenEvent }) {
  const completedLectures = (domain.lectures  || []).filter(l => l.status === 'completed').length
  const completedLabs     = (domain.labs      || []).filter(l => l.status === 'completed').length
  const gradedAssignments = (domain.assignments || []).filter(a => a.grade !== null)
  const avgGrade = gradedAssignments.length
    ? Math.round(gradedAssignments.reduce((s, a) => s + a.grade, 0) / gradedAssignments.length)
    : null
  const upcoming = [
    ...(domain.assignments || []).filter(a => a.status === 'upcoming').map(a => ({ type: 'Assignment', title: a.title, date: a.dueDate, color: 'var(--accent-amber)', ev: assignmentEvent(domain, a) })),
    ...(domain.exams       || []).filter(e => e.status === 'upcoming').map(e => ({ type: 'Exam',       title: e.title, date: e.date,    color: 'var(--accent-red)',   ev: examEvent(domain, e) })),
    ...(domain.labs        || []).filter(l => l.status === 'upcoming').map(l => ({ type: 'Lab',        title: l.title, date: l.date,    color: 'var(--accent-purple)', ev: labEvent(domain, l) })),
  ].slice(0, 4)
  const nextLecture = (domain.lectures || []).find(l => l.status === 'in-progress' || l.status === 'upcoming')
  const nextLectureIdx = nextLecture ? (domain.lectures || []).indexOf(nextLecture) : -1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Lectures Done', value: `${completedLectures}/${(domain.lectures||[]).length}`, icon: BookOpen,    color: 'var(--accent-blue)'   },
          { label: 'Labs Done',     value: `${completedLabs}/${(domain.labs||[]).length}`,         icon: FlaskConical, color: 'var(--accent-purple)' },
          { label: 'Avg Grade',     value: avgGrade ? `${avgGrade}%` : '—',                        icon: TrendingUp,   color: 'var(--accent-green)'  },
          { label: 'Pending Tasks', value: (domain.assignments||[]).filter(a => a.status === 'upcoming').length, icon: AlertCircle, color: 'var(--accent-amber)' },
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
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Upcoming Deadlines</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {upcoming.length === 0
              ? <p style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No upcoming deadlines</p>
              : upcoming.map((item, i) => (
                <ClickableRow key={i} onClick={() => onOpenEvent(item.ev)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < upcoming.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.type} · {item.date}</div>
                  </div>
                </ClickableRow>
              ))}
          </div>
        </SectionCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {nextLecture && (
            <SectionCard>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Next Lecture</span>
              </div>
              <ClickableRow onClick={() => onOpenEvent(lectureEvent(domain, nextLecture, nextLectureIdx))} style={{ padding: '14px 20px' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{nextLecture.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Week {nextLecture.week} · {nextLecture.date}</div>
              </ClickableRow>
            </SectionCard>
          )}
          <SectionCard>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Module Progress</span>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Overall completion</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: domain.color }}>{domain.progress}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--progress-track)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${domain.progress}%`, borderRadius: 3,
                  background: `var(--progress-gradient, ${domain.color})`,
                  backgroundSize: '200% 100%',
                  animation: 'var(--progress-anim)',
                }} />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

function LecturesTab({ domain, onOpenEvent, eventNotes, onNewNote }) {
  const [openWeeks, setOpenWeeks] = useState(() => {
    const o = {}
    ;(domain.lectures || []).forEach(l => { o[l.week] = true })
    return o
  })
  const byWeek = (domain.lectures || []).reduce((acc, l, i) => {
    if (!acc[l.week]) acc[l.week] = []
    acc[l.week].push({ ...l, _idx: i })
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Object.entries(byWeek).map(([week, lectures]) => {
        const isOpen    = openWeeks[week]
        const allDone   = lectures.every(l => l.status === 'completed')
        const hasActive = lectures.some(l => l.status === 'in-progress')
        const wColor    = allDone ? 'var(--accent-green)' : hasActive ? 'var(--accent-blue)' : 'var(--text-muted)'
        const wColorHex = allDone ? '#34d399' : hasActive ? '#5b8cff' : '#4a4c60'
        return (
          <SectionCard key={week}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button onClick={() => setOpenWeeks(prev => ({ ...prev, [week]: !prev[week] }))} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${wColorHex}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: wColor }}>W{week}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Week {week}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {lectures.length} lecture{lectures.length > 1 ? 's' : ''}
                    {allDone ? <span style={{ color: 'var(--accent-green)' }}> · Done</span> : hasActive ? <span style={{ color: 'var(--accent-blue)' }}> · In Progress</span> : ''}
                  </span>
                </div>
                {isOpen ? <ChevronDown size={15} color="var(--text-muted)" /> : <ChevronRight size={15} color="var(--text-muted)" />}
              </button>
              {onNewNote && (
                <button
                  onClick={e => { e.stopPropagation(); onNewNote({ domainId: domain.id, academicWeek: Number(week) }) }}
                  title="New handwritten note for this week"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '0 14px', padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-purple)'; e.currentTarget.style.borderColor = 'var(--accent-purple)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <PenLine size={12} /> Note
                </button>
              )}
            </div>
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {lectures.map((l, i) => {
                  const ev = lectureEvent(domain, l, l._idx)
                  const hasNote = !!eventNotes?.[ev.id]?.trim()
                  return (
                    <ClickableRow key={i} onClick={() => onOpenEvent(ev)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: i < lectures.length - 1 ? '1px solid var(--border)' : 'none', opacity: l.status === 'upcoming' ? 0.6 : 1 }}>
                      {l.status === 'completed' ? <CheckCircle2 size={14} color="var(--accent-green)" /> : l.status === 'in-progress' ? <Clock size={14} color="var(--accent-blue)" /> : <Circle size={14} color="var(--text-muted)" />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{l.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{l.date}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {hasNote && (
                          <span title="Has notes" style={{ fontSize: 10, color: 'var(--accent-purple)', background: 'rgba(167,139,250,0.12)', padding: '2px 7px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <StickyNote size={9} /> Notes
                          </span>
                        )}
                        {l.hasNotes && !hasNote && (
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--border)', padding: '3px 7px', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <FileText size={10} /> Materials
                          </div>
                        )}
                        <StatusBadge status={l.status} />
                      </div>
                    </ClickableRow>
                  )
                })}
              </div>
            )}
          </SectionCard>
        )
      })}
    </div>
  )
}

function AssignmentsTab({ domain, onOpenEvent, eventNotes }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {(domain.assignments || []).map(a => {
        const ev = assignmentEvent(domain, a)
        const hasNote = !!eventNotes?.[ev.id]?.trim()
        const barColor = a.status === 'graded' ? 'var(--accent-green)' : a.status === 'submitted' ? 'var(--accent-amber)' : 'var(--text-muted)'
        const barHex   = a.status === 'graded' ? '#34d399' : a.status === 'submitted' ? '#fbbf24' : '#4a4c60'
        return (
          <SectionCard key={a.id}>
            <ClickableRow onClick={() => onOpenEvent(ev)} style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 3, height: 44, borderRadius: 2, flexShrink: 0, background: barHex }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{a.title}</div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} />Due {a.dueDate}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Weight: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{a.weight}%</span></span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {hasNote && (
                  <span title="Has notes" style={{ fontSize: 10, color: 'var(--accent-purple)', background: 'rgba(167,139,250,0.12)', padding: '3px 7px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <StickyNote size={9} /> Notes
                  </span>
                )}
                {a.grade !== null && (
                  <div style={{ background: a.grade >= 70 ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)', color: a.grade >= 70 ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 16, fontWeight: 700, padding: '6px 14px', borderRadius: 8 }}>
                    {a.grade}%
                  </div>
                )}
                <StatusBadge status={a.status} />
              </div>
            </ClickableRow>
          </SectionCard>
        )
      })}
    </div>
  )
}

function LabsTab({ domain, onOpenEvent, eventNotes, onNewNote, notes, onOpenNote }) {
  const [openWeeks, setOpenWeeks] = useState(() => {
    const o = {}
    ;(domain.labs || []).forEach(l => { o[l.week] = true })
    return o
  })
  const byWeek = (domain.labs || []).reduce((acc, lab) => {
    if (!acc[lab.week]) acc[lab.week] = []
    acc[lab.week].push(lab)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Object.entries(byWeek).sort(([a], [b]) => Number(a) - Number(b)).map(([week, labs]) => {
        const isOpen    = openWeeks[week]
        const allDone   = labs.every(l => l.status === 'completed')
        const hasActive = labs.some(l  => l.status === 'in-progress')
        const wColor    = allDone ? 'var(--accent-green)' : hasActive ? 'var(--accent-blue)' : 'var(--text-muted)'
        const wColorHex = allDone ? '#34d399' : hasActive ? '#5b8cff' : '#4a4c60'
        return (
          <SectionCard key={week}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => setOpenWeeks(prev => ({ ...prev, [week]: !prev[week] }))}
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${wColorHex}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: wColor }}>W{week}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Week {week}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {labs.length} lab{labs.length > 1 ? 's' : ''}
                    {allDone ? <span style={{ color: 'var(--accent-green)' }}> · Done</span> : hasActive ? <span style={{ color: 'var(--accent-blue)' }}> · In Progress</span> : ''}
                  </span>
                </div>
                {isOpen ? <ChevronDown size={15} color="var(--text-muted)" /> : <ChevronRight size={15} color="var(--text-muted)" />}
              </button>
              {onNewNote && (
                <button
                  onClick={e => { e.stopPropagation(); onNewNote({ domainId: domain.id, academicWeek: Number(week) }) }}
                  title="New note for this week's labs"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '0 14px', padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-purple)'; e.currentTarget.style.borderColor = 'var(--accent-purple)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <PenLine size={12} /> Note
                </button>
              )}
            </div>
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {labs.map((lab, i) => {
                  const ev           = labEvent(domain, lab)
                  const labNotes     = (notes || []).filter(n => n.eventId === ev.id)
                  const hasEventNote = !!eventNotes?.[ev.id]?.trim()
                  const iconBg    = lab.status === 'completed' ? 'rgba(52,211,153,0.1)' : lab.status === 'in-progress' ? 'rgba(91,140,255,0.1)' : 'var(--bg-overlay)'
                  const iconColor = lab.status === 'completed' ? 'var(--accent-green)' : lab.status === 'in-progress' ? 'var(--accent-blue)' : 'var(--text-muted)'
                  return (
                    <div key={lab.id} style={{ borderBottom: i < labs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <ClickableRow onClick={() => onOpenEvent(ev)} style={{ padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FlaskConical size={15} color={iconColor} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{lab.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={10} />{lab.date}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {labNotes.map(n => (
                            <button
                              key={n.id}
                              onClick={e => { e.stopPropagation(); onOpenNote?.(n.id) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.08)', color: 'var(--accent-purple)', cursor: 'pointer', fontSize: 10 }}
                            >
                              <PenLine size={9} />{n.title || 'Note'}
                            </button>
                          ))}
                          {hasEventNote && (
                            <span style={{ fontSize: 10, color: 'var(--accent-purple)', background: 'rgba(167,139,250,0.12)', padding: '2px 7px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <StickyNote size={9} /> Notes
                            </span>
                          )}
                          {onNewNote && (
                            <button
                              onClick={e => { e.stopPropagation(); onNewNote({ domainId: domain.id, academicWeek: lab.week, eventId: ev.id }) }}
                              title="New handwritten note for this lab"
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 10 }}
                              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-purple)'; e.currentTarget.style.borderColor = 'var(--accent-purple)' }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                            >
                              <PenLine size={9} /> Note
                            </button>
                          )}
                          <StatusBadge status={lab.status} />
                        </div>
                      </ClickableRow>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        )
      })}
    </div>
  )
}

function StudyTab({ domain, studySessions, notes, weekConfidence, onSetWeekConfidence, onNewNote, onOpenNote }) {
  const [openWeeks, setOpenWeeks] = useState({})
  const domainConf = (weekConfidence || {})[domain.id] || {}

  function cycleConf(week, e) {
    e.stopPropagation()
    const current = domainConf[week] || 'not_started'
    const idx = CONF_LEVELS.findIndex(l => l.key === current)
    const next = CONF_LEVELS[(idx + 1) % CONF_LEVELS.length].key
    onSetWeekConfidence?.(domain.id, week, next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(week => {
        const sessions  = (studySessions || []).filter(s => s.domainId === domain.id && s.academicWeek === week)
        const weekNotes = (notes || []).filter(n => n.domainId === domain.id && n.academicWeek === week && !n.studySessionId)
        const conf      = domainConf[week] || 'not_started'
        const confCfg   = CONF_LEVELS.find(l => l.key === conf) || CONF_LEVELS[0]
        const hasData   = sessions.length > 0 || weekNotes.length > 0
        const isOpen    = openWeeks[week]
        return (
          <SectionCard key={week}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${confCfg.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: confCfg.color }}>W{week}</span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Week {week}</span>
                {hasData && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {[
                      sessions.length  > 0 && `${sessions.length} session${sessions.length > 1 ? 's' : ''}`,
                      weekNotes.length > 0 && `${weekNotes.length} note${weekNotes.length > 1 ? 's' : ''}`,
                    ].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
              {onNewNote && (
                <button
                  onClick={e => { e.stopPropagation(); onNewNote({ domainId: domain.id, academicWeek: week }) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-purple)'; e.currentTarget.style.borderColor = 'var(--accent-purple)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <PenLine size={11} /> Note
                </button>
              )}
              <button
                onClick={e => cycleConf(week, e)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: `1px solid ${confCfg.color}40`, background: confCfg.bg, color: confCfg.color, cursor: 'pointer', fontSize: 11, fontWeight: 600, flexShrink: 0, transition: 'all 0.12s' }}
              >
                {confCfg.label}
              </button>
              {hasData && (
                <button
                  onClick={() => setOpenWeeks(prev => ({ ...prev, [week]: !prev[week] }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4, borderRadius: 5, flexShrink: 0 }}
                >
                  {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
              )}
            </div>
            {isOpen && hasData && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {sessions.map((s, i) => {
                  const isLast    = i === sessions.length - 1 && weekNotes.length === 0
                  const sColor    = s.status === 'completed' ? '#34d399' : '#fbbf24'
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
                          <button
                            onClick={() => onOpenNote(s.noteId)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.08)', color: 'var(--accent-purple)', cursor: 'pointer', fontSize: 10 }}
                          >
                            <PenLine size={9} /> Open Note
                          </button>
                        )}
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: `${sColor}18`, color: sColor }}>{s.status}</span>
                      </div>
                    </div>
                  )
                })}
                {weekNotes.map((note, i) => (
                  <div
                    key={note.id}
                    onClick={() => onOpenNote?.(note.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: i < weekNotes.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                  >
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
              </div>
            )}
          </SectionCard>
        )
      })}
    </div>
  )
}

function ExamsTab({ domain, onOpenEvent, eventNotes }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(domain.exams || []).map(exam => {
        const ev = examEvent(domain, exam)
        const hasNote = !!eventNotes?.[ev.id]?.trim()
        return (
          <SectionCard key={exam.id}>
            <ClickableRow onClick={() => onOpenEvent(ev)} style={{ padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <GraduationCap size={16} color={domain.color} />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{exam.title}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <StatusBadge status={exam.status} />
                    {hasNote && (
                      <span style={{ fontSize: 10, color: 'var(--accent-purple)', background: 'rgba(167,139,250,0.12)', padding: '3px 7px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <StickyNote size={9} /> Notes
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ background: `${domain.color}18`, color: domain.color, fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 8 }}>{exam.weight}% of grade</div>
              </div>
              <div style={{ display: 'flex', gap: 22, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Calendar size={13} color="var(--text-muted)" /><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{exam.date}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Clock   size={13} color="var(--text-muted)" /><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{exam.time}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><MapPin  size={13} color="var(--text-muted)" /><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{exam.location}</span></div>
              </div>
            </ClickableRow>
          </SectionCard>
        )
      })}
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
            {domain.progress != null && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>Progress</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: domain.color }}>{domain.progress}%</span>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
          <Stat label="Linked Events" value={linkedEvents.length} color={domain.color} />
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
          <Stat label="Upcoming" value={upcoming.length} color="var(--accent-green)" />
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
          <Stat label="Past" value={past.length} color="var(--text-secondary)" />
        </div>
      </div>

      {upcoming.length > 0 && (
        <SectionCard>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Upcoming</span>
          </div>
          {upcoming.slice(0, 4).map((ev, i) => (
            <EventRow key={ev.id} event={ev} isLast={i === Math.min(3, upcoming.length - 1)} onClick={() => onOpenEvent(ev)} />
          ))}
        </SectionCard>
      )}

      {linkedEvents.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <Calendar size={28} color="var(--border-strong)" style={{ marginBottom: 10 }} />
          <p style={{ margin: 0, fontSize: 13 }}>No events linked yet. Add events from the Calendar and associate them with this domain.</p>
        </div>
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
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Go to Calendar → Add Event → select this domain.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {upcoming.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Upcoming</div>
          <SectionCard>
            {upcoming.map((ev, i) => <EventRow key={ev.id} event={ev} isLast={i === upcoming.length - 1} onClick={() => onOpenEvent(ev)} />)}
          </SectionCard>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Past</div>
          <SectionCard style={{ opacity: 0.7 }}>
            {past.map((ev, i) => <EventRow key={ev.id} event={ev} isLast={i === past.length - 1} onClick={() => onOpenEvent(ev)} />)}
          </SectionCard>
        </div>
      )}
    </div>
  )
}

function EventRow({ event, isLast, onClick }) {
  const [hovered, setHovered] = useState(false)
  const typeColor = resolveTypeColor(event)
  const typeLabel = resolveTypeLabel(event)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 20px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        cursor: 'pointer',
        background: hovered ? 'var(--row-hover)' : 'transparent',
        transition: 'background 0.12s',
      }}
    >
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

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function DomainDetailPage({ domain, linkedEvents, onBack, eventNotes, onUpdateNote, onNewNote, studySessions, notes, weekConfidence, onSetWeekConfidence, onOpenNote }) {
  const isAcademic = domain.category === 'academic'
  const TABS = isAcademic
    ? ['Overview', 'Lectures', 'Assignments', 'Labs', 'Exams', 'Study']
    : ['Overview', 'Events']
  const [activeTab, setActiveTab] = useState('Overview')
  const [openEvent, setOpenEvent] = useState(null)

  const catCfg = DOMAIN_CATEGORIES[domain.category] || DOMAIN_CATEGORIES.other

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000 }}>
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, padding: 0, transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
      >
        <ArrowLeft size={15} /> Back to Domains
      </button>

      {/* Domain header */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '26px 30px', marginBottom: 22, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: domain.color, borderRadius: '16px 0 0 16px' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 0% 50%, ${domain.color}07 0%, transparent 60%)`, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', color: domain.color, background: domain.colorMuted, padding: '4px 10px', borderRadius: 6 }}>{domain.code}</span>
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

          {domain.progress != null && (
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: `conic-gradient(${domain.color} ${domain.progress * 3.6}deg, var(--progress-track) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: domain.color }}>{domain.progress}%</span>
                </div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Progress</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
              background: activeTab === tab ? 'var(--nav-active)' : 'transparent',
              color: activeTab === tab ? domain.color : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.color = 'var(--text-bright)' }}
            onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {isAcademic ? (
        <>
          {activeTab === 'Overview'    && <OverviewTab    domain={domain} onOpenEvent={setOpenEvent} />}
          {activeTab === 'Lectures'    && <LecturesTab    domain={domain} onOpenEvent={setOpenEvent} eventNotes={eventNotes} onNewNote={onNewNote} />}
          {activeTab === 'Assignments' && <AssignmentsTab domain={domain} onOpenEvent={setOpenEvent} eventNotes={eventNotes} />}
          {activeTab === 'Labs'        && <LabsTab        domain={domain} onOpenEvent={setOpenEvent} eventNotes={eventNotes} onNewNote={onNewNote} notes={notes} onOpenNote={onOpenNote} />}
          {activeTab === 'Exams'       && <ExamsTab       domain={domain} onOpenEvent={setOpenEvent} eventNotes={eventNotes} />}
          {activeTab === 'Study'       && <StudyTab       domain={domain} studySessions={studySessions} notes={notes} weekConfidence={weekConfidence} onSetWeekConfidence={onSetWeekConfidence} onNewNote={onNewNote} onOpenNote={onOpenNote} />}
        </>
      ) : (
        <>
          {activeTab === 'Overview' && <GeneralOverviewTab domain={domain} linkedEvents={linkedEvents} onOpenEvent={setOpenEvent} />}
          {activeTab === 'Events'   && <DomainEventsTab linkedEvents={linkedEvents} onOpenEvent={setOpenEvent} />}
        </>
      )}

      {openEvent && (
        <EventDetailModal
          event={openEvent}
          onClose={() => setOpenEvent(null)}
          note={eventNotes?.[openEvent.id] || ''}
          onUpdateNote={onUpdateNote}
        />
      )}
    </div>
  )
}
