import { BookOpen, User, Award, ChevronRight, Clock, FileCheck, FlaskConical } from 'lucide-react'
import { subjects } from '../data/subjects'

function ProgressBar({ progress, color }) {
  return (
    <div style={{ height: 3, background: '#1e2030', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: color,
        borderRadius: 2,
        transition: 'width 0.3s ease',
      }} />
    </div>
  )
}

function SubjectCard({ subject, onClick }) {
  const completedLectures = subject.lectures.filter(l => l.status === 'completed').length
  const pendingAssignments = subject.assignments.filter(a => a.status === 'upcoming' || a.status === 'submitted').length
  const completedLabs = subject.labs.filter(l => l.status === 'completed').length

  return (
    <div
      onClick={onClick}
      style={{
        background: '#14151e',
        border: '1px solid #1e2030',
        borderRadius: 14,
        padding: '22px 22px 20px',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = '#191a25'
        e.currentTarget.style.borderColor = '#2a2c40'
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = '#14151e'
        e.currentTarget.style.borderColor = '#1e2030'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Colored top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: subject.color, borderRadius: '14px 14px 0 0',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
            color: subject.color,
            background: subject.colorMuted,
            padding: '3px 8px', borderRadius: 5,
            display: 'inline-block', marginBottom: 10,
          }}>
            {subject.code}
          </span>
          <h3 style={{
            margin: 0, fontSize: 16, fontWeight: 600,
            color: '#e6e7f0', lineHeight: 1.35, letterSpacing: '-0.2px',
          }}>
            {subject.name}
          </h3>
        </div>
        <ChevronRight size={16} color="#4a4c60" style={{ marginTop: 4, flexShrink: 0 }} />
      </div>

      {/* Professor & credits */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <User size={12} color="#4a4c60" />
          <span style={{ fontSize: 12, color: '#7c7e96' }}>{subject.professor}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Award size={12} color="#4a4c60" />
          <span style={{ fontSize: 12, color: '#7c7e96' }}>{subject.credits} credits</span>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#4a4c60' }}>Progress</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: subject.color }}>{subject.progress}%</span>
        </div>
        <ProgressBar progress={subject.progress} color={subject.color} />
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex', gap: 0,
        borderTop: '1px solid #1e2030', paddingTop: 14,
      }}>
        <StatPill icon={<BookOpen size={12} />} value={`${completedLectures}/${subject.lectures.length}`} label="Lectures" />
        <StatPill icon={<FileCheck size={12} />} value={pendingAssignments} label="Pending" accent={pendingAssignments > 0} />
        <StatPill icon={<FlaskConical size={12} />} value={`${completedLabs}/${subject.labs.length}`} label="Labs" />
      </div>
    </div>
  )
}

function StatPill({ icon, value, label, accent }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: accent ? '#fbbf24' : '#7c7e96' }}>
        {icon}
        <span style={{ fontSize: 13, fontWeight: 600, color: accent ? '#fbbf24' : '#e6e7f0' }}>{value}</span>
      </div>
      <span style={{ fontSize: 10, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
    </div>
  )
}

export default function SubjectsPage({ onOpenSubject }) {
  const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0)
  const avgProgress = Math.round(subjects.reduce((sum, s) => sum + s.progress, 0) / subjects.length)
  const totalPending = subjects.reduce((sum, s) => sum + s.assignments.filter(a => a.status === 'upcoming').length, 0)

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1100 }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#e6e7f0', letterSpacing: '-0.5px' }}>
            My Subjects
          </h1>
          <span style={{ fontSize: 13, color: '#4a4c60' }}>Semester 2 · Year 2</span>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: '#7c7e96' }}>
          {subjects.length} modules enrolled this semester
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Modules', value: subjects.length, color: '#5b8cff' },
          { label: 'Total Credits', value: totalCredits, color: '#34d399' },
          { label: 'Avg Progress', value: `${avgProgress}%`, color: '#a78bfa' },
          { label: 'Pending Work', value: totalPending, color: '#fbbf24' },
        ].map(stat => (
          <div key={stat.label} style={{
            flex: 1, background: '#14151e', border: '1px solid #1e2030',
            borderRadius: 10, padding: '14px 18px',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, marginBottom: 2 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Subject cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 16,
      }}>
        {subjects.map(subject => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            onClick={() => onOpenSubject(subject)}
          />
        ))}
      </div>
    </div>
  )
}
