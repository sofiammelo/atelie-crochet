import { NextRequest, NextResponse } from 'next/server'

const ROUND_RE = /^(?:R\s*\d+|Carreira\s+\d+|Carr\s+\d+|C\s*\d+|F\s*\d+|Volta\s+\d+|Vuelta\s+\d+|Round\s+\d+|Rnd\s+\d+)\b/i

// Dynamic require (eval prevents webpack static analysis)
const _require = eval('require')

// ── Canvas loader ──
function loadCanvasSync(): any {
  for (const name of ['@napi-rs/canvas', 'canvas']) {
    try { return _require(name) } catch {}
  }
  return null
}

// ── Render PDF pages to PNG buffers ──
async function renderPages(buffer: Buffer): Promise<Buffer[]> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await getDocument({ data: new Uint8Array(buffer) }).promise
  const Canvas = loadCanvasSync()
  if (!Canvas) return []

  const images: Buffer[] = []
  for (let i = 1; i <= Math.min(doc.numPages, 20); i++) {
    try {
      const page = await doc.getPage(i)
      const vp = page.getViewport({ scale: 1.5 })
      const w = Math.floor(vp.width)
      const h = Math.floor(vp.height)
      const create = Canvas.createCanvas || Canvas
      const c = create(w, h)
      const ctx = c.getContext('2d')
      await page.render({ canvasContext: ctx, viewport: vp }).promise
      const toBuf = c.toBuffer
      if (toBuf) {
        const png = toBuf.call(c, 'image/png')
        if (png && png.length > 100) images.push(Buffer.from(png))
      }
    } catch { /* page render failed */ }
  }
  return images
}

// ── Step 1: Text via pdfjs-dist ──
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

// ── Step 2: Extract from operator list ──
async function extractFromOperators(buffer: Buffer): Promise<string> {
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
          const text = (args[0] as any[]).filter((c: any) => typeof c === 'string').join('')
          if (text.trim()) parts.push(text.trim())
        }
      }
    }
  }
  return parts.join(' ')
}

// ── Step 3: OCR (render + tesseract) ──
async function ocrFallback(buffer: Buffer): Promise<string> {
  let images: Buffer[] = []

  // Try sharp PDF render (works on Linux with poppler)
  try {
    const sharp = (await import('sharp')).default
    for (let p = 0; p < 10; p++) {
      try {
        const png = await sharp(buffer, { page: p, pages: 1 }).png().toBuffer()
        if (png.length > 100) images.push(png)
      } catch { break }
    }
  } catch { /* sharp not available or no PDF support */ }

  // Try pdfjs-dist + canvas render (requires @napi-rs/canvas or canvas)
  if (images.length === 0) {
    try { images = await renderPages(buffer) } catch { /* canvas render failed */ }
  }

  if (images.length === 0) return ''

  try {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('por+eng+spa')
    let full = ''
    for (const img of images) {
      const { data } = await worker.recognize(img)
      if (data.text?.trim()) full += data.text.trim() + '\n\n'
    }
    await worker.terminate()
    return full.trim()
  } catch { return '' }
}

// ── Validates extracted text has real crochet content ──
function hasRealCrochetText(text: string): boolean {
  const lower = text.toLowerCase()
  let count = 0
  const patterns = ['carreira', 'carr', 'amigurumi', 'linha', 'volta', 'vuelta', 'ronda', 'round', 'rnd', 'material', 'materiais', 'fio', 'fios', 'lã', 'agulha', 'aguja', 'gancho', 'hook', 'needle', 'recheio', 'relleno', 'corpo', 'cuerpo', 'body', 'cabeça', 'cabeza', 'head', 'braço', 'brazo', 'arm', 'perna', 'pierna', 'leg', 'orelha', 'oreja', 'ear', 'olho', 'ojo', 'eye', 'pb', 'sc', 'aum', 'inc', 'dis', 'dec', 'cad', 'ch', 'am', 'mr']
  for (const p of patterns) {
    if (lower.includes(p)) count++
    if (count >= 2) return true
  }
  return false
}

