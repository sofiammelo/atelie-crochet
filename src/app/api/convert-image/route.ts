import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File | null
    const maxSize = parseInt(formData.get('maxSize') as string || '40', 10)
    const preserveSize = formData.get('preserveSize') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'Nenhuma imagem enviada' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const metadata = await sharp(buffer).metadata()
    const originalWidth = metadata.width || 100
    const originalHeight = metadata.height || 100

    let pixelW: number, pixelH: number
    if (preserveSize) {
      pixelW = originalWidth
      pixelH = originalHeight
      // Cap at 200x200 – images larger than that are not pixel art
      const maxDim = 200
      if (pixelW > maxDim || pixelH > maxDim) {
        const ratio = pixelW / pixelH
        if (pixelW > pixelH) { pixelW = maxDim; pixelH = Math.round(maxDim / ratio) }
        else { pixelH = maxDim; pixelW = Math.round(maxDim * ratio) }
      }
    } else {
      const ratio = originalWidth / originalHeight
      pixelW = maxSize
      pixelH = Math.round(maxSize / ratio)
      if (pixelH > maxSize) {
        pixelH = maxSize
        pixelW = Math.round(maxSize * ratio)
      }
    }

    const resized = await sharp(buffer)
      .resize(pixelW, pixelH, { fit: 'fill' })
      .raw()
      .toBuffer()

    const pixels: string[][] = []
    for (let y = 0; y < pixelH; y++) {
      const row: string[] = []
      for (let x = 0; x < pixelW; x++) {
        const idx = (y * pixelW + x) * 3
        const r = resized[idx]
        const g = resized[idx + 1]
        const b = resized[idx + 2]
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
        row.push(hex)
      }
      pixels.push(row)
    }

    return NextResponse.json({
      pixels,
      width: pixelW,
      height: pixelH,
      originalWidth,
      originalHeight,
    })
  } catch (error) {
    console.error('Convert error:', error)
    return NextResponse.json({ error: 'Erro ao converter imagem' }, { status: 500 })
  }
}
