import { useState } from 'react'
import {
  ArrowLeft, User, Award, BookOpen, FileText, FlaskConical,
  GraduationCap, CheckCircle2, Clock, Circle, ChevronDown,
  ChevronRight, StickyNote, Calendar, MapPin, BarChart3,
  AlertCircle, TrendingUp,
} from 'lucide-react'

const TABS = ['Overview', 'Lectures', 'Assignments', 'Labs', 'Exams']

// ─── Shared helpers ────────────────────────────────────────────────────────────

function StatusDot({ status }) {
  const map = {
    completed: { color: '#34d399', icon: CheckCircle2 },
    'in-progress': { color: '#5b8cff', icon: Clock },
    upcoming: { color: '#4a4c60', icon: Circle },
    submitted: { color: '#fbbf24', icon: Clock },
    graded: { color: '#34d399', icon: CheckCircle2 },
  }
  const cfg = map[status] || map.upcoming
  const Icon = cfg.icon
  return <Icon size={14} color={cfg.color} strokeWidth={2} />
}

function StatusBadge({ status }) {
  const map = {
    completed: { label: 'Completed', bg: 'rgba(52,211,153,0.1)', color: '#34d399' },
    'in-progress': { label: 'In Progress', bg: 'rgba(91,140,255,0.1)', color: '#5b8cff' },
    upcoming: { label: 'Upcoming', bg: 'rgba(74,76,96,0.15)', color: '#7c7e96' },
    submitted: { label: 'Submitted', bg: 'rgba(251,191,36,0.1)', color: '#fbbf24' },
    graded: { label: 'Graded', bg: 'rgba(52,211,153,0.1)', color: '#34d399' },
  }
  const cfg = map[status] || map.upcoming
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5,
      background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

function SectionCard({ children, style }) {
  return (
    <div style={{
      background: '#14151e', border: '1px solid #1e2030',
      borderRadius: 12, overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ subject }) {
  const completedLectures = subject.lectures.filter(l => l.status === 'completed').length
  const completedLabs = subject.labs.filter(l => l.status === 'completed').length
  const gradedAssignments = subject.assignments.filter(a => a.grade !== null)
  const avgGrade = gradedAssignments.length
    ? Math.round(gradedAssignments.reduce((s, a) => s + a.grade, 0) / gradedAssignments.length)
    : null
  const upcoming = [
    ...subject.assignments.filter(a => a.status === 'upcoming').map(a => ({ type: 'Assignment', title: a.title, date: a.dueDate, color: '#fbbf24' })),
    ...subject.exams.filter(e => e.status === 'upcoming').map(e => ({ type: 'Exam', title: e.title, date: e.date, color: '#fb7185' })),
    ...subject.labs.filter(l => l.status === 'upcoming').map(l => ({ type: 'Lab', title: l.title, date: l.date, color: '#a78bfa' })),
  ].slice(0, 4)

  const nextLecture = subject.lectures.find(l => l.status === 'in-progress' || l.status === 'upcoming')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Lectures Done', value: `${completedLectures}/${subject.lectures.length}`, icon: BookOpen, color: '#5b8cff' },
          { label: 'Labs Done', value: `${completedLabs}/${subject.labs.length}`, icon: FlaskConical, color: '#a78bfa' },
          { label: 'Avg Grade', value: avgGrade ? `${avgGrade}%` : '—', icon: TrendingUp, color: '#34d399' },
          { label: 'Pending Tasks', value: subject.assignments.filter(a => a.status === 'upcoming').length, icon: AlertCircle, color: '#fbbf24' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} style={{
              background: '#14151e', border: '1px solid #1e2030',
              borderRadius: 12, padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</span>
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
        {/* Upcoming deadlines */}
        <SectionCard>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e2030' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e6e7f0' }}>Upcoming Deadlines</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {upcoming.length === 0 ? (
              <p style={{ padding: '12px 20px', color: '#4a4c60', fontSize: 13, margin: 0 }}>No upcoming deadlines</p>
            ) : upcoming.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 20px',
                borderBottom: i < upcoming.length - 1 ? '1px solid #1e2030' : 'none',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#e6e7f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#4a4c60', marginTop: 2 }}>{item.type} · {item.date}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Next lecture + progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {nextLecture && (
            <SectionCard style={{ flex: 'none' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e2030' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#e6e7f0' }}>Next Lecture</span>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#e6e7f0', marginBottom: 6 }}>{nextLecture.title}</div>
                <div style={{ fontSize: 12, color: '#4a4c60' }}>Week {nextLecture.week} · {nextLecture.date}</div>
              </div>
            </SectionCard>
          )}
          <SectionCard>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e2030' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e6e7f0' }}>Module Progress</span>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#7c7e96' }}>Overall completion</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: subject.color }}>{subject.progress}%</span>
              </div>
              <div style={{ height: 6, background: '#1e2030', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${subject.progress}%`, background: subject.color, borderRadius: 3, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                <span style={{ fontSize: 11, color: '#4a4c60' }}>Week 1</span>
                <span style={{ fontSize: 11, color: '#4a4c60' }}>Week 12</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

// ─── Lectures Tab ──────────────────────────────────────────────────────────────

function LecturesTab({ subject }) {
  const [openWeeks, setOpenWeeks] = useState(() => {
    const open = {}
    subject.lectures.forEach(l => { open[l.week] = true })
    return open
  })

  const byWeek = subject.lectures.reduce((acc, l) => {
    if (!acc[l.week]) acc[l.week] = []
    acc[l.week].push(l)
    return acc
  }, {})

  const toggleWeek = w => setOpenWeeks(prev => ({ ...prev, [w]: !prev[w] }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Object.entries(byWeek).map(([week, lectures]) => {
        const isOpen = openWeeks[week]
        const allDone = lectures.every(l => l.status === 'completed')
        const hasActive = lectures.some(l => l.status === 'in-progress')
        const weekColor = allDone ? '#34d399' : hasActive ? '#5b8cff' : '#4a4c60'

        return (
          <SectionCard key={week}>
            <button
              onClick={() => toggleWeek(week)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 20px', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: `${weekColor}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: weekColor }}>W{week}</span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#e6e7f0' }}>
                  Week {week}
                </span>
                <span style={{ fontSize: 12, color: '#4a4c60', marginLeft: 8 }}>
                  {lectures.length} lecture{lectures.length > 1 ? 's' : ''}
                  {allDone && ' · '}
                  {allDone && <span style={{ color: '#34d399' }}>Done</span>}
                  {hasActive && ' · '}
                  {hasActive && <span style={{ color: '#5b8cff' }}>In Progress</span>}
                </span>
              </div>
              {isOpen
                ? <ChevronDown size={16} color="#4a4c60" />
                : <ChevronRight size={16} color="#4a4c60" />}
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid #1e2030' }}>
                {lectures.map((lecture, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 20px',
                      borderBottom: i < lectures.length - 1 ? '1px solid #1a1b28' : 'none',
                      opacity: lecture.status === 'upcoming' ? 0.65 : 1,
                    }}
                  >
                    <StatusDot status={lecture.status} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#e6e7f0', fontWeight: 500 }}>{lecture.title}</div>
                      <div style={{ fontSize: 11, color: '#4a4c60', marginTop: 2 }}>{lecture.date}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {lecture.hasNotes && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 11, color: '#7c7e96',
                          background: '#1e2030', padding: '3px 7px', borderRadius: 5,
                        }}>
                          <StickyNote size={10} />
                          Notes
                        </div>
                      )}
                      <StatusBadge status={lecture.status} />
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

