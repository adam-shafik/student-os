import { useState } from 'react'
import {
  ArrowLeft, User, Award, BookOpen, FileText, FlaskConical,
  GraduationCap, CheckCircle2, Clock, Circle, ChevronDown,
  ChevronRight, StickyNote, Calendar, MapPin, TrendingUp,
  AlertCircle, ExternalLink, Tag,
} from 'lucide-react'
import { DOMAIN_CATEGORIES } from '../data/domains'
import { resolveTypeLabel, resolveTypeColor, EVENT_TYPES } from '../utils/calendarEvents'

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
  return <div style={{ background: '#14151e', border: '1px solid #1e2030', borderRadius: 12, overflow: 'hidden', ...style }}>{children}</div>
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
      <div style={{ fontSize: 22, fontWeight: 700, color: color || '#e6e7f0' }}>{value}</div>
    </div>
  )
}

// ─── Academic tabs ─────────────────────────────────────────────────────────────

function OverviewTab({ domain }) {
  const completedLectures   = (domain.lectures  || []).filter(l => l.status === 'completed').length
  const completedLabs       = (domain.labs  || []).filter(l => l.status === 'completed').length
  const gradedAssignments   = (domain.assignments || []).filter(a => a.grade !== null)
  const avgGrade = gradedAssignments.length
    ? Math.round(gradedAssignments.reduce((s, a) => s + a.grade, 0) / gradedAssignments.length)
    : null
  const upcoming = [
    ...(domain.assignments || []).filter(a => a.status === 'upcoming').map(a => ({ type: 'Assignment', title: a.title, date: a.dueDate, color: '#fbbf24' })),
    ...(domain.exams || []).filter(e => e.status === 'upcoming').map(e => ({ type: 'Exam', title: e.title, date: e.date, color: '#fb7185' })),
    ...(domain.labs || []).filter(l => l.status === 'upcoming').map(l => ({ type: 'Lab', title: l.title, date: l.date, color: '#a78bfa' })),
  ].slice(0, 4)
  const nextLecture = (domain.lectures || []).find(l => l.status === 'in-progress' || l.status === 'upcoming')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Lectures Done', value: `${completedLectures}/${(domain.lectures||[]).length}`, icon: BookOpen, color: '#5b8cff' },
          { label: 'Labs Done',     value: `${completedLabs}/${(domain.labs||[]).length}`,         icon: FlaskConical, color: '#a78bfa' },
          { label: 'Avg Grade',     value: avgGrade ? `${avgGrade}%` : '—',                        icon: TrendingUp, color: '#34d399' },
          { label: 'Pending Tasks', value: (domain.assignments||[]).filter(a => a.status === 'upcoming').length, icon: AlertCircle, color: '#fbbf24' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} style={{ background: '#14151e', border: '1px solid #1e2030', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</span>
                <div style={{ width: 28, height: 28, background: `${s.color}18`, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color={s.color} />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#e6e7f0' }}>{s.value}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SectionCard>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2030' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e6e7f0' }}>Upcoming Deadlines</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {upcoming.length === 0
              ? <p style={{ padding: '12px 20px', color: '#4a4c60', fontSize: 13, margin: 0 }}>No upcoming deadlines</p>
              : upcoming.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < upcoming.length - 1 ? '1px solid #1e2030' : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: '#e6e7f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: '#4a4c60', marginTop: 2 }}>{item.type} · {item.date}</div>
                  </div>
                </div>
              ))}
          </div>
        </SectionCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {nextLecture && (
            <SectionCard>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2030' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#e6e7f0' }}>Next Lecture</span>
              </div>
              <div style={{ padding: '14px 20px' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#e6e7f0', marginBottom: 4 }}>{nextLecture.title}</div>
                <div style={{ fontSize: 12, color: '#4a4c60' }}>Week {nextLecture.week} · {nextLecture.date}</div>
              </div>
            </SectionCard>
          )}
          <SectionCard>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2030' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e6e7f0' }}>Module Progress</span>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#7c7e96' }}>Overall completion</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: domain.color }}>{domain.progress}%</span>
              </div>
              <div style={{ height: 6, background: '#1e2030', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${domain.progress}%`, background: domain.color, borderRadius: 3 }} />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

function LecturesTab({ domain }) {
  const [openWeeks, setOpenWeeks] = useState(() => {
    const o = {}
    ;(domain.lectures || []).forEach(l => { o[l.week] = true })
    return o
  })
  const byWeek = (domain.lectures || []).reduce((acc, l) => {
    if (!acc[l.week]) acc[l.week] = []
    acc[l.week].push(l)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Object.entries(byWeek).map(([week, lectures]) => {
        const isOpen    = openWeeks[week]
        const allDone   = lectures.every(l => l.status === 'completed')
        const hasActive = lectures.some(l => l.status === 'in-progress')
        const wColor    = allDone ? '#34d399' : hasActive ? '#5b8cff' : '#4a4c60'
        return (
          <SectionCard key={week}>
            <button onClick={() => setOpenWeeks(prev => ({ ...prev, [week]: !prev[week] }))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `${wColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: wColor }}>W{week}</span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#e6e7f0' }}>Week {week}</span>
                <span style={{ fontSize: 12, color: '#4a4c60', marginLeft: 8 }}>{lectures.length} lecture{lectures.length > 1 ? 's' : ''}{allDone ? <span style={{ color: '#34d399' }}> · Done</span> : hasActive ? <span style={{ color: '#5b8cff' }}> · In Progress</span> : ''}</span>
              </div>
              {isOpen ? <ChevronDown size={15} color="#4a4c60" /> : <ChevronRight size={15} color="#4a4c60" />}
            </button>
            {isOpen && (
              <div style={{ borderTop: '1px solid #1e2030' }}>
                {lectures.map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: i < lectures.length - 1 ? '1px solid #1a1b28' : 'none', opacity: l.status === 'upcoming' ? 0.6 : 1 }}>
                    {l.status === 'completed' ? <CheckCircle2 size={14} color="#34d399" /> : l.status === 'in-progress' ? <Clock size={14} color="#5b8cff" /> : <Circle size={14} color="#4a4c60" />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#e6e7f0', fontWeight: 500 }}>{l.title}</div>
                      <div style={{ fontSize: 11, color: '#4a4c60', marginTop: 2 }}>{l.date}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {l.hasNotes && <div style={{ fontSize: 11, color: '#7c7e96', background: '#1e2030', padding: '3px 7px', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 4 }}><StickyNote size={10} />Notes</div>}
                      <StatusBadge status={l.status} />
                    </div>
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

function AssignmentsTab({ domain }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {(domain.assignments || []).map(a => (
        <SectionCard key={a.id}>
          <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 3, height: 44, borderRadius: 2, flexShrink: 0, background: a.status === 'graded' ? '#34d399' : a.status === 'submitted' ? '#fbbf24' : '#4a4c60' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#e6e7f0', marginBottom: 4 }}>{a.title}</div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#4a4c60', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} />Due {a.dueDate}</span>
                <span style={{ fontSize: 12, color: '#4a4c60' }}>Weight: <span style={{ color: '#7c7e96', fontWeight: 500 }}>{a.weight}%</span></span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {a.grade !== null && (
                <div style={{ background: a.grade >= 70 ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)', color: a.grade >= 70 ? '#34d399' : '#fb7185', fontSize: 16, fontWeight: 700, padding: '6px 14px', borderRadius: 8 }}>
                  {a.grade}%
                </div>
              )}
              <StatusBadge status={a.status} />
            </div>
          </div>
        </SectionCard>
      ))}
    </div>
  )
}

function LabsTab({ domain }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {(domain.labs || []).map(lab => (
        <SectionCard key={lab.id}>
          <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: lab.status === 'completed' ? 'rgba(52,211,153,0.1)' : lab.status === 'in-progress' ? 'rgba(91,140,255,0.1)' : '#1a1b28', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FlaskConical size={16} color={lab.status === 'completed' ? '#34d399' : lab.status === 'in-progress' ? '#5b8cff' : '#4a4c60'} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#e6e7f0', marginBottom: 3 }}>{lab.title}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: domain.color, background: domain.colorMuted, padding: '2px 6px', borderRadius: 4 }}>Week {lab.week}</span>
                <span style={{ fontSize: 12, color: '#4a4c60', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} />{lab.date}</span>
              </div>
            </div>
            <StatusBadge status={lab.status} />
          </div>
        </SectionCard>
      ))}
    </div>
  )
}

function ExamsTab({ domain }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(domain.exams || []).map(exam => (
        <SectionCard key={exam.id}>
          <div style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <GraduationCap size={16} color={domain.color} />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#e6e7f0' }}>{exam.title}</h3>
                </div>
                <StatusBadge status={exam.status} />
              </div>
              <div style={{ background: `${domain.color}18`, color: domain.color, fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 8 }}>{exam.weight}% of grade</div>
            </div>
            <div style={{ display: 'flex', gap: 22, paddingTop: 14, borderTop: '1px solid #1e2030' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Calendar size={13} color="#4a4c60" /><span style={{ fontSize: 13, color: '#7c7e96' }}>{exam.date}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Clock   size={13} color="#4a4c60" /><span style={{ fontSize: 13, color: '#7c7e96' }}>{exam.time}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><MapPin  size={13} color="#4a4c60" /><span style={{ fontSize: 13, color: '#7c7e96' }}>{exam.location}</span></div>
            </div>
          </div>
        </SectionCard>
      ))}
    </div>
  )
}

// ─── General domain tabs ───────────────────────────────────────────────────────

function GeneralOverviewTab({ domain, linkedEvents }) {
  const upcoming = linkedEvents.filter(e => e.date >= new Date()).sort((a, b) => a.date - b.date)
  const past     = linkedEvents.filter(e => e.date  < new Date()).sort((a, b) => b.date - a.date)
  const catCfg   = DOMAIN_CATEGORIES[domain.category] || DOMAIN_CATEGORIES.other

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* About card */}
      <SectionCard>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e2030' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e6e7f0' }}>About</span>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#7c7e96', lineHeight: 1.6 }}>{domain.description || 'No description.'}</p>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>Type</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: catCfg.color, background: `${catCfg.color}18`, padding: '3px 8px', borderRadius: 5 }}>{catCfg.label}</span>
            </div>
            {domain.role && (
              <div>
                <div style={{ fontSize: 10, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>Your Role</div>
                <span style={{ fontSize: 12, color: '#e6e7f0' }}>{domain.role}</span>
              </div>
            )}
            {domain.progress != null && (
              <div>
                <div style={{ fontSize: 10, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>Progress</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: domain.color }}>{domain.progress}%</span>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Linked events stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={{ background: '#14151e', border: '1px solid #1e2030', borderRadius: 12, padding: '16px 18px' }}>
          <Stat label="Linked Events" value={linkedEvents.length} color={domain.color} />
        </div>
        <div style={{ background: '#14151e', border: '1px solid #1e2030', borderRadius: 12, padding: '16px 18px' }}>
          <Stat label="Upcoming" value={upcoming.length} color="#34d399" />
        </div>
        <div style={{ background: '#14151e', border: '1px solid #1e2030', borderRadius: 12, padding: '16px 18px' }}>
          <Stat label="Past" value={past.length} color="#7c7e96" />
        </div>
      </div>

      {/* Upcoming events preview */}
      {upcoming.length > 0 && (
        <SectionCard>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2030' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e6e7f0' }}>Upcoming</span>
          </div>
          {upcoming.slice(0, 4).map((ev, i) => (
            <EventRow key={ev.id} event={ev} isLast={i === Math.min(3, upcoming.length - 1)} />
          ))}
        </SectionCard>
      )}

      {linkedEvents.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#4a4c60' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📅</div>
          <p style={{ margin: 0, fontSize: 13 }}>No events linked yet. Add events from the Calendar and associate them with this domain.</p>
        </div>
      )}
    </div>
  )
}

