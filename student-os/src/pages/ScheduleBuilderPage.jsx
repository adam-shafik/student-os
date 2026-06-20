import { useState } from 'react'
import { ChevronLeft, X, Save, Loader2 } from 'lucide-react'
import AppSelect, { AppSelectItem } from '../components/AppSelect'

const GRID_START  = 8
const GRID_END    = 21
const CELL_H      = 26
const TOTAL_SLOTS = (GRID_END - GRID_START) * 2

const SESSION_TYPE_PRESETS = [
  { id: 'lecture',  label: 'Lecture',         color: '#5b8cff' },
  { id: 'lab',      label: 'Lab / Practical',  color: '#a78bfa' },
  { id: 'tutorial', label: 'Tutorial',         color: '#4ade80' },
  { id: 'seminar',  label: 'Seminar',          color: '#fb923c' },
  { id: 'workshop', label: 'Workshop',         color: '#38bdf8' },
  { id: 'group',    label: 'Group Meeting',    color: '#e879f9' },
]
const DURATION_OPTS = [
  { label: '30 min', v: 30 },
  { label: '1 hour', v: 60 },
  { label: '1.5 hrs', v: 90 },
  { label: '2 hours', v: 120 },
]

function timeToSlot(time) {
  const [h, m] = time.split(':').map(Number)
  return (h - GRID_START) * 2 + (m >= 30 ? 1 : 0)
}
function slotToTime(slot) {
  const mins = GRID_START * 60 + slot * 30
  const h    = Math.floor(mins / 60)
  const m    = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
function fmtTime(time) {
  const [h, m] = time.split(':').map(Number)
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h >= 12 ? 'pm' : 'am'}`
}

export default function ScheduleBuilderPage({ domains, scheduleSlots: initialSlots, weekStartSunday, totalWeeks, onSave, onCancel }) {
  const DAYS_SHORT = weekStartSunday
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

  // Include any custom slot types from existing schedule
  const customTypes = [...new Set(initialSlots.map(s => s.slotType))]
    .filter(t => !SESSION_TYPE_PRESETS.some(p => p.id === t))
    .map(t => ({ id: t, label: t, color: '#9ca3af', custom: true }))
  const allTypes = [...SESSION_TYPE_PRESETS, ...customTypes]

  const [slots,        setSlots]        = useState(initialSlots.map(s => ({ ...s })))
  const [pendingSlot,  setPendingSlot]  = useState(null)
  const [pickDomainId, setPickDomainId] = useState('')
  const [pickType,     setPickType]     = useState(SESSION_TYPE_PRESETS[0].id)
  const [pickDuration, setPickDuration] = useState(60)
  const [pickWeekFrom, setPickWeekFrom] = useState(null)
  const [pickWeekTo,   setPickWeekTo]   = useState(null)
  const [pickLocation, setPickLocation] = useState('')
  const [saving,       setSaving]       = useState(false)

  const timeLabels = Array.from({ length: GRID_END - GRID_START + 1 }, (_, i) => {
    const h = GRID_START + i
    return `${h % 12 || 12}${h >= 12 ? 'pm' : 'am'}`
  })

  function openSlotPicker(dayOfWeek, slotIndex) {
    const occupied = slots.some(s => {
      if (s.dayOfWeek !== dayOfWeek) return false
      const sStart = timeToSlot(s.startTime)
      return slotIndex >= sStart && slotIndex < sStart + s.durationMinutes / 30
    })
    if (occupied) return
    setPendingSlot({ dayOfWeek, slotIndex })
    setPickDomainId(domains[0]?.id || '')
    setPickType(allTypes[0]?.id || 'lecture')
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
    const hasOverlap = slots.some(s => {
      if (s.dayOfWeek !== dayOfWeek) return false
      const sStart = timeToSlot(s.startTime)
      const sEnd   = sStart + s.durationMinutes / 30
      return slotIndex < sEnd && endSlot > sStart
    })
    if (hasOverlap) return
    setSlots(p => [...p, {
      id: crypto.randomUUID(),
      domainId:        pickDomainId,
      dayOfWeek,
      startTime:       slotToTime(slotIndex),
      durationMinutes: pickDuration,
      slotType:        pickType,
      weekFrom:        pickWeekFrom || null,
      weekTo:          pickWeekTo   || null,
      location:        pickLocation.trim() || null,
    }])
    setPendingSlot(null)
  }

  async function handleSave() {
    setSaving(true)
    await onSave(slots)
    setSaving(false)
  }

  const label = (txt) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 7 }}>{txt}</div>
  )

  return (
    <div style={{ padding: '28px 32px 48px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn-press"
          onClick={onCancel}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <ChevronLeft size={15} /> Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Rebuild Weekly Schedule</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Click an empty slot to add a session. Click a placed block to remove it.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(5, 1fr)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '10px 0' }} />
          {DAYS_SHORT.map(d => (
            <div key={d} style={{
              padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 700,
              color: 'var(--text-muted)', borderLeft: '1px solid var(--border)',
              letterSpacing: '0.5px', textTransform: 'uppercase',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(5, 1fr)', position: 'relative' }}>
          {/* Time labels */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {timeLabels.map((t, i) => (
              <div key={t} style={{
                height: i < timeLabels.length - 1 ? CELL_H * 2 : 0,
                display: 'flex', alignItems: 'flex-start', paddingTop: 4,
                paddingRight: 8, justifyContent: 'flex-end',
                fontSize: 10, color: 'var(--text-muted)', flexShrink: 0,
              }}>
                {t}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS_SHORT.map((day, dayIdx) => {
            const daySlots = slots.filter(s => s.dayOfWeek === dayIdx)
            const domain = (id) => domains.find(d => d.id === id)
            return (
              <div key={day} style={{ position: 'relative', borderLeft: '1px solid var(--border)' }}>
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
                        borderBottom: `1px solid ${slotIdx % 2 === 1 ? 'var(--border)' : 'var(--bg-overlay)'}`,
                        cursor: isOccupied ? 'default' : 'pointer',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (!isOccupied) e.currentTarget.style.background = 'var(--nav-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    />
                  )
                })}

                {daySlots.map(slot => {
                  const d       = domain(slot.domainId)
                  const startIdx = timeToSlot(slot.startTime)
                  const height  = (slot.durationMinutes / 30) * CELL_H
                  const typeInfo = allTypes.find(t => t.id === slot.slotType)
                  return (
                    <div
                      key={slot.id}
                      onClick={() => setSlots(p => p.filter(s => s.id !== slot.id))}
                      title="Click to remove"
                      style={{
                        position: 'absolute',
                        top: startIdx * CELL_H, height: height - 1,
                        left: 3, right: 3,
                        background: d ? `${d.color}20` : 'var(--bg-overlay)',
                        border: `1px solid ${d?.color || 'var(--border-strong)'}88`,
                        borderRadius: 6, padding: '4px 6px',
                        cursor: 'pointer', overflow: 'hidden',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: d?.color, lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {d?.name || slot.domainId}
                      </div>
                      {height > 34 && (
                        <div style={{ fontSize: 9, color: d ? `${d.color}99` : 'var(--text-muted)', marginTop: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
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

      {/* Save bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {slots.length} session{slots.length !== 1 ? 's' : ''} in your weekly timetable
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-press"
            onClick={onCancel}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
          <button className="btn-press"
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, border: 'none', background: 'var(--accent-blue)', color: 'var(--btn-primary-text, #fff)', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}
          >
            {saving ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save Schedule'}
          </button>
        </div>
      </div>

      {/* Slot picker modal */}
      {pendingSlot && (
        <div
          onClick={() => setPendingSlot(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, width: 340, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                {DAYS_SHORT[pendingSlot.dayOfWeek]}, {fmtTime(slotToTime(pendingSlot.slotIndex))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Add a session to this time slot</div>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                {label('Module')}
                <AppSelect value={pickDomainId} onChange={v => setPickDomainId(v)}>
                  {domains.map(d => {
                    const semTag = d.semesterNumber === 1 ? ' · Sem 1' : d.semesterNumber === 2 ? ' · Sem 2' : (d.semesterNumber === 0 ? ' · Full year' : '')
                    return <AppSelectItem key={d.id} value={d.id}>{d.name}{d.code ? ` (${d.code})` : ''}{semTag}</AppSelectItem>
                  })}
                </AppSelect>
              </div>

              <div>
                {label('Session type')}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {allTypes.map(t => (
                    <button className="btn-press" key={t.id} onClick={() => setPickType(t.id)} style={{
                      padding: '7px 13px', borderRadius: 20,
                      border: `1px solid ${pickType === t.id ? t.color : 'var(--border-strong)'}`,
                      background: pickType === t.id ? `${t.color}20` : 'transparent',
                      color: pickType === t.id ? t.color : 'var(--text-muted)',
                      fontSize: 12, fontWeight: pickType === t.id ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                    }}>{t.label}</button>
                  ))}
                </div>
              </div>

              <div>
                {label('Duration')}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                  {DURATION_OPTS.map(o => (
                    <button className="btn-press" key={o.v} onClick={() => setPickDuration(o.v)} style={{
                      padding: '8px 0', borderRadius: 8,
                      border: `1px solid ${pickDuration === o.v ? 'var(--accent-blue)' : 'var(--border-strong)'}`,
                      background: pickDuration === o.v ? 'rgba(91,140,255,0.12)' : 'transparent',
                      color: pickDuration === o.v ? 'var(--accent-blue)' : 'var(--text-muted)',
                      fontSize: 12, fontWeight: pickDuration === o.v ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
                    }}>{o.label}</button>
                  ))}
                </div>
              </div>

              <div>
                {label(`Week range (optional, blank = all${totalWeeks ? ` ${totalWeeks}` : ''} weeks)`)}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number" min={1} max={totalWeeks || 99} value={pickWeekFrom ?? ''}
                    onChange={e => setPickWeekFrom(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="W1"
                    style={{ width: 64, padding: '8px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
                  <input
                    type="number" min={1} max={totalWeeks || 99} value={pickWeekTo ?? ''}
                    onChange={e => setPickWeekTo(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder={totalWeeks ? `W${totalWeeks}` : 'W?'}
                    style={{ width: 64, padding: '8px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  {(pickWeekFrom || pickWeekTo) && (
                    <button className="btn-press" onClick={() => { setPickWeekFrom(null); setPickWeekTo(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                {label('Location (optional)')}
                <input
                  type="text" value={pickLocation} onChange={e => setPickLocation(e.target.value)}
                  placeholder="e.g. Room B1.01, Online, Lab 3"
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <button className="btn-press" onClick={confirmSlot} style={{
                  flex: 1, padding: '10px 0', borderRadius: 9, border: 'none',
                  background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                  color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>Add session</button>
                <button className="btn-press" onClick={() => setPendingSlot(null)} style={{
                  padding: '10px 16px', borderRadius: 9, border: '1px solid var(--border-strong)',
                  background: 'transparent', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
