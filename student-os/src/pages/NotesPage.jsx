import { useState, useMemo, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import AppSelect, { AppSelectItem } from '../components/AppSelect'
import {
  PenLine, Plus, Trash2, ChevronRight, ChevronDown,
  Pencil, Check, X, MapPin, Type, FileText, Share2, Eye, Maximize2, Minimize2, FolderOpen,
  ArrowUpDown, ListFilter, ChevronUp,
} from 'lucide-react'
import NoteCanvas from '../components/NoteCanvas'
import { totalTeachingWeeks } from '../utils/semester'
import { renderPdfToBackgrounds } from '../utils/pdf'
import { useIsMobile } from '../utils/useIsMobile'
import NewNoteModal from '../components/NewNoteModal'

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

const MD_COMPONENTS = {
  h1: ({ children }) => <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: '28px 0 12px', color: 'var(--text-primary)', lineHeight: 1.25, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px', margin: '24px 0 10px', color: 'var(--text-primary)', lineHeight: 1.3, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: 16, fontWeight: 700, margin: '18px 0 8px', color: 'var(--text-primary)' }}>{children}</h3>,
  h4: ({ children }) => <h4 style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 6px', color: 'var(--text-secondary)' }}>{children}</h4>,
  p: ({ children }) => <p style={{ fontSize: 15, lineHeight: 1.85, margin: '0 0 12px', color: 'var(--text-primary)' }}>{children}</p>,
  code: ({ className, children }) => {
    if (className) {
      return <code style={{ fontFamily: '"SF Mono","Fira Code","Cascadia Code",monospace', fontSize: 13, display: 'block', lineHeight: 1.7, color: 'var(--text-primary)' }}>{children}</code>
    }
    return <code style={{ fontFamily: '"SF Mono","Fira Code",monospace', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4, fontSize: '0.88em', color: 'var(--accent-blue)', border: '1px solid var(--border)' }}>{children}</code>
  },
  pre: ({ children }) => <pre style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '16px 20px', overflowX: 'auto', margin: '0 0 16px', border: '1px solid var(--border)' }}>{children}</pre>,
  blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid var(--border-strong)', paddingLeft: 16, margin: '0 0 14px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{children}</blockquote>,
  table: ({ children }) => <div style={{ overflowX: 'auto', marginBottom: 16 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>{children}</table></div>,
  th: ({ children }) => <th style={{ border: '1px solid var(--border)', padding: '8px 12px', textAlign: 'left', background: 'var(--bg-elevated)', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{children}</th>,
  td: ({ children }) => <td style={{ border: '1px solid var(--border)', padding: '8px 12px', verticalAlign: 'top', color: 'var(--text-primary)', lineHeight: 1.6 }}>{children}</td>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'underline', textUnderlineOffset: 3 }}>{children}</a>,
  ul: ({ children }) => <ul style={{ paddingLeft: 24, margin: '0 0 12px', color: 'var(--text-primary)' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 24, margin: '0 0 12px', color: 'var(--text-primary)' }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 4, lineHeight: 1.7, fontSize: 15 }}>{children}</li>,
  strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
  del: ({ children }) => <del style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{children}</del>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '24px 0' }} />,
  img: ({ src, alt }) => <img src={src} alt={alt || ''} style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 12 }} />,
}

const SLASH_COMMANDS = [
  { id: 'h1',      badge: 'H1',   label: 'Heading 1',     desc: 'Large section heading',     insert: '# '          },
  { id: 'h2',      badge: 'H2',   label: 'Heading 2',     desc: 'Medium section heading',    insert: '## '         },
  { id: 'h3',      badge: 'H3',   label: 'Heading 3',     desc: 'Small section heading',     insert: '### '        },
  { id: 'bullet',  badge: '•',    label: 'Bullet List',   desc: 'Unordered list item',       insert: '- '          },
  { id: 'num',     badge: '1.',   label: 'Numbered List', desc: 'Ordered list item',         insert: '1. '         },
  { id: 'quote',   badge: '>',    label: 'Quote',         desc: 'Block quote',               insert: '> '          },
  { id: 'code',    badge: '</>',  label: 'Code Block',    desc: 'Fenced code block',         insert: '```\n\n```', cursorAt: 4   },
  { id: 'math',    badge: '$$',   label: 'Math Block',    desc: 'Display equation (LaTeX)',   insert: '$$\n\n$$',   cursorAt: 3   },
  { id: 'imath',   badge: '$',    label: 'Inline Math',   desc: 'Inline LaTeX: $x^2$',       insert: '$x$',        cursorAt: 1, selectLen: 1 },
  { id: 'table',   badge: '⊞',    label: 'Table',         desc: '3-column markdown table',   insert: '| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n| | | |' },
  { id: 'divider', badge: '---',  label: 'Divider',       desc: 'Horizontal rule',           insert: '---'         },
  { id: 'bold',    badge: '**',   label: 'Bold',          desc: 'Bold text **...**',         insert: '****',       cursorAt: 2   },
  { id: 'italic',  badge: '*',    label: 'Italic',        desc: 'Italic text *...*',         insert: '**',         cursorAt: 1   },
]

