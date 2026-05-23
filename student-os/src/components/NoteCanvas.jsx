import { useRef, useState } from 'react'
import { getStroke } from 'perfect-freehand'
import { Undo2, Trash2, PenLine, Highlighter, Shapes, Square, Circle, Minus, Triangle } from 'lucide-react'

const PRESETS = ['#eeeef5', '#5b8cff', '#a78bfa', '#f59e0b', '#34d399', '#fb7185']
const SIZES   = [2, 5, 10, 18]

const TOOLS = [
  ['pen',         <PenLine     size={13} />, 'Pen'],
  ['highlighter', <Highlighter size={13} />, 'Highlighter'],
  ['shape',       <Shapes      size={13} />, 'Shapes'],
]

const SHAPE_TYPES = [
  ['rect',     <Square   size={13} />, 'Rectangle'],
  ['ellipse',  <Circle   size={13} />, 'Ellipse'],
  ['line',     <Minus    size={13} />, 'Line'],
  ['triangle', <Triangle size={13} />, 'Triangle'],
]

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

// If very elongated, force line regardless of preferred type
function classifyShape(x1, y1, x2, y2, preferred) {
  const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1)
  if (Math.max(w, h) / Math.max(Math.min(w, h), 1) > 3.5) return 'line'
  return preferred
}

function renderShape(s, i) {
  const { shape, x1, y1, x2, y2, color, size, opacity = 1 } = s
  const minX = Math.min(x1, x2), minY = Math.min(y1, y2)
  const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1)
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2
  const p = { key: i, stroke: color, strokeWidth: size, fill: 'none', opacity, strokeLinecap: 'round', strokeLinejoin: 'round' }
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

