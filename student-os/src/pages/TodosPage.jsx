import { useState, useMemo, useEffect, useRef } from 'react'
import AppSelect, { AppSelectItem } from '../components/AppSelect'
import { Plus, X, CheckSquare, Square, Trash2, ChevronDown, AlertTriangle, CheckCircle2, FileText, Sparkles, RotateCcw } from 'lucide-react'
import { getAcademicWeek, getBreakForDate, totalTeachingWeeks } from '../utils/semester'
import { useIsMobile } from '../utils/useIsMobile'

const PRIORITIES = {
  high:   { label: 'High',   color: 'var(--accent-red)'   },
  medium: { label: 'Medium', color: 'var(--accent-amber)'  },
  low:    { label: 'Low',    color: 'var(--accent-green)'  },
}

const PRIORITY_DOTS = {
  high:   '#fb7185',
  medium: '#fbbf24',
  low:    '#34d399',
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

const TOTAL_WEEKS = totalTeachingWeeks()

const UNDO_WINDOW_MS = 5000

const BUCKETS = [
  { key: 'overdue',  label: 'Overdue',     color: 'var(--accent-red)'      },
  { key: 'today',    label: 'Today',       color: 'var(--accent-amber)'    },
  { key: 'tomorrow', label: 'Tomorrow',    color: 'var(--accent-blue)'     },
  { key: 'week',     label: 'Next 7 days', color: 'var(--text-secondary)'  },
  { key: 'later',    label: 'Later',       color: 'var(--text-muted)'      },
  { key: 'someday',  label: 'Someday',     color: 'var(--text-muted)'      },
]

function todayMidnight() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}
function parseDue(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function toDateInput(date) {
  const p = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

function matchesDomain(task, filter) {
  if (!filter) return true
  return filter === '__general__' ? !task.domainId : task.domainId === filter
}

function bucketFor(task, today) {
  if (!task.dueDate) return 'someday'
  const days = Math.round((parseDue(task.dueDate) - today) / 86400000)
  if (days < 0)  return 'overdue'
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days <= 7)  return 'week'
  return 'later'
}

// Buckets and the "completed today" cutoff are both anchored to the current day,
// so the page has to roll over on its own when left open past midnight.
function useToday() {
  const [today, setToday] = useState(todayMidnight)
  useEffect(() => {
    const nextMidnight = new Date(today)
    nextMidnight.setDate(nextMidnight.getDate() + 1)
    const id = setTimeout(() => setToday(todayMidnight()), nextMidnight - Date.now() + 1000)
    return () => clearTimeout(id)
  }, [today])
  return today
}

function PriorityDot({ priority }) {
  return <span style={{ width: 9, height: 9, borderRadius: '50%', background: PRIORITY_DOTS[priority] || PRIORITY_DOTS.low, display: 'inline-block', flexShrink: 0 }} />
}

function DueDateWeekBadge({ date }) {
  if (!date) return null
  const dateObj = parseDue(date)
  const brk = getBreakForDate(dateObj)
  const wk  = getAcademicWeek(dateObj)
  if (!brk && wk == null) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      background: brk ? 'rgba(251,191,36,0.12)' : 'rgba(91,140,255,0.12)',
      color: brk ? 'var(--accent-amber)' : 'var(--accent-blue)',
    }}>
      {brk ? brk.shortName : `W${wk}`}
    </span>
  )
}

function AcademicWeekBadge({ week }) {
  if (!week) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      background: 'rgba(167,139,250,0.14)', color: 'var(--accent-purple)',
    }}>
      Study W{week}
    </span>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>{children}</div>
}

