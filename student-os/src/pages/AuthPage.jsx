import { useState, useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useReducedMotion, MotionConfig } from 'framer-motion'
import { Mail, Lock, ArrowRight, KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:         '#0b0c13',
  surface:    '#0f1018',
  border:     '#1e2030',
  borderHigh: '#2a2c40',
  accent:     '#5b8cff',
  text:       '#e8e9f0',
  muted:      '#7c7e96',
  dim:        '#4a4c60',
  error:      '#fb7185',
  green:      '#34d399',
  purple:     '#a78bfa',
}
const FONT   = "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif"
const SPRING = { type: 'spring', stiffness: 280, damping: 28 }
const SOFT   = { type: 'spring', stiffness: 160, damping: 24 }

const fieldVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const rowVariant = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
}

// ─── Error humanizer ──────────────────────────────────────────────────────────
function friendlyError(raw) {
  if (!raw) return null
  const r = raw.toLowerCase()
  if (r.includes('invalid login credentials') || r.includes('invalid_credentials'))
    return 'Email or password is incorrect.'
  if (r.includes('email not confirmed'))
    return 'Email not confirmed. Check your inbox or resend below.'
  if (r.includes('user already registered') || r.includes('already registered'))
    return 'An account with this email already exists. Try signing in.'
  if (r.includes('rate limit') || r.includes('too many'))
    return 'Too many attempts. Wait a minute and try again.'
  if ((r.includes('password') && r.includes('short')) || r.includes('at least 6'))
    return 'Password must be at least 6 characters.'
  if (r.includes('invalid email') || r.includes('unable to validate email'))
    return 'Enter a valid email address.'
  return raw
}

// ─── Week preview — sample semester snapshot shown in left panel ───────────────
const PREVIEW_DAYS = [
  { label: 'Mon', events: [
    { code: 'CS301', type: 'Lecture', color: '#5b8cff' },
    { code: 'MATH', type: 'Tutorial', color: '#a78bfa' },
  ]},
  { label: 'Tue', events: [
    { code: 'ECON', type: 'Lecture', color: '#34d399' },
  ]},
  { label: 'Wed', events: [
    { code: 'CS301', type: 'Lab', color: '#5b8cff' },
    { code: 'CS301', type: 'Lecture', color: '#5b8cff' },
  ]},
  { label: 'Thu', events: [
    { code: 'MATH', type: 'Lecture', color: '#a78bfa' },
  ]},
  { label: 'Fri', events: [
    { code: 'ECON', type: 'Essay due', color: '#fb7185' },
  ]},
]

