import { NextRequest, NextResponse } from 'next/server'

const ROUND_RE = /(?:R\s*\d+[\s.]|Carreira\s+\d+|Carr\s+\d+|C\s*\d+|F\s*\d+|Volta\s+\d+|Vuelta\s+\d+|Round\s+\d+|Rnd\s+\d+)/i

const SECTION_NAMES = /^(Corpo|Braço|Perna|Orelha|Olho|Focinho|Cabeça|Rabo|Asa|Bico|Antena|Chapéu|Laço|Saia|Braços|Pernas|Orelhas|Olhos|Cabeza|Cuerpo|Pierna|Brazo|Oreja|Ojo|Hocico|Rabo|Ala|Pico|Antena|Sombrero|Lazo|Falda|Morango|Folha|Tallo|Casco|Barriga|Tronco|Rabo|Crin|Juba|Rabo|Asas|Brazos|Piernas|Orejas|Cuerpo|Cabeza|Body|Head|Arm|Leg|Ear|Eye|Snout|Tail|Wing|Beak|Antenna|Hat|Bow|Skirt|Strawberry|Leaf|Stem|Hoof|Belly|Trunk|Mane)/i

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
const SECTION_WORDS = /(Corpo|Cuerpo|Body|Braço|Braço\s*\(2x\)|Brazo|Arm|Perna|Perna\s*\(2x\)|Pierna|Leg|Cabeça|Cabeza|Head|Orelha|Oreja|Ear|Olho|Ojo|Eye|Focinho|Hocico|Snout|Rabo|Tail|Asa|Ala|Wing|Bico|Pico|Beak|Morango|Morango\s*\w*|Strawberry|Folha|Leaf|Tallo|Stem|Barriga|Belly|Tronco|Trunk|Casco|Hoof|Mane|Juba|Saia|Skirt|Laço|Bow|Chapéu|Hat|Notas\s*finas?is?|Instruções|Instrucciones|Instructions)/i

function parseSections(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const materials: string[] = []
  const sections: { name: string; rows: { instruction: string; type: 'instruction' | 'note' }[] }[] = []
  let inMaterials = false

  // Split long lines at section boundaries
  const splitLines: string[] = []
  for (let line of lines) {
    if (SECTION_WORDS.test(line)) {
      // Split line at each section marker
      const parts = line.split(/(?=(?:Corpo|Braço|Brazo|Perna|Pierna|Cabeça|Cabeza|Orelha|Oreja|Olho|Ojo|Focinho|Hocico|Rabo|Asa|Ala|Bico|Morango|Strawberry|Folha|Leaf|Tallo|Stem|Barriga|Belly|Tronco|Trunk|Casco|Mane|Juba|Saia|Skirt|Laço|Chapéu|Notas\s*finas?is?))/i)
      splitLines.push(...parts.map(p => p.trim()).filter(Boolean))
    } else {
      splitLines.push(line)
    }
  }

  for (const line of splitLines) {
    const lower = line.toLowerCase()

    // Materials detection
    if (!inMaterials && (lower.includes('material') || lower.includes('materiais') || /^material/i.test(line))) {
      inMaterials = true
      materials.push(line)
      continue
    }
    if (inMaterials) {
      const isSectionWord = SECTION_WORDS.test(line) && line.length < 40
      const isRound = ROUND_RE.test(line) && line.length < 50
      if (isSectionWord || isRound) {
        inMaterials = false
      } else {
        materials.push(line)
        continue
      }
    }

    // Section title detection
    const isSectionTitle = (
      SECTION_WORDS.test(line) &&
      line.length < 50 &&
      !ROUND_RE.test(line) &&
      !/^[\d]/.test(line) &&
      !/^[a-z]/.test(line)
    )

    if (isSectionTitle) {
      if (sections.length === 0 || sections[sections.length - 1].rows.length > 0) {
        sections.push({ name: line, rows: [] })
      } else {
        sections[sections.length - 1].name = line
      }
      continue
    }

    if (sections.length === 0) sections.push({ name: 'Receita', rows: [] })
    const current = sections[sections.length - 1]

    // Split line into individual rounds and notes
    const segments = line.split(/(?=(?:R\s*\d+[\.\s]|Carreira\s+\d+|Carr\s+\d+|C\s*\d+[\.\s]|F\s*\d+[\.\s]|Volta\s+\d+|Vuelta\s+\d+|Round\s+\d+|Rnd\s+\d+|F\s*\d+\.))/i).filter(Boolean)

    for (const seg of segments) {
      const s = seg.trim()
      if (!s) continue

      if (ROUND_RE.test(s) || /^\d/.test(s) || /^(?:pb|sc|aum|inc|dis|dec|corr|cad|ch|am|mr)/i.test(s) || /^\d/.test(s)) {
        current.rows.push({ instruction: s, type: 'instruction' })
      } else if (/^nota/i.test(s) || /nota:/i.test(s)) {
        current.rows.push({ instruction: s, type: 'note' })
      } else if (/^[x•·]\s*/.test(s) || s.length > 20) {
        current.rows.push({ instruction: s, type: 'note' })
      } else {
        current.rows.push({ instruction: s, type: 'instruction' })
      }
    }
  }

  if (sections.length === 0 && splitLines.length > 0) {
    sections.push({ name: 'Receita', rows: splitLines.map(l => ({ instruction: l, type: 'instruction' as const })) })
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