// ─── Assignments Tab ───────────────────────────────────────────────────────────

function AssignmentsTab({ subject }) {
  const weightUsed = subject.assignments.filter(a => a.grade !== null).reduce((s, a) => s + a.weight, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {subject.assignments.map((a, i) => (
        <SectionCard key={a.id}>
          <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Left accent */}
            <div style={{
              width: 3, height: 44, borderRadius: 2, flexShrink: 0,
              background: a.status === 'graded' ? '#34d399'
                : a.status === 'submitted' ? '#fbbf24'
                : a.status === 'upcoming' ? '#4a4c60' : '#5b8cff',
            }} />

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#e6e7f0', marginBottom: 4 }}>{a.title}</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#4a4c60', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} /> Due {a.dueDate}
                </span>
                <span style={{ fontSize: 12, color: '#4a4c60' }}>
                  Weight: <span style={{ color: '#7c7e96', fontWeight: 500 }}>{a.weight}%</span>
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {a.grade !== null && (
                <div style={{
                  background: a.grade >= 70 ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)',
                  color: a.grade >= 70 ? '#34d399' : '#fb7185',
                  fontSize: 16, fontWeight: 700,
                  padding: '6px 14px', borderRadius: 8,
                }}>
                  {a.grade}%
                </div>
              )}
              <StatusBadge status={a.status} />
            </div>
          </div>
        </SectionCard>
      ))}

      {/* Weight breakdown */}
      <SectionCard>
        <div style={{ padding: '14px 22px', borderBottom: '1px solid #1e2030' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#7c7e96', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Assessment Breakdown
          </span>
        </div>
        <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {subject.assignments.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#7c7e96', width: 200, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.title}
              </span>
              <div style={{ flex: 1, height: 4, background: '#1e2030', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${a.weight}%`,
                  background: a.grade !== null ? '#34d399' : '#2a2c40',
                  borderRadius: 2,
                }} />
              </div>
              <span style={{ fontSize: 12, color: '#4a4c60', width: 30, textAlign: 'right' }}>{a.weight}%</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Labs Tab ─────────────────────────────────────────────────────────────────

function LabsTab({ subject }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {subject.labs.map((lab, i) => (
        <SectionCard key={lab.id}>
          <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: lab.status === 'completed' ? 'rgba(52,211,153,0.1)'
                : lab.status === 'in-progress' ? 'rgba(91,140,255,0.1)'
                : '#1a1b28',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FlaskConical
                size={16}
                color={lab.status === 'completed' ? '#34d399' : lab.status === 'in-progress' ? '#5b8cff' : '#4a4c60'}
              />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#e6e7f0', marginBottom: 3 }}>{lab.title}</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: subject.color,
                  background: subject.colorMuted, padding: '2px 6px', borderRadius: 4,
                }}>
                  Week {lab.week}
                </span>
                <span style={{ fontSize: 12, color: '#4a4c60', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} /> {lab.date}
                </span>
              </div>
            </div>

            <StatusBadge status={lab.status} />
          </div>
        </SectionCard>
      ))}

      {subject.labs.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#4a4c60' }}>
          No labs scheduled for this module.
        </div>
      )}
    </div>
  )
}

// ─── Exams Tab ────────────────────────────────────────────────────────────────

function ExamsTab({ subject }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {subject.exams.map((exam, i) => (
        <SectionCard key={exam.id}>
          <div style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <GraduationCap size={16} color={subject.color} />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#e6e7f0' }}>{exam.title}</h3>
                </div>
                <StatusBadge status={exam.status} />
              </div>
              <div style={{
                background: `${subject.color}18`,
                color: subject.color,
                fontSize: 13, fontWeight: 700,
                padding: '6px 14px', borderRadius: 8,
              }}>
                {exam.weight}% of grade
              </div>
            </div>

            <div style={{
              display: 'flex', gap: 24,
              paddingTop: 16, borderTop: '1px solid #1e2030',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Calendar size={13} color="#4a4c60" />
                <span style={{ fontSize: 13, color: '#7c7e96' }}>{exam.date}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Clock size={13} color="#4a4c60" />
                <span style={{ fontSize: 13, color: '#7c7e96' }}>{exam.time}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <MapPin size={13} color="#4a4c60" />
                <span style={{ fontSize: 13, color: '#7c7e96' }}>{exam.location}</span>
              </div>
            </div>
          </div>
        </SectionCard>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SubjectDetailPage({ subject, onBack }) {
  const [activeTab, setActiveTab] = useState('Overview')

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000 }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#7c7e96', fontSize: 13, padding: 0,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#e6e7f0'}
        onMouseLeave={e => e.currentTarget.style.color = '#7c7e96'}
      >
        <ArrowLeft size={15} />
        Back to Subjects
      </button>

      {/* Subject header */}
      <div style={{
        background: '#14151e', border: '1px solid #1e2030',
        borderRadius: 16, padding: '28px 32px', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Colored left border */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 4, background: subject.color, borderRadius: '16px 0 0 16px',
        }} />
        {/* Subtle glow */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: `radial-gradient(ellipse at 0% 50%, ${subject.color}08 0%, transparent 60%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, letterSpacing: '0.5px',
                color: subject.color, background: subject.colorMuted,
                padding: '4px 10px', borderRadius: 6,
              }}>
                {subject.code}
              </span>
              <span style={{ fontSize: 12, color: '#4a4c60' }}>{subject.semester}</span>
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#e6e7f0', letterSpacing: '-0.4px' }}>
              {subject.name}
            </h1>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#7c7e96', lineHeight: 1.5, maxWidth: 520 }}>
              {subject.description}
            </p>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#7c7e96', display: 'flex', alignItems: 'center', gap: 5 }}>
                <User size={13} color="#4a4c60" /> {subject.professor}
              </span>
              <span style={{ fontSize: 13, color: '#7c7e96', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Award size={13} color="#4a4c60" /> {subject.credits} credits
              </span>
              <span style={{ fontSize: 13, color: '#7c7e96', display: 'flex', alignItems: 'center', gap: 5 }}>
                <BookOpen size={13} color="#4a4c60" /> {subject.lectures.length} lectures
              </span>
            </div>
          </div>

          {/* Progress ring / stat */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: `conic-gradient(${subject.color} ${subject.progress * 3.6}deg, #1e2030 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <div style={{
                width: 54, height: 54, borderRadius: '50%',
                background: '#14151e',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: subject.color }}>{subject.progress}%</span>
              </div>
            </div>
            <span style={{ fontSize: 10, color: '#4a4c60', marginTop: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Progress
            </span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: '#14151e', border: '1px solid #1e2030',
        borderRadius: 10, padding: 4,
      }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 7, border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
              background: activeTab === tab ? '#1a1c2e' : 'transparent',
              color: activeTab === tab ? subject.color : '#7c7e96',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { if (activeTab !== tab) { e.currentTarget.style.color = '#c4c5d4' } }}
            onMouseLeave={e => { if (activeTab !== tab) { e.currentTarget.style.color = '#7c7e96' } }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview' && <OverviewTab subject={subject} />}
      {activeTab === 'Lectures' && <LecturesTab subject={subject} />}
      {activeTab === 'Assignments' && <AssignmentsTab subject={subject} />}
      {activeTab === 'Labs' && <LabsTab subject={subject} />}
      {activeTab === 'Exams' && <ExamsTab subject={subject} />}
    </div>
  )
}
