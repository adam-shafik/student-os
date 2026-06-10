import { useState, useRef, useEffect } from 'react'
import { X, PenLine, Type, FileText, Upload } from 'lucide-react'
import AppSelect, { AppSelectItem } from './AppSelect'

const BG_PRESETS = [
  { label: 'White',      hex: '#ffffff' },
  { label: 'Cream',      hex: '#f5f0e8' },
  { label: 'Yellow',     hex: '#fef9c3' },
  { label: 'Light blue', hex: '#e8f0fe' },
  { label: 'Graphite',   hex: '#1c1c24' },
  { label: 'Midnight',   hex: '#0b0c13' },
]

const SPACING_OPTIONS = [
  { label: 'Compact', value: 32 },
  { label: 'Normal',  value: 48 },
  { label: 'Wide',    value: 64 },
]

const TEMPLATES = [
  { id: 'blank',  label: 'Blank' },
  { id: 'lined',  label: 'Lined' },
  { id: 'dotted', label: 'Dotted' },
  { id: 'grid',   label: 'Grid' },
]

const NOTE_TYPES = [
  { id: 'handwritten', label: 'Handwritten', Icon: PenLine,   accent: 'var(--accent-purple, #a78bfa)', activeBg: 'rgba(167,139,250,0.1)' },
  { id: 'typed',       label: 'Typed',       Icon: Type,      accent: 'var(--accent-blue, #5b8cff)',   activeBg: 'rgba(91,140,255,0.09)' },
  { id: 'pdf',         label: 'From PDF',    Icon: FileText,  accent: '#f97316',                       activeBg: 'rgba(249,115,22,0.09)' },
]

function isDark(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

function TemplateMiniPreview({ type }) {
  const W = 38, H = 26
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <rect width={W} height={H} rx={3} fill="rgba(255,255,255,0.06)" />
      {type === 'lined' && [8, 13, 18, 23].map(y => (
        <line key={y} x1={4} y1={y} x2={W - 4} y2={y} stroke="rgba(255,255,255,0.26)" strokeWidth={0.8} />
      ))}
      {type === 'dotted' && [7, 13, 19].flatMap(y => [8, 16, 24, 32].map(x => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1.1} fill="rgba(255,255,255,0.3)" />
      )))}
      {type === 'grid' && (
        <>
          {[7, 13, 19].map(y => <line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.22)" strokeWidth={0.6} />)}
          {[9, 18, 27].map(x => <line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(255,255,255,0.22)" strokeWidth={0.6} />)}
        </>
      )}
    </svg>
  )
}

function NotePreview({ template, bgColor, lineSpacing, orientation }) {
  const isLandscape = orientation === 'landscape'
  const W = isLandscape ? 184 : 130
  const H = isLandscape ? 130 : 184
  const lineColor = isDark(bgColor) ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.16)'
  const sf = W / 220
  const lines = []
  if (template === 'lined') {
    const sp = lineSpacing * sf
    for (let y = sp * 1.5; y < H; y += sp) {
      lines.push(<line key={y} x1={10} y1={y} x2={W - 10} y2={y} stroke={lineColor} strokeWidth={0.8} />)
    }
  } else if (template === 'dotted') {
    const sp = lineSpacing * sf
    for (let y = sp; y < H; y += sp) {
      for (let x = sp; x < W; x += sp) {
        lines.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} fill={lineColor} />)
      }
    }
  } else if (template === 'grid') {
    const sp = lineSpacing * sf * 0.6
    for (let y = sp; y < H; y += sp) lines.push(<line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke={lineColor} strokeWidth={0.7} />)
    for (let x = sp; x < W; x += sp) lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke={lineColor} strokeWidth={0.7} />)
  }
  const marginX = Math.round(10 * (W / 130))
  return (
    <svg width={W} height={H} style={{ borderRadius: 8, display: 'block', boxShadow: '0 4px 20px rgba(0,0,0,0.32)', flexShrink: 0 }}>
      <rect width={W} height={H} rx={8} fill={bgColor} />
      {lines}
      {template === 'lined' && (
        <line x1={marginX} y1={0} x2={marginX} y2={H} stroke={isDark(bgColor) ? 'rgba(255,110,110,0.45)' : 'rgba(200,50,50,0.35)'} strokeWidth="0.8" />
      )}
    </svg>
  )
}

