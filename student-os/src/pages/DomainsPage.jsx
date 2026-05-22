import { useState } from 'react'
import { Plus, X, BookOpen, User, Award, ChevronRight, FileCheck, FlaskConical, ChevronDown } from 'lucide-react'
import { DOMAIN_CATEGORIES, DOMAIN_COLORS } from '../data/domains'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ProgressBar({ progress, color }) {
  return (
    <div style={{ height: 3, background: '#1e2030', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${progress}%`, background: color, borderRadius: 2 }} />
    </div>
  )
}

function CategoryBadge({ category }) {
  const cfg = DOMAIN_CATEGORIES[category] || DOMAIN_CATEGORIES.other
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase',
      color: cfg.color, background: `${cfg.color}18`,
      padding: '2px 7px', borderRadius: 4, display: 'inline-block',
    }}>
      {cfg.label}
    </span>
  )
}

// ─── Academic domain card ─────────────────────────────────────────────────────
function AcademicCard({ domain, onClick }) {
  const [hovered, setHovered] = useState(false)
  const completedLectures  = (domain.lectures  || []).filter(l => l.status === 'completed').length
  const pendingAssignments = (domain.assignments || []).filter(a => a.status === 'upcoming' || a.status === 'submitted').length
  const completedLabs      = (domain.labs || []).filter(l => l.status === 'completed').length

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#191a25' : '#14151e',
        border: `1px solid ${hovered ? '#2a2c40' : '#1e2030'}`,
        borderRadius: 14, padding: '22px 22px 18px',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
        transition: 'all 0.18s ease',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: domain.color, borderRadius: '14px 14px 0 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: domain.color, background: domain.colorMuted, padding: '3px 8px', borderRadius: 5 }}>{domain.code}</span>
            <span style={{ fontSize: 13 }}>{domain.icon}</span>
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e6e7f0', lineHeight: 1.35, letterSpacing: '-0.2px' }}>{domain.name}</h3>
        </div>
        <ChevronRight size={15} color="#4a4c60" style={{ marginTop: 2, flexShrink: 0 }} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: '#7c7e96', display: 'flex', alignItems: 'center', gap: 4 }}><User size={11} color="#4a4c60" />{domain.professor}</span>
        <span style={{ fontSize: 11, color: '#7c7e96', display: 'flex', alignItems: 'center', gap: 4 }}><Award size={11} color="#4a4c60" />{domain.credits} cr</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: '#4a4c60' }}>Progress</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: domain.color }}>{domain.progress}%</span>
        </div>
        <ProgressBar progress={domain.progress} color={domain.color} />
      </div>

      <div style={{ display: 'flex', borderTop: '1px solid #1e2030', paddingTop: 12, gap: 0 }}>
        {[
          { icon: <BookOpen size={11} />, val: `${completedLectures}/${(domain.lectures||[]).length}`, label: 'Lectures' },
          { icon: <FileCheck size={11} />, val: pendingAssignments, label: 'Pending', warn: pendingAssignments > 0 },
          { icon: <FlaskConical size={11} />, val: `${completedLabs}/${(domain.labs||[]).length}`, label: 'Labs' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: s.warn ? '#fbbf24' : '#7c7e96' }}>
              {s.icon}
              <span style={{ fontSize: 12, fontWeight: 600, color: s.warn ? '#fbbf24' : '#e6e7f0' }}>{s.val}</span>
            </div>
            <span style={{ fontSize: 10, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── General (non-academic) domain card ───────────────────────────────────────
function GeneralCard({ domain, linkedEventCount, onClick }) {
  const [hovered, setHovered] = useState(false)
  const catCfg = DOMAIN_CATEGORIES[domain.category] || DOMAIN_CATEGORIES.other

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#191a25' : '#14151e',
        border: `1px solid ${hovered ? '#2a2c40' : '#1e2030'}`,
        borderRadius: 14, padding: '22px 22px 18px',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
        transition: 'all 0.18s ease',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: domain.color, borderRadius: '14px 14px 0 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <CategoryBadge category={domain.category} />
            <span style={{ fontSize: 14 }}>{domain.icon}</span>
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e6e7f0', lineHeight: 1.3 }}>{domain.name}</h3>
        </div>
        <ChevronRight size={15} color="#4a4c60" style={{ marginTop: 2, flexShrink: 0 }} />
      </div>

      <p style={{ margin: '0 0 14px', fontSize: 12, color: '#7c7e96', lineHeight: 1.55,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {domain.description}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1e2030', paddingTop: 12 }}>
        {domain.role && (
          <span style={{ fontSize: 11, color: '#4a4c60' }}>Role: <span style={{ color: '#7c7e96' }}>{domain.role}</span></span>
        )}
        {domain.progress != null && (
          <span style={{ fontSize: 11, fontWeight: 600, color: domain.color }}>{domain.progress}% done</span>
        )}
        <span style={{ fontSize: 11, color: linkedEventCount > 0 ? domain.color : '#4a4c60' }}>
          {linkedEventCount} linked event{linkedEventCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ label, count, collapsed, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px 0', marginBottom: 14, width: '100%', textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: '#e6e7f0', letterSpacing: '-0.2px' }}>{label}</span>
      <span style={{ fontSize: 11, color: '#4a4c60', background: '#1e2030', padding: '2px 7px', borderRadius: 10 }}>{count}</span>
      <div style={{ flex: 1, height: 1, background: '#1e2030', marginLeft: 4 }} />
      <ChevronDown size={14} color="#4a4c60" style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
    </button>
  )
}

// ─── Create domain modal ──────────────────────────────────────────────────────
function autoCode(name) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase()
  return words.map(w => w[0]).join('').slice(0, 5).toUpperCase()
}

function CreateDomainModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', category: 'society', code: '',
    color: DOMAIN_COLORS[5], icon: '', description: '',
    professor: '', credits: '', semester: '', role: '',
  })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleNameChange = (v) => {
    set('name', v)
    if (!form.code || form.code === autoCode(form.name)) {
      setForm(prev => ({ ...prev, name: v, code: autoCode(v) }))
    }
  }

  const canSave = form.name.trim() && form.code.trim()

  const handleSave = () => {
    if (!canSave) return
    onSave({
      id: `domain-${Date.now()}`,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      category: form.category,
      color: form.color,
      colorMuted: `${form.color}18`,
      icon: form.icon.trim() || (form.category === 'academic' ? '📚' : '📌'),
      description: form.description.trim(),
      ...(form.category === 'academic' ? {
        professor: form.professor.trim(),
        credits: parseInt(form.credits) || 0,
        semester: form.semester.trim(),
        progress: 0,
        lectures: [], assignments: [], labs: [], exams: [],
      } : {
        role: form.role.trim(),
        progress: null,
      }),
    })
    onClose()
  }

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #2a2c40', background: '#0f1018', color: '#e6e7f0', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const isAcademic = form.category === 'academic'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#14151e', border: '1px solid #2a2c40', borderRadius: 16, width: 500, maxWidth: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #1e2030', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `${form.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              {form.icon || '📌'}
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#e6e7f0' }}>New Domain</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#1e2030', color: '#7c7e96', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>

          {/* Name + Code + Icon row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px', gap: 10 }}>
            <div>
              <FieldLabel>Name</FieldLabel>
              <input style={inputStyle} placeholder="Domain name" value={form.name} onChange={e => handleNameChange(e.target.value)} autoFocus />
            </div>
            <div>
              <FieldLabel>Code</FieldLabel>
              <input style={{ ...inputStyle, textTransform: 'uppercase', fontWeight: 600 }} placeholder="CODE" maxLength={5} value={form.code} onChange={e => set('code', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Icon</FieldLabel>
              <input style={{ ...inputStyle, textAlign: 'center', fontSize: 18 }} placeholder="📌" value={form.icon} onChange={e => set('icon', e.target.value)} />
            </div>
          </div>

          {/* Category */}
          <div>
            <FieldLabel>Category</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {Object.entries(DOMAIN_CATEGORIES).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => set('category', key)}
                  style={{
                    padding: '7px 4px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                    background: form.category === key ? `${cfg.color}22` : '#1a1b28',
                    color: form.category === key ? cfg.color : '#7c7e96',
                    outline: form.category === key ? `1.5px solid ${cfg.color}55` : '1.5px solid transparent',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (form.category !== key) e.currentTarget.style.background = '#252738' }}
                  onMouseLeave={e => { if (form.category !== key) e.currentTarget.style.background = '#1a1b28' }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Colour */}
          <div>
            <FieldLabel>Colour</FieldLabel>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {DOMAIN_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => set('color', c)}
                  style={{
                    width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: c,
                    outline: form.color === c ? `2.5px solid ${c}` : '2.5px solid transparent',
                    outlineOffset: 2,
                    transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.12s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Description (optional)</FieldLabel>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 64, lineHeight: 1.5 }} placeholder="What is this domain about?" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* Academic extras */}
          {isAcademic && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', background: '#0f1018', borderRadius: 10, border: '1px solid #1e2030' }}>
              <div style={{ fontSize: 11, color: '#5b8cff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Academic Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
                <div><FieldLabel>Professor</FieldLabel><input style={inputStyle} placeholder="Dr. Name" value={form.professor} onChange={e => set('professor', e.target.value)} /></div>
                <div><FieldLabel>Credits</FieldLabel><input style={inputStyle} type="number" placeholder="20" value={form.credits} onChange={e => set('credits', e.target.value)} /></div>
              </div>
              <div><FieldLabel>Semester</FieldLabel><input style={inputStyle} placeholder="Semester 2 · Year 2" value={form.semester} onChange={e => set('semester', e.target.value)} /></div>
            </div>
          )}

          {/* Non-academic role */}
          {!isAcademic && (
            <div>
              <FieldLabel>Your Role (optional)</FieldLabel>
              <input style={inputStyle} placeholder="e.g. Team Lead, Member, President…" value={form.role} onChange={e => set('role', e.target.value)} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #1e2030', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #2a2c40', background: 'none', color: '#7c7e96', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              background: canSave ? form.color : '#1e2030',
              color: canSave ? '#0b0c13' : '#4a4c60',
              cursor: canSave ? 'pointer' : 'default', transition: 'all 0.15s',
            }}
          >
            Create Domain
          </button>
        </div>
      </div>
    </div>
  )
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>{children}</div>
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function DomainsPage({ domains, customCalendarEvents, onOpenDomain, onCreateDomain }) {
  const [showCreate, setShowCreate]       = useState(false)
  const [academicOpen, setAcademicOpen]   = useState(true)
  const [otherOpen, setOtherOpen]         = useState(true)

  const academic = domains.filter(d => d.category === 'academic')
  const other    = domains.filter(d => d.category !== 'academic')

  const linkedCount = (domainId) =>
    customCalendarEvents.filter(e => e.domainId === domainId).length

  const totalCredits  = academic.reduce((s, d) => s + (d.credits || 0), 0)
  const avgProgress   = academic.length
    ? Math.round(academic.reduce((s, d) => s + (d.progress || 0), 0) / academic.length)
    : 0
  const totalPending  = academic.reduce((s, d) =>
    s + (d.assignments || []).filter(a => a.status === 'upcoming').length, 0)

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1100 }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#e6e7f0', letterSpacing: '-0.5px' }}>Domains</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#7c7e96' }}>
            {domains.length} domain{domains.length !== 1 ? 's' : ''} — academic modules, societies, projects, and more
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none', background: '#5b8cff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={14} /> New Domain
        </button>
      </div>

      {/* Academic summary strip */}
      {academic.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Modules',       value: academic.length,   color: '#5b8cff' },
            { label: 'Total Credits', value: totalCredits,       color: '#34d399' },
            { label: 'Avg Progress',  value: `${avgProgress}%`, color: '#a78bfa' },
            { label: 'Pending Work',  value: totalPending,      color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: '#14151e', border: '1px solid #1e2030', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color, marginBottom: 2 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Academic section */}
      {academic.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionHeader label="Academic" count={academic.length} collapsed={!academicOpen} onToggle={() => setAcademicOpen(v => !v)} />
          {academicOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {academic.map(d => <AcademicCard key={d.id} domain={d} onClick={() => onOpenDomain(d)} />)}
            </div>
          )}
        </div>
      )}

      {/* Other section */}
      {other.length > 0 && (
        <div>
          <SectionHeader label="Other" count={other.length} collapsed={!otherOpen} onToggle={() => setOtherOpen(v => !v)} />
          {otherOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {other.map(d => <GeneralCard key={d.id} domain={d} linkedEventCount={linkedCount(d.id)} onClick={() => onOpenDomain(d)} />)}
            </div>
          )}
        </div>
      )}

      {domains.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#4a4c60' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
          <p style={{ fontSize: 14, margin: 0 }}>No domains yet — click <strong style={{ color: '#5b8cff' }}>New Domain</strong> to create one.</p>
        </div>
      )}

      {showCreate && (
        <CreateDomainModal
          onClose={() => setShowCreate(false)}
          onSave={d => { onCreateDomain(d); setShowCreate(false) }}
        />
      )}
    </div>
  )
}
