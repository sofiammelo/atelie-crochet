import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: { rows: { orderBy: { rowIndex: 'asc' } } },
    })
    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ project })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar projeto' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const project = await prisma.project.update({
      where: { id: params.id },
      data: body,
    })
    return NextResponse.json({ project })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar projeto' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.project.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar projeto' }, { status: 500 })
  }
}
