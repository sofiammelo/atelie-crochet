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

// ── Step 2: Extract from operator list (catches text getTextContent misses) ──
async function extractFromOperators(buffer: Buffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const { getDocument } = pdfjsLib
    const OPS = (pdfjsLib as any).OPS || {}
    const showText = OPS.showText ?? 51
    const showSpacedText = OPS.showSpacedText ?? 52
    const doc = await getDocument({ data: new Uint8Array(buffer) }).promise
    const parts: string[] = []

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const opList = await page.getOperatorList()
      for (let j = 0; j < opList.fnArray.length; j++) {
        const fn = opList.fnArray[j]
        if (fn === showText || fn === showSpacedText) {
          const args = opList.argsArray[j]
          if (args?.[0]) {
            const chars = args[0] as any[]
            const text = chars
              .filter((c: any) => typeof c === 'string')
              .join('')
            if (text.trim()) parts.push(text.trim())
          }
        }
      }
    }
    return parts.join(' ')
  } catch {
    return ''
  }
}

// ── Step 3: OCR with sharp + tesseract.js ──
async function ocrFallback(buffer: Buffer): Promise<string> {
  let images: Buffer[] = []

  // 3a) Try sharp PDF render
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
      } catch { /* skip */ }
    }
  } catch { /* sharp not available */ }

  // 3b) Try pdfjs-dist + canvas (Vercel Linux)
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

// ── Step 4: Raw strings from PDF binary ──
function extractRawStrings(buffer: Buffer): string {
  const raw = buffer.toString('binary')

  // 4a) Standard text operators: (text) Tj / (text) ' / (text) "
  const stdOps = raw.match(/\(([^)]+)\)\s*(Tj|'|")/g) || []
  const stdTexts = stdOps
    .map(m => { const i = m.match(/^\(([^)]+)\)/); return i ? i[1] : '' })
    .filter(t => !/^[0-9\s\-./,]*$/.test(t)) // skip pure numbers

  // 4b) Array text operators: [(text) kern (text)] TJ
  const arrOps = raw.match(/\[([\s\S]*?)\]\s*TJ/g) || []
  const arrTexts = arrOps.flatMap(arr => {
    const parts = arr.match(/\(([^)]*)\)/g) || []
    return parts.map(p => p.slice(1, -1)).join(' ')
  })

  // 4c) Hex strings: <hex> Tj
  const hexOps = raw.match(/<([0-9A-Fa-f]+)>\s*Tj/g) || []
  const hexTexts = hexOps.map(m => {
    const hex = m.match(/<([0-9A-Fa-f]+)>/)
    return hex ? Buffer.from(hex[1], 'hex').toString('utf8') : ''
  }).filter(Boolean)

  // 4d) Desperate: scan for any text-like runs in the binary
  const textRuns = raw.match(/[\x20-\x7E\u00C0-\u00FF]{8,}/g) || []

  const all = [...stdTexts, ...arrTexts, ...hexTexts, ...textRuns]
    .filter(t => looksReadable(t))

  return Array.from(new Set(all)).join('\n')
}

// Heuristic: does this look like human-readable text?
function looksReadable(s: string): boolean {
  if (s.length < 6) return false
  // Count non-printable (non-ASCII, non-Latin-1) chars
  const bad = s.replace(/[\x20-\x7E\u00A0-\u00FF\u0100-\u024F]/g, '')
  if (bad.length / s.length > 0.2) return false
  // Must contain at least one letter
  if (!/[A-Za-z\u00C0-\u00FF]/.test(s)) return false
  // At least 2 words or word-like tokens
  const tokens = s.split(/[\s,;:]+/).filter(Boolean)
  if (tokens.length < 2 && s.length < 12) return false
  // Reject hex dumps
  if (/^[0-9A-Fa-f]+$/.test(s.replace(/[\s]/g, ''))) return false
  return true
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

    if (/material|materiais|fios|lã|lãs|agulha|agulhas/i.test(lower) && /[:]/.test(line)) {
      if (current) sections.push(current)
      current = null
      materials.push(line)
      continue
    }
    if (materials.length > 0 && !sectionLabels.some(s => lower.includes(s)) && !/carreira|linha|volta|carr|ª|^[0-9]/.test(lower)) {
      materials.push(line)
      continue
    }

    const isSection = sectionLabels.some(s => {
      const idx = lower.indexOf(s)
      if (idx === -1) return false
      const before = lower[idx - 1]
      return !before || /[\s\-–—,:;(]/.test(before)
    })

    if (isSection && line.length < 40) {
      if (current) sections.push(current)
      current = { name: line, rows: [] }
      continue
    }

    if (/^nota|^obs|^dica|atencao|atenção/i.test(lower) || /nota:|obs:|dica:/i.test(lower)) {
      notes.push(line)
      continue
    }

    if (current) {
      current.rows.push(line)
    }
  }

  if (current) sections.push(current)

  if (sections.length === 0 && materials.length === 0 && notes.length === 0) {
    return { materials, sections: [{ name: 'Receita', rows: lines }], notes }
  }

  return { materials, sections, notes }
}

function buildRecipe(text: string, type: string) {
  if (type !== 'amigurumi') return ''
  if (!text.trim()) return ''

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

    let text = ''
    try { text = await extractText(buffer) } catch (e: any) { console.warn('pdfjs err:', e?.message) }
    if (!text.trim()) {
      try { text = await extractFromOperators(buffer) } catch (e: any) { console.warn('oplist err:', e?.message) }
    }
    if (!text.trim()) {
      try { text = await ocrFallback(buffer) } catch (e: any) { console.warn('ocr err:', e?.message) }
    }
    if (!text.trim()) {
      text = extractRawStrings(buffer)
    }

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
