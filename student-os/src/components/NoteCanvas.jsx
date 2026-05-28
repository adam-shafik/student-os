import { useRef, useState, useEffect } from 'react'
import { getStroke } from 'perfect-freehand'
import {
  Undo2, Trash2, PenLine, Highlighter, Shapes, MousePointer2, Eraser,
  Square, Circle, Minus, Triangle, SlidersHorizontal, Plus, Maximize2, Minimize2,
} from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────────────────────────
const PAGE_HEIGHTS    = { portrait: 1200, landscape: 520 }
const PAGE_MAX_WIDTHS = { portrait: 900,  landscape: 1200 }
const PRESETS         = ['#111827', '#5b8cff', '#a78bfa', '#f59e0b', '#34d399', '#fb7185']
const SIZES            = [2, 5, 10, 18]
const HIGHLIGHTER_SIZES = [14, 22, 36, 56]
const TOOLS           = [
  ['pen',         PenLine,       'Pen'],
  ['highlighter', Highlighter,   'Highlighter'],
  ['shape',       Shapes,        'Shapes'],
  ['select',      MousePointer2, 'Select · drag to move · Delete to remove'],
  ['eraser',      Eraser,        'Eraser'],
]
const SHAPE_TYPES  = [['rect', Square, 'Rectangle'], ['ellipse', Circle, 'Ellipse'], ['line', Minus, 'Line'], ['triangle', Triangle, 'Triangle']]
const ERASER_MODES = [['standard', 'Standard'], ['stroke', 'Stroke']]
const TEMPLATES    = ['blank', 'lined', 'dotted', 'grid']
const BG_COLORS    = ['#f8f7f2', '#0d0d14', '#0a0a0a', '#0a100d', '#100a14', '#0f0d09']
const SPACINGS     = [[20, 'Narrow'], [28, 'Normal'], [36, 'Wide'], [48, 'Extra']]

