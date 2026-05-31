import { NextRequest, NextResponse } from 'next/server'

const ROUND_RE = /(?:R\s*\d+[\s.]|Carreira\s+\d+|Carr\s+\d+|C\s*\d+|F\s*\d+|Volta\s+\d+|Vuelta\s+\d+|Round\s+\d+|Rnd\s+\d+)/i

// Canvas loader — uses dynamic import to avoid webpack bundling
async function loadCanvas(): Promise<any> {
  for (const name of ['@napi-rs/canvas', 'canvas']) {
    try {
      const mod = await import(name)
      return mod.createCanvas ? mod : mod.default || mod
    } catch {}
  }
  return null
}

// ── Init pdfjs (pdfjs-dist is externalized, worker resolves from node_modules) ──
async function initPdfjs() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  return pdfjsLib
}

// ── Render PDF pages to PNG buffers ──
async function renderPages(buffer: Buffer): Promise<Buffer[]> {
  const { getDocument } = await initPdfjs()
  const doc = await getDocument({ data: new Uint8Array(buffer) }).promise
  const Canvas = await loadCanvas()
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
  const { getDocument } = await initPdfjs()
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
  const pdfjsLib = await initPdfjs()
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
const SECTION_NAMES = [
  'Corpo', 'Cuerpo', 'Body', 'Cabeça', 'Cabeza', 'Head',
  'Braço', 'Braços', 'Brazo', 'Brazos', 'Arm', 'Arms',
  'Perna', 'Pernas', 'Pierna', 'Piernas', 'Leg', 'Legs',
  'Orelha', 'Orelhas', 'Oreja', 'Orejas', 'Ear', 'Ears',
  'Olho', 'Olhos', 'Ojo', 'Ojos', 'Eye', 'Eyes',
  'Focinho', 'Hocico', 'Snout',
  'Rabo', 'Tail',
  'Asa', 'Asas', 'Ala', 'Alas', 'Wing', 'Wings',
  'Bico', 'Pico', 'Beak',
  'Morango', 'Strawberry', 'Folha', 'Leaf', 'Tallo', 'Stem',
  'Barriga', 'Belly', 'Tronco', 'Trunk', 'Casco', 'Hoof',
  'Mane', 'Juba', 'Crin',
  'Saia', 'Skirt', 'Laço', 'Bow', 'Chapéu', 'Hat',
  'Notas finais', 'Notas finaes', 'Notas finais',
  'Instruções', 'Instrucciones', 'Instructions',
]

// Build a regex that matches section names as whole words
const SECTION_RE = new RegExp(`\\b(?:${SECTION_NAMES.map(n => n.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')})(?:\\s*\\(\\s*2\\s*x\\s*\\))?`, 'i')

// Build a regex that matches section names preceded by a strong boundary
function splitAtSectionBoundaries(line: string): string[] {
  const parts: string[] = []
  // Match section names after: start-of-line, ". ", ") ", or "  " (2+ spaces)
  const re = new RegExp(`(?:^|\\.\\s+|\\)\\s+|\\s{2,})(?=(?:${SECTION_NAMES.map(n => n.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')})(?:\\s*\\(\\s*2\\s*x\\s*\\))?)`, 'gi')
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    const boundaryEnd = m.index + m[0].length
    if (boundaryEnd > last) {
      parts.push(line.slice(last, boundaryEnd).trim())
    }
    last = boundaryEnd
  }
  if (last < line.length) {
    parts.push(line.slice(last).trim())
  }
  return parts.filter(Boolean)
}

function looksLikeSectionTitle(line: string): boolean {
  if (line.length > 55) return false
  if (ROUND_RE.test(line)) return false
  if (/^\d/.test(line)) return false
  if (/^[a-z]/.test(line)) return false
  // Check that line starts with or IS a section name
  const match = line.match(SECTION_RE)
  if (!match) return false
  // The section name should be at or near the start
  return match.index !== undefined && match.index <= 3
}

