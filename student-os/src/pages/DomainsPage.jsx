import { useState } from 'react'
import {
  Plus, X, BookOpen, User, Award, ChevronRight, FileCheck, FlaskConical, ChevronDown, CheckSquare, FolderOpen,
} from 'lucide-react'
import { DOMAIN_CATEGORIES, DOMAIN_COLORS, DOMAIN_ICON_GROUPS, getDomainIcon } from '../data/domains'

function DomainIcon({ name, size = 14, color }) {
  const Icon = getDomainIcon(name)
  if (!Icon) return null
  return <Icon size={size} color={color} />
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ProgressBar({ progress, color }) {
  return (
    <div style={{ height: 3, background: 'var(--progress-track)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${progress}%`, borderRadius: 2,
        background: `var(--progress-gradient, ${color})`,
        backgroundSize: '200% 100%',
        animation: 'var(--progress-anim)',
      }} />
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
function AcademicCard({ domain, pendingTasks, onClick }) {
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
        background: hovered ? 'var(--bg-hover)' : 'var(--bg-surface)',
        border: `1px solid ${hovered ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 14, padding: '22px 22px 18px',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? 'var(--shadow-card)' : 'none',
        transition: 'all 0.18s ease',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: domain.color, borderRadius: '14px 14px 0 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: domain.color, background: domain.colorMuted, padding: '3px 8px', borderRadius: 5 }}>{domain.code}</span>
            <DomainIcon name={domain.icon} size={14} color={domain.color} />
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35, letterSpacing: '-0.2px' }}>{domain.name}</h3>
        </div>
        <ChevronRight size={15} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}><User size={11} color="var(--text-muted)" />{domain.professor}</span>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}><Award size={11} color="var(--text-muted)" />{domain.credits} cr</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Progress</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: domain.color }}>{domain.progress}%</span>
        </div>
        <ProgressBar progress={domain.progress} color={domain.color} />
      </div>

      <div style={{ display: 'flex', borderTop: '1px solid var(--border)', paddingTop: 12, gap: 0 }}>
        {[
          { icon: <BookOpen size={11} />, val: `${completedLectures}/${(domain.lectures||[]).length}`, label: 'Lectures' },
          { icon: <FileCheck size={11} />, val: pendingAssignments, label: 'Pending', warn: pendingAssignments > 0 },
          { icon: <CheckSquare size={11} />, val: pendingTasks || 0, label: 'Tasks', warn: pendingTasks > 0 },
          { icon: <FlaskConical size={11} />, val: `${completedLabs}/${(domain.labs||[]).length}`, label: 'Labs' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: s.warn ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>
              {s.icon}
              <span style={{ fontSize: 12, fontWeight: 600, color: s.warn ? 'var(--accent-amber)' : 'var(--text-primary)' }}>{s.val}</span>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{s.label}</span>
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
        background: hovered ? 'var(--bg-hover)' : 'var(--bg-surface)',
        border: `1px solid ${hovered ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 14, padding: '22px 22px 18px',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? 'var(--shadow-card)' : 'none',
        transition: 'all 0.18s ease',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: domain.color, borderRadius: '14px 14px 0 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <CategoryBadge category={domain.category} />
            <DomainIcon name={domain.icon} size={14} color={domain.color} />
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{domain.name}</h3>
        </div>
        <ChevronRight size={15} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
      </div>

      <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {domain.description}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        {domain.role && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Role: <span style={{ color: 'var(--text-secondary)' }}>{domain.role}</span></span>
        )}
        {domain.progress != null && (
          <span style={{ fontSize: 11, fontWeight: 600, color: domain.color }}>{domain.progress}% done</span>
        )}
        <span style={{ fontSize: 11, color: linkedEventCount > 0 ? domain.color : 'var(--text-muted)' }}>
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
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--border)', padding: '2px 7px', borderRadius: 10 }}>{count}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 4 }} />
      <ChevronDown size={14} color="var(--text-muted)" style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
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
    color: DOMAIN_COLORS[5], icon: 'BookOpen', description: '',
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
      icon: form.icon || 'BookOpen',
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

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border-strong)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const isAcademic = form.category === 'academic'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--border-strong)', borderRadius: 16, width: 500, maxWidth: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `${form.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DomainIcon name={form.icon || 'BookOpen'} size={14} color={form.color} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>New Domain</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10 }}>
            <div>
              <FieldLabel>Name</FieldLabel>
              <input style={inputStyle} placeholder="Domain name" value={form.name} onChange={e => handleNameChange(e.target.value)} autoFocus
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
              />
            </div>
            <div>
              <FieldLabel>Code</FieldLabel>
              <input style={{ ...inputStyle, textTransform: 'uppercase', fontWeight: 600 }} placeholder="CODE" maxLength={5} value={form.code} onChange={e => set('code', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Icon</FieldLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DOMAIN_ICON_GROUPS.map(group => (
                <div key={group.label}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>{group.label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {group.icons.map(name => (
                      <button key={name} onClick={() => set('icon', name)} title={name}
                        style={{
                          width: 32, height: 32, borderRadius: 7, border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: form.icon === name ? `${form.color}22` : 'var(--bg-overlay)',
                          outline: form.icon === name ? `1.5px solid ${form.color}66` : '1.5px solid transparent',
                          transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => { if (form.icon !== name) e.currentTarget.style.background = 'var(--bg-overlay-hover)' }}
                        onMouseLeave={e => { if (form.icon !== name) e.currentTarget.style.background = 'var(--bg-overlay)' }}
                      >
                        <DomainIcon name={name} size={13} color={form.icon === name ? form.color : 'var(--text-secondary)'} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                    background: form.category === key ? `${cfg.color}22` : 'var(--bg-overlay)',
                    color: form.category === key ? cfg.color : 'var(--text-secondary)',
                    outline: form.category === key ? `1.5px solid ${cfg.color}55` : '1.5px solid transparent',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (form.category !== key) e.currentTarget.style.background = 'var(--bg-overlay-hover)' }}
                  onMouseLeave={e => { if (form.category !== key) e.currentTarget.style.background = 'var(--bg-overlay)' }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

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

          <div>
            <FieldLabel>Description (optional)</FieldLabel>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 64, lineHeight: 1.5 }} placeholder="What is this domain about?" value={form.description} onChange={e => set('description', e.target.value)}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
            />
          </div>

          {isAcademic && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Academic Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
                <div><FieldLabel>Professor</FieldLabel><input style={inputStyle} placeholder="Dr. Name" value={form.professor} onChange={e => set('professor', e.target.value)} onFocus={e => e.target.style.borderColor = 'var(--border-focus)'} onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} /></div>
                <div><FieldLabel>Credits</FieldLabel><input style={inputStyle} type="number" placeholder="20" value={form.credits} onChange={e => set('credits', e.target.value)} onFocus={e => e.target.style.borderColor = 'var(--border-focus)'} onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} /></div>
              </div>
              <div><FieldLabel>Semester</FieldLabel><input style={inputStyle} placeholder="Semester 2 · Year 2" value={form.semester} onChange={e => set('semester', e.target.value)} onFocus={e => e.target.style.borderColor = 'var(--border-focus)'} onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} /></div>
            </div>
          )}

          {!isAcademic && (
            <div>
              <FieldLabel>Your Role (optional)</FieldLabel>
              <input style={inputStyle} placeholder="e.g. Team Lead, Member, President…" value={form.role} onChange={e => set('role', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
              />
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              background: canSave ? form.color : 'var(--border)',
              color: canSave ? '#fff' : 'var(--text-muted)',
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
  return <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>{children}</div>
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function DomainsPage({ domains, customCalendarEvents, todos, onOpenDomain, onCreateDomain }) {
  const [showCreate,   setShowCreate]   = useState(false)
  const [academicOpen, setAcademicOpen] = useState(true)
  const [otherOpen,    setOtherOpen]    = useState(true)

  const academic = domains.filter(d => d.category === 'academic')
  const other    = domains.filter(d => d.category !== 'academic')

  const linkedCount  = (domainId) => customCalendarEvents.filter(e => e.domainId === domainId).length
  const pendingTasks = (domainId) => (todos || []).filter(t => t.domainId === domainId && !t.done).length

  const totalCredits = academic.reduce((s, d) => s + (d.credits || 0), 0)
  const avgProgress  = academic.length
    ? Math.round(academic.reduce((s, d) => s + (d.progress || 0), 0) / academic.length)
    : 0
  const totalPending = academic.reduce((s, d) =>
    s + (d.assignments || []).filter(a => a.status === 'upcoming').length, 0)

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1100 }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Domains</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            {domains.length} domain{domains.length !== 1 ? 's' : ''} — academic modules, societies, projects, and more
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none', background: 'var(--accent-blue)', color: 'var(--btn-primary-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--glow-blue)' }}
        >
          <Plus size={14} /> New Domain
        </button>
      </div>

      {academic.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Modules',       value: academic.length,   color: 'var(--accent-blue)'   },
            { label: 'Total Credits', value: totalCredits,       color: 'var(--accent-green)'  },
            { label: 'Avg Progress',  value: `${avgProgress}%`, color: 'var(--accent-purple)'  },
            { label: 'Pending Work',  value: totalPending,      color: 'var(--accent-amber)'   },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color, marginBottom: 2 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {academic.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionHeader label="Academic" count={academic.length} collapsed={!academicOpen} onToggle={() => setAcademicOpen(v => !v)} />
          {academicOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {academic.map(d => <AcademicCard key={d.id} domain={d} pendingTasks={pendingTasks(d.id)} onClick={() => onOpenDomain(d)} />)}
            </div>
          )}
        </div>
      )}

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
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <div style={{ marginBottom: 12, color: 'var(--border-strong)' }}><FolderOpen size={36} /></div>
          <p style={{ fontSize: 14, margin: 0 }}>No domains yet — click <strong style={{ color: 'var(--accent-blue)' }}>New Domain</strong> to create one.</p>
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
