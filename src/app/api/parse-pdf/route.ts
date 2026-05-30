import { NextRequest, NextResponse } from 'next/server'

// pdf-parse v2 is ESM-only; use CJS require for compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum PDF enviado' }, { status: 400 })
    }

    const start = Date.now()

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const data = await pdfParse(buffer)

    console.log(`PDF parsed: ${data.numpages} pages, ${data.text.length} chars in ${Date.now() - start}ms`)

    return NextResponse.json({
      text: data.text,
      pages: data.numpages || 0,
    })
  } catch (error: any) {
    console.error('PDF parse error:', error?.message || error)
    return NextResponse.json({
      error: 'Erro ao processar PDF: ' + (error?.message || 'erro desconhecido'),
    }, { status: 500 })
  }
}