export default function NoteCanvas({ strokes = [], onStrokesChange, readonly = false }) {
  const svgRef        = useRef()
  const livePathRef   = useRef(null)
  const liveShapeRef  = useRef(null)  // { el, type }
  const activeStroke  = useRef(null)
  const holdTimer     = useRef(null)
  const shapeModeRef  = useRef(false)
  const shapeStartRef = useRef(null)
  const lastPtRef     = useRef(null)

  const [penColor,    setPenColor]    = useState('#eeeef5')
  const [penSize,     setPenSize]     = useState(5)
  const [tool,        setTool]        = useState('pen')
  const [shapeType,   setShapeType]   = useState('rect')
  const [shapeHeld,   setShapeHeld]   = useState(false)
  const [customColor, setCustomColor] = useState('#eeeef5')

  const opacity = tool === 'highlighter' ? 0.35 : 1

  function getPoint(e) {
    const r = svgRef.current.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top, e.pressure || 0.5]
  }

  function clearLiveShape() {
    liveShapeRef.current?.el?.remove()
    liveShapeRef.current = null
  }

  function updateLiveShape(x1, y1, x2, y2) {
    const type = classifyShape(x1, y1, x2, y2, shapeType)
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

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = getPoint(e)
    lastPtRef.current = pt

    if (tool === 'shape') {
      shapeStartRef.current = pt
      shapeModeRef.current  = false
      setShapeHeld(false)
      holdTimer.current = setTimeout(() => {
        shapeModeRef.current = true
        setShapeHeld(true)
      }, 450)
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

    if (tool === 'shape') {
      if (shapeModeRef.current && shapeStartRef.current && lastPtRef.current) {
        const [x1, y1] = shapeStartRef.current
        const [x2, y2] = lastPtRef.current
        clearLiveShape()
        const type = classifyShape(x1, y1, x2, y2, shapeType)
        if (Math.abs(x2 - x1) > 5 || Math.abs(y2 - y1) > 5)
          onStrokesChange([...strokes, { shape: type, x1, y1, x2, y2, color: penColor, size: penSize, opacity }])
      } else {
        clearLiveShape()
      }
      shapeModeRef.current  = false
      shapeStartRef.current = null
      setShapeHeld(false)
    } else {
      if (!activeStroke.current) return
      livePathRef.current?.remove()
      livePathRef.current = null
      const s = activeStroke.current
      activeStroke.current = null
      if (s.points.length > 1) onStrokesChange([...strokes, s])
    }
  }

  function toolBtnStyle(active) {
    return {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 30, height: 28, borderRadius: 7, border: '1px solid transparent',
      cursor: 'pointer', background: active ? penColor + '22' : 'none',
      color: active ? penColor : 'var(--text-muted)',
      borderColor: active ? penColor + '55' : 'transparent',
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none' }}>

      {!readonly && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
          background: 'var(--bg-elevated)', flexWrap: 'wrap',
        }}>

          {/* Tool mode */}
          <div style={{ display: 'flex', gap: 3 }}>
            {TOOLS.map(([t, icon, label]) => (
              <button key={t} onClick={() => setTool(t)} title={label} style={toolBtnStyle(tool === t)}>
                {icon}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />

          {/* Shape type (only when shape tool active) */}
          {tool === 'shape' && (
            <>
              <div style={{ display: 'flex', gap: 3 }}>
                {SHAPE_TYPES.map(([t, icon, label]) => (
                  <button key={t} onClick={() => setShapeType(t)} title={label} style={toolBtnStyle(shapeType === t)}>
                    {icon}
                  </button>
                ))}
              </div>
              <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />
            </>
          )}

          {/* Preset colors + custom picker */}
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            {PRESETS.map(c => (
              <button key={c} onClick={() => setPenColor(c)} style={{
                width: 17, height: 17, borderRadius: '50%', background: c,
                border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                outline: penColor === c ? `2.5px solid ${c}` : '2px solid transparent',
                outlineOffset: 2,
                transform: penColor === c ? 'scale(1.25)' : 'scale(1)',
                transition: 'transform 0.12s',
              }} />
            ))}
            {/* Rainbow color picker */}
            <div style={{ position: 'relative', width: 17, height: 17, flexShrink: 0 }}>
              <div style={{
                width: 17, height: 17, borderRadius: '50%',
                background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                outline: !PRESETS.includes(penColor) ? '2.5px solid white' : '2px solid transparent',
                outlineOffset: 2,
                transform: !PRESETS.includes(penColor) ? 'scale(1.25)' : 'scale(1)',
                transition: 'transform 0.12s',
              }} />
              <input
                type="color"
                value={customColor}
                onChange={e => { setCustomColor(e.target.value); setPenColor(e.target.value) }}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              />
            </div>
          </div>

          <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />

          {/* Sizes */}
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

          <button
            onClick={() => strokes.length > 0 && onStrokesChange(strokes.slice(0, -1))}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
              borderRadius: 7, border: '1px solid var(--border)', background: 'none',
              color: strokes.length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
              cursor: strokes.length === 0 ? 'not-allowed' : 'pointer', fontSize: 12,
            }}
          >
            <Undo2 size={12} /> Undo
          </button>

          <button
            onClick={() => strokes.length > 0 && onStrokesChange([])}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
              borderRadius: 7, border: '1px solid var(--border)', background: 'none',
              color: strokes.length === 0 ? 'var(--text-muted)' : 'var(--accent-red)',
              cursor: strokes.length === 0 ? 'not-allowed' : 'pointer', fontSize: 12,
            }}
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>
      )}

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--canvas-bg, #0d0d14)' }}>

        {strokes.length === 0 && !readonly && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', pointerEvents: 'none',
            color: 'var(--border-strong)', fontSize: 13, letterSpacing: '0.2px',
          }}>
            {tool === 'shape' ? 'Hold to draw a shape · drag to size' : 'Draw here · Apple Pencil or mouse'}
          </div>
        )}

        {shapeHeld && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg-elevated)', border: `1px solid ${penColor}66`,
            borderRadius: 20, padding: '4px 14px', fontSize: 11, color: penColor,
            pointerEvents: 'none', zIndex: 10, letterSpacing: '0.2px',
          }}>
            Shape mode · drag to draw
          </div>
        )}

        <svg
          ref={svgRef}
          style={{
            width: '100%', height: '100%', display: 'block',
            touchAction: 'none',
            cursor: readonly ? 'default' : 'crosshair',
          }}
          onPointerDown={readonly ? undefined : onPointerDown}
          onPointerMove={readonly ? undefined : onPointerMove}
          onPointerUp={readonly   ? undefined : onPointerUp}
          onPointerLeave={readonly ? undefined : onPointerUp}
        >
          {strokes.map((s, i) => {
            if (s.shape) return renderShape(s, i)
            const outline = getStroke(s.points, strokeOpts(s.size, true))
            return <path key={i} fill={s.color} fillOpacity={s.opacity ?? 1} stroke="none" d={toPath(outline)} />
          })}
        </svg>
      </div>
    </div>
  )
}
