import { useState } from 'react'
import { GraduationCap, Mail, Lock, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const inputStyle = {
  width: '100%', padding: '11px 14px 11px 40px',
  background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2030',
  borderRadius: 10, color: '#e8e9f0', fontSize: 14, outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
}

function InputField({ icon: Icon, type, placeholder, value, onChange }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <Icon size={15} color={focused ? '#5b8cff' : '#4a4c60'} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...inputStyle, borderColor: focused ? '#5b8cff' : '#1e2030' }}
        required
      />
    </div>
  )
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
  </svg>
)

export default function AuthPage() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [signedUp, setSignedUp] = useState(false)

  const handleGoogleAuth = async () => {
    setError(null)
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSignedUp(true)
    }
    setLoading(false)
  }

  if (signedUp) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0c13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #5b8cff, #a78bfa)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <GraduationCap size={24} color="white" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e8e9f0', marginBottom: 10 }}>Check your email</div>
          <div style={{ fontSize: 14, color: '#7c7e96', lineHeight: 1.6 }}>
            We sent a confirmation link to <span style={{ color: '#e8e9f0' }}>{email}</span>. Click it to activate your account.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0c13', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #5b8cff, #a78bfa)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(91,140,255,0.3)' }}>
            <GraduationCap size={20} color="white" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#e8e9f0', letterSpacing: '-0.4px' }}>StudentOS</span>
        </div>

        {/* Card */}
        <div style={{ background: '#0f1018', border: '1px solid #1e2030', borderRadius: 16, padding: '28px 28px 24px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e8e9f0', marginBottom: 4 }}>
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </div>
          <div style={{ fontSize: 13, color: '#7c7e96', marginBottom: 24 }}>
            {mode === 'signin' ? 'Sign in to your StudentOS account' : 'Get started with StudentOS'}
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleAuth}
            disabled={googleLoading || loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '11px 0', borderRadius: 10, marginBottom: 20,
              border: '1px solid #2a2c40', background: googleLoading ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
              color: '#e8e9f0', fontSize: 14, fontWeight: 500,
              cursor: googleLoading || loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { if (!googleLoading && !loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = '#3a3c54' } }}
            onMouseLeave={e => { e.currentTarget.style.background = googleLoading ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = '#2a2c40' }}
          >
            {googleLoading ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="#4a4c60" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#5b8cff" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            ) : <GoogleIcon />}
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#1e2030' }} />
            <span style={{ fontSize: 12, color: '#4a4c60', whiteSpace: 'nowrap' }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: '#1e2030' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <InputField
              icon={Mail} type="email" placeholder="Email"
              value={email} onChange={e => setEmail(e.target.value)}
            />
            <InputField
              icon={Lock} type="password" placeholder="Password"
              value={password} onChange={e => setPassword(e.target.value)}
            />

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)', borderRadius: 8 }}>
                <AlertCircle size={14} color="#fb7185" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#fb7185' }}>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4, padding: '11px 0', borderRadius: 10, border: 'none',
                background: loading ? 'rgba(91,140,255,0.4)' : 'linear-gradient(135deg, #5b8cff, #a78bfa)',
                color: 'white', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#7c7e96' }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
              style={{ background: 'none', border: 'none', color: '#5b8cff', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}
            >
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
