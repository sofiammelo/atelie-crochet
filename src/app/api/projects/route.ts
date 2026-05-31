import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ projects })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar projetos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const project = await prisma.project.create({
      data: {
        name: body.name,
        type: body.type || 'amigurumi',
        status: body.status || 'not_started',
        description: body.description || '',
        patternText: body.patternText || '',
        recipe: body.recipe || '{}',
        pixelWidth: body.pixelWidth || null,
        pixelHeight: body.pixelHeight || null,
        pixelData: body.pixelData || null,
        originalImage: body.originalImage || null,
        pdfPath: body.pdfPath || null,
      },
    })
    return NextResponse.json({ project }, { status: 201 })
  } catch (error: any) {
    console.error('Create project error:', error?.message || error)
    const msg = error?.message?.includes('request size') ? 'Arquivo muito grande' :
      error?.message || 'Erro ao criar projeto'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