// ─── Drawing utils ─────────────────────────────────────────────────────────────
function strokeOpts(size, last, smoothing = 0.5) {
  return { size, thinning: 0.55, smoothing, streamline: smoothing, simulatePressure: false, last }
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

function adaptColor(color, bg) {
  if (!color?.startsWith('#') || !bg?.startsWith('#')) return color
  const lc = hexLuminance(color), lb = hexLuminance(bg)
  const contrast = (Math.max(lc, lb) + 0.05) / (Math.min(lc, lb) + 0.05)
  if (contrast >= 1.3) return color
  return lb > 0.5 ? '#000000' : '#ffffff'
}

// ─── Eraser logic ──────────────────────────────────────────────────────────────
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

// Split a line shape at an eraser circle; returns 0–2 line segments
function splitLineAtCircle(s, cx, cy, radius) {
  const { x1, y1, x2, y2 } = s
  const dx = x2 - x1, dy = y2 - y1
  const fx = x1 - cx, fy = y1 - cy
  const a = dx * dx + dy * dy
  if (a < 1) return [s]
  const b = 2 * (fx * dx + fy * dy)
  const c = fx * fx + fy * fy - radius * radius
  const disc = b * b - 4 * a * c
  if (disc < 0) return [s]
  const sq = Math.sqrt(disc)
  const t1 = Math.max(0, Math.min(1, (-b - sq) / (2 * a)))
  const t2 = Math.max(0, Math.min(1, (-b + sq) / (2 * a)))
  if (t2 - t1 < 0.005) return [s]
  const result = []
  if (t1 > 0.005) result.push({ ...s, x2: x1 + t1 * dx, y2: y1 + t1 * dy })
  if (t2 < 0.995) result.push({ ...s, x1: x1 + t2 * dx, y1: y1 + t2 * dy })
  return result
}

// Check if eraser touches the actual drawn border of a closed shape (not just bounding box)
function closedShapeTouched(s, cx, cy, radius) {
  const minX = Math.min(s.x1, s.x2), minY = Math.min(s.y1, s.y2)
  const maxX = Math.max(s.x1, s.x2), maxY = Math.max(s.y1, s.y2)
  const r = radius + s.size / 2
  if (s.shape === 'rect') {
    return distToSegment(cx, cy, minX, minY, maxX, minY) <= r ||
           distToSegment(cx, cy, minX, maxY, maxX, maxY) <= r ||
           distToSegment(cx, cy, minX, minY, minX, maxY) <= r ||
           distToSegment(cx, cy, maxX, minY, maxX, maxY) <= r
  }
  if (s.shape === 'ellipse') {
    const ecx = (s.x1 + s.x2) / 2, ecy = (s.y1 + s.y2) / 2
    const rx = (maxX - minX) / 2, ry = (maxY - minY) / 2
    if (rx < 1 || ry < 1) return false
    const nx = (cx - ecx) / rx, ny = (cy - ecy) / ry
    return Math.abs(Math.sqrt(nx * nx + ny * ny) - 1) * Math.min(rx, ry) <= r
  }
  if (s.shape === 'triangle') {
    const topX = (s.x1 + s.x2) / 2
    return distToSegment(cx, cy, topX, minY, minX, maxY) <= r ||
           distToSegment(cx, cy, minX, maxY, maxX, maxY) <= r ||
           distToSegment(cx, cy, maxX, maxY, topX, minY) <= r
  }
  return false
}

function applyStandardErase(strokes, cx, cy, radius) {
  const r2 = radius * radius
  const result = []
  for (const s of strokes) {
    if (s.shape === 'line') {
      // Lines can be split — erase only the touched segment
      result.push(...splitLineAtCircle(s, cx, cy, radius))
    } else if (s.shape) {
      // Closed shapes: erase whole shape only if eraser touches the actual border
      if (!closedShapeTouched(s, cx, cy, radius)) result.push(s)
    } else {
      let current = []
      for (const p of s.points) {
        const dx = p[0] - cx, dy = p[1] - cy
        if (dx * dx + dy * dy <= r2) {
          if (current.length > 1) result.push({ ...s, points: current })
          current = []
        } else {
          current.push(p)
        }
      }
      if (current.length > 1) result.push({ ...s, points: current })
    }
  }
  return result
}

function applyStrokeErase(strokes, cx, cy, radius) {
  const r2 = radius * radius
  return strokes.filter(s => {
    if (s.shape === 'line') return distToSegment(cx, cy, s.x1, s.y1, s.x2, s.y2) > radius
    if (s.shape) return !closedShapeTouched(s, cx, cy, radius)
    return !s.points.some(p => {
      const dx = p[0] - cx, dy = p[1] - cy
      return dx * dx + dy * dy <= r2
    })
  })
}

// ─── Shape rendering ───────────────────────────────────────────────────────────
function renderShape(s) {
  const { shape, x1, y1, x2, y2, color, size, opacity = 1 } = s
  const ec   = color
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

// ─── Page template ─────────────────────────────────────────────────────────────
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

// ─── Single page canvas ────────────────────────────────────────────────────────
function PageCanvas({ page, pageH, onStrokesChange, penColor, penSize, tool, shapeType, opacity, smoothness, template, bgColor, lineSpacing, eraserMode, eraserRadius, readonly, onUndo, clipboard, onCopy }) {
  const svgRef        = useRef()
  const livePathRef   = useRef(null)
  const liveShapeRef  = useRef(null)
  const activeStroke  = useRef(null)
  const holdTimer     = useRef(null)
  const shapeModeRef  = useRef(false)
  const shapeStartRef = useRef(null)
  const lastPtRef     = useRef(null)
  const isErasingRef  = useRef(false)
  const erasingRef    = useRef(null)
  const eraserRAFRef  = useRef(null)
  const drawRAFRef    = useRef(null)
  const stylusActiveRef = useRef(false)
  const stateRef        = useRef({})

  const [shapeHeld,       setShapeHeld]       = useState(false)
  const [selRect,         setSelRect]         = useState(null)
  const [selectedIndices, setSelectedIndices] = useState(() => new Set())
  const [moveStart,       setMoveStart]       = useState(null)
  const [moveOff,         setMoveOff]         = useState({ dx: 0, dy: 0 })
  const [isMoving,        setIsMoving]        = useState(false)
  const [eraserPos,       setEraserPos]       = useState(null)
  const [erasingStrokes,  setErasingStrokes]  = useState(null)
  const [pasteMenu,       setPasteMenu]       = useState(null) // { x, y } or null
  const [actionToast,     setActionToast]     = useState(null)
  const [actionToastKey,  setActionToastKey]  = useState(0)
  const actionToastTimer = useRef(null)

  useEffect(() => {
    setSelectedIndices(new Set()); setSelRect(null)
    setIsMoving(false); setMoveStart(null); setMoveOff({ dx: 0, dy: 0 })
    setEraserPos(null); setErasingStrokes(null)
    setPasteMenu(null); clearTimeout(holdTimer.current)
    isErasingRef.current = false; erasingRef.current = null
  }, [tool])

  // Once parent strokes prop updates after an erase, clear the local preview.
  // We keep erasingStrokes set to `final` until the parent re-renders with the
  // new strokes, preventing a flash of the old un-erased strokes.
  useEffect(() => {
    setErasingStrokes(null)
  }, [strokes])

  useEffect(() => {
    if (readonly) return
    const svg = svgRef.current
    if (!svg) return

    let t2 = null       // 2-finger tap: { t, x1, y1, x2, y2 }
    let stylusId = null // active Apple Pencil touch identifier

    function svgPt(touch) {
      const r = svg.getBoundingClientRect()
      return [touch.clientX - r.left, touch.clientY - r.top, touch.force || 0.5]
    }

    function finishStylusStroke() {
      stylusActiveRef.current = false
      stylusId = null
      clearTimeout(holdTimer.current)
      const { tool, strokes, onStrokesChange, penSize, shapeType, drawColor, opacity, selectedIndices: si, selRect: sr, isMoving: im, moveOff: mo } = stateRef.current
      if (tool === 'eraser') {
        if (eraserRAFRef.current) { cancelAnimationFrame(eraserRAFRef.current); eraserRAFRef.current = null }
        isErasingRef.current = false
        const final = erasingRef.current; erasingRef.current = null
        setEraserPos(null)
        if (final !== null) {
          setErasingStrokes(final) // hold preview until parent re-renders; effect clears it
          onStrokesChange(final)
        } else {
          setErasingStrokes(null)
        }
      } else if (tool === 'shape') {
        if (shapeModeRef.current && shapeStartRef.current && lastPtRef.current) {
          const [x1, y1] = shapeStartRef.current, [x2, y2] = lastPtRef.current
          liveShapeRef.current?.el?.remove(); liveShapeRef.current = null
          const type = classifyShape(x1, y1, x2, y2, shapeType)
          if (Math.abs(x2 - x1) > 5 || Math.abs(y2 - y1) > 5)
            onStrokesChange([...strokes, { shape: type, x1, y1, x2, y2, color: drawColor, size: penSize, opacity }])
        } else { liveShapeRef.current?.el?.remove(); liveShapeRef.current = null }
        shapeModeRef.current = false; shapeStartRef.current = null; setShapeHeld(false)
      } else if (tool === 'select') {
        if (im) {
          const { dx, dy } = mo
          onStrokesChange(strokes.map((s, i) => {
            if (!si.has(i)) return s
            if (s.shape) return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }
            return { ...s, points: s.points.map(p => [p[0] + dx, p[1] + dy, p[2]]) }
          }))
          setIsMoving(false); setMoveStart(null); setMoveOff({ dx: 0, dy: 0 })
        } else if (sr) {
          const hits = new Set()
          strokes.forEach((s, i) => { if (rectsIntersect(sr, strokeBounds(s))) hits.add(i) })
          setSelectedIndices(hits); setSelRect(null)
        }
      } else {
        if (!activeStroke.current) return
        if (drawRAFRef.current) { cancelAnimationFrame(drawRAFRef.current); drawRAFRef.current = null }
        livePathRef.current?.remove(); livePathRef.current = null
        const s = activeStroke.current; activeStroke.current = null
        if (s.points.length >= 1) {
          const points = s.points.length === 1 ? [s.points[0], s.points[0]] : s.points
          onStrokesChange([...strokes, { ...s, points }])
        }
      }
    }

    function onTouchStart(e) {
      const touches = Array.from(e.touches)
      const stylus = touches.find(t => t.touchType === 'stylus')

      if (stylus) {
        e.preventDefault()
        if (stylusActiveRef.current) {
          if (stylus.identifier === stylusId) return
          // Stale state — old touch was lost without touchend/touchcancel; reset
          stylusActiveRef.current = false
          stylusId = null
          livePathRef.current?.remove(); livePathRef.current = null
          activeStroke.current = null
          liveShapeRef.current?.el?.remove(); liveShapeRef.current = null
          shapeModeRef.current = false; shapeStartRef.current = null; setShapeHeld(false)
          clearTimeout(holdTimer.current)
        }
        stylusActiveRef.current = true
        stylusId = stylus.identifier
        t2 = null
        const { tool, drawColor, penSize, opacity, strokes, eraserMode, eraserRadius } = stateRef.current
        const pt = svgPt(stylus)
        lastPtRef.current = pt
        if (tool === 'eraser') {
          isErasingRef.current = true; erasingRef.current = strokes
          setEraserPos({ x: pt[0], y: pt[1] })
          const fn = eraserMode === 'stroke' ? applyStrokeErase : applyStandardErase
          erasingRef.current = fn(strokes, pt[0], pt[1], eraserRadius)
          setErasingStrokes([...erasingRef.current])
        } else if (tool === 'shape') {
          shapeStartRef.current = pt; shapeModeRef.current = false; setShapeHeld(false)
          holdTimer.current = setTimeout(() => { shapeModeRef.current = true; setShapeHeld(true) }, 450)
        } else if (tool === 'select') {
          const { selectedIndices: si, strokes: st } = stateRef.current
          if (si.size > 0) {
            const bounds = [...si].map(idx => strokeBounds(st[idx]))
            const sb = { x1: Math.min(...bounds.map(b => b.x1)) - 8, y1: Math.min(...bounds.map(b => b.y1)) - 8, x2: Math.max(...bounds.map(b => b.x2)) + 8, y2: Math.max(...bounds.map(b => b.y2)) + 8 }
            if (pt[0] >= sb.x1 && pt[0] <= sb.x2 && pt[1] >= sb.y1 && pt[1] <= sb.y2) {
              setIsMoving(true); setMoveStart({ x: pt[0], y: pt[1] }); setMoveOff({ dx: 0, dy: 0 }); return
            }
          }
          setSelectedIndices(new Set()); setSelRect({ x1: pt[0], y1: pt[1], x2: pt[0], y2: pt[1] }); setIsMoving(false)
          if (stateRef.current.clipboard?.length > 0) {
            holdTimer.current = setTimeout(() => setPasteMenu({ x: pt[0], y: pt[1] }), 600)
          }
        } else {
          activeStroke.current = { points: [pt], color: drawColor, size: penSize, opacity, smoothing: stateRef.current.smoothness }
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
          path.setAttribute('fill', drawColor); path.setAttribute('fill-opacity', opacity); path.setAttribute('stroke', 'none')
          livePathRef.current = path; svg.appendChild(path)
        }
        return
      }

      // Fingers: only detect 2-finger tap, never draw
      if (stylusActiveRef.current) return
      if (touches.length === 2) {
        e.preventDefault()
        t2 = { t: Date.now(), x1: touches[0].clientX, y1: touches[0].clientY, x2: touches[1].clientX, y2: touches[1].clientY }
      } else {
        t2 = null
      }
    }

    function onTouchMove(e) {
      if (t2 && e.touches.length === 2) {
        const moved = Math.max(
          Math.abs(e.touches[0].clientX - t2.x1), Math.abs(e.touches[0].clientY - t2.y1),
          Math.abs(e.touches[1].clientX - t2.x2), Math.abs(e.touches[1].clientY - t2.y2),
        )
        if (moved > 30) t2 = null
      }

      if (!stylusActiveRef.current) return
      const stylus = Array.from(e.touches).find(t => t.identifier === stylusId)
      if (!stylus) { finishStylusStroke(); return }
      e.preventDefault()

      const pt = svgPt(stylus)
      lastPtRef.current = pt
      const { tool, penSize, eraserMode, eraserRadius, shapeType, drawColor, opacity } = stateRef.current

      if (tool === 'eraser') {
        setEraserPos({ x: pt[0], y: pt[1] })
        if (isErasingRef.current) {
          const fn = eraserMode === 'stroke' ? applyStrokeErase : applyStandardErase
          erasingRef.current = fn(erasingRef.current, pt[0], pt[1], eraserRadius)
          if (!eraserRAFRef.current) {
            eraserRAFRef.current = requestAnimationFrame(() => {
              setErasingStrokes([...erasingRef.current])
              eraserRAFRef.current = null
            })
          }
        }
      } else if (tool === 'shape') {
        if (!shapeModeRef.current || !shapeStartRef.current) return
        const [x1, y1] = shapeStartRef.current
        const type = classifyShape(x1, y1, pt[0], pt[1], shapeType)
        const tagMap = { rect: 'rect', ellipse: 'ellipse', line: 'line', triangle: 'polygon' }
        if (!liveShapeRef.current || liveShapeRef.current.type !== type) {
          liveShapeRef.current?.el?.remove()
          const el = document.createElementNS('http://www.w3.org/2000/svg', tagMap[type])
          el.setAttribute('stroke', drawColor); el.setAttribute('stroke-width', penSize)
          el.setAttribute('fill', 'none'); el.setAttribute('opacity', opacity)
          el.setAttribute('stroke-linecap', 'round'); el.setAttribute('stroke-linejoin', 'round')
          el.setAttribute('stroke-dasharray', '6 4')
          if (type === 'rect') el.setAttribute('rx', '3')
          svg.appendChild(el); liveShapeRef.current = { el, type }
        }
        setLiveShapeAttrs(liveShapeRef.current.el, type, x1, y1, pt[0], pt[1])
      } else if (tool === 'select') {
        clearTimeout(holdTimer.current); holdTimer.current = null
        const { isMoving: im, moveStart: ms, selRect: sr } = stateRef.current
        if (im && ms) setMoveOff({ dx: pt[0] - ms.x, dy: pt[1] - ms.y })
        else if (sr) setSelRect(prev => ({ ...prev, x2: pt[0], y2: pt[1] }))
      } else {
        if (!activeStroke.current || !livePathRef.current) return
        activeStroke.current.points.push(pt)
        if (!drawRAFRef.current) {
          drawRAFRef.current = requestAnimationFrame(() => {
            if (activeStroke.current && livePathRef.current) {
              const { penSize, smoothness } = stateRef.current
              const outline = getStroke(activeStroke.current.points, strokeOpts(penSize, false, smoothness))
              livePathRef.current.setAttribute('d', toPath(outline))
            }
            drawRAFRef.current = null
          })
        }
      }
    }

    function onTouchEnd(e) {
      if (t2) {
        if (Date.now() - t2.t < 600 && e.touches.length <= 1) {
          e.preventDefault()
          stateRef.current.onUndo?.()
          t2 = null
          return
        }
        if (e.touches.length === 0) t2 = null
      }
      if (!stylusActiveRef.current) return
      // Safety fallback: if no stylus touches remain, finish regardless of identifier match
      const stylusStillPresent = Array.from(e.touches).some(t => t.touchType === 'stylus')
      if (!stylusStillPresent) {
        e.preventDefault()
        finishStylusStroke()
        return
      }
      const changed = Array.from(e.changedTouches)
      if (!changed.find(t => t.identifier === stylusId)) return
      e.preventDefault()
      finishStylusStroke()
    }

    function onTouchCancel() {
      t2 = null
      if (stylusActiveRef.current) finishStylusStroke()
    }

    svg.addEventListener('touchstart', onTouchStart, { passive: false })
    svg.addEventListener('touchmove', onTouchMove, { passive: false })
    svg.addEventListener('touchend', onTouchEnd, { passive: false })
    svg.addEventListener('touchcancel', onTouchCancel, { passive: true })
    return () => {
      svg.removeEventListener('touchstart', onTouchStart)
      svg.removeEventListener('touchmove', onTouchMove)
      svg.removeEventListener('touchend', onTouchEnd)
      svg.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [readonly])


  const drawColor      = adaptColor(penColor, bgColor)
  const strokes        = page.strokes
  const displayStrokes = erasingStrokes ?? strokes

  stateRef.current = {
    tool, drawColor, penSize, opacity, smoothness, shapeType, eraserMode, eraserRadius, strokes, onStrokesChange, onUndo, onCopy, clipboard,
    selectedIndices, selRect, isMoving, moveStart, moveOff,
  }

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
      el.setAttribute('stroke', drawColor)
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

  function showActionToast(msg) {
    setActionToast(msg)
    setActionToastKey(k => k + 1)
    clearTimeout(actionToastTimer.current)
    actionToastTimer.current = setTimeout(() => setActionToast(null), 1400)
  }

  function handleDuplicate() {
    const OFFSET = 22
    const dupes = [...selectedIndices].map(i => {
      const s = strokes[i]
      if (s.shape) return { ...s, x1: s.x1 + OFFSET, y1: s.y1 + OFFSET, x2: s.x2 + OFFSET, y2: s.y2 + OFFSET }
      return { ...s, points: s.points.map(p => [p[0] + OFFSET, p[1] + OFFSET, p[2]]) }
    })
    const base = strokes.length
    onStrokesChange([...strokes, ...dupes])
    setSelectedIndices(new Set(dupes.map((_, i) => base + i)))
    showActionToast('Duplicated')
  }

  function handleCopySelected() {
    onCopy?.([...selectedIndices].map(i => strokes[i]))
    setSelectedIndices(new Set())
    showActionToast('Copied')
  }

  function handlePaste(px, py) {
    if (!clipboard?.length) return
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const s of clipboard) {
      if (s.shape) {
        minX = Math.min(minX, s.x1, s.x2); maxX = Math.max(maxX, s.x1, s.x2)
        minY = Math.min(minY, s.y1, s.y2); maxY = Math.max(maxY, s.y1, s.y2)
      } else {
        for (const p of s.points) {
          if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]
          if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]
        }
      }
    }
    const dx = px - (minX + maxX) / 2, dy = py - (minY + maxY) / 2
    const pasted = clipboard.map(s => {
      if (s.shape) return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }
      return { ...s, points: s.points.map(p => [p[0] + dx, p[1] + dy, p[2]]) }
    })
    const base = strokes.length
    onStrokesChange([...strokes, ...pasted])
    setSelectedIndices(new Set(pasted.map((_, i) => base + i)))
    setPasteMenu(null)
  }

  function doErase(cx, cy) {
    const fn = eraserMode === 'stroke' ? applyStrokeErase : applyStandardErase
    erasingRef.current = fn(erasingRef.current, cx, cy, eraserRadius)
    if (!eraserRAFRef.current) {
      eraserRAFRef.current = requestAnimationFrame(() => {
        setErasingStrokes([...erasingRef.current])
        eraserRAFRef.current = null
      })
    }
  }

  function onPointerDown(e) {
    if (e.pointerType === 'touch') return
    if (stylusActiveRef.current) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (pasteMenu) { setPasteMenu(null); return }
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = getPoint(e)
    lastPtRef.current = pt

    if (tool === 'eraser') {
      isErasingRef.current = true
      erasingRef.current   = strokes
      setEraserPos({ x: pt[0], y: pt[1] })
      doErase(pt[0], pt[1])
      return
    }

    if (tool === 'select') {
      if (selectedIndices.size > 0) {
        const sb = getSelBounds()
        if (sb && pt[0] >= sb.x1 && pt[0] <= sb.x2 && pt[1] >= sb.y1 && pt[1] <= sb.y2) {
          setIsMoving(true); setMoveStart({ x: pt[0], y: pt[1] }); setMoveOff({ dx: 0, dy: 0 }); return
        }
      }
      setSelectedIndices(new Set())
      setSelRect({ x1: pt[0], y1: pt[1], x2: pt[0], y2: pt[1] })
      setIsMoving(false)
      if (clipboard?.length > 0) {
        holdTimer.current = setTimeout(() => setPasteMenu({ x: pt[0], y: pt[1] }), 600)
      }
      return
    }

    if (tool === 'shape') {
      shapeStartRef.current = pt; shapeModeRef.current = false; setShapeHeld(false)
      holdTimer.current = setTimeout(() => { shapeModeRef.current = true; setShapeHeld(true) }, 450)
    } else {
      activeStroke.current = { points: [pt], color: drawColor, size: penSize, opacity, smoothing }
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('fill', drawColor)
      path.setAttribute('fill-opacity', opacity)
      path.setAttribute('stroke', 'none')
      livePathRef.current = path
      svgRef.current.appendChild(path)
    }
  }

  function onPointerMove(e) {
    if (e.pointerType === 'touch') return
    if (stylusActiveRef.current) return
    const pt = getPoint(e)
    lastPtRef.current = pt

    if (tool === 'eraser') {
      setEraserPos({ x: pt[0], y: pt[1] })
      if (isErasingRef.current) doErase(pt[0], pt[1])
      return
    }

    if (tool === 'select') {
      clearTimeout(holdTimer.current); holdTimer.current = null
      if (isMoving && moveStart) setMoveOff({ dx: pt[0] - moveStart.x, dy: pt[1] - moveStart.y })
      else if (selRect) setSelRect(prev => ({ ...prev, x2: pt[0], y2: pt[1] }))
      return
    }

    if (tool === 'shape') {
      if (!shapeModeRef.current || !shapeStartRef.current) return
      updateLiveShape(shapeStartRef.current[0], shapeStartRef.current[1], pt[0], pt[1])
    } else {
      if (!activeStroke.current || !livePathRef.current) return
      activeStroke.current.points.push(pt)
      if (!drawRAFRef.current) {
        drawRAFRef.current = requestAnimationFrame(() => {
          if (activeStroke.current && livePathRef.current) {
            const outline = getStroke(activeStroke.current.points, strokeOpts(penSize, false, smoothness))
            livePathRef.current.setAttribute('d', toPath(outline))
          }
          drawRAFRef.current = null
        })
      }
    }
  }

  function onPointerUp(e) {
    if (e?.pointerType === 'touch') return
    if (stylusActiveRef.current) return
    clearTimeout(holdTimer.current)

    if (tool === 'eraser') {
      if (eraserRAFRef.current) { cancelAnimationFrame(eraserRAFRef.current); eraserRAFRef.current = null }
      isErasingRef.current = false
      const final = erasingRef.current
      erasingRef.current = null
      setEraserPos(null)
      if (final !== null) {
        setErasingStrokes(final) // hold preview until parent re-renders; effect clears it
        onStrokesChange(final)
      } else {
        setErasingStrokes(null)
      }
      return
    }

    if (tool === 'select') {
      if (isMoving) {
        const { dx, dy } = moveOff
        const newStrokes = strokes.map((s, i) => {
          if (!selectedIndices.has(i)) return s
          if (s.shape) return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }
          return { ...s, points: s.points.map(p => [p[0] + dx, p[1] + dy, p[2]]) }
        })
        onStrokesChange(newStrokes)
        setIsMoving(false); setMoveStart(null); setMoveOff({ dx: 0, dy: 0 })
      } else if (selRect) {
        const hits = new Set()
        strokes.forEach((s, i) => { if (rectsIntersect(selRect, strokeBounds(s))) hits.add(i) })
        setSelectedIndices(hits); setSelRect(null)
      }
      return
    }

    if (tool === 'shape') {
      if (shapeModeRef.current && shapeStartRef.current && lastPtRef.current) {
        const [x1, y1] = shapeStartRef.current, [x2, y2] = lastPtRef.current
        clearLiveShape()
        const type = classifyShape(x1, y1, x2, y2, shapeType)
        if (Math.abs(x2 - x1) > 5 || Math.abs(y2 - y1) > 5)
          onStrokesChange([...strokes, { shape: type, x1, y1, x2, y2, color: drawColor, size: penSize, opacity }])
      } else { clearLiveShape() }
      shapeModeRef.current = false; shapeStartRef.current = null; setShapeHeld(false)
    } else {
      if (!activeStroke.current) return
      if (drawRAFRef.current) { cancelAnimationFrame(drawRAFRef.current); drawRAFRef.current = null }
      livePathRef.current?.remove(); livePathRef.current = null
      const s = activeStroke.current; activeStroke.current = null
      if (s.points.length >= 1) {
        const points = s.points.length === 1 ? [s.points[0], s.points[0]] : s.points
        onStrokesChange([...strokes, { ...s, points }])
      }
    }
  }

  function onPointerCancel(e) {
    if (e?.pointerType === 'touch') return
    if (stylusActiveRef.current) return
    if (eraserRAFRef.current) { cancelAnimationFrame(eraserRAFRef.current); eraserRAFRef.current = null }
    if (drawRAFRef.current) { cancelAnimationFrame(drawRAFRef.current); drawRAFRef.current = null }
    clearTimeout(holdTimer.current)
    clearLiveShape()
    shapeModeRef.current = false; shapeStartRef.current = null; setShapeHeld(false)
    if (activeStroke.current) {
      livePathRef.current?.remove(); livePathRef.current = null
      const s = activeStroke.current; activeStroke.current = null
      if (s.points.length >= 1) {
        const points = s.points.length === 1 ? [s.points[0], s.points[0]] : s.points
        onStrokesChange([...strokes, { ...s, points }])
      }
    }
    if (isErasingRef.current) {
      isErasingRef.current = false
      const final = erasingRef.current
      erasingRef.current = null
      setEraserPos(null)
      if (final !== null) {
        setErasingStrokes(final)
        onStrokesChange(final)
      } else {
        setErasingStrokes(null)
      }
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
  const cursor    = readonly ? 'default' : tool === 'eraser' ? 'none' : isMoving ? 'grabbing' : 'crosshair'

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {shapeHeld && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)', border: `1px solid ${penColor}66`,
          borderRadius: 20, padding: '4px 14px', fontSize: 11, color: penColor,
          pointerEvents: 'none', zIndex: 10,
        }}>
          Shape mode · drag to draw
        </div>
      )}

      {/* Selection context menu */}
      {(() => {
        const smb = (tool === 'select' && selectedIndices.size > 0 && !isMoving && !selRect) ? getSelBounds() : null
        if (!smb) return null
        const cmBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, padding: '4px 8px', borderRadius: 6 }
        return (
          <div style={{
            position: 'absolute',
            left: ((smb.x1 + smb.x2) / 2) + 'px',
            top: (smb.y1 > 60 ? smb.y1 - 48 : smb.y2 + 10) + 'px',
            transform: 'translateX(-50%)', zIndex: 50,
            display: 'flex', alignItems: 'center', gap: 1,
            background: 'rgba(18,19,30,0.96)', backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
            padding: '4px 6px', boxShadow: '0 4px 20px rgba(0,0,0,0.55)',
          }}>
            <button onClick={handleDuplicate} style={{ ...cmBtn, color: 'rgba(255,255,255,0.82)' }}>Duplicate</button>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
            <button onClick={handleCopySelected} style={{ ...cmBtn, color: 'rgba(255,255,255,0.82)' }}>Copy</button>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
            <button onClick={() => { onStrokesChange(strokes.filter((_, i) => !selectedIndices.has(i))); setSelectedIndices(new Set()); showActionToast('Deleted') }}
              style={{ ...cmBtn, color: '#fb7185' }}>Delete</button>
          </div>
        )
      })()}

      {/* Action toast */}
      {actionToast && (
        <div key={actionToastKey} style={{
          position: 'fixed', bottom: 52, left: '50%',
          animation: '_undo-pop 1.4s ease forwards',
          zIndex: 9999, pointerEvents: 'none',
          background: 'rgba(20,21,32,0.95)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20, padding: '8px 20px',
          fontSize: 13, color: 'rgba(255,255,255,0.82)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        }}>
          {actionToast}
        </div>
      )}

      {/* Paste context menu */}
      {pasteMenu && (
        <>
          <div onClick={() => setPasteMenu(null)} style={{ position: 'absolute', inset: 0, zIndex: 48 }} />
          <div style={{
            position: 'absolute',
            left: pasteMenu.x + 'px',
            top: (pasteMenu.y > 60 ? pasteMenu.y - 50 : pasteMenu.y + 10) + 'px',
            transform: 'translateX(-50%)', zIndex: 50,
            background: 'rgba(18,19,30,0.96)', backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
            padding: '4px 6px', boxShadow: '0 4px 20px rgba(0,0,0,0.55)',
          }}>
            <button onClick={() => handlePaste(pasteMenu.x, pasteMenu.y)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, padding: '4px 8px', borderRadius: 6, color: 'rgba(255,255,255,0.82)' }}>Paste</button>
          </div>
        </>
      )}

      <svg
        ref={svgRef}
        tabIndex={tool === 'select' && !readonly ? 0 : undefined}
        style={{ width: '100%', height: pageH, display: 'block', touchAction: 'pan-y', cursor, outline: 'none' }}
        onPointerDown={readonly ? undefined : onPointerDown}
        onPointerMove={readonly ? undefined : onPointerMove}
        onPointerUp={readonly ? undefined : onPointerUp}
        onPointerCancel={readonly ? undefined : onPointerCancel}
        onPointerLeave={readonly ? undefined : (e) => { onPointerUp(e); setEraserPos(null) }}
        onKeyDown={readonly ? undefined : onKeyDown}
      >
        <PageTemplate pageId={page.id} template={template} bgColor={bgColor} lineSpacing={lineSpacing} />

        {displayStrokes.map((s, i) => {
          const sel = selectedIndices.has(i)
          const dx  = sel && isMoving ? moveOff.dx : 0
          const dy  = sel && isMoving ? moveOff.dy : 0
          const tf  = (dx || dy) ? `translate(${dx},${dy})` : undefined
          const rc = adaptColor(s.color, bgColor)
          if (s.shape) return <g key={i} transform={tf}>{renderShape({ ...s, color: rc })}</g>
          const outline = getStroke(s.points, strokeOpts(s.size, true, s.smoothing ?? 0.5))
          return (
            <g key={i} transform={tf}>
              <path fill={rc} fillOpacity={s.opacity ?? 1} stroke="none" d={toPath(outline)} />
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
        {tool === 'eraser' && eraserPos && (
          <circle
            cx={eraserPos.x} cy={eraserPos.y} r={eraserRadius}
            fill="none" stroke="rgba(128,128,128,0.55)" strokeWidth={1.5} strokeDasharray="4 3"
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  )
}

// ─── Main multi-page canvas ────────────────────────────────────────────────────
export default function NoteCanvas({
  pages, onPagesChange,
  template = 'blank', bgColor = '#f8f7f2', lineSpacing = 32,
  orientation = 'portrait', onSettingsChange,
  readonly = false,
}) {
  const scrollRef        = useRef()
  const addingPageRef    = useRef(false)
  const undoStackRef     = useRef([])
  const toolMemoryRef    = useRef({
    pen:         { color: '#111827', size: 5 },
    highlighter: { color: '#f59e0b', size: 22 },
  })

  const [penColor,     setPenColor]     = useState('#111827')
  const [penSize,      setPenSize]      = useState(5)
  const [tool,         setTool]         = useState('pen')
  const [shapeType,    setShapeType]    = useState('rect')
  const [eraserMode,   setEraserMode]   = useState('standard')
  const [smoothness,   setSmoothness]   = useState(0.5)
  const [customColor,  setCustomColor]  = useState('#111827')
  const [customBg,     setCustomBg]     = useState(bgColor)
  const [showSettings, setShowSettings] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [undoToast,    setUndoToast]    = useState(false)
  const [undoToastKey, setUndoToastKey] = useState(0)
  const [clipboard,    setClipboard]    = useState(null)
  const undoToastTimer = useRef(null)

  function handleSetTool(t) {
    const mem = toolMemoryRef.current
    if (tool === 'pen' || tool === 'highlighter') mem[tool] = { color: penColor, size: penSize }
    if (t === 'pen' || t === 'highlighter') {
      setPenColor(mem[t].color)
      setCustomColor(mem[t].color)
      setPenSize(mem[t].size)
    }
    setTool(t)
  }

  const pageH        = PAGE_HEIGHTS[orientation]    ?? 1200
  const maxW         = PAGE_MAX_WIDTHS[orientation] ?? 900
  const opacity      = tool === 'highlighter' ? 0.35 : 1
  const eraserRadius = penSize * 4
  const drawColor    = penColor
  const totalStrokes = pages.reduce((s, p) => s + p.strokes.length, 0)

  function addPage() {
    onPagesChange([...pages, { id: `page-${Date.now()}`, strokes: [] }])
  }

  function deletePage(idx) {
    if (pages.length <= 1) return
    undoStackRef.current = undoStackRef.current
      .filter(e => e.pageIdx !== idx)
      .map(e => e.pageIdx > idx ? { ...e, pageIdx: e.pageIdx - 1 } : e)
    onPagesChange(pages.filter((_, i) => i !== idx))
  }

  function handleUndo() {
    if (undoStackRef.current.length === 0) return
    const { pageIdx, strokes } = undoStackRef.current.pop()
    onPagesChange(pages.map((p, i) => i === pageIdx ? { ...p, strokes } : p))
    setUndoToast(true)
    setUndoToastKey(k => k + 1)
    clearTimeout(undoToastTimer.current)
    undoToastTimer.current = setTimeout(() => setUndoToast(false), 1400)
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
      cursor: 'pointer', pointerEvents: 'auto',
      background: active ? 'rgba(255,255,255,0.1)' : 'none',
      color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
      borderColor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
    }
  }

  const sep = <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

  const outerStyle = isFullscreen
    ? { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', userSelect: 'none', background: 'var(--bg-elevated)' }
    : { display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none' }

  return (
    <div style={outerStyle}>
      {!readonly && (
        <>
          {/* ── Minimal top bar ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
            borderBottom: '1px solid var(--border)', flexShrink: 0,
            background: 'var(--bg-elevated)',
          }}>
            <button onClick={handleUndo} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px',
              borderRadius: 7, border: '1px solid var(--border)', background: 'none',
              color: undoStackRef.current.length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
              cursor: undoStackRef.current.length === 0 ? 'not-allowed' : 'pointer', fontSize: 12,
            }}>
              <Undo2 size={12} /> Undo
            </button>
            <button onClick={() => totalStrokes > 0 && onPagesChange(pages.map(p => ({ ...p, strokes: [] })))} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px',
              borderRadius: 7, border: '1px solid var(--border)', background: 'none',
              color: totalStrokes === 0 ? 'var(--text-muted)' : 'var(--accent-red)',
              cursor: totalStrokes === 0 ? 'not-allowed' : 'pointer', fontSize: 12,
            }}>
              <Trash2 size={12} /> Clear
            </button>
            <div style={{ flex: 1 }} />
            <button title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={() => setIsFullscreen(v => !v)} style={tbtn(isFullscreen)}>
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button title="Page settings" onClick={() => setShowSettings(v => !v)} style={tbtn(showSettings)}>
              <SlidersHorizontal size={13} />
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
                    background: orientation === o ? 'rgba(91,140,255,0.15)' : 'none',
                    color: orientation === o ? 'var(--accent-blue)' : 'var(--text-muted)',
                    borderColor: orientation === o ? 'rgba(91,140,255,0.3)' : 'transparent',
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
                    background: template === t ? 'rgba(91,140,255,0.15)' : 'none',
                    color: template === t ? 'var(--accent-blue)' : 'var(--text-muted)',
                    borderColor: template === t ? 'rgba(91,140,255,0.3)' : 'transparent',
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
                        background: lineSpacing === val ? 'rgba(91,140,255,0.15)' : 'none',
                        color: lineSpacing === val ? 'var(--accent-blue)' : 'var(--text-muted)',
                        borderColor: lineSpacing === val ? 'rgba(91,140,255,0.3)' : 'transparent',
                      }}>{label}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Canvas area ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Floating toolbar */}
        {!readonly && (
          <div style={{
            position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
            zIndex: 100, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            background: 'rgba(13,14,22,0.93)', backdropFilter: 'blur(16px) saturate(1.4)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: '7px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            maxWidth: 'calc(100% - 28px)',
            pointerEvents: 'none',
          }}>
            {/* Tool buttons */}
            <div style={{ display: 'flex', gap: 3 }}>
              {TOOLS.map(([t, Icon, label]) => (
                <button key={t} title={label} onClick={() => handleSetTool(t)} style={tbtn(tool === t)}>
                  <Icon size={13} />
                </button>
              ))}
            </div>

            {tool === 'shape' && (
              <>
                {sep}
                <div style={{ display: 'flex', gap: 3 }}>
                  {SHAPE_TYPES.map(([t, Icon, label]) => (
                    <button key={t} title={label} onClick={() => setShapeType(t)} style={tbtn(shapeType === t)}>
                      <Icon size={13} />
                    </button>
                  ))}
                </div>
              </>
            )}

            {tool === 'eraser' && (
              <>
                {sep}
                <div style={{ display: 'flex', gap: 3 }}>
                  {ERASER_MODES.map(([m, label]) => (
                    <button key={m} onClick={() => setEraserMode(m)} style={{
                      padding: '4px 9px', borderRadius: 6, border: '1px solid transparent',
                      cursor: 'pointer', fontSize: 11, pointerEvents: 'auto',
                      background: eraserMode === m ? 'rgba(255,255,255,0.1)' : 'none',
                      color: eraserMode === m ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.38)',
                      borderColor: eraserMode === m ? 'rgba(255,255,255,0.18)' : 'transparent',
                    }}>{label}</button>
                  ))}
                </div>
              </>
            )}

            {sep}

            {/* Colors */}
            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              {PRESETS.map(c => {
                const active = penColor === c
                return (
                  <button key={c} onClick={() => setPenColor(c)} style={{
                    width: 16, height: 16, borderRadius: '50%', background: c,
                    border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                    pointerEvents: 'auto',
                    outline: active ? `2.5px solid ${c}` : '2px solid transparent',
                    outlineOffset: 2, transform: active ? 'scale(1.25)' : 'scale(1)',
                    transition: 'transform 0.12s',
                  }} />
                )
              })}
              <div style={{ position: 'relative', width: 16, height: 16, flexShrink: 0, pointerEvents: 'auto' }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                  outline: !PRESETS.includes(penColor) ? '2.5px solid white' : '2px solid transparent',
                  outlineOffset: 2, transform: !PRESETS.includes(penColor) ? 'scale(1.25)' : 'scale(1)',
                  transition: 'transform 0.12s',
                }} />
                <input type="color" value={customColor}
                  onChange={e => { setCustomColor(e.target.value); setPenColor(e.target.value) }}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', pointerEvents: 'auto' }} />
              </div>
            </div>

            {sep}

            {/* Sizes */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {(tool === 'highlighter' ? HIGHLIGHTER_SIZES : SIZES).map((s, idx) => {
                const DOT = [7, 10, 14, 19]
                const d = DOT[idx]
                return (
                  <button key={s} onClick={() => setPenSize(s)} style={{
                    width: d, height: d, borderRadius: '50%',
                    background: penSize === s ? penColor : 'rgba(255,255,255,0.28)',
                    border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                    pointerEvents: 'auto', transition: 'background 0.12s',
                  }} />
                )
              })}
            </div>

            {sep}

            {/* Smoothness */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', userSelect: 'none' }}>Rigid</span>
              <input
                type="range" min="0" max="1" step="0.05" value={smoothness}
                onChange={e => setSmoothness(parseFloat(e.target.value))}
                style={{ width: 68, accentColor: penColor, cursor: 'pointer', pointerEvents: 'auto' }}
              />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', userSelect: 'none' }}>Smooth</span>
            </div>
          </div>
        )}

        {/* Undo toast */}
        <style>{`@keyframes _undo-pop{0%{opacity:0;transform:translateX(-50%) scale(0.88)}12%{opacity:1;transform:translateX(-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translateX(-50%) scale(0.95)}}`}</style>
        {undoToast && (
          <div key={undoToastKey} style={{
            position: 'fixed', bottom: 52, left: '50%',
            animation: '_undo-pop 1.4s ease forwards',
            zIndex: 9999, pointerEvents: 'none',
            background: 'rgba(20,21,32,0.95)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 20, padding: '8px 20px',
            display: 'flex', alignItems: 'center', gap: 7,
            fontSize: 13, color: 'rgba(255,255,255,0.82)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          }}>
            <Undo2 size={13} style={{ opacity: 0.7 }} /> Undo
          </div>
        )}

        {/* Scroll container */}
        <div ref={scrollRef} onScroll={onScroll} style={{ height: '100%', overflowY: 'auto', background: 'var(--canvas-outer, #14141e)' }}>
          <div style={{ padding: readonly ? 24 : '72px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {pages.map((page, pageIdx) => (
              <div key={page.id} style={{ width: '100%', maxWidth: maxW, flexShrink: 0 }}>
                <PageCanvas
                  page={page}
                  pageH={pageH}
                  onStrokesChange={newStrokes => {
                    undoStackRef.current.push({ pageIdx, strokes: pages[pageIdx].strokes })
                    onPagesChange(pages.map((p, i) => i === pageIdx ? { ...p, strokes: newStrokes } : p))
                  }}
                  penColor={penColor}
                  penSize={penSize}
                  tool={tool}
                  shapeType={shapeType}
                  opacity={opacity}
                  template={template}
                  bgColor={bgColor}
                  lineSpacing={lineSpacing}
                  eraserMode={eraserMode}
                  eraserRadius={eraserRadius}
                  smoothness={smoothness}
                  readonly={readonly}
                  onUndo={handleUndo}
                  clipboard={clipboard}
                  onCopy={strokes => setClipboard(strokes)}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 10 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.5px' }}>{pageIdx + 1}</span>
                  {!readonly && pages.length > 1 && (
                    <button onClick={() => deletePage(pageIdx)} title="Delete page" style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                      color: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center',
                    }}>
                      <Trash2 size={11} />
                    </button>
                  )}
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
    </div>
  )
}