function DomainEventsTab({ linkedEvents }) {
  const upcoming = linkedEvents.filter(e => e.date >= new Date()).sort((a, b) => a.date - b.date)
  const past     = linkedEvents.filter(e => e.date  < new Date()).sort((a, b) => b.date - a.date)

  if (linkedEvents.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#4a4c60' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
        <p style={{ margin: 0, fontSize: 14 }}>No events linked to this domain yet.</p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#3a3c50' }}>Go to Calendar → Add Event → select this domain.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {upcoming.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Upcoming</div>
          <SectionCard>
            {upcoming.map((ev, i) => <EventRow key={ev.id} event={ev} isLast={i === upcoming.length - 1} />)}
          </SectionCard>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Past</div>
          <SectionCard style={{ opacity: 0.7 }}>
            {past.map((ev, i) => <EventRow key={ev.id} event={ev} isLast={i === past.length - 1} />)}
          </SectionCard>
        </div>
      )}
    </div>
  )
}

function EventRow({ event, isLast }) {
  const typeColor = resolveTypeColor(event)
  const typeLabel = resolveTypeLabel(event)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 20px',
      borderBottom: isLast ? 'none' : '1px solid #1e2030',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${typeColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: typeColor }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#e6e7f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
        <div style={{ fontSize: 11, color: '#4a4c60', marginTop: 2 }}>
          <span style={{ color: typeColor, fontWeight: 600 }}>{typeLabel}</span>
          {' · '}{event.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {event.details?.time && ` · ${event.details.time}`}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function DomainDetailPage({ domain, linkedEvents, onBack }) {
  const isAcademic = domain.category === 'academic'
  const TABS = isAcademic
    ? ['Overview', 'Lectures', 'Assignments', 'Labs', 'Exams']
    : ['Overview', 'Events']
  const [activeTab, setActiveTab] = useState('Overview')

  const catCfg = DOMAIN_CATEGORIES[domain.category] || DOMAIN_CATEGORIES.other

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000 }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer', color: '#7c7e96', fontSize: 13, padding: 0, transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = '#e6e7f0'}
        onMouseLeave={e => e.currentTarget.style.color = '#7c7e96'}
      >
        <ArrowLeft size={15} /> Back to Domains
      </button>

      {/* Domain header */}
      <div style={{ background: '#14151e', border: '1px solid #1e2030', borderRadius: 16, padding: '26px 30px', marginBottom: 22, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: domain.color, borderRadius: '16px 0 0 16px' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 0% 50%, ${domain.color}07 0%, transparent 60%)`, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', color: domain.color, background: domain.colorMuted, padding: '4px 10px', borderRadius: 6 }}>{domain.code}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: catCfg.color, background: `${catCfg.color}18`, padding: '4px 10px', borderRadius: 6 }}>{catCfg.label}</span>
              {domain.icon && <span style={{ fontSize: 16 }}>{domain.icon}</span>}
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#e6e7f0', letterSpacing: '-0.4px' }}>{domain.name}</h1>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#7c7e96', lineHeight: 1.5, maxWidth: 520 }}>{domain.description}</p>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {domain.professor && <span style={{ fontSize: 13, color: '#7c7e96', display: 'flex', alignItems: 'center', gap: 5 }}><User size={13} color="#4a4c60" />{domain.professor}</span>}
              {domain.credits   && <span style={{ fontSize: 13, color: '#7c7e96', display: 'flex', alignItems: 'center', gap: 5 }}><Award size={13} color="#4a4c60" />{domain.credits} credits</span>}
              {domain.semester  && <span style={{ fontSize: 13, color: '#7c7e96' }}>{domain.semester}</span>}
              {domain.role      && <span style={{ fontSize: 13, color: '#7c7e96', display: 'flex', alignItems: 'center', gap: 5 }}><Tag size={13} color="#4a4c60" />{domain.role}</span>}
              {!isAcademic && <span style={{ fontSize: 13, color: '#7c7e96', display: 'flex', alignItems: 'center', gap: 5 }}><ExternalLink size={13} color="#4a4c60" />{linkedEvents.length} linked event{linkedEvents.length !== 1 ? 's' : ''}</span>}
            </div>
          </div>

          {/* Progress ring — academic or project */}
          {domain.progress != null && (
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: `conic-gradient(${domain.color} ${domain.progress * 3.6}deg, #1e2030 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#14151e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: domain.color }}>{domain.progress}%</span>
                </div>
              </div>
              <span style={{ fontSize: 10, color: '#4a4c60', marginTop: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Progress</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#14151e', border: '1px solid #1e2030', borderRadius: 10, padding: 4 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
              background: activeTab === tab ? '#1a1c2e' : 'transparent',
              color: activeTab === tab ? domain.color : '#7c7e96',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.color = '#c4c5d4' }}
            onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.color = '#7c7e96' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {isAcademic ? (
        <>
          {activeTab === 'Overview'     && <OverviewTab     domain={domain} />}
          {activeTab === 'Lectures'     && <LecturesTab     domain={domain} />}
          {activeTab === 'Assignments'  && <AssignmentsTab  domain={domain} />}
          {activeTab === 'Labs'         && <LabsTab         domain={domain} />}
          {activeTab === 'Exams'        && <ExamsTab        domain={domain} />}
        </>
      ) : (
        <>
          {activeTab === 'Overview' && <GeneralOverviewTab domain={domain} linkedEvents={linkedEvents} />}
          {activeTab === 'Events'   && <DomainEventsTab linkedEvents={linkedEvents} />}
        </>
      )}
    </div>
  )
}
