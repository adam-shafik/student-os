import { useState } from 'react'
import {
  Play, Pause, SkipForward, Square, Volume2, VolumeX,
  Eye, EyeOff, BookOpen, Timer, X, ChevronRight, Pencil, Check, Brain,
} from 'lucide-react'

// ─── Audio ─────────────────────────────────────────────────────────────────────
let _audioCtx = null
function getCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return _audioCtx
}

// Call this from a user-gesture handler (e.g. Start button) to unlock iOS audio
export function unlockAudio() {
  try {
    const ctx = getCtx()
    ctx.resume()
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf; src.connect(ctx.destination); src.start(0)
  } catch (_) {}
}

export function playChime() {
  try {
    const ctx = getCtx()
    ctx.resume().then(() => {
      const freqs = [523.25, 659.25, 783.99]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'; osc.frequency.value = freq
        const t = ctx.currentTime + i * 0.18
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.28, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
        osc.start(t); osc.stop(t + 0.6)
      })
    })
  } catch (_) {}
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const POMODORO_PRESETS = [
  { label: 'Classic', work: 25, break: 5,  rounds: 4 },
  { label: 'Long',    work: 50, break: 10, rounds: 3 },
  { label: 'Deep',    work: 90, break: 15, rounds: 2 },
  { label: 'Sprint',  work: 15, break: 3,  rounds: 6 },
]

function fmt(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

// ─── Widget button helper ─────────────────────────────────────────────────────
function wbtn(extra = {}) {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: '1px solid var(--border)',
    cursor: 'pointer', color: 'var(--text-muted)',
    width: 26, height: 26, borderRadius: 6, padding: 0, flexShrink: 0,
    ...extra,
  }
}

// ─── Round dots ───────────────────────────────────────────────────────────────
function RoundDots({ total, completed, currentRound, phase }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const done           = n <= completed
        const isCurrentWork  = !done && n === currentRound && phase === 'work'
        const isCurrentBreak = done  && n === completed    && phase === 'break'
        const color = isCurrentBreak ? '#fbbf24'
          : (done || isCurrentWork) ? '#5b8cff' : '#1e2030'
        const pulse = isCurrentWork || isCurrentBreak
        return (
          <div key={i} style={{
            width: 12, height: 12, borderRadius: '50%', background: color,
            opacity: (!done && !isCurrentWork) ? 0.3 : 1,
            boxShadow: pulse ? `0 0 10px ${color}aa` : 'none',
            transform: pulse ? 'scale(1.2)' : 'scale(1)',
            transition: 'all 0.35s',
          }} />
        )
      })}
    </div>
  )
}

// ─── Active timer (full tab) ──────────────────────────────────────────────────
function ActiveTimerView({ session, domain, onPauseResume, onSkipPhase, onEndSession, soundEnabled, onToggleSound, onOpenNote }) {
  const { phase, currentRound, totalRounds, roundsCompleted, secondsLeft, isRunning, topic, academicWeek, noteId } = session
  const isDone     = phase === 'done'
  const color      = domain?.color ?? '#5b8cff'
  const phaseColor = isDone ? '#34d399' : phase === 'work' ? color : '#fbbf24'
  const phaseLabel = isDone ? 'Complete' : phase === 'work' ? 'Work' : 'Break'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 36, position: 'relative', userSelect: 'none',
    }}>
      {/* Domain + topic */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            background: color + '22', color, border: `1px solid ${color}44`,
            borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, letterSpacing: '0.5px',
          }}>
            {domain?.code ?? 'Study'}
          </div>
          {academicWeek && (
            <div style={{
              background: '#fbbf2422', color: '#fbbf24', border: '1px solid #fbbf2444',
              borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700,
            }}>
              Week {academicWeek}
            </div>
          )}
        </div>
        {topic && (
          <div style={{ fontSize: 15, color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'center', maxWidth: 420 }}>
            {topic}
          </div>
        )}
      </div>

      {/* Phase label + timer */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase',
          color: phaseColor,
        }}>
          {phaseLabel}
        </div>
        <div style={{
          fontSize: 90, fontWeight: 200, letterSpacing: '-3px', lineHeight: 1,
          color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace',
        }}>
          {isDone ? '✓' : fmt(secondsLeft)}
        </div>
      </div>

      {/* Rounds */}
      {!isDone ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <RoundDots total={totalRounds} completed={roundsCompleted} currentRound={currentRound} phase={phase} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Round {phase === 'work' ? currentRound : roundsCompleted} of {totalRounds}
            {phase === 'break' && ' · Break'}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 14, color: '#34d399', fontWeight: 500 }}>
          {roundsCompleted} round{roundsCompleted !== 1 ? 's' : ''} completed
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {!isDone && (
          <>
            <button onClick={onPauseResume} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 54, height: 54, borderRadius: '50%',
              background: color + '22', border: `1.5px solid ${color}55`,
              cursor: 'pointer', color,
            }}>
              {isRunning ? <Pause size={21} /> : <Play size={21} />}
            </button>
            <button onClick={onSkipPhase} title="Skip phase" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 38, height: 38, borderRadius: '50%',
              background: 'none', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-muted)',
            }}>
              <SkipForward size={16} />
            </button>
          </>
        )}
        <button onClick={onEndSession} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9,
          background: isDone ? '#34d39922' : 'none',
          border: isDone ? '1px solid #34d39966' : '1px solid var(--border)',
          cursor: 'pointer', color: isDone ? '#34d399' : 'var(--text-muted)', fontSize: 13,
        }}>
          {isDone ? <Check size={14} /> : <Square size={14} />}
          {isDone ? 'Save & Exit' : 'End Session'}
        </button>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'absolute', bottom: 24 }}>
        {noteId && (
          <button onClick={onOpenNote} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 7, padding: '6px 12px', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 12,
          }}>
            <BookOpen size={13} /> Open note
          </button>
        )}
        <button onClick={onToggleSound} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 12, padding: '6px 8px',
          color: soundEnabled ? 'var(--text-muted)' : 'var(--text-faint)',
        }}>
          {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          {soundEnabled ? 'Sound on' : 'Sound off'}
        </button>
      </div>
    </div>
  )
}

