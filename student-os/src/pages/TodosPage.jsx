import { useState, useMemo } from 'react'
import { Plus, X, CheckSquare, Square, Trash2, ChevronDown, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { getAcademicWeek, getBreakForDate } from '../utils/semester'

const PRIORITIES = {
  high:   { label: 'High',   color: '#fb7185' },
  medium: { label: 'Medium', color: '#fbbf24' },
  low:    { label: 'Low',    color: '#34d399' },
}

function PriorityDot({ priority }) {
  const cfg = PRIORITIES[priority] || PRIORITIES.low
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, display: 'inline-block', flexShrink: 0 }} />
}

function WeekBadge({ date }) {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  const brk = getBreakForDate(dateObj)
  const wk  = getAcademicWeek(dateObj)
  if (!brk && wk == null) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      background: brk ? 'rgba(251,191,36,0.12)' : 'rgba(91,140,255,0.12)',
      color: brk ? '#fbbf24' : '#5b8cff',
    }}>
      {brk ? brk.shortName : `W${wk}`}
    </span>
  )
}

// ─── Add task modal ────────────────────────────────────────────────────────────
function AddTaskModal({ domains, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', domainId: '', dueDate: '', priority: 'medium' })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const canSave = form.title.trim()

  const handleSave = () => {
    if (!canSave) return
    onSave({
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: form.title.trim(),
      domainId: form.domainId || null,
      dueDate: form.dueDate || null,
      priority: form.priority,
      done: false,
      createdAt: new Date().toISOString(),
    })
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid #2a2c40', background: '#0f1018',
    color: '#e6e7f0', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#14151e', border: '1px solid #2a2c40', borderRadius: 16, width: 460, maxWidth: '92vw', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', overflow: 'hidden' }}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid #1e2030', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#e6e7f0' }}>New Task</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#1e2030', color: '#7c7e96', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            />
          </div>

          <div>
            <Label>Domain (optional)</Label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.domainId}
              onChange={e => set('domainId', e.target.value)}
            >
              <option value="">— General / No domain —</option>
              {domains.map(d => (
                <option key={d.id} value={d.id}>{d.code ? `${d.code} · ` : ''}{d.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <Label>Due date (optional)</Label>
              <input style={inputStyle} type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
              {form.dueDate && <div style={{ marginTop: 6 }}><WeekBadge date={form.dueDate} /></div>}
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
                      background: form.priority === key ? `${cfg.color}22` : '#1a1b28',
                      color: form.priority === key ? cfg.color : '#7c7e96',
                      outline: form.priority === key ? `1.5px solid ${cfg.color}55` : '1.5px solid transparent',
                      transition: 'all 0.12s',
                    }}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #1e2030', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #2a2c40', background: 'none', color: '#7c7e96', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              background: canSave ? '#5b8cff' : '#1e2030',
              color: canSave ? '#fff' : '#4a4c60',
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

function Label({ children }) {
  return <div style={{ fontSize: 11, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>{children}</div>
}

// ─── Single task row ───────────────────────────────────────────────────────────
function TaskRow({ task, domainMap, onToggle, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const domain = task.domainId ? domainMap[task.domainId] : null

  const isOverdue = task.dueDate && !task.done && (() => {
    const [y, m, d] = task.dueDate.split('-').map(Number)
    return new Date(y, m - 1, d) < new Date(new Date().setHours(0, 0, 0, 0))
  })()

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 9,
        background: hovered ? '#141520' : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <button
        onClick={() => onToggle(task.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: task.done ? '#34d399' : '#4a4c60', flexShrink: 0, display: 'flex' }}
      >
        {task.done ? <CheckSquare size={16} /> : <Square size={16} />}
      </button>

      <PriorityDot priority={task.priority} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 13, color: task.done ? '#4a4c60' : '#e6e7f0',
          textDecoration: task.done ? 'line-through' : 'none',
        }}>
          {task.title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: task.dueDate ? 3 : 0, flexWrap: 'wrap' }}>
          {task.dueDate && (
            <span style={{ fontSize: 11, color: isOverdue ? '#fb7185' : '#4a4c60' }}>
  {isOverdue && <AlertTriangle size={10} style={{ display: 'inline', marginRight: 3 }} />}Due {new Date(...task.dueDate.split('-').map((v, i) => i === 1 ? v - 1 : +v)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
          <WeekBadge date={task.dueDate} />
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
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#4a4c60', flexShrink: 0, display: 'flex' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fb7185'}
          onMouseLeave={e => e.currentTarget.style.color = '#4a4c60'}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

// ─── Domain section ────────────────────────────────────────────────────────────
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
          <span style={{ fontSize: 13, fontWeight: 700, color: domain ? domain.color : '#7c7e96' }}>
            {domain ? (domain.code ? `${domain.code} · ${domain.name}` : domain.name) : 'General'}
          </span>
          {pending > 0 && (
            <span style={{ fontSize: 10, fontWeight: 600, background: domain ? `${domain.color}18` : '#1e2030', color: domain ? domain.color : '#7c7e96', padding: '1px 7px', borderRadius: 10 }}>
              {pending}
            </span>
          )}
          <div style={{ flex: 1, height: 1, background: '#1e2030' }} />
          <ChevronDown size={13} color="#4a4c60" style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
        </button>
        <button
          onClick={onAdd}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: '#4a4c60', display: 'flex' }}
          title="Add task"
          onMouseEnter={e => e.currentTarget.style.color = '#5b8cff'}
          onMouseLeave={e => e.currentTarget.style.color = '#4a4c60'}
        >
          <Plus size={14} />
        </button>
      </div>

      {open && (
        <div>
          {tasks.length === 0 ? (
            <div style={{ padding: '8px 14px', fontSize: 12, color: '#4a4c60', fontStyle: 'italic' }}>
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
  const [showAdd, setShowAdd]         = useState(false)
  const [addForDomain, setAddForDomain] = useState(null)
  const [showDone, setShowDone]       = useState(false)

  const domainMap = useMemo(() => Object.fromEntries(domains.map(d => [d.id, d])), [domains])

  const pending = todos.filter(t => !t.done)
  const done    = todos.filter(t => t.done)

  // Group pending tasks by domain (domains with tasks first, then General)
  const domainsWithTasks = useMemo(() => {
    const grouped = {}
    for (const task of pending) {
      const key = task.domainId || '__general__'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(task)
    }
    // Order: domains in their original order, then general
    const orderedDomainIds = domains.map(d => d.id).filter(id => grouped[id])
    if (grouped['__general__']) orderedDomainIds.push('__general__')
    return orderedDomainIds.map(id => ({
      domain: id === '__general__' ? null : domainMap[id],
      tasks: grouped[id] || [],
    }))
  }, [pending, domains, domainMap])

  const openAdd = (domainId = null) => {
    setAddForDomain(domainId)
    setShowAdd(true)
  }

  const handleSave = (task) => {
    if (addForDomain && !task.domainId) task = { ...task, domainId: addForDomain }
    onAddTodo(task)
  }

  const totalPending = pending.length

  return (
    <div style={{ padding: '36px 40px', maxWidth: 860 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#e6e7f0', letterSpacing: '-0.5px' }}>To Do</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#7c7e96' }}>
            {totalPending === 0 ? 'All caught up' : `${totalPending} task${totalPending !== 1 ? 's' : ''} remaining`}
          </p>
        </div>
        <button
          onClick={() => openAdd()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none', background: '#5b8cff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={14} /> New Task
        </button>
      </div>

      {/* Summary strip */}
      {todos.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          {[
            { label: 'Pending',   value: pending.length,                                      color: '#5b8cff' },
            { label: 'Done',      value: done.length,                                          color: '#34d399' },
            { label: 'High pri',  value: pending.filter(t => t.priority === 'high').length,   color: '#fb7185' },
            { label: 'Overdue',   value: pending.filter(t => {
              if (!t.dueDate) return false
              const [y, m, d] = t.dueDate.split('-').map(Number)
              return new Date(y, m - 1, d) < new Date(new Date().setHours(0, 0, 0, 0))
            }).length, color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: '#14151e', border: '1px solid #1e2030', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color, marginBottom: 2 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#4a4c60', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Task groups */}
      {domainsWithTasks.length === 0 && done.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#4a4c60' }}>
          <div style={{ marginBottom: 12, color: '#2a2c40' }}><CheckCircle2 size={36} /></div>
          <p style={{ fontSize: 14, margin: 0 }}>No tasks yet — click <strong style={{ color: '#5b8cff' }}>New Task</strong> to add one.</p>
        </div>
      ) : (
        <div style={{ background: '#14151e', border: '1px solid #1e2030', borderRadius: 14, padding: '8px 6px' }}>
          {domainsWithTasks.length === 0 && (
            <div style={{ padding: '16px 14px', fontSize: 13, color: '#4a4c60', textAlign: 'center' }}>Nothing pending — nice work</div>
          )}
          {domainsWithTasks.map(({ domain, tasks }) => (
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

          {/* Completed */}
          {done.length > 0 && (
            <div style={{ borderTop: '1px solid #1e2030', marginTop: 8, paddingTop: 8 }}>
              <button
                onClick={() => setShowDone(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 14px', color: '#4a4c60', fontSize: 12, width: '100%', textAlign: 'left' }}
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
          onClose={() => { setShowAdd(false); setAddForDomain(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
