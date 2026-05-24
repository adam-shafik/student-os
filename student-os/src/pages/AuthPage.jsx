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

export default function AuthPage() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [signedUp, setSignedUp] = useState(false)

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
