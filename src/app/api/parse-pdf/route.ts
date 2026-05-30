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

// ── Step 3: Extract readable strings from PDF binary ──
// Only matches text inside PDF text operators (Tj / TJ / ' ") to avoid binary garbage
function extractRawStrings(buffer: Buffer): string {
  const raw = buffer.toString('binary')

  // Pattern: (text) Tj  or  (text) '  or  (text) "
  const tj = raw.match(/\(([^)]{2,})\)\s*(Tj|'|")\b/g) || []
  const tjTexts = tj.map(m => {
    const inner = m.match(/^\(([^)]+)\)/)
    return inner ? inner[1] : ''
  })

  // Pattern: [(text) kern (text)] TJ
  const tjArray = raw.match(/\[([\s\S]*?)\]\s*TJ\b/g) || []
  const tjArrayTexts = tjArray.flatMap(arr => {
    const parts = arr.match(/\(([^)]*)\)/g) || []
    return [parts.map(p => p.slice(1, -1)).join(' ')]
  })

  const all = [...tjTexts, ...tjArrayTexts]
    .filter(t => looksLikeText(t))
  return Array.from(new Set(all)).join('\n')
}

// Heuristic: string looks like human-readable text
function looksLikeText(s: string): boolean {
  if (s.length < 8) return false
  const printable = s.replace(/[\x20-\x7E\u00C0-\u00FF]/g, '')
  if (printable.length / s.length > 0.15) return false // too many non-printable chars
  // Must have spaces between words (or common crochet separators)
  if (!/[\s,;:]/.test(s)) return false
  // Reject if only numbers/symbols
  if (/^[0-9\s\-./,]*$/.test(s)) return false
  // Reject hex-looking strings
  if (/^[0-9A-Fa-f\s]+$/.test(s)) return false
  return true
}

// ── Step 3b: Try to extract text from PDF operator list (more thorough) ──
async function extractFromOperatorList(buffer: Buffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const { getDocument } = pdfjsLib
    const OPS = (pdfjsLib as any).OPS || { showText: 1 }
    const doc = await getDocument({ data: new Uint8Array(buffer) }).promise
    const parts: string[] = []

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const opList = await page.getOperatorList()
      for (let j = 0; j < opList.fnArray.length; j++) {
        if (opList.fnArray[j] === OPS.showText) {
          const args = opList.argsArray[j]
          if (args?.[0]) {
            const chars = args[0] as any[]
            const text = chars
              .filter((c: any) => typeof c === 'string' || c?.unicode)
              .map((c: any) => (typeof c === 'string' ? c : c.unicode))
              .join('')
            if (text.trim() && looksLikeText(text.trim())) {
              parts.push(text.trim())
            }
          }
        }
      }
    }
    return parts.join(' ')
  } catch {
    return ''
  }
}

// ── Heuristic PDF page count ──
function estimatePDFPages(buffer: Buffer): number {
  const raw = buffer.toString('binary')
  const m = raw.match(/\/Type\s*\/Page[^s]/g)
  return m ? m.length : 1
}

// ── Amigurumi section parser ──
function parseSections(text: string) {
  const sectionLabels = [
    'cabeca', 'cabeça', 'corpo', 'bracos', 'braços', 'pernas',
    'orelhas', 'olhos', 'focinho', 'chapeu', 'chapéu', 'boca',
    'cabelo', 'rabo', 'asa', 'asas', 'antenas', 'casco',
    'concha', 'flor', 'folha', 'tronco', 'pescoco', 'pescoço',
  ]

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const sections: { name: string; rows: string[] }[] = []
  const materials: string[] = []
  const notes: string[] = []
  let current: { name: string; rows: string[] } | null = null

  for (const line of lines) {
    const lower = line.toLowerCase().trim()

    // Detect materials section
    if (/material|materiais|fios|lã|lãs|agulha|agulhas/i.test(lower) && /[:]/.test(line)) {
      if (current) sections.push(current)
      current = null
      materials.push(line)
      continue
    }
    // Continue collecting materials
    if (materials.length > 0 && !sectionLabels.some(s => lower.includes(s)) && !/carreira|linha|volta|carr|ª|^[0-9]/.test(lower)) {
      materials.push(line)
      continue
    }

    // Detect section headers (CAPS or bold looking)
    const isSection = sectionLabels.some(s => {
      const idx = lower.indexOf(s)
      if (idx === -1) return false
      // Must be at start of line or after a separator
      const before = lower[idx - 1]
      return !before || /[\s\-–—,:;(]/.test(before)
    })

    if (isSection && line.length < 40) {
      if (current) sections.push(current)
      current = { name: line, rows: [] }
      continue
    }

    // Detect notes
    if (/^nota|^obs|^dica|atencao|atenção/i.test(lower) || /nota:|obs:|dica:/i.test(lower)) {
      notes.push(line)
      continue
    }

    // Regular instruction line
    if (current) {
      current.rows.push(line)
    }
  }

  if (current) sections.push(current)

  // If no sections found, create a single section
  if (sections.length === 0 && materials.length === 0 && notes.length === 0) {
    return { materials, sections: [{ name: 'Receita', rows: lines }], notes }
  }

  return { materials, sections, notes }
}

// ── Build structured recipe from PDF text ──
function buildRecipe(text: string, type: string) {
  if (type !== 'amigurumi') return ''

  const { materials, sections, notes } = parseSections(text)

  const recipe: any = {
    title: '',
    materials: materials.join('\n'),
    sections: sections.map((s, i) => ({
      id: `sec-${i}`,
      name: s.name,
      rows: s.rows.map((r, j) => ({
        id: `row-${i}-${j}`,
        line: j + 1,
        instruction: r,
      })),
    })),
    notes: notes.length > 0 ? notes : undefined,
  }

  return JSON.stringify(recipe)
}

// ── Main ──
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File | null
    const type = (formData.get('type') as string) || 'amigurumi'
    if (!file) {
      return NextResponse.json({ error: 'Nenhum PDF enviado' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 1) Text extraction with pdfjs-dist
    let text = ''
    try { text = await extractText(buffer) } catch (e: any) { console.warn('pdfjs err:', e?.message) }

    // 2) Try operator list extraction (more thorough)
    if (!text.trim()) {
      try { text = await extractFromOperatorList(buffer) } catch (e: any) { console.warn('oplist err:', e?.message) }
    }

    // 3) OCR fallback for scanned/image PDFs
    if (!text.trim()) {
      try { text = await ocrFallback(buffer) } catch (e: any) { console.warn('ocr err:', e?.message) }
    }

    // 4) Raw string extraction from PDF binary (conservative)
    if (!text.trim()) {
      text = extractRawStrings(buffer)
    }

    // 5) Build structured recipe
    const recipe = buildRecipe(text, type)

    return NextResponse.json({
      text: text || '',
      recipe: recipe || '',
      pages: 0,
    })
  } catch (error: any) {
    console.error('PDF error:', error?.message || error)
    return NextResponse.json({
      error: 'Erro ao processar PDF: ' + (error?.message || 'erro desconhecido'),
    }, { status: 500 })
  }
}
