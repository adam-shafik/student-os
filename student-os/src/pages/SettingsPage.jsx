import { useState } from 'react'
import { User, Lock, Palette, AlertTriangle, Check, Eye, EyeOff, Save, Loader2, GraduationCap, Building2, BookOpen } from 'lucide-react'
import { THEMES } from '../theme'

function SectionCard({ title, Icon, accentColor = 'var(--accent-blue)', children }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{
        padding: '14px 22px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 9,
        borderTop: `3px solid ${accentColor}`,
      }}>
        <Icon size={14} color={accentColor} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.2px' }}>{title}</span>
      </div>
      <div style={{ padding: '22px 22px' }}>{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text', readOnly = false, style: extraStyle = {} }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      style={{
        padding: '9px 12px', borderRadius: 8,
        border: '1px solid var(--border-strong)',
        background: readOnly ? 'var(--bg-overlay)' : 'var(--bg-elevated)',
        color: readOnly ? 'var(--text-secondary)' : 'var(--text-primary)',
        fontSize: 13, outline: 'none', width: '100%',
        boxSizing: 'border-box',
        cursor: readOnly ? 'default' : 'text',
        fontFamily: 'inherit', transition: 'border-color 0.15s',
        ...extraStyle,
      }}
      onFocus={e => { if (!readOnly) e.target.style.borderColor = 'var(--border-focus)' }}
      onBlur={e => { if (!readOnly) e.target.style.borderColor = 'var(--border-strong)' }}
    />
  )
}

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div style={{ padding: '9px 13px', borderRadius: 8, background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.25)', color: '#fb7185', fontSize: 13, marginTop: 14 }}>
      {message}
    </div>
  )
}

