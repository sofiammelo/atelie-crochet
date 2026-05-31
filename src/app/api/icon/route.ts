import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } })
    if (!config?.icon)
      return new NextResponse(null, { status: 204 })

    const dataUrl = config.icon
    const mime = dataUrl.split(';')[0].split(':')[1] || 'image/png'
    const base64 = dataUrl.split(',')[1] || dataUrl
    const buffer = Buffer.from(base64, 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file)
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'image/png'
    const dataUrl = `data:${mimeType};base64,${base64}`

    await prisma.siteConfig.upsert({
      where: { id: 'default' },
      update: { icon: dataUrl },
      create: { id: 'default', icon: dataUrl },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao salvar ícone' }, { status: 500 })
  }
}
