import { useState, useMemo, useEffect, useRef } from 'react'
import AppSelect, { AppSelectItem } from '../components/AppSelect'
import {
  PenLine, Plus, Trash2, ChevronRight, ChevronDown,
  BookOpen, FolderOpen, Folder, Pencil, Check, X, MapPin, Type, FileText, Share2,
} from 'lucide-react'
import NoteCanvas from '../components/NoteCanvas'
import { totalTeachingWeeks } from '../utils/semester'
import { renderPdfToBackgrounds } from '../utils/pdf'

const TOTAL_WEEKS = totalTeachingWeeks()


function noteId() { return crypto.randomUUID() }
function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Folder tree ───────────────────────────────────────────────────────────────
function FolderItem({ label, count, active, depth = 0, onClick, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const hasChildren = !!children

  return (
    <div>
      <button
        onClick={() => { onClick?.(); if (hasChildren) setOpen(v => !v) }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          padding: `7px ${10 + depth * 14}px`, border: 'none', background: active ? 'var(--nav-active)' : 'transparent',
          color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
          cursor: 'pointer', textAlign: 'left', borderRadius: 7, fontSize: 13,
          fontWeight: active ? 600 : 400, transition: 'background 0.1s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--nav-hover)' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
      >
        {hasChildren
          ? (open ? <ChevronDown size={13} style={{ flexShrink: 0 }} /> : <ChevronRight size={13} style={{ flexShrink: 0 }} />)
          : <div style={{ width: 13, flexShrink: 0 }} />}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {count > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-overlay)', padding: '1px 6px', borderRadius: 10, flexShrink: 0 }}>
            {count}
          </span>
        )}
      </button>
      {open && children && <div>{children}</div>}
    </div>
  )
}

// ─── New note type picker ──────────────────────────────────────────────────────
function NewNoteTypePicker({ onSelect, onSelectPdf, onClose }) {
  const ref = useRef()
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const optBtn = {
    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', border: 'none', background: 'none',
    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
    textAlign: 'left', transition: 'background 0.1s, color 0.1s',
  }

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 300,
      background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
      borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow-modal)',
      minWidth: 170,
    }}>
      <button
        style={optBtn}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--accent-purple)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        onClick={() => { onSelect('handwritten'); onClose() }}
      >
        <PenLine size={14} color="var(--accent-purple)" /> Handwritten
      </button>
      <div style={{ height: 1, background: 'var(--border)' }} />
      <button
        style={optBtn}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--accent-blue)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        onClick={() => { onSelect('typed'); onClose() }}
      >
        <Type size={14} color="var(--accent-blue)" /> Typed
      </button>
      <div style={{ height: 1, background: 'var(--border)' }} />
      <button
        style={optBtn}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = '#f97316' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        onClick={() => { onSelectPdf(); onClose() }}
      >
        <FileText size={14} color="#f97316" /> From PDF
      </button>
    </div>
  )
}