export default function SettingsPage({ userProfile, userEmail, theme, onThemeChange, onUpdateProfile, onChangePassword, onResetOnboarding }) {
  const [firstName,  setFirstName]  = useState(userProfile?.first_name    || '')
  const [lastName,   setLastName]   = useState(userProfile?.last_name     || '')
  const [dob,        setDob]        = useState(userProfile?.date_of_birth || '')
  const [university, setUniversity] = useState(userProfile?.university    || '')
  const [degree,     setDegree]     = useState(userProfile?.degree        || '')

  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved,  setProfileSaved]  = useState(false)
  const [profileError,  setProfileError]  = useState(null)

  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew,         setShowNew]         = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [pwSaving,        setPwSaving]        = useState(false)
  const [pwSaved,         setPwSaved]         = useState(false)
  const [pwError,         setPwError]         = useState(null)

  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetBusy,    setResetBusy]    = useState(false)

  const initials = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || '?'

  const handleSaveProfile = async () => {
    if (!firstName.trim()) { setProfileError('First name is required'); return }
    setProfileSaving(true); setProfileError(null)
    const { error } = await onUpdateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      date_of_birth: dob || null,
      university: university.trim() || null,
      degree: degree.trim() || null,
    })
    setProfileSaving(false)
    if (error) { setProfileError(error.message || 'Save failed'); return }
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2500)
  }

  const handleChangePassword = async () => {
    if (!newPassword)               { setPwError('Enter a new password'); return }
    if (newPassword.length < 6)     { setPwError('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return }
    setPwSaving(true); setPwError(null)
    const { error } = await onChangePassword(newPassword)
    setPwSaving(false)
    if (error) { setPwError(error.message || 'Password change failed'); return }
    setPwSaved(true)
    setNewPassword(''); setConfirmPassword('')
    setTimeout(() => setPwSaved(false), 2500)
  }

  const handleReset = async () => {
    setResetBusy(true)
    await onResetOnboarding()
    setResetBusy(false)
  }

  const SaveBtn = ({ saving, saved, onClick, color = 'var(--accent-blue)', label, savedLabel = 'Saved' }) => (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '9px 18px', borderRadius: 9, border: 'none',
        cursor: saving ? 'default' : 'pointer',
        background: saved ? 'var(--accent-green)' : color,
        color: saved ? '#030a06' : 'var(--btn-primary-text)',
        fontSize: 13, fontWeight: 600,
        transition: 'all 0.2s', opacity: saving ? 0.7 : 1,
        fontFamily: 'inherit',
      }}
    >
      {saving
        ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
        : saved ? <Check size={14} /> : <Save size={14} />}
      {saved ? savedLabel : saving ? 'Saving…' : label}
    </button>
  )

  return (
    <div style={{ padding: '32px 40px', maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Settings</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{userEmail}</p>
      </div>

      {/* Profile */}
      <SectionCard title="Profile" Icon={User} accentColor="var(--accent-blue)">
        <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
          <div style={{
            width: 62, height: 62, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#fff',
            boxShadow: 'var(--glow-blue, none)',
          }}>
            {initials}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="First Name">
                <TextInput value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
              </Field>
              <Field label="Last Name">
                <TextInput value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
              </Field>
            </div>

            <Field label="Email">
              <TextInput value={userEmail} readOnly />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Date of Birth">
                <TextInput type="date" value={dob} onChange={e => setDob(e.target.value)} style={{ colorScheme: 'dark' }} />
              </Field>
              <Field label="University">
                <TextInput value={university} onChange={e => setUniversity(e.target.value)} placeholder="Your university" />
              </Field>
            </div>

            <Field label="Degree / Major">
              <TextInput value={degree} onChange={e => setDegree(e.target.value)} placeholder="e.g. BSc Computer Science" />
            </Field>
          </div>
        </div>

        <ErrorBanner message={profileError} />

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
          <SaveBtn saving={profileSaving} saved={profileSaved} onClick={handleSaveProfile} label="Save Profile" />
        </div>
      </SectionCard>

      {/* Security */}
      <SectionCard title="Security" Icon={Lock} accentColor="var(--accent-purple)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="New Password">
            <div style={{ position: 'relative' }}>
              <TextInput
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
              <button
                onClick={() => setShowNew(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>

          <Field label="Confirm New Password">
            <div style={{ position: 'relative' }}>
              <TextInput
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
              />
              <button
                onClick={() => setShowConfirm(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
        </div>

        <ErrorBanner message={pwError} />

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
          <SaveBtn
            saving={pwSaving} saved={pwSaved} onClick={handleChangePassword}
            color="var(--accent-purple)" label="Change Password" savedLabel="Password Updated"
          />
        </div>
      </SectionCard>

      {/* Appearance */}
      <SectionCard title="Appearance" Icon={Palette} accentColor="var(--accent-purple)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {THEMES.map(t => {
            const isActive = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => onThemeChange(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 13px', borderRadius: 10, textAlign: 'left',
                  border: isActive ? '1.5px solid var(--accent-purple)' : '1px solid var(--border-strong)',
                  background: isActive ? 'var(--nav-active)' : 'var(--bg-elevated)',
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                  boxShadow: isActive ? 'var(--glow-purple, none)' : 'none',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border-focus)' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--border-strong)' } }}
              >
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  {t.preview.map((c, i) => (
                    <div key={i} style={{ width: i === 2 ? 10 : 7, height: 22, borderRadius: 3, background: c, opacity: i === 2 ? 0.55 : 1 }} />
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? 'var(--accent-purple)' : 'var(--text-primary)', marginBottom: 2 }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                </div>
                {isActive && <Check size={13} color="var(--accent-purple)" style={{ flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      </SectionCard>

      {/* Danger Zone */}
      <SectionCard title="Danger Zone" Icon={AlertTriangle} accentColor="#fb7185">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Reset Onboarding</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 380 }}>
              Wipes all your data — domains, schedule, assessments, notes, todos, and study sessions. This cannot be undone.
            </div>
          </div>

          {resetConfirm ? (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => setResetConfirm(false)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetBusy}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontSize: 13, fontWeight: 600, cursor: resetBusy ? 'default' : 'pointer', opacity: resetBusy ? 0.7 : 1, fontFamily: 'inherit' }}
              >
                {resetBusy ? 'Resetting…' : 'Yes, Reset Everything'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setResetConfirm(true)}
              style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(251,113,133,0.3)', background: 'rgba(251,113,133,0.06)', color: '#fb7185', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.14)'; e.currentTarget.style.borderColor = 'rgba(251,113,133,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.06)'; e.currentTarget.style.borderColor = 'rgba(251,113,133,0.3)' }}
            >
              Reset Onboarding
            </button>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
