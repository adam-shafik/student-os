import { useState, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Plus, X, ChevronRight, ChevronLeft, Check, Trash2, Pencil, ArrowLeft } from 'lucide-react'
import { DOMAIN_COLORS } from '../data/domains'
import { supabase } from '../lib/supabase'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      '#0b0c13',
  surface: '#0f1018',
  border:  '#1e2030',
  accent:  '#5b8cff',
  text:    '#e8e9f0',
  muted:   '#7c7e96',
  dim:     '#4a4c60',
  green:   '#34d399',
  red:     '#fb7185',
}
const FONT   = "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif"
const SPRING = { type: 'spring', stiffness: 260, damping: 28 }
const SOFT   = { type: 'spring', stiffness: 160, damping: 24 }

// ─── Step slide variants ──────────────────────────────────────────────────────
const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
}
const slideTransition = { type: 'spring', stiffness: 300, damping: 30 }

const fieldVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}
const rowVariant = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
}

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
  { id: 'academic',     label: 'Module / Academic' },
  { id: 'project',      label: 'Project'           },
  { id: 'society',      label: 'Society / Club'    },
  { id: 'organization', label: 'Organisation'      },
  { id: 'personal',     label: 'Personal'          },
  { id: 'other',        label: 'Other'             },
]

// ─── Shared sub-components ────────────────────────────────────────────────────
function labelStyle(focused) {
  return {
    fontSize: 11, fontWeight: 600, color: focused ? C.accent : C.muted,
    letterSpacing: '0.4px', display: 'block', marginBottom: 7,
    textTransform: 'uppercase', transition: 'color 0.18s',
  }
}

function FocusInput({ value, onChange, onKeyDown, placeholder, type = 'text', autoFocus, style: extra }) {
  const [foc, setFoc] = useState(false)
  return (
    <input
      type={type} value={value} onChange={onChange} onKeyDown={onKeyDown}
      placeholder={placeholder} autoFocus={autoFocus}
      onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '11px 14px',
        background: foc ? 'rgba(91,140,255,0.05)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${foc ? 'rgba(91,140,255,0.4)' : C.border}`,
        borderRadius: 10, color: C.text, fontSize: 14,
        outline: 'none', fontFamily: FONT,
        boxShadow: foc
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 3px rgba(91,140,255,0.07)'
          : 'inset 0 1px 0 rgba(255,255,255,0.04)',
        transition: 'border-color 0.18s, background 0.18s, box-shadow 0.18s',
        ...extra,
      }}
    />
  )
}

function ContinueBtn({ disabled, onClick, label = 'Continue', loading = false }) {
  return (
    <motion.button
      onClick={onClick} disabled={disabled || loading}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      style={{
        width: '100%', padding: '13px 0', borderRadius: 11, border: 'none',
        background: disabled || loading ? C.surface : C.accent,
        border: `1px solid ${disabled || loading ? C.border : 'transparent'}`,
        color: disabled || loading ? C.dim : 'white',
        fontSize: 15, fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontFamily: FONT,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: !disabled && !loading ? 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 3px rgba(0,0,0,0.4)' : 'none',
        transition: 'background 0.2s, color 0.2s',
      }}
    >
      {loading ? 'Setting up...' : <>{label} <ChevronRight size={16} /></>}
    </motion.button>
  )
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '13px 20px', borderRadius: 11,
      border: `1px solid ${C.border}`,
      background: 'transparent', color: C.muted,
      fontSize: 14, cursor: 'pointer', fontFamily: FONT,
      display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
    }}>
      <ChevronLeft size={16} /> Back
    </button>
  )
}

