import { NextRequest, NextResponse } from 'next/server'

// ── Step 1: Extract text with pdfjs-dist (text-based PDFs) ──
async function extractText(buffer: Buffer): Promise<string> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await getDocument({ data: new Uint8Array(buffer) }).promise
  const parts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const tc = await page.getTextContent()
    const texts = tc.items.map((item: any) => item.str).join(' ')
    if (texts.trim()) parts.push(texts.trim())
  }
  return parts.join('\n\n')
}

// ── Step 2: OCR with sharp PDF render + tesseract.js ──
async function ocrFallback(buffer: Buffer): Promise<string> {
  let images: Buffer[] = []

  // 2a) Try sharp — reads PDF directly if libvips has poppler
  try {
    const sharp = (await import('sharp')).default
    const pageCount = estimatePDFPages(buffer)
    for (let p = 0; p < Math.min(pageCount, 20); p++) {
      try {
        const img = sharp(buffer, { page: p, pages: 1 })
        const meta = await img.metadata()
        if (meta.width && meta.height) {
          images.push(await img.png().toBuffer())
        }
      } catch { /* sharp can't read this page */ }
    }
  } catch { /* sharp not available */ }

  // 2b) Try pdfjs-dist + canvas (works on Vercel Linux)
  if (images.length === 0) {
    try {
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
      let Canvas: any
      try { Canvas = eval('require')('canvas') } catch { Canvas = null }
      if (Canvas) {
        const doc = await getDocument({ data: new Uint8Array(buffer) }).promise
        for (let i = 1; i <= Math.min(doc.numPages, 20); i++) {
          const page = await doc.getPage(i)
          const vp = page.getViewport({ scale: 1.5 })
          const c = Canvas.createCanvas(Math.floor(vp.width), Math.floor(vp.height))
          const ctx = c.getContext('2d')
          await page.render({ canvasContext: ctx, viewport: vp }).promise
          images.push(c.toBuffer('image/png'))
        }
      }
    } catch { /* pdfjs+canvas render failed */ }
  }

  if (images.length === 0) return ''

  // Run tesseract.js on collected images
  try {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('por+eng')
    let full = ''
    for (const img of images) {
      const { data } = await worker.recognize(img)
      if (data.text?.trim()) full += data.text.trim() + '\n\n'
    }
    await worker.terminate()
    return full.trim()
  } catch {
    return ''
  }
}

// ── Step 3: Extract raw human-readable strings from PDF binary ──
function extractRawStrings(buffer: Buffer): string {
  const raw = buffer.toString('binary')
  // Find strings between parentheses in PDF (e.g., (Carreira 1: 6 pb))
  const parenMatches = raw.match(/\(([^)]{3,})\)/g) || []
  // Find text between BT...ET markers
  const btEt = raw.match(/BT([\s\S]+?)ET/g) || []
  const btTexts = btEt.map(b => {
    const parts = b.match(/\(([^)]*)\)/g) || []
    return parts.map(p => p.slice(1, -1)).join(' ')
  })
  const all = [...parenMatches.map(p => p.slice(1, -1)), ...btTexts]
    .filter(t => /[A-Za-z\u00C0-\u00FF0-9]{3,}/.test(t))
  return Array.from(new Set(all)).join('\n')
}

// ── Step 4: Heuristic PDF page count ──
function estimatePDFPages(buffer: Buffer): number {
  const raw = buffer.toString('binary')
  const m = raw.match(/\/Type\s*\/Page[^s]/g)
  return m ? m.length : 1
}

// ── Main ──
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Nenhum PDF enviado' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 1) Text extraction with pdfjs-dist
    let text = ''
    try { text = await extractText(buffer) } catch (e: any) { console.warn('pdfjs err:', e?.message) }

    // 2) OCR fallback for scanned/image PDFs
    if (!text.trim()) {
      try { text = await ocrFallback(buffer) } catch (e: any) { console.warn('ocr err:', e?.message) }
    }

    // 3) Raw string extraction from PDF binary
    if (!text.trim()) {
      text = extractRawStrings(buffer)
    }

    return NextResponse.json({ text: text || '', pages: 0 })
  } catch (error: any) {
    console.error('PDF error:', error?.message || error)
    return NextResponse.json({
      error: 'Erro ao processar PDF: ' + (error?.message || 'erro desconhecido'),
    }, { status: 500 })
  }
}
