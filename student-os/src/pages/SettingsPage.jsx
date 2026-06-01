import { useState } from 'react'
import { User, Lock, Palette, AlertTriangle, Check, Eye, EyeOff, Save, Loader2, Calendar, Download, Plus, Trash2, Bell } from 'lucide-react'
import { THEMES } from '../theme'

function SectionCard({ title, Icon, accentColor = 'var(--accent-blue)', children, tutorialId }) {
  return (
    <div data-tutorial-id={tutorialId} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
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

export default function SettingsPage({ userProfile, userEmail, theme, onThemeChange, wallpaperEnabled, onToggleWallpaper, semBreaks = [], onUpdateSemester, onExportData, notifStatus = 'unsupported', onEnableNotifications, onDisableNotifications, reminderDays = [1], onUpdateReminderDays, onUpdateProfile, onChangePassword, onResetOnboarding, onEditSchedule }) {
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

  const [semStart,    setSemStart]    = useState(userProfile?.semester_start || '')
  const [semEnd,      setSemEnd]      = useState(userProfile?.semester_end   || '')
  const [breaks,      setBreaks]      = useState(() => semBreaks.map(b => ({ ...b, id: b.id || crypto.randomUUID() })))
  const [semSaving,   setSemSaving]   = useState(false)
  const [semSaved,    setSemSaved]    = useState(false)
  const [semError,    setSemError]    = useState(null)

  const isSunThu  = userProfile?.week_start === 'sunday'
  const startDay  = isSunThu ? 0 : 1   // 0=Sun, 1=Mon
  const endDay    = isSunThu ? 4 : 5   // 4=Thu, 5=Fri
  const breakDay  = isSunThu ? 0 : 1
  const DOW_NAMES = { 0: 'Sunday', 1: 'Monday', 4: 'Thursday', 5: 'Friday' }

  function getDow(str) { return str ? new Date(str + 'T12:00:00').getDay() : null }
  function dowName(str) { const d = getDow(str); return d != null ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d] : '' }

  const addBreak = () => setBreaks(prev => [...prev, { id: crypto.randomUUID(), name: '', startMonday: '', returnMonday: '' }])
  const removeBreak = id => setBreaks(prev => prev.filter(b => b.id !== id))
  const updateBreak = (id, key, val) => setBreaks(prev => prev.map(b => b.id === id ? { ...b, [key]: val } : b))

  const startValid  = !semStart  || getDow(semStart) === startDay
  const endValid    = !semEnd    || getDow(semEnd)   === endDay

  const handleSaveSemester = async () => {
    if (!semStart || !semEnd) { setSemError('Start and end dates are required'); return }
    if (!startValid) { setSemError(`Semester start must be a ${DOW_NAMES[startDay]}`); return }
    if (!endValid)   { setSemError(`Semester end must be a ${DOW_NAMES[endDay]}`); return }
    if (semStart >= semEnd) { setSemError('End date must be after start date'); return }
    const incomplete = breaks.find(b => !b.name.trim() || !b.startMonday || !b.returnMonday)
    if (incomplete) { setSemError('All break fields are required'); return }
    const badBreak = breaks.find(b => getDow(b.startMonday) !== breakDay || getDow(b.returnMonday) !== breakDay)
    if (badBreak) { setSemError(`Break dates must be ${DOW_NAMES[breakDay]}s`); return }
    setSemSaving(true); setSemError(null)
    const { error } = await onUpdateSemester?.({ start: semStart, end: semEnd, breaks })
    setSemSaving(false)
    if (error) { setSemError(error.message || 'Save failed'); return }
    setSemSaved(true)
    setTimeout(() => setSemSaved(false), 2500)
  }

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

      {/* Notifications */}
      <SectionCard title="Notifications" Icon={Bell} accentColor="var(--accent-blue)">
        {notifStatus === 'unsupported' ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Push notifications aren't supported on this device or browser.</p>
        ) : notifStatus === 'denied' ? (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Notifications blocked</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              You've blocked notifications for this app. To re-enable, go to <strong style={{ color: 'var(--text-secondary)' }}>Settings → StudentOS → Notifications</strong> on your device.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {notifStatus === 'granted' ? 'Reminders enabled' : 'Enable reminders'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 380 }}>
                  Get push notifications before upcoming exams and assignments — even when the app is closed.
                </div>
              </div>
              <button
                onClick={notifStatus === 'granted' ? onDisableNotifications : onEnableNotifications}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: notifStatus === 'granted' ? 'var(--accent-blue)' : 'var(--border-strong)',
                  position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: notifStatus === 'granted' ? 23 : 3,
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {notifStatus === 'granted' && (
              <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Remind me</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { days: 0, label: 'Day of' },
                    { days: 1, label: '1 day before' },
                    { days: 3, label: '3 days before' },
                  ].map(opt => {
                    const active = reminderDays.includes(opt.days)
                    return (
                      <button key={opt.days} onClick={() => {
                        const next = active
                          ? reminderDays.filter(d => d !== opt.days)
                          : [...reminderDays, opt.days]
                        if (next.length > 0) onUpdateReminderDays?.(next)
                      }} style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                        border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border-strong)'}`,
                        background: active ? 'rgba(91,140,255,0.12)' : 'none',
                        color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        fontWeight: active ? 600 : 400, transition: 'all 0.15s', fontFamily: 'inherit',
                      }}>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Schedule */}
      <SectionCard title="Schedule" Icon={Calendar} accentColor="var(--accent-blue)">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Weekly Timetable</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 380 }}>
              Add, remove, or rearrange your recurring lecture slots, labs, and tutorials. Changes take effect immediately on your calendar.
            </div>
          </div>
          <button
            onClick={onEditSchedule}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 9, border: 'none',
              background: 'var(--accent-blue)', color: 'var(--btn-primary-text, #fff)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              fontFamily: 'inherit',
            }}
          >
            <Calendar size={14} /> Edit Schedule
          </button>
        </div>
      </SectionCard>

      {/* Semester */}
      <SectionCard title="Semester" Icon={Calendar} accentColor="var(--accent-amber)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <Field label={`Semester Start — must be a ${DOW_NAMES[startDay]}`}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <TextInput type="date" value={semStart} onChange={e => setSemStart(e.target.value)} style={{ colorScheme: 'dark' }} />
                  {semStart && (
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 9px', borderRadius: 6, flexShrink: 0,
                      background: startValid ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)',
                      color: startValid ? '#34d399' : '#fb7185',
                      border: `1px solid ${startValid ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}`,
                    }}>{dowName(semStart)}</span>
                  )}
                </div>
              </Field>
            </div>
            <div>
              <Field label={`Semester End — must be a ${DOW_NAMES[endDay]}`}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <TextInput type="date" value={semEnd} onChange={e => setSemEnd(e.target.value)} style={{ colorScheme: 'dark' }} />
                  {semEnd && (
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 9px', borderRadius: 6, flexShrink: 0,
                      background: endValid ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)',
                      color: endValid ? '#34d399' : '#fb7185',
                      border: `1px solid ${endValid ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}`,
                    }}>{dowName(semEnd)}</span>
                  )}
                </div>
              </Field>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Breaks</span>
              <button onClick={addBreak} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={11} /> Add Break
              </button>
            </div>
            {breaks.length === 0 && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>No breaks added yet.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {breaks.map(b => (
                <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                  <Field label="Name">
                    <TextInput value={b.name} onChange={e => updateBreak(b.id, 'name', e.target.value)} placeholder="e.g. Reading Week" />
                  </Field>
                  <Field label={`Break starts — ${DOW_NAMES[breakDay]}`}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <TextInput type="date" value={b.startMonday} onChange={e => updateBreak(b.id, 'startMonday', e.target.value)} style={{ colorScheme: 'dark' }} />
                      {b.startMonday && (() => { const ok = getDow(b.startMonday) === breakDay; return (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 7px', borderRadius: 5, flexShrink: 0,
                          background: ok ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)',
                          color: ok ? '#34d399' : '#fb7185',
                          border: `1px solid ${ok ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}`,
                        }}>{dowName(b.startMonday)}</span>
                      )})()}
                    </div>
                  </Field>
                  <Field label={`Classes resume — ${DOW_NAMES[breakDay]}`}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <TextInput type="date" value={b.returnMonday} onChange={e => updateBreak(b.id, 'returnMonday', e.target.value)} style={{ colorScheme: 'dark' }} />
                      {b.returnMonday && (() => { const ok = getDow(b.returnMonday) === breakDay; return (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 7px', borderRadius: 5, flexShrink: 0,
                          background: ok ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)',
                          color: ok ? '#34d399' : '#fb7185',
                          border: `1px solid ${ok ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}`,
                        }}>{dowName(b.returnMonday)}</span>
                      )})()}
                    </div>
                  </Field>
                  <button onClick={() => removeBreak(b.id)} style={{ width: 32, height: 36, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.12)'; e.currentTarget.style.color = '#fb7185' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-overlay)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <ErrorBanner message={semError} />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <SaveBtn saving={semSaving} saved={semSaved} onClick={handleSaveSemester} color="var(--accent-amber)" label="Save Semester" />
          </div>
        </div>
      </SectionCard>

      {/* Appearance */}
      <SectionCard title="Appearance" Icon={Palette} accentColor="var(--accent-purple)" tutorialId="theme-switcher">
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

        {THEMES.find(t => t.id === theme)?.wallpaper && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Background photo</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Show the wallpaper for this theme, or use solid colors only</div>
            </div>
            <button
              onClick={() => onToggleWallpaper?.(!wallpaperEnabled)}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: wallpaperEnabled ? 'var(--accent-purple)' : 'var(--border-strong)',
                position: 'relative', flexShrink: 0, transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3,
                left: wallpaperEnabled ? 23 : 3,
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
        )}
      </SectionCard>

      {/* Data */}
      <SectionCard title="Data" Icon={Download} accentColor="var(--accent-green)">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Export Your Data</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 380 }}>
              Download a JSON file of all your domains, assessments, notes, todos, and study sessions.
            </div>
          </div>
          <button
            onClick={onExportData}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, border: 'none', background: 'var(--accent-green)', color: '#030a06', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
          >
            <Download size={14} /> Export JSON
          </button>
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
