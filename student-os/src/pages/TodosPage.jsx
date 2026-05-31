import { useState, useMemo } from 'react'
import AppSelect, { AppSelectItem } from '../components/AppSelect'
import { Plus, X, CheckSquare, Square, Trash2, ChevronDown, AlertTriangle, CheckCircle2, FileText, CalendarDays } from 'lucide-react'
import { getAcademicWeek, getBreakForDate, totalTeachingWeeks } from '../utils/semester'

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

const TOTAL_WEEKS = totalTeachingWeeks()

function todayMidnight() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}
function parseDue(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function PriorityDot({ priority }) {
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_DOTS[priority] || PRIORITY_DOTS.low, display: 'inline-block', flexShrink: 0 }} />
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
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <AppSelectItem value="">— General / No domain —</AppSelectItem>
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
                  <button key={key} onClick={() => set('priority', key)} style={{
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
                <AppSelectItem value="">— Not week-specific —</AppSelectItem>
                {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => (
                  <AppSelectItem key={w} value={String(w)}>Week {w}</AppSelectItem>
                ))}
              </AppSelect>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={!canSave || isTutorial} style={{
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
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <AppSelectItem value="">— General / No domain —</AppSelectItem>
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
                  <button key={key} onClick={() => set('priority', key)} style={{
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
                <AppSelectItem value="">— Not week-specific —</AppSelectItem>
                {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => <AppSelectItem key={w} value={String(w)}>Week {w}</AppSelectItem>)}
              </AppSelect>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Links</div>

            <div>
              <Label>Linked note</Label>
              <AppSelect value={form.noteId} onChange={v => set('noteId', v)}>
                <AppSelectItem value="">— None —</AppSelectItem>
                {notes.map(n => <AppSelectItem key={n.id} value={n.id}>{n.title || 'Untitled'} · {fmt(n.updatedAt)}</AppSelectItem>)}
              </AppSelect>
            </div>

            <div>
              <Label>Linked study session</Label>
              <AppSelect value={form.studySessionId} onChange={v => set('studySessionId', v)}>
                <AppSelectItem value="">— None —</AppSelectItem>
                {studySessions.map(s => {
                  const d = s.domainId ? domainMap[s.domainId] : null
                  return <AppSelectItem key={s.id} value={s.id}>{d ? `[${d.code}] ` : ''}{s.topic} · {fmt(s.startedAt)}</AppSelectItem>
                })}
              </AppSelect>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={!canSave} style={{
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

// ─── Standard task row (Tasks view) ───────────────────────────────────────────
function TaskRow({ task, domainMap, onToggle, onDelete, onOpenNote, onOpenDetail }) {
  const [hovered,    setHovered]    = useState(false)
  const [confirming, setConfirming] = useState(false)
  const domain = task.domainId ? domainMap[task.domainId] : null
  const isOverdue = task.dueDate && !task.done && parseDue(task.dueDate) < todayMidnight()

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 9,
      background: hovered ? 'var(--nav-hover)' : 'transparent', transition: 'background 0.12s',
    }}>
      <button onClick={() => onToggle(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: task.done ? 'var(--accent-green)' : 'var(--text-muted)', flexShrink: 0, display: 'flex' }}>
        {task.done ? <CheckSquare size={16} /> : <Square size={16} />}
      </button>
      <PriorityDot priority={task.priority} />
      <div onClick={() => onOpenDetail?.(task)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <span style={{ fontSize: 13, color: task.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.done ? 'line-through' : 'none' }}>
          {task.title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
          {task.dueDate && (
            <span style={{ fontSize: 11, color: isOverdue ? 'var(--accent-red)' : 'var(--text-muted)' }}>
              {isOverdue && <AlertTriangle size={10} style={{ display: 'inline', marginRight: 3 }} />}
              Due {parseDue(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
          <DueDateWeekBadge date={task.dueDate} />
          <AcademicWeekBadge week={task.academicWeek} />
        </div>
      </div>
      {domain && (
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: `${domain.color}18`, color: domain.color, flexShrink: 0 }}>
          {domain.code || domain.name}
        </span>
      )}
      {task.noteId && onOpenNote && (
        <button onClick={() => onOpenNote(task.noteId)} title="Open linked note" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--accent-purple)', display: 'flex', flexShrink: 0 }}>
          <FileText size={12} />
        </button>
      )}
      {hovered && !confirming && (
        <button onClick={e => { e.stopPropagation(); setConfirming(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', flexShrink: 0, display: 'flex' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          <Trash2 size={13} />
        </button>
      )}
      {confirming && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setConfirming(false)} style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={() => onDelete(task.id)} style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
        </div>
      )}
    </div>
  )
}

// ─── Study plan task row ───────────────────────────────────────────────────────
function StudyPlanTaskRow({ task, domainMap, noteMap, onToggle, onDelete, onOpenNote, onOpenDetail, isLast }) {
  const [hovered,    setHovered]    = useState(false)
  const [confirming, setConfirming] = useState(false)
  const domain = task.domainId ? domainMap[task.domainId] : null
  const note   = task.noteId   ? noteMap[task.noteId]     : null

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 14px 11px 12px',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      borderLeft: `3px solid ${domain?.color ?? 'transparent'}`,
      background: hovered ? 'var(--nav-hover)' : 'transparent',
      transition: 'background 0.12s',
    }}>
      <button onClick={() => onToggle(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: task.done ? 'var(--accent-green)' : 'var(--text-muted)', flexShrink: 0, display: 'flex' }}>
        {task.done ? <CheckSquare size={15} /> : <Square size={15} />}
      </button>

      <div onClick={() => onOpenDetail?.(task)} style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
        {domain && (
          <span style={{ fontSize: 10, fontWeight: 800, color: domain.color, flexShrink: 0, letterSpacing: '0.3px' }}>
            {domain.code || domain.name.slice(0, 6).toUpperCase()}
          </span>
        )}
        <span style={{
          fontSize: 13,
          color: task.done ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: task.done ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {task.title}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <PriorityDot priority={task.priority} />
        {note && (
          <button onClick={() => onOpenNote(note.id)} title={`Note: ${note.title}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--accent-purple)', display: 'flex' }}>
            <FileText size={12} />
          </button>
        )}
        {task.studySessionId && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: 'rgba(91,140,255,0.15)', color: 'var(--accent-blue)' }} title="Linked to study session">
            session
          </span>
        )}
        {hovered && !confirming && (
          <button onClick={e => { e.stopPropagation(); setConfirming(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <Trash2 size={12} />
          </button>
        )}
        {confirming && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => setConfirming(false)} style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={() => onDelete(task.id)} style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Study plan view ───────────────────────────────────────────────────────────
function StudyPlanView({ todos, domainMap, noteMap, onToggle, onDelete, onAdd, onOpenNote, onOpenDetail }) {
  const today = todayMidnight()

  const groups = useMemo(() => {
    const map = {}
    for (const t of todos) {
      const key = t.dueDate || '__none__'
      if (!map[key]) map[key] = []
      map[key].push(t)
    }
    const dateKeys = Object.keys(map).filter(k => k !== '__none__').sort()
    const result = dateKeys.map(key => ({ key, date: parseDue(key), tasks: map[key] }))
    if (map['__none__']) result.push({ key: '__none__', date: null, tasks: map['__none__'] })
    return result
  }, [todos])

  if (groups.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        <CalendarDays size={36} style={{ marginBottom: 12, color: 'var(--border-strong)' }} />
        <p style={{ fontSize: 14, margin: 0 }}>Your study plan is empty.</p>
        <p style={{ fontSize: 12, margin: '6px 0 0' }}>Add tasks with a due date and they'll appear here.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {groups.map(({ key, date, tasks }) => {
        const isToday    = date && date.getTime() === today.getTime()
        const isPast     = date && date < today
        const isTomorrow = date && !isToday && !isPast && date.getTime() === today.getTime() + 86400000
        const pending    = tasks.filter(t => !t.done).length
        const allDone    = pending === 0

        const dateLabel = date
          ? date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          : 'No date'

        return (
          <div key={key} style={{ opacity: isPast && allDone ? 0.5 : isPast ? 0.72 : 1, transition: 'opacity 0.2s' }}>
            {/* Day header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: isToday ? 'var(--accent-blue)' : isPast ? 'var(--text-muted)' : 'var(--text-secondary)',
              }}>
                {dateLabel}
              </span>

              {isToday && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 10,
                  background: 'var(--accent-blue)', color: '#fff', letterSpacing: '0.5px',
                }}>TODAY</span>
              )}
              {isTomorrow && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                  background: 'rgba(91,140,255,0.15)', color: 'var(--accent-blue)', letterSpacing: '0.4px',
                }}>TOMORROW</span>
              )}

              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />

              <span style={{
                fontSize: 11, fontWeight: 600,
                color: allDone ? 'var(--accent-green)' : 'var(--text-muted)',
              }}>
                {allDone ? '✓ all done' : `${tasks.length - pending}/${tasks.length}`}
              </span>

              {!isPast && (
                <button onClick={() => onAdd(key === '__none__' ? null : key)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'var(--text-muted)', display: 'flex', borderRadius: 5 }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  <Plus size={14} />
                </button>
              )}
            </div>

            {/* Task cards */}
            <div style={{
              background: 'var(--bg-surface)',
              border: `1px solid ${isToday ? 'rgba(91,140,255,0.35)' : 'var(--border)'}`,
              borderRadius: 12, overflow: 'hidden',
              boxShadow: isToday ? '0 0 0 1px rgba(91,140,255,0.1)' : 'none',
            }}>
              {tasks.map((task, i) => (
                <StudyPlanTaskRow
                  key={task.id}
                  task={task}
                  domainMap={domainMap}
                  noteMap={noteMap}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onOpenNote={onOpenNote}
                  onOpenDetail={onOpenDetail}
                  isLast={i === tasks.length - 1}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Generic collapsible group ─────────────────────────────────────────────────
function TaskGroup({ label, labelColor, tasks, domainMap, onToggle, onDelete, onOpenNote, onOpenDetail, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  const pending = tasks.filter(t => !t.done).length
  if (tasks.length === 0) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <button onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', width: '100%', textAlign: 'left' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: labelColor || 'var(--text-secondary)' }}>{label}</span>
        {pending > 0 && (
          <span style={{ fontSize: 10, fontWeight: 600, background: 'var(--border)', color: 'var(--text-secondary)', padding: '1px 7px', borderRadius: 10 }}>{pending}</span>
        )}
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <ChevronDown size={13} color="var(--text-muted)" style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      {open && tasks.map(task => (
        <TaskRow key={task.id} task={task} domainMap={domainMap} onToggle={onToggle} onDelete={onDelete} onOpenNote={onOpenNote} onOpenDetail={onOpenDetail} />
      ))}
    </div>
  )
}

// ─── Domain section ─────────────────────────────────────────────────────────────
function DomainSection({ domain, tasks, domainMap, onToggle, onDelete, onOpenNote, onOpenDetail, onAdd }) {
  const [open, setOpen] = useState(true)
  const pending = tasks.filter(t => !t.done).length
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', marginBottom: 4 }}>
        {domain && <div style={{ width: 10, height: 10, borderRadius: '50%', background: domain.color, flexShrink: 0 }} />}
        <button onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flex: 1, textAlign: 'left' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: domain ? domain.color : 'var(--text-secondary)' }}>
            {domain ? (domain.code ? `${domain.code} · ${domain.name}` : domain.name) : 'General'}
          </span>
          {pending > 0 && (
            <span style={{ fontSize: 10, fontWeight: 600, background: domain ? `${domain.color}18` : 'var(--border)', color: domain ? domain.color : 'var(--text-secondary)', padding: '1px 7px', borderRadius: 10 }}>{pending}</span>
          )}
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <ChevronDown size={13} color="var(--text-muted)" style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
        </button>
        <button onClick={onAdd} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'var(--text-muted)', display: 'flex' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          <Plus size={14} />
        </button>
      </div>
      {open && (
        <div>
          {tasks.length === 0 ? (
            <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No tasks — click + to add one</div>
          ) : (
            tasks.map(task => <TaskRow key={task.id} task={task} domainMap={domainMap} onToggle={onToggle} onDelete={onDelete} onOpenNote={onOpenNote} onOpenDetail={onOpenDetail} />)
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TodosPage({ todos, domains, onAddTodo, onToggleTodo, onDeleteTodo, onUpdateTodo, notes, studySessions, onOpenNote, isTutorial }) {
  const [view,         setView]         = useState('plan')
  const [showAdd,      setShowAdd]      = useState(false)
  const [addForDomain, setAddForDomain] = useState(null)
  const [addForDate,   setAddForDate]   = useState(null)
  const [showDone,     setShowDone]     = useState(false)
  const [groupBy,      setGroupBy]      = useState('domain')
  const [detailTask,   setDetailTask]   = useState(null)

  const domainMap = useMemo(() => Object.fromEntries(domains.map(d => [d.id, d])), [domains])
  const noteMap   = useMemo(() => Object.fromEntries((notes || []).map(n => [n.id, n])), [notes])

  const pending = todos.filter(t => !t.done)
  const done    = todos.filter(t => t.done)

  // ── Domain grouping ──────────────────────────────────────────────────────────
  const domainGroups = useMemo(() => {
    const grouped = {}
    for (const task of pending) {
      const key = task.domainId || '__general__'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(task)
    }
    const orderedIds = domains.map(d => d.id).filter(id => grouped[id])
    if (grouped['__general__']) orderedIds.push('__general__')
    return orderedIds.map(id => ({ domain: id === '__general__' ? null : domainMap[id], tasks: grouped[id] || [] }))
  }, [pending, domains, domainMap])

  // ── Priority grouping ────────────────────────────────────────────────────────
  const priorityGroups = useMemo(() => [
    { key: 'high',   label: 'High Priority',   color: 'var(--accent-red)'    },
    { key: 'medium', label: 'Medium Priority',  color: 'var(--accent-amber)'  },
    { key: 'low',    label: 'Low Priority',     color: 'var(--accent-green)'  },
  ].map(g => ({ ...g, tasks: pending.filter(t => t.priority === g.key) })), [pending])

  // ── Due date grouping ────────────────────────────────────────────────────────
  const dueDateGroups = useMemo(() => {
    const today = todayMidnight()
    const endOfWeek = new Date(today); endOfWeek.setDate(today.getDate() + (6 - today.getDay()))
    const buckets = { overdue: [], today: [], week: [], later: [], none: [] }
    for (const task of pending) {
      if (!task.dueDate) { buckets.none.push(task); continue }
      const d = parseDue(task.dueDate)
      if (d < today) buckets.overdue.push(task)
      else if (d.getTime() === today.getTime()) buckets.today.push(task)
      else if (d <= endOfWeek) buckets.week.push(task)
      else buckets.later.push(task)
    }
    return [
      { key: 'overdue', label: 'Overdue',    color: 'var(--accent-red)',     tasks: buckets.overdue },
      { key: 'today',   label: 'Due Today',   color: 'var(--accent-amber)',   tasks: buckets.today  },
      { key: 'week',    label: 'This Week',   color: 'var(--accent-blue)',    tasks: buckets.week   },
      { key: 'later',   label: 'Later',       color: 'var(--text-secondary)', tasks: buckets.later  },
      { key: 'none',    label: 'No Due Date', color: 'var(--text-muted)',     tasks: buckets.none   },
    ]
  }, [pending])

  const openAdd = (domainId = null, dueDate = null) => {
    setAddForDomain(domainId)
    setAddForDate(dueDate)
    setShowAdd(true)
  }

  const handleSave = (task) => {
    const merged = { ...task }
    if (addForDomain && !merged.domainId) merged.domainId = addForDomain
    if (addForDate   && !merged.dueDate)  merged.dueDate  = addForDate
    onAddTodo(merged)
  }

  const totalPending = pending.length
  const summaryStats = [
    { label: 'Pending',  value: pending.length,                                          color: 'var(--accent-blue)'  },
    { label: 'Done',     value: done.length,                                              color: 'var(--accent-green)' },
    { label: 'High pri', value: pending.filter(t => t.priority === 'high').length,        color: 'var(--accent-red)'   },
    { label: 'Overdue',  value: pending.filter(t => t.dueDate && parseDue(t.dueDate) < todayMidnight()).length, color: 'var(--accent-amber)' },
  ]

  const GROUP_OPTIONS = [
    { key: 'domain',   label: 'Domain'   },
    { key: 'priority', label: 'Priority' },
    { key: 'dueDate',  label: 'Due Date' },
  ]

  return (
    <div style={{ padding: '36px 40px', maxWidth: 860 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>To Do</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            {totalPending === 0 ? 'All caught up' : `${totalPending} task${totalPending !== 1 ? 's' : ''} remaining`}
          </p>
        </div>
        <button data-tutorial-id="todos-new-btn" onClick={() => openAdd()} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9,
          border: 'none', background: 'var(--accent-blue)', color: 'var(--btn-primary-text)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--glow-blue)',
        }}>
          <Plus size={14} /> New Task
        </button>
      </div>

      {/* ── View toggle ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 9, padding: 3, gap: 2 }}>
          {[['plan', CalendarDays, 'Study Plan'], ['tasks', CheckSquare, 'Tasks']].map(([v, Icon, label]) => (
            <button key={v} onClick={() => setView(v)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: view === v ? 'rgba(91,140,255,0.15)' : 'transparent',
              color: view === v ? 'var(--accent-blue)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        {view === 'tasks' && (
          <>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Group by</span>
            {GROUP_OPTIONS.map(opt => (
              <button key={opt.key} onClick={() => setGroupBy(opt.key)} style={{
                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                background: groupBy === opt.key ? 'var(--nav-active)' : 'transparent',
                color: groupBy === opt.key ? 'var(--accent-blue)' : 'var(--text-secondary)',
                outline: groupBy === opt.key ? '1px solid var(--border-strong)' : '1px solid transparent',
                transition: 'all 0.12s',
              }}>{opt.label}</button>
            ))}
          </>
        )}
      </div>

      {/* ── Summary stats (tasks view only) ── */}
      {view === 'tasks' && todos.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {summaryStats.map(s => (
            <div key={s.label} style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color, marginBottom: 2 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Study Plan view ── */}
      {view === 'plan' && (
        <StudyPlanView
          todos={todos}
          domainMap={domainMap}
          noteMap={noteMap}
          onToggle={onToggleTodo}
          onDelete={onDeleteTodo}
          onOpenNote={onOpenNote}
          onOpenDetail={setDetailTask}
          onAdd={(dueDate) => openAdd(null, dueDate)}
        />
      )}

      {/* ── Tasks view ── */}
      {view === 'tasks' && (
        <>
          {todos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ marginBottom: 12, color: 'var(--border-strong)' }}><CheckCircle2 size={36} /></div>
              <p style={{ fontSize: 14, margin: 0 }}>No tasks yet — click <strong style={{ color: 'var(--accent-blue)' }}>New Task</strong> to add one.</p>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '8px 6px' }}>

              {groupBy === 'domain' && (
                <>
                  {domainGroups.length === 0 && <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Nothing pending — nice work</div>}
                  {domainGroups.map(({ domain, tasks }) => (
                    <DomainSection
                      key={domain ? domain.id : '__general__'}
                      domain={domain} tasks={tasks} domainMap={domainMap}
                      onToggle={onToggleTodo} onDelete={onDeleteTodo} onOpenNote={onOpenNote} onOpenDetail={setDetailTask}
                      onAdd={() => openAdd(domain?.id || null)}
                    />
                  ))}
                </>
              )}

              {groupBy === 'priority' && (
                <>
                  {pending.length === 0 && <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Nothing pending — nice work</div>}
                  {priorityGroups.map(g => (
                    <TaskGroup key={g.key} label={g.label} labelColor={g.color} tasks={g.tasks} domainMap={domainMap} onToggle={onToggleTodo} onDelete={onDeleteTodo} onOpenNote={onOpenNote} onOpenDetail={setDetailTask} />
                  ))}
                </>
              )}

              {groupBy === 'dueDate' && (
                <>
                  {pending.length === 0 && <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Nothing pending — nice work</div>}
                  {dueDateGroups.map(g => (
                    <TaskGroup key={g.key} label={g.label} labelColor={g.color} tasks={g.tasks} domainMap={domainMap} onToggle={onToggleTodo} onDelete={onDeleteTodo} onOpenNote={onOpenNote} onOpenDetail={setDetailTask} defaultOpen={g.key !== 'none'} />
                  ))}
                </>
              )}

              {done.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
                  <button onClick={() => setShowDone(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 14px', color: 'var(--text-muted)', fontSize: 12, width: '100%', textAlign: 'left' }}>
                    <ChevronDown size={13} style={{ transform: showDone ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
                    {done.length} completed
                  </button>
                  {showDone && done.map(task => (
                    <TaskRow key={task.id} task={task} domainMap={domainMap} onToggle={onToggleTodo} onDelete={onDeleteTodo} onOpenNote={onOpenNote} onOpenDetail={setDetailTask} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showAdd && (
        <AddTaskModal
          domains={domains}
          initialDomainId={addForDomain}
          defaultDueDate={addForDate}
          onClose={() => { setShowAdd(false); setAddForDomain(null); setAddForDate(null) }}
          onSave={handleSave}
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
