import { useRef, useState, useEffect, useLayoutEffect, forwardRef, useImperativeHandle } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import { getStroke } from 'perfect-freehand'
import { useIsMobile } from '../utils/useIsMobile'
import {
  Undo2, Redo2, Trash2, PenLine, Highlighter, Shapes, MousePointer2, Eraser,
  Square, Circle, Minus, Triangle, SlidersHorizontal, Plus, Maximize2, Minimize2,
} from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────────────────────────
const PAGE_HEIGHTS    = { portrait: 1200, landscape: 520 }
const PAGE_MAX_WIDTHS = { portrait: 900,  landscape: 1200 }
const PRESETS         = ['#111827', '#5b8cff', '#a78bfa', '#f59e0b', '#34d399', '#fb7185']
const DEFAULT_PEN_PRESETS    = [3, 5, 8]
const DEFAULT_HL_PRESETS     = [12, 18, 28]
const DEFAULT_ERASER_PRESETS = [8, 20, 40]
const TOOLS           = [
  ['pen',         PenLine,       'Pen',                                        '#5b8cff'],
  ['eraser',      Eraser,        'Eraser',                                     '#e2e8f0'],
  ['highlighter', Highlighter,   'Highlighter',                                '#fbbf24'],
  ['shape',       Shapes,        'Shapes',                                     '#34d399'],
  ['select',      MousePointer2, 'Select · drag to move · Delete to remove',   '#a78bfa'],
]
const SHAPE_TYPES  = [['rect', Square, 'Rectangle'], ['ellipse', Circle, 'Ellipse'], ['line', Minus, 'Line'], ['triangle', Triangle, 'Triangle']]
const ERASER_MODES = [['standard', 'Standard'], ['stroke', 'Stroke']]
const TEMPLATES    = ['blank', 'lined', 'dotted', 'grid']
const BG_COLORS    = ['#ffffff', '#f5f0e8', '#fef9c3', '#e8f0fe', '#1c1c24', '#0b0c13']
const SPACINGS     = [[32, 'Compact'], [48, 'Normal'], [64, 'Wide']]

// ─── Drawing utils ─────────────────────────────────────────────────────────────
function strokeOpts(size, last, smoothing = 0.5) {
  return { size, thinning: 0.55, smoothing, streamline: smoothing, simulatePressure: false, last }
}

// Capture-time point compaction: integer-round coords and drop points that haven't moved
// far enough from the last kept one. Applied identically to the live preview and the saved
// data (activeStroke.points IS what gets persisted), so there is no reflow when the pen lifts.
const MIN_PT_DIST = 1.5
function roundPt(pt) { return [Math.round(pt[0]), Math.round(pt[1]), pt[2]] }
function addStrokePoint(stroke, pt) {
  const x = Math.round(pt[0]), y = Math.round(pt[1])
  const last = stroke.points[stroke.points.length - 1]
  if (last && Math.hypot(x - last[0], y - last[1]) < MIN_PT_DIST) return
  stroke.points.push([x, y, pt[2]])
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

// Clip a freehand polyline against an eraser circle, returning the runs that survive.
// Works on segments (not stored points) so erase precision is independent of point density —
// it removes exactly the span under the eraser and splits at the circle boundary.
function erasePolyline(points, cx, cy, radius) {
  const r2 = radius * radius
  const inside = (x, y) => { const dx = x - cx, dy = y - cy; return dx * dx + dy * dy <= r2 }
  if (points.length === 1) return inside(points[0][0], points[0][1]) ? [] : [points]

  const runs = []
  let cur = []
  const flush = () => { if (cur.length >= 2) runs.push(cur); cur = [] }

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1]
    const ax = a[0], ay = a[1], dx = b[0] - ax, dy = b[1] - ay
    const A = dx * dx + dy * dy
    const fx = ax - cx, fy = ay - cy
    const B = 2 * (fx * dx + fy * dy)
    const C = fx * fx + fy * fy - r2
    const at = (t) => [Math.round(ax + t * dx), Math.round(ay + t * dy), a[2]]

    let tEnter = null, tExit = null
    if (A >= 1e-9) {
      const disc = B * B - 4 * A * C
      if (disc >= 0) {
        const sq = Math.sqrt(disc)
        const lo = Math.max(0, Math.min(1, (-B - sq) / (2 * A)))
        const hi = Math.max(0, Math.min(1, (-B + sq) / (2 * A)))
        if (hi > lo) { tEnter = lo; tExit = hi }
      }
    }

    if (tEnter === null) {
      // Whole segment outside the eraser — keep it
      if (cur.length === 0) cur.push(a)
      cur.push(b)
    } else {
      // Segment crosses the eraser: keep [0, tEnter] and [tExit, 1], drop the middle
      if (tEnter > 0) {
        if (cur.length === 0) cur.push(a)
        cur.push(at(tEnter))
      }
      flush()
      if (tExit < 1) {
        cur.push(at(tExit))
        cur.push(b)
      }
    }
  }
  flush()
  return runs
}

function applyStandardErase(strokes, cx, cy, radius) {
  const result = []
  for (const s of strokes) {
    if (s.shape === 'line') {
      // Lines can be split — erase only the touched segment
      result.push(...splitLineAtCircle(s, cx, cy, radius))
    } else if (s.shape) {
      // Closed shapes: erase whole shape only if eraser touches the actual border
      if (!closedShapeTouched(s, cx, cy, radius)) result.push(s)
    } else {
      for (const run of erasePolyline(s.points, cx, cy, radius)) {
        result.push({ ...s, points: run })
      }
    }
  }
  return result
}