function getSlashTrigger(value, cursorPos) {
  for (let i = cursorPos - 1; i >= 0; i--) {
    if (value[i] === '\n') return null
    if (value[i] === '/') {
      if (i === 0 || value[i - 1] === '\n') {
        return { slashPos: i, query: value.slice(i + 1, cursorPos).toLowerCase() }
      }
      return null
    }
  }
  return null
}

function slashMenuPos(textarea, slashPos) {
  const lh = parseFloat(window.getComputedStyle(textarea).lineHeight) || 28
  const lineNum = (textarea.value.slice(0, slashPos).match(/\n/g) || []).length
  const rect = textarea.getBoundingClientRect()
  const rawTop = rect.top + 40 + lineNum * lh - textarea.scrollTop + lh + 6
  return { top: Math.min(rawTop, window.innerHeight - 310), left: Math.max(rect.left + 80, 10) }
}

// ─── Typed note editor ────────────────────────────────────────────────────────
function TypedEditor({ note, onUpdate, viewMode, zoom = 1, onZoomChange }) {
  const taRef        = useRef()
  const containerRef = useRef()
  const pendingCursor = useRef(null)
  const onZoomChangeRef = useRef(onZoomChange)
  useEffect(() => { onZoomChangeRef.current = onZoomChange }, [onZoomChange])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let lastDist = null
    function onTouchStart(e) {
      lastDist = e.touches.length === 2
        ? Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY)
        : null
    }
    function onTouchMove(e) {
      if (e.touches.length !== 2 || lastDist === null) return
      const newDist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY)
      if (Math.abs(newDist - lastDist) > 5) {
        e.preventDefault()
        onZoomChangeRef.current?.(newDist / lastDist)
        lastDist = newDist
      }
    }
    function onTouchEnd(e) { if (e.touches.length < 2) lastDist = null }
    function onWheel(e) {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const sf = e.deltaY < 0 ? 1.08 : 1 / 1.08
      onZoomChangeRef.current?.(sf)
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  const [slash, setSlash] = useState({ open: false, query: '', slashPos: -1, selected: 0, pos: { top: 0, left: 0 } })

  const matches = useMemo(() => {
    if (!slash.open) return []
    if (!slash.query) return SLASH_COMMANDS
    const q = slash.query
    return SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(q) || c.id.includes(q))
  }, [slash.open, slash.query])

  // Apply pending cursor after React syncs the controlled value
  useEffect(() => {
    if (pendingCursor.current === null || !taRef.current) return
    const { pos, selectLen } = pendingCursor.current
    pendingCursor.current = null
    taRef.current.focus()
    taRef.current.setSelectionRange(pos, pos + (selectLen || 0))
  }, [note.content])

  function applyCmd(cmd) {
    const ta = taRef.current
    if (!ta) return
    const before = ta.value.slice(0, slash.slashPos)
    const after = ta.value.slice(ta.selectionStart)
    const newVal = before + cmd.insert + after
    const newCursor = slash.slashPos + (cmd.cursorAt !== undefined ? cmd.cursorAt : cmd.insert.length)
    pendingCursor.current = { pos: newCursor, selectLen: cmd.selectLen || 0 }
    onUpdate({ content: newVal })
    setSlash(s => ({ ...s, open: false }))
  }

  function onChange(e) {
    onUpdate({ content: e.target.value })
    const info = getSlashTrigger(e.target.value, e.target.selectionStart)
    if (info) {
      setSlash({ open: true, query: info.query, slashPos: info.slashPos, selected: 0, pos: slashMenuPos(e.target, info.slashPos) })
    } else if (slash.open) {
      setSlash(s => ({ ...s, open: false }))
    }
  }

  function onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
      e.preventDefault(); onZoomChangeRef.current?.(1.1); return
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      e.preventDefault(); onZoomChangeRef.current?.(1 / 1.1); return
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault(); onZoomChangeRef.current?.(null); return
    }
    if (!slash.open || !matches.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSlash(s => ({ ...s, selected: Math.min(s.selected + 1, matches.length - 1) })) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSlash(s => ({ ...s, selected: Math.max(s.selected - 1, 0) })) }
    else if (e.key === 'Enter') { e.preventDefault(); applyCmd(matches[slash.selected]) }
    else if (e.key === 'Escape') { e.preventDefault(); setSlash(s => ({ ...s, open: false })) }
  }

  if (viewMode === 'preview') {
    return (
      <div ref={containerRef} style={{ height: '100%', overflowY: 'auto', background: 'var(--bg-page)' }}>
        <div style={{ zoom }}>
          <div style={{ padding: '40px 80px', maxWidth: 860, boxSizing: 'border-box', fontSize: 15, letterSpacing: '0.3px' }}>
            {note.content
              ? <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={MD_COMPONENTS}>{note.content}</ReactMarkdown>
              : <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 15, margin: 0 }}>Nothing to preview yet.</p>
            }
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ height: '100%', overflowY: 'auto', background: 'var(--bg-page)' }}>
      <div style={{ zoom }}>
        <textarea
          ref={taRef}
          value={note.content || ''}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Type your note… use / at the start of a line for commands"
          autoFocus
          style={{
            display: 'block', width: '100%',
            border: 'none', outline: 'none', resize: 'none',
            background: 'transparent', color: 'var(--text-primary)',
            fontSize: 15, lineHeight: 1.85, padding: '40px 80px 160px',
            letterSpacing: '0.3px',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
            boxSizing: 'border-box',
          }}
        />
      </div>
      {slash.open && matches.length > 0 && (
        <div style={{
          position: 'fixed', top: slash.pos.top, left: slash.pos.left,
          zIndex: 1100, background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)', borderRadius: 12,
          overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          width: 260, maxHeight: 300, overflowY: 'auto',
        }}>
          {matches.map((cmd, i) => (
            <button
              key={cmd.id}
              onMouseDown={e => { e.preventDefault(); applyCmd(cmd) }}
              onMouseEnter={() => setSlash(s => ({ ...s, selected: i }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '8px 12px', border: 'none',
                background: i === slash.selected ? 'var(--bg-hover)' : 'transparent',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}
            >
              <span style={{
                fontSize: 10, fontWeight: 800, color: 'var(--text-muted)',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '2px 5px', minWidth: 26, textAlign: 'center',
                fontFamily: 'monospace', flexShrink: 0,
              }}>{cmd.badge}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{cmd.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cmd.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Note card in grid ─────────────────────────────────────────────────────────
function NoteCard({ note, domain, onClick, onDelete }) {
  const [hovered,    setHovered]    = useState(false)
  const [confirming, setConfirming] = useState(false)
  const isTyped  = note.type === 'typed'
  const isPdf    = note.type === 'pdf'
  const preview  = isTyped ? (note.content || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim().slice(0, 120) : null
  const pagesCnt = (note.pages || []).length

  const typeAccent      = isTyped ? '#5b8cff' : isPdf ? '#f97316' : '#a78bfa'
  const typeTint        = isTyped ? 'rgba(91,140,255,0.07)' : isPdf ? 'rgba(249,115,22,0.07)' : 'rgba(167,139,250,0.07)'
  const typeIconBg      = isTyped ? 'rgba(91,140,255,0.14)' : isPdf ? 'rgba(249,115,22,0.14)' : 'rgba(167,139,250,0.14)'
  const typeHoverBorder = isTyped ? 'rgba(91,140,255,0.4)' : isPdf ? 'rgba(249,115,22,0.4)' : 'rgba(167,139,250,0.4)'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? typeTint : 'var(--bg-surface)',
        border: `1px solid ${hovered ? typeHoverBorder : 'var(--border)'}`,
        borderRadius: 12, padding: '16px 18px', cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, background: typeIconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          transition: 'background 0.15s',
        }}>
          {isTyped ? <Type size={16} color={typeAccent} />
           : isPdf  ? <FileText size={16} color={typeAccent} />
           : <PenLine size={16} color={typeAccent} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            fontSize: 19, fontWeight: 800, color: 'var(--text-primary)',
            background: 'var(--bg-input)', border: '1px solid var(--accent-blue)',
            borderRadius: 7, padding: '4px 10px', outline: 'none', width: 300,
            letterSpacing: '-0.3px',
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'text' }} onClick={() => setEditing(true)}>
      <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{value || 'Untitled Note'}</span>
      <Pencil size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
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

const SORT_OPTIONS = [
  ['recent',      'Last edited'],
  ['leastRecent', 'Oldest edited'],
  ['name-asc',    'Name (A–Z)'],
  ['name-desc',   'Name (Z–A)'],
  ['type',        'Type'],
]
const TYPE_FILTERS = [
  ['all',         'All types'],
  ['handwritten', 'Handwritten'],
  ['typed',       'Typed'],
  ['pdf',         'PDF'],
]

// Compact header dropdown (button + popover with click-away backdrop)
function HeaderDropdown({ icon: Icon, options, value, onChange, isMobile }) {
  const [open, setOpen] = useState(false)
  const current = options.find(([v]) => v === value)?.[1] || options[0][1]
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 11px',
          borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--bg-surface)',
          color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        <Icon size={14} />
        {!isMobile && <span>{current}</span>}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 61,
            minWidth: 168, background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
            borderRadius: 10, boxShadow: 'var(--shadow-modal)', overflow: 'hidden', padding: 4,
          }}>
            {options.map(([v, label]) => (
              <button
                key={v}
                onClick={() => { onChange(v); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%',
                  padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: v === value ? 'var(--nav-active)' : 'transparent',
                  color: v === value ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: v === value ? 600 : 400, textAlign: 'left', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (v !== value) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (v !== value) e.currentTarget.style.background = 'transparent' }}
              >
                {label}
                {v === value && <Check size={13} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function NotesPage({ notes, domains, noteToOpen, onClearNoteToOpen, onAddNote, onUpdateNote, onDeleteNote, onSaveNote, onAddPdfNote, onGetSignedPdfUrl }) {
  const isMobile = useIsMobile()
  const [mobileFoldersOpen, setMobileFoldersOpen] = useState(false)
  const [sortBy,     setSortBy]     = useState(() => localStorage.getItem('notesSortBy') || 'recent')
  const [typeFilter, setTypeFilter] = useState(() => localStorage.getItem('notesTypeFilter') || 'all')
  useEffect(() => { localStorage.setItem('notesSortBy', sortBy) }, [sortBy])
  useEffect(() => { localStorage.setItem('notesTypeFilter', typeFilter) }, [typeFilter])
  const [selectedFolder,  setSelectedFolder]  = useState({ type: 'all' })
  const [openNoteId,      setOpenNoteId]      = useState(null)
  const [confirmDelNote,  setConfirmDelNote]  = useState(false)
  const [saveState,       setSaveState]       = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [saveError,       setSaveError]       = useState('')
  const [sidebarPicker,    setSidebarPicker]   = useState(false)
  const [mainPicker,       setMainPicker]     = useState(false)
  const [showNewNoteModal, setShowNewNoteModal] = useState(false)
  const [pdfBackgrounds,  setPdfBackgrounds]  = useState({}) // { [noteId]: string[] }
  const [isLoadingPdf,    setIsLoadingPdf]    = useState(false)
  const [pdfError,        setPdfError]        = useState('')
  const [sharing,          setSharing]          = useState(false)
  const [typedViewMode,    setTypedViewMode]    = useState('edit')
  const [typedFullscreen,  setTypedFullscreen]  = useState(false)
  const [typedZoom,        setTypedZoom]        = useState(() => { try { return JSON.parse(localStorage.getItem('notecanvas_settings') || '{}').typedZoom ?? 1 } catch { return 1 } })
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
    setTypedViewMode('edit')
    setTypedFullscreen(false)
    if (openNote) {
      openNoteBaseline.current = { id: openNote.id, updatedAt: openNote.updatedAt }
    } else {
      openNoteBaseline.current = null
    }
  }, [openNoteId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      const existing = JSON.parse(localStorage.getItem('notecanvas_settings') || '{}')
      localStorage.setItem('notecanvas_settings', JSON.stringify({ ...existing, typedZoom }))
    } catch {}
  }, [typedZoom])

  // Escape to exit fullscreen
  useEffect(() => {
    if (!typedFullscreen) return
    function onKey(e) { if (e.key === 'Escape') setTypedFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [typedFullscreen])

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
      .then(result => {
        if (!cancelled) setPdfBackgrounds(prev => ({ ...prev, [openNote.id]: result }))
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
    const recency = n => n.updatedAt || n.createdAt || ''
    const title   = n => (n.title || 'Untitled Note').toLowerCase()
    const cmp = {
      recent:      (a, b) => recency(b) > recency(a) ? 1 : recency(b) < recency(a) ? -1 : 0,
      leastRecent: (a, b) => recency(a) > recency(b) ? 1 : recency(a) < recency(b) ? -1 : 0,
      'name-asc':  (a, b) => title(a).localeCompare(title(b)),
      'name-desc': (a, b) => title(b).localeCompare(title(a)),
      type:        (a, b) => (a.type || '').localeCompare(b.type || '') || title(a).localeCompare(title(b)),
    }[sortBy] || ((a, b) => 0)
    return visibleNotes.filter(n => {
      if (typeFilter !== 'all' && (n.type || 'handwritten') !== typeFilter) return false
      if (f.type === 'all')          return true
      if (f.type === 'general')      return !n.domainId
      if (f.type === 'domain')       return n.domainId === f.domainId
      if (f.type === 'domain-unweek') return n.domainId === f.domainId && !n.academicWeek
      if (f.type === 'week')         return n.domainId === f.domainId && n.academicWeek === f.week
      return true
    }).sort(cmp)
  }, [visibleNotes, selectedFolder, sortBy, typeFilter])

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
    setMobileFoldersOpen(false)
  }

  function createNote(meta = {}, type = 'handwritten') {
    const id = noteId()
    onAddNote({
      id,
      title: meta.title || 'Untitled Note',
      type, content: '',
      pages: type === 'handwritten' ? [{ id: `page-${Date.now()}`, strokes: [] }] : [],
      template:    meta.template    || (type === 'handwritten' ? 'lined' : 'blank'),
      bgColor:     meta.bgColor     || (type === 'handwritten' ? '#f5f0e8' : '#f8f7f2'),
      lineSpacing: meta.lineSpacing || (type === 'handwritten' ? 48 : 32),
      orientation: meta.orientation || 'portrait',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      domainId: meta.domainId || null,
      academicWeek: meta.academicWeek || null,
      eventId: null, studySessionId: null,
    })
    setOpenNoteId(id)
  }

  function handleConfirmNewNote(opts) {
    setShowNewNoteModal(false)
    createNote(opts, opts.type || 'handwritten')
  }

  async function handleConfirmPdfNote(file, meta) {
    setShowNewNoteModal(false)
    setIsLoadingPdf(true)
    setPdfError('')
    try {
      const result = await renderPdfToBackgrounds(file)
      const id = noteId()
      setPdfBackgrounds(prev => ({ ...prev, [id]: result }))
      await onAddPdfNote(id, file, meta, result.images.length)
      setOpenNoteId(id)
    } catch (err) {
      const msg = err?.message || err?.error || String(err) || 'Unknown error'
      setPdfError(msg)
      setTimeout(() => setPdfError(''), 15000)
    } finally {
      setIsLoadingPdf(false)
    }
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
      const result = await renderPdfToBackgrounds(file)
      const id = noteId()
      setPdfBackgrounds(prev => ({ ...prev, [id]: result }))
      await onAddPdfNote(id, file, pendingPdfMeta.current, result.images.length)
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

      {/* Mobile drawer backdrop */}
      {isMobile && mobileFoldersOpen && (
        <div
          onClick={() => setMobileFoldersOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
        background: 'linear-gradient(to right, var(--bg-elevated) 0%, var(--bg-overlay) 60%, var(--bg-hover) 100%)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        ...(isMobile ? {
          position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 41, width: 248,
          transform: mobileFoldersOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.26s cubic-bezier(0.32,0.72,0,1)',
          boxShadow: mobileFoldersOpen ? '0 0 40px rgba(0,0,0,0.5)' : 'none',
          paddingTop: 'env(safe-area-inset-top)',
        } : {}),
      }}>
        <div style={{ padding: '16px 10px 10px', position: 'relative' }}>
          <button
            {...(isMobile ? {} : { 'data-tutorial-id': 'notes-new-btn' })}
            onClick={() => setShowNewNoteModal(true)}
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
          <div style={typedFullscreen && openNote.type === 'typed'
            ? { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', background: 'var(--bg-page)' }
            : { display: 'flex', flexDirection: 'column', height: '100%' }
          }>
            <div style={{
              display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, padding: isMobile ? '12px 14px' : '14px 24px',
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
                {openNote?.type === 'typed' && (
                  <button
                    onClick={() => setTypedZoom(1)}
                    title={typedZoom !== 1 ? 'Reset zoom (Ctrl+0)' : 'Ctrl+Scroll or pinch to zoom'}
                    style={{
                      padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)',
                      background: typedZoom !== 1 ? 'var(--nav-active)' : 'none',
                      color: typedZoom !== 1 ? 'var(--accent-blue)' : 'var(--text-muted)',
                      cursor: 'pointer', fontSize: 11, fontWeight: typedZoom !== 1 ? 600 : 400,
                      transition: 'background 0.12s, color 0.12s',
                    }}
                  >
                    {Math.round(typedZoom * 100)}%
                  </button>
                )}
                {openNote?.type === 'typed' && (
                  <button
                    onClick={() => setTypedFullscreen(v => !v)}
                    title={typedFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '5px 7px', borderRadius: 7, border: '1px solid var(--border)',
                      background: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                      transition: 'color 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    {typedFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>
                )}
                {openNote?.type === 'typed' && (
                  <button
                    onClick={() => setTypedViewMode(v => v === 'edit' ? 'preview' : 'edit')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                      borderRadius: 7, border: '1px solid var(--border)', background: typedViewMode === 'preview' ? 'var(--accent-blue)' : 'none',
                      color: typedViewMode === 'preview' ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', transition: 'background 0.12s, color 0.12s',
                    }}
                    onMouseEnter={e => { if (typedViewMode !== 'preview') { e.currentTarget.style.color = 'var(--accent-blue)'; e.currentTarget.style.borderColor = 'var(--accent-blue)' } }}
                    onMouseLeave={e => { if (typedViewMode !== 'preview') { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)' } }}
                  >
                    {typedViewMode === 'edit' ? <><Eye size={12} /> Preview</> : <><Pencil size={12} /> Edit</>}
                  </button>
                )}
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
                  viewMode={typedViewMode}
                  zoom={typedZoom}
                  onZoomChange={sf => sf === null ? setTypedZoom(1) : setTypedZoom(z => Math.min(3, Math.max(0.5, z * sf)))}
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
                  pageBackgrounds={pdfBackgrounds[openNote.id]?.images}
                  pageDimensions={pdfBackgrounds[openNote.id]?.dimensions}
                  isPdfNote={openNote.type === 'pdf'}
                />
              )}
            </div>
          </div>
        ) : (
          // ── Note grid ──
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '18px 16px 24px' : '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {isMobile && (
                  <button
                    onClick={() => setMobileFoldersOpen(true)}
                    style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 9, border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <FolderOpen size={17} />
                  </button>
                )}
                <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? 19 : 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedFolder.type === 'all'     ? 'All Notes'
                  : selectedFolder.type === 'general' ? 'General Notes'
                  : selectedFolder.type === 'week'    ? `${domainMap[selectedFolder.domainId]?.code} · Week ${selectedFolder.week}`
                  : selectedFolder.type === 'domain'  ? domainMap[selectedFolder.domainId]?.name
                  : 'Notes'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {folderNotes.length} note{folderNotes.length !== 1 ? 's' : ''}
                </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <HeaderDropdown icon={ListFilter} options={TYPE_FILTERS} value={typeFilter} onChange={setTypeFilter} isMobile={isMobile} />
                <HeaderDropdown icon={ArrowUpDown} options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} isMobile={isMobile} />
                <button
                  {...(isMobile ? { 'data-tutorial-id': 'notes-new-btn' } : {})}
                  onClick={() => setShowNewNoteModal(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                    borderRadius: 8, border: 'none', background: 'var(--accent-blue)',
                    color: 'var(--btn-primary-text)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Plus size={14} /> {isMobile ? 'New' : 'New Note'}
                </button>
              </div>
            </div>

            {folderNotes.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '100px 0', color: 'var(--text-muted)', textAlign: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PenLine size={32} color="var(--accent-purple)" strokeWidth={1.5} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '-0.2px' }}>No notes here yet</p>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                    {selectedFolder.type === 'week'
                      ? `Nothing filed under this week. Open a note and use the location picker.`
                      : `Press New Note to start — handwritten, typed, or from a PDF.`}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))', gap: isMobile ? 10 : 14 }}>
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

      {showNewNoteModal && (
        <NewNoteModal
          domains={domains || []}
          defaultDomainId={
            selectedFolder.type === 'domain' || selectedFolder.type === 'week'
              ? selectedFolder.domainId
              : null
          }
          defaultWeek={selectedFolder.type === 'week' ? selectedFolder.week : null}
          onConfirm={handleConfirmNewNote}
          onConfirmPdf={handleConfirmPdfNote}
          onCancel={() => setShowNewNoteModal(false)}
        />
      )}
    </div>
  )
}