// ─── Start session modal ──────────────────────────────────────────────────────
function StartSessionModal({ initialDomain, domains, onClose, onStart, isTutorial }) {
  const [domainId,    setDomainId]    = useState(initialDomain?.id ?? '')
  const [topic,       setTopic]       = useState('')
  const [week,        setWeek]        = useState('')
  const [presetIdx,   setPresetIdx]   = useState(0)
  const [custom,      setCustom]      = useState(false)
  const [customWork,  setCustomWork]  = useState(25)
  const [customBreak, setCustomBreak] = useState(5)
  const [customRounds,setCustomRounds]= useState(4)
  const [withNote,    setWithNote]    = useState(false)

  const cfg = custom
    ? { work: Math.max(1, customWork), break: Math.max(1, customBreak), rounds: Math.max(1, customRounds) }
    : POMODORO_PRESETS[presetIdx]

  const totalMin = Math.round(cfg.work * cfg.rounds + cfg.break * (cfg.rounds - 1))

  function handleStart() {
    if (!topic.trim()) return
    onStart({
      domainId:      domainId || null,
      topic:         topic.trim(),
      academicWeek:  week ? parseInt(week, 10) : null,
      pomodoroWork:  cfg.work,
      pomodoroBreak: cfg.break,
      totalRounds:   cfg.rounds,
      withNote,
    })
  }

  const inp = {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 7, padding: '8px 11px', fontSize: 13,
    color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const numInp = { ...inp, width: 68, textAlign: 'center' }
  const sectionLabel = {
    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div data-tutorial-id="study-modal-content" style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 14, width: 480, maxWidth: '94vw', maxHeight: '90vh',
        overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Timer size={17} color="var(--accent-blue)" />
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>New Study Session</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={17} />
          </button>
        </div>

        {/* Domain */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={sectionLabel}>Domain</label>
          <select value={domainId} onChange={e => setDomainId(e.target.value)} style={inp}>
            <option value="">— General (no domain) —</option>
            {domains.map(d => (
              <option key={d.id} value={d.id}>{d.code ? `${d.code} · ` : ''}{d.name}</option>
            ))}
          </select>
        </div>

        {/* Topic */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={sectionLabel}>What are you studying? *</label>
          <input
            value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Graph algorithms, Week 3 lecture notes…"
            style={inp}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            autoFocus
          />
        </div>

        {/* Content week */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={sectionLabel}>
            Content week{' '}
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — which week's material)</span>
          </label>
          <input
            type="number" min={1} max={20} value={week}
            onChange={e => setWeek(e.target.value)}
            placeholder="e.g. 2"
            style={{ ...inp, width: 90 }}
          />
        </div>

        {/* Pomodoro */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={sectionLabel}>Pomodoro</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {POMODORO_PRESETS.map((p, i) => {
              const active = !custom && presetIdx === i
              return (
                <button key={i} onClick={() => { setPresetIdx(i); setCustom(false) }} style={{
                  padding: '5px 11px', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                  border: '1px solid transparent',
                  background: active ? 'var(--accent-blue)22' : 'var(--bg-surface)',
                  color: active ? 'var(--accent-blue)' : 'var(--text-muted)',
                  borderColor: active ? 'var(--accent-blue)55' : 'var(--border)',
                }}>
                  {p.label} <span style={{ opacity: 0.55, fontSize: 11 }}>{p.work}/{p.break}m ×{p.rounds}</span>
                </button>
              )
            })}
            <button onClick={() => setCustom(true)} style={{
              padding: '5px 11px', borderRadius: 7, cursor: 'pointer', fontSize: 12,
              border: '1px solid transparent',
              background: custom ? 'var(--accent-blue)22' : 'var(--bg-surface)',
              color: custom ? 'var(--accent-blue)' : 'var(--text-muted)',
              borderColor: custom ? 'var(--accent-blue)55' : 'var(--border)',
            }}>Custom</button>
          </div>

          {custom && (
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {[['Work (min)', customWork, setCustomWork, 1, 180], ['Break (min)', customBreak, setCustomBreak, 1, 60], ['Rounds', customRounds, setCustomRounds, 1, 20]].map(([label, val, set, min, max]) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
                  <input type="number" min={min} max={max} value={val}
                    onChange={e => set(+e.target.value)} style={numInp} />
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {cfg.work}m work · {cfg.break}m break · {cfg.rounds} round{cfg.rounds !== 1 ? 's' : ''} · ~{totalMin}m total
          </div>
        </div>

        {/* Notes toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={sectionLabel}>Take handwritten notes?</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[[false, Brain, 'No, study externally'], [true, Pencil, 'Yes, open a note']].map(([val, Icon, text]) => {
              const active = withNote === val
              return (
                <button key={String(val)} onClick={() => setWithNote(val)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid transparent', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 5,
                  background: active ? 'var(--accent-blue)22' : 'var(--bg-surface)',
                  color: active ? 'var(--accent-blue)' : 'var(--text-muted)',
                  borderColor: active ? 'var(--accent-blue)55' : 'var(--border)',
                }}>
                  <Icon size={15} />
                  <span style={{ fontSize: 12 }}>{text}</span>
                </button>
              )
            })}
          </div>
          {withNote && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 2 }}>
              A linked note will open automatically. The timer floats in the corner.
            </div>
          )}
        </div>

        {/* Start button */}
        <button onClick={handleStart} disabled={!topic.trim() || isTutorial} style={{
          background: topic.trim() && !isTutorial ? 'var(--accent-blue)' : 'var(--bg-surface)',
          color: topic.trim() && !isTutorial ? 'white' : 'var(--text-muted)',
          border: 'none', borderRadius: 9, padding: '12px',
          cursor: topic.trim() && !isTutorial ? 'pointer' : 'not-allowed',
          fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Play size={15} /> Start Session
        </button>
      </div>
    </div>
  )
}

// ─── Floating timer widget ────────────────────────────────────────────────────
export function FloatingTimerWidget({ session, domain, onPauseResume, onSkipPhase, onGoToStudy, onToggleHidden, onToggleBlurred }) {
  const { phase, secondsLeft, currentRound, totalRounds, roundsCompleted, isRunning, widgetHidden, widgetBlurred } = session
  const color      = domain?.color ?? '#5b8cff'
  const isDone     = phase === 'done'
  const phaseColor = phase === 'work' ? color : phase === 'break' ? '#fbbf24' : '#34d399'

  if (widgetHidden) {
    return (
      <div
        onClick={onToggleHidden}
        title="Show timer"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'var(--bg-elevated)', border: `1px solid ${color}55`,
          borderRadius: 20, padding: '6px 12px', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: phaseColor, boxShadow: `0 0 6px ${phaseColor}` }} />
        <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
          {isDone ? 'Done' : fmt(secondsLeft)}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      background: 'var(--bg-elevated)', border: `1px solid ${color}44`,
      borderRadius: 12, width: 224, boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
    }}>
      {/* Header — never blurred */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px 6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.4px' }}>
            {domain?.code ?? 'Study'}
          </span>
          <span style={{ fontSize: 10, color: phaseColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {isDone ? 'Done' : phase}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onToggleBlurred} title={widgetBlurred ? 'Show time' : 'Blur time'} style={wbtn()}>
            {widgetBlurred ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>
          <button onClick={onToggleHidden} title="Minimise" style={wbtn()}>
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Timer content — blurred when widgetBlurred */}
      <div style={{
        padding: '0 12px 8px',
        filter: widgetBlurred ? 'blur(5px)' : 'none',
        transition: 'filter 0.25s',
        pointerEvents: widgetBlurred ? 'none' : 'auto',
      }}>
        <div
          onClick={!widgetBlurred ? onGoToStudy : undefined}
          title="Open full timer"
          style={{
            fontSize: 36, fontWeight: 200, fontFamily: 'monospace', letterSpacing: '-1px',
            color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
            cursor: 'pointer', lineHeight: 1, marginBottom: 6,
          }}
        >
          {isDone ? '✓' : fmt(secondsLeft)}
        </div>
        {!isDone && (
          <div style={{ marginBottom: 4 }}>
            <RoundDots total={totalRounds} completed={roundsCompleted} currentRound={currentRound} phase={phase} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              Round {phase === 'work' ? currentRound : roundsCompleted}/{totalRounds}
              {phase === 'break' ? ' · Break' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Controls — never blurred */}
      <div style={{ display: 'flex', gap: 6, padding: '6px 12px 10px' }}>
        {!isDone && (
          <>
            <button onClick={onPauseResume} style={{
              ...wbtn({ flex: 1, height: 30, borderRadius: 6, background: color + '22', borderColor: color + '44', color }),
            }}>
              {isRunning ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button onClick={onSkipPhase} title="Skip phase" style={wbtn({ height: 30, borderRadius: 6 })}>
              <SkipForward size={13} />
            </button>
          </>
        )}
        <button onClick={onGoToStudy} title="Open full timer" style={wbtn({ height: 30, borderRadius: 6 })}>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Past session row ─────────────────────────────────────────────────────────
function SessionRow({ session, domain, onOpenNote }) {
  const d       = new Date(session.startedAt)
  const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const color   = domain?.color ?? '#5b8cff'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 9,
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
    }}>
      <div style={{ width: 3, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {session.topic}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8 }}>
          <span>{domain?.code ?? 'General'}</span>
          {session.academicWeek && <span>· Week {session.academicWeek}</span>}
          <span>· {session.roundsCompleted}/{session.totalRounds} rounds</span>
          <span>· ~{session.pomodoroWork * session.roundsCompleted}m</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dateStr}</div>
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: session.status === 'completed' ? '#34d399' : 'var(--text-muted)',
        }}>
          {session.status === 'completed' ? '✓ Done' : 'Partial'}
        </div>
      </div>
      {session.noteId && (
        <button onClick={() => onOpenNote(session.noteId)} style={{
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
          background: 'none', border: '1px solid var(--border)',
          borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 11,
        }}>
          <BookOpen size={11} /> Note
        </button>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StudyPage({ domains, studySessions, activeSession, onStartSession, onEndSession, onPauseResume, onSkipPhase, soundEnabled, onToggleSound, onOpenNote, isTutorial }) {
  const [modalDomain, setModalDomain] = useState(null)
  const [showModal,   setShowModal]   = useState(false)

  if (activeSession) {
    const domain = domains.find(d => d.id === activeSession.domainId)
    return (
      <ActiveTimerView
        session={activeSession}
        domain={domain}
        onPauseResume={onPauseResume}
        onSkipPhase={onSkipPhase}
        onEndSession={onEndSession}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        onOpenNote={() => onOpenNote(activeSession.noteId)}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <div style={{ padding: '28px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Study Sessions</h1>
        <button data-tutorial-id="study-new-btn" onClick={() => { setModalDomain(null); setShowModal(true) }} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'var(--accent-blue)', color: 'white', border: 'none',
          borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          <Play size={13} /> New Session
        </button>
      </div>

      <div style={{ padding: '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Domain cards */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            Start from a domain
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
            {domains.map(domain => {
              const count = studySessions.filter(s => s.domainId === domain.id).length
              return (
                <button
                  key={domain.id}
                  onClick={() => { setModalDomain(domain); setShowModal(true) }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 7,
                    padding: '14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${domain.color}`,
                  }}
                >
                  <div style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.4px',
                    background: domain.color + '22', color: domain.color,
                    padding: '2px 7px', borderRadius: 4,
                  }}>
                    {domain.code || domain.name.slice(0, 4).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                    {domain.name}
                  </div>
                  {count > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {count} session{count !== 1 ? 's' : ''}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Past sessions */}
        {studySessions.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
              Recent Sessions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {studySessions.slice(0, 12).map(s => (
                <SessionRow
                  key={s.id}
                  session={s}
                  domain={domains.find(d => d.id === s.domainId)}
                  onOpenNote={onOpenNote}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <StartSessionModal isTutorial={isTutorial}
          initialDomain={modalDomain}
          domains={domains}
          onClose={() => setShowModal(false)}
          onStart={config => { setShowModal(false); onStartSession(config) }}
        />
      )}
    </div>
  )
}