// ─── Add task modal ────────────────────────────────────────────────────────────
function AddTaskModal({ domains, onClose, onSave, initialDomainId, defaultDueDate, isTutorial }) {
  const [form, setForm] = useState({
    title: '', domainId: initialDomainId || '', dueDate: defaultDueDate || '', priority: 'medium', academicWeek: '',
  })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const selectedDomain = domains.find(d => d.id === form.domainId)
  const isAcademic = selectedDomain?.category === 'academic'
  const canSave = form.title.trim()

  const handleSave = () => {
    if (!canSave) return
    onSave({
      title: form.title.trim(),
      domainId: form.domainId || null,
      dueDate: form.dueDate || null,
      priority: form.priority,
      academicWeek: isAcademic && form.academicWeek ? Number(form.academicWeek) : null,
      done: false,
    })
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border-strong)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} data-tutorial-id="todos-modal-content" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 16, width: 460, maxWidth: '92vw', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>New Task</span>
          <button className="btn-press" onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Label>Task</Label>
            <input
              autoFocus style={inputStyle}
              placeholder="What needs to be done?"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
            />
          </div>

          <div>
            <Label>Domain (optional)</Label>
            <AppSelect value={form.domainId} onChange={v => { set('domainId', v); set('academicWeek', '') }}>
              <AppSelectItem value="">No domain</AppSelectItem>
              {domains.map(d => (
                <AppSelectItem key={d.id} value={d.id}>{d.code ? `${d.code} · ` : ''}{d.name}</AppSelectItem>
              ))}
            </AppSelect>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <Label>Due date (optional)</Label>
              <input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={form.dueDate}
                onChange={e => set('dueDate', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
              />
              {form.dueDate && <div style={{ marginTop: 6 }}><DueDateWeekBadge date={form.dueDate} /></div>}
            </div>
            <div>
              <Label>Priority</Label>
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.entries(PRIORITIES).map(([key, cfg]) => (
                  <button className="btn-press" key={key} onClick={() => set('priority', key)} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                    background: form.priority === key ? `${PRIORITY_DOTS[key]}22` : 'var(--bg-overlay)',
                    color: form.priority === key ? PRIORITY_DOTS[key] : 'var(--text-secondary)',
                    outline: form.priority === key ? `1.5px solid ${PRIORITY_DOTS[key]}55` : '1.5px solid transparent',
                    transition: 'all 0.12s',
                  }}>{cfg.label}</button>
                ))}
              </div>
            </div>
          </div>

          {isAcademic && (
            <div>
              <Label>Academic week (optional)</Label>
              <AppSelect value={form.academicWeek} onChange={v => set('academicWeek', v)}>
                <AppSelectItem value="">Not week-specific</AppSelectItem>
                {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => (
                  <AppSelectItem key={w} value={String(w)}>Week {w}</AppSelectItem>
                ))}
              </AppSelect>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-press" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button className="btn-press" onClick={handleSave} disabled={!canSave || isTutorial} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
            background: canSave && !isTutorial ? 'var(--accent-blue)' : 'var(--border)',
            color: canSave && !isTutorial ? 'var(--btn-primary-text)' : 'var(--text-muted)',
            cursor: canSave && !isTutorial ? 'pointer' : 'default', transition: 'all 0.15s',
          }}>Add Task</button>
        </div>
      </div>
    </div>
  )
}

// ─── Task detail / edit modal ──────────────────────────────────────────────────
function TaskDetailModal({ task, domains, notes, studySessions, domainMap, onClose, onSave }) {
  const [form, setForm] = useState({
    title:         task.title,
    domainId:      task.domainId      || '',
    dueDate:       task.dueDate       || '',
    priority:      task.priority      || 'medium',
    academicWeek:  task.academicWeek  ? String(task.academicWeek) : '',
    noteId:        task.noteId        || '',
    studySessionId:task.studySessionId|| '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const selectedDomain = domains.find(d => d.id === form.domainId)
  const isAcademic = selectedDomain?.category === 'academic'
  const canSave = form.title.trim()

  const handleSave = () => {
    if (!canSave) return
    onSave(task.id, {
      title:          form.title.trim(),
      domainId:       form.domainId       || null,
      dueDate:        form.dueDate        || null,
      priority:       form.priority,
      academicWeek:   isAcademic && form.academicWeek ? Number(form.academicWeek) : null,
      noteId:         form.noteId         || null,
      studySessionId: form.studySessionId || null,
    })
    onClose()
  }

  const fmt = iso => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : ''

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border-strong)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 16, width: 480, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-modal)' }}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Edit Task</span>
          <button className="btn-press" onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Label>Task</Label>
            <input autoFocus style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
          </div>

          <div>
            <Label>Domain</Label>
            <AppSelect value={form.domainId} onChange={v => { set('domainId', v); set('academicWeek', '') }}>
              <AppSelectItem value="">No domain</AppSelectItem>
              {domains.map(d => <AppSelectItem key={d.id} value={d.id}>{d.code ? `${d.code} · ` : ''}{d.name}</AppSelectItem>)}
            </AppSelect>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <Label>Due date</Label>
              <input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={form.dueDate}
                onChange={e => set('dueDate', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
              {form.dueDate && <div style={{ marginTop: 6 }}><DueDateWeekBadge date={form.dueDate} /></div>}
            </div>
            <div>
              <Label>Priority</Label>
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.entries(PRIORITIES).map(([key, cfg]) => (
                  <button className="btn-press" key={key} onClick={() => set('priority', key)} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                    background: form.priority === key ? `${PRIORITY_DOTS[key]}22` : 'var(--bg-overlay)',
                    color: form.priority === key ? PRIORITY_DOTS[key] : 'var(--text-secondary)',
                    outline: form.priority === key ? `1.5px solid ${PRIORITY_DOTS[key]}55` : '1.5px solid transparent',
                    transition: 'all 0.12s',
                  }}>{cfg.label}</button>
                ))}
              </div>
            </div>
          </div>

          {isAcademic && (
            <div>
              <Label>Academic week</Label>
              <AppSelect value={form.academicWeek} onChange={v => set('academicWeek', v)}>
                <AppSelectItem value="">Not week-specific</AppSelectItem>
                {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => <AppSelectItem key={w} value={String(w)}>Week {w}</AppSelectItem>)}
              </AppSelect>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Links</div>

            <div>
              <Label>Linked note</Label>
              <AppSelect value={form.noteId} onChange={v => set('noteId', v)}>
                <AppSelectItem value="">None</AppSelectItem>
                {notes.map(n => <AppSelectItem key={n.id} value={n.id}>{n.title || 'Untitled'} · {fmt(n.updatedAt)}</AppSelectItem>)}
              </AppSelect>
            </div>

            <div>
              <Label>Linked study session</Label>
              <AppSelect value={form.studySessionId} onChange={v => set('studySessionId', v)}>
                <AppSelectItem value="">None</AppSelectItem>
                {studySessions.map(s => {
                  const d = s.domainId ? domainMap[s.domainId] : null
                  return <AppSelectItem key={s.id} value={s.id}>{d ? `[${d.code}] ` : ''}{s.topic} · {fmt(s.startedAt)}</AppSelectItem>
                })}
              </AppSelect>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-press" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button className="btn-press" onClick={handleSave} disabled={!canSave} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
            background: canSave ? 'var(--accent-blue)' : 'var(--border)',
            color: canSave ? 'var(--btn-primary-text)' : 'var(--text-muted)',
            cursor: canSave ? 'pointer' : 'default', transition: 'all 0.15s',
          }}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ─── Quick add ────────────────────────────────────────────────────────────────
