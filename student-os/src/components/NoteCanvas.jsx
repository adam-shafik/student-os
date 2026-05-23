import { useRef, useState, useEffect } from 'react'
import { getStroke } from 'perfect-freehand'
import {
  Undo2, Trash2, PenLine, Highlighter, Shapes, MousePointer2,
  Square, Circle, Minus, Triangle, SlidersHorizontal, Plus,
} from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────────────────────────
const PAGE_HEIGHTS    = { portrait: 1200, landscape: 700 }
const PAGE_MAX_WIDTHS = { portrait: 900,  landscape: 1000 }
const PRESETS         = ['#111827', '#5b8cff', '#a78bfa', '#f59e0b', '#34d399', '#fb7185']
const SIZES           = [2, 5, 10, 18]
const TOOLS           = [
  ['pen',         PenLine,       'Pen'],
  ['highlighter', Highlighter,   'Highlighter'],
  ['shape',       Shapes,        'Shapes'],
  ['select',      MousePointer2, 'Select · drag to move · Delete to remove'],
]
const SHAPE_TYPES = [['rect', Square, 'Rectangle'], ['ellipse', Circle, 'Ellipse'], ['line', Minus, 'Line'], ['triangle', Triangle, 'Triangle']]
const TEMPLATES   = ['blank', 'lined', 'dotted', 'grid']
const BG_COLORS   = ['#f8f7f2', '#0d0d14', '#0a0a0a', '#0a100d', '#100a14', '#0f0d09']
const SPACINGS    = [[20, 'Narrow'], [28, 'Normal'], [36, 'Wide'], [48, 'Extra']]

// ─── Drawing utils ─────────────────────────────────────────────────────────────
function strokeOpts(size, last) {
  return { size, thinning: 0.55, smoothing: 0.5, streamline: 0.5, simulatePressure: false, last }
}

function toPath(outline) {
  if (outline.length < 2) return ''
  const d = outline.reduce((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length]
    acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
    return acc
  }, ['M', ...outline[0], 'Q'])
  d.push('Z')
  return d.join(' ')
}

function classifyShape(x1, y1, x2, y2, preferred) {
  const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1)
  if (Math.max(w, h) / Math.max(Math.min(w, h), 1) > 3.5) return 'line'
  return preferred
}

// ─── Color adaptation ──────────────────────────────────────────────────────────
function hexLuminance(hex) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return 0
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const lin = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

// Preserves hue, shifts lightness so the stroke stays legible against bg.
function adaptColor(color, bg) {
  if (!color?.startsWith('#') || !bg?.startsWith('#')) return color
  const lc = hexLuminance(color), lb = hexLuminance(bg)
  const contrast = (Math.max(lc, lb) + 0.05) / (Math.min(lc, lb) + 0.05)
  if (contrast >= 2.5) return color
  const r = parseInt(color.slice(1, 3), 16) / 255
  const g = parseInt(color.slice(3, 5), 16) / 255
  const b = parseInt(color.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0, s = 0
  const l = (max + min) / 2
  if (d > 0) {
    s = d / (l > 0.5 ? 2 - max - min : max + min)
    h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g ? ((b - r) / d + 2) / 6
      : ((r - g) / d + 4) / 6
  }
  const newL = lb > 0.5 ? 0.22 : 0.80
  const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s
  const p2 = 2 * newL - q
  const hue = t => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    return t < 1 / 6 ? p2 + (q - p2) * 6 * t
      : t < 1 / 2 ? q
      : t < 2 / 3 ? p2 + (q - p2) * (2 / 3 - t) * 6
      : p2
  }
  const nr = Math.round(hue(h + 1 / 3) * 255)
  const ng = Math.round(hue(h) * 255)
  const nb = Math.round(hue(h - 1 / 3) * 255)
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
}

