import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const project = await prisma.project.update({
      where: { id: params.id },
      data: { timerSeconds: body.seconds },
    })
    return NextResponse.json({ project })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar timer' }, { status: 500 })
  }
}
