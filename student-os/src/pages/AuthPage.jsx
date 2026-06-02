import { useState, useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { GraduationCap, Mail, Lock, ArrowRight, Calendar, BookOpen, Timer } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Design tokens ────────────────────────────────────────────────────────────
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

const features = [
  { icon: Calendar, label: 'Timetable that fills itself in' },
  { icon: BookOpen, label: 'Notes linked to every session' },
  { icon: Timer,    label: 'Pomodoro timer with history'   },
]

// ─── Magnetic CTA button ──────────────────────────────────────────────────────
function MagneticButton({ children, onClick, disabled, loading, style: extra }) {
  const ref   = useRef(null)
  const mx    = useMotionValue(0)
  const my    = useMotionValue(0)
  const tx    = useTransform(mx, [-60, 60], [-7, 7])
  const ty    = useTransform(my, [-28, 28], [-4, 4])

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

// ─── Animated input field ─────────────────────────────────────────────────────
function Field({ label, type, placeholder, value, onChange }) {
  const [foc, setFoc] = useState(false)
  const Icon = type === 'email' ? Mail : Lock
  return (
    <motion.div variants={rowVariant} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label style={{
        fontSize: 12, fontWeight: 500, letterSpacing: '0.2px',
        color: foc ? C.accent : C.muted,
        transition: 'color 0.18s',
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
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
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

// ─── Google icon ──────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
  </svg>
)

// ─── Left brand panel ─────────────────────────────────────────────────────────
const LeftPanel = memo(function LeftPanel() {
  return (
    <div className="auth-left" style={{
      position: 'relative', overflow: 'hidden', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Animated mesh gradient background */}
      <div style={{ position: 'absolute', inset: 0, background: '#080a12' }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 20% 40%, rgba(91,140,255,0.18) 0%, transparent 60%),
          radial-gradient(ellipse 60% 80% at 80% 70%, rgba(167,139,250,0.12) 0%, transparent 55%),
          radial-gradient(ellipse 70% 50% at 50% 10%,  rgba(52,211,153,0.06) 0%, transparent 60%)
        `,
        animation: 'meshShift 9s ease-in-out infinite alternate',
      }} />
      {/* Right-edge fade into the form panel */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, transparent 60%, #0b0c13 100%)',
      }} />

      {/* Foreground content */}
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, padding: '44px 48px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, ...SOFT }}
          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
        >
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
        </motion.div>

        {/* Headline + features — anchored to bottom third */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: 56 }}>
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, ...SOFT }}
              style={{
                fontSize: 36, fontWeight: 800, lineHeight: 1.15,
                letterSpacing: '-0.8px', color: C.text,
                margin: '0 0 24px', maxWidth: 320, fontFamily: FONT,
              }}
            >
              Keep your semester together.
            </motion.h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {features.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.42 + i * 0.09, ...SOFT }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
                  }}>
                    <f.icon size={12} color="rgba(232,233,240,0.6)" strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: 13, color: 'rgba(232,233,240,0.45)', fontFamily: FONT }}>
                    {f.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

// ─── Email confirmation screen ────────────────────────────────────────────────
function EmailSentScreen({ email, onBack }) {
  const [cooldown, setCooldown] = useState(0)
  const [sending,  setSending]  = useState(false)
  const [done,     setDone]     = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function resend() {
    setSending(true); setDone(false)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setSending(false)
    if (!error) { setDone(true); setCooldown(60) }
  }

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
        {/* Pulsing mail icon */}
        <div style={{ position: 'relative', width: 60, height: 60, margin: '0 auto 28px' }}>
          <motion.div
            animate={{ scale: [1, 1.18, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', inset: -10, borderRadius: '50%',
              border: '1px solid rgba(91,140,255,0.18)',
            }}
          />
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: 'rgba(91,140,255,0.09)',
            border: '1px solid rgba(91,140,255,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
          }}>
            <Mail size={24} color={C.accent} strokeWidth={1.6} />
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 10px', letterSpacing: '-0.4px' }}>
          Check your inbox
        </h1>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, margin: '0 0 32px' }}>
          We sent a confirmation link to<br />
          <span style={{ color: C.text, fontWeight: 600 }}>{email}</span>.<br />
          Click it to activate your account, then come back to sign in.
        </p>

        <AnimatePresence>
          {done && (
            <motion.p
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ fontSize: 13, color: C.green, marginBottom: 14 }}
            >
              Email resent.
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
            fontSize: 13, fontWeight: 500, cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
            fontFamily: FONT, marginBottom: 14,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            transition: 'color 0.2s',
          }}
        >
          {sending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend confirmation email'}
        </motion.button>

        <button
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
  const [mode,    setMode]    = useState('signin')
  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [gLoad,   setGLoad]   = useState(false)
  const [sentTo,  setSentTo]  = useState(null)

  async function handleGoogle() {
    setError(null); setGLoad(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) { setError(error.message); setGLoad(false) }
  }

  async function handleSubmit(e) {
    e?.preventDefault()
    setError(null); setLoading(true)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) setSentTo(email)
        else setError(error.message)
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password: pw })
      if (error) setError(error.message)
      else setSentTo(email)
    }
    setLoading(false)
  }

  if (sentTo) {
    return (
      <EmailSentScreen
        email={sentTo}
        onBack={() => { setSentTo(null); setMode('signin'); setError(null) }}
      />
    )
  }

  return (
    <>
      <style>{`
        @keyframes meshShift {
          0%   { transform: scale(1)    rotate(0deg)   }
          100% { transform: scale(1.06) rotate(2deg)   }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
        .auth-left {
          width: 54%;
          min-height: 100dvh;
        }
        @media (max-width: 768px) {
          .auth-left { display: none !important; }
        }
      `}</style>

      <div style={{
        minHeight: '100dvh', display: 'flex',
        fontFamily: FONT, background: C.bg,
      }}>
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
                    fontSize: 14, fontWeight: mode === id ? 600 : 400,
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
                  fontSize: 24, fontWeight: 700, color: C.text,
                  margin: '0 0 5px', letterSpacing: '-0.5px',
                }}>
                  {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                </h1>
                <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                  {mode === 'signin'
                    ? 'Sign in to pick up where you left off'
                    : 'Get StudentOS set up in under 3 minutes'}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Google */}
            <motion.button
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
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                e.currentTarget.style.borderColor = C.borderHigh
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.borderColor = C.border
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
              <span style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.6px' }}>or</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            {/* Form fields */}
            <AnimatePresence mode="wait">
              <motion.form
                key={mode + '-form'}
                variants={fieldVariants} initial="hidden" animate="show"
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <Field label="Email" type="email" placeholder="you@university.ac.uk" value={email} onChange={e => setEmail(e.target.value)} />
                <Field label="Password" type="password" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} />

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
                      width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
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
                      ? <div style={{ width: 16, height: 16, border: `2px solid rgba(255,255,255,0.2)`, borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      : <>{mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight size={14} strokeWidth={2} /></>}
                  </MagneticButton>
                </motion.div>
              </motion.form>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  )
}
