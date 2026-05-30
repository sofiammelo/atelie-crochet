import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, pixelData, width, height } = body

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        pixelData: JSON.stringify(pixelData),
        pixelWidth: width,
        pixelHeight: height,
      },
    })

    return NextResponse.json({ project })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar pixel data' }, { status: 500 })
  }
}