function QuickAdd({ today, domainId, onAdd }) {
  const [title, setTitle] = useState('')
  const [when,  setWhen]  = useState('none')

  const WHEN_OPTS = [
    ['none',     'No date'],
    ['today',    'Today'],
    ['tomorrow', 'Tomorrow'],
  ]

  const dueDateFor = (key) => {
    if (key === 'none') return null
    const d = new Date(today)
    if (key === 'tomorrow') d.setDate(d.getDate() + 1)
    return toDateInput(d)
  }

  const submit = (e) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    onAdd({
      title: trimmed,
      domainId: domainId || null,
      dueDate: dueDateFor(when),
      priority: 'medium',
      academicWeek: null,
      done: false,
    })
    setTitle('')
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', rowGap: 8 }}>
      <Plus size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Add a task…"
        style={{
          flex: '1 1 160px', minWidth: 0, padding: '4px 0', border: 'none', background: 'transparent',
          color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit',
        }}
      />
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {WHEN_OPTS.map(([key, label]) => (
          <button className="btn-press" type="button" key={key} onClick={() => setWhen(key)} style={{
            padding: '4px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            fontFamily: 'inherit',
            background: when === key ? 'var(--nav-active)' : 'transparent',
            color: when === key ? 'var(--accent-blue)' : 'var(--text-muted)',
            outline: when === key ? '1px solid var(--border-strong)' : '1px solid transparent',
            transition: 'all 0.12s',
          }}>{label}</button>
        ))}
      </div>
      <button className="btn-press" type="submit" disabled={!title.trim()} style={{
        padding: '5px 13px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
        background: title.trim() ? 'var(--accent-blue)' : 'var(--border)',
        color: title.trim() ? 'var(--btn-primary-text)' : 'var(--text-muted)',
        cursor: title.trim() ? 'pointer' : 'default', transition: 'all 0.15s', flexShrink: 0,
      }}>Add</button>
    </form>
  )
}

