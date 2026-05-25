import { useState } from 'react'
import { GraduationCap, Plus, X, ChevronRight, ChevronLeft, Check, Trash2 } from 'lucide-react'
import { DOMAIN_COLORS } from '../data/domains'

// ─── Schedule grid constants ──────────────────────────────────────────────────
const GRID_START  = 8   // 8 AM
const GRID_END    = 21  // 9 PM
const CELL_H      = 26  // px per 30-min slot
const TOTAL_SLOTS = (GRID_END - GRID_START) * 2
const DAYS_SHORT  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

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
  return new Date(dateStr + 'T12:00:00').getDay() // 0=Sun,1=Mon...
}
function getDowName(dateStr) {
  const n = getDow(dateStr)
  if (n === null) return ''
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][n]
}
function fmtDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
}
function countTeachingWeeks(startStr, endStr, breaks) {
  if (!startStr || !endStr) return null
  const s  = new Date(startStr + 'T00:00:00')
  const e  = new Date(endStr   + 'T00:00:00')
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

const YEAR_OPTIONS    = ['1st Year','2nd Year','3rd Year','4th Year','Masters','PhD','Other']
const DURATION_OPTS   = [{ label:'30 min', v:30 },{ label:'1 hour', v:60 },{ label:'1.5 hrs', v:90 },{ label:'2 hours', v:120 }]
const CATEGORY_OPTS   = [
  { id:'academic',     label:'Module / Academic'  },
  { id:'project',      label:'Project'             },
  { id:'society',      label:'Society / Club'      },
  { id:'organization', label:'Organisation'        },
  { id:'personal',     label:'Personal'            },
  { id:'other',        label:'Other'               },
]

// ─── Shared style primitives ──────────────────────────────────────────────────
const BG      = '#0b0c13'
const SURFACE = '#0f1018'
const BORDER  = '#1e2030'
const ACCENT  = '#5b8cff'
const MUTED   = '#7c7e96'
const TEXT    = '#e8e9f0'
const GREEN   = '#34d399'
const RED     = '#fb7185'

function inputStyle(focused) {
  return {
    width: '100%', padding: '11px 14px',
    background: SURFACE, border: `1px solid ${focused ? ACCENT : BORDER}`,
    borderRadius: 10, color: TEXT, fontSize: 14, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }
}
function labelStyle() {
  return { fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: '0.5px', display: 'block', marginBottom: 6, textTransform: 'uppercase' }
}

function FocusInput({ value, onChange, placeholder, type='text', autoFocus }) {
  const [foc, setFoc] = useState(false)
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      autoFocus={autoFocus}
      style={inputStyle(foc)}
      onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
    />
  )
}

// ─── Step dots ────────────────────────────────────────────────────────────────
function StepDots({ step, totalSteps }) {
  return (
    <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:36 }}>
      {Array.from({ length: totalSteps }, (_,i) => i+1).map(s => (
        <div key={s} style={{
          width: s === step ? 22 : 7, height: 7, borderRadius: 4,
          background: s < step ? GREEN : s === step ? ACCENT : BORDER,
          transition: 'all 0.25s',
        }} />
      ))}
    </div>
  )
}

