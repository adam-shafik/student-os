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
  const backgrounds = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    backgrounds.push(canvas.toDataURL('image/jpeg', 0.88))
  }
  return backgrounds
}