function applyStrokeErase(strokes, cx, cy, radius) {
  const r2 = radius * radius
  return strokes.filter(s => {
    if (s.shape === 'line') return distToSegment(cx, cy, s.x1, s.y1, s.x2, s.y2) > radius
    if (s.shape) return !closedShapeTouched(s, cx, cy, radius)
    const pts = s.points
    if (pts.length === 1) { const dx = pts[0][0] - cx, dy = pts[0][1] - cy; return dx * dx + dy * dy > r2 }
    // Test segments, not just stored points, so the eraser can't slip between sparse points
    for (let i = 0; i < pts.length - 1; i++) {
      if (distToSegment(cx, cy, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= radius) return false
    }
    return true
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

// Snap lines to 45° multiples and rects/ellipses to squares within tolerance
function snapShapeCoords(type, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1
  if (type === 'line') {
    const len = Math.hypot(dx, dy)
    if (len < 4) return [x2, y2]
    const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI
    const nearest  = Math.round(angleDeg / 45) * 45
    if (Math.abs(angleDeg - nearest) < 5) {
      const rad = nearest * Math.PI / 180
      return [x1 + Math.cos(rad) * len, y1 + Math.sin(rad) * len]
    }
  }
  if (type === 'rect' || type === 'ellipse') {
    const w = Math.abs(dx), h = Math.abs(dy)
    if (w > 0 && h > 0) {
      const ratio = w / h
      if (ratio > 0.92 && ratio < 1.09) {
        const size = Math.max(w, h)
        return [x1 + Math.sign(dx) * size, y1 + Math.sign(dy) * size]
      }
    }
  }
  return [x2, y2]
}

function detectShape(points) {
  if (points.length < 12) return null
  const first = points[0], last = points[points.length - 1]
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of points) {
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  const w = maxX - minX, h = maxY - minY
  const diagonal = Math.hypot(w, h)
  if (diagonal < 30) return null
  const gap = Math.hypot(last[0] - first[0], last[1] - first[1])
  const isClosed = gap / diagonal < 0.25

  if (isClosed && w >= 30 && h >= 30) {
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
    const a = w / 2, b = h / 2
    let ellipseErr = 0
    for (const [x, y] of points) {
      const nx = (x - cx) / a, ny = (y - cy) / b
      ellipseErr += Math.abs(Math.sqrt(nx * nx + ny * ny) - 1)
    }
    if (ellipseErr / points.length < 0.15)
      return { shape: 'ellipse', x1: minX, y1: minY, x2: maxX, y2: maxY }

    let rectErr = 0
    for (const [x, y] of points) {
      const dL = Math.abs(x - minX), dR = Math.abs(x - maxX)
      const dT = Math.abs(y - minY), dB = Math.abs(y - maxY)
      rectErr += Math.min(dL, dR, dT, dB)
    }
    if (rectErr / points.length / Math.min(w, h) < 0.10)
      return { shape: 'rect', x1: minX, y1: minY, x2: maxX, y2: maxY }
  }

  if (!isClosed) {
    const dx = last[0] - first[0], dy = last[1] - first[1]
    const len = Math.hypot(dx, dy)
    if (len >= 50) {
      let lineErr = 0
      for (const [x, y] of points) {
        const t = ((x - first[0]) * dx + (y - first[1]) * dy) / (len * len)
        lineErr += Math.hypot(x - (first[0] + t * dx), y - (first[1] + t * dy))
      }
      if (lineErr / points.length / len < 0.05) {
        const [sx2, sy2] = snapShapeCoords('line', first[0], first[1], last[0], last[1])
        return { shape: 'line', x1: first[0], y1: first[1], x2: sx2, y2: sy2 }
      }
    }
  }

  return null
}

// ─── Selection utils ───────────────────────────────────────────────────────────
function shiftStroke(s, dx, dy) {
  if (s.shape) return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }
  return { ...s, points: s.points.map(p => [p[0] + dx, p[1] + dy, p[2]]) }
}

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
  const lc    = bgLum > 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.13)'
  const pid   = t => `p-${pageId}-${t}`
  return (
    <>
      <defs>
        {template === 'lined' && (
          <pattern id={pid('lined')} x="0" y="0" width="3000" height={lineSpacing} patternUnits="userSpaceOnUse">
            <line x1="0" y1={lineSpacing - 0.5} x2="3000" y2={lineSpacing - 0.5} stroke={lc} strokeWidth="0.8" />
          </pattern>
        )}
        {template === 'dotted' && (
          <pattern id={pid('dotted')} x={lineSpacing / 2} y={lineSpacing / 2} width={lineSpacing} height={lineSpacing} patternUnits="userSpaceOnUse">
            <circle cx="0" cy="0" r="1.4" fill={lc} />
          </pattern>
        )}
        {template === 'grid' && (
          <pattern id={pid('grid')} x="0" y="0" width={lineSpacing} height={lineSpacing} patternUnits="userSpaceOnUse">
            <path d={`M ${lineSpacing} 0 L 0 0 0 ${lineSpacing}`} fill="none" stroke={lc} strokeWidth="0.8" />
          </pattern>
        )}
      </defs>
      <rect width="100%" height="100%" fill={bgColor} />
      {template !== 'blank' && <rect width="100%" height="100%" fill={`url(#${pid(template)})`} />}
      {template === 'lined' && (
        <line x1="65" y1="0" x2="65" y2="100%" stroke={bgLum > 0.5 ? 'rgba(200,50,50,0.35)' : 'rgba(255,110,110,0.45)'} strokeWidth="1" />
      )}
    </>
  )
}

// ─── Single page canvas ────────────────────────────────────────────────────────
function PageCanvas({ page, pageH, maxW, pageIdx, totalPages, onStrokesChange, onTransferStrokes, penColor, penSize, tool, shapeType, opacity, smoothness, template, bgColor, lineSpacing, eraserMode, eraserRadius, readonly, onUndo, onRedo, onPinch, onPinchEnd, zoom = 1, clipboard, onCopy, pageBackground }) {
  const svgRef        = useRef()
  const livePathRef   = useRef(null)
  const liveShapeRef  = useRef(null)
  const activeStroke  = useRef(null)
  const holdTimer          = useRef(null)
  const pasteHoldStartRef  = useRef(null)
  const shapeModeRef  = useRef(false)
  const shapeStartRef = useRef(null)
  const shapeRAFRef   = useRef(null)
  const penHoldTimerRef   = useRef(null)
  const penSnapRef        = useRef(null)
  const penSnapAnchorRef  = useRef(null)
  const penStillPtRef     = useRef(null)
  const penLiveShapeRef   = useRef(null)
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

  // Clear stale selection indices when strokes shrink (e.g. after undo removes duplicated strokes)
  useEffect(() => {
    const len = page.strokes.length
    setSelectedIndices(prev => {
      const valid = [...prev].filter(i => i < len)
      return valid.length === prev.size ? prev : new Set(valid)
    })
  }, [page.strokes.length])
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

  useEffect(() => {
    if (readonly) return
    const svg = svgRef.current
    if (!svg) return

    let t2 = null       // 2-finger tap/pinch tracker
    let t3 = null       // 3-finger tap tracker: { t, moved }
    let stylusId = null // active Apple Pencil touch identifier

    function svgPt(touch) {
      const r  = svg.getBoundingClientRect()
      const vb = svg.viewBox.baseVal
      const sx = vb.width / r.width
      const sy = vb.height / r.height
      return [(touch.clientX - r.left) * sx, (touch.clientY - r.top) * sy, touch.force || 0.5]
    }

    function finishStylusStroke() {
      stylusActiveRef.current = false
      stylusId = null
      clearTimeout(holdTimer.current)
      const { tool, strokes, onStrokesChange, penSize, shapeType, drawColor, opacity, selRect: sr, isMoving: im, moveOff: mo } = stateRef.current
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
          const [x1, y1] = shapeStartRef.current, [rx2, ry2] = lastPtRef.current
          liveShapeRef.current?.el?.remove(); liveShapeRef.current = null
          const type = classifyShape(x1, y1, rx2, ry2, shapeType)
          const [x2, y2] = snapShapeCoords(type, x1, y1, rx2, ry2)
          if (Math.abs(rx2 - x1) > 5 || Math.abs(ry2 - y1) > 5)
            onStrokesChange([...strokes, { shape: type, x1, y1, x2, y2, color: drawColor, size: penSize, opacity }])
        } else { liveShapeRef.current?.el?.remove(); liveShapeRef.current = null }
        shapeModeRef.current = false; shapeStartRef.current = null; setShapeHeld(false)
      } else if (tool === 'select') {
        if (im) {
          stateRef.current.commitMove(mo.dx, mo.dy)
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
        clearTimeout(penHoldTimerRef.current); penHoldTimerRef.current = null
        penStillPtRef.current = null; penSnapAnchorRef.current = null
        const snap = penSnapRef.current; penSnapRef.current = null
        penLiveShapeRef.current?.remove(); penLiveShapeRef.current = null
        if (s.points.length >= 1) {
          const points = s.points.length === 1 ? [s.points[0], s.points[0]] : s.points
          if (snap) { onStrokesChange([...strokes, { ...snap, color: s.color, size: s.size * 0.72, opacity: s.opacity }]); return }
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
          shapeStartRef.current = pt; shapeModeRef.current = true; setShapeHeld(true)
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
            pasteHoldStartRef.current = pt
            holdTimer.current = setTimeout(() => {
              const cur = lastPtRef.current
              if (cur && Math.hypot(cur[0] - pt[0], cur[1] - pt[1]) < 12) setPasteMenu({ x: pt[0], y: pt[1] })
              pasteHoldStartRef.current = null
            }, 1200)
          }
        } else {
          activeStroke.current = { points: [roundPt(pt)], color: drawColor, size: penSize, opacity, smoothing: stateRef.current.smoothness }
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
          path.setAttribute('fill', drawColor); path.setAttribute('fill-opacity', opacity); path.setAttribute('stroke', 'none')
          livePathRef.current = path; svg.appendChild(path)
        }
        return
      }

      // Fingers: detect 2-finger tap (undo) and pinch-to-zoom
      if (stylusActiveRef.current) return
      if (touches.length === 3) {
        e.preventDefault()
        t3 = { t: Date.now(), moved: false, x1: touches[0].clientX, y1: touches[0].clientY, x2: touches[1].clientX, y2: touches[1].clientY, x3: touches[2].clientX, y3: touches[2].clientY }
        t2 = null
      } else if (touches.length === 2) {
        e.preventDefault()
        const dist = Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY)
        t2 = { t: Date.now(), x1: touches[0].clientX, y1: touches[0].clientY, x2: touches[1].clientX, y2: touches[1].clientY, dist, pinching: false }
        t3 = null
      } else {
        t2 = null; t3 = null
      }
    }

    function onTouchMove(e) {
      if (t3 && e.touches.length === 3) {
        const moved = Math.max(
          Math.abs(e.touches[0].clientX - t3.x1), Math.abs(e.touches[0].clientY - t3.y1),
          Math.abs(e.touches[1].clientX - t3.x2), Math.abs(e.touches[1].clientY - t3.y2),
          Math.abs(e.touches[2].clientX - t3.x3), Math.abs(e.touches[2].clientY - t3.y3),
        )
        if (moved > 20) t3 = null
      }
      if (t2 && e.touches.length === 2) {
        const newDist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY)
        if (Math.abs(newDist - t2.dist) > 1) {
          t2.pinching = true
          stateRef.current.onPinch?.(
            newDist / t2.dist,
            (e.touches[0].clientX + e.touches[1].clientX) / 2,
            (e.touches[0].clientY + e.touches[1].clientY) / 2,
          )
          t2.dist = newDist
          t2.x1 = e.touches[0].clientX; t2.y1 = e.touches[0].clientY
          t2.x2 = e.touches[1].clientX; t2.y2 = e.touches[1].clientY
        } else {
          const moved = Math.max(
            Math.abs(e.touches[0].clientX - t2.x1), Math.abs(e.touches[0].clientY - t2.y1),
            Math.abs(e.touches[1].clientX - t2.x2), Math.abs(e.touches[1].clientY - t2.y2),
          )
          if (moved > 30) t2 = null
        }
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
        const [sx2, sy2] = snapShapeCoords(type, x1, y1, pt[0], pt[1])
        const tagMap = { rect: 'rect', ellipse: 'ellipse', line: 'line', triangle: 'polygon' }
        if (!liveShapeRef.current || liveShapeRef.current.type !== type) {
          liveShapeRef.current?.el?.remove()
          const el = document.createElementNS('http://www.w3.org/2000/svg', tagMap[type])
          el.setAttribute('stroke', drawColor); el.setAttribute('stroke-width', penSize)
          el.setAttribute('fill', 'none'); el.setAttribute('opacity', opacity)
          el.setAttribute('stroke-linecap', 'round'); el.setAttribute('stroke-linejoin', 'round')
          if (type === 'rect') el.setAttribute('rx', '3')
          svg.appendChild(el); liveShapeRef.current = { el, type }
        }
        if (!shapeRAFRef.current) {
          const _el = liveShapeRef.current.el, _type = type, _x1 = x1, _y1 = y1, _x2 = sx2, _y2 = sy2
          shapeRAFRef.current = requestAnimationFrame(() => {
            setLiveShapeAttrs(_el, _type, _x1, _y1, _x2, _y2)
            shapeRAFRef.current = null
          })
        } else {
          setLiveShapeAttrs(liveShapeRef.current.el, type, x1, y1, sx2, sy2)
        }
      } else if (tool === 'select') {
        clearTimeout(holdTimer.current); holdTimer.current = null; pasteHoldStartRef.current = null
        const { isMoving: im, moveStart: ms, selRect: sr } = stateRef.current
        if (im && ms) setMoveOff({ dx: pt[0] - ms.x, dy: pt[1] - ms.y })
        else if (sr) setSelRect(prev => ({ ...prev, x2: pt[0], y2: pt[1] }))
      } else {
        if (!activeStroke.current || !livePathRef.current) return

        // Already snapped — update shape live, don't revert
        if (penSnapRef.current && penLiveShapeRef.current && penSnapAnchorRef.current) {
          const [ax, ay] = penSnapAnchorRef.current
          const type = penSnapRef.current.shape
          const [sx2, sy2] = snapShapeCoords(type, ax, ay, pt[0], pt[1])
          setLiveShapeAttrs(penLiveShapeRef.current, type, ax, ay, sx2, sy2)
          penSnapRef.current = { shape: type, x1: ax, y1: ay, x2: sx2, y2: sy2 }
          return
        }

        addStrokePoint(activeStroke.current, pt)
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
        // Hold-to-snap: reset timer on significant movement
        const still = penStillPtRef.current
        if (!still || Math.hypot(pt[0] - still[0], pt[1] - still[1]) > 10) {
          penStillPtRef.current = pt
          clearTimeout(penHoldTimerRef.current); penHoldTimerRef.current = null
          penHoldTimerRef.current = setTimeout(() => {
            penHoldTimerRef.current = null
            const s = activeStroke.current
            if (!s || !svgRef.current) return
            const pts = s.points.length === 1 ? [s.points[0], s.points[0]] : s.points
            const detected = detectShape(pts)
            if (!detected) return
            if (detected.shape === 'line') {
              penSnapAnchorRef.current = [detected.x1, detected.y1]
            } else {
              // For rect/ellipse: anchor = corner diagonally opposite to hold point
              const hold = pts[pts.length - 1]
              const corners = [[detected.x1, detected.y1], [detected.x2, detected.y1], [detected.x1, detected.y2], [detected.x2, detected.y2]]
              let closest = corners[0], minD = Infinity
              for (const c of corners) { const d = Math.hypot(c[0] - hold[0], c[1] - hold[1]); if (d < minD) { minD = d; closest = c } }
              penSnapAnchorRef.current = [detected.x1 + detected.x2 - closest[0], detected.y1 + detected.y2 - closest[1]]
            }
            penSnapRef.current = detected
            if (livePathRef.current) livePathRef.current.style.display = 'none'
            const tagMap = { rect: 'rect', ellipse: 'ellipse', line: 'line' }
            const tag = tagMap[detected.shape]; if (!tag) return
            const el = document.createElementNS('http://www.w3.org/2000/svg', tag)
            el.setAttribute('stroke', s.color); el.setAttribute('stroke-width', s.size * 0.72)
            el.setAttribute('fill', 'none'); el.setAttribute('opacity', s.opacity)
            el.setAttribute('stroke-linecap', 'round'); el.setAttribute('stroke-linejoin', 'round')
            if (detected.shape === 'rect') el.setAttribute('rx', '3')
            setLiveShapeAttrs(el, detected.shape, detected.x1, detected.y1, detected.x2, detected.y2)
            svgRef.current.appendChild(el)
            penLiveShapeRef.current = el
          }, 900)
        }
      }
    }

    function onTouchEnd(e) {
      if (t3 && Date.now() - t3.t < 600 && e.touches.length <= 2) {
        e.preventDefault()
        stateRef.current.onRedo?.()
        t3 = null; t2 = null
        return
      }
      if (t2) {
        if (!t2.pinching && Date.now() - t2.t < 600 && e.touches.length <= 1) {
          e.preventDefault()
          stateRef.current.onUndo?.()
          t2 = null
          return
        }
        if (e.touches.length === 0) {
          if (t2.pinching) stateRef.current.onPinchEnd?.()
          t2 = null
        }
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

  // Cache the fully-computed SVG path `d` string per stroke object identity.
  // Both getStroke() and toPath() are expensive for long strokes; caching the
  // final string means repeated renders hit the cache and return the same string
  // reference, so React's reconciler skips DOM updates for unchanged paths.
  const strokePathCache = useRef(new WeakMap())
  function getCachedPath(s) {
    if (!strokePathCache.current.has(s)) {
      const outline = getStroke(s.points, strokeOpts(s.size, true, s.smoothing ?? 0.5))
      strokePathCache.current.set(s, toPath(outline))
    }
    return strokePathCache.current.get(s)
  }

  // Clear the local erasing preview once the parent strokes prop has updated,
  // preventing a flash of the old un-erased strokes between the two renders.
  useEffect(() => {
    setErasingStrokes(null)
  }, [strokes]) // eslint-disable-line react-hooks/exhaustive-deps

  function commitMove(dx, dy) {
    const validIdx  = [...selectedIndices].filter(i => i < strokes.length)
    const moved     = validIdx.map(i => shiftStroke(strokes[i], dx, dy))
    const remaining = strokes.filter((_, i) => !selectedIndices.has(i))

    if (moved.length > 0 && onTransferStrokes) {
      const allBounds = moved.map(strokeBounds)
      const minY = Math.min(...allBounds.map(b => b.y1))
      const maxY = Math.max(...allBounds.map(b => b.y2))

      // Only transfer when the entire selection is fully past the page boundary
      if (maxY < 0 && pageIdx > 0) {
        onTransferStrokes(pageIdx - 1, remaining, moved.map(s => shiftStroke(s, 0, pageH)))
        setIsMoving(false); setMoveStart(null); setMoveOff({ dx: 0, dy: 0 }); setSelectedIndices(new Set())
        return
      }
      if (minY > pageH && pageIdx < totalPages - 1) {
        onTransferStrokes(pageIdx + 1, remaining, moved.map(s => shiftStroke(s, 0, -pageH)))
        setIsMoving(false); setMoveStart(null); setMoveOff({ dx: 0, dy: 0 }); setSelectedIndices(new Set())
        return
      }
    }

    onStrokesChange(strokes.map((s, i) => selectedIndices.has(i) ? shiftStroke(s, dx, dy) : s))
    setIsMoving(false); setMoveStart(null); setMoveOff({ dx: 0, dy: 0 })
  }

  stateRef.current = {
    tool, drawColor, penSize, opacity, smoothness, shapeType, eraserMode, eraserRadius, strokes, onStrokesChange, onUndo, onRedo, onPinch, onPinchEnd, onCopy, clipboard,
    selectedIndices, selRect, isMoving, moveStart, moveOff,
    commitMove, pageIdx, totalPages, onTransferStrokes, pageH,
  }

  function getPoint(e) {
    const r  = svgRef.current.getBoundingClientRect()
    const vb = svgRef.current.viewBox.baseVal
    const sx = vb.width / r.width
    const sy = vb.height / r.height
    return [(e.clientX - r.left) * sx, (e.clientY - r.top) * sy, e.pressure || 0.5]
  }

  function clearLiveShape() {
    liveShapeRef.current?.el?.remove()
    liveShapeRef.current = null
  }

  function updateLiveShape(x1, y1, x2, y2) {
    const type   = classifyShape(x1, y1, x2, y2, shapeType)
    const [sx2, sy2] = snapShapeCoords(type, x1, y1, x2, y2)
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
      if (type === 'rect') el.setAttribute('rx', '3')
      svgRef.current.appendChild(el)
      liveShapeRef.current = { el, type }
    }
    setLiveShapeAttrs(liveShapeRef.current.el, type, x1, y1, sx2, sy2)
  }

  function getSelBounds(dx = 0, dy = 0) {
    const validIdx = [...selectedIndices].filter(i => i < strokes.length)
    if (validIdx.length === 0) return null
    const bounds = validIdx.map(i => strokeBounds(strokes[i]))
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
    const dupes = [...selectedIndices].filter(i => i < strokes.length).map(i => shiftStroke(strokes[i], OFFSET, OFFSET))
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
        pasteHoldStartRef.current = pt
        holdTimer.current = setTimeout(() => {
          const cur = lastPtRef.current
          if (cur && Math.hypot(cur[0] - pt[0], cur[1] - pt[1]) < 12) setPasteMenu({ x: pt[0], y: pt[1] })
          pasteHoldStartRef.current = null
        }, 1200)
      }
      return
    }

    if (tool === 'shape') {
      shapeStartRef.current = pt; shapeModeRef.current = true; setShapeHeld(true)
    } else {
      activeStroke.current = { points: [roundPt(pt)], color: drawColor, size: penSize, opacity, smoothing }
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
      clearTimeout(holdTimer.current); holdTimer.current = null; pasteHoldStartRef.current = null
      if (isMoving && moveStart) setMoveOff({ dx: pt[0] - moveStart.x, dy: pt[1] - moveStart.y })
      else if (selRect) setSelRect(prev => ({ ...prev, x2: pt[0], y2: pt[1] }))
      return
    }

    if (tool === 'shape') {
      if (!shapeModeRef.current || !shapeStartRef.current) return
      updateLiveShape(shapeStartRef.current[0], shapeStartRef.current[1], pt[0], pt[1])
    } else {
      if (!activeStroke.current || !livePathRef.current) return

      // Already snapped — update shape live, don't revert
      if (penSnapRef.current && penLiveShapeRef.current && penSnapAnchorRef.current) {
        const [ax, ay] = penSnapAnchorRef.current
        const type = penSnapRef.current.shape
        const [sx2, sy2] = snapShapeCoords(type, ax, ay, pt[0], pt[1])
        setLiveShapeAttrs(penLiveShapeRef.current, type, ax, ay, sx2, sy2)
        penSnapRef.current = { shape: type, x1: ax, y1: ay, x2: sx2, y2: sy2 }
        return
      }

      addStrokePoint(activeStroke.current, pt)
      if (!drawRAFRef.current) {
        drawRAFRef.current = requestAnimationFrame(() => {
          if (activeStroke.current && livePathRef.current) {
            const outline = getStroke(activeStroke.current.points, strokeOpts(penSize, false, smoothness))
            livePathRef.current.setAttribute('d', toPath(outline))
          }
          drawRAFRef.current = null
        })
      }
      // Hold-to-snap: reset timer on significant movement
      const still = penStillPtRef.current
      if (!still || Math.hypot(pt[0] - still[0], pt[1] - still[1]) > 10) {
        penStillPtRef.current = pt
        clearTimeout(penHoldTimerRef.current); penHoldTimerRef.current = null
        penHoldTimerRef.current = setTimeout(() => {
          penHoldTimerRef.current = null
          const s = activeStroke.current
          if (!s || !svgRef.current) return
          const pts = s.points.length === 1 ? [s.points[0], s.points[0]] : s.points
          const detected = detectShape(pts)
          if (!detected) return
          if (detected.shape === 'line') {
            penSnapAnchorRef.current = [detected.x1, detected.y1]
          } else {
            const hold = pts[pts.length - 1]
            const corners = [[detected.x1, detected.y1], [detected.x2, detected.y1], [detected.x1, detected.y2], [detected.x2, detected.y2]]
            let closest = corners[0], minD = Infinity
            for (const c of corners) { const d = Math.hypot(c[0] - hold[0], c[1] - hold[1]); if (d < minD) { minD = d; closest = c } }
            penSnapAnchorRef.current = [detected.x1 + detected.x2 - closest[0], detected.y1 + detected.y2 - closest[1]]
          }
          penSnapRef.current = detected
          if (livePathRef.current) livePathRef.current.style.display = 'none'
          const tagMap = { rect: 'rect', ellipse: 'ellipse', line: 'line' }
          const tag = tagMap[detected.shape]; if (!tag) return
          const el = document.createElementNS('http://www.w3.org/2000/svg', tag)
          const s2 = activeStroke.current
          el.setAttribute('stroke', s2?.color ?? drawColor)
          el.setAttribute('stroke-width', (s2?.size ?? penSize) * 0.72)
          el.setAttribute('fill', 'none'); el.setAttribute('opacity', s2?.opacity ?? opacity)
          el.setAttribute('stroke-linecap', 'round'); el.setAttribute('stroke-linejoin', 'round')
          if (detected.shape === 'rect') el.setAttribute('rx', '3')
          setLiveShapeAttrs(el, detected.shape, detected.x1, detected.y1, detected.x2, detected.y2)
          svgRef.current.appendChild(el)
          penLiveShapeRef.current = el
        }, 900)
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
        commitMove(moveOff.dx, moveOff.dy)
      } else if (selRect) {
        const hits = new Set()
        strokes.forEach((s, i) => { if (rectsIntersect(selRect, strokeBounds(s))) hits.add(i) })
        setSelectedIndices(hits); setSelRect(null)
      }
      return
    }

    if (tool === 'shape') {
      if (shapeModeRef.current && shapeStartRef.current && lastPtRef.current) {
        const [x1, y1] = shapeStartRef.current, [rx2, ry2] = lastPtRef.current
        clearLiveShape()
        const type = classifyShape(x1, y1, rx2, ry2, shapeType)
        const [x2, y2] = snapShapeCoords(type, x1, y1, rx2, ry2)
        if (Math.abs(rx2 - x1) > 5 || Math.abs(ry2 - y1) > 5)
          onStrokesChange([...strokes, { shape: type, x1, y1, x2, y2, color: drawColor, size: penSize, opacity }])
      } else { clearLiveShape() }
      shapeModeRef.current = false; shapeStartRef.current = null; setShapeHeld(false)
    } else {
      if (!activeStroke.current) return
      if (drawRAFRef.current) { cancelAnimationFrame(drawRAFRef.current); drawRAFRef.current = null }
      livePathRef.current?.remove(); livePathRef.current = null
      const s = activeStroke.current; activeStroke.current = null
      clearTimeout(penHoldTimerRef.current); penHoldTimerRef.current = null
      penStillPtRef.current = null; penSnapAnchorRef.current = null
      const snap = penSnapRef.current; penSnapRef.current = null
      penLiveShapeRef.current?.remove(); penLiveShapeRef.current = null
      if (s.points.length >= 1) {
        const points = s.points.length === 1 ? [s.points[0], s.points[0]] : s.points
        if (snap) { onStrokesChange([...strokes, { ...snap, color: s.color, size: s.size * 0.72, opacity: s.opacity }]); return }
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
    clearTimeout(penHoldTimerRef.current); penHoldTimerRef.current = null
    penStillPtRef.current = null; penSnapRef.current = null; penSnapAnchorRef.current = null
    penLiveShapeRef.current?.remove(); penLiveShapeRef.current = null
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
    // Height matches the CSS-scaled SVG visual height so overlays position correctly
    <div style={{ position: 'relative', width: '100%', height: pageH * zoom }}>
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

      {/* Selection context menu — SVG coords × zoom = CSS pixel position */}
      {(() => {
        const smb = (tool === 'select' && selectedIndices.size > 0 && !isMoving && !selRect) ? getSelBounds() : null
        if (!smb) return null
        const cmBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, padding: '4px 8px', borderRadius: 6 }
        return (
          <div style={{
            position: 'absolute',
            left: ((smb.x1 + smb.x2) / 2 * zoom) + 'px',
            top: (smb.y1 * zoom > 60 ? smb.y1 * zoom - 48 : smb.y2 * zoom + 10) + 'px',
            transform: 'translateX(-50%)', zIndex: 50,
            display: 'flex', alignItems: 'center', gap: 1,
            background: 'rgba(18,19,30,0.96)', backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
            padding: '4px 6px', boxShadow: '0 4px 20px rgba(0,0,0,0.55)',
          }}>
            <button className="btn-press" onClick={handleDuplicate} style={{ ...cmBtn, color: 'rgba(255,255,255,0.82)' }}>Duplicate</button>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
            <button className="btn-press" onClick={handleCopySelected} style={{ ...cmBtn, color: 'rgba(255,255,255,0.82)' }}>Copy</button>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
            <button className="btn-press" onClick={() => { onStrokesChange(strokes.filter((_, i) => !selectedIndices.has(i))); setSelectedIndices(new Set()); showActionToast('Deleted') }}
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
            left: pasteMenu.x * zoom + 'px',
            top: (pasteMenu.y * zoom > 60 ? pasteMenu.y * zoom - 50 : pasteMenu.y * zoom + 10) + 'px',
            transform: 'translateX(-50%)', zIndex: 50,
            background: 'rgba(18,19,30,0.96)', backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
            padding: '4px 6px', boxShadow: '0 4px 20px rgba(0,0,0,0.55)',
          }}>
            <button className="btn-press" onClick={() => handlePaste(pasteMenu.x, pasteMenu.y)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, padding: '4px 8px', borderRadius: 6, color: 'rgba(255,255,255,0.82)' }}>Paste</button>
          </div>
        </>
      )}

      <svg
        ref={svgRef}
        data-page={page.id}
        width={maxW}
        height={pageH}
        viewBox={`0 0 ${maxW} ${pageH}`}
        tabIndex={tool === 'select' && !readonly ? 0 : undefined}
        style={{ display: 'block', touchAction: 'pan-y', cursor, outline: 'none', transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        onPointerDown={readonly ? undefined : onPointerDown}
        onPointerMove={readonly ? undefined : onPointerMove}
        onPointerUp={readonly ? undefined : onPointerUp}
        onPointerCancel={readonly ? undefined : onPointerCancel}
        onPointerLeave={readonly ? undefined : (e) => { onPointerUp(e); setEraserPos(null) }}
        onKeyDown={readonly ? undefined : onKeyDown}
      >
        <PageTemplate pageId={page.id} template={pageBackground ? 'blank' : template} bgColor={bgColor} lineSpacing={lineSpacing} />
        {pageBackground && (
          <image
            href={pageBackground}
            x="0"
            y="0"
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMin meet"
          />
        )}

        {(() => {
          const indexed = displayStrokes.map((s, i) => ({ s, i }))
          // Render highlighters first (behind), then all other strokes on top
          const sorted = [
            ...indexed.filter(({ s }) => !s.shape && (s.opacity ?? 1) < 1),
            ...indexed.filter(({ s }) =>  s.shape || (s.opacity ?? 1) >= 1),
          ]
          return sorted.map(({ s, i }) => {
            const sel = selectedIndices.has(i)
            const dx  = sel && isMoving ? moveOff.dx : 0
            const dy  = sel && isMoving ? moveOff.dy : 0
            const tf  = (dx || dy) ? `translate(${dx},${dy})` : undefined
            const rc  = adaptColor(s.color, bgColor)
            if (s.shape) return <g key={i} transform={tf}>{renderShape({ ...s, color: rc })}</g>
            return (
              <g key={i} transform={tf}>
                <path fill={rc} fillOpacity={s.opacity ?? 1} stroke="none" d={getCachedPath(s)} />
              </g>
            )
          })
        })()}

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

// ─── SVG → PNG helper for export ──────────────────────────────────────────────
async function svgToPngBlob(svgEl, bgColor) {
  const vb = svgEl.viewBox.baseVal
  const w  = vb.width  || 900
  const h  = vb.height || 1200
  const clone = svgEl.cloneNode(true)
  clone.setAttribute('width', w)
  clone.setAttribute('height', h)
  let svgStr = new XMLSerializer().serializeToString(clone)
  if (!svgStr.includes('xmlns='))
    svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }))
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = bgColor || '#f8f7f2'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob(resolve, 'image/png')
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