// ── Amigurumi section/round/note parser ──
function parseSections(text: string) {
  const rawLines = text.split('\n').map(l => l.trim())
  const lines = rawLines.filter(Boolean)
  const materials: string[] = []
  const sections: { name: string; rows: { instruction: string; type: 'instruction' | 'note' }[] }[] = []
  let current: typeof sections[0] | null = null
  let inMaterials = false

  for (const line of lines) {
    const lower = line.toLowerCase()

    if (!inMaterials && (lower.includes('material') || lower.includes('fio') || lower.includes('agulha') || lower.includes('aguja') || lower.includes('hook') || lower.includes('yarn') || lower.includes('supplies') || lower.includes('hilo') || lower.includes('lã'))) {
      inMaterials = true
      materials.push(line)
      continue
    }
    if (inMaterials) {
      if (ROUND_RE.test(line) || (line.length < 30 && /^[A-ZÀ-ÿ]/.test(line) && !lower.includes('gancho') && !lower.includes('color'))) {
        inMaterials = false
      } else {
        materials.push(line)
        continue
      }
    }

    const looksLikeSectionTitle = line.length < 45 && /^[A-ZÀ-ÿ]/.test(line) && !ROUND_RE.test(line) && !/^\d/.test(line)

    if (looksLikeSectionTitle && !inMaterials) {
      if (!current) { current = { name: line, rows: [] }; continue }
      if (current.rows.length === 0) { current.name = line; continue }
      sections.push(current)
      current = { name: line, rows: [] }
      continue
    }

    if (!current) current = { name: 'Receita', rows: [] }

    if (ROUND_RE.test(line) || /^\d/.test(line) || /^(?:pb|sc|aum|inc|dis|dec|corr|cad|ch|am|mr)/i.test(line)) {
      current.rows.push({ instruction: line, type: 'instruction' })
    } else {
      current.rows.push({ instruction: line, type: 'note' })
    }
  }

  if (current) sections.push(current)
  if (sections.length === 0 && lines.length > 0) {
    sections.push({ name: 'Receita', rows: lines.map(l => ({ instruction: l, type: 'instruction' as const })) })
  }

  return { materials, sections }
}

function buildRecipe(text: string, type: string) {
  if (type !== 'amigurumi') return ''
  if (!text.trim()) return ''
  const { materials, sections } = parseSections(text)
  const recipe: any = {
    title: '',
    materials: materials.join('\n'),
    sections: sections.map((s, i) => ({
      id: `sec-${i}`,
      name: s.name,
      rows: s.rows.map((r, j) => ({
        id: `row-${i}-${j}`,
        line: j + 1,
        instruction: r.instruction,
        type: r.type,
      })),
    })),
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
    let method = ''
    const diag: string[] = []

    // Step 1: pdfjs getTextContent
    try {
      text = await extractText(buffer)
      if (text.trim()) { method = 'pdfjs-text'; diag.push('text ok') }
      else diag.push('text empty')
    } catch (e: any) { diag.push('text err:' + e?.message?.slice(0, 60)) }

    // Step 2: pdfjs operator list
    if (!text.trim()) {
      try {
        text = await extractFromOperators(buffer)
        if (text.trim()) { method = 'pdfjs-ops'; diag.push('ops ok') }
        else diag.push('ops empty')
      } catch (e: any) { diag.push('ops err:' + e?.message?.slice(0, 60)) }
    }

    // Step 3: OCR
    if (!text.trim()) {
      try {
        text = await ocrFallback(buffer)
        if (text.trim()) { method = 'ocr'; diag.push('ocr ok') }
        else diag.push('ocr empty')
      } catch (e: any) { diag.push('ocr err:' + e?.message?.slice(0, 60)) }
    }

    if (text.trim() && !hasRealCrochetText(text)) {
      diag.push('failed validation')
      text = ''
    }

    const recipe = buildRecipe(text, type)

    return NextResponse.json({
      text: text || '',
      recipe: recipe || '',
      pages: 0,
      diag: diag.join(' | '),
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Erro ao processar PDF: ' + (error?.message || 'erro desconhecido'),
    }, { status: 500 })
  }
}