// ─── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, domainMap, today, justDone, onToggle, onDelete, onOpenNote, onOpenDetail }) {
  const [hovered,    setHovered]    = useState(false)
  const [confirming, setConfirming] = useState(false)
  const domain = task.domainId ? domainMap[task.domainId] : null
  const isOverdue = task.dueDate && !task.done && parseDue(task.dueDate) < today
  const struck = task.done

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 9,
      background: hovered ? 'var(--nav-hover)' : (task.priority === 'high' && !task.done ? 'rgba(251,113,133,0.04)' : 'transparent'),
      opacity: justDone ? 0.55 : 1,
      transition: 'background 0.12s, opacity 0.25s',
    }}>
      <button className="btn-press" onClick={() => onToggle(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: struck ? 'var(--accent-green)' : 'var(--text-muted)', flexShrink: 0, display: 'flex' }}>
        {struck ? <CheckSquare size={16} /> : <Square size={16} />}
      </button>
      <PriorityDot priority={task.priority} />
      <div onClick={() => onOpenDetail?.(task)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <span style={{ fontSize: 13, color: struck ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: struck ? 'line-through' : 'none' }}>
          {task.title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
          {task.dueDate && !struck && (
            <span style={{ fontSize: 11, color: isOverdue ? 'var(--accent-red)' : 'var(--text-muted)' }}>
              {isOverdue && <AlertTriangle size={10} style={{ display: 'inline', marginRight: 3 }} />}
              Due {parseDue(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {!struck && <DueDateWeekBadge date={task.dueDate} />}
          {!struck && <AcademicWeekBadge week={task.academicWeek} />}
          {task.source === 'jarvis' && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'rgba(167,139,250,0.14)', color: 'var(--accent-purple)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Sparkles size={9} /> Jarvis
            </span>
          )}
        </div>
      </div>
      {justDone ? (
        <button className="btn-press" onClick={() => onToggle(task.id)} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6,
          border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        }}>
          <RotateCcw size={11} /> Undo
        </button>
      ) : (
        <>
          {domain && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: `${domain.color}18`, color: domain.color, flexShrink: 0 }}>
              {domain.code || domain.name}
            </span>
          )}
          {task.noteId && onOpenNote && (
            <button className="btn-press" onClick={() => onOpenNote(task.noteId)} title="Open linked note" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--accent-purple)', display: 'flex', flexShrink: 0 }}>
              <FileText size={12} />
            </button>
          )}
          {hovered && !confirming && (
            <button className="btn-press" onClick={e => { e.stopPropagation(); setConfirming(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', flexShrink: 0, display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <Trash2 size={13} />
            </button>
          )}
          {confirming && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn-press" onClick={() => setConfirming(false)} style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button className="btn-press" onClick={() => onDelete(task.id)} style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Bucket section ───────────────────────────────────────────────────────────
function BucketSection({ label, color, tasks, justDoneIds, ...rowProps }) {
  if (tasks.length === 0) return null
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 6px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tasks.length}</span>
      </div>
      {tasks.map(task => <TaskRow key={task.id} task={task} justDone={justDoneIds.includes(task.id)} {...rowProps} />)}
    </div>
  )
}

export default function TodosPage({ todos, domains, onAddTodo, onToggleTodo, onDeleteTodo, onUpdateTodo, notes, studySessions, onOpenNote, isTutorial }) {
  const isMobile = useIsMobile()
  const today = useToday()
  const [showAdd,      setShowAdd]      = useState(false)
  const [showDone,     setShowDone]     = useState(false)
  const [domainFilter, setDomainFilter] = useState(null)
  const [detailTask,   setDetailTask]   = useState(null)
  const [justDone,     setJustDone]     = useState([])

  const undoTimers = useRef({})
  useEffect(() => () => Object.values(undoTimers.current).forEach(clearTimeout), [])

  const domainMap = useMemo(() => Object.fromEntries(domains.map(d => [d.id, d])), [domains])

  // A ticked task holds its place for a few seconds so it can be undone, then
  // drops into the completed footer.
  const handleToggle = (id) => {
    const task = todos.find(t => t.id === id)
    if (!task) return
    onToggleTodo(id)

    clearTimeout(undoTimers.current[id])
    delete undoTimers.current[id]

    if (task.done) {
      setJustDone(prev => prev.filter(x => x !== id))
    } else {
      setJustDone(prev => prev.includes(id) ? prev : [...prev, id])
      undoTimers.current[id] = setTimeout(() => {
        setJustDone(prev => prev.filter(x => x !== id))
        delete undoTimers.current[id]
      }, UNDO_WINDOW_MS)
    }
  }

  const open = useMemo(
    () => todos.filter(t => (!t.done || justDone.includes(t.id)) && matchesDomain(t, domainFilter)),
    [todos, justDone, domainFilter],
  )

  const completedToday = useMemo(
    () => todos
      .filter(t => t.done && !justDone.includes(t.id) && t.completedAt && new Date(t.completedAt) >= today && matchesDomain(t, domainFilter))
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
    [todos, justDone, today, domainFilter],
  )

  const bucketed = useMemo(() => {
    const groups = Object.fromEntries(BUCKETS.map(b => [b.key, []]))
    for (const task of open) groups[bucketFor(task, today)].push(task)
    for (const list of Object.values(groups)) {
      list.sort((a, b) =>
        (a.dueDate || '9999').localeCompare(b.dueDate || '9999') ||
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        String(a.createdAt).localeCompare(String(b.createdAt)),
      )
    }
    return groups
  }, [open, today])

  const filterChips = useMemo(() => {
    const pending = todos.filter(t => !t.done)
    const chips = domains.filter(d => d.id === domainFilter || pending.some(t => t.domainId === d.id))
      .map(d => ({ key: d.id, label: d.code || d.name, color: d.color }))
    if (domainFilter === '__general__' || pending.some(t => !t.domainId)) {
      chips.push({ key: '__general__', label: 'General', color: 'var(--text-secondary)' })
    }
    return chips
  }, [todos, domains, domainFilter])

  const openCount = todos.filter(t => !t.done).length
  const rowProps = {
    domainMap, today,
    onToggle: handleToggle, onDelete: onDeleteTodo,
    onOpenNote, onOpenDetail: setDetailTask,
  }

  return (
    <div style={{ padding: isMobile ? '22px 16px 28px' : '36px 40px', maxWidth: 860 }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: isMobile ? 18 : 24, gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 30 : 40, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>To Do</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            {openCount === 0 ? 'All caught up' : `${openCount} task${openCount !== 1 ? 's' : ''} remaining`}
          </p>
        </div>
        <button className="btn-press" data-tutorial-id="todos-new-btn" onClick={() => setShowAdd(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9,
          border: 'none', background: 'var(--accent-blue)', color: 'var(--btn-primary-text)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--glow-blue)',
        }}>
          <Plus size={14} /> New Task
        </button>
      </div>

      {filterChips.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap', rowGap: 8 }}>
          <button className="btn-press" onClick={() => setDomainFilter(null)} style={{
            padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            background: domainFilter === null ? 'var(--nav-active)' : 'transparent',
            color: domainFilter === null ? 'var(--accent-blue)' : 'var(--text-secondary)',
            outline: domainFilter === null ? '1px solid var(--border-strong)' : '1px solid transparent',
            transition: 'all 0.12s',
          }}>All</button>
          {filterChips.map(chip => {
            const active = domainFilter === chip.key
            return (
              <button className="btn-press" key={chip.key} onClick={() => setDomainFilter(active ? null : chip.key)} style={{
                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                background: active ? `${chip.color}1f` : 'transparent',
                color: active ? chip.color : 'var(--text-secondary)',
                outline: active ? `1px solid ${chip.color}55` : '1px solid transparent',
                transition: 'all 0.12s',
              }}>{chip.label}</button>
            )
          })}
        </div>
      )}

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, paddingBottom: 6, overflow: 'hidden' }}>
        <QuickAdd
          today={today}
          domainId={domainFilter === '__general__' ? null : domainFilter}
          onAdd={onAddTodo}
        />

        {open.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-muted)' }}>
            <div style={{ marginBottom: 12, color: 'var(--border-strong)' }}><CheckCircle2 size={32} /></div>
            <p style={{ fontSize: 13, margin: 0 }}>
              {todos.length === 0 ? 'Nothing here yet. Type above to add your first task.' : 'Nothing left, nice work.'}
            </p>
          </div>
        ) : (
          <div style={{ padding: '4px 6px 0' }}>
            {BUCKETS.map(b => (
              <BucketSection
                key={b.key} label={b.label} color={b.color}
                tasks={bucketed[b.key]} justDoneIds={justDone}
                {...rowProps}
              />
            ))}
          </div>
        )}

        {completedToday.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, padding: '6px 6px 0' }}>
            <button className="btn-press" onClick={() => setShowDone(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px', color: 'var(--text-muted)', fontSize: 12, width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>
              <ChevronDown size={13} style={{ transform: showDone ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
              {completedToday.length} done today
            </button>
            {showDone && completedToday.map(task => (
              <TaskRow key={task.id} task={task} {...rowProps} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddTaskModal
          domains={domains}
          initialDomainId={domainFilter === '__general__' ? null : domainFilter}
          defaultDueDate={null}
          onClose={() => setShowAdd(false)}
          onSave={onAddTodo}
          isTutorial={isTutorial}
        />
      )}

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          domains={domains}
          notes={notes || []}
          studySessions={studySessions || []}
          domainMap={domainMap}
          onClose={() => setDetailTask(null)}
          onSave={(id, updates) => { onUpdateTodo?.(id, updates); setDetailTask(null) }}
        />
      )}
    </div>
  )
}