// ─── Main multi-page canvas ────────────────────────────────────────────────────
const NoteCanvas = forwardRef(function NoteCanvas({
  pages, onPagesChange,
  template = 'blank', bgColor = '#f8f7f2', lineSpacing = 32,
  orientation = 'portrait', onSettingsChange,
  readonly = false,
  pageBackgrounds,
  pageDimensions,
  isPdfNote = false,
}, ref) {
  const isMobile         = useIsMobile()
  const scrollRef        = useRef()
  const addingPageRef    = useRef(false)
  const undoStackRef     = useRef([])
  const redoStackRef     = useRef([])
  const toolMemoryRef    = useRef({
    pen:         { color: '#111827', presetIdx: 1 },
    highlighter: { color: '#f59e0b', presetIdx: 1 },
    eraser:      { presetIdx: 1 },
  })

  function loadSetting(key, fallback) {
    try { return JSON.parse(localStorage.getItem('notecanvas_settings') || '{}')[key] ?? fallback } catch { return fallback }
  }

  const [penColor,        setPenColor]        = useState('#111827')
  const [penPresets,      setPenPresets]      = useState(() => loadSetting('penPresets', DEFAULT_PEN_PRESETS))
  const [hlPresets,       setHlPresets]       = useState(() => loadSetting('hlPresets', DEFAULT_HL_PRESETS))
  const [eraserPresets,   setEraserPresets]   = useState(() => loadSetting('eraserPresets', DEFAULT_ERASER_PRESETS))
  const [penPresetIdx,    setPenPresetIdx]    = useState(1)
  const [hlPresetIdx,     setHlPresetIdx]     = useState(1)
  const [eraserPresetIdx, setEraserPresetIdx] = useState(1)
  const [activeSlider,    setActiveSlider]    = useState(null)
  const [tool,          setTool]          = useState('pen')
  const [shapeType,     setShapeType]     = useState('rect')
  const [eraserMode,    setEraserMode]    = useState('standard')
  const [smoothness,    setSmoothness]    = useState(() => loadSetting('smoothness', 0.5))
  const [zoom,          setZoom]          = useState(() => loadSetting('zoom', 1))
  const [customColor,   setCustomColor]   = useState('#111827')
  const [customBg,     setCustomBg]     = useState(bgColor)
  const [showSettings, setShowSettings] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [undoToast,    setUndoToast]    = useState(false)
  const [undoToastKey, setUndoToastKey] = useState(0)
  const [redoToast,    setRedoToast]    = useState(false)
  const [redoToastKey, setRedoToastKey] = useState(0)
  const [clipboard,    setClipboard]    = useState(null)
  const toolbarRef          = useRef(null)
  const toolBtnRefs         = useRef({})
  const [toolPill, setToolPill] = useState({ left: 0, width: 0, ready: false })

  useLayoutEffect(() => {
    const btn = toolBtnRefs.current[tool]
    const bar = toolbarRef.current
    if (!btn || !bar) return
    const bRect = btn.getBoundingClientRect()
    const cRect = bar.getBoundingClientRect()
    setToolPill(prev => ({ left: bRect.left - cRect.left, width: bRect.width, ready: prev.ready || true }))
  }, [tool])

  const undoToastTimer      = useRef(null)
  const redoToastTimer      = useRef(null)
  const zoomRef             = useRef(zoom)
  const zoomRafRef          = useRef(null)
  const pendingScrollTopRef  = useRef(null)
  const pendingScrollLeftRef = useRef(null)
  const pagesRef            = useRef(pages)
  const committedZoomRef    = useRef(zoom)
  const pagesWrapperRef     = useRef(null)
  const gestureAnchorRef    = useRef(null) // { midInScrollX, midInScrollY, wrapperX, wrapperY }

  useEffect(() => { zoomRef.current = zoom; committedZoomRef.current = zoom }, [zoom])
  useEffect(() => { pagesRef.current = pages }, [pages])

  // After React re-renders with new zoom: clear CSS gesture transform, then snap scroll to anchor.
  // useLayoutEffect fires before paint — no visible frame with wrong scroll position.
  useLayoutEffect(() => {
    if (pagesWrapperRef.current) pagesWrapperRef.current.style.transform = ''
    const el = scrollRef.current
    if (!el) return
    if (pendingScrollTopRef.current !== null) {
      el.scrollTop = pendingScrollTopRef.current
      pendingScrollTopRef.current = null
    }
    if (pendingScrollLeftRef.current !== null) {
      el.scrollLeft = pendingScrollLeftRef.current
      pendingScrollLeftRef.current = null
    }
  }, [zoom])

  useEffect(() => {
    try {
      const existing = JSON.parse(localStorage.getItem('notecanvas_settings') || '{}')
      localStorage.setItem('notecanvas_settings', JSON.stringify({ ...existing, penPresets, hlPresets, eraserPresets, smoothness, zoom }))
    } catch {}
  }, [penPresets, hlPresets, eraserPresets, smoothness, zoom])

  useEffect(() => { setActiveSlider(null) }, [tool])

  useEffect(() => {
    if (activeSlider === null) return
    function close() { setActiveSlider(null) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [activeSlider])

  const penSize = tool === 'highlighter' ? hlPresets[hlPresetIdx]
    : tool === 'eraser' ? eraserPresets[eraserPresetIdx]
    : penPresets[penPresetIdx]

  function handleSetTool(t) {
    const mem = toolMemoryRef.current
    if (tool === 'pen') mem.pen = { color: penColor, presetIdx: penPresetIdx }
    if (tool === 'highlighter') mem.highlighter = { color: penColor, presetIdx: hlPresetIdx }
    if (tool === 'eraser') mem.eraser = { presetIdx: eraserPresetIdx }
    if (t === 'pen') {
      setPenColor(mem.pen.color)
      setCustomColor(mem.pen.color)
      setPenPresetIdx(mem.pen.presetIdx ?? 1)
    } else if (t === 'highlighter') {
      setPenColor(mem.highlighter.color)
      setCustomColor(mem.highlighter.color)
      setHlPresetIdx(mem.highlighter.presetIdx ?? 1)
    } else if (t === 'eraser') {
      setEraserPresetIdx(mem.eraser.presetIdx ?? 1)
    }
    setActiveSlider(null)
    setTool(t)
  }

  function handlePinch(scaleFactor, midScreenX, midScreenY) {
    const scrollEl = scrollRef.current
    if (!scrollEl) return

    // Lock the pinch anchor on the very first event of this gesture.
    // wrapperX/Y = pinch midpoint in pagesWrapper-local coords (accounts for current scroll).
    if (!gestureAnchorRef.current && midScreenY != null) {
      const rect         = scrollEl.getBoundingClientRect()
      const midInScrollX = midScreenX - rect.left
      const midInScrollY = midScreenY - rect.top
      const wrapperX     = scrollEl.scrollLeft + midInScrollX
      const wrapperY     = scrollEl.scrollTop  + midInScrollY
      gestureAnchorRef.current = { midInScrollX, midInScrollY, wrapperX, wrapperY }
    }

    const prevZoom = zoomRef.current
    const newZoom  = Math.min(3, Math.max(0.4, prevZoom * scaleFactor))
    if (newZoom === prevZoom) return
    zoomRef.current = newZoom

    // Scale the wrapper from the exact pinch point — GPU composited, zero React re-renders.
    // transformOrigin pins the anchor position so it never visually moves during the gesture.
    if (pagesWrapperRef.current && gestureAnchorRef.current) {
      const gestureScale = newZoom / committedZoomRef.current
      const { wrapperX, wrapperY } = gestureAnchorRef.current
      pagesWrapperRef.current.style.transformOrigin = `${wrapperX}px ${wrapperY}px`
      pagesWrapperRef.current.style.transform = `scale(${gestureScale})`
    }
  }

  function handlePinchEnd() {
    if (zoomRafRef.current) { cancelAnimationFrame(zoomRafRef.current); zoomRafRef.current = null }

    const anchor = gestureAnchorRef.current
    if (anchor) {
      const gestureScale  = zoomRef.current / committedZoomRef.current
      const oldZoom       = committedZoomRef.current
      const newZoom       = zoomRef.current
      const { wrapperX, wrapperY, midInScrollX, midInScrollY } = anchor
      const W             = scrollRef.current?.getBoundingClientRect().width ?? 0
      const maxW          = PAGE_MAX_WIDTHS[orientation] ?? 900
      const CANVAS_TOP_PAD = 108

      // Y: anchor row stays at same viewport Y.
      const contentY = wrapperY - CANVAS_TOP_PAD
      pendingScrollTopRef.current = Math.max(0, contentY * gestureScale + CANVAS_TOP_PAD - midInScrollY)

      // X: page starts at pageLeft within pagesWrapper. Compute for old and new zoom.
      // When page + padding (48) fits in viewport: page is CSS-centered at (W - pageWidth) / 2.
      // When page overflows viewport: pagesWrapper expands to max-content and page sits at 24px.
      const pageLeft_old = (maxW * oldZoom + 48 >= W) ? 24 : (W - maxW * oldZoom) / 2
      const pageLeft_new = (maxW * newZoom + 48 >= W) ? 24 : (W - maxW * newZoom) / 2
      const contentX = pageLeft_new + (wrapperX - pageLeft_old) * gestureScale
      pendingScrollLeftRef.current = Math.max(0, contentX - midInScrollX)
    }

    gestureAnchorRef.current = null
    setZoom(zoomRef.current)
    // useEffect on zoom clears the CSS transform and applies pendingScrollTopRef after re-render
  }

  function getPageDims(idx) {
    const dim = pageDimensions?.[idx]
    if (!dim) return { pageH: PAGE_HEIGHTS[orientation] ?? 1200, maxW: PAGE_MAX_WIDTHS[orientation] ?? 900 }
    const w = Math.min(900, dim.w)
    return { pageH: Math.round(dim.h * w / dim.w), maxW: w }
  }
  const { pageH, maxW } = getPageDims(0)
  const opacity      = tool === 'highlighter' ? 0.35 : 1
  const eraserRadius = tool === 'eraser' ? penSize : penSize * 4
  // pages beyond the PDF backgrounds are user-added blank pages
  const hasUserPages = isPdfNote && pages.length > (pageBackgrounds?.length ?? 0)
  const totalStrokes = pages.reduce((s, p) => s + p.strokes.length, 0)

  function addPage() {
    onPagesChange([...pages, { id: `page-${Date.now()}`, strokes: [] }])
  }

  function deletePage(idx) {
    if (pages.length <= 1) return
    undoStackRef.current = undoStackRef.current
      .map(entry => {
        const snaps = Array.isArray(entry) ? entry : [entry]
        const kept  = snaps.filter(s => s.pageIdx !== idx).map(s => s.pageIdx > idx ? { ...s, pageIdx: s.pageIdx - 1 } : s)
        if (kept.length === 0) return null
        return kept.length === 1 ? kept[0] : kept
      })
      .filter(Boolean)
    onPagesChange(pages.filter((_, i) => i !== idx))
  }

  function handleUndo() {
    if (undoStackRef.current.length === 0) return
    const entry = undoStackRef.current.pop()
    const snaps = Array.isArray(entry) ? entry : [entry]
    // Save current state to redo stack before restoring
    redoStackRef.current.push(snaps.map(s => ({ pageIdx: s.pageIdx, strokes: pages[s.pageIdx]?.strokes ?? [] })))
    onPagesChange(pages.map((p, i) => {
      const snap = snaps.find(s => s.pageIdx === i)
      return snap ? { ...p, strokes: snap.strokes } : p
    }))
    setUndoToast(true)
    setUndoToastKey(k => k + 1)
    clearTimeout(undoToastTimer.current)
    undoToastTimer.current = setTimeout(() => setUndoToast(false), 1400)
  }

  function handleRedo() {
    if (redoStackRef.current.length === 0) return
    const entry = redoStackRef.current.pop()
    const snaps = Array.isArray(entry) ? entry : [entry]
    undoStackRef.current.push(snaps.map(s => ({ pageIdx: s.pageIdx, strokes: pages[s.pageIdx]?.strokes ?? [] })))
    onPagesChange(pages.map((p, i) => {
      const snap = snaps.find(s => s.pageIdx === i)
      return snap ? { ...p, strokes: snap.strokes } : p
    }))
    setRedoToast(true)
    setRedoToastKey(k => k + 1)
    clearTimeout(redoToastTimer.current)
    redoToastTimer.current = setTimeout(() => setRedoToast(false), 1400)
  }

  function handleTransferStrokes(fromPageIdx, fromRemaining, toPageIdx, transferred) {
    undoStackRef.current.push([
      { pageIdx: fromPageIdx, strokes: pages[fromPageIdx].strokes },
      { pageIdx: toPageIdx,   strokes: pages[toPageIdx].strokes },
    ])
    onPagesChange(pages.map((p, i) => {
      if (i === fromPageIdx) return { ...p, strokes: fromRemaining }
      if (i === toPageIdx)   return { ...p, strokes: [...p.strokes, ...transferred] }
      return p
    }))
  }

  function onScroll() {}

  function tbtn(active) {
    return {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 32, height: 30, borderRadius: 7, border: '1px solid transparent',
      cursor: 'pointer', pointerEvents: 'auto',
      background: active ? 'rgba(255,255,255,0.12)' : 'none',
      color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)',
      borderColor: active ? 'rgba(255,255,255,0.18)' : 'transparent',
    }
  }

  const sep = <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.14)', flexShrink: 0 }} />

  useImperativeHandle(ref, () => ({
    async exportAsPdf() {
      const lastIdx = pages.length - 1
      const exportPages = pages.filter((p, i) => i < lastIdx || p.strokes.length > 0)
      if (exportPages.length === 0) return null
      const exportIds = new Set(exportPages.map(p => p.id))
      const svgs = Array.from(scrollRef.current?.querySelectorAll('svg[data-page]') ?? [])
        .filter(s => exportIds.has(s.getAttribute('data-page')))
      const pngBlobs = []
      for (const svg of svgs) {
        const blob = await svgToPngBlob(svg, bgColor)
        if (blob) pngBlobs.push(blob)
      }
      if (pngBlobs.length === 0) return null
      const { jsPDF } = await import('jspdf')
      const pw = maxW; const ph = pageH
      const orient = ph >= pw ? 'portrait' : 'landscape'
      const doc = new jsPDF({ orientation: orient, unit: 'px', format: [pw, ph], hotfixes: ['px_scaling'] })
      for (let i = 0; i < pngBlobs.length; i++) {
        if (i > 0) doc.addPage([pw, ph], orient)
        const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(pngBlobs[i]) })
        doc.addImage(dataUrl, 'PNG', 0, 0, pw, ph)
      }
      return doc.output('blob')
    },
  }), [pages, bgColor, maxW, pageH])

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
            <button className="btn-press" onClick={handleUndo} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px',
              borderRadius: 7, border: '1px solid var(--border)', background: 'none',
              color: undoStackRef.current.length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
              cursor: undoStackRef.current.length === 0 ? 'not-allowed' : 'pointer', fontSize: 12,
            }}>
              <Undo2 size={12} /> Undo
            </button>
            <button className="btn-press" onClick={handleRedo} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px',
              borderRadius: 7, border: '1px solid var(--border)', background: 'none',
              color: redoStackRef.current.length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
              cursor: redoStackRef.current.length === 0 ? 'not-allowed' : 'pointer', fontSize: 12,
            }}>
              <Redo2 size={12} /> Redo
            </button>
            <button className="btn-press" onClick={() => totalStrokes > 0 && onPagesChange(pages.map(p => ({ ...p, strokes: [] })))} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px',
              borderRadius: 7, border: '1px solid var(--border)', background: 'none',
              color: totalStrokes === 0 ? 'var(--text-muted)' : 'var(--accent-red)',
              cursor: totalStrokes === 0 ? 'not-allowed' : 'pointer', fontSize: 12,
            }}>
              <Trash2 size={12} /> Clear
            </button>
            <div style={{ flex: 1 }} />
            {zoom !== 1 && (
              <button className="btn-press" onClick={() => setZoom(1)} title="Reset zoom" style={{
                padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11,
              }}>
                {Math.round(zoom * 100)}%
              </button>
            )}
            <button className="btn-press" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={() => setIsFullscreen(v => !v)} style={tbtn(isFullscreen)}>
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button className="btn-press" title="Page settings" onClick={() => setShowSettings(v => !v)} style={tbtn(showSettings)}>
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
              {(!isPdfNote || hasUserPages) && (
                <>
                  {!isPdfNote && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Orientation</span>
                        {['portrait', 'landscape'].map(o => (
                          <button className="btn-press" key={o} onClick={() => onSettingsChange({ orientation: o })} style={{
                            padding: '4px 9px', borderRadius: 6, border: '1px solid transparent',
                            cursor: 'pointer', fontSize: 11, textTransform: 'capitalize',
                            background: orientation === o ? 'rgba(91,140,255,0.15)' : 'none',
                            color: orientation === o ? 'var(--accent-blue)' : 'var(--text-muted)',
                            borderColor: orientation === o ? 'rgba(91,140,255,0.3)' : 'transparent',
                          }}>{o}</button>
                        ))}
                      </div>
                      {sep}
                    </>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Template</span>
                    {TEMPLATES.map(t => (
                      <button className="btn-press" key={t} onClick={() => onSettingsChange({ template: t })} style={{
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
                      <button className="btn-press" key={c} onClick={() => onSettingsChange({ bgColor: c })} title={c} style={{
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
                          <button className="btn-press" key={val} onClick={() => onSettingsChange({ lineSpacing: val })} style={{
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
                </>
              )}
              {isPdfNote && !hasUserPages && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PDF pages. Add a page below to set template.</span>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Canvas area ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* ── Tool bar ── */}
        {!readonly && (
          <MotionConfig reducedMotion="user">
            <div
              ref={toolbarRef}
              style={{
                position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                zIndex: 100, display: 'flex', alignItems: 'center', gap: 2,
                background: 'rgba(13,14,22,0.95)', backdropFilter: 'blur(16px) saturate(1.4)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '5px 6px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                pointerEvents: isMobile ? 'auto' : 'none',
                ...(isMobile ? { maxWidth: 'calc(100vw - 16px)', overflowX: 'auto', overflowY: 'hidden', flexWrap: 'nowrap' } : {}),
              }}
            >
              {/* Sliding pill background */}
              {toolPill.ready && (() => {
                const accent = TOOLS.find(([t]) => t === tool)?.[3] ?? '#5b8cff'
                return (
                  <motion.div
                    style={{
                      position: 'absolute', top: 5, height: 38, borderRadius: 10,
                      background: accent,
                      boxShadow: `0 0 16px ${accent}77, 0 2px 8px rgba(0,0,0,0.45)`,
                      pointerEvents: 'none',
                    }}
                    animate={{ left: toolPill.left, width: toolPill.width }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
                  />
                )
              })()}
              {TOOLS.map(([t, Icon, label]) => {
                const active = tool === t
                return (
                  <button
                    key={t}
                    ref={el => { if (el) toolBtnRefs.current[t] = el; else delete toolBtnRefs.current[t] }}
                    title={label}
                    onClick={() => handleSetTool(t)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 44, height: 38, borderRadius: 10, border: 'none',
                      cursor: 'pointer', pointerEvents: 'auto',
                      background: 'none',
                      color: active ? '#0d0e1a' : 'rgba(255,255,255,0.42)',
                      position: 'relative', zIndex: 1,
                      transition: 'color 0.18s',
                    }}
                  >
                    <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                  </button>
                )
              })}
            </div>
          </MotionConfig>
        )}

        {/* ── Settings pill (dynamic per tool) ── */}
        {!readonly && tool !== 'select' && (
          <div style={{
            position: 'absolute', top: 62, left: '50%', transform: 'translateX(-50%)',
            zIndex: 100, display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(13,14,22,0.93)', backdropFilter: 'blur(16px) saturate(1.4)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 24, padding: '6px 14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            maxWidth: 'calc(100% - 28px)',
            pointerEvents: 'none',
          }}>

            {/* Size presets — pen / highlighter / eraser */}
            {(tool === 'pen' || tool === 'highlighter' || tool === 'eraser') && (() => {
              const presets    = tool === 'highlighter' ? hlPresets : tool === 'eraser' ? eraserPresets : penPresets
              const activeIdx  = tool === 'highlighter' ? hlPresetIdx : tool === 'eraser' ? eraserPresetIdx : penPresetIdx
              const setIdx     = tool === 'highlighter' ? setHlPresetIdx : tool === 'eraser' ? setEraserPresetIdx : setPenPresetIdx
              const setPresets = tool === 'highlighter' ? setHlPresets : tool === 'eraser' ? setEraserPresets : setPenPresets
              const min        = tool === 'highlighter' ? 4 : tool === 'eraser' ? 4 : 1
              const max        = tool === 'highlighter' ? 60 : tool === 'eraser' ? 80 : 20
              const dotColor   = tool === 'eraser' ? 'rgba(255,255,255,0.75)' : penColor
              const accentCol  = tool === 'eraser' ? 'rgba(255,255,255,0.7)' : penColor
              return (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {presets.map((size, idx) => {
                    const isActive   = activeIdx === idx
                    const sliderOpen = isActive && activeSlider === idx
                    const dotD       = 11 + idx * 3.5
                    return (
                      <div key={idx} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <button className="btn-press"
                          onPointerDown={e => e.stopPropagation()}
                          onClick={() => {
                            if (isActive) setActiveSlider(prev => prev === idx ? null : idx)
                            else { setIdx(idx); setActiveSlider(null) }
                          }}
                          style={{ width: 28, height: 28, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <div style={{
                            width: Math.round(dotD), height: Math.round(dotD), borderRadius: '50%',
                            background: isActive ? dotColor : 'rgba(255,255,255,0.28)',
                            boxShadow: isActive ? `0 0 0 2.5px rgba(255,255,255,0.9), 0 0 0 5px rgba(255,255,255,0.15)` : 'none',
                            transition: 'background 0.12s, box-shadow 0.12s', pointerEvents: 'none',
                          }} />
                        </button>
                        <div
                          onPointerDown={e => e.stopPropagation()}
                          style={{
                            position: 'absolute', top: 'calc(100% + 12px)', left: '50%',
                            transform: `translateX(-50%) translateY(${sliderOpen ? 0 : -6}px) scale(${sliderOpen ? 1 : 0.92})`,
                            opacity: sliderOpen ? 1 : 0, pointerEvents: sliderOpen ? 'auto' : 'none',
                            transition: 'opacity 0.18s cubic-bezier(0.16,1,0.3,1), transform 0.18s cubic-bezier(0.16,1,0.3,1)',
                            zIndex: 200, display: 'flex', alignItems: 'center', gap: 8,
                            background: 'rgba(13,14,22,0.97)', backdropFilter: sliderOpen ? 'blur(16px)' : 'none',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '7px 12px',
                            boxShadow: sliderOpen ? '0 8px 28px rgba(0,0,0,0.65)' : 'none', whiteSpace: 'nowrap',
                          }}
                        >
                          <input
                            type="range" min={min} max={max} step="0.5" value={size}
                            onChange={e => { const v = parseFloat(e.target.value); setPresets(prev => prev.map((p, i) => i === idx ? v : p)) }}
                            style={{ width: 72, accentColor: accentCol, cursor: 'pointer', pointerEvents: sliderOpen ? 'auto' : 'none' }}
                          />
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.82)', minWidth: 26, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
                            {size % 1 === 0 ? size : size.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            {/* Eraser mode */}
            {tool === 'eraser' && (
              <>
                {sep}
                <div style={{ display: 'flex', gap: 3 }}>
                  {ERASER_MODES.map(([m, label]) => (
                    <button className="btn-press" key={m} onClick={() => setEraserMode(m)} style={{
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

            {/* Shape type buttons */}
            {tool === 'shape' && (
              <div style={{ display: 'flex', gap: 3 }}>
                {SHAPE_TYPES.map(([t, Icon, label]) => (
                  <button className="btn-press" key={t} title={label} onClick={() => setShapeType(t)} style={tbtn(shapeType === t)}>
                    <Icon size={13} />
                  </button>
                ))}
              </div>
            )}

            {/* Color swatches — pen / highlighter / shape */}
            {(tool === 'pen' || tool === 'highlighter' || tool === 'shape') && (
              <>
                {sep}
                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  {PRESETS.map(c => {
                    const active = penColor === c
                    return (
                      <button className="btn-press" key={c} onClick={() => setPenColor(c)} style={{
                        width: 18, height: 18, borderRadius: '50%', background: c, border: 'none',
                        cursor: 'pointer', padding: 0, flexShrink: 0, pointerEvents: 'auto',
                        outline: active ? `2.5px solid ${c}` : '2px solid transparent',
                        outlineOffset: 2.5, transform: active ? 'scale(1.2)' : 'scale(1)',
                        transition: 'transform 0.12s',
                        boxShadow: active ? `0 0 8px ${c}88` : 'none',
                      }} />
                    )
                  })}
                  <div style={{ position: 'relative', width: 18, height: 18, flexShrink: 0, pointerEvents: 'auto' }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                      outline: !PRESETS.includes(penColor) ? '2.5px solid white' : '2px solid transparent',
                      outlineOffset: 2.5, transform: !PRESETS.includes(penColor) ? 'scale(1.2)' : 'scale(1)',
                      transition: 'transform 0.12s',
                    }} />
                    <input type="color" value={customColor}
                      onChange={e => { setCustomColor(e.target.value); setPenColor(e.target.value) }}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', pointerEvents: 'auto' }} />
                  </div>
                </div>
              </>
            )}

            {/* Shape size presets (pen presets used for stroke width) */}
            {tool === 'shape' && (
              <>
                {sep}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {penPresets.map((size, idx) => {
                    const isActive   = penPresetIdx === idx
                    const sliderOpen = isActive && activeSlider === idx
                    const dotD       = 11 + idx * 3.5
                    return (
                      <div key={idx} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <button className="btn-press"
                          onPointerDown={e => e.stopPropagation()}
                          onClick={() => {
                            if (isActive) setActiveSlider(prev => prev === idx ? null : idx)
                            else { setPenPresetIdx(idx); setActiveSlider(null) }
                          }}
                          style={{ width: 28, height: 28, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <div style={{
                            width: Math.round(dotD), height: Math.round(dotD), borderRadius: '50%',
                            background: isActive ? penColor : 'rgba(255,255,255,0.28)',
                            boxShadow: isActive ? `0 0 0 2.5px rgba(255,255,255,0.9), 0 0 0 5px rgba(255,255,255,0.15)` : 'none',
                            transition: 'background 0.12s, box-shadow 0.12s', pointerEvents: 'none',
                          }} />
                        </button>
                        <div
                          onPointerDown={e => e.stopPropagation()}
                          style={{
                            position: 'absolute', top: 'calc(100% + 12px)', left: '50%',
                            transform: `translateX(-50%) translateY(${sliderOpen ? 0 : -6}px) scale(${sliderOpen ? 1 : 0.92})`,
                            opacity: sliderOpen ? 1 : 0, pointerEvents: sliderOpen ? 'auto' : 'none',
                            transition: 'opacity 0.18s cubic-bezier(0.16,1,0.3,1), transform 0.18s cubic-bezier(0.16,1,0.3,1)',
                            zIndex: 200, display: 'flex', alignItems: 'center', gap: 8,
                            background: 'rgba(13,14,22,0.97)', backdropFilter: sliderOpen ? 'blur(16px)' : 'none',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '7px 12px',
                            boxShadow: sliderOpen ? '0 8px 28px rgba(0,0,0,0.65)' : 'none', whiteSpace: 'nowrap',
                          }}
                        >
                          <input
                            type="range" min={1} max={20} step="0.5" value={size}
                            onChange={e => { const v = parseFloat(e.target.value); setPenPresets(prev => prev.map((p, i) => i === idx ? v : p)) }}
                            style={{ width: 72, accentColor: penColor, cursor: 'pointer', pointerEvents: sliderOpen ? 'auto' : 'none' }}
                          />
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.82)', minWidth: 26, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
                            {size % 1 === 0 ? size : size.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Smoothness — pen / highlighter only */}
            {(tool === 'pen' || tool === 'highlighter') && (
              <>
                {sep}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', userSelect: 'none' }}>Rigid</span>
                  <input
                    type="range" min="0" max="1" step="0.05" value={smoothness}
                    onChange={e => setSmoothness(parseFloat(e.target.value))}
                    style={{ width: 68, accentColor: penColor, cursor: 'pointer', pointerEvents: 'auto' }}
                  />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', userSelect: 'none' }}>Smooth</span>
                </div>
              </>
            )}
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
        {redoToast && (
          <div key={`redo-${redoToastKey}`} style={{
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
            <Redo2 size={13} style={{ opacity: 0.7 }} /> Redo
          </div>
        )}

        {/* Scroll container */}
        <div ref={scrollRef} onScroll={onScroll} style={{ height: '100%', overflowY: 'auto', overflowX: 'auto', background: 'var(--canvas-outer, #14141e)' }}>
          <div ref={pagesWrapperRef} style={{ padding: readonly ? 24 : '108px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(24 * zoom), width: 'max-content', minWidth: '100%' }}>
            {pages.map((page, pageIdx) => {
              const { pageH: pgH, maxW: pgW } = getPageDims(pageIdx)
              return (
              // position:relative + explicit height = pgH*zoom so the flex item contributes
              // exactly pgH*zoom to the column — no fixed-pixel controls in the flow.
              // This makes every element below the top padding scale linearly with zoom,
              // which is required for the CSS-transform pinch-zoom math to be accurate.
              <div key={page.id} style={{ flexShrink: 0, position: 'relative', width: pgW * zoom, height: pgH * zoom }}>
                <PageCanvas
                  page={page}
                  pageH={pgH}
                  maxW={pgW}
                  onStrokesChange={newStrokes => {
                    undoStackRef.current.push({ pageIdx, strokes: pages[pageIdx].strokes })
                    redoStackRef.current = []
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
                  pageIdx={pageIdx}
                  totalPages={pages.length}
                  onTransferStrokes={handleTransferStrokes}
                  readonly={readonly}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onPinch={handlePinch}
                  onPinchEnd={handlePinchEnd}
                  zoom={zoom}
                  clipboard={clipboard}
                  onCopy={strokes => setClipboard(strokes)}
                  pageBackground={pageBackgrounds?.[pageIdx]}
                />
                {/* Controls float in the gap between pages; zero layout height so they don't shift the column */}
                {/* Outer div spans page width, centers content; inner div holds the content and scales */}
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                  <div style={{ paddingTop: 4, display: 'flex', alignItems: 'center', gap: 10, transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.5px' }}>{pageIdx + 1}</span>
                    {!readonly && pages.length > 1 && (
                      <button className="btn-press" onClick={() => deletePage(pageIdx)} title="Delete page" style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                        color: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center',
                      }}>
                        <Trash2 size={11} />
                      </button>
                    )}
                    {!readonly && pages.length - pageIdx - 1 > 1 && (
                      <button className="btn-press"
                        onClick={() => onPagesChange(pages.slice(0, pageIdx + 1))}
                        title={`Delete pages ${pageIdx + 2}–${pages.length}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'rgba(255,255,255,0.15)', fontSize: 9 }}
                      >
                        delete all after
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )})}

            {!readonly && (
              <button className="btn-press"
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
})

export default NoteCanvas
