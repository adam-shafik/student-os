import { useState, useMemo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import AppSelect, { AppSelectItem } from '../components/AppSelect'
import { Plus, X, Layers, Trash2, ChevronLeft, Pencil, Play, RotateCcw, FileText, Sparkles, Square, CheckSquare } from 'lucide-react'
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
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <button onClick={() => setConfirmingDelete(true)} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                Delete deck
              </button>
            )}
            {confirmingDelete && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setConfirmingDelete(false)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={() => { onDelete(deck.id); onClose() }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Confirm delete</button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={handleSave} disabled={!canSave} style={{
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
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <button onClick={() => setConfirmingDelete(true)} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                Delete
              </button>
            )}
            {confirmingDelete && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setConfirmingDelete(false)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={() => { onDelete(); onClose() }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Confirm delete</button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={handleSave} disabled={!canSave} style={{
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

  const [step,    setStep]    = useState('input') // 'input' | 'loading' | 'review' | 'unsuitable'
  const [source,  setSource]  = useState(sourceNote ? 'note' : 'paste')
  const [pasteText, setPasteText] = useState('')
  const [noteId,  setNoteId]  = useState(sourceNote?.id || '')
  const [pdfId,   setPdfId]   = useState('')
  const [deckChoice,   setDeckChoice]   = useState(fixedDeck ? fixedDeck.id : '__new__')
  const [newDeckTitle, setNewDeckTitle] = useState(sourceNote?.title ? `${sourceNote.title} — Flashcards` : '')
  const [error,   setError]   = useState('')
  const [reason,  setReason]  = useState('')
  const [results, setResults] = useState([]) // [{ front, back, checked }]
  const [saving,  setSaving]  = useState(false)

  const selectedNote = typedNotes.find(n => n.id === noteId)
  const canGenerate = source === 'paste' ? pasteText.trim().length >= 100
    : source === 'note' ? !!selectedNote
    : !!pdfId

  const targetTitle = fixedDeck ? fixedDeck.title
    : deckChoice === '__new__' ? newDeckTitle.trim()
    : decks.find(d => d.id === deckChoice)?.title

  const contextNote = source === 'note' ? selectedNote : sourceNote

  const handleGenerate = async () => {
    setError('')
    setStep('loading')
    try {
      let material
      if (source === 'paste') {
        material = pasteText.trim()
      } else if (source === 'note') {
        material = (selectedNote?.content || '').trim()
      } else {
        const pdfNote = pdfNotes.find(n => n.id === pdfId)
        const url = await onGetSignedPdfUrl(pdfNote.pdfStoragePath)
        const res = await fetch(url)
        material = await extractPdfText(await res.arrayBuffer())
        if (material.length < 100) {
          setReason('No readable text found in this PDF — it may be a scanned document.')
          setStep('unsuitable')
          return
        }
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
    ['paste', 'Paste text'],
    ['note',  `Typed note${typedNotes.length ? '' : ' (none)'}`],
    ['pdf',   `PDF${pdfNotes.length ? '' : ' (none)'}`],
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
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-overlay)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {step === 'input' && (
            <>
              <div>
                <Label>Source material</Label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {SOURCES.map(([key, label]) => (
                    <button key={key} onClick={() => setSource(key)}
                      disabled={(key === 'note' && !typedNotes.length) || (key === 'pdf' && !pdfNotes.length)}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 7, border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                        background: source === key ? 'rgba(167,139,250,0.14)' : 'var(--bg-overlay)',
                        color: source === key ? 'var(--accent-purple)' : 'var(--text-secondary)',
                        outline: source === key ? '1.5px solid rgba(167,139,250,0.4)' : '1.5px solid transparent',
                        opacity: (key === 'note' && !typedNotes.length) || (key === 'pdf' && !pdfNotes.length) ? 0.4 : 1,
                        transition: 'all 0.12s',
                      }}>{label}</button>
                  ))}
                </div>
              </div>

              {source === 'paste' && (
                <div>
                  <Label>Material</Label>
                  <textarea
                    autoFocus value={pasteText} onChange={e => setPasteText(e.target.value)}
                    placeholder="Paste lecture notes, slides text, a textbook section…"
                    style={{ ...inputStyle, minHeight: 160, resize: 'vertical' }}
                    onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                  />
                  {pasteText.trim().length > 0 && pasteText.trim().length < 100 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Add a bit more material (at least ~100 characters).</div>
                  )}
                </div>
              )}

              {source === 'note' && (
                <div>
                  <Label>Typed note</Label>
                  <AppSelect value={noteId} onChange={setNoteId}>
                    <AppSelectItem value="">Pick a note</AppSelectItem>
                    {typedNotes.map(n => <AppSelectItem key={n.id} value={n.id}>{n.title || 'Untitled'}</AppSelectItem>)}
                  </AppSelect>
                </div>
              )}

              {source === 'pdf' && (
                <div>
                  <Label>PDF note</Label>
                  <AppSelect value={pdfId} onChange={setPdfId}>
                    <AppSelectItem value="">Pick a PDF</AppSelectItem>
                    {pdfNotes.map(n => <AppSelectItem key={n.id} value={n.id}>{n.title || 'Untitled'}</AppSelectItem>)}
                  </AppSelect>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Text-based PDFs only — scanned pages can't be read.</div>
                </div>
              )}

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
            </>
          )}

          {step === 'loading' && (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                style={{ display: 'inline-flex', marginBottom: 14 }}
              >
                <Sparkles size={28} style={{ color: 'var(--accent-purple)' }} />
              </motion.div>
              <p style={{ fontSize: 13, margin: 0 }}>Reading the material and writing cards…</p>
            </div>
          )}

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
                  <button onClick={() => setResult(i, { checked: !r.checked })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 9, color: r.checked ? 'var(--accent-purple)' : 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
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
              <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleGenerate} disabled={!canGenerate || (!fixedDeck && deckChoice === '__new__' && !newDeckTitle.trim())} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
                background: canGenerate ? 'var(--accent-purple)' : 'var(--border)',
                color: canGenerate ? '#fff' : 'var(--text-muted)',
                cursor: canGenerate ? 'pointer' : 'default', transition: 'all 0.15s', fontFamily: 'inherit',
              }}><Sparkles size={13} /> Generate</button>
            </>
          )}
          {step === 'unsuitable' && (
            <button onClick={() => setStep('input')} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Try different material</button>
          )}
          {step === 'review' && (
            <>
              <button onClick={() => setStep('input')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Back</button>
              <button onClick={handleSave} disabled={checkedCount === 0 || saving} style={{
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
      <button onClick={add} disabled={!canAdd} style={{
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
        <button onClick={e => { e.stopPropagation(); setConfirming(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', flexShrink: 0, display: 'flex' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          <Trash2 size={13} />
        </button>
      )}
      {confirming && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setConfirming(false)} style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={onDelete} style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
        </div>
      )}
    </div>
  )
}

// ─── Review mode ───────────────────────────────────────────────────────────────
function ReviewView({ deck, practice, onGrade, onExit }) {
  const [queue, setQueue] = useState(() => (practice ? deck.cards : deck.cards.filter(isDue)).map(c => c.id))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [graded, setGraded] = useState(0)

  const cardMap = Object.fromEntries(deck.cards.map(c => [c.id, c]))
  const card = index < queue.length ? cardMap[queue[index]] : null
  // Back face renders from this; only updated when revealing, so the grade flip-back
  // keeps showing the card you just saw instead of spoiling the next card's answer.
  const [backCard, setBackCard] = useState(null)

  const flip = () => {
    if (!flipped) setBackCard(card)
    setFlipped(v => !v)
  }

  const handleGrade = (grade) => {
    onGrade(deck.id, queue[index], grade)
    setGraded(n => n + 1)
    if (grade === 'again') setQueue(q => [...q, queue[index]])
    setFlipped(false)   // flips 180 → 0, landing on the next card's front
    setIndex(i => i + 1)
  }

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
  }, [card, flipped, index, queue])

  if (!card) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        <Layers size={36} style={{ marginBottom: 12, color: 'var(--accent-green)' }} />
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Review complete</p>
        <p style={{ fontSize: 13, margin: '6px 0 18px' }}>{graded} card{graded !== 1 ? 's' : ''} reviewed</p>
        <button onClick={onExit} style={{
          padding: '9px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600,
          background: 'var(--accent-blue)', color: 'var(--btn-primary-text)', cursor: 'pointer',
        }}>Back to deck</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
          {index + 1} / {queue.length}
        </span>
        <button onClick={onExit} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
          <X size={12} /> End review
        </button>
      </div>

      <div onClick={flip} style={{ perspective: 1600, cursor: 'pointer' }}>
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
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
                {isBack ? 'Back' : 'Front'}
              </span>
              <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {isBack ? (backCard?.back ?? '') : card.front}
              </div>
              {!isBack && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tap or press Space to reveal</span>}
            </div>
          ))}
        </motion.div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18, minHeight: 44 }}>
        {flipped && GRADES.map(g => (
          <button key={g.key} onClick={() => handleGrade(g.key)} style={{
            flex: 1, padding: '11px 4px', borderRadius: 10, border: `1.5px solid ${g.color}55`,
            background: `${g.color}18`, color: g.color, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            {g.label}
            <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, border: `1px solid ${g.color}66`, borderRadius: 4, padding: '1px 5px', lineHeight: 1.3 }}>{g.hotkey}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Deck card (list view) ─────────────────────────────────────────────────────
function DeckCard({ deck, domain, onOpen }) {
  const [hovered, setHovered] = useState(false)
  const dueCount = deck.cards.filter(isDue).length

  return (
    <div onClick={onOpen} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      background: 'var(--bg-surface)', border: `1px solid ${hovered ? 'var(--border-strong)' : 'var(--border)'}`,
      borderRadius: 14, padding: '18px 18px 16px', cursor: 'pointer',
      transition: 'border-color 0.12s, transform 0.12s',
      transform: hovered ? 'translateY(-2px)' : 'none',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>{deck.title}</span>
        <Layers size={15} style={{ color: domain ? domain.color : 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} />
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
        {dueCount > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-amber)' }}>{dueCount} due</span>
        )}
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
  if (openDeck) {
    const domain = openDeck.domainId ? domainMap[openDeck.domainId] : null
    const dueCount = openDeck.cards.filter(isDue).length

    return (
      <div style={{ padding: isMobile ? '22px 16px 28px' : '36px 40px', maxWidth: 860 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <button onClick={reviewing ? () => setReviewing(null) : closeDeck} style={{
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
            <>
              <button onClick={() => setEditingDeck(true)} style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-strong)',
                background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Pencil size={14} />
              </button>
              <button onClick={() => setShowGenerate(true)} title="Generate cards with AI" style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-strong)',
                background: 'var(--bg-surface)', color: 'var(--accent-purple)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Sparkles size={14} />
              </button>
              <button onClick={() => setReviewing('practice')} disabled={openDeck.cards.length === 0} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9,
                border: '1px solid var(--border-strong)', fontSize: 13, fontWeight: 600, flexShrink: 0,
                background: 'var(--bg-surface)',
                color: openDeck.cards.length > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                cursor: openDeck.cards.length > 0 ? 'pointer' : 'default', fontFamily: 'inherit',
              }}>
                <RotateCcw size={13} /> Practice
              </button>
              <button onClick={() => setReviewing('study')} disabled={dueCount === 0} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9,
                border: 'none', fontSize: 13, fontWeight: 600, flexShrink: 0,
                background: dueCount > 0 ? 'var(--accent-blue)' : 'var(--border)',
                color: dueCount > 0 ? 'var(--btn-primary-text)' : 'var(--text-muted)',
                cursor: dueCount > 0 ? 'pointer' : 'default',
                boxShadow: dueCount > 0 ? 'var(--glow-blue)' : 'none',
              }}>
                <Play size={13} /> Study
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, marginLeft: 40, flexWrap: 'wrap' }}>
          {domain && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: `${domain.color}18`, color: domain.color }}>
              {domain.code || domain.name}
            </span>
          )}
          <WeekBadge week={openDeck.academicWeek} />
          {openDeck.noteId && onOpenNote && (
            <button onClick={() => onOpenNote(openDeck.noteId)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent-purple)', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
              <FileText size={11} /> Open linked note
            </button>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {openDeck.cards.length} card{openDeck.cards.length !== 1 ? 's' : ''}{dueCount > 0 ? ` · ${dueCount} due` : ''}
          </span>
        </div>

        {reviewing ? (
          <ReviewView deck={openDeck} practice={reviewing === 'practice'} onGrade={onGradeCard} onExit={() => setReviewing(null)} />
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

  // ── Deck list ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: isMobile ? '22px 16px 28px' : '36px 40px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: isMobile ? 18 : 24, gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 30 : 40, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>Flashcards</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            {decks.length === 0 ? 'Create a deck to start' : totalDue === 0 ? 'All caught up' : `${totalDue} card${totalDue !== 1 ? 's' : ''} due for review`}
          </p>
        </div>
        <button data-tutorial-id="flashcards-new-btn" onClick={() => setShowNewDeck(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9,
          border: 'none', background: 'var(--accent-blue)', color: 'var(--btn-primary-text)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--glow-blue)',
        }}>
          <Plus size={14} /> New Deck
        </button>
      </div>

      {decks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <Layers size={36} style={{ marginBottom: 12, color: 'var(--border-strong)' }} />
          <p style={{ fontSize: 14, margin: 0 }}>No decks yet. Click <strong style={{ color: 'var(--accent-blue)' }}>New Deck</strong> to create one.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
            {decks.map(deck => (
              <DeckCard
                key={deck.id}
                deck={deck}
                domain={deck.domainId ? domainMap[deck.domainId] : null}
                onOpen={() => setOpenDeckId(deck.id)}
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
