import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import AppSelect, { AppSelectItem } from '../components/AppSelect'
import { Plus, X, Layers, Trash2, ChevronLeft, Pencil, Play, RotateCcw, FileText, Sparkles, Square, CheckSquare, FlaskConical, Upload, Shuffle, ArrowLeftRight } from 'lucide-react'
import { totalTeachingWeeks } from '../utils/semester'
import { useIsMobile } from '../utils/useIsMobile'
import { extractPdfText } from '../utils/pdf'

const TOTAL_WEEKS = totalTeachingWeeks()

const GRADES = [
  { key: 'again', label: 'Again', color: '#fb7185', hotkey: '1' },
  { key: 'good',  label: 'Good',  color: '#fbbf24', hotkey: '2' },
  { key: 'easy',  label: 'Easy',  color: '#34d399', hotkey: '3' },
]

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const isDue = c => !c.dueDate || c.dueDate <= todayStr()

const STRENGTH_BUCKETS = [
  { key: 'new',        label: 'New',        color: '#5b8cff' },
  { key: 'struggling', label: 'Struggling', color: '#fb7185' },
  { key: 'learning',   label: 'Learning',   color: '#fbbf24' },
  { key: 'good',       label: 'Good',       color: '#34d399' },
  { key: 'mastered',   label: 'Mastered',   color: '#a78bfa' },
]

// Strength derived from SM-2 state: never-reviewed = new, reset by 'again' = struggling,
// then graded by how far out the card is scheduled
function cardStrength(c) {
  if (c.repetitions === 0) return c.dueDate ? 'struggling' : 'new'
  if (c.intervalDays < 7)  return 'learning'
  if (c.intervalDays < 21) return 'good'
  return 'mastered'
}

