import { NextRequest, NextResponse } from 'next/server'

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // pdfjs-dist legacy build for Node.js (no DOMMatrix needed for getTextContent)
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await getDocument({ data: new Uint8Array(buffer) }).promise
  const pages = doc.numPages
  const parts: string[] = []

  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i)
    const tc = await page.getTextContent()
    const text = tc.items.map((item: any) => item.str).join(' ')
    if (text.trim()) parts.push(text.trim())
  }
  return parts.join('\n\n')
}

async function ocrWithTesseract(buffer: Buffer): Promise<string> {
  // Fallback for scanned PDFs: convert to images with sharp, then OCR
  try {
    const sharp = (await import('sharp')).default
    const img = sharp(buffer)
    const metadata = await img.metadata()
    if (!metadata.width && !metadata.height) {
      // sharp couldn't decode it — try to get raw page image via pdfjs-dist
      return ''
    }
    const png = await img.png().toBuffer()
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('por+eng')
    const { data } = await worker.recognize(png)
    await worker.terminate()
    return data.text || ''
  } catch {
    return ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Nenhum PDF enviado' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 1) Try text extraction with pdfjs-dist
    let text = ''
    try {
      text = await extractTextFromPDF(buffer)
    } catch (err: any) {
      console.warn('pdfjs-dist text extraction failed:', err?.message)
    }

    // 2) If no text, try OCR as fallback
    if (!text.trim()) {
      try {
        text = await ocrWithTesseract(buffer)
      } catch (err: any) {
        console.warn('OCR fallback failed:', err?.message)
      }
    }

    // 3) Last resort: try raw text from buffer (works for some PDFs)
    if (!text.trim()) {
      const raw = buffer.toString('utf-8')
        .replace(/[^\x20-\x7E\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (raw.length > 50) text = raw
    }

    return NextResponse.json({
      text: text || '',
      pages: 0,
    })
  } catch (error: any) {
    console.error('PDF error:', error?.message || error)
    return NextResponse.json({
      error: 'Erro ao processar PDF: ' + (error?.message || 'erro desconhecido'),
    }, { status: 500 })
  }
}
