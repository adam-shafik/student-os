let _mod = null

async function loadPdfJs() {
  if (_mod) return _mod
  _mod = await import('pdfjs-dist')
  _mod.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href
  return _mod
}

export async function getPdfPageCount(source) {
  const lib = await loadPdfJs()
  const data = source instanceof ArrayBuffer ? source : await source.arrayBuffer()
  const pdf = await lib.getDocument({ data }).promise
  return pdf.numPages
}

export async function renderPdfToBackgrounds(source) {
  const lib = await loadPdfJs()
  const data = source instanceof ArrayBuffer || ArrayBuffer.isView(source) ? source : await source.arrayBuffer()
  const pdf = await lib.getDocument({ data }).promise
  const images = []
  const dimensions = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    images.push(canvas.toDataURL('image/jpeg', 0.88))
    dimensions.push({ w: Math.round(viewport.width), h: Math.round(viewport.height) })
  }
  return { images, dimensions }
}

// Extract a PDF as lightweight markdown — groups text into lines, infers headings
// from font size and bullet/numbered lists from line prefixes. Heuristic (best for
// single-column, text-based PDFs); tables stay as loose text. Used to feed the AI.
export async function extractPdfText(source) {
  const lib = await loadPdfJs()
  const data = source instanceof ArrayBuffer ? source : await source.arrayBuffer()
  const pdf = await lib.getDocument({ data }).promise

  const lines = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    let cur = null
    for (const it of content.items) {
      if (!it.str) continue
      const y = it.transform[5]
      const h = Math.abs(it.transform[3]) || it.height || 10
      if (cur && Math.abs(cur.y - y) < Math.max(3, h * 0.5)) {
        cur.parts.push(it.str)
        cur.h = Math.max(cur.h, h)
      } else {
        if (cur) lines.push(cur)
        cur = { y, h, parts: [it.str] }
      }
    }
    if (cur) lines.push(cur)
    lines.push({ blank: true })
  }

  // Body font size = median line height; headings are notably larger
  const heights = lines.filter(l => !l.blank).map(l => l.h).sort((a, b) => a - b)
  const body = heights.length ? heights[Math.floor(heights.length / 2)] : 12

  const bullet = /^\s*[•·▪◦‣*\-–]\s+/
  const numbered = /^\s*(\d+)[.)]\s+/
  const out = []
  for (const l of lines) {
    if (l.blank) { out.push(''); continue }
    let t = l.parts.join('').replace(/\s+/g, ' ').trim()
    if (!t) continue
    if (l.h >= body * 1.5)        t = `# ${t}`
    else if (l.h >= body * 1.25)  t = `## ${t}`
    else if (l.h >= body * 1.1)   t = `### ${t}`
    else if (bullet.test(t))      t = t.replace(bullet, '- ')
    else if (numbered.test(t))    t = t.replace(numbered, (_m, n) => `${n}. `)
    out.push(t)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
