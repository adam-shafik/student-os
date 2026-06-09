import { useState, useEffect, useRef } from 'react'
import AppSelect, { AppSelectItem } from '../components/AppSelect'
import {
  Play, Pause, SkipForward, Square, Volume2, VolumeX,
  Eye, EyeOff, BookOpen, Timer, X, ChevronRight, Check, Trash2,
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
  const { phase, currentRound, totalRounds, roundsCompleted, secondsLeft, isRunning, topic, academicWeek, noteId, pomodoroWork, pomodoroBreak } = session
  const isDone     = phase === 'done'
  const color      = domain?.color ?? '#5b8cff'
  const phaseColor = isDone ? '#34d399' : phase === 'work' ? color : '#fbbf24'
  const phaseLabel = isDone ? 'Complete' : phase === 'work' ? 'Work' : 'Break'

  const RING_R = 124
  const RING_SIZE = (RING_R + 36) * 2
  const CIRCUMFERENCE = 2 * Math.PI * RING_R
  const totalSec = phase === 'work' ? pomodoroWork * 60 : phase === 'break' ? pomodoroBreak * 60 : 1
  const ringPct = isDone ? 0 : Math.max(0, (totalSec - secondsLeft) / totalSec)
  const ringOffset = CIRCUMFERENCE * ringPct
  const [confirmingEnd, setConfirmingEnd] = useState(false)

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

      {/* Ring + timer */}
      <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Ambient phase glow */}
        <div style={{
          position: 'absolute',
          width: RING_SIZE + 100, height: RING_SIZE + 100,
          left: -50, top: -50,
          background: `radial-gradient(circle, ${phaseColor}16 0%, transparent 60%)`,
          borderRadius: '50%',
          pointerEvents: 'none',
          transition: 'background 0.7s ease',
        }} />
        <svg
          style={{
            position: 'absolute', inset: 0,
            animation: isRunning && !isDone ? 'ringBreath 4s ease-in-out infinite' : 'none',
          }}
          width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        >
          <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} fill="none" stroke={phaseColor + '18'} strokeWidth={3} />
          <circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
            fill="none" stroke={phaseColor} strokeWidth={3} strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={ringOffset}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            style={{
              transition: 'stroke-dashoffset 1s linear, stroke 0.6s ease',
              filter: `drop-shadow(0 0 10px ${phaseColor}99)`,
            }}
          />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}>
          <div style={{
            fontSize: 11, fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase',
            color: phaseColor, transition: 'color 0.5s ease',
          }}>
            {phaseLabel}
          </div>
          <div style={{
            fontSize: 82, fontWeight: 300, letterSpacing: '-4px', lineHeight: 1,
            color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {isDone
              ? <Check size={62} strokeWidth={1.0} style={{ animation: 'checkIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both', color: '#34d399' }} />
              : fmt(secondsLeft)}
          </div>
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
            <button onClick={onPauseResume} aria-label={isRunning ? 'Pause session' : 'Resume session'} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: '50%',
              background: color + '20', border: `2px solid ${color}66`,
              cursor: 'pointer', color,
              boxShadow: isRunning ? `0 0 24px ${color}44` : 'none',
              transition: 'box-shadow 0.4s ease',
            }}>
              {isRunning ? <Pause size={21} /> : <Play size={21} />}
            </button>
            <button onClick={onSkipPhase} title="Skip phase" aria-label="Skip phase" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 38, height: 38, borderRadius: '50%',
              background: 'none', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-muted)',
            }}>
              <SkipForward size={16} />
            </button>
          </>
        )}
        {confirmingEnd ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>End session?</span>
            <button onClick={onEndSession} style={{
              padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(251,113,133,0.4)',
              background: 'rgba(251,113,133,0.12)', color: '#fb7185',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Yes</button>
            <button onClick={() => setConfirmingEnd(false)} style={{
              padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'none', color: 'var(--text-muted)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}>No</button>
          </div>
        ) : (
          <button
            onClick={isDone ? onEndSession : () => { setConfirmingEnd(true); setTimeout(() => setConfirmingEnd(false), 4000) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9,
              background: isDone ? '#34d39922' : 'none',
              border: isDone ? '1px solid #34d39966' : '1px solid var(--border)',
              cursor: 'pointer', color: isDone ? '#34d399' : 'var(--text-muted)', fontSize: 13,
            }}>
            {isDone ? <Check size={14} /> : <Square size={14} />}
            {isDone ? 'Save & Exit' : 'End Session'}
          </button>
        )}
      </div>

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'absolute', bottom: 24 }}>
        {noteId && (
          <button onClick={onOpenNote} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 6, padding: '6px 12px', cursor: 'pointer',
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

const NOTE_BG_PRESETS = ['#ffffff', '#f5f0e8', '#fef9c3', '#e8f0fe', '#1c1c24', '#0b0c13']

function isDarkNote(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

function NoteConfigPreview({ template, bgColor }) {
  const W = 52, H = 74
  const lineColor = isDarkNote(bgColor) ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.09)'
  const lines = []
  if (template === 'lined') {
    for (let y = 13; y < H; y += 9) lines.push(<line key={y} x1={4} y1={y} x2={W - 4} y2={y} stroke={lineColor} strokeWidth={0.7} />)
  } else if (template === 'grid') {
    for (let y = 9; y < H; y += 9) lines.push(<line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke={lineColor} strokeWidth={0.5} />)
    for (let x = 9; x < W; x += 9) lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke={lineColor} strokeWidth={0.5} />)
  }
  return (
    <svg width={W} height={H} style={{ borderRadius: 5, display: 'block', boxShadow: '0 2px 8px rgba(0,0,0,0.22)', flexShrink: 0 }}>
      <rect width={W} height={H} rx={5} fill={bgColor} />
      {lines}
    </svg>
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
  const [withNote,     setWithNote]     = useState(false)
  const [noteTemplate, setNoteTemplate] = useState('lined')
  const [noteBgColor,  setNoteBgColor]  = useState('#f5f0e8')

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
      noteTemplate,
      noteBgColor,
    })
  }

  const inp = {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '8px 11px', fontSize: 13,
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
          <AppSelect value={domainId} onChange={v => setDomainId(v)} style={inp}>
            <AppSelectItem value="">No domain</AppSelectItem>
            {domains.filter(d => !d.isPast).map(d => (
              <AppSelectItem key={d.id} value={d.id}>{d.code ? `${d.code} · ` : ''}{d.name}</AppSelectItem>
            ))}
          </AppSelect>
        </div>

        {/* Topic + week */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={sectionLabel}>What are you studying? *</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Graph algorithms, Week 3 lecture notes…"
              style={{ ...inp, flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              autoFocus
            />
            <input
              type="number" min={1} max={20} value={week}
              onChange={e => setWeek(e.target.value)}
              placeholder="Wk"
              title="Content week (optional)"
              style={{ ...inp, width: 52, textAlign: 'center', flexShrink: 0, padding: '8px 4px' }}
            />
          </div>
        </div>

        {/* Pomodoro */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={sectionLabel}>Pomodoro</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {POMODORO_PRESETS.map((p, i) => {
              const active = !custom && presetIdx === i
              return (
                <button key={i} onClick={() => { setPresetIdx(i); setCustom(false) }} style={{
                  padding: '5px 11px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
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
              padding: '5px 11px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
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

        {/* Start button */}
        <button onClick={handleStart} disabled={!topic.trim() || isTutorial} style={{
          background: topic.trim() && !isTutorial ? 'var(--accent-blue)' : 'var(--bg-surface)',
          color: topic.trim() && !isTutorial ? 'var(--btn-primary-text)' : 'var(--text-muted)',
          border: 'none', borderRadius: 9, padding: '12px',
          cursor: topic.trim() && !isTutorial ? 'pointer' : 'not-allowed',
          fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Play size={15} /> Start Session
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={withNote}
              onChange={e => setWithNote(e.target.checked)}
              style={{ accentColor: 'var(--accent-blue)', width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Open a linked handwritten note</span>
          </label>

          {withNote && (
            <div style={{
              marginTop: 10, padding: '12px 14px',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 5 }}>Template</div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {[{id:'blank',label:'Blank'},{id:'lined',label:'Lined'},{id:'grid',label:'Grid'}].map(t => (
                      <button key={t.id} onClick={() => setNoteTemplate(t.id)} style={{
                        flex: 1, padding: '5px 0', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
                        border: '1px solid transparent',
                        background: noteTemplate === t.id ? 'var(--accent-blue)22' : 'var(--bg-surface)',
                        color: noteTemplate === t.id ? 'var(--accent-blue)' : 'var(--text-muted)',
                        borderColor: noteTemplate === t.id ? 'var(--accent-blue)55' : 'var(--border)',
                      }}>{t.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 5 }}>Color</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {NOTE_BG_PRESETS.map(hex => (
                      <button
                        key={hex} title={hex} onClick={() => setNoteBgColor(hex)}
                        style={{
                          width: 22, height: 22, borderRadius: 5, background: hex,
                          border: noteBgColor === hex ? '2px solid var(--accent-blue)' : '2px solid var(--border)',
                          cursor: 'pointer', outline: 'none', flexShrink: 0,
                          transform: noteBgColor === hex ? 'scale(1.18)' : 'scale(1)',
                          transition: 'transform 0.1s',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <NoteConfigPreview template={noteTemplate} bgColor={noteBgColor} />
            </div>
          )}
        </div>
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

  const [collapsed, setCollapsed] = useState(false)
  const [pos, setPos] = useState(null) // null = use default bottom-right anchor
  const draggingRef = useRef(false)
  const startRef    = useRef({ mx: 0, my: 0, wx: 0, wy: 0 })
  const widgetRef   = useRef(null)

  useEffect(() => {
    function onMove(e) {
      if (!draggingRef.current) return
      const { clientX, clientY } = e.touches ? e.touches[0] : e
      const dx = clientX - startRef.current.mx
      const dy = clientY - startRef.current.my
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 240, startRef.current.wx + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 60, startRef.current.wy + dy)),
      })
    }
    function onUp() { draggingRef.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  function startDrag(e) {
    const { clientX, clientY } = e.touches ? e.touches[0] : e
    const rect = widgetRef.current?.getBoundingClientRect()
    draggingRef.current = true
    startRef.current = { mx: clientX, my: clientY, wx: rect?.left ?? 0, wy: rect?.top ?? 0 }
  }

  const posStyle = pos
    ? { top: pos.y, left: pos.x }
    : { bottom: 24, right: 24 }

  if (widgetHidden) {
    return (
      <div
        ref={widgetRef}
        onClick={onToggleHidden}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        title="Show timer"
        style={{
          position: 'fixed', ...posStyle, zIndex: 9998,
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'var(--bg-elevated)', border: `1px solid ${color}55`,
          borderRadius: 20, padding: '6px 12px', cursor: 'grab',
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
    <div
      ref={widgetRef}
      style={{
        position: 'fixed', ...posStyle, zIndex: 9998,
        background: 'var(--bg-elevated)', border: `1px solid ${color}44`,
        borderRadius: 12, width: 224, boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
        userSelect: 'none',
      }}
    >
      {/* Header — drag handle, never blurred */}
      <div
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px 6px', cursor: 'grab',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
            animation: isRunning && !isDone ? 'dotBreath 2s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.4px' }}>
            {domain?.code ?? 'Study'}
          </span>
          <span style={{ fontSize: 10, color: phaseColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {isDone ? 'Done' : phase}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
            aria-label={collapsed ? 'Expand timer' : 'Collapse timer'}
            style={wbtn()}
          >
            <ChevronRight size={11} style={{ transform: collapsed ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
          </button>
          <button onMouseDown={e => e.stopPropagation()} onClick={onToggleBlurred} title={widgetBlurred ? 'Show time' : 'Blur time'} aria-label={widgetBlurred ? 'Show time' : 'Blur time'} style={wbtn()}>
            {widgetBlurred ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>
          <button onMouseDown={e => e.stopPropagation()} onClick={onToggleHidden} title="Minimise" aria-label="Minimise timer" style={wbtn()}>
            <X size={11} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Timer content — blurred when widgetBlurred */}
          <div style={{
            padding: '0 12px 8px',
            filter: widgetBlurred ? 'blur(16px)' : 'none',
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
              {isDone ? <Check size={26} strokeWidth={1.5} style={{ display: 'block' }} /> : fmt(secondsLeft)}
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
                <button onClick={onPauseResume} aria-label={isRunning ? 'Pause session' : 'Resume session'} style={{
                  ...wbtn({ flex: 1, height: 30, borderRadius: 6, background: color + '22', borderColor: color + '44', color }),
                }}>
                  {isRunning ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button onClick={onSkipPhase} title="Skip phase" aria-label="Skip phase" style={wbtn({ height: 30, borderRadius: 6 })}>
                  <SkipForward size={13} />
                </button>
              </>
            )}
            <button onClick={onGoToStudy} title="Open full timer" aria-label="Open full timer" style={wbtn({ height: 30, borderRadius: 6 })}>
              <ChevronRight size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Activity chart ───────────────────────────────────────────────────────────
function ActivityChart({ studySessions, domains }) {
  const [hovered, setHovered] = useState(null)
  const DAYS = 14
  const BAR_H = 64

  function localDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (DAYS - 1 - i))
    return d
  })

  const buckets = days.map(day => {
    const ds = localDateStr(day)
    const sessions = studySessions.filter(s => localDateStr(new Date(s.startedAt)) === ds)
    const mins = sessions.reduce((a, s) => a + (s.pomodoroWork || 0) * (s.roundsCompleted || 0), 0)
    const tally = {}
    sessions.forEach(s => { if (s.domainId) tally[s.domainId] = (tally[s.domainId] || 0) + 1 })
    const topId = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0]
    const domain = domains.find(d => d.id === topId)
    return { day, mins, color: domain?.color ?? '#5b8cff' }
  })

  const maxMins = Math.max(...buckets.map(b => b.mins), 45)

  function fmtMins(m) {
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60), r = m % 60
    return r ? `${h}h ${r}m` : `${h}h`
  }

  function dayLabel(d) {
    const diff = Math.round((d - today) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === -1) return 'Yest'
    return d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14 }}>Activity</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
        {buckets.map((b, i) => (
          <div
            key={i}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ position: 'relative', width: '100%', height: BAR_H, display: 'flex', alignItems: 'flex-end' }}>
              {hovered === i && b.mins > 0 && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600,
                  color: 'var(--text-primary)', whiteSpace: 'nowrap', marginBottom: 6, zIndex: 10,
                }}>
                  {fmtMins(b.mins)}
                </div>
              )}
              <div style={{
                width: '100%',
                height: b.mins > 0 ? `${Math.max(4, (b.mins / maxMins) * BAR_H)}px` : '2px',
                background: b.mins > 0 ? (hovered === i ? b.color : b.color + 'bb') : 'var(--border)',
                borderRadius: b.mins > 0 ? '3px 3px 0 0' : 1,
                transition: 'height 0.3s ease, background 0.2s ease, box-shadow 0.2s ease',
                boxShadow: hovered === i && b.mins > 0 ? `0 0 14px ${b.color}66` : 'none',
              }} />
            </div>
            <div style={{
              fontSize: 9,
              color: b.day.getTime() === today.getTime() ? 'var(--text-secondary)' : 'var(--text-faint)',
              fontWeight: b.day.getTime() === today.getTime() ? 700 : 400,
              textAlign: 'center',
            }}>
              {dayLabel(b.day)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Past session row ─────────────────────────────────────────────────────────
function SessionRow({ session, domain, onOpenNote, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const d       = new Date(session.startedAt)
  const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const color   = domain?.color ?? '#5b8cff'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 9,
      background: color + '0a', border: `1px solid ${color}1e`,
    }}>
      <div style={{
        background: color + '22', color,
        borderRadius: 6, padding: '4px 7px',
        fontSize: 9, fontWeight: 800, letterSpacing: '0.5px',
        flexShrink: 0, alignSelf: 'center', textAlign: 'center', minWidth: 36,
      }}>
        {domain?.code?.slice(0, 4) ?? '—'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {session.topic}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
          {session.roundsCompleted}/{session.totalRounds} rounds{session.academicWeek ? ` · Wk ${session.academicWeek}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dateStr}</div>
        <div style={{
          fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3,
          color: session.status === 'completed' ? '#34d399' : 'var(--text-muted)',
        }}>
          {session.status === 'completed' ? <><Check size={9} /> Done</> : 'Partial'}
        </div>
      </div>
      {session.noteId && (
        <button onClick={() => onOpenNote(session.noteId)} aria-label="Open linked note" style={{
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
          background: 'none', border: '1px solid var(--border)',
          borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 11,
        }}>
          <BookOpen size={11} /> Note
        </button>
      )}
      {confirming ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Delete?</span>
          <button onClick={() => onDelete(session.id)} style={{
            padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(251,113,133,0.4)',
            background: 'rgba(251,113,133,0.12)', color: '#fb7185',
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>Yes</button>
          <button onClick={() => setConfirming(false)} style={{
            padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'none', color: 'var(--text-muted)',
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          }}>No</button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} aria-label="Delete session" style={{
          display: 'flex', alignItems: 'center', flexShrink: 0,
          background: 'none', border: 'none', padding: '4px',
          borderRadius: 6, cursor: 'pointer', color: 'var(--text-muted)',
          opacity: 0.5,
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#fb7185' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StudyPage({ domains, studySessions, activeSession, onStartSession, onEndSession, onPauseResume, onSkipPhase, soundEnabled, onToggleSound, onOpenNote, onDeleteSession, isTutorial }) {
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
      <div style={{ padding: '32px 28px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1.5px', lineHeight: 1.0 }}>Study</h1>
            {studySessions.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {(() => {
                    const mins = studySessions.reduce((acc, s) => acc + (s.pomodoroWork || 0) * (s.roundsCompleted || 0), 0)
                    if (mins < 60) return `${mins}m`
                    const h = Math.floor(mins / 60), m = mins % 60
                    return m > 0 ? `${h}h ${m}m` : `${h}h`
                  })()} studied
                </span>
                <span>·</span>
                <span>{studySessions.length} session{studySessions.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          <button data-tutorial-id="study-new-btn" onClick={() => { setModalDomain(null); setShowModal(true) }} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'var(--accent-blue)', color: 'var(--btn-primary-text)', border: 'none',
            borderRadius: 9, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            flexShrink: 0,
          }}>
            <Play size={14} /> New Session
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Domain cards */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
            {domains.filter(d => !d.isPast && d.category === 'academic').map(domain => {

              const count = studySessions.filter(s => s.domainId === domain.id).length
              return (
                <button
                  key={domain.id}
                  className="domain-card"
                  onClick={() => { setModalDomain(domain); setShowModal(true) }}
                  onMouseEnter={e => { e.currentTarget.style.background = domain.color + '28' }}
                  onMouseLeave={e => { e.currentTarget.style.background = domain.color + '14' }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
                    padding: '18px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'inherit', background: domain.color + '14',
                  }}
                >
                  <div style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.5px',
                    background: domain.color + '30', color: domain.color,
                    padding: '4px 9px', borderRadius: 6,
                  }}>
                    {domain.code || domain.name.slice(0, 4).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {domain.name}
                  </div>
                  {count > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {count} session{count !== 1 ? 's' : ''}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {studySessions.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-faint)', paddingTop: 4 }}>
            {domains.filter(d => !d.isPast && d.category === 'academic').length > 0
              ? 'Select a domain above to start your first session.'
              : 'Add academic domains first, then start a study session.'}
          </div>
        )}

        {/* Activity chart + session list */}
        {studySessions.length > 0 && (
          <ActivityChart studySessions={studySessions} domains={domains} />
        )}

        {/* Past sessions */}
        {studySessions.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Recent
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {studySessions.filter(s => {
                const d = domains.find(dd => dd.id === s.domainId)
                return !d?.isPast
              }).slice(0, 12).map(s => (

                <SessionRow
                  key={s.id}
                  session={s}
                  domain={domains.find(d => d.id === s.domainId)}
                  onOpenNote={onOpenNote}
                  onDelete={onDeleteSession}
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
