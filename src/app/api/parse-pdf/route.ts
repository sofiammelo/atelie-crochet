import { NextRequest, NextResponse } from 'next/server'

type PdfParseFn = (buffer: Buffer) => Promise<{ text: string; numpages: number }>

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum PDF enviado' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const pdfParse = (await import('pdf-parse')).default as unknown as PdfParseFn
    const data = await pdfParse(buffer)

    return NextResponse.json({ text: data.text, pages: data.numpages })
  } catch (error) {
    console.error('PDF parse error:', error)
    return NextResponse.json({ error: 'Erro ao processar PDF' }, { status: 500 })
  }
}