function splitIntoRows(line: string): { instruction: string; type: 'instruction' | 'note' }[] {
  const rows: { instruction: string; type: 'instruction' | 'note' }[] = []
  // Split at ) + spaces before round marker, or . + spaces before round/note marker,
  // or 3+ spaces before round marker, or any space before Nota:
  const re = /(?:(?<=\))\s+(?=R\s*\d+(?:-\d+)?[\.\s])|(?<=\.)\s{2,}(?=R\s*\d+(?:-\d+)?[\.\s])|(?:(?<=\.)|(?<=\)))\s+(?=F\s*\d+[\.\s])|\s{3,}(?=R\s*\d+(?:-\d+)?[\.\s])|(?:(?<=\.)|(?<=\)))\s+(?=[Nn]ota:))/gi
  const segments = line.split(re).filter(Boolean)

  for (const seg of segments) {
    const s = seg.trim()
    if (!s) continue

    if (/^(?:Nota|NOTA|nota):/.test(s)) {
      rows.push({ instruction: s, type: 'note' })
    } else if (/nota:/i.test(s)) {
      rows.push({ instruction: s, type: 'note' })
    } else if (ROUND_RE.test(s) && !/nota:/i.test(s)) {
      rows.push({ instruction: s, type: 'instruction' })
    } else if (/^\d/.test(s) || /^(?:pb|sc|aum|inc|dis|dec|corr|cad|ch|am|mr|pe|slst)/i.test(s)) {
      rows.push({ instruction: s, type: 'instruction' })
    } else if (/^[·•x]\s*/.test(s) || /^[A-ZÀ-ÿ]/.test(s)) {
      rows.push({ instruction: s, type: 'note' })
    } else {
      rows.push({ instruction: s, type: 'instruction' })
    }
  }
  return rows
}

function parseSections(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const materials: string[] = []
  const sections: { name: string; rows: { instruction: string; type: 'instruction' | 'note' }[] }[] = []
  let inMaterials = false

  // First pass: expand lines that contain section boundaries within them
  const expanded: string[] = []
  for (const line of lines) {
    // Check if line contains a section name at a boundary
    const boundaryRe = new RegExp(`(?:\\.\\s+|\\)\\s+|\\s{2,})(?=(?:${SECTION_NAMES.map(n => n.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')})(?:\\s*\\(\\s*2\\s*x\\s*\\))?)`, 'gi')
    if (boundaryRe.test(line) && line.length > 60) {
      const sub = splitAtSectionBoundaries(line)
      expanded.push(...sub)
    } else {
      expanded.push(line)
    }
  }

  for (const line of expanded) {
    const lower = line.toLowerCase()

    // Materials detection
    if (!inMaterials && /^material/i.test(line)) {
      inMaterials = true
      materials.push(line)
      continue
    }
    if (inMaterials) {
      if (looksLikeSectionTitle(line) || (ROUND_RE.test(line) && line.length < 50)) {
        inMaterials = false
      } else {
        materials.push(line)
        continue
      }
    }

    // Section title
    if (looksLikeSectionTitle(line)) {
      // Use the cleaned section name
      const nameMatch = line.match(SECTION_RE)
      const name = nameMatch ? line.slice(nameMatch.index || 0) : line
      if (sections.length === 0 || sections[sections.length - 1].rows.length > 0) {
        sections.push({ name, rows: [] })
      } else {
        sections[sections.length - 1].name = name
      }
      continue
    }

    if (sections.length === 0) sections.push({ name: 'Receita', rows: [] })
    const current = sections[sections.length - 1]

    const rows = splitIntoRows(line)
    current.rows.push(...rows)
  }

  if (sections.length === 0 && expanded.length > 0) {
    sections.push({ name: 'Receita', rows: expanded.flatMap(l => splitIntoRows(l)) })
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
