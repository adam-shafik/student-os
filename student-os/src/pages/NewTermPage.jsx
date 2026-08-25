import { useState, useMemo } from 'react'
import { CalendarPlus, Plus, Trash2, X, ArrowRight, ArrowLeft, Check, Loader2, GraduationCap, RefreshCw, BookOpen } from 'lucide-react'
import { DOMAIN_CATEGORIES, DOMAIN_COLORS, getDomainIcon } from '../data/domains'

const IconFor = key => getDomainIcon(key) || BookOpen

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_FULL = { 0: 'Sunday', 1: 'Monday', 4: 'Thursday', 5: 'Friday' }
function getDow(str) { return str ? new Date(str + 'T12:00:00').getDay() : null }
function dowName(str) { const d = getDow(str); return d != null ? DOW[d] : '' }
function uid() { return crypto.randomUUID() }

function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        {label}{hint && <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, opacity: 0.6 }}> · {hint}</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-strong)',
  background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 13,
  outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
}

function TextInput(props) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...(props.style || {}) }}
      onFocus={e => { e.target.style.borderColor = 'var(--border-focus)' }}
      onBlur={e => { e.target.style.borderColor = 'var(--border-strong)' }}
    />
  )
}

function DowBadge({ value, expected }) {
  if (!value) return null
  const ok = getDow(value) === expected
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: '4px 9px', borderRadius: 6, flexShrink: 0,
      background: ok ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)',
      color: ok ? '#34d399' : '#fb7185',
      border: `1px solid ${ok ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}`,
    }}>{dowName(value)}</span>
  )
}

