import { useState } from 'react'
import { GraduationCap, Plus, X, ChevronRight, ChevronLeft, Check, Trash2, Pencil, ArrowLeft } from 'lucide-react'
import { DOMAIN_COLORS } from '../data/domains'
import { supabase } from '../lib/supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDow(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr + 'T12:00:00').getDay()
}
function getDowName(dateStr) {
  const n = getDow(dateStr)
  if (n === null) return ''
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][n]
}
function countTeachingWeeks(startStr, endStr, breaks) {
  if (!startStr || !endStr) return null
  const s = new Date(startStr + 'T00:00:00')
  const e = new Date(endStr   + 'T00:00:00')
  if (e <= s) return null
  const totalDays = Math.round((e - s) / 86400000) + 1
  const breakDays = breaks.reduce((sum, b) => {
    if (!b.startMonday || !b.returnMonday) return sum
    return sum + Math.round(
      (new Date(b.returnMonday + 'T00:00:00') - new Date(b.startMonday + 'T00:00:00')) / 86400000
    )
  }, 0)
  const w = Math.round((totalDays - breakDays) / 7)
  return w > 0 ? w : null
}

const YEAR_OPTIONS  = ['1st Year','2nd Year','3rd Year','4th Year','Masters','PhD','Other']
const CATEGORY_OPTS = [
  { id:'academic',     label:'Module / Academic' },
  { id:'project',      label:'Project'           },
  { id:'society',      label:'Society / Club'    },
  { id:'organization', label:'Organisation'      },
  { id:'personal',     label:'Personal'          },
  { id:'other',        label:'Other'             },
]

// ─── Style constants ──────────────────────────────────────────────────────────
const BG      = '#0b0c13'
const SURFACE = '#0f1018'
const BORDER  = '#1e2030'
const ACCENT  = '#5b8cff'
const MUTED   = '#7c7e96'
const TEXT    = '#e8e9f0'
const GREEN   = '#34d399'
const RED     = '#fb7185'
const GRAD_BG = `radial-gradient(ellipse 80% 50% at 15% 5%, rgba(91,140,255,0.08) 0%, transparent 60%),
  radial-gradient(ellipse 60% 50% at 85% 95%, rgba(167,139,250,0.07) 0%, transparent 60%), #0b0c13`

function inputStyle(focused) {
  return {
    width: '100%', padding: '11px 14px',
    background: SURFACE, border: `1px solid ${focused ? ACCENT : BORDER}`,
    borderRadius: 10, color: TEXT, fontSize: 14, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }
}
function labelStyle() {
  return {
    fontSize: 11, fontWeight: 600, color: MUTED,
    letterSpacing: '0.5px', display: 'block', marginBottom: 6, textTransform: 'uppercase',
  }
}

function FocusInput({ value, onChange, onKeyDown, placeholder, type = 'text', autoFocus, style: extra }) {
  const [foc, setFoc] = useState(false)
  return (
    <input
      type={type} value={value} onChange={onChange} onKeyDown={onKeyDown}
      placeholder={placeholder} autoFocus={autoFocus}
      style={{ ...inputStyle(foc), ...extra }}
      onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
    />
  )
}

// ─── Step progress dots ───────────────────────────────────────────────────────
function StepDots({ step, total = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 40 }}>
      {Array.from({ length: total }, (_, i) => i + 1).map(s => (
        <div key={s} style={{
          width: s === step ? 24 : 7, height: 7, borderRadius: 4,
          background: s < step ? GREEN : s === step ? ACCENT : BORDER,
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: s === step ? `0 0 12px ${ACCENT}55` : 'none',
        }} />
      ))}
    </div>
  )
}

