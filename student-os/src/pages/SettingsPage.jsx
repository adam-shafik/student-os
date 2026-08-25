import { useState, useMemo } from 'react'
import { User, Lock, Palette, AlertTriangle, Check, Eye, EyeOff, Save, Loader2, Calendar, CalendarPlus, CalendarSync, Download, Plus, Trash2, Bell, Link2, Unlink, RotateCcw } from 'lucide-react'
import { THEMES } from '../theme'
import ConfirmModal from '../components/ConfirmModal'
import AppSelect, { AppSelectItem } from '../components/AppSelect'

function SectionCard({ title, Icon, accentColor = 'var(--accent-blue)', children, tutorialId, contentStyle }) {
  return (
    <div data-tutorial-id={tutorialId} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{
        padding: '15px 22px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 11,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'var(--bg-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={14} color={accentColor} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.15px' }}>{title}</span>
      </div>
      <div style={{ padding: '22px', ...contentStyle }}>{children}</div>
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

// One row per distinct imported title. This uni titles each event with the module
// itself, so the list is one entry per module and stays short.
function EventMapping({ domains, importedEvents, mappings, busy, onSave }) {
  const groups = useMemo(() => {
    const byKey = new Map()
    for (const ev of importedEvents) {
      const module = ev.googleSummary || ev.title
      const key = module.trim().toLowerCase()
      if (!byKey.has(key)) byKey.set(key, { key, title: module, count: 0, domainId: ev.domainId })
      byKey.get(key).count++
    }
    return [...byKey.values()].sort((a, b) =>
      (a.domainId ? 1 : 0) - (b.domainId ? 1 : 0) || a.title.localeCompare(b.title))
  }, [importedEvents])

  const initial = useMemo(() => {
    const map = {}
    for (const g of groups) {
      const saved = mappings.find(m => m.title_key === g.key)
      map[g.key] = { domainId: saved?.domain_id ?? g.domainId ?? '' }
    }
    return map
  }, [groups, mappings])

  // Remounted via `key` whenever the imported set changes, so the draft starts
  // from current data without syncing state during render.
  const [draft, setDraft] = useState(initial)

  const set = (key, field, value) =>
    setDraft(d => ({ ...d, [key]: { ...d[key], [field]: value } }))

  const changed = groups.filter(g => draft[g.key]?.domainId !== initial[g.key]?.domainId)

  if (!groups.length) {
    if (busy) return null   // mid-sync the list is briefly empty; don't flash "nothing imported"
    return (
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        No events imported yet, so there is nothing to match. If the sync above reported
        <strong style={{ color: 'var(--text-secondary)' }}> 0 added</strong>, Google returned no events in the
        imported range (three months back to a year ahead).
      </div>
    )
  }
  const unmapped = groups.filter(g => !draft[g.key]?.domainId).length

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Match to domains</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {unmapped > 0
            ? `${unmapped} of ${groups.length} modules aren’t linked to a domain yet.`
            : 'All modules are linked. Future syncs reuse these.'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
        {groups.map(g => (
          <div key={g.key} style={{
            display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 190px', gap: 8, alignItems: 'center',
            padding: '9px 11px', borderRadius: 9,
            background: draft[g.key]?.domainId ? 'transparent' : 'rgba(251,191,36,0.06)',
            border: `1px solid ${draft[g.key]?.domainId ? 'var(--border)' : 'rgba(251,191,36,0.28)'}`,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.count} event{g.count === 1 ? '' : 's'}</div>
            </div>
            <AppSelect value={draft[g.key]?.domainId || ''} onChange={v => set(g.key, 'domainId', v)}>
              <AppSelectItem value="">No domain</AppSelectItem>
              {domains.map(d => (
                <AppSelectItem key={d.id} value={d.id}>{d.code ? `${d.code} · ` : ''}{d.name}</AppSelectItem>
              ))}
            </AppSelect>
          </div>
        ))}
      </div>

      <button className="btn-press" disabled={!changed.length || busy}
        onClick={() => onSave(changed.map(g => ({ titleKey: g.key, ...draft[g.key] })))}
        style={{
          alignSelf: 'flex-start', padding: '9px 18px', borderRadius: 9, border: 'none',
          fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          background: changed.length ? 'var(--accent-blue)' : 'var(--border)',
          color: changed.length ? 'var(--btn-primary-text, #fff)' : 'var(--text-muted)',
          cursor: changed.length && !busy ? 'pointer' : 'default',
        }}>
        {busy === 'syncing' ? 'Saving…' : `Apply ${changed.length || ''} change${changed.length === 1 ? '' : 's'}`}
      </button>
    </div>
  )
}

function GoogleCalendarSection({ connection, calendarList, busy, result, domains = [], importedEvents = [], mappings = [], onConnect, onSelect, onSync, onDisconnect, onSaveMappings, onResetImports }) {
  const [resetConfirm, setResetConfirm] = useState(false)
  const [picked, setPicked] = useState([])

  const btn = (bg, color) => ({
    display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 9,
    border: 'none', background: bg, color, fontSize: 13, fontWeight: 600,
    cursor: busy ? 'default' : 'pointer', flexShrink: 0, fontFamily: 'inherit',
    opacity: busy ? 0.6 : 1, transition: 'all 0.15s',
  })

  const fmt = iso => iso
    ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  // Calendar picker — shown straight after consent, before the first sync.
  if (calendarList) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Which of these is your timetable? Only the ones you tick get imported.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
          {calendarList.map(cal => {
            const on = picked.includes(cal.id)
            return (
              <button className="btn-press" key={cal.id}
                onClick={() => setPicked(p => on ? p.filter(x => x !== cal.id) : [...p, cal.id])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 9,
                  border: `1px solid ${on ? 'var(--accent-green)' : 'var(--border-strong)'}`,
                  background: on ? 'rgba(52,211,153,0.10)' : 'transparent',
                  color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.12s',
                }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${on ? 'var(--accent-green)' : 'var(--border-strong)'}`,
                  background: on ? 'var(--accent-green)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{on && <Check size={11} color="#0b0b0f" />}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cal.summary}
                </span>
              </button>
            )
          })}
        </div>
        {result?.error && (
          <div style={{ fontSize: 12, color: 'var(--accent-red)', lineHeight: 1.5 }}>{result.error}</div>
        )}
        <button className="btn-press" disabled={!picked.length || busy}
          onClick={() => onSelect(picked)}
          style={btn(picked.length ? 'var(--accent-green)' : 'var(--border)', picked.length ? '#0b0b0f' : 'var(--text-muted)')}>
          {busy === 'syncing' ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Importing…</> : <>Import {picked.length || ''} calendar{picked.length === 1 ? '' : 's'}</>}
        </button>
      </div>
    )
  }

  if (!connection) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Import your university timetable</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 380 }}>
            Connect the Google account your timetable lives in. Classes import with their real times and rooms, and stay editable here. Read-only — StudentOS never writes to Google.
          </div>
          {result?.error && <div style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 8, maxWidth: 380 }}>{result.error}</div>}
        </div>
        <button className="btn-press" onClick={onConnect} disabled={busy} style={btn('var(--accent-green)', '#0b0b0f')}>
          {busy === 'connecting' ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Connecting…</> : <><Link2 size={14} /> Connect</>}
        </button>
      </div>
    )
  }

  const noCalendars = !connection.calendar_ids?.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {connection.google_email || 'Connected'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {noCalendars
              ? 'No calendar selected yet — reconnect to pick one.'
              : `Syncing ${connection.calendar_ids.length} calendar${connection.calendar_ids.length === 1 ? '' : 's'}.`}
            {connection.last_synced_at && <> Last synced {fmt(connection.last_synced_at)}.</>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn-press" onClick={onSync} disabled={busy || noCalendars} style={btn('var(--accent-blue)', 'var(--btn-primary-text, #fff)')}>
            {busy === 'syncing' ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Syncing…</> : <><CalendarSync size={14} /> Sync now</>}
          </button>
          <button className="btn-press" onClick={onDisconnect} disabled={busy}
            style={{ ...btn('transparent', 'var(--text-secondary)'), border: '1px solid var(--border-strong)' }}>
            <Unlink size={14} /> Disconnect
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 420 }}>
          Imports looking wrong? Clear them all and pull a fresh copy — your saved domain matches are kept and reapplied.
        </div>
        <button className="btn-press" onClick={() => setResetConfirm(true)} disabled={busy || noCalendars}
          style={{ ...btn('transparent', 'var(--accent-amber)'), border: '1px solid rgba(251,191,36,0.35)', padding: '8px 14px', fontSize: 12 }}>
          <RotateCcw size={13} /> Re-import from scratch
        </button>
      </div>

      {resetConfirm && (
        <ConfirmModal
          message="Deletes every event imported from Google and pulls a fresh copy. Notes attached to an imported event will be orphaned, and hand-edits to imported events are lost. Your domain matches are kept."
          confirmLabel="Re-import"
          onConfirm={() => { setResetConfirm(false); onResetImports() }}
          onCancel={() => setResetConfirm(false)}
        />
      )}

      {(result?.error || connection.last_sync_error) && (
        <div style={{ fontSize: 12, color: 'var(--accent-red)', lineHeight: 1.5 }}>
          {result?.error || connection.last_sync_error}
        </div>
      )}

      <EventMapping
        key={`${importedEvents.length}:${importedEvents.filter(e => !e.domainId).length}:${mappings.length}`}
        domains={domains}
        importedEvents={importedEvents}
        mappings={mappings}
        busy={busy}
        onSave={onSaveMappings}
      />

      {result?.mapped > 0 && (
        <div style={{ fontSize: 12, color: 'var(--accent-green)' }}>
          Updated {result.mapped} title{result.mapped === 1 ? '' : 's'}.
        </div>
      )}

      {result && !result.error && result.inserted !== undefined && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {result.inserted} added · {result.updated} updated · {result.removed} removed
          {result.skippedEdited > 0 && <> · {result.skippedEdited} left alone (edited here)</>}
          {result.unmatched > 0 && <><br /><span style={{ color: 'var(--accent-amber)' }}>{result.unmatched} couldn’t be matched to a domain — open them on the calendar to assign one.</span></>}
        </div>
      )}
    </div>
  )
}

export default function SettingsPage({ userProfile, userEmail, theme, onThemeChange, wallpaperEnabled, onToggleWallpaper, semBreaks = [], terms = [], currentTerm = null, onUpdateSemester, onStartNewSemester, onExportData, notifStatus = 'unsupported', onEnableNotifications, onDisableNotifications, onUpdateProfile, onChangePassword, onResetOnboarding, onEditSchedule, googleCal = null, googleCalendarList = null, googleBusy = null, googleResult = null, googleConfigured = false, onConnectGoogle, onSelectGoogleCalendars, onSyncGoogle, onDisconnectGoogle, domains = [], importedEvents = [], googleMappings = [], onSaveGoogleMappings, onResetGoogleImports }) {
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

  const [semStart,  setSemStart]  = useState(currentTerm?.start || userProfile?.semester_start || '')
  const [semEnd,    setSemEnd]    = useState(currentTerm?.end   || userProfile?.semester_end   || '')
  const [breaks,    setBreaks]    = useState(() => semBreaks.filter(b => !currentTerm || b.termId === currentTerm.id).map(b => ({ ...b, id: b.id || crypto.randomUUID() })))
  const [semSaving, setSemSaving] = useState(false)
  const [semSaved,  setSemSaved]  = useState(false)
  const [semError,  setSemError]  = useState(null)

  const isSunThu  = userProfile?.week_start === 'sunday'
  const startDay  = isSunThu ? 0 : 1
  const endDay    = isSunThu ? 4 : 5
  const breakDay  = isSunThu ? 0 : 1
  const DOW_NAMES = { 0: 'Sunday', 1: 'Monday', 4: 'Thursday', 5: 'Friday' }

  function getDow(str) { return str ? new Date(str + 'T12:00:00').getDay() : null }
  function dowName(str) { const d = getDow(str); return d != null ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d] : '' }

  const addBreak    = () => setBreaks(prev => [...prev, { id: crypto.randomUUID(), name: '', startMonday: '', returnMonday: '' }])
  const removeBreak = id => setBreaks(prev => prev.filter(b => b.id !== id))
  const updateBreak = (id, key, val) => setBreaks(prev => prev.map(b => b.id === id ? { ...b, [key]: val } : b))

  const startValid = !semStart || getDow(semStart) === startDay
  const endValid   = !semEnd   || getDow(semEnd)   === endDay

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
      last_name:  lastName.trim(),
      date_of_birth: dob || null,
      university: university.trim() || null,
      degree:     degree.trim() || null,
    })
    setProfileSaving(false)
    if (error) { setProfileError(error.message || 'Save failed'); return }
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2500)
  }

  const handleChangePassword = async () => {
    if (!newPassword)                    { setPwError('Enter a new password'); return }
    if (newPassword.length < 6)          { setPwError('Password must be at least 6 characters'); return }
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
    <button className="btn-press"
      onClick={onClick}
      disabled={saving}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '10px 20px', borderRadius: 9, border: 'none',
        cursor: saving ? 'default' : 'pointer',
        background: saved ? 'var(--accent-green)' : color,
        color: saved ? '#030a06' : 'var(--btn-primary-text)',
        fontSize: 13, fontWeight: 600,
        transition: 'all 0.18s', opacity: saving ? 0.7 : 1,
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (!saving && !saved) { e.currentTarget.style.filter = 'brightness(1.12)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none' }}
      onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0) scale(0.98)' }}
      onMouseUp={e => { if (!saving && !saved) e.currentTarget.style.transform = 'translateY(-1px)' }}
    >
      {saving ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : saved ? <Check size={14} /> : <Save size={14} />}
      {saved ? savedLabel : saving ? 'Saving…' : label}
    </button>
  )

  const displayName   = [firstName, lastName].filter(Boolean).join(' ')
  const displayDetail = [degree, university].filter(Boolean).join(', ')

  return (
    <div style={{ padding: '32px 40px', maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 26, paddingBottom: 60 }}>

      {/* Identity header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, paddingBottom: 28, borderBottom: '1px solid var(--border)' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 22, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px',
        }}>
          {initials}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            {displayName || 'Settings'}
          </h1>
          {displayDetail && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{displayDetail}</p>
          )}
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{userEmail}</p>
        </div>
      </div>

      {/* Profile */}
      <SectionCard title="Profile" Icon={User} accentColor="var(--accent-blue)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
        <ErrorBanner message={profileError} />
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
          <SaveBtn saving={profileSaving} saved={profileSaved} onClick={handleSaveProfile} label="Save profile" />
        </div>
      </SectionCard>

      {/* Security */}
      <SectionCard title="Security" Icon={Lock} accentColor="var(--accent-purple)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="New Password">
            <div style={{ position: 'relative' }}>
              <TextInput type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" />
              <button className="btn-press" onClick={() => setShowNew(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
          <Field label="Confirm New Password">
            <div style={{ position: 'relative' }}>
              <TextInput type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" />
              <button className="btn-press" onClick={() => setShowConfirm(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
        </div>
        <ErrorBanner message={pwError} />
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
          <SaveBtn saving={pwSaving} saved={pwSaved} onClick={handleChangePassword} color="var(--accent-purple)" label="Change password" savedLabel="Password updated" />
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
                  Get push notifications before upcoming exams and assignments, even when the app is closed.
                </div>
              </div>
              <button className="btn-press"
                onClick={notifStatus === 'granted' ? onDisableNotifications : onEnableNotifications}
                style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: notifStatus === 'granted' ? 'var(--accent-blue)' : 'var(--border-strong)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}
              >
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: notifStatus === 'granted' ? 23 : 3, transition: 'left 0.2s' }} />
              </button>
            </div>
            {notifStatus === 'granted' && (
              <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Reminder timing is configured per event. Set it when adding or editing an exam, assignment, or calendar event.
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Schedule */}
      <SectionCard title="Schedule" Icon={Calendar} accentColor="var(--accent-blue)" tutorialId="schedule-settings">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Weekly Timetable</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 380 }}>
              Add, remove, or rearrange your recurring lecture slots, labs, and tutorials. Changes take effect immediately on your calendar.
            </div>
          </div>
          <button className="btn-press"
            onClick={onEditSchedule}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 9, border: 'none', background: 'var(--accent-blue)', color: 'var(--btn-primary-text, #fff)', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.12)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none' }}
          >
            <Calendar size={14} /> Edit schedule
          </button>
        </div>
      </SectionCard>

      {/* Uni calendar */}
      {googleConfigured && (
        <SectionCard title="Uni calendar" Icon={CalendarSync} accentColor="var(--accent-green)">
          <GoogleCalendarSection
            domains={domains}
            importedEvents={importedEvents}
            mappings={googleMappings}
            onSaveMappings={onSaveGoogleMappings}
            onResetImports={onResetGoogleImports}
            connection={googleCal}
            calendarList={googleCalendarList}
            busy={googleBusy}
            result={googleResult}
            onConnect={onConnectGoogle}
            onSelect={onSelectGoogleCalendars}
            onSync={onSyncGoogle}
            onDisconnect={onDisconnectGoogle}
          />
        </SectionCard>
      )}

      {/* Semester */}
      <SectionCard title="Semester" Icon={Calendar} accentColor="var(--accent-amber)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Editing your current semester{currentTerm?.label ? <> — <strong style={{ color: 'var(--text-secondary)' }}>{currentTerm.label}</strong></> : ''}. To move on to the next one, use “Start a new semester” below.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label={`Semester Start (${DOW_NAMES[startDay]})`}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <TextInput type="date" value={semStart} onChange={e => setSemStart(e.target.value)} style={{ colorScheme: 'dark' }} />
                {semStart && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 9px', borderRadius: 6, flexShrink: 0, background: startValid ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)', color: startValid ? '#34d399' : '#fb7185', border: `1px solid ${startValid ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}` }}>{dowName(semStart)}</span>
                )}
              </div>
            </Field>
            <Field label={`Semester End (${DOW_NAMES[endDay]})`}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <TextInput type="date" value={semEnd} onChange={e => setSemEnd(e.target.value)} style={{ colorScheme: 'dark' }} />
                {semEnd && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 9px', borderRadius: 6, flexShrink: 0, background: endValid ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)', color: endValid ? '#34d399' : '#fb7185', border: `1px solid ${endValid ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}` }}>{dowName(semEnd)}</span>
                )}
              </div>
            </Field>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Breaks</span>
              <button className="btn-press" onClick={addBreak} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={11} /> Add break
              </button>
            </div>
            {breaks.length === 0 && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>No breaks added yet.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {breaks.map(b => (
                <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                  <Field label="Name">
                    <TextInput value={b.name} onChange={e => updateBreak(b.id, 'name', e.target.value)} placeholder="e.g. Reading Week" />
                  </Field>
                  <Field label={`Break starts (${DOW_NAMES[breakDay]})`}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <TextInput type="date" value={b.startMonday} onChange={e => updateBreak(b.id, 'startMonday', e.target.value)} style={{ colorScheme: 'dark' }} />
                      {b.startMonday && (() => { const ok = getDow(b.startMonday) === breakDay; return <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 7px', borderRadius: 5, flexShrink: 0, background: ok ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)', color: ok ? '#34d399' : '#fb7185', border: `1px solid ${ok ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}` }}>{dowName(b.startMonday)}</span> })()}
                    </div>
                  </Field>
                  <Field label={`Classes resume (${DOW_NAMES[breakDay]})`}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <TextInput type="date" value={b.returnMonday} onChange={e => updateBreak(b.id, 'returnMonday', e.target.value)} style={{ colorScheme: 'dark' }} />
                      {b.returnMonday && (() => { const ok = getDow(b.returnMonday) === breakDay; return <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 7px', borderRadius: 5, flexShrink: 0, background: ok ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)', color: ok ? '#34d399' : '#fb7185', border: `1px solid ${ok ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}` }}>{dowName(b.returnMonday)}</span> })()}
                    </div>
                  </Field>
                  <button className="btn-press" onClick={() => removeBreak(b.id)} style={{ width: 32, height: 36, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
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
            <SaveBtn saving={semSaving} saved={semSaved} onClick={handleSaveSemester} color="var(--accent-amber)" label="Save semester" />
          </div>
        </div>
      </SectionCard>

      {/* New semester rollover */}
      <SectionCard title="New semester" Icon={CalendarPlus} accentColor="var(--accent-green)">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Move on to a new semester</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 400 }}>
              Set fresh dates and modules for the next term. Your current modules move to your Past section — nothing is deleted, and old notes, grades, and calendar history stay intact. You can carry over ongoing societies or projects.
            </div>
          </div>
          <button className="btn-press"
            onClick={onStartNewSemester}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 9, border: 'none', background: 'var(--accent-green)', color: '#052e1a', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none' }}
          >
            <CalendarPlus size={14} /> Start a new semester
          </button>
        </div>
      </SectionCard>

      {/* Appearance — hero section */}
      <SectionCard title="Appearance" Icon={Palette} accentColor="var(--accent-purple)" tutorialId="theme-switcher">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
          {THEMES.map(t => {
            const isActive = theme === t.id
            return (
              <button className="btn-press"
                key={t.id}
                onClick={() => onThemeChange(t.id)}
                style={{
                  display: 'flex', flexDirection: 'column',
                  padding: 0, borderRadius: 11, textAlign: 'left',
                  border: `2px solid ${isActive ? 'var(--accent-purple)' : 'var(--border-strong)'}`,
                  background: 'var(--bg-elevated)',
                  cursor: 'pointer', overflow: 'hidden',
                  transition: 'border-color 0.15s, transform 0.15s',
                  fontFamily: 'inherit', outline: 'none',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.transform = 'none' } }}
              >
                <div style={{ display: 'flex', height: 54, flexShrink: 0 }}>
                  {t.preview.map((c, i) => (
                    <div key={i} style={{ flex: 1, background: c }} />
                  ))}
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? 'var(--accent-purple)' : 'var(--text-primary)', marginBottom: 2, letterSpacing: '-0.1px' }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                  </div>
                  {isActive && (
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={11} color="#fff" />
                    </div>
                  )}
                </div>
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
            <button className="btn-press"
              onClick={() => onToggleWallpaper?.(!wallpaperEnabled)}
              style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: wallpaperEnabled ? 'var(--accent-purple)' : 'var(--border-strong)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}
            >
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: wallpaperEnabled ? 23 : 3, transition: 'left 0.2s' }} />
            </button>
          </div>
        )}
      </SectionCard>

      {/* Data */}
      <SectionCard title="Data" Icon={Download} accentColor="var(--accent-green)">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Export your data</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 380 }}>
              Download a JSON file of all your domains, assessments, notes, todos, and study sessions.
            </div>
          </div>
          <button className="btn-press"
            onClick={onExportData}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 9, border: 'none', background: 'var(--accent-green)', color: '#030a06', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none' }}
          >
            <Download size={14} /> Export JSON
          </button>
        </div>
      </SectionCard>

      {/* Danger Zone */}
      <SectionCard title="Danger Zone" Icon={AlertTriangle} accentColor="#fb7185" contentStyle={{ background: 'rgba(251,113,133,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Reset onboarding</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 380 }}>
              Wipes all your data: domains, schedule, assessments, notes, todos, and study sessions. This cannot be undone.
            </div>
          </div>
          <button className="btn-press"
            onClick={() => setResetConfirm(true)}
            style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(251,113,133,0.3)', background: 'rgba(251,113,133,0.06)', color: '#fb7185', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.14)'; e.currentTarget.style.borderColor = 'rgba(251,113,133,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.06)'; e.currentTarget.style.borderColor = 'rgba(251,113,133,0.3)' }}
          >
            Reset onboarding
          </button>
        </div>
      </SectionCard>

      {resetConfirm && (
        <ConfirmModal
          message="This will permanently wipe all your data: domains, schedule, assessments, notes, todos, and study sessions. This cannot be undone."
          confirmLabel={resetBusy ? 'Resetting…' : 'Reset everything'}
          onConfirm={handleReset}
          onCancel={() => setResetConfirm(false)}
        />
      )}
    </div>
  )
}