// ─── Shape rendering ───────────────────────────────────────────────────────────
function renderShape(s, bgColor) {
  const { shape, x1, y1, x2, y2, color, size, opacity = 1 } = s
  const ec   = adaptColor(color, bgColor)
  const minX = Math.min(x1, x2), minY = Math.min(y1, y2)
  const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1)
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2
  const p = { stroke: ec, strokeWidth: size, fill: 'none', opacity, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (shape === 'line')     return <line    {...p} x1={x1} y1={y1} x2={x2} y2={y2} />
  if (shape === 'ellipse')  return <ellipse {...p} cx={cx} cy={cy} rx={w / 2} ry={h / 2} />
  if (shape === 'rect')     return <rect    {...p} x={minX} y={minY} width={w} height={h} rx={3} />
  if (shape === 'triangle') return <polygon {...p} points={`${cx},${minY} ${minX},${minY + h} ${minX + w},${minY + h}`} />
  return null
}

function setLiveShapeAttrs(el, type, x1, y1, x2, y2) {
  const minX = Math.min(x1, x2), minY = Math.min(y1, y2)
  const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1)
  if (type === 'line')     { el.setAttribute('x1', x1); el.setAttribute('y1', y1); el.setAttribute('x2', x2); el.setAttribute('y2', y2) }
  if (type === 'ellipse')  { el.setAttribute('cx', (x1 + x2) / 2); el.setAttribute('cy', (y1 + y2) / 2); el.setAttribute('rx', w / 2); el.setAttribute('ry', h / 2) }
  if (type === 'rect')     { el.setAttribute('x', minX); el.setAttribute('y', minY); el.setAttribute('width', w); el.setAttribute('height', h) }
  if (type === 'triangle') { el.setAttribute('points', `${(x1 + x2) / 2},${minY} ${minX},${minY + h} ${minX + w},${minY + h}`) }
}

// ─── Selection utils ───────────────────────────────────────────────────────────
function strokeBounds(s) {
  if (s.shape) return { x1: Math.min(s.x1, s.x2), y1: Math.min(s.y1, s.y2), x2: Math.max(s.x1, s.x2), y2: Math.max(s.y1, s.y2) }
  const xs = s.points.map(p => p[0]), ys = s.points.map(p => p[1])
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) }
}

function rectsIntersect(a, b) {
  const [ax1, ax2] = [Math.min(a.x1, a.x2), Math.max(a.x1, a.x2)]
  const [ay1, ay2] = [Math.min(a.y1, a.y2), Math.max(a.y1, a.y2)]
  const [bx1, bx2] = [Math.min(b.x1, b.x2), Math.max(b.x1, b.x2)]
  const [by1, by2] = [Math.min(b.y1, b.y2), Math.max(b.y1, b.y2)]
  return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1
}

// ─── Page template (SVG background pattern) ────────────────────────────────────
function PageTemplate({ pageId, template, bgColor, lineSpacing }) {
  const bgLum = hexLuminance(bgColor)
  const lc    = bgLum > 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.07)'
  const pid   = t => `p-${pageId}-${t}`
  return (
    <>
      <defs>
        {template === 'lined' && (
          <pattern id={pid('lined')} x="0" y="0" width="3000" height={lineSpacing} patternUnits="userSpaceOnUse">
            <line x1="0" y1={lineSpacing - 0.5} x2="3000" y2={lineSpacing - 0.5} stroke={lc} strokeWidth="0.5" />
          </pattern>
        )}
        {template === 'dotted' && (
          <pattern id={pid('dotted')} x={lineSpacing / 2} y={lineSpacing / 2} width={lineSpacing} height={lineSpacing} patternUnits="userSpaceOnUse">
            <circle cx="0" cy="0" r="1.2" fill={lc} />
          </pattern>
        )}
        {template === 'grid' && (
          <pattern id={pid('grid')} x="0" y="0" width={lineSpacing} height={lineSpacing} patternUnits="userSpaceOnUse">
            <path d={`M ${lineSpacing} 0 L 0 0 0 ${lineSpacing}`} fill="none" stroke={lc} strokeWidth="0.5" />
          </pattern>
        )}
      </defs>
      <rect width="100%" height="100%" fill={bgColor} />
      {template !== 'blank' && <rect width="100%" height="100%" fill={`url(#${pid(template)})`} />}
    </>
  )
}