export default function NewNoteModal({ domains = [], defaultDomainId = null, defaultWeek = null, onConfirm, onConfirmPdf, onCancel }) {
  const [noteType,    setNoteType]    = useState('handwritten')
  const [title,       setTitle]       = useState('')
  const [template,    setTemplate]    = useState('lined')
  const [bgColor,     setBgColor]     = useState('#f5f0e8')
  const [lineSpacing, setLineSpacing] = useState(48)
  const [orientation, setOrientation] = useState('portrait')
  const [domainId,    setDomainId]    = useState(defaultDomainId || '')
  const [week,        setWeek]        = useState(defaultWeek != null ? String(defaultWeek) : '')
  const [pdfFile,     setPdfFile]     = useState(null)
  const pdfInputRef = useRef()
  // Don't auto-focus the name field on touch devices — it pops the keyboard the moment the modal opens
  const isTouch = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0)

  const isHW  = noteType === 'handwritten'
  const isPDF = noteType === 'pdf'
  const canConfirm = isPDF ? !!pdfFile : true

  function handleConfirm() {
    if (!canConfirm) return
    if (isPDF) {
      onConfirmPdf(pdfFile, {
        title: title.trim() || pdfFile.name.replace(/\.pdf$/i, ''),
        domainId: domainId || null,
        academicWeek: week ? Number(week) : null,
      })
    } else {
      onConfirm({
        type: noteType,
        title: title.trim() || 'Untitled Note',
        template:    isHW ? template    : 'blank',
        bgColor:     isHW ? bgColor     : '#f8f7f2',
        lineSpacing: isHW ? lineSpacing : 32,
        orientation: isHW ? orientation : 'portrait',
        domainId: domainId || null,
        academicWeek: week ? Number(week) : null,
      })
    }
  }

  const lbl = {
    display: 'block', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.055em', textTransform: 'uppercase',
    color: 'var(--text-muted)', marginBottom: 8,
  }

  const optLabel = { fontWeight: 400, textTransform: 'none', letterSpacing: 0, opacity: 0.5 }

  const segBtn = (active) => ({
    flex: 1, padding: '7px 0', borderRadius: 7, cursor: 'pointer',
    border: active ? '1.5px solid var(--accent-blue, #5b8cff)' : '1.5px solid var(--border)',
    background: active ? 'rgba(91,140,255,0.09)' : 'rgba(255,255,255,0.02)',
    fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
    color: active ? 'var(--accent-blue, #5b8cff)' : 'var(--text-muted)',
    transition: 'border-color 0.12s, background 0.12s', textTransform: 'capitalize',
  })

  const textInput = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    background: 'var(--bg-input, rgba(255,255,255,0.04))',
    border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
  }

  const bodyRef = useRef(null)
  const [bodyH, setBodyH] = useState(null)
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => setBodyH(Math.ceil(entry.contentRect.height)))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const activeIdx = NOTE_TYPES.findIndex(t => t.id === noteType)
  const activeType = NOTE_TYPES[activeIdx]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}>
      <style>{`
        @keyframes _nm-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
      `}</style>
      <div style={{
        width: 640, maxWidth: '95vw',
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 20, boxShadow: '0 24px 72px rgba(0,0,0,0.44)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>New note</span>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', borderRadius: 6 }}>
            <X size={16} />
          </button>
        </div>

        {/* Type selector — segmented control with sliding pill */}
        <div style={{ padding: '16px 22px 0' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: 10, padding: 3,
          }}>
            {/* Sliding pill */}
            <div style={{
              position: 'absolute', top: 3, bottom: 3,
              left: 3, width: 'calc((100% - 6px) / 3)',
              background: activeType.activeBg,
              border: `1.5px solid ${activeType.accent}`,
              borderRadius: 7,
              transform: `translateX(${activeIdx * 100}%)`,
              transition: 'transform 0.22s cubic-bezier(0.32,0.72,0,1), background 0.18s, border-color 0.18s',
              pointerEvents: 'none',
            }} />
            {NOTE_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setNoteType(t.id)}
                style={{
                  flex: 1, padding: '9px 8px', borderRadius: 7, cursor: 'pointer',
                  border: 'none', background: 'none', position: 'relative', zIndex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                }}
              >
                <t.Icon size={16} color={noteType === t.id ? t.accent : 'var(--text-muted)'} style={{ transition: 'color 0.18s' }} />
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', color: noteType === t.id ? t.accent : 'var(--text-muted)', transition: 'color 0.18s' }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Body — outer div animates height, inner div is naturally sized */}
        <div style={{ overflow: 'hidden', height: bodyH ?? 'auto', transition: 'height 0.28s cubic-bezier(0.32,0.72,0,1)' }}>
          <div ref={bodyRef} style={{ display: 'flex' }}>
          {/* Form column — re-keyed per type so entry animation fires on switch */}
          <div key={noteType} style={{ flex: 1, padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', animation: '_nm-in 0.18s ease' }}>

            {/* PDF file picker */}
            {isPDF && (
              <div>
                <label style={lbl}>PDF file</label>
                <input
                  ref={pdfInputRef} type="file" accept=".pdf,application/pdf"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setPdfFile(f) }}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => pdfInputRef.current?.click()}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '16px',
                    background: pdfFile ? 'rgba(249,115,22,0.07)' : 'rgba(255,255,255,0.02)',
                    border: pdfFile ? '1.5px solid rgba(249,115,22,0.4)' : '1.5px dashed var(--border)',
                    borderRadius: 10, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <Upload size={20} color={pdfFile ? '#f97316' : 'var(--text-muted)'} strokeWidth={1.5} />
                  <span style={{ fontSize: 13, color: pdfFile ? '#f97316' : 'var(--text-muted)' }}>
                    {pdfFile ? pdfFile.name : 'Click to select a PDF'}
                  </span>
                  {pdfFile && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {(pdfFile.size / 1024 / 1024).toFixed(1)} MB — click to change
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Note name */}
            <div>
              <label style={lbl}>Note name</label>
              <input
                autoFocus={!isPDF && !isTouch}
                type="text"
                placeholder={isPDF && pdfFile ? pdfFile.name.replace(/\.pdf$/i, '') : 'Untitled Note'}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canConfirm && handleConfirm()}
                style={textInput}
              />
            </div>

            {/* Handwritten-only fields */}
            {isHW && (
              <>
                <div>
                  <label style={lbl}>Template</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTemplate(t.id)}
                        style={{
                          flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
                          border: template === t.id ? '1.5px solid var(--accent-blue, #5b8cff)' : '1.5px solid var(--border)',
                          background: template === t.id ? 'rgba(91,140,255,0.09)' : 'rgba(255,255,255,0.02)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                          transition: 'border-color 0.12s, background 0.12s',
                        }}
                      >
                        <TemplateMiniPreview type={t.id} />
                        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', color: template === t.id ? 'var(--accent-blue, #5b8cff)' : 'var(--text-muted)' }}>
                          {t.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={lbl}>Page color</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {BG_PRESETS.map(p => (
                      <button
                        key={p.hex} title={p.label} onClick={() => setBgColor(p.hex)}
                        style={{
                          width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: p.hex,
                          border: bgColor === p.hex ? '2.5px solid var(--accent-blue, #5b8cff)' : '2px solid var(--border)',
                          cursor: 'pointer', outline: 'none',
                          transform: bgColor === p.hex ? 'scale(1.14)' : 'scale(1)',
                          transition: 'transform 0.12s, border-color 0.12s',
                        }}
                      />
                    ))}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 2 }}>
                      {BG_PRESETS.find(p => p.hex === bgColor)?.label ?? ''}
                    </span>
                  </div>
                </div>

                {template !== 'blank' && (
                  <div>
                    <label style={lbl}>{template === 'dotted' ? 'Dot spacing' : 'Line spacing'}</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {SPACING_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => setLineSpacing(opt.value)} style={segBtn(lineSpacing === opt.value)}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label style={lbl}>Orientation</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['portrait', 'landscape'].map(o => (
                      <button key={o} onClick={() => setOrientation(o)} style={segBtn(orientation === o)}>{o}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Domain + week (all types) */}
            <div>
              <label style={lbl}>Domain <span style={optLabel}>(optional)</span></label>
              <AppSelect value={domainId} onChange={setDomainId}>
                <AppSelectItem value="">None</AppSelectItem>
                {domains.map(d => (
                  <AppSelectItem key={d.id} value={d.id}>{d.name}</AppSelectItem>
                ))}
              </AppSelect>
            </div>

            <div>
              <label style={lbl}>Academic week <span style={optLabel}>(optional)</span></label>
              <input
                type="number" min={1} max={52} placeholder="e.g. 3"
                value={week} onChange={e => setWeek(e.target.value)}
                style={{ ...textInput, width: 90 }}
              />
            </div>
          </div>

          {/* Right preview (handwritten only) */}
          {isHW && (
            <div style={{
              width: 220, flexShrink: 0, borderLeft: '1px solid var(--border)',
              background: 'rgba(0,0,0,0.14)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 14, padding: 24,
            }}>
              <NotePreview template={template} bgColor={bgColor} lineSpacing={lineSpacing} orientation={orientation} />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.65 }}>
                {template.charAt(0).toUpperCase() + template.slice(1)}
                {' · '}{orientation}
                {template !== 'blank' && (
                  <>{' · '}{lineSpacing === 32 ? 'compact' : lineSpacing === 48 ? 'normal' : 'wide'}</>
                )}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onCancel}
            style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{
              padding: '9px 22px', borderRadius: 9, border: 'none',
              background: canConfirm ? 'var(--accent-blue, #5b8cff)' : 'var(--bg-overlay)',
              color: canConfirm ? '#fff' : 'var(--text-muted)',
              fontSize: 14, fontWeight: 600,
              cursor: canConfirm ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', transition: 'filter 0.12s, transform 0.12s',
            }}
            onMouseEnter={e => { if (canConfirm) { e.currentTarget.style.filter = 'brightness(1.12)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
            onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = '' }}
            onMouseDown={e => { if (canConfirm) e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={e => { if (canConfirm) e.currentTarget.style.transform = 'translateY(-1px)' }}
          >
            Create note
          </button>
        </div>
      </div>
    </div>
  )
}
