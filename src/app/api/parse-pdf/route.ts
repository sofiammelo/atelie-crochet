import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum PDF enviado' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // pdf-parse v2: CJS exports { PDFParse }, ESM exports default { PDFParse }
    const mod = await import('pdf-parse')
    const PDFParse = (mod as any).default?.PDFParse || (mod as any).PDFParse
    if (!PDFParse) {
      return NextResponse.json({ error: 'Módulo PDF não encontrado' }, { status: 500 })
    }

    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText()

    return NextResponse.json({
      text: result.text || '',
      pages: result.total || 0,
    })
  } catch (error: any) {
    console.error('PDF parse error:', error?.message || error)
    return NextResponse.json({
      error: 'Erro ao processar PDF: ' + (error?.message || 'erro desconhecido'),
    }, { status: 500 })
  }
}