// ─── Single page canvas ─────────────────────────────────────────────────────────
function PageCanvas({ page, pageH, onStrokesChange, penColor, penSize, tool, shapeType, opacity, template, bgColor, lineSpacing, readonly }) {
  const svgRef        = useRef()
  const livePathRef   = useRef(null)
  const liveShapeRef  = useRef(null)
  const activeStroke  = useRef(null)
  const holdTimer     = useRef(null)
  const shapeModeRef  = useRef(false)
  const shapeStartRef = useRef(null)
  const lastPtRef     = useRef(null)

  const [shapeHeld,       setShapeHeld]       = useState(false)
  const [selRect,         setSelRect]         = useState(null)
  const [selectedIndices, setSelectedIndices] = useState(() => new Set())
  const [moveStart,       setMoveStart]       = useState(null)
  const [moveOff,         setMoveOff]         = useState({ dx: 0, dy: 0 })
  const [isMoving,        setIsMoving]        = useState(false)

  useEffect(() => {
    setSelectedIndices(new Set())
    setSelRect(null)
    setIsMoving(false)
    setMoveStart(null)
    setMoveOff({ dx: 0, dy: 0 })
  }, [tool])

  const strokes = page.strokes

  function getPoint(e) {
    const r = svgRef.current.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top, e.pressure || 0.5]
  }

  function clearLiveShape() {
    liveShapeRef.current?.el?.remove()
    liveShapeRef.current = null
  }

  function updateLiveShape(x1, y1, x2, y2) {
    const type   = classifyShape(x1, y1, x2, y2, shapeType)
    const tagMap = { rect: 'rect', ellipse: 'ellipse', line: 'line', triangle: 'polygon' }
    if (!liveShapeRef.current || liveShapeRef.current.type !== type) {
      clearLiveShape()
      const el = document.createElementNS('http://www.w3.org/2000/svg', tagMap[type])
      el.setAttribute('stroke', penColor)
      el.setAttribute('stroke-width', penSize)
      el.setAttribute('fill', 'none')
      el.setAttribute('opacity', opacity)
      el.setAttribute('stroke-linecap', 'round')
      el.setAttribute('stroke-linejoin', 'round')
      el.setAttribute('stroke-dasharray', '6 4')
      if (type === 'rect') el.setAttribute('rx', '3')
      svgRef.current.appendChild(el)
      liveShapeRef.current = { el, type }
    }
    setLiveShapeAttrs(liveShapeRef.current.el, type, x1, y1, x2, y2)
  }

  function getSelBounds(dx = 0, dy = 0) {
    if (selectedIndices.size === 0) return null
    const bounds = [...selectedIndices].map(i => strokeBounds(strokes[i]))
    return {
      x1: Math.min(...bounds.map(b => b.x1)) - 8 + dx,
      y1: Math.min(...bounds.map(b => b.y1)) - 8 + dy,
      x2: Math.max(...bounds.map(b => b.x2)) + 8 + dx,
      y2: Math.max(...bounds.map(b => b.y2)) + 8 + dy,
    }
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = getPoint(e)
    lastPtRef.current = pt

    if (tool === 'select') {
      if (selectedIndices.size > 0) {
        const sb = getSelBounds()
        if (sb && pt[0] >= sb.x1 && pt[0] <= sb.x2 && pt[1] >= sb.y1 && pt[1] <= sb.y2) {
          setIsMoving(true)
          setMoveStart({ x: pt[0], y: pt[1] })
          setMoveOff({ dx: 0, dy: 0 })
          return
        }
      }
      setSelectedIndices(new Set())
      setSelRect({ x1: pt[0], y1: pt[1], x2: pt[0], y2: pt[1] })
      setIsMoving(false)
      return
    }

    if (tool === 'shape') {
      shapeStartRef.current = pt
      shapeModeRef.current  = false
      setShapeHeld(false)
      holdTimer.current = setTimeout(() => { shapeModeRef.current = true; setShapeHeld(true) }, 450)
    } else {
      activeStroke.current = { points: [pt], color: penColor, size: penSize, opacity }
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('fill', penColor)
      path.setAttribute('fill-opacity', opacity)
      path.setAttribute('stroke', 'none')
      livePathRef.current = path
      svgRef.current.appendChild(path)
    }
  }

  function onPointerMove(e) {
    const pt = getPoint(e)
    lastPtRef.current = pt

    if (tool === 'select') {
      if (isMoving && moveStart) {
        setMoveOff({ dx: pt[0] - moveStart.x, dy: pt[1] - moveStart.y })
      } else if (selRect) {
        setSelRect(prev => ({ ...prev, x2: pt[0], y2: pt[1] }))
      }
      return
    }

    if (tool === 'shape') {
      if (!shapeModeRef.current || !shapeStartRef.current) return
      updateLiveShape(shapeStartRef.current[0], shapeStartRef.current[1], pt[0], pt[1])
    } else {
      if (!activeStroke.current || !livePathRef.current) return
      activeStroke.current.points.push(pt)
      const outline = getStroke(activeStroke.current.points, strokeOpts(penSize, false))
      livePathRef.current.setAttribute('d', toPath(outline))
    }
  }

  function onPointerUp() {
    clearTimeout(holdTimer.current)

    if (tool === 'select') {
      if (isMoving) {
        const { dx, dy } = moveOff
        const newStrokes = strokes.map((s, i) => {
          if (!selectedIndices.has(i)) return s
          if (s.shape) return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }
          return { ...s, points: s.points.map(p => [p[0] + dx, p[1] + dy, p[2]]) }
        })
        onStrokesChange(newStrokes)
        setIsMoving(false)
        setMoveStart(null)
        setMoveOff({ dx: 0, dy: 0 })
      } else if (selRect) {
        const hits = new Set()
        strokes.forEach((s, i) => { if (rectsIntersect(selRect, strokeBounds(s))) hits.add(i) })
        setSelectedIndices(hits)
        setSelRect(null)
      }
      return
    }

    if (tool === 'shape') {
      if (shapeModeRef.current && shapeStartRef.current && lastPtRef.current) {
        const [x1, y1] = shapeStartRef.current, [x2, y2] = lastPtRef.current
        clearLiveShape()
        const type = classifyShape(x1, y1, x2, y2, shapeType)
        if (Math.abs(x2 - x1) > 5 || Math.abs(y2 - y1) > 5)
          onStrokesChange([...strokes, { shape: type, x1, y1, x2, y2, color: penColor, size: penSize, opacity }])
      } else { clearLiveShape() }
      shapeModeRef.current = false; shapeStartRef.current = null; setShapeHeld(false)
    } else {
      if (!activeStroke.current) return
      livePathRef.current?.remove(); livePathRef.current = null
      const s = activeStroke.current; activeStroke.current = null
      if (s.points.length > 1) onStrokesChange([...strokes, s])
    }
  }

  function onKeyDown(e) {
    if (tool !== 'select' || selectedIndices.size === 0) return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      onStrokesChange(strokes.filter((_, i) => !selectedIndices.has(i)))
      setSelectedIndices(new Set())
    }
  }

  const selBounds = tool === 'select' ? getSelBounds(isMoving ? moveOff.dx : 0, isMoving ? moveOff.dy : 0) : null
  const cursor    = readonly ? 'default' : isMoving ? 'grabbing' : 'crosshair'

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {shapeHeld && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)', border: `1px solid ${penColor}66`,
          borderRadius: 20, padding: '4px 14px', fontSize: 11, color: penColor,
          pointerEvents: 'none', zIndex: 10, letterSpacing: '0.2px',
        }}>
          Shape mode · drag to draw
        </div>
      )}
      <svg
        ref={svgRef}
        tabIndex={tool === 'select' && !readonly ? 0 : undefined}
        style={{ width: '100%', height: pageH, display: 'block', touchAction: 'none', cursor, outline: 'none' }}
        onPointerDown={readonly ? undefined : onPointerDown}
        onPointerMove={readonly ? undefined : onPointerMove}
        onPointerUp={readonly   ? undefined : onPointerUp}
        onPointerLeave={readonly ? undefined : onPointerUp}
        onKeyDown={readonly ? undefined : onKeyDown}
      >
        <PageTemplate pageId={page.id} template={template} bgColor={bgColor} lineSpacing={lineSpacing} />

        {strokes.map((s, i) => {
          const sel = selectedIndices.has(i)
          const dx  = sel && isMoving ? moveOff.dx : 0
          const dy  = sel && isMoving ? moveOff.dy : 0
          const tf  = (dx || dy) ? `translate(${dx},${dy})` : undefined
          if (s.shape) return <g key={i} transform={tf}>{renderShape(s, bgColor)}</g>
          const outline = getStroke(s.points, strokeOpts(s.size, true))
          return (
            <g key={i} transform={tf}>
              <path fill={adaptColor(s.color, bgColor)} fillOpacity={s.opacity ?? 1} stroke="none" d={toPath(outline)} />
            </g>
          )
        })}

        {tool === 'select' && selRect && (
          <rect
            x={Math.min(selRect.x1, selRect.x2)} y={Math.min(selRect.y1, selRect.y2)}
            width={Math.abs(selRect.x2 - selRect.x1)} height={Math.abs(selRect.y2 - selRect.y1)}
            fill="rgba(91,140,255,0.08)" stroke="#5b8cff" strokeWidth={1.5} strokeDasharray="6 4"
          />
        )}

        {selBounds && !selRect && (
          <rect
            x={selBounds.x1} y={selBounds.y1}
            width={selBounds.x2 - selBounds.x1} height={selBounds.y2 - selBounds.y1}
            fill="rgba(91,140,255,0.06)" stroke="#5b8cff" strokeWidth={1.5} strokeDasharray="6 4"
          />
        )}
      </svg>
    </div>
  )
}