function ContinueBtn({ disabled, onClick, label = 'Continue', loading = false, mt = 28 }) {
  return (
    <button
      onClick={onClick} disabled={disabled || loading}
      style={{
        marginTop: mt, width: '100%', padding: '13px 0',
        borderRadius: 11, border: 'none',
        background: disabled || loading ? '#1e2030' : 'linear-gradient(135deg, #5b8cff, #a78bfa)',
        color: disabled || loading ? MUTED : 'white',
        fontSize: 15, fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
    >
      {loading ? 'Setting up…' : <>{label} <ChevronRight size={16} /></>}
    </button>
  )
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '13px 20px', borderRadius: 11, border: `1px solid ${BORDER}`,
      background: 'transparent', color: MUTED, fontSize: 14, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
    }}>
      <ChevronLeft size={16} /> Back
    </button>
  )
}

// ─── Date field with day-of-week validation ────────────────────────────────────
function DateField({ label, value, onChange, required: reqDay, helperText }) {
  const [foc, setFoc]   = useState(false)
  const dow             = getDow(value)
  const dowName         = getDowName(value)
  const isValid         = value ? dow === reqDay : true
  const dayNames        = { 0: 'Sunday', 1: 'Monday', 4: 'Thursday', 5: 'Friday' }

  return (
    <div>
      <label style={labelStyle()}>{label}</label>
      {helperText && <div style={{ fontSize: 12, color: MUTED, marginBottom: 8, lineHeight: 1.5 }}>{helperText}</div>}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="date" value={value} onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle(foc), flex: 1, colorScheme: 'dark' }}
          onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        />
        {value && (
          <div style={{
            padding: '6px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, flexShrink: 0,
            background: isValid ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)',
            color: isValid ? GREEN : RED,
            border: `1px solid ${isValid ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}`,
          }}>
            {isValid
              ? <>{dowName} <Check size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /></>
              : `${dowName} (needs to be a ${dayNames[reqDay]})`}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function OnboardingPage({ userId, onComplete }) {
  const [step,      setStep]      = useState(1)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Step 1
  const [firstName,   setFirstName]   = useState('')
  const [university,  setUniversity]  = useState('')
  const [yearOfStudy, setYearOfStudy] = useState('')
  const [weekStart,   setWeekStart]   = useState('monday')

  // Step 2
  const [semStart, setSemStart] = useState('')
  const [semEnd,   setSemEnd]   = useState('')
  const [breaks,   setBreaks]   = useState([])

  // Step 3 — modules
  const [modules,      setModules]      = useState([])
  const [showAddMod,   setShowAddMod]   = useState(false)
  const [editingModId, setEditingModId] = useState(null)
  const [newMod,       setNewMod]       = useState({ name: '', code: '', color: DOMAIN_COLORS[0], category: 'academic' })

  const isSunThu  = weekStart === 'sunday'
  const startDay  = isSunThu ? 0 : 1
  const endDay    = isSunThu ? 4 : 5
  const breakDay  = isSunThu ? 0 : 1
  const totalWeeks = countTeachingWeeks(semStart, semEnd, breaks)

  const canNext1 = firstName.trim() && yearOfStudy
  const canNext2 = semStart && semEnd
    && getDow(semStart) === startDay && getDow(semEnd) === endDay
    && new Date(semEnd + 'T00:00:00') > new Date(semStart + 'T00:00:00')
    && breaks.every(b => b.name.trim() && b.startMonday && b.returnMonday
      && getDow(b.startMonday) === breakDay && getDow(b.returnMonday) === breakDay
      && new Date(b.returnMonday + 'T00:00:00') > new Date(b.startMonday + 'T00:00:00'))

  // ── Break helpers ─────────────────────────────────────────────────────────
  function addBreak() {
    setBreaks(p => [...p, { id: crypto.randomUUID(), name: '', startMonday: '', returnMonday: '' }])
  }
  function updBreak(id, field, val) {
    setBreaks(p => p.map(b => b.id === id ? { ...b, [field]: val } : b))
  }
  function delBreak(id) { setBreaks(p => p.filter(b => b.id !== id)) }

  // ── Module helpers ────────────────────────────────────────────────────────
  function confirmAddModule() {
    if (!newMod.name.trim()) return
    if (editingModId) {
      setModules(p => p.map(m => m.id === editingModId ? { ...m, ...newMod } : m))
      setEditingModId(null)
    } else {
      const id = crypto.randomUUID()
      setModules(p => [...p, { ...newMod, id, icon: 'BookOpen', credits: null, progress: 0, professor: '' }])
      const nextColor = DOMAIN_COLORS[(modules.length + 1) % DOMAIN_COLORS.length]
      setNewMod({ name: '', code: '', color: nextColor, category: 'academic' })
    }
    setShowAddMod(false)
  }
  function editModule(m) {
    setEditingModId(m.id)
    setNewMod({ name: m.name, code: m.code || '', color: m.color, category: m.category })
    setShowAddMod(true)
  }
  function delModule(id) { setModules(p => p.filter(m => m.id !== id)) }

  // ── Complete onboarding ───────────────────────────────────────────────────
  async function handleComplete() {
    setSaving(true)
    setSaveError(null)
    try {
      await onComplete({
        profile: {
          first_name:     firstName.trim(),
          university:     university.trim() || null,
          year_of_study:  yearOfStudy,
          semester_start: semStart,
          semester_end:   semEnd,
          week_start:     weekStart,
        },
        semBreaks: breaks,
        domains:   modules,
        slots:     [],
      })
    } catch {
      setSaveError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Personal info
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === 1) {
    const displayName = firstName.trim()
    return (
      <Wrap>
        <Logo />
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ position: 'fixed', top: 20, left: 20, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 13, padding: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = TEXT}
          onMouseLeave={e => e.currentTarget.style.color = MUTED}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <StepDots step={1} />

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 10,
            background: 'linear-gradient(135deg, #e8e9f0 0%, #c4b5fd 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {displayName ? `Hi, ${displayName}.` : 'What should we call you?'}
          </div>
          <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
            {displayName
              ? 'Tell us a bit more so we can set things up right.'
              : 'Your name will appear throughout the app.'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <FocusInput
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="Your first name"
            autoFocus
            style={{ fontSize: 16, padding: '13px 16px' }}
          />

          {firstName.trim() && (
            <>
              <div>
                <label style={labelStyle()}>Year of study</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {YEAR_OPTIONS.map(y => (
                    <button key={y} onClick={() => setYearOfStudy(y)} style={{
                      padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                      border: `1px solid ${yearOfStudy === y ? ACCENT : BORDER}`,
                      background: yearOfStudy === y ? 'rgba(91,140,255,0.15)' : 'transparent',
                      color: yearOfStudy === y ? ACCENT : MUTED,
                      fontWeight: yearOfStudy === y ? 700 : 400, transition: 'all 0.15s',
                    }}>{y}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle()}>University <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(optional)</span></label>
                <FocusInput
                  value={university} onChange={e => setUniversity(e.target.value)}
                  placeholder="e.g. University College London"
                />
              </div>

              <div>
                <label style={labelStyle()}>Weekly schedule</label>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>When does your university week run?</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { id: 'monday', label: 'Monday – Friday',    sub: 'Standard week' },
                    { id: 'sunday', label: 'Sunday – Thursday',  sub: 'Middle East / Gulf' },
                  ].map(opt => (
                    <button
                      key={opt.id} onClick={() => setWeekStart(opt.id)}
                      style={{
                        flex: 1, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        border: `1px solid ${weekStart === opt.id ? ACCENT : BORDER}`,
                        background: weekStart === opt.id ? 'rgba(91,140,255,0.12)' : 'transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: weekStart === opt.id ? 700 : 500, color: weekStart === opt.id ? ACCENT : TEXT, marginBottom: 2 }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: 11, color: MUTED }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <ContinueBtn disabled={!canNext1} onClick={() => setStep(2)} />
      </Wrap>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Semester
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === 2) {
    return (
      <Wrap>
        <Logo />
        <StepDots step={2} />
        <Heading>When's your semester, {firstName}?</Heading>
        <Sub>We'll use this to calculate academic weeks and fill in your calendar automatically.</Sub>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 32 }}>
          <DateField
            label="Semester start"
            helperText={isSunThu ? 'The first Sunday of term, when teaching begins.' : 'The first Monday of term, when teaching begins.'}
            value={semStart} onChange={setSemStart} required={startDay}
          />
          <DateField
            label="Semester end"
            helperText={isSunThu ? 'The last Thursday of term, the final day of teaching.' : 'The last Friday of term, the final day of teaching.'}
            value={semEnd} onChange={setSemEnd} required={endDay}
          />

          {semStart && semEnd && getDow(semStart) === startDay && getDow(semEnd) === endDay && (
            <div style={{
              padding: '12px 16px', borderRadius: 10,
              background: 'rgba(91,140,255,0.08)', border: '1px solid rgba(91,140,255,0.2)',
              fontSize: 13, color: ACCENT, fontWeight: 500,
            }}>
              {totalWeeks
                ? `${totalWeeks} teaching week${totalWeeks !== 1 ? 's' : ''}${breaks.length ? ` (excluding ${breaks.length} break${breaks.length > 1 ? 's' : ''})` : ''}`
                : 'Check your dates, end must be after start.'}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: breaks.length ? 12 : 0 }}>
              <label style={labelStyle()}>Breaks <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(optional)</span></label>
              <button onClick={addBreak} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 20, border: `1px solid ${BORDER}`,
                background: 'transparent', color: MUTED, fontSize: 12, cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED }}
              >
                <Plus size={12} /> Add break
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {breaks.map((b, i) => {
                const bWeeks = b.startMonday && b.returnMonday
                  ? Math.round((new Date(b.returnMonday + 'T00:00:00') - new Date(b.startMonday + 'T00:00:00')) / 604800000)
                  : null
                return (
                  <div key={b.id} style={{ padding: 16, borderRadius: 12, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.015)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Break {i + 1}</span>
                      <button onClick={() => delBreak(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex', padding: 2 }}>
                        <X size={14} />
                      </button>
                    </div>
                    <div>
                      <label style={labelStyle()}>Break name</label>
                      <FocusInput value={b.name} onChange={e => updBreak(b.id, 'name', e.target.value)} placeholder="e.g. Easter Break, Reading Week" />
                    </div>
                    <DateField
                      label={isSunThu ? 'First Sunday of break' : 'First Monday of break'}
                      helperText={isSunThu ? "The Sunday teaching stops." : "The Monday teaching stops."}
                      value={b.startMonday} onChange={v => updBreak(b.id, 'startMonday', v)} required={breakDay}
                    />
                    <DateField
                      label={isSunThu ? 'First Sunday back' : 'First Monday back'}
                      helperText={isSunThu ? 'The Sunday lectures resume.' : 'The Monday lectures resume.'}
                      value={b.returnMonday} onChange={v => updBreak(b.id, 'returnMonday', v)} required={breakDay}
                    />
                    {bWeeks !== null && bWeeks > 0 && (
                      <div style={{ fontSize: 12, color: GREEN, fontWeight: 500 }}>→ {bWeeks}-week break</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <BackBtn onClick={() => setStep(1)} />
          <div style={{ flex: 1 }}>
            <ContinueBtn mt={0} disabled={!canNext2} onClick={() => setStep(3)} />
          </div>
        </div>
      </Wrap>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — Modules (optional)
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === 3) return (
    <Wrap>
      <Logo />
      <StepDots step={3} />
      <Heading>What are you studying?</Heading>
      <Sub>Add your modules below, or skip this and add them later from the app.</Sub>

      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {modules.map(m => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            borderRadius: 10, background: SURFACE,
            border: `1px solid ${BORDER}`, borderLeft: `3px solid ${m.color}`,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{m.name}</div>
              {m.code && <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{m.code}</div>}
            </div>
            <button onClick={() => editModule(m)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex', padding: 4 }}>
              <Pencil size={13} />
            </button>
            <button onClick={() => delModule(m.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex', padding: 4 }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {showAddMod ? (
          <div style={{ padding: 16, borderRadius: 12, border: `1px solid rgba(91,140,255,0.3)`, background: SURFACE, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle()}>Module name</label>
              <FocusInput value={newMod.name} onChange={e => setNewMod(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Algorithms & Data Structures" autoFocus />
            </div>
            <div>
              <label style={labelStyle()}>Module code <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(optional)</span></label>
              <FocusInput value={newMod.code} onChange={e => setNewMod(p => ({ ...p, code: e.target.value }))} placeholder="e.g. CS301" />
            </div>

            <div>
              <label style={labelStyle()}>Category</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORY_OPTS.map(c => (
                  <button key={c.id} onClick={() => setNewMod(p => ({ ...p, category: c.id }))} style={{
                    padding: '6px 12px', borderRadius: 20,
                    border: `1px solid ${newMod.category === c.id ? ACCENT : BORDER}`,
                    background: newMod.category === c.id ? 'rgba(91,140,255,0.12)' : 'transparent',
                    color: newMod.category === c.id ? ACCENT : MUTED,
                    fontSize: 12, fontWeight: newMod.category === c.id ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s',
                  }}>{c.label}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle()}>Colour</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {DOMAIN_COLORS.map(c => (
                  <button key={c} onClick={() => setNewMod(p => ({ ...p, color: c }))} style={{
                    width: 24, height: 24, borderRadius: '50%', background: c, border: 'none',
                    cursor: 'pointer', outline: newMod.color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2, transition: 'outline 0.1s',
                  }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={confirmAddModule} disabled={!newMod.name.trim()} style={{
                flex: 1, padding: '10px 0', borderRadius: 9, border: 'none',
                background: newMod.name.trim() ? ACCENT : BORDER,
                color: newMod.name.trim() ? 'white' : MUTED,
                fontSize: 13, fontWeight: 600, cursor: newMod.name.trim() ? 'pointer' : 'not-allowed',
              }}>{editingModId ? 'Save changes' : 'Add module'}</button>
              <button onClick={() => { setShowAddMod(false); setEditingModId(null) }} style={{
                padding: '10px 16px', borderRadius: 9, border: `1px solid ${BORDER}`,
                background: 'transparent', color: MUTED, fontSize: 13, cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditingModId(null)
              setNewMod({ name: '', code: '', color: DOMAIN_COLORS[modules.length % DOMAIN_COLORS.length], category: 'academic' })
              setShowAddMod(true)
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px', borderRadius: 10, border: `1px dashed ${BORDER}`,
              background: 'transparent', color: MUTED, fontSize: 13, cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED }}
          >
            <Plus size={15} /> Add a module
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
        <BackBtn onClick={() => setStep(2)} />
        <div style={{ flex: 1 }}>
          <ContinueBtn
            mt={0}
            onClick={handleComplete}
            label={modules.length ? "Let's go" : 'Skip for now'}
            loading={saving}
          />
        </div>
      </div>
      {saveError && <div style={{ marginTop: 12, fontSize: 13, color: RED, textAlign: 'center' }}>{saveError}</div>}
      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: MUTED }}>
        You can add modules and build your schedule anytime from the app.
      </div>
    </Wrap>
  )

  return null
}

// ─── Layout helpers ───────────────────────────────────────────────────────────
function Wrap({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: GRAD_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {children}
      </div>
    </div>
  )
}

function Logo() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: -6, borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(91,140,255,0.25), rgba(167,139,250,0.2))',
          filter: 'blur(10px)',
        }} />
        <div style={{
          position: 'relative', width: 48, height: 48,
          background: 'linear-gradient(135deg, #5b8cff, #a78bfa)',
          borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <GraduationCap size={22} color="white" />
        </div>
      </div>
    </div>
  )
}

function Heading({ children }) {
  return (
    <div style={{
      fontSize: 26, fontWeight: 800, lineHeight: 1.25, textAlign: 'center', marginBottom: 8,
      background: 'linear-gradient(135deg, #e8e9f0 0%, #c4b5fd 100%)',
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
    }}>
      {children}
    </div>
  )
}

function Sub({ children }) {
  return <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, textAlign: 'center' }}>{children}</div>
}