// ─── Typed note editor ────────────────────────────────────────────────────────
function TypedEditor({ note, onUpdate }) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg-page)' }}>
      <textarea
        value={note.content || ''}
        onChange={e => onUpdate({ content: e.target.value })}
        placeholder="Start typing your note…"
        autoFocus
        style={{
          display: 'block', width: '100%', minHeight: '100%',
          border: 'none', outline: 'none', resize: 'none',
          background: 'transparent', color: 'var(--text-primary)',
          fontSize: 15, lineHeight: 1.85, padding: '40px 80px',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// ─── Note card in grid ─────────────────────────────────────────────────────────
function NoteCard({ note, domain, onClick, onDelete }) {
  const [hovered,    setHovered]    = useState(false)
  const [confirming, setConfirming] = useState(false)
  const isTyped  = note.type === 'typed'
  const isPdf    = note.type === 'pdf'
  const preview  = isTyped ? (note.content || '').trim().slice(0, 120) : null
  const pagesCnt = (note.pages || []).length

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '16px 18px', cursor: 'pointer',
        transition: 'border-color 0.12s, box-shadow 0.12s',
        borderColor: hovered ? 'var(--border-strong)' : 'var(--border)',
        boxShadow: hovered ? 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.3))' : 'none',
        position: 'relative',
      }}
    >
      {confirming ? (
        <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
          <button onClick={() => setConfirming(false)} style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
        </div>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); setConfirming(true) }}
          style={{
            position: 'absolute', top: 10, right: 10, background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4,
            borderRadius: 5, opacity: hovered ? 1 : 0, transition: 'opacity 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Trash2 size={13} />
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isTyped ? <Type size={14} color="var(--accent-blue)" />
           : isPdf  ? <FileText size={14} color="#f97316" />
           : <PenLine size={14} color="var(--accent-purple)" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {note.title || 'Untitled Note'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {domain && (
          <span style={{ fontSize: 10, fontWeight: 700, color: domain.color, background: `${domain.color}18`, padding: '2px 6px', borderRadius: 4 }}>
            {domain.code}
          </span>
        )}
        {note.academicWeek && (
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent-purple)', background: 'rgba(167,139,250,0.12)', padding: '2px 6px', borderRadius: 4 }}>
            W{note.academicWeek}
          </span>
        )}
      </div>

      {preview && (
        <div style={{
          fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8,
          lineHeight: 1.55, overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {preview}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {fmt(note.updatedAt)} · {isTyped
          ? `${(note.content || '').length} chars`
          : isPdf
          ? `${pagesCnt} page${pagesCnt !== 1 ? 's' : ''} · PDF`
          : `${pagesCnt} page${pagesCnt !== 1 ? 's' : ''}`}
      </div>
    </div>
  )
}

// ─── Inline title editor ───────────────────────────────────────────────────────
function NoteTitle({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef()

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function commit() {
    setEditing(false)
    if (draft.trim()) onChange(draft.trim())
    else setDraft(value)
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setDraft(value) } }}
          style={{
            fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
            background: 'var(--bg-input)', border: '1px solid var(--accent-blue)',
            borderRadius: 7, padding: '4px 10px', outline: 'none', width: 280,
          }}
        />
        <button onClick={commit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-green)', display: 'flex' }}>
          <Check size={15} />
        </button>
        <button onClick={() => { setEditing(false); setDraft(value) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
          <X size={15} />
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'text' }} onClick={() => setEditing(true)}>
      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{value || 'Untitled Note'}</span>
      <Pencil size={13} color="var(--text-muted)" />
    </div>
  )
}

// ─── Location picker ──────────────────────────────────────────────────────────
function NoteLocationPicker({ note, domains, onSave }) {
  const [open, setOpen] = useState(false)
  const [domainId, setDomainId] = useState(note.domainId || '')
  const [week, setWeek] = useState(note.academicWeek ? String(note.academicWeek) : '')
  const ref = useRef()

  // Sync when note changes (e.g. navigating between notes)
  useEffect(() => {
    setDomainId(note.domainId || '')
    setWeek(note.academicWeek ? String(note.academicWeek) : '')
  }, [note.id])

  const allDomains = domains || []
  const pickedDomain = allDomains.find(d => d.id === domainId)
  const isAcademic = pickedDomain?.category === 'academic'

  function apply() {
    onSave({
      domainId: domainId || null,
      academicWeek: (isAcademic && week) ? Number(week) : null,
    })
    setOpen(false)
  }

  // Label shown on the trigger button
  const label = note.domainId
    ? `${allDomains.find(d => d.id === note.domainId)?.code || note.domainId}${note.academicWeek ? ` · W${note.academicWeek}` : ''}`
    : 'General'

  const triggerColor = note.domainId
    ? (allDomains.find(d => d.id === note.domainId)?.color || 'var(--text-secondary)')
    : 'var(--text-muted)'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
          borderRadius: 7, border: '1px solid var(--border-strong)', background: 'none',
          color: triggerColor, cursor: 'pointer', fontSize: 11, fontWeight: 600,
          transition: 'border-color 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = triggerColor}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
      >
        <MapPin size={11} /> {label} <ChevronDown size={11} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 900 }} />

          {/* Popover */}
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 901,
            background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
            borderRadius: 12, padding: '14px 16px', width: 260,
            boxShadow: 'var(--shadow-modal)',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Move note to…
            </div>

            {/* Domain selector */}
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Domain</label>
              <AppSelect
                value={domainId}
                onChange={v => { setDomainId(v); setWeek('') }}
                style={{ padding: '7px 10px', fontSize: 12 }}
              >
                <AppSelectItem value="">No domain</AppSelectItem>
                {allDomains.map(d => (
                  <AppSelectItem key={d.id} value={d.id}>{d.code}: {d.name}</AppSelectItem>
                ))}
              </AppSelect>
            </div>

            {/* Week selector — only for academic domains */}
            {isAcademic && (
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Academic Week (optional)</label>
                <AppSelect
                  value={week}
                  onChange={v => setWeek(v)}
                  style={{ padding: '7px 10px', fontSize: 12 }}
                >
                  <AppSelectItem value="">No specific week</AppSelectItem>
                  {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => (
                    <AppSelectItem key={w} value={String(w)}>Week {w}</AppSelectItem>
                  ))}
                </AppSelect>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setOpen(false)}
                style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}
              >
                Cancel
              </button>
              <button
                onClick={apply}
                style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: 'var(--accent-blue)', color: 'var(--btn-primary-text)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                Move
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function NotesPage({ notes, domains, noteToOpen, onClearNoteToOpen, onAddNote, onUpdateNote, onDeleteNote, onSaveNote, onAddPdfNote, onGetSignedPdfUrl }) {
  const [selectedFolder,  setSelectedFolder]  = useState({ type: 'all' })
  const [openNoteId,      setOpenNoteId]      = useState(null)
  const [confirmDelNote,  setConfirmDelNote]  = useState(false)
  const [saveState,       setSaveState]       = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [saveError,       setSaveError]       = useState('')
  const [sidebarPicker,   setSidebarPicker]   = useState(false)
  const [mainPicker,      setMainPicker]      = useState(false)
  const [pdfBackgrounds,  setPdfBackgrounds]  = useState({}) // { [noteId]: string[] }
  const [isLoadingPdf,    setIsLoadingPdf]    = useState(false)
  const [pdfError,        setPdfError]        = useState('')
  const [sharing,          setSharing]          = useState(false)
  const pdfInputRef        = useRef()
  const pendingPdfMeta     = useRef({})
  const autoSaveTimerRef   = useRef(null)
  const openNoteBaseline   = useRef(null)
  const canvasRef          = useRef()


  async function handleSave(noteId) {
    setSaveState('saving')
    setSaveError('')
    try {
      const savedAt = await onSaveNote(noteId)
      if (openNoteBaseline.current?.id === noteId && savedAt) {
        openNoteBaseline.current = { id: noteId, updatedAt: savedAt }
      }
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch (err) {
      const msg = err?.message || err?.details || err?.error_description || String(err) || 'Unknown error'
      setSaveError(msg)
      setSaveState('error')
      setTimeout(() => { setSaveState('idle'); setSaveError('') }, 10000)
    }
  }

  async function handleShare() {
    if (!openNote || sharing) return
    setSharing(true)
    try {
      if (openNote.type === 'typed') {
        const file = new File([openNote.content || ''], `${openNote.title || 'Note'}.txt`, { type: 'text/plain' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: openNote.title })
        } else {
          const url = URL.createObjectURL(file)
          Object.assign(document.createElement('a'), { href: url, download: file.name }).click()
          URL.revokeObjectURL(url)
        }
      } else if (openNote.type === 'pdf' && openNote.pdfStoragePath) {
        const signedUrl = await onGetSignedPdfUrl(openNote.pdfStoragePath)
        if (signedUrl) {
          const res = await fetch(signedUrl)
          const blob = await res.blob()
          const file = new File([blob], `${openNote.title || 'Note'}.pdf`, { type: 'application/pdf' })
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: openNote.title })
          } else {
            const url = URL.createObjectURL(file)
            Object.assign(document.createElement('a'), { href: url, download: file.name }).click()
            URL.revokeObjectURL(url)
          }
        }
      } else if (openNote.type === 'handwritten' && canvasRef.current) {
        const pdfBlob = await canvasRef.current.exportAsPdf()
        if (pdfBlob) {
          const file = new File([pdfBlob], `${openNote.title || 'Note'}.pdf`, { type: 'application/pdf' })
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: openNote.title })
          } else {
            const url = URL.createObjectURL(file)
            Object.assign(document.createElement('a'), { href: url, download: file.name }).click()
            URL.revokeObjectURL(url)
          }
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') console.error('Share failed:', e)
    } finally {
      setSharing(false)
    }
  }

  useEffect(() => {
    if (noteToOpen) {
      setOpenNoteId(noteToOpen)
      onClearNoteToOpen?.()
    }
  }, [noteToOpen])

  const openNote = (notes || []).find(n => n.id === openNoteId)

  // Store baseline updatedAt when a note is opened so we know if it has been edited
  useEffect(() => {
    clearTimeout(autoSaveTimerRef.current)
    setSaveState('idle')
    setSaveError('')
    if (openNote) {
      openNoteBaseline.current = { id: openNote.id, updatedAt: openNote.updatedAt }
    } else {
      openNoteBaseline.current = null
    }
  }, [openNoteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced autosave — fires 3s after any content change
  useEffect(() => {
    if (!openNote) return
    const baseline = openNoteBaseline.current
    if (!baseline || baseline.id !== openNote.id || openNote.updatedAt === baseline.updatedAt) return
    clearTimeout(autoSaveTimerRef.current)
    setSaveState('idle')
    autoSaveTimerRef.current = setTimeout(() => handleSave(openNote.id), 3000)
    return () => clearTimeout(autoSaveTimerRef.current)
  }, [openNote?.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load PDF backgrounds when switching to a PDF note that hasn't been rendered yet
  useEffect(() => {
    if (!openNote || openNote.type !== 'pdf' || !openNote.pdfStoragePath) return
    if (pdfBackgrounds[openNote.id]) return
    if (!onGetSignedPdfUrl) return
    let cancelled = false
    setIsLoadingPdf(true)
    onGetSignedPdfUrl(openNote.pdfStoragePath)
      .then(url => fetch(url))
      .then(r => r.arrayBuffer())
      .then(buf => renderPdfToBackgrounds(buf))
      .then(bgs => {
        if (!cancelled) setPdfBackgrounds(prev => ({ ...prev, [openNote.id]: bgs }))
      })
      .catch(err => console.error('PDF load failed:', err))
      .finally(() => { if (!cancelled) setIsLoadingPdf(false) })
    return () => { cancelled = true }
  }, [openNote?.id])

  const hiddenDomainIds = useMemo(() => {
    const s = new Set()
    ;(domains || []).forEach(d => {
      if (localStorage.getItem(`showLinked:${d.id}`) === 'false') s.add(d.id)
    })
    return s
  }, [domains])

  const academicDomains = useMemo(
    () => (domains || []).filter(d => d.category === 'academic' && !d.isPast && !hiddenDomainIds.has(d.id)),
    [domains, hiddenDomainIds]
  )

  const domainMap = useMemo(() => {
    const m = {}
    ;(domains || []).forEach(d => { m[d.id] = d })
    return m
  }, [domains])

  const visibleNotes = useMemo(
    () => (notes || []).filter(n => !n.domainId || !hiddenDomainIds.has(n.domainId)),
    [notes, hiddenDomainIds]
  )

  function countFor(predicate) { return visibleNotes.filter(predicate).length }

  const folderNotes = useMemo(() => {
    const f = selectedFolder
    return visibleNotes.filter(n => {
      if (f.type === 'all')          return true
      if (f.type === 'general')      return !n.domainId
      if (f.type === 'domain')       return n.domainId === f.domainId
      if (f.type === 'domain-unweek') return n.domainId === f.domainId && !n.academicWeek
      if (f.type === 'week')         return n.domainId === f.domainId && n.academicWeek === f.week
      return true
    }).sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
  }, [visibleNotes, selectedFolder])

  function closeNote() {
    clearTimeout(autoSaveTimerRef.current)
    const baseline = openNoteBaseline.current
    if (openNote && baseline && openNote.updatedAt !== baseline.updatedAt) {
      handleSave(openNote.id) // fire-and-forget background save
    }
    setOpenNoteId(null)
  }

  function selectFolder(f) {
    setSelectedFolder(f)
    closeNote()
  }

  function createNote(meta = {}, type = 'handwritten') {
    const id = noteId()
    onAddNote({
      id, title: 'Untitled Note', type, content: '',
      pages: type === 'handwritten' ? [{ id: `page-${Date.now()}`, strokes: [] }] : [],
      template: type === 'handwritten' ? 'lined' : 'blank', bgColor: '#f8f7f2', lineSpacing: type === 'handwritten' ? 48 : 32, orientation: 'portrait',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      domainId: meta.domainId || null,
      academicWeek: meta.academicWeek || null,
      eventId: null, studySessionId: null,
    })
    setOpenNoteId(id)
  }

  function handleNewNote(type = 'handwritten') {
    const f = selectedFolder
    const meta =
      f.type === 'general' ? {} :
      f.type === 'domain'  ? { domainId: f.domainId } :
      f.type === 'week'    ? { domainId: f.domainId, academicWeek: f.week } : {}
    createNote(meta, type)
  }

  function triggerPdfPicker() {
    const f = selectedFolder
    pendingPdfMeta.current =
      f.type === 'general' ? {} :
      f.type === 'domain'  ? { domainId: f.domainId } :
      f.type === 'week'    ? { domainId: f.domainId, academicWeek: f.week } : {}
    pdfInputRef.current?.click()
  }

  async function handlePdfFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setIsLoadingPdf(true)
    setPdfError('')
    try {
      const backgrounds = await renderPdfToBackgrounds(file)
      const id = noteId()
      setPdfBackgrounds(prev => ({ ...prev, [id]: backgrounds }))
      await onAddPdfNote(id, file, pendingPdfMeta.current, backgrounds.length)
      setOpenNoteId(id)
    } catch (err) {
      const msg = err?.message || err?.error || String(err) || 'Unknown error'
      setPdfError(msg)
      setTimeout(() => setPdfError(''), 15000)
    } finally {
      setIsLoadingPdf(false)
    }
  }

  // Weeks that have notes, per domain
  function weeksForDomain(domainId) {
    const weeks = new Set(
      visibleNotes.filter(n => n.domainId === domainId && n.academicWeek).map(n => n.academicWeek)
    )
    return [...weeks].sort((a, b) => a - b)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ position: 'fixed', top: -1000, left: -1000, opacity: 0, width: 1, height: 1 }}
        onChange={handlePdfFileSelected}
      />
      {isLoadingPdf && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.12)', borderTopColor: '#f97316', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Processing PDF…</span>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {pdfError && (
        <div
          onClick={() => setPdfError('')}
          style={{
            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 2001, maxWidth: 480, width: 'calc(100% - 40px)',
            background: 'rgba(251,113,133,0.15)', border: '1px solid rgba(251,113,133,0.5)',
            borderRadius: 12, padding: '14px 18px',
            display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fb7185' }}>PDF import failed</span>
          <span style={{ fontSize: 12, color: 'rgba(251,113,133,0.85)', wordBreak: 'break-all', lineHeight: 1.5 }}>{pdfError}</span>
          <span style={{ fontSize: 11, color: 'rgba(251,113,133,0.5)' }}>Tap to dismiss</span>
        </div>
      )}

      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
        background: 'linear-gradient(to right, var(--bg-elevated) 0%, var(--bg-overlay) 60%, var(--bg-hover) 100%)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 10px 10px', position: 'relative' }}>
          <button
            data-tutorial-id="notes-new-btn"
            onClick={() => setSidebarPicker(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 12px', borderRadius: 8, border: 'none',
              background: 'var(--accent-blue)', color: 'var(--btn-primary-text)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              transition: 'opacity 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Plus size={15} /> New Note
          </button>
          {sidebarPicker && (
            <NewNoteTypePicker
              onSelect={type => { handleNewNote(type); setSidebarPicker(false) }}
              onSelectPdf={() => { triggerPdfPicker(); setSidebarPicker(false) }}
              onClose={() => setSidebarPicker(false)}
            />
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 16px' }}>
          <FolderItem
            label="All Notes"
            count={(notes || []).length}
            active={selectedFolder.type === 'all'}
            onClick={() => selectFolder({ type: 'all' })}
          />

          <div style={{ margin: '12px 2px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.7px', textTransform: 'uppercase' }}>
            Academic
          </div>

          {academicDomains.map(d => {
            const domainCount = countFor(n => n.domainId === d.id)
            const weeks = weeksForDomain(d.id)
            return (
              <FolderItem
                key={d.id}
                label={d.code}
                count={domainCount}
                active={selectedFolder.type === 'domain' && selectedFolder.domainId === d.id}
                onClick={() => selectFolder({ type: 'domain', domainId: d.id })}
                defaultOpen={false}
              >
                {weeks.map(w => (
                  <FolderItem
                    key={w}
                    label={`Week ${w}`}
                    count={countFor(n => n.domainId === d.id && n.academicWeek === w)}
                    active={selectedFolder.type === 'week' && selectedFolder.domainId === d.id && selectedFolder.week === w}
                    onClick={() => selectFolder({ type: 'week', domainId: d.id, week: w })}
                    depth={1}
                  />
                ))}
                <FolderItem
                  label="No week"
                  count={countFor(n => n.domainId === d.id && !n.academicWeek)}
                  active={selectedFolder.type === 'domain-unweek' && selectedFolder.domainId === d.id}
                  onClick={() => selectFolder({ type: 'domain-unweek', domainId: d.id })}
                  depth={1}
                />
              </FolderItem>
            )
          })}

          <div style={{ margin: '12px 2px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.7px', textTransform: 'uppercase' }}>
            General
          </div>

          <FolderItem
            label="General Notes"
            count={countFor(n => !n.domainId)}
            active={selectedFolder.type === 'general'}
            onClick={() => selectFolder({ type: 'general' })}
          />
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {openNote ? (
          // ── Note editor ──
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px',
              borderBottom: '1px solid var(--border)', flexShrink: 0,
              background: 'var(--bg-surface)',
            }}>
              <button
                onClick={closeNote}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 4, borderRadius: 6 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <X size={16} />
              </button>

              <NoteTitle
                value={openNote.title}
                onChange={title => onUpdateNote(openNote.id, { title })}
              />

              <div style={{ flex: 1 }} />

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <NoteLocationPicker
                  note={openNote}
                  domains={domains}
                  onSave={updates => onUpdateNote(openNote.id, updates)}
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {fmt(openNote.updatedAt)}
                </span>
                <span style={{
                  fontSize: 11, minWidth: 52,
                  color: saveState === 'saved' ? 'var(--accent-green)' : saveState === 'error' ? 'var(--accent-red)' : 'var(--text-muted)',
                  transition: 'color 0.2s',
                }}>
                  {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? <><Check size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />Saved</> : saveState === 'error' ? 'Save failed' : ''}
                </span>
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'none', color: sharing ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: sharing ? 'default' : 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                  onMouseEnter={e => { if (!sharing) e.currentTarget.style.color = 'var(--accent-blue)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = sharing ? 'var(--text-muted)' : 'var(--text-secondary)' }}
                >
                  <Share2 size={12} /> {sharing ? 'Exporting…' : 'Share'}
                </button>
                {confirmDelNote ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setConfirmDelNote(false)} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button onClick={() => { clearTimeout(autoSaveTimerRef.current); onDeleteNote(openNote.id); setOpenNoteId(null); setConfirmDelNote(false) }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(251,113,133,0.4)', background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelNote(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 12 }}>
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            </div>

            {saveState === 'error' && saveError && (
              <div style={{
                padding: '10px 24px', flexShrink: 0,
                background: 'rgba(251,113,133,0.1)', borderBottom: '1px solid rgba(251,113,133,0.25)',
                fontSize: 12, color: 'var(--accent-red)', lineHeight: 1.5,
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <X size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                <span><strong>Save failed:</strong> {saveError}</span>
              </div>
            )}

            <div style={{ flex: 1, overflow: 'hidden' }}>
              {openNote.type === 'typed' ? (
                <TypedEditor
                  note={openNote}
                  onUpdate={updates => onUpdateNote(openNote.id, updates)}
                />
              ) : (
                <NoteCanvas
                  ref={canvasRef}
                  pages={openNote.pages || [{ id: 'page-legacy', strokes: [] }]}
                  onPagesChange={pages => onUpdateNote(openNote.id, { pages })}
                  template={openNote.template || 'blank'}
                  bgColor={openNote.bgColor || '#f8f7f2'}
                  lineSpacing={openNote.lineSpacing || 32}
                  orientation={openNote.orientation || 'portrait'}
                  onSettingsChange={s => onUpdateNote(openNote.id, s)}
                  pageBackgrounds={pdfBackgrounds[openNote.id]}
                  isPdfNote={openNote.type === 'pdf'}
                />
              )}
            </div>
          </div>
        ) : (
          // ── Note grid ──
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedFolder.type === 'all'     ? 'All Notes'
                  : selectedFolder.type === 'general' ? 'General Notes'
                  : selectedFolder.type === 'week'    ? `${domainMap[selectedFolder.domainId]?.code} Week ${selectedFolder.week}`
                  : selectedFolder.type === 'domain'  ? domainMap[selectedFolder.domainId]?.name
                  : 'Notes'}
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  {folderNotes.length} note{folderNotes.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setMainPicker(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                    borderRadius: 8, border: 'none', background: 'var(--accent-blue)',
                    color: 'var(--btn-primary-text)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}
                >
                  <Plus size={14} /> New Note
                </button>
                {mainPicker && (
                  <NewNoteTypePicker
                    onSelect={type => { handleNewNote(type); setMainPicker(false) }}
                    onSelectPdf={() => { triggerPdfPicker(); setMainPicker(false) }}
                    onClose={() => setMainPicker(false)}
                  />
                )}
              </div>
            </div>

            {folderNotes.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '80px 0', color: 'var(--text-muted)', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PenLine size={28} color="var(--border-strong)" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>No notes here yet</p>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Click New Note to start writing</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                {folderNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    domain={note.domainId ? domainMap[note.domainId] : null}
                    onClick={() => setOpenNoteId(note.id)}
                    onDelete={() => onDeleteNote(note.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
