import { useState } from 'react'
import { GraduationCap, Plus, X, ChevronRight, ChevronLeft, Check, Trash2, Pencil } from 'lucide-react'
import { DOMAIN_COLORS } from '../data/domains'

// ─── Schedule grid constants ──────────────────────────────────────────────────
const GRID_START  = 8
const GRID_END    = 21
const CELL_H      = 26
const TOTAL_SLOTS = (GRID_END - GRID_START) * 2
const DAYS_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const DAYS_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu']

// ─── Session type presets ─────────────────────────────────────────────────────
const SESSION_TYPE_PRESETS = [
  { id: 'lecture',  label: 'Lecture',         color: '#5b8cff' },
  { id: 'lab',      label: 'Lab / Practical',  color: '#a78bfa' },
  { id: 'tutorial', label: 'Tutorial',         color: '#4ade80' },
  { id: 'seminar',  label: 'Seminar',          color: '#fb923c' },
  { id: 'workshop', label: 'Workshop',         color: '#38bdf8' },
  { id: 'group',    label: 'Group Meeting',    color: '#e879f9' },
]
const CUSTOM_TYPE_COLORS = ['#f59e0b', '#ef4444', '#6366f1', '#10b981', '#f97316', '#8b5cf6']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeToSlot(time) {
  const [h, m] = time.split(':').map(Number)
  return (h - GRID_START) * 2 + (m >= 30 ? 1 : 0)
}
function slotToTime(slot) {
  const mins = GRID_START * 60 + slot * 30
  const h    = Math.floor(mins / 60)
  const m    = mins % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}
function fmtTime(time) {
  const [h, m] = time.split(':').map(Number)
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2,'0')}` : ''}${h >= 12 ? 'pm' : 'am'}`
}
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
const DURATION_OPTS = [{ label:'30 min', v:30 },{ label:'1 hour', v:60 },{ label:'1.5 hrs', v:90 },{ label:'2 hours', v:120 }]
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
function StepDots({ step, totalSteps }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 40 }}>
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
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

// ─── Continue button ──────────────────────────────────────────────────────────
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
      {loading ? 'Saving…' : <>{label} <ChevronRight size={16} /></>}
    </button>
  )
}

