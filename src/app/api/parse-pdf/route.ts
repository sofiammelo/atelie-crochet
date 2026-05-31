import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const ROUND_RE = /(?:R\s*\d+(?:\s*-\s*R?\s*\d+)?[\s.]|Carreira\s+\d+|Carr\s+\d+|C\s*\d+|F\s*\d+|Volta\s+\d+|Vuelta\s+\d+|Round\s+\d+|Rnd\s+\d+)/i

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

// Multi-word names MUST come before single-word to match first
const SECTION_NAMES = [
  'Notas finais', 'Notas finaes', 'Notas Finais',
  'Abbreviations', 'Abreviaturas',
  'Morango Folha', 'Morango Fresa',
  'Instruções', 'Instrucciones', 'Instructions',
  'Barriga', 'Belly', 'Tronco', 'Trunk', 'Casco', 'Hoof',
  'Mane', 'Juba', 'Crin',
  'Saia', 'Skirt', 'Laço', 'Bow', 'Chapéu', 'Hat',
  'Cap', 'Stipe', 'Spot', 'Spots', 'Stem',
  'Assembly', 'Montagem', 'Montaje',
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
  'Sapato', 'Shoe', 'Shoes',
  'Cabelo', 'Hair', 'Chapeu',
]

// Case-sensitive regex: section titles are capitalized in patterns
const SECTION_RAW = SECTION_NAMES.map(n => n.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')
const SECTION_RE = new RegExp(`(?:${SECTION_RAW})(?:\\s*\\(\\s*2\\s*x\\s*\\))?`)
const SECTION_RE_CI = new RegExp(`(?:${SECTION_RAW})(?:\\s*\\(\\s*2\\s*x\\s*\\))?`, 'i')

// Strip common PDF page headers like "medaami © 2024 Medaami Patterns 5"
function stripPageHeader(line: string): string {
  return line.replace(/^[\w\s]+©\s*\d+\s*[\w\s]+\d*\s*/i, '').trim()
}

// Split a line at ANY whitespace before a known section name (case-insensitive, anywhere)
function splitAtSectionBoundaries(line: string): string[] {
  const parts: string[] = []
  const re = new RegExp(`(?:^|\\s+)(?=(?:${SECTION_RAW})(?:\\s*\\(\\s*2\\s*x\\s*\\))?)`, 'gi')
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

// Check line STARTS with a section name (case-insensitive)
function looksLikeSectionTitle(line: string): boolean {
  const s = stripPageHeader(line)
  const match = s.match(SECTION_RE_CI)
  if (!match || match.index !== 0) return false
  if (match[0].length > s.length / 2) return false // section name must not be most of the line
  return !ROUND_RE.test(match[0])
}

// Filter out PDF extraction artifacts (page numbers, URLs, bare numbers, etc.)
function filterArtifacts(lines: string[]): string[] {
  return lines.filter(l => {
    // Skip bare page numbers
    if (/^\d{1,2}$/.test(l)) return false
    if (/^\d{1,2}\s*$/.test(l)) return false
    // Skip bare URLs
    if (/^https?:\/\//i.test(l)) return false
    if (/^www\./i.test(l)) return false
    // Skip image references (Image 1, Photo 2, etc.)
    if (/^(Image|Photo|Figura|Imagem|Foto)\s*\d+/i.test(l)) return false
    // Skip navigation/copyright lines
    if (/\.com\s+\d+\s*$/.test(l) && l.split(/\s+/).length < 4) return false
    // Skip lines that are just a few stray chars
    if (l.replace(/[\s.,;:!?\-–—()]+/g, '').length < 2) return false
    return true
  })
}

function looksLikeCrochetInstruction(s: string): boolean {
  if (/^R\s*\d+(?:\s*-\s*R?\s*\d+)?[\s.:]/.test(s)) return true
  if (/^F\s*\d+[\s.:]/.test(s)) return true
  if (/^(?:Carreira|Carr|C|Volta|Vuelta|Round|Rnd)\s*\d+/i.test(s)) return true
  if (/^\d+\s*(?:[A-ZÄ-Ü][a-zä-ü]+|[A-ZÄ-Ü]{2,})/.test(s)) return true
  if (/^\(\s*\d+/.test(s) && /(?:Sc|Pb|Inc|Aum|Dec|Dis|Ch|Corr|Dc|Pa|Tr)\b/i.test(s)) return true
  if (/^\d+\s*(?:pb|sc|aum|inc|dis|dec|corr|cad|ch|am|mr|pe|slst|pa|dc|tr|pt|punto|x)\b/i.test(s)) return true
  return false
}

function splitIntoRows(line: string): { instruction: string; type: 'instruction' | 'note' }[] {
  const rows: { instruction: string; type: 'instruction' | 'note' }[] = []
  // Split at transitions into round markers: after ) / . / ] / 3+ spaces
  const re = /(?:(?<=[)\].])\s+(?=R\s*\d+(?:\s*-\s*R?\s*\d+)?[\.\s:])|(?:(?<=[)\].])|(?<=\d\]))\s+(?=F\s*\d+[\.\s])|\s{3,}(?=R\s*\d+(?:\s*-\s*R?\s*\d+)?[\.\s])|(?:(?<=\.)|(?<=\)))\s+(?=[Nn]ota:))/gi
  const segments = line.split(re).filter(Boolean)

  for (const seg of segments) {
    const s = seg.trim()
    if (!s) continue

    if (looksLikeCrochetInstruction(s)) {
      rows.push({ instruction: s, type: 'instruction' })
    } else {
      rows.push({ instruction: s, type: 'note' })
    }
  }
  return rows
}

