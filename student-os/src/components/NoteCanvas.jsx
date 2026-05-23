import { useRef, useState } from 'react'
import { getStroke } from 'perfect-freehand'
import { Undo2, Trash2 } from 'lucide-react'

const PEN_COLORS = ['#eeeef5', '#5b8cff', '#a78bfa', '#f59e0b', '#34d399', '#fb7185']
const PEN_SIZES  = [2, 5, 10, 18]

function strokeOptions(size, last = false) {
  return { size, thinning: 0.55, smoothing: 0.5, streamline: 0.5, simulatePressure: false, last }
}

function outlineToPath(outline) {
  if (outline.length < 2) return ''
  const d = outline.reduce((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length]
    acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
    return acc
  }, ['M', ...outline[0], 'Q'])
  d.push('Z')
  return d.join(' ')
}

export default function NoteCanvas({ strokes = [], onStrokesChange, readonly = false }) {
  const svgRef       = useRef()
  const livePathRef  = useRef(null)
  const activeStroke = useRef(null)
  const [penColor, setPenColor] = useState('#eeeef5')
  const [penSize,  setPenSize]  = useState(5)

  function getPoint(e) {
    const r = svgRef.current.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top, e.pressure || 0.5]
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    activeStroke.current = { points: [getPoint(e)], color: penColor, size: penSize }
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('fill', penColor)
    path.setAttribute('stroke', 'none')
    livePathRef.current = path
    svgRef.current.appendChild(path)
  }

  function onPointerMove(e) {
    if (!activeStroke.current || !livePathRef.current) return
    activeStroke.current.points.push(getPoint(e))
    const outline = getStroke(activeStroke.current.points, strokeOptions(penSize, false))
    livePathRef.current.setAttribute('d', outlineToPath(outline))
  }

  function onPointerUp() {
    if (!activeStroke.current) return
    livePathRef.current?.remove()
    livePathRef.current = null
    const s = activeStroke.current
    activeStroke.current = null
    if (s.points.length > 1) onStrokesChange([...strokes, s])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none' }}>

      {!readonly && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
          background: 'var(--bg-elevated)',
        }}>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            {PEN_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setPenColor(c)}
                style={{
                  width: 18, height: 18, borderRadius: '50%', background: c,
                  border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                  outline: penColor === c ? `2.5px solid ${c}` : '2px solid transparent',
                  outlineOffset: 2,
                  transform: penColor === c ? 'scale(1.25)' : 'scale(1)',
                  transition: 'transform 0.12s',
                }}
              />
            ))}
          </div>

          <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {PEN_SIZES.map(s => {
              const d = Math.max(6, Math.min(s * 1.4, 22))
              return (
                <button
                  key={s}
                  onClick={() => setPenSize(s)}
                  style={{
                    width: d, height: d, borderRadius: '50%',
                    background: penSize === s ? penColor : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                    transition: 'background 0.12s',
                  }}
                />
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
            Draw here · Apple Pencil or mouse
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
          onPointerUp={readonly ? undefined : onPointerUp}
          onPointerLeave={readonly ? undefined : onPointerUp}
        >
          {strokes.map((s, i) => {
            const outline = getStroke(s.points, strokeOptions(s.size, true))
            return <path key={i} fill={s.color} stroke="none" d={outlineToPath(outline)} />
          })}
        </svg>
      </div>
    </div>
  )
}