// ─── Date field with Monday/Friday validation ─────────────────────────────────
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
              : `${dowName} — pick a ${dayNames[reqDay]}`}
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
  const [weekStart,   setWeekStart]   = useState('monday') // 'monday' | 'sunday'

  // Step 2
  const [semStart, setSemStart] = useState('')
  const [semEnd,   setSemEnd]   = useState('')
  const [breaks,   setBreaks]   = useState([])

  // Step 3 — session types
  const [sessionTypes,    setSessionTypes]    = useState(
    SESSION_TYPE_PRESETS.filter(t => ['lecture', 'lab'].includes(t.id))
  )
  const [customTypeInput, setCustomTypeInput] = useState('')

  // Step 3 — modules
  const [modules,      setModules]      = useState([])
  const [showAddMod,   setShowAddMod]   = useState(false)
  const [editingModId, setEditingModId] = useState(null)
  const [newMod,       setNewMod]       = useState({ name: '', code: '', professor: '', color: DOMAIN_COLORS[0], category: 'academic' })

  // Step 4
  const [scheduleSlots, setScheduleSlots] = useState([])
  const [pendingSlot,   setPendingSlot]   = useState(null)
  const [pickDomainId,  setPickDomainId]  = useState('')
  const [pickType,      setPickType]      = useState(SESSION_TYPE_PRESETS[0].id)
  const [pickDuration,  setPickDuration]  = useState(60)
  const [pickWeekFrom,  setPickWeekFrom]  = useState(null)
  const [pickWeekTo,    setPickWeekTo]    = useState(null)
  const [pickLocation,  setPickLocation]  = useState('')

  const hasModules = modules.length > 0
  const totalSteps = hasModules ? 4 : 3
  const totalWeeks = countTeachingWeeks(semStart, semEnd, breaks)

  // Effective session types for slot picker — fall back to all presets if none selected
  const effectiveTypes = sessionTypes.length > 0 ? sessionTypes : SESSION_TYPE_PRESETS

  // Week structure derived values
  const isSunThu  = weekStart === 'sunday'
  const DAYS_SHORT = isSunThu ? DAYS_SUN : DAYS_MON
  const startDay  = isSunThu ? 0 : 1  // 0=Sun, 1=Mon
  const endDay    = isSunThu ? 4 : 5  // 4=Thu, 5=Fri
  const breakDay  = isSunThu ? 0 : 1  // first day of break week

  // ── Validation ────────────────────────────────────────────────────────────
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

  // ── Session type helpers ──────────────────────────────────────────────────
  function togglePresetType(preset) {
    const exists = sessionTypes.some(t => t.id === preset.id)
    setSessionTypes(p => exists ? p.filter(t => t.id !== preset.id) : [...p, preset])
  }
  function addCustomType() {
    const label = customTypeInput.trim()
    if (!label) return
    const id = label.toLowerCase().replace(/\s+/g, '-')
    if (sessionTypes.some(t => t.id === id)) { setCustomTypeInput(''); return }
    const color = CUSTOM_TYPE_COLORS[sessionTypes.length % CUSTOM_TYPE_COLORS.length]
    setSessionTypes(p => [...p, { id, label, color, custom: true }])
    setCustomTypeInput('')
  }

  // ── Module helpers ────────────────────────────────────────────────────────
  function confirmAddModule() {
    if (!newMod.name.trim()) return
    if (editingModId) {
      setModules(p => p.map(m => m.id === editingModId ? { ...m, ...newMod } : m))
      setEditingModId(null)
    } else {
      const id = crypto.randomUUID()
      setModules(p => [...p, { ...newMod, id, icon: 'BookOpen', credits: null, progress: 0 }])
      const nextColor = DOMAIN_COLORS[(modules.length + 1) % DOMAIN_COLORS.length]
      setNewMod({ name: '', code: '', professor: '', color: nextColor, category: 'academic' })
    }
    setShowAddMod(false)
  }
  function editModule(m) {
    setEditingModId(m.id)
    setNewMod({ name: m.name, code: m.code || '', professor: m.professor || '', color: m.color, category: m.category })
    setShowAddMod(true)
  }
  function delModule(id) {
    setModules(p => p.filter(m => m.id !== id))
    setScheduleSlots(p => p.filter(s => s.domainId !== id))
  }

  // ── Schedule slot helpers ─────────────────────────────────────────────────
  function openSlotPicker(dayOfWeek, slotIndex) {
    const occupied = scheduleSlots.some(s => {
      if (s.dayOfWeek !== dayOfWeek) return false
      const sStart = timeToSlot(s.startTime)
      return slotIndex >= sStart && slotIndex < sStart + s.durationMinutes / 30
    })
    if (occupied) return
    setPendingSlot({ dayOfWeek, slotIndex })
    setPickDomainId(modules[0]?.id || '')
    setPickType(effectiveTypes[0]?.id || 'lecture')
    setPickDuration(60)
    setPickWeekFrom(null)
    setPickWeekTo(null)
    setPickLocation('')
  }
  function confirmSlot() {
    if (!pendingSlot || !pickDomainId) return
    const { dayOfWeek, slotIndex } = pendingSlot
    const slotsNeeded = pickDuration / 30
    const endSlot     = slotIndex + slotsNeeded
    if (endSlot > TOTAL_SLOTS) return
    const hasOverlap = scheduleSlots.some(s => {
      if (s.dayOfWeek !== dayOfWeek) return false
      const sStart = timeToSlot(s.startTime)
      const sEnd   = sStart + s.durationMinutes / 30
      return slotIndex < sEnd && endSlot > sStart
    })
    if (hasOverlap) return
    setScheduleSlots(p => [...p, {
      id: crypto.randomUUID(),
      domainId: pickDomainId,
      dayOfWeek,
      startTime: slotToTime(slotIndex),
      durationMinutes: pickDuration,
      slotType: pickType,
      weekFrom: pickWeekFrom || null,
      weekTo:   pickWeekTo   || null,
      location: pickLocation.trim() || null,
    }])
    setPendingSlot(null)
  }
  function delSlot(id) { setScheduleSlots(p => p.filter(s => s.id !== id)) }

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
        slots:     scheduleSlots,
      })
    } catch {
      setSaveError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Personal Info
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === 1) return (
    <Wrap>
      <Logo />
      <StepDots step={1} totalSteps={totalSteps} />
      <Heading>Let's get to know you</Heading>
      <Sub>A few quick things to make StudentOS feel like yours.</Sub>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 32 }}>
        <div>
          <label style={labelStyle()}>First name *</label>
          <FocusInput
            value={firstName} onChange={e => setFirstName(e.target.value)}
            placeholder="What should we call you?" autoFocus
          />
        </div>

        <div>
          <label style={labelStyle()}>Year of study *</label>
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
          <label style={labelStyle()}>Weekly schedule *</label>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 10, lineHeight: 1.5 }}>
            When does your university week run?
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { id: 'monday', label: 'Monday – Friday', sub: 'Standard week' },
              { id: 'sunday', label: 'Sunday – Thursday', sub: 'Middle East / Gulf' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setWeekStart(opt.id)}
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
      </div>

      <ContinueBtn disabled={!canNext1} onClick={() => setStep(2)} />
    </Wrap>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Semester Setup
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === 2) {
    const weeks = countTeachingWeeks(semStart, semEnd, breaks)
    return (
      <Wrap>
        <Logo />
        <StepDots step={2} totalSteps={totalSteps} />
        <Heading>When's your semester?</Heading>
        <Sub>We'll use this to calculate academic weeks and auto-fill your whole calendar.</Sub>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 32 }}>
          <DateField
            label="Semester start *"
            helperText={isSunThu ? 'The first Sunday of term — when teaching begins.' : 'The first Monday of term — when teaching begins.'}
            value={semStart} onChange={setSemStart} required={startDay}
          />
          <DateField
            label="Semester end *"
            helperText={isSunThu ? 'The last Thursday of term — the final day of teaching.' : 'The last Friday of term — the final day of teaching.'}
            value={semEnd} onChange={setSemEnd} required={endDay}
          />

          {semStart && semEnd && getDow(semStart) === startDay && getDow(semEnd) === endDay && (
            <div style={{
              padding: '12px 16px', borderRadius: 10,
              background: 'rgba(91,140,255,0.08)', border: `1px solid rgba(91,140,255,0.2)`,
              fontSize: 13, color: ACCENT, fontWeight: 500,
            }}>
              {weeks
                ? `${weeks} teaching week${weeks !== 1 ? 's' : ''}${breaks.length ? ` (excluding ${breaks.length} break${breaks.length > 1 ? 's' : ''})` : ''}`
                : 'Check your dates — end must be after start.'}
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
                      helperText={isSunThu ? "The day teaching stops — the first Sunday you're off." : "The day teaching stops — the first Monday you're off."}
                      value={b.startMonday} onChange={v => updBreak(b.id, 'startMonday', v)} required={breakDay}
                    />
                    <DateField
                      label={isSunThu ? 'First Sunday back' : 'First Monday back'}
                      helperText={isSunThu ? 'The Sunday lectures resume — set your alarm.' : 'The Monday lectures resume — set your alarm.'}
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
          <button onClick={() => setStep(1)} style={{
            padding: '13px 20px', borderRadius: 11, border: `1px solid ${BORDER}`,
            background: 'transparent', color: MUTED, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          }}>
            <ChevronLeft size={16} /> Back
          </button>
          <div style={{ flex: 1 }}>
            <ContinueBtn mt={0} disabled={!canNext2} onClick={() => setStep(3)} />
          </div>
        </div>
      </Wrap>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — Session Types + Modules
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === 3) return (
    <Wrap wide>
      <Logo />
      <StepDots step={3} totalSteps={totalSteps} />
      <Heading>What's in your week, {firstName}?</Heading>
      <Sub>Tell us about your timetable — we'll use it to set up your schedule.</Sub>

      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Session types */}
        <div style={{ padding: 20, borderRadius: 14, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.015)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 4 }}>
            What kinds of sessions do you have?
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
            Toggle the ones that apply — most students have lectures, but your timetable might have seminars, tutorials, or something else entirely.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {SESSION_TYPE_PRESETS.map(preset => {
              const selected = sessionTypes.some(t => t.id === preset.id)
              return (
                <button key={preset.id} onClick={() => togglePresetType(preset)} style={{
                  padding: '7px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                  border: `1px solid ${selected ? preset.color : BORDER}`,
                  background: selected ? `${preset.color}18` : 'transparent',
                  color: selected ? preset.color : MUTED,
                  fontWeight: selected ? 600 : 400, transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {selected && <Check size={11} />}
                  {preset.label}
                </button>
              )
            })}
            {sessionTypes.filter(t => t.custom).map(t => (
              <button key={t.id} onClick={() => setSessionTypes(p => p.filter(s => s.id !== t.id))} style={{
                padding: '7px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                border: `1px solid ${t.color}`,
                background: `${t.color}18`,
                color: t.color,
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {t.label} <X size={10} />
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <FocusInput
              value={customTypeInput}
              onChange={e => setCustomTypeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomType()}
              placeholder="Something else? e.g. Office Hours, Guest Lecture…"
              style={{ flex: 1, fontSize: 13, padding: '9px 12px' }}
            />
            <button
              onClick={addCustomType} disabled={!customTypeInput.trim()}
              style={{
                padding: '9px 16px', borderRadius: 9, flexShrink: 0,
                border: `1px solid ${customTypeInput.trim() ? ACCENT : BORDER}`,
                background: customTypeInput.trim() ? 'rgba(91,140,255,0.12)' : 'transparent',
                color: customTypeInput.trim() ? ACCENT : MUTED,
                fontSize: 13, fontWeight: 600,
                cursor: customTypeInput.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
              }}
            >Add</button>
          </div>
        </div>

        {/* Modules */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 4 }}>Your modules this semester</div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
            These get linked to your schedule and calendar. You can always add more later from the Domains page.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {modules.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                borderRadius: 10, background: SURFACE,
                border: `1px solid ${BORDER}`, borderLeft: `3px solid ${m.color}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>
                    {[m.code && `${m.code}`, m.professor].filter(Boolean).join(' · ') || m.category}
                  </div>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle()}>Module name *</label>
                    <FocusInput value={newMod.name} onChange={e => setNewMod(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Algorithms & Data Structures" autoFocus />
                  </div>
                  <div>
                    <label style={labelStyle()}>Module code</label>
                    <FocusInput value={newMod.code} onChange={e => setNewMod(p => ({ ...p, code: e.target.value }))} placeholder="e.g. CS301" />
                  </div>
                  <div>
                    <label style={labelStyle()}>Lecturer</label>
                    <FocusInput value={newMod.professor} onChange={e => setNewMod(p => ({ ...p, professor: e.target.value }))} placeholder="e.g. Dr. Smith" />
                  </div>
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
              <button onClick={() => { setEditingModId(null); setNewMod({ name: '', code: '', professor: '', color: DOMAIN_COLORS[modules.length % DOMAIN_COLORS.length], category: 'academic' }); setShowAddMod(true) }} style={{
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
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
        <button onClick={() => setStep(2)} style={{
          padding: '13px 20px', borderRadius: 11, border: `1px solid ${BORDER}`,
          background: 'transparent', color: MUTED, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        }}>
          <ChevronLeft size={16} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <ContinueBtn
            mt={0}
            onClick={() => hasModules ? setStep(4) : handleComplete()}
            label={hasModules ? 'Continue' : 'Finish setup'}
            loading={!hasModules && saving}
          />
        </div>
      </div>
      {saveError && <div style={{ marginTop: 12, fontSize: 13, color: RED, textAlign: 'center' }}>{saveError}</div>}
      {!hasModules && (
        <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: MUTED }}>
          No modules yet? No worries — you can add them anytime from the Domains page.
        </div>
      )}
    </Wrap>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4 — Weekly Schedule Grid
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === 4) {
    const timeLabels = Array.from({ length: GRID_END - GRID_START + 1 }, (_, i) => {
      const h = GRID_START + i
      return `${h % 12 || 12}${h >= 12 ? 'pm' : 'am'}`
    })

    return (
      <div style={{ minHeight: '100vh', background: GRAD_BG, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 800 }}>
          <Logo />
          <StepDots step={4} totalSteps={4} />
          <Heading>Build your typical week, {firstName}</Heading>
          <Sub>Click any slot to add a session. This pattern repeats every teaching week across your semester.</Sub>

          {/* Grid */}
          <div style={{ marginTop: 28, borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden', background: SURFACE }}>
            <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(5, 1fr)', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ padding: '10px 0' }} />
              {DAYS_SHORT.map(d => (
                <div key={d} style={{
                  padding: '10px 0', textAlign: 'center', fontSize: 12, fontWeight: 700, color: MUTED,
                  borderLeft: `1px solid ${BORDER}`, letterSpacing: '0.5px',
                }}>
                  {d}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(5, 1fr)', position: 'relative' }}>
              {/* Time labels */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {timeLabels.map((t, i) => (
                  <div key={t} style={{
                    height: i < timeLabels.length - 1 ? CELL_H * 2 : 0,
                    display: 'flex', alignItems: 'flex-start', paddingTop: 4,
                    paddingRight: 8, justifyContent: 'flex-end',
                    fontSize: 10, color: MUTED, flexShrink: 0,
                  }}>
                    {t}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {DAYS_SHORT.map((day, dayIdx) => {
                const daySlots = scheduleSlots.filter(s => s.dayOfWeek === dayIdx)
                return (
                  <div key={day} style={{ position: 'relative', borderLeft: `1px solid ${BORDER}` }}>
                    {Array.from({ length: TOTAL_SLOTS }, (_, slotIdx) => {
                      const isOccupied = daySlots.some(s => {
                        const sStart = timeToSlot(s.startTime)
                        return slotIdx >= sStart && slotIdx < sStart + s.durationMinutes / 30
                      })
                      return (
                        <div
                          key={slotIdx}
                          onClick={() => !isOccupied && openSlotPicker(dayIdx, slotIdx)}
                          style={{
                            height: CELL_H,
                            borderBottom: `1px solid ${slotIdx % 2 === 1 ? BORDER : 'rgba(30,32,48,0.5)'}`,
                            cursor: isOccupied ? 'default' : 'pointer',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => { if (!isOccupied) e.currentTarget.style.background = 'rgba(91,140,255,0.06)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        />
                      )
                    })}

                    {daySlots.map(slot => {
                      const domain   = modules.find(m => m.id === slot.domainId)
                      const startIdx = timeToSlot(slot.startTime)
                      const height   = (slot.durationMinutes / 30) * CELL_H
                      const typeInfo = effectiveTypes.find(t => t.id === slot.slotType)
                        || SESSION_TYPE_PRESETS.find(t => t.id === slot.slotType)
                      return (
                        <div
                          key={slot.id}
                          onClick={() => delSlot(slot.id)}
                          title="Click to remove"
                          style={{
                            position: 'absolute',
                            top: startIdx * CELL_H, height: height - 1,
                            left: 3, right: 3,
                            background: domain ? `${domain.color}20` : '#ffffff0e',
                            border: `1px solid ${domain?.color || '#ffffff22'}88`,
                            borderRadius: 6, padding: '4px 6px',
                            cursor: 'pointer', overflow: 'hidden',
                            display: 'flex', flexDirection: 'column', justifyContent: 'center',
                          }}
                        >
                          <div style={{ fontSize: 10, fontWeight: 700, color: domain?.color, lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {domain?.name}
                          </div>
                          {height > 34 && (
                            <div style={{ fontSize: 9, color: domain ? `${domain.color}99` : MUTED, marginTop: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                              {typeInfo?.label || slot.slotType}
                              {(slot.weekFrom || slot.weekTo) ? ` · W${slot.weekFrom || 1}–${slot.weekTo ? `W${slot.weekTo}` : 'end'}` : ''}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: MUTED, textAlign: 'center' }}>
            Click an empty slot to add a session · Click a placed block to remove it
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => setStep(3)} style={{
              padding: '13px 20px', borderRadius: 11, border: `1px solid ${BORDER}`,
              background: 'transparent', color: MUTED, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            }}>
              <ChevronLeft size={16} /> Back
            </button>
            <button
              onClick={handleComplete} disabled={saving}
              style={{
                flex: 1, padding: '13px 0', borderRadius: 11, border: 'none',
                background: saving ? BORDER : 'linear-gradient(135deg, #5b8cff, #a78bfa)',
                color: saving ? MUTED : 'white', fontSize: 15, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
              }}
            >
              {saving
                ? 'Setting up your semester…'
                : `Done${scheduleSlots.length ? ` — ${scheduleSlots.length} session${scheduleSlots.length > 1 ? 's' : ''} added` : ''}`}
            </button>
          </div>
          {saveError && <div style={{ marginTop: 12, fontSize: 13, color: RED, textAlign: 'center' }}>{saveError}</div>}
        </div>

        {/* Slot picker modal */}
        {pendingSlot && (
          <div
            onClick={() => setPendingSlot(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          >
            <div onClick={e => e.stopPropagation()} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, width: 340, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
              {/* Header */}
              <div style={{
                padding: '16px 20px', borderBottom: `1px solid ${BORDER}`,
                background: 'linear-gradient(135deg, rgba(91,140,255,0.08), rgba(167,139,250,0.06))',
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
                  {DAYS_SHORT[pendingSlot.dayOfWeek]}, {fmtTime(slotToTime(pendingSlot.slotIndex))}
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>Add a session to this time slot</div>
              </div>

              {/* Body */}
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle()}>Module</label>
                  <select
                    value={pickDomainId} onChange={e => setPickDomainId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 13, outline: 'none' }}
                  >
                    {modules.map(m => <option key={m.id} value={m.id}>{m.name}{m.code ? ` (${m.code})` : ''}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle()}>Session type</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {effectiveTypes.map(t => (
                      <button key={t.id} onClick={() => setPickType(t.id)} style={{
                        padding: '7px 13px', borderRadius: 20,
                        border: `1px solid ${pickType === t.id ? t.color : BORDER}`,
                        background: pickType === t.id ? `${t.color}20` : 'transparent',
                        color: pickType === t.id ? t.color : MUTED,
                        fontSize: 12, fontWeight: pickType === t.id ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s',
                      }}>{t.label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle()}>Duration</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                    {DURATION_OPTS.map(o => (
                      <button key={o.v} onClick={() => setPickDuration(o.v)} style={{
                        padding: '8px 0', borderRadius: 8,
                        border: `1px solid ${pickDuration === o.v ? ACCENT : BORDER}`,
                        background: pickDuration === o.v ? 'rgba(91,140,255,0.12)' : 'transparent',
                        color: pickDuration === o.v ? ACCENT : MUTED,
                        fontSize: 12, fontWeight: pickDuration === o.v ? 600 : 400, cursor: 'pointer',
                      }}>{o.label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle()}>
                    Week range{' '}
                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                      (optional — blank = all {totalWeeks ? `${totalWeeks} ` : ''}weeks)
                    </span>
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="number" min={1} max={totalWeeks || 99} value={pickWeekFrom ?? ''}
                      onChange={e => setPickWeekFrom(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="W1"
                      style={{ width: 64, padding: '8px 10px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                    <span style={{ color: MUTED, fontSize: 12 }}>to</span>
                    <input
                      type="number" min={1} max={totalWeeks || 99} value={pickWeekTo ?? ''}
                      onChange={e => setPickWeekTo(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder={totalWeeks ? `W${totalWeeks}` : 'W?'}
                      style={{ width: 64, padding: '8px 10px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                    {(pickWeekFrom || pickWeekTo) && (
                      <button onClick={() => { setPickWeekFrom(null); setPickWeekTo(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 4, display: 'flex' }}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  {pickWeekFrom && pickWeekTo && pickWeekTo >= pickWeekFrom && (
                    <div style={{ fontSize: 11, color: GREEN, marginTop: 5 }}>
                      Runs {pickWeekTo - pickWeekFrom + 1} weeks (W{pickWeekFrom} to W{pickWeekTo})
                    </div>
                  )}
                </div>

                <div>
                  <label style={labelStyle()}>
                    Location{' '}
                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={pickLocation}
                    onChange={e => setPickLocation(e.target.value)}
                    placeholder="e.g. Room B1.01, Online, Lab 3"
                    style={{ width: '100%', padding: '9px 12px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                  <button onClick={confirmSlot} style={{
                    flex: 1, padding: '10px 0', borderRadius: 9, border: 'none',
                    background: 'linear-gradient(135deg, #5b8cff, #a78bfa)',
                    color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>Add session</button>
                  <button onClick={() => setPendingSlot(null)} style={{
                    padding: '10px 16px', borderRadius: 9, border: `1px solid ${BORDER}`,
                    background: 'transparent', color: MUTED, fontSize: 13, cursor: 'pointer',
                  }}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}

// ─── Layout helpers ───────────────────────────────────────────────────────────
function Wrap({ children, wide }) {
  return (
    <div style={{ minHeight: '100vh', background: GRAD_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: wide ? 560 : 480 }}>
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
          position: 'relative',
          width: 48, height: 48,
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