const WeekPreview = memo(function WeekPreview() {
  return (
    <div>
      {/* 5-day timetable grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
        {PREVIEW_DAYS.map((day) => (
          <div key={day.label} style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 9, fontWeight: 600, color: C.muted, letterSpacing: '0.5px',
              marginBottom: 6, textAlign: 'center', fontFamily: FONT,
              textTransform: 'uppercase',
            }}>
              {day.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {day.events.map((ev, i) => (
                <div key={i} style={{
                  padding: '5px 6px',
                  background: `${ev.color}12`,
                  border: `1px solid ${ev.color}28`,
                  borderRadius: 5,
                  overflow: 'hidden',
                  minWidth: 0,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: ev.color,
                    fontFamily: FONT, lineHeight: 1.2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {ev.code}
                  </div>
                  <div style={{
                    fontSize: 9, color: 'rgba(232,233,240,0.5)',
                    fontFamily: FONT, lineHeight: 1.3,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {ev.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

// ─── Magnetic CTA button ──────────────────────────────────────────────────────
function MagneticButton({ children, onClick, disabled, loading, style: extra }) {
  const ref = useRef(null)
  const mx  = useMotionValue(0)
  const my  = useMotionValue(0)
  const tx  = useTransform(mx, [-60, 60], [-7, 7])
  const ty  = useTransform(my, [-28, 28], [-4, 4])

  function onMove(e) {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    mx.set(e.clientX - r.left - r.width / 2)
    my.set(e.clientY - r.top  - r.height / 2)
  }
  function onLeave() { mx.set(0); my.set(0) }

  return (
    <motion.button
      ref={ref}
      type="button"
      style={{ x: tx, y: ty, ...extra }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={disabled || loading ? undefined : onClick}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={SPRING}
    >
      {children}
    </motion.button>
  )
}

// ─── Google icon ──────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
  </svg>
)

// ─── Animated input field ─────────────────────────────────────────────────────
function Field({ label, type, placeholder, value, onChange, autoComplete }) {
  const [foc, setFoc] = useState(false)
  const id = `auth-${label.toLowerCase().replace(/\s+/g, '-')}`
  const Icon = type === 'email' ? Mail : Lock
  return (
    <motion.div variants={rowVariant} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label htmlFor={id} style={{
        fontSize: 12, fontWeight: 500, letterSpacing: '0.2px',
        color: foc ? C.accent : C.muted,
        transition: 'color 0.18s', cursor: 'pointer',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <Icon size={14} strokeWidth={1.8} color={foc ? C.accent : C.dim} style={{
          position: 'absolute', left: 14, top: '50%',
          transform: 'translateY(-50%)', pointerEvents: 'none',
          transition: 'color 0.18s',
        }} />
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFoc(true)}
          onBlur={() => setFoc(false)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '11px 14px 11px 40px',
            background: foc ? 'rgba(91,140,255,0.05)' : 'rgba(255,255,255,0.025)',
            border: `1px solid ${foc ? 'rgba(91,140,255,0.45)' : C.border}`,
            borderRadius: 10, color: C.text, fontSize: 14,
            outline: 'none', fontFamily: FONT,
            boxShadow: foc
              ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 3px rgba(91,140,255,0.08)'
              : 'inset 0 1px 0 rgba(255,255,255,0.04)',
            transition: 'border-color 0.18s, background 0.18s, box-shadow 0.18s',
          }}
        />
      </div>
    </motion.div>
  )
}

// ─── Left panel — app preview, not marketing copy ─────────────────────────────
const LeftPanel = memo(function LeftPanel() {
  return (
    <div className="auth-left" style={{
      position: 'relative', overflow: 'hidden', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Base — no animation, two static atmospheric radials */}
      <div style={{ position: 'absolute', inset: 0, background: '#080a12' }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 90% 60% at 15% 75%, rgba(91,140,255,0.16) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 70% 20%, rgba(167,139,250,0.10) 0%, transparent 55%)
        `,
      }} />
      {/* Blend into form panel */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, transparent 60%, #0b0c13 100%)',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, padding: '44px 48px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo — anchored top */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ...SOFT }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 }}
        >
          <img src="/icons/icon-192.png" alt="" style={{ width: 32, height: 32, borderRadius: 9, objectFit: 'cover' }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: 'rgba(232,233,240,0.9)', letterSpacing: '-0.2px', fontFamily: FONT }}>
            StudentOS
          </span>
        </motion.div>

        {/* Semester context — fills the gap */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, ...SOFT }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 8 }}
        >
          {/* Big week number */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 88, fontWeight: 800, color: C.text, lineHeight: 1, letterSpacing: '-3px', fontFamily: FONT }}>
                8
              </span>
              <span style={{ fontSize: 24, fontWeight: 600, color: C.muted, fontFamily: FONT, letterSpacing: '-0.4px' }}>
                of 12
              </span>
            </div>
            <span style={{ fontSize: 13, color: C.muted, fontFamily: FONT, letterSpacing: '0.2px' }}>
              teaching weeks
            </span>
          </div>

          {/* Semester progress bar */}
          <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginBottom: 12 }}>
            <div style={{ height: '100%', width: '66.7%', background: 'rgba(91,140,255,0.65)', borderRadius: 3 }} />
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: 12, color: C.dim, fontFamily: FONT }}>66% complete</span>
            <span style={{ fontSize: 12, color: C.dim, fontFamily: FONT }}>4 weeks left</span>
          </div>
        </motion.div>

        {/* Week preview — anchored bottom */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, ...SOFT }}
          style={{ paddingBottom: 44 }}
        >
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: 'rgba(232,233,240,0.55)', fontFamily: FONT, letterSpacing: '0.1px' }}>
              This week
            </span>
          </div>
          <WeekPreview />
        </motion.div>
      </div>
    </div>
  )
})

// ─── Confirmation screen — handles both email verify and password reset ────────
function ConfirmationScreen({ email, type, onBack }) {
  const [cooldown, setCooldown] = useState(0)
  const [sending,  setSending]  = useState(false)
  const [done,     setDone]     = useState(false)
  const prefersReduced = useReducedMotion()
  const isReset = type === 'reset'

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function resend() {
    setSending(true); setDone(false)
    if (isReset) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}?reset=true`,
      })
      setSending(false)
      if (!error) { setDone(true); setCooldown(60) }
    } else {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      setSending(false)
      if (!error) { setDone(true); setCooldown(60) }
    }
  }

  const iconColor = isReset ? C.purple : C.accent
  const iconRgb   = isReset ? '167,139,250' : '91,140,255'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SOFT}
      style={{
        minHeight: '100dvh', background: C.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: FONT,
      }}
    >
      <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        {/* Icon with optional pulse ring */}
        <div style={{ position: 'relative', width: 60, height: 60, margin: '0 auto 28px' }}>
          {!prefersReduced && (
            <motion.div
              animate={{ scale: [1, 1.18, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', inset: -10, borderRadius: '50%',
                border: `1px solid rgba(${iconRgb},0.18)`,
              }}
            />
          )}
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: `rgba(${iconRgb},0.09)`,
            border: `1px solid rgba(${iconRgb},0.22)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
          }}>
            {isReset
              ? <KeyRound size={24} color={iconColor} strokeWidth={1.6} />
              : <Mail     size={24} color={iconColor} strokeWidth={1.6} />}
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 10px', letterSpacing: '-0.4px' }}>
          {isReset ? 'Reset link sent' : 'Check your inbox'}
        </h1>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, margin: '0 0 32px' }}>
          {isReset ? (
            <>We sent a password reset link to<br />
            <span style={{ color: C.text, fontWeight: 600 }}>{email}</span>.<br />
            Click it to choose a new password.</>
          ) : (
            <>We sent a confirmation link to<br />
            <span style={{ color: C.text, fontWeight: 600 }}>{email}</span>.<br />
            Click it to activate your account, then sign in.</>
          )}
        </p>

        <AnimatePresence>
          {done && (
            <motion.p
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ fontSize: 13, color: C.green, marginBottom: 14 }}
            >
              {isReset ? 'Reset link resent.' : 'Email resent.'}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          onClick={resend}
          disabled={sending || cooldown > 0}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'block', width: '100%', padding: '12px 0', borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: 'rgba(255,255,255,0.03)',
            color: cooldown > 0 ? C.dim : C.muted,
            fontSize: 13, fontWeight: 500,
            cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
            fontFamily: FONT, marginBottom: 14,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            transition: 'color 0.2s',
          }}
        >
          {sending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : `Resend ${isReset ? 'reset link' : 'confirmation email'}`}
        </motion.button>

        <button className="btn-press"
          onClick={onBack}
          style={{
            background: 'none', border: 'none',
            color: C.accent, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: FONT,
          }}
        >
          Back to sign in
        </button>
      </div>
    </motion.div>
  )
}

// ─── Main auth page ───────────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode,     setMode]     = useState('signin')
  const [email,    setEmail]    = useState('')
  const [pw,       setPw]       = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [gLoad,    setGLoad]    = useState(false)
  const [sentTo,   setSentTo]   = useState(null)
  const [sentType, setSentType] = useState('verify')

  async function handleGoogle() {
    setError(null); setGLoad(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) { setError(friendlyError(error.message)); setGLoad(false) }
  }

  async function handleSubmit(e) {
    e?.preventDefault()
    if (loading) return
    setError(null); setLoading(true)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setSentType('verify'); setSentTo(email)
        } else {
          setError(friendlyError(error.message))
        }
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password: pw })
      if (error) setError(friendlyError(error.message))
      else { setSentType('verify'); setSentTo(email) }
    }
    setLoading(false)
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email address above, then click Forgot password.')
      return
    }
    if (loading) return
    setError(null); setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}?reset=true`,
    })
    setLoading(false)
    if (error) setError(friendlyError(error.message))
    else { setSentType('reset'); setSentTo(email) }
  }

  if (sentTo) {
    return (
      <MotionConfig reducedMotion="user">
        <ConfirmationScreen
          email={sentTo}
          type={sentType}
          onBack={() => { setSentTo(null); setMode('signin'); setError(null) }}
        />
      </MotionConfig>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .auth-left { width: 54%; min-height: 100dvh; }
        @media (max-width: 768px) { .auth-left { display: none !important; } }
        .auth-google-btn:hover:not(:disabled) { background: rgba(255,255,255,0.07) !important; border-color: #2a2c40 !important; }
        input:focus-visible { outline: 2px solid rgba(91,140,255,0.4) !important; outline-offset: 2px; }
      `}</style>

      <div style={{ minHeight: '100dvh', display: 'flex', fontFamily: FONT, background: C.bg }}>
        <LeftPanel />

        {/* Right: form panel */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '48px 52px', minWidth: 0,
        }}>
          <div style={{ width: '100%', maxWidth: 364 }}>

            {/* Mode tabs */}
            <div style={{ position: 'relative', display: 'flex', marginBottom: 38 }}>
              {[
                { id: 'signin', label: 'Sign in'  },
                { id: 'signup', label: 'Sign up'  },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => { setMode(id); setError(null) }}
                  style={{
                    flex: 1, padding: '10px 0', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: FONT,
                    fontSize: 14, fontWeight: mode === id ? 700 : 300,
                    color: mode === id ? C.text : C.muted,
                    position: 'relative', zIndex: 1,
                    transition: 'color 0.2s',
                  }}
                >
                  {label}
                  {mode === id && (
                    <motion.div
                      layoutId="tab-line"
                      style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                        background: C.accent, borderRadius: 2,
                      }}
                      transition={SPRING}
                    />
                  )}
                </button>
              ))}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: C.border }} />
            </div>

            {/* Heading */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode + '-head'}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                style={{ marginBottom: 28 }}
              >
                <h1 style={{
                  fontSize: 32, fontWeight: 800, color: C.text,
                  margin: '0 0 5px', letterSpacing: '-0.8px',
                }}>
                  {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                </h1>
                <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
                  {mode === 'signin'
                    ? 'Pick up where you left off'
                    : 'Set up your semester in under 3 minutes'}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Google */}
            <motion.button
              className="auth-google-btn"
              onClick={handleGoogle}
              disabled={gLoad || loading}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                width: '100%', padding: '11px 0', borderRadius: 10, marginBottom: 18,
                border: `1px solid ${C.border}`,
                background: 'rgba(255,255,255,0.04)',
                color: C.text, fontSize: 13, fontWeight: 500,
                cursor: gLoad ? 'not-allowed' : 'pointer', fontFamily: FONT,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              {gLoad
                ? <div style={{ width: 16, height: 16, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : <GoogleIcon />}
              {gLoad ? 'Redirecting...' : 'Continue with Google'}
            </motion.button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 11, color: C.muted }}>or</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            {/* Form */}
            <AnimatePresence mode="wait">
              <motion.form
                key={mode + '-form'}
                variants={fieldVariants} initial="hidden" animate="show"
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <Field
                  label="Email"
                  type="email"
                  placeholder="you@university.ac.uk"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Field
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />

                {/* Forgot password — sign in only */}
                <AnimatePresence>
                  {mode === 'signin' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden', marginTop: -6 }}
                    >
                      <div style={{ textAlign: 'right' }}>
                        <button className="btn-press"
                          type="button"
                          onClick={handleForgotPassword}
                          disabled={loading}
                          style={{
                            background: 'none', border: 'none',
                            color: C.muted, fontSize: 12, fontWeight: 500,
                            cursor: 'pointer', fontFamily: FONT, padding: 0,
                            transition: 'color 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = C.text }}
                          onMouseLeave={e => { e.currentTarget.style.color = C.muted }}
                        >
                          Forgot password?
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{
                        padding: '9px 13px', borderRadius: 8,
                        background: 'rgba(251,113,133,0.08)',
                        border: '1px solid rgba(251,113,133,0.18)',
                        fontSize: 13, color: C.error,
                      }}>
                        {error}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div variants={rowVariant} style={{ marginTop: 4 }}>
                  <MagneticButton
                    onClick={handleSubmit}
                    disabled={!email || !pw}
                    loading={loading}
                    style={{
                      width: '100%', padding: '12px 0', borderRadius: 10,
                      background: loading || !email || !pw ? C.surface : C.accent,
                      color: loading || !email || !pw ? C.dim : 'white',
                      fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      fontFamily: FONT, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 7,
                      border: `1px solid ${loading || !email || !pw ? C.border : 'transparent'}`,
                      boxShadow: email && pw && !loading
                        ? 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 3px rgba(0,0,0,0.4)'
                        : 'none',
                      transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                    }}
                  >
                    {loading
                      ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      : <>{mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={14} strokeWidth={2} /></>}
                  </MagneticButton>
                </motion.div>
              </motion.form>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MotionConfig>
  )
}
