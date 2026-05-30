import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData()
    const file = formData.get('cover') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Nenhuma imagem enviada' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type || 'image/png'};base64,${base64}`

    const project = await prisma.project.update({
      where: { id: params.id },
      data: { coverImage: dataUrl },
    })

    return NextResponse.json({ project })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar capa' }, { status: 500 })
  }
}
