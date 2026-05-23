import { useState, useMemo } from 'react'
import { Plus, X, CheckSquare, Square, Trash2, ChevronDown, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { getAcademicWeek, getBreakForDate, totalTeachingWeeks } from '../utils/semester'
import { DOMAIN_CATEGORIES } from '../data/domains'

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
function AddTaskModal({ domains, onClose, onSave, initialDomainId }) {
  const [form, setForm] = useState({
    title: '', domainId: initialDomainId || '', dueDate: '', priority: 'medium', academicWeek: '',
  })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const selectedDomain = domains.find(d => d.id === form.domainId)
  const isAcademic = selectedDomain?.category === 'academic'

  const canSave = form.title.trim()

  const handleSave = () => {
    if (!canSave) return
    onSave({
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: form.title.trim(),
      domainId: form.domainId || null,
      dueDate: form.dueDate || null,
      priority: form.priority,
      academicWeek: isAcademic && form.academicWeek ? Number(form.academicWeek) : null,
      done: false,
      createdAt: new Date().toISOString(),
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
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--border-strong)', borderRadius: 16, width: 460, maxWidth: '92vw', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}>

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
              autoFocus
              style={inputStyle}
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
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.domainId}
              onChange={e => { set('domainId', e.target.value); set('academicWeek', '') }}
            >
              <option value="">— General / No domain —</option>
              {domains.map(d => (
                <option key={d.id} value={d.id}>{d.code ? `${d.code} · ` : ''}{d.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isAcademic ? '1fr 1fr' : '1fr 1fr', gap: 10 }}>
            <div>
              <Label>Due date (optional)</Label>
              <input
                style={{ ...inputStyle, colorScheme: 'dark' }}
                type="date" value={form.dueDate}
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
                  <button
                    key={key}
                    onClick={() => set('priority', key)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 7, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600,
                      background: form.priority === key ? `${PRIORITY_DOTS[key]}22` : 'var(--bg-overlay)',
                      color: form.priority === key ? PRIORITY_DOTS[key] : 'var(--text-secondary)',
                      outline: form.priority === key ? `1.5px solid ${PRIORITY_DOTS[key]}55` : '1.5px solid transparent',
                      transition: 'all 0.12s',
                    }}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isAcademic && (
            <div>
              <Label>Academic week (optional)</Label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.academicWeek}
                onChange={e => set('academicWeek', e.target.value)}
              >
                <option value="">— Not week-specific —</option>
                {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
              {form.academicWeek && (
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                  Task tagged as studying/revising content from Week {form.academicWeek}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              background: canSave ? 'var(--accent-blue)' : 'var(--border)',
              color: canSave ? 'var(--btn-primary-text)' : 'var(--text-muted)',
              cursor: canSave ? 'pointer' : 'default', transition: 'all 0.15s',
            }}
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Single task row ───────────────────────────────────────────────────────────
function TaskRow({ task, domainMap, onToggle, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const domain = task.domainId ? domainMap[task.domainId] : null

  const isOverdue = task.dueDate && !task.done && parseDue(task.dueDate) < todayMidnight()

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 9,
        background: hovered ? 'var(--nav-hover)' : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <button
        onClick={() => onToggle(task.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: task.done ? 'var(--accent-green)' : 'var(--text-muted)', flexShrink: 0, display: 'flex' }}
      >
        {task.done ? <CheckSquare size={16} /> : <Square size={16} />}
      </button>

      <PriorityDot priority={task.priority} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 13,
          color: task.done ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: task.done ? 'line-through' : 'none',
        }}>
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
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
          background: `${domain.color}18`, color: domain.color, flexShrink: 0,
        }}>
          {domain.code || domain.name}
        </span>
      )}

      {hovered && (
        <button
          onClick={() => onDelete(task.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', flexShrink: 0, display: 'flex' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

// ─── Generic collapsible group (priority / due-date grouping) ──────────────────
function TaskGroup({ label, labelColor, tasks, domainMap, onToggle, onDelete, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  const pending = tasks.filter(t => !t.done).length
  if (tasks.length === 0) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', width: '100%', textAlign: 'left' }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: labelColor || 'var(--text-secondary)' }}>{label}</span>
        {pending > 0 && (
          <span style={{ fontSize: 10, fontWeight: 600, background: 'var(--border)', color: 'var(--text-secondary)', padding: '1px 7px', borderRadius: 10 }}>
            {pending}
          </span>
        )}
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <ChevronDown size={13} color="var(--text-muted)" style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      {open && tasks.map(task => (
        <TaskRow key={task.id} task={task} domainMap={domainMap} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </div>
  )
}

// ─── Domain section (domain grouping) ─────────────────────────────────────────
function DomainSection({ domain, tasks, domainMap, onToggle, onDelete, onAdd }) {
  const [open, setOpen] = useState(true)
  const pending = tasks.filter(t => !t.done).length

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', marginBottom: 4 }}>
        {domain && (
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: domain.color, flexShrink: 0 }} />
        )}
        <button
          onClick={() => setOpen(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flex: 1, textAlign: 'left' }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: domain ? domain.color : 'var(--text-secondary)' }}>
            {domain ? (domain.code ? `${domain.code} · ${domain.name}` : domain.name) : 'General'}
          </span>
          {pending > 0 && (
            <span style={{ fontSize: 10, fontWeight: 600, background: domain ? `${domain.color}18` : 'var(--border)', color: domain ? domain.color : 'var(--text-secondary)', padding: '1px 7px', borderRadius: 10 }}>
              {pending}
            </span>
          )}
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <ChevronDown size={13} color="var(--text-muted)" style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
        </button>
        <button
          onClick={onAdd}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'var(--text-muted)', display: 'flex' }}
          title="Add task"
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Plus size={14} />
        </button>
      </div>

      {open && (
        <div>
          {tasks.length === 0 ? (
            <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No tasks — click + to add one
            </div>
          ) : (
            tasks.map(task => (
              <TaskRow key={task.id} task={task} domainMap={domainMap} onToggle={onToggle} onDelete={onDelete} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TodosPage({ todos, domains, onAddTodo, onToggleTodo, onDeleteTodo }) {
  const [showAdd, setShowAdd]           = useState(false)
  const [addForDomain, setAddForDomain] = useState(null)
  const [showDone, setShowDone]         = useState(false)
  const [groupBy, setGroupBy]           = useState('domain')

  const domainMap = useMemo(() => Object.fromEntries(domains.map(d => [d.id, d])), [domains])

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
    return orderedIds.map(id => ({
      domain: id === '__general__' ? null : domainMap[id],
      tasks: grouped[id] || [],
    }))
  }, [pending, domains, domainMap])

  // ── Priority grouping ────────────────────────────────────────────────────────
  const priorityGroups = useMemo(() => [
    { key: 'high',   label: 'High Priority',   color: 'var(--accent-red)'   },
    { key: 'medium', label: 'Medium Priority',  color: 'var(--accent-amber)' },
    { key: 'low',    label: 'Low Priority',     color: 'var(--accent-green)' },
  ].map(g => ({ ...g, tasks: pending.filter(t => t.priority === g.key) })), [pending])

  // ── Due date grouping ────────────────────────────────────────────────────────
  const dueDateGroups = useMemo(() => {
    const today = todayMidnight()
    const endOfWeek = new Date(today); endOfWeek.setDate(today.getDate() + (6 - today.getDay()))

    const buckets = { overdue: [], today: [], week: [], later: [], none: [] }
    for (const task of pending) {
      if (!task.dueDate) { buckets.none.push(task); continue }
      const d = parseDue(task.dueDate)
      if (d < today)       buckets.overdue.push(task)
      else if (d.getTime() === today.getTime()) buckets.today.push(task)
      else if (d <= endOfWeek) buckets.week.push(task)
      else                 buckets.later.push(task)
    }
    return [
      { key: 'overdue', label: 'Overdue',      color: 'var(--accent-red)',   tasks: buckets.overdue },
      { key: 'today',   label: 'Due Today',     color: 'var(--accent-amber)', tasks: buckets.today  },
      { key: 'week',    label: 'This Week',     color: 'var(--accent-blue)',  tasks: buckets.week   },
      { key: 'later',   label: 'Later',         color: 'var(--text-secondary)', tasks: buckets.later },
      { key: 'none',    label: 'No Due Date',   color: 'var(--text-muted)',   tasks: buckets.none   },
    ]
  }, [pending])

  const openAdd = (domainId = null) => {
    setAddForDomain(domainId)
    setShowAdd(true)
  }

  const handleSave = (task) => {
    if (addForDomain && !task.domainId) task = { ...task, domainId: addForDomain }
    onAddTodo(task)
  }

  const totalPending = pending.length

  const summaryStats = [
    { label: 'Pending',  value: pending.length,                                   color: 'var(--accent-blue)'  },
    { label: 'Done',     value: done.length,                                       color: 'var(--accent-green)' },
    { label: 'High pri', value: pending.filter(t => t.priority === 'high').length, color: 'var(--accent-red)'   },
    { label: 'Overdue',  value: pending.filter(t => t.dueDate && parseDue(t.dueDate) < todayMidnight()).length, color: 'var(--accent-amber)' },
  ]

  const GROUP_OPTIONS = [
    { key: 'domain',   label: 'Domain'   },
    { key: 'priority', label: 'Priority' },
    { key: 'dueDate',  label: 'Due Date' },
  ]

  const hasTasks = domainGroups.length > 0 || done.length > 0

  return (
    <div style={{ padding: '36px 40px', maxWidth: 860 }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>To Do</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            {totalPending === 0 ? 'All caught up' : `${totalPending} task${totalPending !== 1 ? 's' : ''} remaining`}
          </p>
        </div>
        <button
          onClick={() => openAdd()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none', background: 'var(--accent-blue)', color: 'var(--btn-primary-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--glow-blue)' }}
        >
          <Plus size={14} /> New Task
        </button>
      </div>

      {/* Group by toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Group by</span>
        {GROUP_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setGroupBy(opt.key)}
            style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
              background: groupBy === opt.key ? 'var(--nav-active)' : 'transparent',
              color: groupBy === opt.key ? 'var(--accent-blue)' : 'var(--text-secondary)',
              outline: groupBy === opt.key ? '1px solid var(--border-strong)' : '1px solid transparent',
              transition: 'all 0.12s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {todos.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {summaryStats.map(s => (
            <div key={s.label} style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color, marginBottom: 2 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {!hasTasks ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <div style={{ marginBottom: 12, color: 'var(--border-strong)' }}><CheckCircle2 size={36} /></div>
          <p style={{ fontSize: 14, margin: 0 }}>No tasks yet — click <strong style={{ color: 'var(--accent-blue)' }}>New Task</strong> to add one.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '8px 6px' }}>

          {/* Domain grouping */}
          {groupBy === 'domain' && (
            <>
              {domainGroups.length === 0 && (
                <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Nothing pending — nice work</div>
              )}
              {domainGroups.map(({ domain, tasks }) => (
                <DomainSection
                  key={domain ? domain.id : '__general__'}
                  domain={domain}
                  tasks={tasks}
                  domainMap={domainMap}
                  onToggle={onToggleTodo}
                  onDelete={onDeleteTodo}
                  onAdd={() => openAdd(domain?.id || null)}
                />
              ))}
            </>
          )}

          {/* Priority grouping */}
          {groupBy === 'priority' && (
            <>
              {pending.length === 0 && (
                <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Nothing pending — nice work</div>
              )}
              {priorityGroups.map(g => (
                <TaskGroup
                  key={g.key}
                  label={g.label}
                  labelColor={g.color}
                  tasks={g.tasks}
                  domainMap={domainMap}
                  onToggle={onToggleTodo}
                  onDelete={onDeleteTodo}
                />
              ))}
            </>
          )}

          {/* Due date grouping */}
          {groupBy === 'dueDate' && (
            <>
              {pending.length === 0 && (
                <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Nothing pending — nice work</div>
              )}
              {dueDateGroups.map(g => (
                <TaskGroup
                  key={g.key}
                  label={g.label}
                  labelColor={g.color}
                  tasks={g.tasks}
                  domainMap={domainMap}
                  onToggle={onToggleTodo}
                  onDelete={onDeleteTodo}
                  defaultOpen={g.key !== 'none'}
                />
              ))}
            </>
          )}

          {done.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
              <button
                onClick={() => setShowDone(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 14px', color: 'var(--text-muted)', fontSize: 12, width: '100%', textAlign: 'left' }}
              >
                <ChevronDown size={13} style={{ transform: showDone ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
                {done.length} completed
              </button>
              {showDone && done.map(task => (
                <TaskRow key={task.id} task={task} domainMap={domainMap} onToggle={onToggleTodo} onDelete={onDeleteTodo} />
              ))}
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <AddTaskModal
          domains={domains}
          initialDomainId={addForDomain}
          onClose={() => { setShowAdd(false); setAddForDomain(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