function DateField({ label, value, onChange, required: reqDay, helperText }) {
  const [foc, setFoc] = useState(false)
  const dow    = getDow(value)
  const name   = getDowName(value)
  const valid  = value ? dow === reqDay : true
  const days   = { 0: 'Sunday', 1: 'Monday', 4: 'Thursday', 5: 'Friday' }
  return (
    <div>
      <label style={labelStyle(foc)}>{label}</label>
      {helperText && <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>{helperText}</div>}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="date" value={value} onChange={e => onChange(e.target.value)}
          onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
          style={{
            flex: 1, boxSizing: 'border-box', padding: '11px 14px',
            background: foc ? 'rgba(91,140,255,0.05)' : 'rgba(255,255,255,0.025)',
            border: `1px solid ${foc ? 'rgba(91,140,255,0.4)' : C.border}`,
            borderRadius: 10, color: C.text, fontSize: 14,
            outline: 'none', fontFamily: FONT, colorScheme: 'dark',
            transition: 'border-color 0.18s, background 0.18s',
          }}
        />
        {value && (
          <div style={{
            padding: '6px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, flexShrink: 0,
            background: valid ? 'rgba(52,211,153,0.1)' : 'rgba(251,113,133,0.1)',
            color: valid ? C.green : C.red,
            border: `1px solid ${valid ? 'rgba(52,211,153,0.22)' : 'rgba(251,113,133,0.22)'}`,
          }}>
            {valid
              ? <>{name} <Check size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /></>
              : `${name} (needs to be a ${days[reqDay]})`}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Left brand panel ─────────────────────────────────────────────────────────
const stepInfo = [
  { title: 'Tell us about yourself',         sub: 'Just the basics — takes 20 seconds.' },
  { title: 'Set up your semester',           sub: 'We use this to calculate academic weeks and fill your calendar.' },
  { title: 'Add your modules',               sub: 'They will show up in your calendar and notes from day one.' },
]

const LeftPanel = memo(function LeftPanel({ step, firstName }) {
  return (
    <div className="onboard-left" style={{
      position: 'relative', overflow: 'hidden', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Animated mesh gradient */}
      <div style={{ position: 'absolute', inset: 0, background: '#080a12' }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 90% 70% at 10% 30%, rgba(91,140,255,0.16) 0%, transparent 55%),
          radial-gradient(ellipse 70% 90% at 90% 80%, rgba(167,139,250,0.1) 0%, transparent 55%),
          radial-gradient(ellipse 60% 60% at 60% 5%,  rgba(52,211,153,0.06) 0%, transparent 55%)
        `,
        animation: 'meshShift 9s ease-in-out infinite alternate',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, transparent 55%, #0b0c13 100%)',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, padding: '44px 44px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(91,140,255,0.15)',
            border: '1px solid rgba(91,140,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
          }}>
            <GraduationCap size={16} color={C.accent} strokeWidth={1.8} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(232,233,240,0.9)', letterSpacing: '-0.2px', fontFamily: FONT }}>
            StudentOS
          </span>
        </div>

        {/* Step-aware headline */}
        <div style={{ marginBottom: 48 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={SOFT}
            >
              {firstName && step > 1 && (
                <p style={{ fontSize: 13, color: C.accent, fontWeight: 600, margin: '0 0 10px', fontFamily: FONT }}>
                  Hey, {firstName}
                </p>
              )}
              <h2 style={{
                fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1.2,
                letterSpacing: '-0.6px', margin: '0 0 10px', fontFamily: FONT,
              }}>
                {stepInfo[step - 1].title}
              </h2>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, margin: 0, fontFamily: FONT }}>
                {stepInfo[step - 1].sub}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Step progress dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 28 }}>
            {[1, 2, 3].map(s => (
              <motion.div
                key={s}
                animate={{
                  width: s === step ? 28 : 7,
                  background: s < step ? C.green : s === step ? C.accent : C.border,
                }}
                style={{ height: 7, borderRadius: 4 }}
                transition={SPRING}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

// ─── Main onboarding component ────────────────────────────────────────────────
export default function OnboardingPage({ userId, onComplete }) {
  const [step,      setStep]      = useState(1)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState(null)
  const direction                 = useRef(1)

  // Step 1
  const [firstName,   setFirstName]   = useState('')
  const [university,  setUniversity]  = useState('')
  const [yearOfStudy, setYearOfStudy] = useState('')
  const [weekStart,   setWeekStart]   = useState('monday')

  // Step 2
  const [semStart, setSemStart] = useState('')
  const [semEnd,   setSemEnd]   = useState('')
  const [breaks,   setBreaks]   = useState([])

  // Step 3
  const [modules,      setModules]      = useState([])
  const [showAddMod,   setShowAddMod]   = useState(false)
  const [editingModId, setEditingModId] = useState(null)
  const [newMod,       setNewMod]       = useState({ name: '', code: '', color: DOMAIN_COLORS[0], category: 'academic' })

  const isSunThu   = weekStart === 'sunday'
  const startDay   = isSunThu ? 0 : 1
  const endDay     = isSunThu ? 4 : 5
  const breakDay   = isSunThu ? 0 : 1
  const totalWeeks = countTeachingWeeks(semStart, semEnd, breaks)

  const canNext1 = firstName.trim() && yearOfStudy
  const canNext2 = semStart && semEnd
    && getDow(semStart) === startDay && getDow(semEnd) === endDay
    && new Date(semEnd + 'T00:00:00') > new Date(semStart + 'T00:00:00')
    && breaks.every(b => b.name.trim() && b.startMonday && b.returnMonday
      && getDow(b.startMonday) === breakDay && getDow(b.returnMonday) === breakDay
      && new Date(b.returnMonday + 'T00:00:00') > new Date(b.startMonday + 'T00:00:00'))

  function goTo(n) {
    direction.current = n > step ? 1 : -1
    setStep(n)
  }

  // Break helpers
  function addBreak()                { setBreaks(p => [...p, { id: crypto.randomUUID(), name: '', startMonday: '', returnMonday: '' }]) }
  function updBreak(id, field, val)  { setBreaks(p => p.map(b => b.id === id ? { ...b, [field]: val } : b)) }
  function delBreak(id)              { setBreaks(p => p.filter(b => b.id !== id)) }

  // Module helpers
  function confirmAddModule() {
    if (!newMod.name.trim()) return
    if (editingModId) {
      setModules(p => p.map(m => m.id === editingModId ? { ...m, ...newMod } : m))
      setEditingModId(null)
    } else {
      setModules(p => [...p, { ...newMod, id: crypto.randomUUID(), icon: 'BookOpen', credits: null, progress: 0, professor: '' }])
      setNewMod({ name: '', code: '', color: DOMAIN_COLORS[(modules.length + 1) % DOMAIN_COLORS.length], category: 'academic' })
    }
    setShowAddMod(false)
  }
  function editModule(m) {
    setEditingModId(m.id)
    setNewMod({ name: m.name, code: m.code || '', color: m.color, category: m.category })
    setShowAddMod(true)
  }
  function delModule(id) { setModules(p => p.filter(m => m.id !== id)) }

  async function handleComplete() {
    setSaving(true); setSaveError(null)
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

  // ─── Step renders ────────────────────────────────────────────────────────
  function renderStep1() {
    const displayName = firstName.trim()
    return (
      <motion.div
        variants={fieldVariants} initial="hidden" animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
      >
        <motion.button
          variants={rowVariant}
          onClick={() => supabase.auth.signOut()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: C.muted,
            cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: FONT,
            marginBottom: 40,
          }}
          whileHover={{ color: C.text }}
        >
          <ArrowLeft size={14} /> Back
        </motion.button>

        {/* Name input — hero field */}
        <motion.div variants={rowVariant} style={{ marginBottom: 28 }}>
          <label style={{ ...labelStyle(false), marginBottom: 10 }}>Your first name</label>
          <FocusInput
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="What should we call you?"
            autoFocus
            style={{ fontSize: 16, padding: '13px 16px' }}
          />
          <AnimatePresence>
            {displayName && (
              <motion.p
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ fontSize: 13, color: C.accent, marginTop: 8, fontFamily: FONT }}
              >
                Nice to meet you, {displayName}.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {firstName.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 22 }}
            >
              {/* Year */}
              <div>
                <label style={labelStyle(false)}>Year of study</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {YEAR_OPTIONS.map(y => (
                    <button key={y} onClick={() => setYearOfStudy(y)} style={{
                      padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                      border: `1px solid ${yearOfStudy === y ? C.accent : C.border}`,
                      background: yearOfStudy === y ? 'rgba(91,140,255,0.14)' : 'transparent',
                      color: yearOfStudy === y ? C.accent : C.muted,
                      fontWeight: yearOfStudy === y ? 700 : 400,
                      fontFamily: FONT, transition: 'all 0.15s',
                    }}>{y}</button>
                  ))}
                </div>
              </div>

              {/* University */}
              <div>
                <label style={labelStyle(false)}>
                  University{' '}
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(optional)</span>
                </label>
                <FocusInput value={university} onChange={e => setUniversity(e.target.value)} placeholder="e.g. University College London" />
              </div>

              {/* Week structure */}
              <div>
                <label style={labelStyle(false)}>Weekly schedule</label>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>When does your university week run?</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { id: 'monday', label: 'Monday – Friday',   sub: 'Standard week'      },
                    { id: 'sunday', label: 'Sunday – Thursday', sub: 'Middle East / Gulf'  },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setWeekStart(opt.id)} style={{
                      flex: 1, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      border: `1px solid ${weekStart === opt.id ? C.accent : C.border}`,
                      background: weekStart === opt.id ? 'rgba(91,140,255,0.1)' : 'transparent',
                      fontFamily: FONT, transition: 'all 0.15s',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: weekStart === opt.id ? 700 : 500, color: weekStart === opt.id ? C.accent : C.text, marginBottom: 2 }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <ContinueBtn disabled={!canNext1} onClick={() => goTo(2)} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  function renderStep2() {
    return (
      <motion.div variants={fieldVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

        <AnimatePresence>
          {semStart && semEnd && getDow(semStart) === startDay && getDow(semEnd) === endDay && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                padding: '11px 15px', borderRadius: 10,
                background: 'rgba(91,140,255,0.07)', border: '1px solid rgba(91,140,255,0.18)',
                fontSize: 13, color: C.accent, fontWeight: 500,
              }}>
                {totalWeeks
                  ? `${totalWeeks} teaching week${totalWeeks !== 1 ? 's' : ''}${breaks.length ? ` (excluding ${breaks.length} break${breaks.length > 1 ? 's' : ''})` : ''}`
                  : 'Check your dates, end must be after start.'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Breaks */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: breaks.length ? 12 : 0 }}>
            <label style={labelStyle(false)}>
              Breaks{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(optional)</span>
            </label>
            <button onClick={addBreak} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 20, border: `1px solid ${C.border}`,
              background: 'transparent', color: C.muted, fontSize: 12, cursor: 'pointer',
              fontFamily: FONT, transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
            >
              <Plus size={12} /> Add break
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <AnimatePresence>
              {breaks.map((b, i) => {
                const bWeeks = b.startMonday && b.returnMonday
                  ? Math.round((new Date(b.returnMonday + 'T00:00:00') - new Date(b.startMonday + 'T00:00:00')) / 604800000)
                  : null
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: 16, borderRadius: 12, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.015)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FONT }}>Break {i + 1}</span>
                        <button onClick={() => delBreak(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', padding: 2 }}><X size={14} /></button>
                      </div>
                      <div>
                        <label style={labelStyle(false)}>Break name</label>
                        <FocusInput value={b.name} onChange={e => updBreak(b.id, 'name', e.target.value)} placeholder="e.g. Easter Break, Reading Week" />
                      </div>
                      <DateField
                        label={isSunThu ? 'First Sunday of break' : 'First Monday of break'}
                        helperText={isSunThu ? 'The Sunday teaching stops.' : 'The Monday teaching stops.'}
                        value={b.startMonday} onChange={v => updBreak(b.id, 'startMonday', v)} required={breakDay}
                      />
                      <DateField
                        label={isSunThu ? 'First Sunday back' : 'First Monday back'}
                        helperText={isSunThu ? 'The Sunday lectures resume.' : 'The Monday lectures resume.'}
                        value={b.returnMonday} onChange={v => updBreak(b.id, 'returnMonday', v)} required={breakDay}
                      />
                      {bWeeks !== null && bWeeks > 0 && (
                        <div style={{ fontSize: 12, color: C.green, fontWeight: 500 }}>
                          {bWeeks}-week break
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <BackBtn onClick={() => goTo(1)} />
          <div style={{ flex: 1 }}>
            <ContinueBtn disabled={!canNext2} onClick={() => goTo(3)} />
          </div>
        </div>
      </motion.div>
    )
  }

  function renderStep3() {
    return (
      <motion.div variants={fieldVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <motion.div variants={rowVariant} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <AnimatePresence>
            {modules.map(m => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderRadius: 10, background: C.surface,
                  border: `1px solid ${C.border}`, borderLeft: `3px solid ${m.color}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: FONT }}>{m.name}</div>
                    {m.code && <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{m.code}</div>}
                  </div>
                  <button onClick={() => editModule(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', padding: 4 }}><Pencil size={13} /></button>
                  <button onClick={() => delModule(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', padding: 4 }}><Trash2 size={14} /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Add / edit form */}
        <AnimatePresence mode="wait">
          {showAddMod ? (
            <motion.div
              key="add-form"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ padding: 16, borderRadius: 12, border: '1px solid rgba(91,140,255,0.28)', background: C.surface, display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}
            >
              <div>
                <label style={labelStyle(false)}>Module name</label>
                <FocusInput value={newMod.name} onChange={e => setNewMod(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Algorithms and Data Structures" autoFocus />
              </div>
              <div>
                <label style={labelStyle(false)}>Module code <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(optional)</span></label>
                <FocusInput value={newMod.code} onChange={e => setNewMod(p => ({ ...p, code: e.target.value }))} placeholder="e.g. CS301" />
              </div>
              <div>
                <label style={labelStyle(false)}>Category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORY_OPTS.map(c => (
                    <button key={c.id} onClick={() => setNewMod(p => ({ ...p, category: c.id }))} style={{
                      padding: '6px 12px', borderRadius: 20, fontFamily: FONT,
                      border: `1px solid ${newMod.category === c.id ? C.accent : C.border}`,
                      background: newMod.category === c.id ? 'rgba(91,140,255,0.12)' : 'transparent',
                      color: newMod.category === c.id ? C.accent : C.muted,
                      fontSize: 12, fontWeight: newMod.category === c.id ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s',
                    }}>{c.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle(false)}>Colour</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {DOMAIN_COLORS.map(col => (
                    <button key={col} onClick={() => setNewMod(p => ({ ...p, color: col }))} style={{
                      width: 24, height: 24, borderRadius: '50%', background: col, border: 'none',
                      cursor: 'pointer', outline: newMod.color === col ? `2px solid ${col}` : 'none',
                      outlineOffset: 2, transition: 'outline 0.1s',
                    }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmAddModule} disabled={!newMod.name.trim()} style={{
                  flex: 1, padding: '10px 0', borderRadius: 9, border: 'none',
                  background: newMod.name.trim() ? C.accent : C.border,
                  color: newMod.name.trim() ? 'white' : C.muted,
                  fontSize: 13, fontWeight: 600, cursor: newMod.name.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: FONT,
                }}>{editingModId ? 'Save changes' : 'Add module'}</button>
                <button onClick={() => { setShowAddMod(false); setEditingModId(null) }} style={{
                  padding: '10px 16px', borderRadius: 9, border: `1px solid ${C.border}`,
                  background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: FONT,
                }}>Cancel</button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="add-btn"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => {
                setEditingModId(null)
                setNewMod({ name: '', code: '', color: DOMAIN_COLORS[modules.length % DOMAIN_COLORS.length], category: 'academic' })
                setShowAddMod(true)
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px', borderRadius: 10, border: `1px dashed ${C.border}`,
                background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer',
                fontFamily: FONT, marginBottom: 16,
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
            >
              <Plus size={15} /> Add a module
            </motion.button>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', gap: 10 }}>
          <BackBtn onClick={() => goTo(2)} />
          <div style={{ flex: 1 }}>
            <ContinueBtn
              onClick={handleComplete}
              label={modules.length ? "Let's go" : 'Skip for now'}
              loading={saving}
            />
          </div>
        </div>
        {saveError && (
          <p style={{ marginTop: 12, fontSize: 13, color: C.red, textAlign: 'center', fontFamily: FONT }}>
            {saveError}
          </p>
        )}
        <p style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: C.dim, fontFamily: FONT }}>
          You can add modules and build your schedule anytime from the app.
        </p>
      </motion.div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes meshShift {
          0%   { transform: scale(1)    rotate(0deg)  }
          100% { transform: scale(1.07) rotate(2.5deg) }
        }
        .onboard-left {
          width: 40%;
          min-height: 100dvh;
        }
        @media (max-width: 768px) {
          .onboard-left { display: none !important; }
        }
      `}</style>

      <div style={{ minHeight: '100dvh', display: 'flex', fontFamily: FONT, background: C.bg }}>
        <LeftPanel step={step} firstName={firstName.trim()} />

        {/* Right: form panel */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '52px 52px', overflowY: 'auto', minWidth: 0,
        }}>
          <div style={{ width: '100%', maxWidth: 480 }}>
            <AnimatePresence custom={direction.current} mode="wait">
              <motion.div
                key={step}
                custom={direction.current}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
              >
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  )
}