function parseSections(text: string) {
  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const lines = filterArtifacts(rawLines)
  const materials: string[] = []
  const sections: { name: string; rows: { instruction: string; type: 'instruction' | 'note' }[] }[] = []
  let inMaterials = false

  // First pass: strip page headers and split lines at section boundaries
  const expanded: string[] = []
  for (const line of lines) {
    const stripped = stripPageHeader(line)
    const parts = splitAtSectionBoundaries(stripped)
    expanded.push(...parts)
  }

  for (const line of expanded) {
    // Materials detection — trigger on material keywords anywhere in line (first few words)
    if (!inMaterials && /(?:^|\s)(?:Materials?|Instruments?|You will need|Supplies?|What you need|Ferramentas?|Herramientas?)(?:\s|$)/i.test(line)) {
      inMaterials = true
      materials.push(line)
      continue
    }
    if (inMaterials) {
      if (looksLikeSectionTitle(line) || ROUND_RE.test(line)) {
        inMaterials = false
      } else {
        materials.push(line)
        continue
      }
    }

    // Section title — starts with a known section name (case-insensitive)
    if (looksLikeSectionTitle(line)) {
      const lineClean = stripPageHeader(line)
      const nameMatch = lineClean.match(SECTION_RE_CI)
      const name = (nameMatch ? nameMatch[0] : lineClean).trim()
      const remaining = nameMatch ? lineClean.slice(nameMatch.index! + nameMatch[0].length).trim() : ''

      if (sections.length > 0 && sections[sections.length - 1].rows.length === 0) {
        sections[sections.length - 1].name = name
      } else {
        sections.push({ name, rows: [] })
      }

      if (remaining) {
        const rows = splitIntoRows(remaining)
        sections[sections.length - 1].rows.push(...rows)
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

  // Merge adjacent sections with same name, remove empty ones
  const merged: typeof sections = []
  for (const sec of sections) {
    if (sec.rows.length === 0) continue
    const last = merged[merged.length - 1]
    if (last && last.name === sec.name) {
      last.rows.push(...sec.rows)
    } else {
      merged.push({ ...sec, rows: [...sec.rows] })
    }
  }

  return { materials, sections: merged }
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

// ── AI parser (via Google Gemini) ──
async function parseWithAI(text: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return ''

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  })

  const prompt = `You are a crochet pattern parser. Given raw text extracted from a PDF, output a JSON object exactly matching this TypeScript type:

{
  "title": string,
  "materials": string,
  "sections": [
    {
      "name": string,
      "rows": [
        { "instruction": string, "type": "instruction" | "note" }
      ]
    }
  ]
}

Rules:
- "title" is the pattern name (e.g. "Clove", "1Up Mushroom"). Use empty string if unclear.
- "materials" is a plain text summary of all materials, yarns, hooks, and tools. Join with newlines. Empty string if none found.
- "sections" is an array of pattern sections. Each section has a name (e.g. "Body", "Head", "Legs", "Arms", "Assembly", "Cap", "Stipe", "Spot", "Ears", "Hair", "Backpack") and rows.
- Each row has an "instruction" (the text) and "type":
  - "instruction" = actual crochet steps (rounds, rows, increases, decreases, etc.)
  - "note" = tips, assembly notes, copyright text, abbreviations explanations, sealing methods, any text that is not a direct crochet instruction
- Combine consecutive rows of the same type within a section when they are part of the same logical step.
- Remove irrelevant content: page numbers, headers, footers, URLs, copyright lines, image references, promotion text, links to social media.
- Important: keep ALL actual crochet instructions. Do not lose any rounds or rows.
- The JSON must be valid. No trailing commas. No markdown fences. Only the JSON object.

Raw text:
${text}`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response.text().trim()
    // Remove any markdown fences if present
    const json = response.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
    JSON.parse(json) // validate
    return json
  } catch {
    return ''
  }
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

    // Try AI parsing first (if API key is configured)
    let recipe = ''
    if (text.trim()) {
      diag.push('ai attempt')
      recipe = await parseWithAI(text)
      if (recipe) {
        diag.push('ai ok')
      } else {
        diag.push('ai fail, using regex')
        recipe = buildRecipe(text, type)
      }
    }

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