// ─── Continue button ──────────────────────────────────────────────────────────
function ContinueBtn({ disabled, onClick, label='Continue', loading=false }) {
  return (
    <button
      onClick={onClick} disabled={disabled || loading}
      style={{
        marginTop: 28, width: '100%', padding: '13px 0',
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

// ─── Date field with Monday/Friday validation feedback ─────────────────────────
function DateField({ label, hint, value, onChange, required: reqDay, helperText }) {
  // reqDay: 1 = must be Monday, 5 = must be Friday
  const [foc, setFoc] = useState(false)
  const dow     = getDow(value)
  const dowName = getDowName(value)
  const isValid = value ? dow === reqDay : true
  const dayNames = { 1: 'Monday', 5: 'Friday' }

  return (
    <div>
      <label style={labelStyle()}>{label}</label>
      {helperText && <div style={{ fontSize: 12, color: MUTED, marginBottom: 8, lineHeight: 1.5 }}>{helperText}</div>}
      <div style={{ display:'flex', gap: 10, alignItems:'center' }}>
        <input
          type="date" value={value} onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle(foc), flex: 1, colorScheme:'dark' }}
          onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        />
        {value && (
          <div style={{
            padding: '6px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, flexShrink: 0,
            background: isValid ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)',
            color: isValid ? GREEN : RED,
            border: `1px solid ${isValid ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}`,
          }}>
            {isValid ? <>{dowName} <Check size={12} style={{ display:'inline', verticalAlign:'middle' }} /></> : `${dowName} — pick a ${dayNames[reqDay]}`}
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

  // Step 2
  const [semStart, setSemStart] = useState('')
  const [semEnd,   setSemEnd]   = useState('')
  const [breaks,   setBreaks]   = useState([])

  // Step 3
  const [modules,      setModules]      = useState([])
  const [showAddMod,   setShowAddMod]   = useState(false)
  const [newMod,       setNewMod]       = useState({ name:'', code:'', professor:'', color: DOMAIN_COLORS[0], category:'academic' })

  // Step 4
  const [scheduleSlots, setScheduleSlots] = useState([])
  const [pendingSlot,   setPendingSlot]   = useState(null) // {dayOfWeek, slotIndex}
  const [pickDomainId,  setPickDomainId]  = useState('')
  const [pickType,      setPickType]      = useState('lecture')
  const [pickDuration,  setPickDuration]  = useState(60)

  const hasModules  = modules.length > 0
  const totalSteps  = hasModules ? 4 : 3

  // ── Validation ────────────────────────────────────────────────────────────
  const canNext1 = firstName.trim() && yearOfStudy
  const canNext2 = semStart && semEnd
    && getDow(semStart) === 1 && getDow(semEnd) === 5
    && new Date(semEnd+'T00:00:00') > new Date(semStart+'T00:00:00')
    && breaks.every(b => b.name.trim() && b.startMonday && b.returnMonday
      && getDow(b.startMonday) === 1 && getDow(b.returnMonday) === 1
      && new Date(b.returnMonday+'T00:00:00') > new Date(b.startMonday+'T00:00:00'))

  // ── Break helpers ─────────────────────────────────────────────────────────
  function addBreak() {
    setBreaks(p => [...p, { id: crypto.randomUUID(), name:'', startMonday:'', returnMonday:'' }])
  }
  function updBreak(id, field, val) {
    setBreaks(p => p.map(b => b.id === id ? { ...b, [field]: val } : b))
  }
  function delBreak(id) { setBreaks(p => p.filter(b => b.id !== id)) }

  // ── Module helpers ────────────────────────────────────────────────────────
  function confirmAddModule() {
    if (!newMod.name.trim()) return
    const id = crypto.randomUUID()
    setModules(p => [...p, { ...newMod, id, icon:'BookOpen', credits: null, progress: 0 }])
    const nextColor = DOMAIN_COLORS[(modules.length + 1) % DOMAIN_COLORS.length]
    setNewMod({ name:'', code:'', professor:'', color: nextColor, category:'academic' })
    setShowAddMod(false)
  }
  function delModule(id) {
    setModules(p => p.filter(m => m.id !== id))
    setScheduleSlots(p => p.filter(s => s.domainId !== id))
  }

  // ── Schedule slot helpers ─────────────────────────────────────────────────
  function openSlotPicker(dayOfWeek, slotIndex) {
    // Don't open if cell is already occupied
    const occupied = scheduleSlots.some(s => {
      if (s.dayOfWeek !== dayOfWeek) return false
      const sStart = timeToSlot(s.startTime)
      const sEnd   = sStart + s.durationMinutes / 30
      return slotIndex >= sStart && slotIndex < sEnd
    })
    if (occupied) return
    setPendingSlot({ dayOfWeek, slotIndex })
    setPickDomainId(modules[0]?.id || '')
    setPickType('lecture')
    setPickDuration(60)
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
          first_name:    firstName.trim(),
          university:    university.trim() || null,
          year_of_study: yearOfStudy,
          semester_start: semStart,
          semester_end:   semEnd,
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
      <Sub>We'll use this to personalise your second brain.</Sub>

      <div style={{ display:'flex', flexDirection:'column', gap:16, marginTop:28 }}>
        <div>
          <label style={labelStyle()}>First Name *</label>
          <FocusInput value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="What should we call you?" autoFocus />
        </div>

        <div>
          <label style={labelStyle()}>Year of Study *</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {YEAR_OPTIONS.map(y => (
              <button key={y} onClick={() => setYearOfStudy(y)} style={{
                padding:'8px 14px', borderRadius:8, cursor:'pointer', fontSize:13,
                border: `1px solid ${yearOfStudy === y ? ACCENT : BORDER}`,
                background: yearOfStudy === y ? 'rgba(91,140,255,0.12)' : SURFACE,
                color: yearOfStudy === y ? ACCENT : MUTED,
                fontWeight: yearOfStudy === y ? 600 : 400, transition:'all 0.15s',
              }}>{y}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle()}>University <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0, fontSize:11 }}>(optional)</span></label>
          <FocusInput value={university} onChange={e => setUniversity(e.target.value)} placeholder="e.g. University College London" />
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
        <Heading>When's your semester, {firstName}?</Heading>
        <Sub>We use these dates to calculate academic weeks and generate your schedule.</Sub>

        <div style={{ display:'flex', flexDirection:'column', gap:18, marginTop:28 }}>
          <DateField
            label="Semester start *"
            helperText="The first Monday of your semester — the day lectures begin."
            value={semStart} onChange={setSemStart} required={1}
          />
          <DateField
            label="Semester end *"
            helperText="The last Friday of your semester — the final day of teaching."
            value={semEnd} onChange={setSemEnd} required={5}
          />

          {semStart && semEnd && getDow(semStart) === 1 && getDow(semEnd) === 5 && (
            <div style={{
              padding:'12px 16px', borderRadius:10, background:'rgba(91,140,255,0.08)',
              border:`1px solid rgba(91,140,255,0.2)`, fontSize:13, color: ACCENT,
            }}>
              {weeks
                ? `→ ${weeks} teaching week${weeks !== 1 ? 's' : ''}${breaks.length ? ` (excluding breaks)` : ''}`
                : 'Check your dates — end must be after start.'}
            </div>
          )}

          {/* Breaks */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: breaks.length ? 12 : 0 }}>
              <label style={labelStyle()}>Breaks <span style={{ fontWeight:400, textTransform:'none', fontSize:11 }}>(optional)</span></label>
              <button onClick={addBreak} style={{
                display:'flex', alignItems:'center', gap:5,
                padding:'5px 10px', borderRadius:7, border:`1px solid ${BORDER}`,
                background:'transparent', color: MUTED, fontSize:12, cursor:'pointer',
              }}>
                <Plus size={12} /> Add break
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {breaks.map((b, i) => {
                const bWeeks = b.startMonday && b.returnMonday
                  ? Math.round((new Date(b.returnMonday+'T00:00:00') - new Date(b.startMonday+'T00:00:00')) / 604800000)
                  : null
                return (
                  <div key={b.id} style={{ padding:14, borderRadius:10, border:`1px solid ${BORDER}`, background: SURFACE, display:'flex', flexDirection:'column', gap:12 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontSize:13, fontWeight:600, color: TEXT }}>Break {i+1}</span>
                      <button onClick={() => delBreak(b.id)} style={{ background:'none', border:'none', cursor:'pointer', color: MUTED, display:'flex', padding:2 }}>
                        <X size={14} />
                      </button>
                    </div>
                    <div>
                      <label style={labelStyle()}>Break name</label>
                      <FocusInput value={b.name} onChange={e => updBreak(b.id,'name',e.target.value)} placeholder="e.g. Easter Break, Reading Week" />
                    </div>
                    <DateField
                      label="First Monday of break"
                      helperText="The Monday when teaching stops — the first day of the break."
                      value={b.startMonday} onChange={v => updBreak(b.id,'startMonday',v)} required={1}
                    />
                    <DateField
                      label="First Monday back"
                      helperText="The Monday when teaching resumes — the day you return to uni."
                      value={b.returnMonday} onChange={v => updBreak(b.id,'returnMonday',v)} required={1}
                    />
                    {bWeeks !== null && bWeeks > 0 && (
                      <div style={{ fontSize:12, color: GREEN }}>→ {bWeeks}-week break</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:10, marginTop:28 }}>
          <button onClick={() => setStep(1)} style={{
            padding:'13px 20px', borderRadius:11, border:`1px solid ${BORDER}`,
            background:'transparent', color: MUTED, fontSize:14, cursor:'pointer',
            display:'flex', alignItems:'center', gap:6,
          }}>
            <ChevronLeft size={16} /> Back
          </button>
          <div style={{ flex:1 }}>
            <ContinueBtn disabled={!canNext2} onClick={() => setStep(3)} />
          </div>
        </div>
      </Wrap>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — Modules
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === 3) return (
    <Wrap wide>
      <Logo />
      <StepDots step={3} totalSteps={totalSteps} />
      <Heading>Your modules, {firstName}</Heading>
      <Sub>Add the modules you're studying this semester. You can always edit these later.</Sub>

      <div style={{ marginTop:24, display:'flex', flexDirection:'column', gap:10 }}>
        {modules.map(m => (
          <div key={m.id} style={{
            display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
            borderRadius:10, border:`1px solid ${BORDER}`, background: SURFACE,
          }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background: m.color, flexShrink:0 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600, color: TEXT }}>{m.name}</div>
              <div style={{ fontSize:12, color: MUTED }}>
                {[m.code, m.professor].filter(Boolean).join(' · ') || 'No code or professor'}
              </div>
            </div>
            <button onClick={() => delModule(m.id)} style={{ background:'none', border:'none', cursor:'pointer', color: MUTED, display:'flex', padding:4 }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {showAddMod ? (
          <div style={{ padding:16, borderRadius:10, border:`1px solid ${ACCENT}`, background: SURFACE, display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={labelStyle()}>Module name *</label>
                <FocusInput value={newMod.name} onChange={e => setNewMod(p=>({...p,name:e.target.value}))} placeholder="e.g. Algorithms & Data Structures" autoFocus />
              </div>
              <div>
                <label style={labelStyle()}>Module code</label>
                <FocusInput value={newMod.code} onChange={e => setNewMod(p=>({...p,code:e.target.value}))} placeholder="e.g. CS301" />
              </div>
              <div>
                <label style={labelStyle()}>Professor</label>
                <FocusInput value={newMod.professor} onChange={e => setNewMod(p=>({...p,professor:e.target.value}))} placeholder="e.g. Dr. Smith" />
              </div>
            </div>

            <div>
              <label style={labelStyle()}>Category</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {CATEGORY_OPTS.map(c => (
                  <button key={c.id} onClick={() => setNewMod(p=>({...p,category:c.id}))} style={{
                    padding:'6px 12px', borderRadius:7, border:`1px solid ${newMod.category===c.id ? ACCENT : BORDER}`,
                    background: newMod.category===c.id ? 'rgba(91,140,255,0.12)' : 'transparent',
                    color: newMod.category===c.id ? ACCENT : MUTED,
                    fontSize:12, fontWeight: newMod.category===c.id ? 600 : 400, cursor:'pointer', transition:'all 0.15s',
                  }}>{c.label}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle()}>Colour</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {DOMAIN_COLORS.map(c => (
                  <button key={c} onClick={() => setNewMod(p=>({...p,color:c}))} style={{
                    width:24, height:24, borderRadius:'50%', background:c, border:'none',
                    cursor:'pointer', outline: newMod.color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2, transition:'outline 0.1s',
                  }} />
                ))}
              </div>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={confirmAddModule} disabled={!newMod.name.trim()} style={{
                flex:1, padding:'10px 0', borderRadius:9, border:'none',
                background: newMod.name.trim() ? ACCENT : BORDER,
                color: newMod.name.trim() ? 'white' : MUTED,
                fontSize:13, fontWeight:600, cursor: newMod.name.trim() ? 'pointer' : 'not-allowed',
              }}>Add module</button>
              <button onClick={() => setShowAddMod(false)} style={{
                padding:'10px 16px', borderRadius:9, border:`1px solid ${BORDER}`,
                background:'transparent', color: MUTED, fontSize:13, cursor:'pointer',
              }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddMod(true)} style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            padding:'12px', borderRadius:10, border:`1px dashed ${BORDER}`,
            background:'transparent', color: MUTED, fontSize:13, cursor:'pointer',
            transition:'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED }}
          >
            <Plus size={15} /> Add module
          </button>
        )}
      </div>

      <div style={{ display:'flex', gap:10, marginTop:28 }}>
        <button onClick={() => setStep(2)} style={{
          padding:'13px 20px', borderRadius:11, border:`1px solid ${BORDER}`,
          background:'transparent', color: MUTED, fontSize:14, cursor:'pointer',
          display:'flex', alignItems:'center', gap:6,
        }}>
          <ChevronLeft size={16} /> Back
        </button>
        <div style={{ flex:1 }}>
          <ContinueBtn
            onClick={() => hasModules ? setStep(4) : handleComplete()}
            label={hasModules ? 'Continue' : 'Finish setup'}
            loading={!hasModules && saving}
          />
        </div>
      </div>
      {saveError && <div style={{ marginTop:12, fontSize:13, color: RED, textAlign:'center' }}>{saveError}</div>}

      {!hasModules && (
        <div style={{ marginTop:12, textAlign:'center', fontSize:12, color: MUTED }}>
          No modules yet? You can add them anytime from the Domains page.
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
      <div style={{ minHeight:'100vh', background: BG, display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 20px', overflowY:'auto' }}>
        <div style={{ width:'100%', maxWidth:780 }}>
          <Logo />
          <StepDots step={4} totalSteps={totalSteps} />
          <Heading>What does a typical week look like?</Heading>
          <Sub>Click any slot to place a lecture or lab. This pattern repeats every teaching week.</Sub>

          {/* Grid */}
          <div style={{ marginTop:24, borderRadius:12, border:`1px solid ${BORDER}`, overflow:'hidden', background: SURFACE }}>
            {/* Header row */}
            <div style={{ display:'grid', gridTemplateColumns:'52px repeat(5, 1fr)', borderBottom:`1px solid ${BORDER}` }}>
              <div style={{ padding:'10px 0', background: SURFACE }} />
              {DAYS_SHORT.map((d, i) => (
                <div key={d} style={{
                  padding:'10px 0', textAlign:'center', fontSize:12, fontWeight:600, color: MUTED,
                  borderLeft:`1px solid ${BORDER}`,
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grid body */}
            <div style={{ display:'grid', gridTemplateColumns:'52px repeat(5, 1fr)', position:'relative' }}>
              {/* Time labels column */}
              <div style={{ display:'flex', flexDirection:'column' }}>
                {timeLabels.map((t, i) => (
                  <div key={t} style={{
                    height: i < timeLabels.length - 1 ? CELL_H * 2 : 0,
                    display:'flex', alignItems:'flex-start', paddingTop: 4,
                    paddingRight: 8, justifyContent:'flex-end',
                    fontSize:10, color: MUTED, flexShrink:0,
                  }}>
                    {t}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {DAYS_SHORT.map((day, dayIdx) => {
                const daySlots = scheduleSlots.filter(s => s.dayOfWeek === dayIdx)
                return (
                  <div key={day} style={{ position:'relative', borderLeft:`1px solid ${BORDER}` }}>
                    {/* Clickable cells */}
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
                            borderBottom:`1px solid ${slotIdx % 2 === 1 ? BORDER : 'rgba(30,32,48,0.4)'}`,
                            cursor: isOccupied ? 'default' : 'pointer',
                            transition:'background 0.1s',
                          }}
                          onMouseEnter={e => { if (!isOccupied) e.currentTarget.style.background = 'rgba(91,140,255,0.06)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        />
                      )
                    })}

                    {/* Placed slots */}
                    {daySlots.map(slot => {
                      const domain   = modules.find(m => m.id === slot.domainId)
                      const startIdx = timeToSlot(slot.startTime)
                      const height   = (slot.durationMinutes / 30) * CELL_H
                      return (
                        <div
                          key={slot.id}
                          onClick={() => delSlot(slot.id)}
                          title="Click to remove"
                          style={{
                            position:'absolute',
                            top: startIdx * CELL_H, height: height - 1,
                            left: 3, right: 3,
                            background: domain ? domain.color + '22' : '#ffffff11',
                            border: `1px solid ${domain?.color || '#ffffff33'}`,
                            borderRadius: 5, padding:'3px 6px',
                            cursor:'pointer', overflow:'hidden',
                            display:'flex', flexDirection:'column', justifyContent:'center',
                          }}
                        >
                          <div style={{ fontSize:10, fontWeight:700, color: domain?.color, lineHeight:1.2 }}>
                            {domain?.code || domain?.name}
                          </div>
                          {height > 36 && (
                            <div style={{ fontSize:9, color: domain ? domain.color + 'aa' : MUTED, marginTop:1 }}>
                              {slot.slotType} · {fmtTime(slot.startTime)}
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

          <div style={{ marginTop:10, fontSize:11, color: MUTED, textAlign:'center' }}>
            Click an empty slot to add · Click a placed block to remove it
          </div>

          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={() => setStep(3)} style={{
              padding:'13px 20px', borderRadius:11, border:`1px solid ${BORDER}`,
              background:'transparent', color: MUTED, fontSize:14, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6,
            }}>
              <ChevronLeft size={16} /> Back
            </button>
            <button
              onClick={handleComplete} disabled={saving}
              style={{
                flex:1, padding:'13px 0', borderRadius:11, border:'none',
                background: saving ? BORDER : 'linear-gradient(135deg, #5b8cff, #a78bfa)',
                color: saving ? MUTED : 'white', fontSize:15, fontWeight:600,
                cursor: saving ? 'not-allowed' : 'pointer', transition:'all 0.15s',
              }}
            >
              {saving ? 'Setting up your brain…' : `Finish setup${scheduleSlots.length ? ` — ${scheduleSlots.length} slot${scheduleSlots.length>1?'s':''} added` : ''}`}
            </button>
          </div>
          {saveError && <div style={{ marginTop:12, fontSize:13, color: RED, textAlign:'center' }}>{saveError}</div>}
        </div>

        {/* Slot picker modal */}
        {pendingSlot && (
          <div onClick={() => setPendingSlot(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: SURFACE, border:`1px solid ${BORDER}`, borderRadius:14, padding:20, width:300, boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
              <div style={{ fontSize:14, fontWeight:700, color: TEXT, marginBottom:4 }}>
                Add slot — {DAYS_SHORT[pendingSlot.dayOfWeek]}, {fmtTime(slotToTime(pendingSlot.slotIndex))}
              </div>
              <div style={{ fontSize:12, color: MUTED, marginBottom:16 }}>Click a slot on the grid to remove it.</div>

              <label style={labelStyle()}>Module</label>
              <select
                value={pickDomainId} onChange={e => setPickDomainId(e.target.value)}
                style={{ width:'100%', padding:'9px 12px', background:'#0b0c13', border:`1px solid ${BORDER}`, borderRadius:8, color: TEXT, fontSize:13, marginBottom:14, outline:'none' }}
              >
                {modules.map(m => <option key={m.id} value={m.id}>{m.code ? `${m.code} — ` : ''}{m.name}</option>)}
              </select>

              <label style={labelStyle()}>Type</label>
              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                {['lecture','lab'].map(t => (
                  <button key={t} onClick={() => setPickType(t)} style={{
                    flex:1, padding:'8px 0', borderRadius:8, border:`1px solid ${pickType===t ? ACCENT : BORDER}`,
                    background: pickType===t ? 'rgba(91,140,255,0.12)' : 'transparent',
                    color: pickType===t ? ACCENT : MUTED,
                    fontSize:13, fontWeight: pickType===t ? 600 : 400, cursor:'pointer', textTransform:'capitalize',
                  }}>{t}</button>
                ))}
              </div>

              <label style={labelStyle()}>Duration</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:18 }}>
                {DURATION_OPTS.map(o => (
                  <button key={o.v} onClick={() => setPickDuration(o.v)} style={{
                    padding:'8px 0', borderRadius:8, border:`1px solid ${pickDuration===o.v ? ACCENT : BORDER}`,
                    background: pickDuration===o.v ? 'rgba(91,140,255,0.12)' : 'transparent',
                    color: pickDuration===o.v ? ACCENT : MUTED,
                    fontSize:12, fontWeight: pickDuration===o.v ? 600 : 400, cursor:'pointer',
                  }}>{o.label}</button>
                ))}
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <button onClick={confirmSlot} style={{
                  flex:1, padding:'10px 0', borderRadius:9, border:'none',
                  background: ACCENT, color:'white', fontSize:13, fontWeight:600, cursor:'pointer',
                }}>Add slot</button>
                <button onClick={() => setPendingSlot(null)} style={{
                  padding:'10px 14px', borderRadius:9, border:`1px solid ${BORDER}`,
                  background:'transparent', color: MUTED, fontSize:13, cursor:'pointer',
                }}>Cancel</button>
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
    <div style={{ minHeight:'100vh', background: BG, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ width:'100%', maxWidth: wide ? 560 : 480 }}>
        {children}
      </div>
    </div>
  )
}
function Logo() {
  return (
    <div style={{ display:'flex', justifyContent:'center', marginBottom:24 }}>
      <div style={{ width:44, height:44, background:'linear-gradient(135deg, #5b8cff, #a78bfa)', borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 24px rgba(91,140,255,0.3)' }}>
        <GraduationCap size={20} color="white" />
      </div>
    </div>
  )
}
function Heading({ children }) {
  return <div style={{ fontSize:24, fontWeight:700, color: TEXT, marginBottom:8, textAlign:'center', lineHeight:1.25 }}>{children}</div>
}
function Sub({ children }) {
  return <div style={{ fontSize:14, color: MUTED, lineHeight:1.6, textAlign:'center' }}>{children}</div>
}