// ─── Main multi-page canvas ─────────────────────────────────────────────────────
export default function NoteCanvas({
  pages, onPagesChange,
  template = 'blank', bgColor = '#f8f7f2', lineSpacing = 32,
  orientation = 'portrait', onSettingsChange,
  readonly = false,
}) {
  const scrollRef      = useRef()
  const addingPageRef  = useRef(false)

  const [penColor,     setPenColor]     = useState('#111827')
  const [penSize,      setPenSize]      = useState(5)
  const [tool,         setTool]         = useState('pen')
  const [shapeType,    setShapeType]    = useState('rect')
  const [customColor,  setCustomColor]  = useState('#111827')
  const [customBg,     setCustomBg]     = useState(bgColor)
  const [showSettings, setShowSettings] = useState(false)

  const pageH        = PAGE_HEIGHTS[orientation]    ?? 1200
  const maxW         = PAGE_MAX_WIDTHS[orientation] ?? 900
  const opacity      = tool === 'highlighter' ? 0.35 : 1
  const totalStrokes = pages.reduce((s, p) => s + p.strokes.length, 0)

  function addPage() {
    onPagesChange([...pages, { id: `page-${Date.now()}`, strokes: [] }])
  }

  function handleUndo() {
    for (let i = pages.length - 1; i >= 0; i--) {
      if (pages[i].strokes.length > 0) {
        onPagesChange(pages.map((p, j) => j === i ? { ...p, strokes: p.strokes.slice(0, -1) } : p))
        return
      }
    }
  }

  function onScroll(e) {
    if (readonly) return
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      if (!addingPageRef.current && pages[pages.length - 1].strokes.length > 0) {
        addingPageRef.current = true
        addPage()
        setTimeout(() => { addingPageRef.current = false }, 1500)
      }
    }
  }

  function tbtn(active) {
    return {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 30, height: 28, borderRadius: 7, border: '1px solid transparent',
      cursor: 'pointer', background: active ? penColor + '22' : 'none',
      color: active ? penColor : 'var(--text-muted)',
      borderColor: active ? penColor + '55' : 'transparent',
    }
  }

  const sep = <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none' }}>

      {!readonly && (
        <>
          {/* ── Main toolbar ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
            borderBottom: showSettings ? 'none' : '1px solid var(--border)',
            flexShrink: 0, background: 'var(--bg-elevated)', flexWrap: 'wrap',
          }}>

            <div style={{ display: 'flex', gap: 3 }}>
              {TOOLS.map(([t, Icon, label]) => (
                <button key={t} title={label} onClick={() => setTool(t)} style={tbtn(tool === t)}>
                  <Icon size={13} />
                </button>
              ))}
            </div>

            {sep}

            {tool === 'shape' && (
              <>
                <div style={{ display: 'flex', gap: 3 }}>
                  {SHAPE_TYPES.map(([t, Icon, label]) => (
                    <button key={t} title={label} onClick={() => setShapeType(t)} style={tbtn(shapeType === t)}>
                      <Icon size={13} />
                    </button>
                  ))}
                </div>
                {sep}
              </>
            )}

            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              {PRESETS.map(c => (
                <button key={c} onClick={() => setPenColor(c)} style={{
                  width: 17, height: 17, borderRadius: '50%', background: c,
                  border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                  outline: penColor === c ? `2.5px solid ${c}` : '2px solid transparent',
                  outlineOffset: 2, transform: penColor === c ? 'scale(1.25)' : 'scale(1)',
                  transition: 'transform 0.12s',
                }} />
              ))}
              <div style={{ position: 'relative', width: 17, height: 17, flexShrink: 0 }}>
                <div style={{
                  width: 17, height: 17, borderRadius: '50%',
                  background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                  outline: !PRESETS.includes(penColor) ? '2.5px solid white' : '2px solid transparent',
                  outlineOffset: 2, transform: !PRESETS.includes(penColor) ? 'scale(1.25)' : 'scale(1)',
                  transition: 'transform 0.12s',
                }} />
                <input type="color" value={customColor}
                  onChange={e => { setCustomColor(e.target.value); setPenColor(e.target.value) }}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              </div>
            </div>

            {sep}

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {SIZES.map(s => {
                const d = Math.max(6, Math.min(s * 1.4, 22))
                return (
                  <button key={s} onClick={() => setPenSize(s)} style={{
                    width: d, height: d, borderRadius: '50%',
                    background: penSize === s ? penColor : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                    transition: 'background 0.12s',
                  }} />
                )
              })}
            </div>

            <div style={{ flex: 1 }} />

            <button title="Page settings" onClick={() => setShowSettings(v => !v)} style={tbtn(showSettings)}>
              <SlidersHorizontal size={13} />
            </button>

            <button onClick={handleUndo} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
              borderRadius: 7, border: '1px solid var(--border)', background: 'none',
              color: totalStrokes === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
              cursor: totalStrokes === 0 ? 'not-allowed' : 'pointer', fontSize: 12,
            }}>
              <Undo2 size={12} /> Undo
            </button>

            <button onClick={() => totalStrokes > 0 && onPagesChange(pages.map(p => ({ ...p, strokes: [] })))} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
              borderRadius: 7, border: '1px solid var(--border)', background: 'none',
              color: totalStrokes === 0 ? 'var(--text-muted)' : 'var(--accent-red)',
              cursor: totalStrokes === 0 ? 'not-allowed' : 'pointer', fontSize: 12,
            }}>
              <Trash2 size={12} /> Clear all
            </button>
          </div>

          {/* ── Settings panel ── */}
          {showSettings && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '8px 14px',
              borderBottom: '1px solid var(--border)', flexShrink: 0,
              background: 'var(--bg-elevated)', flexWrap: 'wrap',
            }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Orientation</span>
                {['portrait', 'landscape'].map(o => (
                  <button key={o} onClick={() => onSettingsChange({ orientation: o })} style={{
                    padding: '4px 9px', borderRadius: 6, border: '1px solid transparent',
                    cursor: 'pointer', fontSize: 11, textTransform: 'capitalize',
                    background: orientation === o ? penColor + '22' : 'none',
                    color: orientation === o ? penColor : 'var(--text-muted)',
                    borderColor: orientation === o ? penColor + '55' : 'transparent',
                  }}>{o}</button>
                ))}
              </div>

              {sep}

              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Template</span>
                {TEMPLATES.map(t => (
                  <button key={t} onClick={() => onSettingsChange({ template: t })} style={{
                    padding: '4px 9px', borderRadius: 6, border: '1px solid transparent',
                    cursor: 'pointer', fontSize: 11, textTransform: 'capitalize',
                    background: template === t ? penColor + '22' : 'none',
                    color: template === t ? penColor : 'var(--text-muted)',
                    borderColor: template === t ? penColor + '55' : 'transparent',
                  }}>{t}</button>
                ))}
              </div>

              {sep}

              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Background</span>
                {BG_COLORS.map(c => (
                  <button key={c} onClick={() => onSettingsChange({ bgColor: c })} title={c} style={{
                    width: 18, height: 18, borderRadius: 4, background: c, cursor: 'pointer', padding: 0, flexShrink: 0,
                    border: bgColor === c ? '2px solid var(--accent-blue)' : '1px solid var(--border-strong)',
                  }} />
                ))}
                <div style={{ position: 'relative', width: 18, height: 18, flexShrink: 0 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                    border: !BG_COLORS.includes(bgColor) ? '2px solid var(--accent-blue)' : '1px solid var(--border-strong)',
                  }} />
                  <input type="color" value={customBg}
                    onChange={e => { setCustomBg(e.target.value); onSettingsChange({ bgColor: e.target.value }) }}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                </div>
              </div>

              {template !== 'blank' && (
                <>
                  {sep}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Spacing</span>
                    {SPACINGS.map(([val, label]) => (
                      <button key={val} onClick={() => onSettingsChange({ lineSpacing: val })} style={{
                        padding: '4px 8px', borderRadius: 6, border: '1px solid transparent',
                        cursor: 'pointer', fontSize: 11,
                        background: lineSpacing === val ? penColor + '22' : 'none',
                        color: lineSpacing === val ? penColor : 'var(--text-muted)',
                        borderColor: lineSpacing === val ? penColor + '55' : 'transparent',
                      }}>{label}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Scroll container ── */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{ flex: 1, overflowY: 'auto', background: 'var(--canvas-outer, #14141e)' }}
      >
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {pages.map((page, pageIdx) => (
            <div key={page.id} style={{ width: '100%', maxWidth: maxW, flexShrink: 0 }}>
              <PageCanvas
                page={page}
                pageH={pageH}
                onStrokesChange={newStrokes =>
                  onPagesChange(pages.map((p, i) => i === pageIdx ? { ...p, strokes: newStrokes } : p))
                }
                penColor={penColor}
                penSize={penSize}
                tool={tool}
                shapeType={shapeType}
                opacity={opacity}
                template={template}
                bgColor={bgColor}
                lineSpacing={lineSpacing}
                readonly={readonly}
              />
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.5px' }}>
                {pageIdx + 1}
              </div>
            </div>
          ))}

          {!readonly && (
            <button
              onClick={addPage}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                borderRadius: 8, border: '1px dashed var(--border-strong)', background: 'none',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, marginBottom: 24,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--text-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
            >
              <Plus size={14} /> Add Page
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
