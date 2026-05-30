import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

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
    const ext = file.name.split('.').pop() || 'png'
    const filename = `cover-${uuidv4()}.${ext}`

    const dir = path.join(process.cwd(), 'public', 'uploads', 'covers')
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, filename), buffer)

    const coverUrl = `/uploads/covers/${filename}`

    const project = await prisma.project.update({
      where: { id: params.id },
      data: { coverImage: coverUrl },
    })

    return NextResponse.json({ project })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar capa' }, { status: 500 })
  }
}