export default function NewTermPage({ domains = [], currentTerm, weekStartSunday = false, yearOfStudy = '', onCancel, onSubmit }) {
  const startDay = weekStartSunday ? 0 : 1
  const endDay   = weekStartSunday ? 4 : 5
  const breakDay = startDay

  const [step, setStep] = useState(1)
  const [label, setLabel] = useState('')
  const [start, setStart] = useState('')
  const [end,   setEnd]   = useState('')
  const [breaks, setBreaks] = useState([])
  const [modules, setModules] = useState([])
  const [newMod, setNewMod] = useState({ name: '', code: '', category: 'academic', color: DOMAIN_COLORS[0] })
  const [carry, setCarry] = useState(() => new Set())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const carryCandidates = useMemo(
    () => domains.filter(d => !d.isPast && d.category !== 'academic' && (!currentTerm || d.termId === currentTerm.id)),
    [domains, currentTerm]
  )

  const addBreak = () => setBreaks(p => [...p, { id: uid(), name: '', startMonday: '', returnMonday: '' }])
  const updBreak = (id, k, v) => setBreaks(p => p.map(b => b.id === id ? { ...b, [k]: v } : b))
  const delBreak = id => setBreaks(p => p.filter(b => b.id !== id))

  function confirmAddModule() {
    if (!newMod.name.trim()) return
    setModules(p => [...p, { ...newMod, id: uid(), name: newMod.name.trim(), code: newMod.code.trim() || null, icon: 'BookOpen' }])
    setNewMod({ name: '', code: '', category: 'academic', color: DOMAIN_COLORS[(modules.length + 1) % DOMAIN_COLORS.length] })
  }
  const delModule = id => setModules(p => p.filter(m => m.id !== id))
  const toggleCarry = id => setCarry(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  function validateDates() {
    if (!start || !end) return 'Start and end dates are required'
    if (getDow(start) !== startDay) return `Semester start must be a ${DOW_FULL[startDay]}`
    if (getDow(end) !== endDay)     return `Semester end must be a ${DOW_FULL[endDay]}`
    if (start >= end) return 'End date must be after the start date'
    const bad = breaks.find(b => !b.name.trim() || !b.startMonday || !b.returnMonday)
    if (bad) return 'Every break needs a name and both dates'
    const badDow = breaks.find(b => getDow(b.startMonday) !== breakDay || getDow(b.returnMonday) !== breakDay)
    if (badDow) return `Break dates must be ${DOW_FULL[breakDay]}s`
    return ''
  }

  function goNext() {
    const err = validateDates()
    if (err) { setError(err); return }
    setError(''); setStep(2)
  }

  async function handleFinish() {
    if (!modules.length && carry.size === 0) { setError('Add at least one module, or carry one over'); return }
    setBusy(true); setError('')
    const res = await onSubmit?.({
      label: label.trim() || 'New Semester',
      start, end,
      breaks: breaks.map(b => ({ name: b.name.trim(), startMonday: b.startMonday, returnMonday: b.returnMonday })),
      modules: modules.map(m => ({ name: m.name, code: m.code, category: m.category, color: m.color, icon: m.icon })),
      carryOverIds: [...carry],
    })
    if (res?.error) { setBusy(false); setError(res.error.message || 'Something went wrong'); return }
    // onSubmit navigates away on success.
  }

  const navBtn = (primary) => ({
    display: 'flex', alignItems: 'center', gap: 7, padding: '11px 22px', borderRadius: 10,
    border: primary ? 'none' : '1px solid var(--border-strong)',
    background: primary ? 'var(--accent-amber)' : 'transparent',
    color: primary ? '#241a03' : 'var(--text-secondary)',
    fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
    opacity: busy ? 0.7 : 1, transition: 'filter 0.15s, transform 0.15s',
  })

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg-page)' }}>
      <div style={{ maxWidth: 660, margin: '0 auto', padding: '40px 28px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarPlus size={22} color="var(--accent-amber)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Start a new semester</h1>
            <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Set the new dates and modules. Your current semester and everything in it stays saved and viewable.
            </p>
          </div>
          <button className="btn-press" onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 6, borderRadius: 8, flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2].map(n => (
            <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: step >= n ? 'var(--accent-amber)' : 'var(--border-strong)', transition: 'background 0.2s' }} />
          ))}
        </div>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>1 · Semester dates</div>

            <Field label="Semester name" hint="shown on the calendar">
              <TextInput value={label} onChange={e => setLabel(e.target.value)} placeholder={yearOfStudy ? `e.g. ${yearOfStudy} · Semester 1` : 'e.g. Year 2 · Semester 1'} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label={`Start (${DOW_FULL[startDay]})`}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <TextInput type="date" value={start} onChange={e => setStart(e.target.value)} style={{ colorScheme: 'dark' }} />
                  <DowBadge value={start} expected={startDay} />
                </div>
              </Field>
              <Field label={`End (${DOW_FULL[endDay]})`}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <TextInput type="date" value={end} onChange={e => setEnd(e.target.value)} style={{ colorScheme: 'dark' }} />
                  <DowBadge value={end} expected={endDay} />
                </div>
              </Field>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Breaks</span>
                <button className="btn-press" onClick={addBreak} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Plus size={11} /> Add break
                </button>
              </div>
              {breaks.length === 0 && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>No breaks — add reading weeks or holidays if you have any.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {breaks.map(b => (
                  <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                    <Field label="Name"><TextInput value={b.name} onChange={e => updBreak(b.id, 'name', e.target.value)} placeholder="Reading Week" /></Field>
                    <Field label={`Starts (${DOW_FULL[breakDay]})`}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <TextInput type="date" value={b.startMonday} onChange={e => updBreak(b.id, 'startMonday', e.target.value)} style={{ colorScheme: 'dark' }} />
                        <DowBadge value={b.startMonday} expected={breakDay} />
                      </div>
                    </Field>
                    <Field label={`Resumes (${DOW_FULL[breakDay]})`}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <TextInput type="date" value={b.returnMonday} onChange={e => updBreak(b.id, 'returnMonday', e.target.value)} style={{ colorScheme: 'dark' }} />
                        <DowBadge value={b.returnMonday} expected={breakDay} />
                      </div>
                    </Field>
                    <button className="btn-press" onClick={() => delBreak(b.id)} style={{ width: 32, height: 36, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>2 · Modules</div>

            {/* Added modules */}
            {modules.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {modules.map(m => {
                  const Icon = IconFor(m.icon)
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${m.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={15} color={m.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{[m.code, DOMAIN_CATEGORIES[m.category]?.label].filter(Boolean).join(' · ')}</div>
                      </div>
                      <button className="btn-press" onClick={() => delModule(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 5, borderRadius: 6 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add module form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 12, border: '1px dashed var(--border-strong)', background: 'var(--bg-surface)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <Field label="Module name"><TextInput value={newMod.name} onChange={e => setNewMod(m => ({ ...m, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && confirmAddModule()} placeholder="e.g. Machine Learning" /></Field>
                <Field label="Code" hint="optional"><TextInput value={newMod.code} onChange={e => setNewMod(m => ({ ...m, code: e.target.value }))} onKeyDown={e => e.key === 'Enter' && confirmAddModule()} placeholder="CS402" /></Field>
              </div>
              <Field label="Type">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(DOMAIN_CATEGORIES).map(([key, cat]) => {
                    const active = newMod.category === key
                    return (
                      <button key={key} className="btn-press" onClick={() => setNewMod(m => ({ ...m, category: key }))} style={{
                        padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: active ? 600 : 400,
                        border: `1px solid ${active ? cat.color : 'var(--border-strong)'}`,
                        background: active ? `${cat.color}1c` : 'transparent',
                        color: active ? cat.color : 'var(--text-secondary)', transition: 'all 0.12s',
                      }}>{cat.label}</button>
                    )
                  })}
                </div>
              </Field>
              <Field label="Colour">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {DOMAIN_COLORS.map(c => (
                    <button key={c} className="btn-press" onClick={() => setNewMod(m => ({ ...m, color: c }))} style={{
                      width: 26, height: 26, borderRadius: 7, background: c, cursor: 'pointer', flexShrink: 0,
                      border: newMod.color === c ? '2.5px solid var(--text-primary)' : '2px solid transparent',
                      transform: newMod.color === c ? 'scale(1.12)' : 'scale(1)', transition: 'transform 0.12s',
                    }} />
                  ))}
                </div>
              </Field>
              <button className="btn-press" onClick={confirmAddModule} disabled={!newMod.name.trim()} style={{
                alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                border: 'none', background: newMod.name.trim() ? 'var(--accent-blue)' : 'var(--bg-overlay)',
                color: newMod.name.trim() ? 'var(--btn-primary-text, #fff)' : 'var(--text-muted)',
                fontSize: 13, fontWeight: 600, cursor: newMod.name.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
              }}>
                <Plus size={14} /> Add module
              </button>
            </div>

            {/* Carry-over */}
            {carryCandidates.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <RefreshCw size={13} color="var(--accent-green)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Carry over</span>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Keep these ongoing domains (societies, projects) in the new semester. Your academic modules always reset.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {carryCandidates.map(d => {
                    const on = carry.has(d.id)
                    const Icon = IconFor(d.icon)
                    return (
                      <button key={d.id} className="btn-press" onClick={() => toggleCarry(d.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', width: '100%',
                        border: `1px solid ${on ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`,
                        background: on ? 'rgba(52,211,153,0.08)' : 'var(--bg-surface)', fontFamily: 'inherit', transition: 'all 0.12s',
                      }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${d.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={15} color={d.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{DOMAIN_CATEGORIES[d.category]?.label || 'Domain'}</div>
                        </div>
                        <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${on ? 'var(--accent-green)' : 'var(--border-strong)'}`, background: on ? 'var(--accent-green)' : 'transparent' }}>
                          {on && <Check size={13} color="#052e1a" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '11px 13px', borderRadius: 10, background: 'rgba(91,140,255,0.06)', border: '1px solid rgba(91,140,255,0.18)' }}>
              <GraduationCap size={15} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                After this you'll set the weekly timetable for these modules. Last semester's modules move to your Past section, keeping their notes, grades, and calendar history.
              </span>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '10px 13px', borderRadius: 9, background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.25)', color: '#fb7185', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Footer nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
          <button className="btn-press" onClick={step === 1 ? onCancel : () => { setError(''); setStep(1) }} disabled={busy} style={navBtn(false)}>
            {step === 1 ? 'Cancel' : <><ArrowLeft size={15} /> Back</>}
          </button>
          {step === 1 ? (
            <button className="btn-press" onClick={goNext} style={navBtn(true)}>Continue <ArrowRight size={15} /></button>
          ) : (
            <button className="btn-press" onClick={handleFinish} disabled={busy} style={navBtn(true)}>
              {busy ? <><Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> Creating…</> : <>Create & set timetable <ArrowRight size={15} /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
