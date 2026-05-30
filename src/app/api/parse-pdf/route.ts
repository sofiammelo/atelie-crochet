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

  // 4c) Hex strings: <hex> Tj — try UTF-8 then UTF-16BE
  const hexOps = raw.match(/<([0-9A-Fa-f]+)>\s*Tj/g) || []
  const hexTexts = hexOps.map(m => {
    const hex = m.match(/<([0-9A-Fa-f]+)>/)
    if (!hex) return ''
    const buf = Buffer.from(hex[1], 'hex')
    const utf8 = buf.toString('utf8')
    if (/^[\x20-\x7E\u00A0-\u00FF\u0100-\u024F\s]+$/.test(utf8)) return utf8
    // Try UTF-16BE
    const utf16 = buf.toString('utf16le')
    if (/^[\x20-\x7E\u00A0-\u00FF\u0100-\u024F\s]+$/.test(utf16)) return utf16
    return ''
  }).filter(Boolean)

  // 4d) Desperate: scan for any text-like runs in the binary
  const textRuns = raw.match(/[\x20-\x7E\u00C0-\u00FF]{8,}/g) || []

  const all = [...stdTexts, ...arrTexts, ...hexTexts, ...textRuns]
    .filter(t => looksReadable(t))

  return Array.from(new Set(all)).join('\n')
}

// Heuristic: does this look like human-readable text?
function looksReadable(s: string): boolean {
  if (s.length < 4) return false
  const bad = s.replace(/[\x20-\x7E\u00A0-\u00FF\u0100-\u024F]/g, '')
  if (bad.length / s.length > 0.2) return false
  if (!/[A-Za-z\u00C0-\u00FF]/.test(s)) return false
  // Single token is OK if it has more than 2 letters with Portuguese accents
  const tokens = s.split(/[\s,;:]+/).filter(Boolean)
  if (tokens.length < 2) {
    if (s.length >= 12) return true
    const letters = s.replace(/[^A-Za-z\u00C0-\u00FF]/g, '')
    if (letters.length >= 4) return true
    return false
  }
  if (/^[0-9A-Fa-f]+$/.test(s.replace(/[\s]/g, ''))) return false
  return true
}

// ── Heuristic PDF page count ──
function estimatePDFPages(buffer: Buffer): number {
  const raw = buffer.toString('binary')
  const m = raw.match(/\/Type\s*\/Page[^s]/g)
  return m ? m.length : 1
}

// ── Amigurumi section/round/note parser ──
// Matches round patterns: R1, R2, R3-R5, Carreira 1:, Carr 1:, C1:, F1:
const ROUND_RE = /^(?:R\s*\d+|Carreira\s+\d+|Carr\s+\d+|C\s*\d+|F\s*\d+|Volta\s+\d+)\b/i

// ── Detects if a line marks the start of a materials list ──
const MATS_RE = /^(?:material|materiais|fios|lã|lãs|agulha|agulhas|necessário|necessarios)/i

function isRoundLine(line: string): boolean {
  return ROUND_RE.test(line.trim())
}

function parseSections(text: string) {
  const rawLines = text.split('\n').map(l => l.trim())
  const lines = rawLines.filter(Boolean)
  const materials: string[] = []
  const sections: { name: string; rows: { instruction: string; type: 'instruction' | 'note' }[] }[] = []
  let current: typeof sections[0] | null = null
  let inMaterials = false

  for (const line of lines) {
    const lower = line.toLowerCase()

    // Detect materials block
    if (!inMaterials && MATS_RE.test(lower) && (lower.includes(':') || lower.includes('-'))) {
      inMaterials = true
      materials.push(line)
      continue
    }
    if (inMaterials) {
      // Stop when we hit a round line or a short line that looks like a section title
      if (isRoundLine(line) || (line.length < 30 && /^[A-ZÀ-ÿ]/.test(line) && !lower.includes('gancho') && !lower.includes('color'))) {
        inMaterials = false
        // fall through to section/note detection below
      } else {
        materials.push(line)
        continue
      }
    }

    // Lines that start a new section: short, capitalized, and not a round
    const looksLikeSectionTitle = line.length < 45
      && /^[A-ZÀ-ÿ]/.test(line)
      && !isRoundLine(line)
      && !/^\d/.test(line)
      && !lower.startsWith('nota')
      && !lower.startsWith('obs')

    if (looksLikeSectionTitle && !inMaterials && !current && sections.length === 0) {
      current = { name: line, rows: [] }
      continue
    }
    if (looksLikeSectionTitle && current && current.rows.length === 0) {
      // This is the section title (Ordem 1)
      current.name = line
      continue
    }
    if (looksLikeSectionTitle && current && current.rows.length > 0) {
      // New section starts
      sections.push(current)
      current = { name: line, rows: [] }
      continue
    }

    // If no section yet, this is the first section (receita)
    if (!current) {
      current = { name: 'Receita', rows: [] }
    }

    // Detect if it's a note or a round
    if (isRoundLine(line) || /^\d/.test(line) || /^(?:pb|aum|dis|corr|carr|am)/i.test(line)) {
      current.rows.push({ instruction: line, type: 'instruction' })
    } else if (current.rows.length === 0) {
      // First line after title: if it doesn't look like a round, it's the title continuation
      // Actually, let me check: in the user's model, the first row after section title can be a note
      // Notes start with "Nota:" or "nota:" usually
      if (lower.startsWith('nota') || lower.startsWith('obs') || lower.includes('nota:')) {
        current.rows.push({ instruction: line, type: 'note' })
      } else {
        current.rows.push({ instruction: line, type: 'instruction' })
      }
    } else {
      // Everything else after the first round is a note
      current.rows.push({ instruction: line, type: 'note' })
    }
  }

  if (current) sections.push(current)

  if (sections.length === 0 && lines.length > 0) {
    sections.push({
      name: 'Receita',
      rows: lines.map(l => ({ instruction: l, type: isRoundLine(l) ? 'instruction' as const : 'note' as const })),
    })
  }

  return { materials, sections }
}

function buildRecipe(text: string, type: string) {
  if (type !== 'amigurumi') return ''
  if (!text.trim()) return ''

  const { materials, sections } = parseSections(text)

  let orderCounter = 1
  const recipe: any = {
    title: '',
    materials: materials.join('\n'),
    sections: sections.map((s, i) => {
      // First row is the title (Ordem 1), remaining are numbered from 2
      const rows = s.rows.map((r, j) => ({
        id: `row-${i}-${j}`,
        line: j + 1, // Ordem within section (1 = title)
        instruction: r.instruction,
        type: r.type,
      }))
      return { id: `sec-${i}`, name: s.name, rows }
    }),
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
