import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({ where: { id: params.id } })
    if (!project?.pdfPath)
      return NextResponse.json({ error: 'PDF não encontrado' }, { status: 404 })

    const base64 = project.pdfPath.split(',')[1] || project.pdfPath
    const buffer = Buffer.from(base64, 'base64')

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao servir PDF' }, { status: 500 })
  }
}