function PerformanceChart({ cards, title }) {
  const counts = useMemo(() => {
    const map = Object.fromEntries(STRENGTH_BUCKETS.map(b => [b.key, 0]))
    for (const c of cards) map[cardStrength(c)] += 1
    return map
  }, [cards])

  if (cards.length === 0) return null
  const max = Math.max(...Object.values(counts), 1)

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px', marginTop: 18 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 130 }}>
        {STRENGTH_BUCKETS.map(b => {
          const count = counts[b.key]
          return (
            <div key={b.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%', minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: count > 0 ? b.color : 'var(--text-muted)' }}>{count}</span>
              <motion.div
                animate={{ height: count > 0 ? Math.max(6, (count / max) * 84) : 3 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                style={{
                  width: '100%', maxWidth: 52, borderRadius: '6px 6px 2px 2px',
                  background: count > 0 ? `${b.color}cc` : 'var(--border)',
                }}
              />
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                {b.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 7 }}>{children}</div>
}

// Shimmer-sweep loading text that cycles through generation stages
const GENERATING_STAGES = [
  'Reading your material',
  'Finding the key ideas',
  'Writing questions',
  'Polishing the answers',
]

function GeneratingText() {
  const [stage, setStage] = useState(0)
  // Walk through each stage once, then hold on the last — never loop, so no text repeats
  useEffect(() => {
    const t = setInterval(() => setStage(p => Math.min(p + 1, GENERATING_STAGES.length - 1)), 2200)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '44px 0' }}>
      {/* Floating, glowing sparkle */}
      <motion.div
        animate={{ y: [0, -9, 0], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <motion.div
          animate={{ opacity: [0.35, 0.85, 0.35], scale: [1, 1.35, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', width: 52, height: 52, borderRadius: '50%',
            background: 'radial-gradient(circle, var(--accent-purple) 0%, transparent 68%)',
            filter: 'blur(7px)',
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'relative', display: 'flex' }}
        >
          <Sparkles size={30} style={{ color: 'var(--accent-purple)' }} />
        </motion.div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0, backgroundPosition: ['200% center', '-200% center'] }}
          exit={{ opacity: 0, y: -14 }}
          transition={{
            opacity: { duration: 0.3 },
            y: { duration: 0.3 },
            backgroundPosition: { duration: 2.4, ease: 'linear', repeat: Infinity },
          }}
          style={{
            fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px', whiteSpace: 'nowrap',
            backgroundImage: 'linear-gradient(90deg, var(--text-muted), var(--accent-purple), var(--text-primary), var(--accent-purple), var(--text-muted))',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            color: 'transparent', WebkitTextFillColor: 'transparent',
          }}
        >
          {GENERATING_STAGES[stage]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// Burst a ring of particles from an element's center. Particles are appended to
// document.body and animate themselves, so they survive the button unmounting
// (the modal switches to its loading step the instant Generate is clicked).
function burstParticles(el) {
  if (!el) return
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  for (let i = 0; i < 14; i++) {
    const angle = (Math.PI * 2 * i) / 14 + (Math.random() - 0.5) * 0.4
    const dist = 30 + Math.random() * 38
    const dx = Math.cos(angle) * dist
    const dy = Math.sin(angle) * dist
    const p = document.createElement('div')
    Object.assign(p.style, {
      position: 'fixed', left: `${cx}px`, top: `${cy}px`,
      width: '6px', height: '6px', borderRadius: '50%',
      background: 'var(--accent-purple)', pointerEvents: 'none', zIndex: '3000',
    })
    document.body.appendChild(p)
    const anim = p.animate([
      { transform: 'translate(-50%, -50%) scale(0)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`, opacity: 1, offset: 0.6 },
      { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy * 1.15}px)) scale(0)`, opacity: 0 },
    ], { duration: 680, easing: 'cubic-bezier(0.22,1,0.36,1)' })
    anim.onfinish = () => p.remove()
  }
}

function ParticleButton({ children, onClick, disabled, style }) {
  const ref = useRef()
  const handle = (e) => {
    if (disabled) return
    burstParticles(ref.current)
    onClick?.(e)
  }
  return (
    <motion.button ref={ref} onClick={handle} disabled={disabled} whileTap={{ scale: 0.95 }} style={style}>
      {children}
    </motion.button>
  )
}

// Single source for the "Generate with AI" action so it looks identical on the home
// page and inside a deck. Sheen sweep + sparkle flourish on hover (.ai-btn in index.css).
function GenerateAIButton({ onClick, style }) {
  return (
    <button onClick={onClick} className="btn-press ai-btn" style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0,
      padding: '9px 16px', borderRadius: 9,
      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      ...style,
    }}>
      <span className="ai-glow" aria-hidden />
      <span className="ai-icon" style={{ display: 'flex', position: 'relative', zIndex: 2 }}><Sparkles size={14} /></span>
      <span style={{ position: 'relative', zIndex: 2 }}>Generate with AI</span>
      <span className="ai-sheen" aria-hidden />
    </button>
  )
}

// Textarea that grows to fit its content (used in the AI review list)
function AutoTextarea({ value, onChange, style }) {
  const ref = useRef()
  const fit = (el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }
  useEffect(() => { fit(ref.current) }, [value])
  return (
    <textarea
      ref={ref} value={value} rows={1}
      onChange={e => { onChange(e); fit(e.target) }}
      style={{ ...style, overflow: 'hidden', resize: 'none' }}
      onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
      onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
    />
  )
}

function WeekBadge({ week }) {
  if (!week) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      background: 'rgba(167,139,250,0.14)', color: 'var(--accent-purple)',
    }}>
      W{week}
    </span>
  )
}

// ─── Deck create / edit modal ──────────────────────────────────────────────────
function DeckModal({ deck, domains, notes, studySessions, domainMap, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    title:          deck?.title          || '',
    domainId:       deck?.domainId       || '',
    academicWeek:   deck?.academicWeek   ? String(deck.academicWeek) : '',
    noteId:         deck?.noteId         || '',
    studySessionId: deck?.studySessionId || '',
  })
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const selectedDomain = domains.find(d => d.id === form.domainId)
  const isAcademic = selectedDomain?.category === 'academic'
  const canSave = form.title.trim()

  const handleSave = () => {
    if (!canSave) return
    onSave({
      title:          form.title.trim(),
      domainId:       form.domainId || null,
      academicWeek:   isAcademic && form.academicWeek ? Number(form.academicWeek) : null,
      noteId:         form.noteId || null,
      studySessionId: form.studySessionId || null,
    })
    onClose()
  }

  const fmt = iso => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : ''

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border-strong)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 16, width: 460, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-modal)' }}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{deck ? 'Edit Deck' : 'New Deck'}</span>
          <button onClick={onClose} className="btn-press" style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Label>Deck name</Label>
            <input
              autoFocus style={inputStyle}
              placeholder="e.g. Week 4 — Sorting Algorithms"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
            />
          </div>

          <div>
            <Label>Domain (optional)</Label>
            <AppSelect value={form.domainId} onChange={v => { set('domainId', v); set('academicWeek', '') }}>
              <AppSelectItem value="">No domain</AppSelectItem>
              {domains.map(d => (
                <AppSelectItem key={d.id} value={d.id}>{d.code ? `${d.code} · ` : ''}{d.name}</AppSelectItem>
              ))}
            </AppSelect>
          </div>

          {isAcademic && (
            <div>
              <Label>Academic week (optional)</Label>
              <AppSelect value={form.academicWeek} onChange={v => set('academicWeek', v)}>
                <AppSelectItem value="">Not week-specific</AppSelectItem>
                {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => (
                  <AppSelectItem key={w} value={String(w)}>Week {w}</AppSelectItem>
                ))}
              </AppSelect>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Links</div>

            <div>
              <Label>Linked note</Label>
              <AppSelect value={form.noteId} onChange={v => set('noteId', v)}>
                <AppSelectItem value="">None</AppSelectItem>
                {notes.map(n => <AppSelectItem key={n.id} value={n.id}>{n.title || 'Untitled'} · {fmt(n.updatedAt)}</AppSelectItem>)}
              </AppSelect>
            </div>

            <div>
              <Label>Linked study session</Label>
              <AppSelect value={form.studySessionId} onChange={v => set('studySessionId', v)}>
                <AppSelectItem value="">None</AppSelectItem>
                {studySessions.map(s => {
                  const d = s.domainId ? domainMap[s.domainId] : null
                  return <AppSelectItem key={s.id} value={s.id}>{d ? `[${d.code}] ` : ''}{s.topic} · {fmt(s.startedAt)}</AppSelectItem>
                })}
              </AppSelect>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div>
            {deck && onDelete && !confirmingDelete && (
              <button onClick={() => setConfirmingDelete(true)} className="btn-press" style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                Delete deck
              </button>
            )}
            {confirmingDelete && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setConfirmingDelete(false)} className="btn-press" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={() => { onDelete(deck.id); onClose() }} className="btn-press" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Confirm delete</button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="btn-press" style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={handleSave} disabled={!canSave} className="btn-press" style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              background: canSave ? 'var(--accent-blue)' : 'var(--border)',
              color: canSave ? 'var(--btn-primary-text)' : 'var(--text-muted)',
              cursor: canSave ? 'pointer' : 'default', transition: 'all 0.15s',
            }}>{deck ? 'Save' : 'Create Deck'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Card edit modal ───────────────────────────────────────────────────────────
function CardModal({ card, onClose, onSave, onDelete }) {
  const [front, setFront] = useState(card.front)
  const [back,  setBack]  = useState(card.back)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const canSave = front.trim() && back.trim()

  const handleSave = () => {
    if (!canSave) return
    onSave({ front: front.trim(), back: back.trim() })
    onClose()
  }

  const areaStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border-strong)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', minHeight: 70,
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 16, width: 460, maxWidth: '92vw', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Edit Card</span>
          <button onClick={onClose} className="btn-press" style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Label>Front</Label>
            <textarea autoFocus style={areaStyle} value={front} onChange={e => setFront(e.target.value)}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
          </div>
          <div>
            <Label>Back</Label>
            <textarea style={areaStyle} value={back} onChange={e => setBack(e.target.value)}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-strong)'} />
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div>
            {!confirmingDelete && (
              <button onClick={() => setConfirmingDelete(true)} className="btn-press" style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                Delete
              </button>
            )}
            {confirmingDelete && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setConfirmingDelete(false)} className="btn-press" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={() => { onDelete(); onClose() }} className="btn-press" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Confirm delete</button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="btn-press" style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={handleSave} disabled={!canSave} className="btn-press" style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              background: canSave ? 'var(--accent-blue)' : 'var(--border)',
              color: canSave ? 'var(--btn-primary-text)' : 'var(--text-muted)',
              cursor: canSave ? 'pointer' : 'default', transition: 'all 0.15s',
            }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AI generation modal ───────────────────────────────────────────────────────
function GenerateCardsModal({ fixedDeck, decks, notes, domainMap, sourceNote, onClose, onGenerate, onAddCards, onAddDeck, onGetSignedPdfUrl }) {
  const typedNotes = notes.filter(n => n.type === 'typed' && (n.content || '').trim().length >= 200)
  const pdfNotes   = notes.filter(n => n.type === 'pdf' && n.pdfStoragePath)

  // Combined "your notes" list — typed notes and saved PDFs in one picker
  const existingNotes = [
    ...typedNotes.map(n => ({ id: n.id, label: `${n.title || 'Untitled'} · note`, kind: 'typed', note: n })),
    ...pdfNotes.map(n => ({ id: n.id, label: `${n.title || 'Untitled'} · PDF`, kind: 'pdf', note: n })),
  ]

  const [step,    setStep]    = useState('input') // 'input' | 'loading' | 'review' | 'unsuitable'
  const [source,  setSource]  = useState(sourceNote ? 'existing' : 'upload') // 'existing' | 'upload'
  const [existingId, setExistingId] = useState(sourceNote?.id || '')
  const [pasteText, setPasteText] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const pdfInputRef = useRef()

  // Animated body height — the whole input body resizes smoothly as it changes (mirrors NewNoteModal)
  const srcBodyRef = useRef(null)
  const [srcH, setSrcH] = useState(null)
  useEffect(() => {
    if (step !== 'input') return
    const el = srcBodyRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => setSrcH(Math.ceil(entry.contentRect.height)))
    obs.observe(el)
    return () => obs.disconnect()
  }, [step])
  const [deckChoice,   setDeckChoice]   = useState(fixedDeck ? fixedDeck.id : '__new__')
  const [newDeckTitle, setNewDeckTitle] = useState(sourceNote?.title ? `${sourceNote.title} — Flashcards` : '')
  const [error,   setError]   = useState('')
  const [reason,  setReason]  = useState('')
  const [results, setResults] = useState([]) // [{ front, back, checked }]
  const [saving,  setSaving]  = useState(false)
  const [mock,    setMock]    = useState(() => localStorage.getItem('sos-mock-ai') === '1')
  const toggleMock = () => {
    const next = !mock
    setMock(next)
    localStorage.setItem('sos-mock-ai', next ? '1' : '0')
  }

  const selectedExisting = existingNotes.find(e => e.id === existingId)
  const canGenerate = source === 'existing'
    ? !!selectedExisting
    : (pasteText.trim().length >= 100 || !!pdfFile)

  const targetTitle = fixedDeck ? fixedDeck.title
    : deckChoice === '__new__' ? newDeckTitle.trim()
    : decks.find(d => d.id === deckChoice)?.title

  const contextNote = (source === 'existing' ? selectedExisting?.note : null) || sourceNote

  const handleGenerate = async () => {
    setError('')
    setStep('loading')
    try {
      let material
      const usingPdf = source === 'existing' ? selectedExisting?.kind === 'pdf' : !!pdfFile
      if (usingPdf) {
        let buffer
        if (source === 'existing') {
          const url = await onGetSignedPdfUrl(selectedExisting.note.pdfStoragePath)
          buffer = await (await fetch(url)).arrayBuffer()
        } else {
          buffer = await pdfFile.arrayBuffer()
        }
        material = await extractPdfText(buffer)
        if (material.length < 100) {
          setReason('No readable text found in this PDF — it may be a scanned document.')
          setStep('unsuitable')
          return
        }
      } else if (source === 'existing') {
        material = (selectedExisting?.note.content || '').trim()
      } else {
        material = pasteText.trim()
      }
      const ctxDomainId = fixedDeck?.domainId
        || (deckChoice !== '__new__' ? decks.find(d => d.id === deckChoice)?.domainId : null)
        || contextNote?.domainId || null
      const result = await onGenerate({
        material,
        deckTitle: targetTitle || null,
        domainName: ctxDomainId ? domainMap[ctxDomainId]?.name || null : null,
        academicWeek: contextNote?.academicWeek || fixedDeck?.academicWeek || null,
      })
      if (!result.suitable || !result.cards?.length) {
        setReason(result.reason || 'This material does not look like study content.')
        setStep('unsuitable')
        return
      }
      setResults(result.cards.map(c => ({ ...c, checked: true })))
      setStep('review')
    } catch (err) {
      console.error('generate cards failed:', err)
      setError(err.message || 'Generation failed. Check that the edge function is deployed.')
      setStep('input')
    }
  }

  const checkedCount = results.filter(r => r.checked).length
  const handleSave = async () => {
    const selected = results.filter(r => r.checked && r.front.trim() && r.back.trim())
      .map(r => ({ front: r.front.trim(), back: r.back.trim() }))
    if (!selected.length) return
    setSaving(true)
    let deckId = fixedDeck ? fixedDeck.id : deckChoice
    if (deckId === '__new__') {
      deckId = await onAddDeck({
        title: newDeckTitle.trim() || 'Generated Deck',
        domainId: contextNote?.domainId || null,
        academicWeek: contextNote?.academicWeek || null,
        noteId: contextNote?.id || null,
        studySessionId: null,
      })
      if (!deckId) { setSaving(false); setError('Could not create the deck.'); return }
    }
    await onAddCards(deckId, selected)
    onClose()
  }

  const setResult = (i, patch) => setResults(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border-strong)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  const SOURCES = [
    ['existing', 'Your notes'],
    ['upload',   'Paste or upload'],
  ]

  return (
    <div onClick={step === 'loading' ? undefined : onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 16, width: 540, maxWidth: '92vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            <Sparkles size={15} style={{ color: 'var(--accent-purple)' }} />
            {step === 'review' ? `Review ${results.length} cards` : 'Generate Flashcards'}
          </span>
          {step !== 'loading' && (
            <button onClick={onClose} className="btn-press" style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {step === 'input' && (
            <>
              <style>{`@keyframes _gen-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`}</style>

              {/* Animated-height body — the whole form resizes smoothly as it changes */}
              <div style={{ overflow: 'hidden', height: srcH ?? 'auto', transition: 'height 0.28s cubic-bezier(0.32,0.72,0,1)' }}>
                <div ref={srcBodyRef} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  <div>
                    <Label>Where should the cards come from?</Label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {SOURCES.map(([key, label]) => {
                        const disabled = key === 'existing' && existingNotes.length === 0
                        return (
                          <button key={key} onClick={() => !disabled && setSource(key)} disabled={disabled} className="btn-press"
                            title={disabled ? 'You have no notes yet' : undefined}
                            style={{
                              flex: 1, padding: '9px 4px', borderRadius: 7, border: 'none', cursor: disabled ? 'default' : 'pointer',
                              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                              background: source === key ? 'rgba(167,139,250,0.14)' : 'var(--bg-overlay)',
                              color: source === key ? 'var(--accent-purple)' : 'var(--text-secondary)',
                              outline: source === key ? '1.5px solid rgba(167,139,250,0.4)' : '1.5px solid transparent',
                              opacity: disabled ? 0.4 : 1,
                              transition: 'background 0.12s, color 0.12s, outline-color 0.12s',
                            }}>{label}</button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Source-specific panel, keyed so it fades in on switch */}
                  <div key={source} style={{ animation: '_gen-in 0.2s ease' }}>

                    {source === 'existing' && (
                      <div>
                        <Label>Choose a note or PDF</Label>
                        <AppSelect value={existingId} onChange={setExistingId}>
                          <AppSelectItem value="">Pick one of your notes</AppSelectItem>
                          {existingNotes.map(e => <AppSelectItem key={e.id} value={e.id}>{e.label}</AppSelectItem>)}
                        </AppSelect>
                        {selectedExisting?.kind === 'pdf' && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Text is read from the PDF — scanned pages can't be used.</div>
                        )}
                      </div>
                    )}

                    {source === 'upload' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input
                          ref={pdfInputRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) setPdfFile(f) }}
                        />
                        <div>
                          <Label>Write or paste</Label>
                          <textarea
                            autoFocus value={pasteText} onChange={e => setPasteText(e.target.value)}
                            placeholder="Paste lecture notes, slides text, a textbook section…"
                            style={{ ...inputStyle, minHeight: 130, resize: 'vertical', display: 'block' }}
                            onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                          />
                          {pasteText.trim().length > 0 && pasteText.trim().length < 100 && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Add a bit more text (at least ~100 characters).</div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>or upload a PDF</span>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        </div>

                        <button
                          onClick={() => pdfInputRef.current?.click()}
                          onDragOver={e => { e.preventDefault(); if (!dragging) setDragging(true) }}
                          onDragEnter={e => { e.preventDefault(); setDragging(true) }}
                          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
                          onDrop={e => {
                            e.preventDefault(); setDragging(false)
                            const f = e.dataTransfer.files?.[0]
                            if (f && (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))) setPdfFile(f)
                          }}
                          style={{
                            width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7,
                            padding: '22px 12px', borderRadius: 10,
                            border: `1.5px dashed ${dragging || pdfFile ? 'var(--accent-purple)' : 'var(--border-strong)'}`,
                            background: dragging || pdfFile ? 'rgba(167,139,250,0.1)' : 'var(--bg-overlay)',
                            color: pdfFile ? 'var(--text-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                            transition: 'border-color 0.15s, background 0.15s', boxSizing: 'border-box',
                          }}
                        >
                          <Upload size={20} style={{ color: 'var(--accent-purple)' }} />
                          <span style={{ fontSize: 13, fontWeight: 500, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pdfFile ? pdfFile.name : dragging ? 'Drop the PDF here' : 'Click to choose, or drag a PDF here'}
                          </span>
                          {pdfFile && (
                            <span
                              onClick={e => { e.stopPropagation(); setPdfFile(null); if (pdfInputRef.current) pdfInputRef.current.value = '' }}
                              style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'underline' }}
                            >Remove</span>
                          )}
                        </button>
                        {pdfFile && pasteText.trim() && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>The PDF will be used (clear it to use your pasted text instead).</div>
                        )}
                      </div>
                    )}

                  </div>

                  {!fixedDeck && (
                    <div>
                      <Label>Add cards to</Label>
                      <AppSelect value={deckChoice} onChange={setDeckChoice}>
                        <AppSelectItem value="__new__">New deck</AppSelectItem>
                        {decks.map(d => <AppSelectItem key={d.id} value={d.id}>{d.title}</AppSelectItem>)}
                      </AppSelect>
                      {deckChoice === '__new__' && (
                        <input
                          style={{ ...inputStyle, marginTop: 8 }} placeholder="New deck name"
                          value={newDeckTitle} onChange={e => setNewDeckTitle(e.target.value)}
                          onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                          onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                        />
                      )}
                    </div>
                  )}

                  {error && <div style={{ fontSize: 12, color: 'var(--accent-red)' }}>{error}</div>}

                  {import.meta.env.DEV && (
                    <button onClick={toggleMock} className="btn-press" style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                      border: `1px solid ${mock ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`,
                      background: mock ? 'rgba(52,211,153,0.1)' : 'transparent',
                      color: mock ? 'var(--accent-green)' : 'var(--text-muted)',
                      cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', textAlign: 'left',
                    }}>
                      <FlaskConical size={13} />
                      <span style={{ flex: 1 }}>Mock mode {mock ? 'on' : 'off'} — {mock ? 'returns sample cards, no API call' : 'click to test without calling Claude'}</span>
                      {mock ? <CheckSquare size={14} /> : <Square size={14} />}
                    </button>
                  )}

                </div>
              </div>
            </>
          )}

          {step === 'loading' && <GeneratingText />}

          {step === 'unsuitable' && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              <Layers size={32} style={{ marginBottom: 12, color: 'var(--accent-amber)' }} />
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Couldn't make flashcards from this</p>
              <p style={{ fontSize: 13, margin: '8px 0 0', lineHeight: 1.5 }}>{reason}</p>
            </div>
          )}

          {step === 'review' && (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Uncheck anything wrong, edit freely, then add to <strong style={{ color: 'var(--text-secondary)' }}>{targetTitle || 'the deck'}</strong>.
              </div>
              {results.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', opacity: r.checked ? 1 : 0.45, transition: 'opacity 0.12s' }}>
                  <button onClick={() => setResult(i, { checked: !r.checked })} className="btn-press" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 9, color: r.checked ? 'var(--accent-purple)' : 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
                    {r.checked ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <AutoTextarea value={r.front} onChange={e => setResult(i, { front: e.target.value })}
                      style={{ ...inputStyle, fontWeight: 600 }} />
                    <AutoTextarea value={r.back} onChange={e => setResult(i, { back: e.target.value })}
                      style={{ ...inputStyle, color: 'var(--text-secondary)' }} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          {step === 'input' && (
            <>
              <button onClick={onClose} className="btn-press" style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              {(() => {
                const ready = canGenerate && !(!fixedDeck && deckChoice === '__new__' && !newDeckTitle.trim())
                return (
                  <ParticleButton onClick={handleGenerate} disabled={!ready} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
                    background: ready ? 'var(--accent-purple)' : 'var(--border)',
                    color: ready ? '#fff' : 'var(--text-muted)',
                    cursor: ready ? 'pointer' : 'default', transition: 'background 0.15s, color 0.15s', fontFamily: 'inherit',
                  }}><Sparkles size={13} /> Generate</ParticleButton>
                )
              })()}
            </>
          )}
          {step === 'unsuitable' && (
            <button onClick={() => setStep('input')} className="btn-press" style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Try different material</button>
          )}
          {step === 'review' && (
            <>
              <button onClick={() => setStep('input')} className="btn-press" style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Back</button>
              <button onClick={handleSave} disabled={checkedCount === 0 || saving} className="btn-press" style={{
                padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
                background: checkedCount > 0 && !saving ? 'var(--accent-blue)' : 'var(--border)',
                color: checkedCount > 0 && !saving ? 'var(--btn-primary-text)' : 'var(--text-muted)',
                cursor: checkedCount > 0 && !saving ? 'pointer' : 'default', transition: 'all 0.15s',
              }}>{saving ? 'Adding…' : `Add ${checkedCount} card${checkedCount !== 1 ? 's' : ''}`}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Quick add card form ───────────────────────────────────────────────────────
function QuickAddCard({ onAdd }) {
  const [front, setFront] = useState('')
  const [back,  setBack]  = useState('')
  const frontRef = useRef()
  const canAdd = front.trim() && back.trim()

  const add = () => {
    if (!canAdd) return
    onAdd({ front: front.trim(), back: back.trim() })
    setFront('')
    setBack('')
    frontRef.current?.focus()
  }

  const inputStyle = {
    flex: 1, padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border-strong)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', minWidth: 0,
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
      <input
        ref={frontRef} style={inputStyle} placeholder="Front — question or term"
        value={front} onChange={e => setFront(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && add()}
        onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
        onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
      />
      <input
        style={inputStyle} placeholder="Back — answer"
        value={back} onChange={e => setBack(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && add()}
        onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
        onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
      />
      <button onClick={add} disabled={!canAdd} className="btn-press" style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 8,
        border: 'none', fontSize: 13, fontWeight: 600,
        background: canAdd ? 'var(--accent-blue)' : 'var(--border)',
        color: canAdd ? 'var(--btn-primary-text)' : 'var(--text-muted)',
        cursor: canAdd ? 'pointer' : 'default', transition: 'all 0.15s', flexShrink: 0,
      }}>
        <Plus size={14} /> Add
      </button>
    </div>
  )
}

// ─── Card row ──────────────────────────────────────────────────────────────────
function CardRow({ card, onEdit, onDelete, isLast }) {
  const [hovered,    setHovered]    = useState(false)
  const [confirming, setConfirming] = useState(false)

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      background: hovered ? 'var(--nav-hover)' : 'transparent',
      transition: 'background 0.12s',
    }}>
      <div onClick={onEdit} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {card.front}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {card.back}
        </div>
      </div>
      {isDue(card) ? (
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'rgba(251,191,36,0.12)', color: 'var(--accent-amber)', flexShrink: 0 }}>due</span>
      ) : (
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
          due {new Date(card.dueDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      )}
      {hovered && !confirming && (
        <button onClick={e => { e.stopPropagation(); setConfirming(true) }} className="btn-press" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', flexShrink: 0, display: 'flex' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          <Trash2 size={13} />
        </button>
      )}
      {confirming && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setConfirming(false)} className="btn-press" style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={onDelete} className="btn-press" style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
        </div>
      )}
    </div>
  )
}

// ─── Review mode ───────────────────────────────────────────────────────────────
function shuffleArr(a) {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

// `cards` is a flat list where each card carries a `deckId` (so this works across decks)
function ReviewView({ cards, shuffle: shuffleInit, reverse: reverseInit, onGrade, onExit, exitLabel = 'Back to deck' }) {
  const cardMap = useMemo(() => Object.fromEntries(cards.map(c => [c.id, c])), [cards])
  const [queue, setQueue] = useState(() => {
    const ids = cards.map(c => c.id)
    return shuffleInit ? shuffleArr(ids) : ids
  })
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reverse, setReverse] = useState(!!reverseInit)
  const [graded, setGraded] = useState(0)
  // Back face renders from this; only updated when revealing, so the grade flip-back
  // keeps showing the card you just saw instead of spoiling the next card's answer.
  const [backCard, setBackCard] = useState(null)
  const [shuffling, setShuffling] = useState(false)
  const shuffleTimer = useRef()
  const reduce = useReducedMotion()

  const card = index < queue.length ? cardMap[queue[index]] : null
  const promptText = card ? (reverse ? card.back : card.front) : ''
  const answerText = backCard ? (reverse ? backCard.front : backCard.back) : ''

  const flip = () => {
    if (!flipped) setBackCard(card)
    setFlipped(v => !v)
  }

  const handleGrade = (grade) => {
    onGrade(card.deckId, card.id, grade)
    setGraded(n => n + 1)
    if (grade === 'again') setQueue(q => [...q, queue[index]])
    setFlipped(false)   // flips 180 → 0, landing on the next card's front
    setIndex(i => i + 1)
  }

  const reshuffle = () => {
    setQueue(q => [...q.slice(0, index), ...shuffleArr(q.slice(index))])
    setFlipped(false)
    if (reduce) return
    setShuffling(true)
    clearTimeout(shuffleTimer.current)
    shuffleTimer.current = setTimeout(() => setShuffling(false), 560)
  }
  useEffect(() => () => clearTimeout(shuffleTimer.current), [])
  const toggleReverse = () => { setFlipped(false); setBackCard(null); setReverse(v => !v) }

  // Keyboard: Space flips, 1/2/3 grade once revealed
  useEffect(() => {
    if (!card) return
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        flip()
        return
      }
      if (flipped) {
        const grade = GRADES.find(g => g.hotkey === e.key)
        if (grade) { e.preventDefault(); handleGrade(grade.key) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, flipped, index, queue, reverse])

  if (!card) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        <Layers size={36} style={{ marginBottom: 12, color: 'var(--accent-green)' }} />
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Review complete</p>
        <p style={{ fontSize: 13, margin: '6px 0 18px' }}>{graded} card{graded !== 1 ? 's' : ''} reviewed</p>
        <button onClick={onExit} className="btn-press" style={{
          padding: '9px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600,
          background: 'var(--accent-blue)', color: 'var(--btn-primary-text)', cursor: 'pointer',
        }}>{exitLabel}</button>
      </div>
    )
  }

  const chip = (active) => ({
    width: 30, height: 28, borderRadius: 7, border: `1px solid ${active ? 'var(--accent-purple)' : 'var(--border-strong)'}`,
    background: active ? 'rgba(167,139,250,0.12)' : 'none', color: active ? 'var(--accent-purple)' : 'var(--text-secondary)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  })

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
          {index + 1} / {queue.length}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={reshuffle} className="btn-press" title="Shuffle the remaining cards" style={chip(false)}>
            <Shuffle size={13} />
          </button>
          <button onClick={toggleReverse} className="btn-press" title="Reverse (show the answer side first)" style={chip(reverse)}>
            <motion.span animate={{ rotate: reverse ? 180 : 0 }} transition={{ duration: reduce ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }} style={{ display: 'flex' }}>
              <ArrowLeftRight size={13} />
            </motion.span>
          </button>
          <button onClick={onExit} className="btn-press" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
            <X size={12} /> End
          </button>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Two faint cards behind give the review a real-deck feel; on shuffle they
            riffle out to opposite sides and restack while the top card lifts. */}
        {[0, 1].map(i => {
          const rest = i === 0
            ? { x: 0, y: 8, rotate: 1.1, scale: 0.975, opacity: 0.5 }
            : { x: 0, y: 15, rotate: -1.3, scale: 0.95, opacity: 0.28 }
          const riffle = i === 0
            ? { x: [0, 70, 0], y: [8, -6, 8], rotate: [1.1, 11, 1.1], scale: 0.975, opacity: [0.5, 0.85, 0.5] }
            : { x: [0, -70, 0], y: [15, -2, 15], rotate: [-1.3, -11, -1.3], scale: 0.95, opacity: [0.28, 0.72, 0.28] }
          return (
            <motion.div
              key={i} aria-hidden
              animate={shuffling ? riffle : rest}
              transition={shuffling
                ? { duration: 0.55, ease: [0.4, 0, 0.2, 1], delay: i * 0.05 }
                : { duration: reduce ? 0 : 0.3, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position: 'absolute', inset: 0, height: 300, borderRadius: 16,
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-modal)', zIndex: 0, pointerEvents: 'none',
              }}
            />
          )
        })}

        <motion.div
          animate={shuffling ? { y: [0, -12, 0], rotate: [0, -2.5, 1.5, 0], scale: [1, 1.025, 0.99, 1] } : { y: 0, rotate: 0, scale: 1 }}
          transition={{ duration: shuffling ? 0.55 : (reduce ? 0 : 0.3), ease: [0.4, 0, 0.2, 1] }}
          style={{ position: 'relative', zIndex: 2 }}
        >
          <div onClick={flip} style={{ perspective: 1600, cursor: 'pointer' }}>
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: reduce ? 0 : 0.45, ease: [0.4, 0, 0.2, 1] }}
              style={{ position: 'relative', height: 300, transformStyle: 'preserve-3d' }}
            >
              {[false, true].map(isBack => (
            <div key={String(isBack)} style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              transform: isBack ? 'rotateY(180deg)' : 'none',
              background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
              borderRadius: 16, padding: '28px 26px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', gap: 14, boxShadow: 'var(--shadow-modal)',
              overflowY: 'auto',
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: isBack ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                {isBack ? (reverse ? 'Front' : 'Back') : (reverse ? 'Back' : 'Front')}
              </span>
              <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {isBack ? answerText : promptText}
              </div>
              {!isBack && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tap or press Space to reveal</span>}
            </div>
          ))}
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18, minHeight: 44 }}>
        {flipped && GRADES.map((g, gi) => (
          <motion.button key={g.key} onClick={() => handleGrade(g.key)}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : gi * 0.04 }}
            whileHover={reduce ? undefined : { scale: 1.04, backgroundColor: `${g.color}2b` }}
            whileTap={reduce ? undefined : { scale: 0.96 }}
            style={{
              flex: 1, padding: '11px 4px', borderRadius: 10, border: `1.5px solid ${g.color}55`,
              background: `${g.color}18`, color: g.color, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
            {g.label}
            <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, border: `1px solid ${g.color}66`, borderRadius: 4, padding: '1px 5px', lineHeight: 1.3 }}>{g.hotkey}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ─── Deck card (list view) ─────────────────────────────────────────────────────
function DeckCard({ deck, domain, onOpen, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const [confirming, setConfirming] = useState(false)

  return (
    <div onClick={() => !confirming && onOpen()} onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setConfirming(false) }} style={{
      position: 'relative',
      background: 'var(--bg-surface)', border: `1px solid ${hovered ? 'var(--border-strong)' : 'var(--border)'}`,
      borderRadius: 14, padding: '18px 18px 16px', cursor: 'pointer',
      transition: 'border-color 0.12s, transform 0.12s',
      transform: hovered ? 'translateY(-2px)' : 'none',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {confirming && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'absolute', inset: 0, zIndex: 2, borderRadius: 14,
          background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16, textAlign: 'center',
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Delete <strong>{deck.title}</strong> and its {deck.cards.length} card{deck.cards.length !== 1 ? 's' : ''}?</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => setConfirming(false)} className="btn-press" style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={() => onDelete(deck.id)} className="btn-press" style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>{deck.title}</span>
        {hovered ? (
          <button
            onClick={e => { e.stopPropagation(); setConfirming(true) }}
            title="Delete deck"
            className="btn-press"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', flexShrink: 0, marginTop: 1, display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Trash2 size={15} />
          </button>
        ) : (
          <Layers size={15} style={{ color: domain ? domain.color : 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} />
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {domain && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: `${domain.color}18`, color: domain.color }}>
            {domain.code || domain.name}
          </span>
        )}
        <WeekBadge week={deck.academicWeek} />
        {deck.noteId && <FileText size={11} style={{ color: 'var(--accent-purple)' }} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{deck.cards.length} card{deck.cards.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function FlashcardsPage({
  decks, domains, notes, studySessions,
  onAddDeck, onUpdateDeck, onDeleteDeck,
  onAddCard, onAddCards, onUpdateCard, onDeleteCard, onGradeCard,
  onOpenNote, onGenerateCards, onGetSignedPdfUrl,
  generateSourceNote, onClearGenerateSource,
}) {
  const isMobile = useIsMobile()
  const [openDeckId,  setOpenDeckId]  = useState(null)
  const [showNewDeck, setShowNewDeck] = useState(false)
  const [editingDeck, setEditingDeck] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [reviewing,   setReviewing]   = useState(null)  // null | 'study' | 'practice'
  const [shuffle,     setShuffle]     = useState(false)
  const [reverse,     setReverse]     = useState(false)
  const [crossDue,    setCrossDue]    = useState(false)  // cross-deck "review all due"
  const [showGenerate, setShowGenerate] = useState(false)

  useEffect(() => {
    if (generateSourceNote) setShowGenerate(true)
  }, [generateSourceNote])

  const closeGenerate = () => {
    setShowGenerate(false)
    onClearGenerateSource?.()
  }

  const domainMap = useMemo(() => Object.fromEntries(domains.map(d => [d.id, d])), [domains])
  const openDeck = decks.find(d => d.id === openDeckId)
  const totalDue = useMemo(() => decks.reduce((n, d) => n + d.cards.filter(isDue).length, 0), [decks])

  const closeDeck = () => { setOpenDeckId(null); setReviewing(null) }

  // ── Deck detail / review ─────────────────────────────────────────────────────
  const toggleChip = (active) => ({
    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
    border: `1px solid ${active ? 'var(--accent-purple)' : 'var(--border-strong)'}`,
    background: active ? 'rgba(167,139,250,0.12)' : 'var(--bg-surface)',
    color: active ? 'var(--accent-purple)' : 'var(--text-secondary)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  })

  if (openDeck) {
    const domain = openDeck.domainId ? domainMap[openDeck.domainId] : null
    const dueCount = openDeck.cards.filter(isDue).length

    return (
      <div style={{ padding: isMobile ? '22px 16px 28px' : '36px 40px', maxWidth: 860 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <button onClick={reviewing ? () => setReviewing(null) : closeDeck} className="btn-press" style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-strong)',
            background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ChevronLeft size={16} />
          </button>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.8px', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {openDeck.title}
          </h1>
          {!reviewing && (
            <button onClick={() => setEditingDeck(true)} title="Edit deck" className="btn-press" style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-strong)',
              background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Pencil size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: reviewing ? 22 : 16, marginLeft: 40, flexWrap: 'wrap' }}>
          {domain && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: `${domain.color}18`, color: domain.color }}>
              {domain.code || domain.name}
            </span>
          )}
          <WeekBadge week={openDeck.academicWeek} />
          {openDeck.noteId && onOpenNote && (
            <button onClick={() => onOpenNote(openDeck.noteId)} className="btn-press" style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent-purple)', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
              <FileText size={11} /> Open linked note
            </button>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {openDeck.cards.length} card{openDeck.cards.length !== 1 ? 's' : ''}
          </span>
        </div>

        {!reviewing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, marginLeft: 40, flexWrap: 'wrap' }}>
            <button onClick={() => setReviewing('practice')} disabled={openDeck.cards.length === 0} className="btn-press" style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9,
              border: 'none', fontSize: 13, fontWeight: 600, flexShrink: 0,
              background: openDeck.cards.length ? 'var(--accent-blue)' : 'var(--border)',
              color: openDeck.cards.length ? 'var(--btn-primary-text)' : 'var(--text-muted)',
              cursor: openDeck.cards.length ? 'pointer' : 'default', fontFamily: 'inherit',
              boxShadow: openDeck.cards.length ? 'var(--glow-blue)' : 'none',
            }}>
              <Play size={13} /> Practice
            </button>
            <button onClick={() => setReviewing('study')} disabled={dueCount === 0} className="btn-press"
              title={dueCount === 0 ? 'No cards due for review right now' : 'Spaced-repetition review of due cards'} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9,
                border: '1px solid var(--border-strong)', fontSize: 13, fontWeight: 600, flexShrink: 0,
                background: 'var(--bg-surface)', color: dueCount ? 'var(--text-secondary)' : 'var(--text-muted)',
                cursor: dueCount ? 'pointer' : 'default', fontFamily: 'inherit', opacity: dueCount ? 1 : 0.6,
              }}>
              <RotateCcw size={13} /> Study{dueCount ? ` (${dueCount})` : ''}
            </button>
            <button onClick={() => setShuffle(v => !v)} className="btn-press" title="Shuffle card order" style={toggleChip(shuffle)}>
              <Shuffle size={14} />
            </button>
            <button onClick={() => setReverse(v => !v)} className="btn-press" title="Reverse — show the answer side first" style={toggleChip(reverse)}>
              <motion.span animate={{ rotate: reverse ? 180 : 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} style={{ display: 'flex' }}>
                <ArrowLeftRight size={14} />
              </motion.span>
            </button>
            <div style={{ flex: 1 }} />
            <GenerateAIButton onClick={() => setShowGenerate(true)} />
          </div>
        )}

        {reviewing ? (
          <ReviewView
            cards={(reviewing === 'practice' ? openDeck.cards : openDeck.cards.filter(isDue)).map(c => ({ ...c, deckId: openDeck.id }))}
            shuffle={shuffle}
            reverse={reverse}
            onGrade={onGradeCard}
            onExit={() => setReviewing(null)}
          />
        ) : (
          <>
            <QuickAddCard onAdd={card => onAddCard(openDeck.id, card)} />

            {openDeck.cards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <Layers size={36} style={{ marginBottom: 12, color: 'var(--border-strong)' }} />
                <p style={{ fontSize: 14, margin: 0 }}>No cards yet. Add your first one above.</p>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                {openDeck.cards.map((card, i) => (
                  <CardRow
                    key={card.id}
                    card={card}
                    isLast={i === openDeck.cards.length - 1}
                    onEdit={() => setEditingCard(card)}
                    onDelete={() => onDeleteCard(openDeck.id, card.id)}
                  />
                ))}
              </div>
            )}

            <PerformanceChart cards={openDeck.cards} title="Deck performance" />
          </>
        )}

        {editingDeck && (
          <DeckModal
            deck={openDeck}
            domains={domains} notes={notes} studySessions={studySessions} domainMap={domainMap}
            onClose={() => setEditingDeck(false)}
            onSave={updates => onUpdateDeck(openDeck.id, updates)}
            onDelete={id => { onDeleteDeck(id); closeDeck() }}
          />
        )}

        {editingCard && (
          <CardModal
            card={editingCard}
            onClose={() => setEditingCard(null)}
            onSave={updates => onUpdateCard(openDeck.id, editingCard.id, updates)}
            onDelete={() => onDeleteCard(openDeck.id, editingCard.id)}
          />
        )}

        {showGenerate && (
          <GenerateCardsModal
            fixedDeck={openDeck}
            decks={decks} notes={notes} domainMap={domainMap}
            sourceNote={null}
            onClose={closeGenerate}
            onGenerate={onGenerateCards}
            onAddCards={onAddCards}
            onAddDeck={onAddDeck}
            onGetSignedPdfUrl={onGetSignedPdfUrl}
          />
        )}
      </div>
    )
  }

  // ── Cross-deck "review all due" ──────────────────────────────────────────────
  if (crossDue) {
    const dueCards = decks.flatMap(d => d.cards.filter(isDue).map(c => ({ ...c, deckId: d.id })))
    return (
      <div style={{ padding: isMobile ? '22px 16px 28px' : '36px 40px', maxWidth: 860 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <button onClick={() => setCrossDue(false)} className="btn-press" style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-strong)',
            background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ChevronLeft size={16} />
          </button>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.8px' }}>
            Review all due
          </h1>
        </div>
        {dueCards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <Layers size={36} style={{ marginBottom: 12, color: 'var(--accent-green)' }} />
            <p style={{ fontSize: 14, margin: 0 }}>Nothing due — you're all caught up.</p>
          </div>
        ) : (
          <ReviewView cards={dueCards} shuffle reverse={false} onGrade={onGradeCard} onExit={() => setCrossDue(false)} exitLabel="Done" />
        )}
      </div>
    )
  }

  // ── Deck list ────────────────────────────────────────────────────────────────
  const totalCards = decks.reduce((n, d) => n + d.cards.length, 0)
  return (
    <div style={{ padding: isMobile ? '22px 16px 28px' : '36px 40px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: isMobile ? 18 : 24, gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 30 : 40, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>Flashcards</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            {decks.length === 0 ? 'Create a deck to start' : `${decks.length} deck${decks.length !== 1 ? 's' : ''} · ${totalCards} card${totalCards !== 1 ? 's' : ''}`}
          </p>
          {totalDue > 0 && (
            <button onClick={() => setCrossDue(true)} className="btn-press" style={{
              display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '6px 12px', borderRadius: 8,
              border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
              color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <RotateCcw size={13} /> Review all due ({totalDue})
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <GenerateAIButton onClick={() => setShowGenerate(true)} />
          <button data-tutorial-id="flashcards-new-btn" onClick={() => setShowNewDeck(true)} className="btn-press" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9,
            border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text-secondary)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Plus size={14} /> New Deck
          </button>
        </div>
      </div>

      {decks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <Layers size={36} style={{ marginBottom: 12, color: 'var(--border-strong)' }} />
          <p style={{ fontSize: 14, margin: 0 }}>No decks yet. Click <strong style={{ color: 'var(--accent-blue)' }}>New Deck</strong> to create one.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(230px, 1fr))', gap: isMobile ? 10 : 14 }}>
            {decks.map(deck => (
              <DeckCard
                key={deck.id}
                deck={deck}
                domain={deck.domainId ? domainMap[deck.domainId] : null}
                onOpen={() => setOpenDeckId(deck.id)}
                onDelete={onDeleteDeck}
              />
            ))}
          </div>
          <PerformanceChart cards={decks.flatMap(d => d.cards)} title="Overall performance" />
        </>
      )}

      {showNewDeck && (
        <DeckModal
          domains={domains} notes={notes} studySessions={studySessions} domainMap={domainMap}
          onClose={() => setShowNewDeck(false)}
          onSave={onAddDeck}
        />
      )}

      {showGenerate && (
        <GenerateCardsModal
          fixedDeck={null}
          decks={decks} notes={notes} domainMap={domainMap}
          sourceNote={generateSourceNote}
          onClose={closeGenerate}
          onGenerate={onGenerateCards}
          onAddCards={onAddCards}
          onAddDeck={onAddDeck}
          onGetSignedPdfUrl={onGetSignedPdfUrl}
        />
      )}
    </div>
  )
}
