'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { C, S, fonts } from '@/lib/tokens'

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [type, setType] = useState('amigurumi')

  // PDF
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [parsingPdf, setParsingPdf] = useState(false)
  const [pdfText, setPdfText] = useState('')
  const [pdfError, setPdfError] = useState('')
  const [parsedRecipe, setParsedRecipe] = useState<any>(null)
  const [pdfBase64, setPdfBase64] = useState('')
  const [parseDiag, setParseDiag] = useState('')

  // Tapestry - pixel upload
  const [pixelFile, setPixelFile] = useState<File | null>(null)
  const [pixelConverting, setPixelConverting] = useState(false)
  const [pixelResult, setPixelResult] = useState<{ pixels: string[][]; width: number; height: number } | null>(null)

  // Tapestry - convert
  const [convertFile, setConvertFile] = useState<File | null>(null)
  const [maxSize, setMaxSize] = useState(40)
  const [converting, setConverting] = useState(false)
  const [convertedResult, setConvertedResult] = useState<{ pixels: string[][]; width: number; height: number } | null>(null)

  // Tapestry - create
  const [createWidth, setCreateWidth] = useState(10)
  const [createHeight, setCreateHeight] = useState(10)
  const [pixelGrid, setPixelGrid] = useState<string[][]>([])
  const [currentColor, setCurrentColor] = useState('#6B8F71')
  const [customColor, setCustomColor] = useState('#6B8F71')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const colors = ['#4A90D9', '#3A7BC8', '#6AAEE8', '#1A2A4A', '#3D5A80', '#8DA4C0', '#d97706', '#dc2626', '#6B82A0', '#B8C8E0', '#fdfcfb', '#E8F0FE']

  // ── PDF ──
  async function handlePdfSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfFile(file)
    setPdfError('')
    setPdfText('')
    setParsingPdf(true)
    // Convert to base64 for later storage
    const reader = new FileReader()
    reader.onload = () => setPdfBase64(reader.result as string || '')
    reader.readAsDataURL(file)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Falha ao processar PDF')
      }
      const data = await res.json()
      setParseDiag(data.diag || '')
      if (data.recipe) {
        setPdfText(data.text || '')
        setParsedRecipe(JSON.parse(data.recipe))
      } else if (data.text) {
        setPdfText(data.text)
      } else {
        const diag = data.diag ? ` (${data.diag})` : ''
        setPdfError('Nenhum texto encontrado no PDF' + diag)
      }
    } catch (e: any) {
      setPdfError(e.message || 'Erro ao processar PDF')
    } finally { setParsingPdf(false) }
  }

  // ── Tapestry pixel upload ──
  async function handlePixelFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPixelFile(file)
    setPixelResult(null)
    setPixelConverting(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('preserveSize', 'true')
      const res = await fetch('/api/convert-image', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        if (data.pixels) setPixelResult({ pixels: data.pixels, width: data.width, height: data.height })
      }
    } catch (e) { console.error(e) } finally { setPixelConverting(false) }
  }

  // ── Tapestry convert ──
  async function handleConvert() {
    if (!convertFile) return
    setConverting(true)
    try {
      const formData = new FormData()
      formData.append('image', convertFile)
      formData.append('maxSize', String(maxSize))
      const res = await fetch('/api/convert-image', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Falha ao converter')
      const data = await res.json()
      if (data.pixels) setConvertedResult({ pixels: data.pixels, width: data.width, height: data.height })
    } catch (e) { console.error(e) } finally { setConverting(false) }
  }

  // ── Tapestry create ──
  function initGrid(w: number, h: number) {
    const g: string[][] = []
    for (let y = 0; y < h; y++) {
      g.push(Array(w).fill('#fdfcfb'))
    }
    setPixelGrid(g)
  }

  function paintPixel(y: number, x: number) {
    if (!pixelGrid.length) return
    const g = pixelGrid.map(row => [...row])
    g[y][x] = currentColor
    setPixelGrid(g)
  }

  // ── Submit ──
  function buildRecipe() {
    if (type === 'amigurumi' && parsedRecipe) {
      return JSON.stringify(parsedRecipe)
    }
    const recipe: any = { title: name.trim(), materials: '', sections: [] }
    if (type === 'amigurumi' && pdfText) {
      const lines = pdfText.split('\n').filter((l: string) => l.trim())
      if (lines.length > 0) {
        recipe.sections.push({
          id: 'sec-1', name: 'Receita',
          rows: lines.map((line: string, i: number) => ({ id: `row-${i}`, line: i + 1, instruction: line.trim() })),
        })
      }
    }
    return JSON.stringify(recipe)
  }

  async function handleCreate() {
    if (!name.trim()) return
    setSubmitError('')
    setSubmitting(true)
    try {
      const data: any = {
        name: name.trim(),
        type,
        status: 'not_started',
        recipe: buildRecipe(),
        patternText: pdfText || '',
        pdfPath: pdfBase64 || null,
      }

      if (type === 'tapestry') {
        if (pixelResult) {
          data.pixelData = JSON.stringify(pixelResult.pixels)
          data.pixelWidth = pixelResult.width
          data.pixelHeight = pixelResult.height
        } else if (convertedResult) {
          data.pixelData = JSON.stringify(convertedResult.pixels)
          data.pixelWidth = convertedResult.width
          data.pixelHeight = convertedResult.height
        } else if (pixelGrid.length > 0) {
          data.pixelData = JSON.stringify(pixelGrid)
          data.pixelWidth = createWidth
          data.pixelHeight = createHeight
        } else if (pixelFile) {
          const fd = new FormData()
          fd.append('file', pixelFile)
          fd.append('type', 'image')
          const r = await fetch('/api/upload', { method: 'POST', body: fd })
          const d = await r.json()
          data.originalImage = d.url
        }
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Falha ao criar')
      const result = await res.json()
      if (result.project) router.push(`/projetos/${result.project.id}`)
      else setSubmitError('Resposta inesperada do servidor')
    } catch (e: any) {
      setSubmitError(e.message || 'Erro ao criar projeto')
      console.error(e)
    } finally { setSubmitting(false) }
  }

  const canSubmit = name.trim() && !submitting

  return (
    <div className="min-h-screen" style={{ background: C.cream }}>
      <div style={{
        background: `linear-gradient(135deg, ${C.sageDark} 0%, ${C.ink} 100%)`,
        padding: '52px 24px 28px',
      }}>
        <a href="/" style={{
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 10, padding: '7px 14px', color: 'rgba(255,255,255,0.7)',
          fontSize: 13, display: 'inline-block', textDecoration: 'none',
        }}>&larr; Voltar</a>
        <h1 style={{ margin: 0, color: C.white, fontSize: 28, fontWeight: 600, marginTop: 16 }}>
          Novo projeto
        </h1>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6" style={{ paddingBottom: 100 }}>
        {/* Name */}
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Nome do projeto</label>
          <input style={S.input} placeholder="Ex: Urso Amigurumi" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>

        {/* Type */}
        <div style={{ marginBottom: 24 }}>
          <label style={S.label}>Tipo</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['amigurumi', '\u{1F9F6}', 'Amigurumi', 'Bonecos e personagens'],
              ['tapestry', '\u{1F9F5}', 'Tapestry', 'Jacquard em pixels'],
            ].map(([t, em, lb, sub]) => (
              <button key={t} onClick={() => setType(t)} style={{
                padding: '16px 12px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                border: `1.5px solid ${type === t ? C.sage : C.creamDark}`,
                background: type === t ? C.sagePale : C.white,
              }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>{em}</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{lb}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── AMIGURUMI ── */}
        {type === 'amigurumi' && (
          <div style={{ marginBottom: 24 }}>
            <label style={S.label}>Importar receita de PDF (opcional)</label>
            <label style={{
              ...S.card, padding: '16px 18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14,
              background: pdfFile ? C.sagePale : C.white,
            }}>
              <span style={{ fontSize: 24 }}>&#x1F4C4;</span>
              <div style={{ flex: 1 }}>
                {parsingPdf ? (
                  <div style={{ fontSize: 13, color: C.muted }}>Processando PDF...</div>
                ) : pdfFile ? (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.sageDark }}>{pdfFile.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {parsedRecipe ? (
                        `${parsedRecipe.sections?.length || 0} seções encontradas`
                      ) : pdfText ? (
                        'Texto extraído com sucesso'
                      ) : (
                        'Nenhum texto encontrado'
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>Upload de PDF</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Extraímos o texto automaticamente</div>
                  </>
                )}
              </div>
              <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handlePdfSelect} />
            </label>
            {pdfError && (
              <div style={{ marginTop: 8, fontSize: 13, color: C.error, background: `${C.error}0a`, padding: '8px 12px', borderRadius: 8 }}>
                {pdfError}
              </div>
            )}
            {parsedRecipe && (
              <div style={{ marginTop: 8, padding: 12, borderRadius: 10, background: C.sagePale, border: `1px solid ${C.sage}40`, fontSize: 12, color: C.inkLight, lineHeight: 1.6 }}>
                {parseDiag && <div style={{ marginBottom: 6, fontSize: 11, color: C.muted }}>🔍 {parseDiag}</div>}
                <strong>Materiais:</strong> {parsedRecipe.materials?.substring(0, 100) || '—'}
                <br />
                <strong>Seções:</strong> {(parsedRecipe.sections || []).map((s: any) => s.name).join(', ')}
                {parsedRecipe.notes?.length > 0 && (
                  <><br /><strong>Notas:</strong> {parsedRecipe.notes.join('; ')}</>
                )}
              </div>
            )}
            {!parsedRecipe && pdfText && (
              <div style={{ marginTop: 8, padding: 12, borderRadius: 10, background: C.cream, border: `1px solid ${C.creamDark}`, maxHeight: 120, overflowY: 'auto', fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                {pdfText.substring(0, 400)}{pdfText.length > 400 ? '...' : ''}
              </div>
            )}
          </div>
        )}

        {/* ── TAPESTRY ── */}
        {type === 'tapestry' && (
          <div style={{ marginBottom: 24 }}>
            <label style={S.label}>Configuração do Jacquard</label>
            <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>
              Escolha como criar a grade do seu Tapestry:
            </p>

            {/* 1. Upload pixel art */}
            <div style={{ ...S.card, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>&#x1F5BC;</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>Upload de imagem pixelada</div>
                  <div style={{ fontSize: 12, color: C.muted }}>Envie uma imagem que já está em pixels</div>
                </div>
              </div>
              {pixelConverting ? (
                <div style={{ fontSize: 13, color: C.muted }}>Convertendo pixels...</div>
              ) : pixelResult ? (
                <div style={{ fontSize: 13, color: C.success, fontWeight: 600 }}>
                  Convertido! {pixelResult.width}x{pixelResult.height} pixels
                </div>
              ) : (
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: C.cream, border: `1px solid ${C.creamDark}` }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePixelFile} />
                  <span style={{ fontSize: 13, color: pixelFile ? C.sageDark : C.muted }}>
                    {pixelFile ? pixelFile.name : 'Selecionar imagem'}
                  </span>
                </label>
              )}
            </div>

            {/* 2. Convert image */}
            <div style={{ ...S.card, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>&#x1F4F7;</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>Converter imagem</div>
                  <div style={{ fontSize: 12, color: C.muted }}>Qualquer foto — convertemos em pixels</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <label style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: C.cream, border: `1px solid ${C.creamDark}` }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setConvertFile(e.target.files?.[0] || null)} />
                  <span style={{ fontSize: 13, color: convertFile ? C.sageDark : C.muted }}>{convertFile ? convertFile.name : 'Selecionar'}</span>
                </label>
                <button onClick={handleConvert} disabled={!convertFile || converting} style={{ ...S.btnPrimary, padding: '8px 16px', opacity: !convertFile || converting ? 0.5 : 1 }}>
                  {converting ? '...' : 'Converter'}
                </button>
              </div>
              {/* Detail level */}
              <div style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Nível de detalhe:</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { v: 20, l: 'Simples' },
                    { v: 40, l: 'Detalhado' },
                    { v: 60, l: 'Muito detalhado' },
                  ].map(({ v, l }) => (
                    <button key={v} onClick={() => setMaxSize(v)} style={{
                      flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer',
                      border: `1.5px solid ${maxSize === v ? C.sage : C.creamDark}`,
                      background: maxSize === v ? C.sagePale : C.white,
                      color: maxSize === v ? C.sageDark : C.muted,
                      fontSize: 11, fontWeight: 600,
                    }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {convertedResult && (
                <div style={{ marginTop: 10, fontSize: 13, color: C.success, fontWeight: 600 }}>
                  Convertido! {convertedResult.width}x{convertedResult.height} pixels
                </div>
              )}
            </div>

            {/* 3. Create pixel art */}
            <div style={{ ...S.card, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>&#x270F;&#xFE0F;</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>Criar pixel art</div>
                  <div style={{ fontSize: 12, color: C.muted }}>Desenhe sua própria grade</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                <input type="number" min={1} max={100} value={createWidth} onChange={e => setCreateWidth(+e.target.value)}
                  style={{ ...S.input, width: 70, textAlign: 'center', padding: '8px' }} />
                <span style={{ color: C.muted }}>x</span>
                <input type="number" min={1} max={100} value={createHeight} onChange={e => setCreateHeight(+e.target.value)}
                  style={{ ...S.input, width: 70, textAlign: 'center', padding: '8px' }} />
                <button onClick={() => initGrid(createWidth, createHeight)} style={{ ...S.btnPrimary, padding: '8px 16px' }}>
                  Criar grade
                </button>
              </div>

              {pixelGrid.length > 0 && (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8, alignItems: 'center' }}>
                    {colors.map(c => (
                      <div key={c} onClick={() => { setCurrentColor(c); setCustomColor(c) }} style={{
                        width: 24, height: 24, borderRadius: 4, background: c, cursor: 'pointer',
                        border: `2px solid ${currentColor === c ? C.ink : C.creamDark}`,
                        transform: currentColor === c ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.1s',
                      }} />
                    ))}
                    <label style={{
                      width: 24, height: 24, borderRadius: 4, cursor: 'pointer',
                      border: `2px dashed ${C.mutedLight}`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: customColor,
                    }}>
                      <input type="color" value={customColor} onChange={e => { setCustomColor(e.target.value); setCurrentColor(e.target.value) }}
                        style={{ width: 0, height: 0, border: 'none', padding: 0, opacity: 0, position: 'absolute' }} />
                      <span style={{ fontSize: 10, color: '#fff', textShadow: '0 0 2px rgba(0,0,0,0.5)' }}>+</span>
                    </label>
                  </div>
                  <div className="overflow-auto max-h-60" style={{ border: `1px solid ${C.creamDark}`, borderRadius: 10, padding: 8, background: C.white }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${createWidth}, 18px)`, gap: '1px' }}>
                      {pixelGrid.map((row, y) => row.map((color, x) => (
                        <div key={`${y}-${x}`} onClick={() => paintPixel(y, x)} style={{ width: 18, height: 18, background: color, cursor: 'pointer', border: '0.5px solid rgba(0,0,0,0.05)' }} />
                      )))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {submitError && (
          <div style={{ marginBottom: 12, fontSize: 13, color: C.error, background: `${C.error}0a`, padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.error}30` }}>
            {submitError}
          </div>
        )}
        <button onClick={handleCreate} disabled={!canSubmit} style={{
          width: '100%', padding: '14px', borderRadius: 12, border: 'none',
          background: canSubmit ? C.sage : C.creamDark, color: canSubmit ? C.white : C.mutedLight,
          fontSize: 15, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}>
          {submitting ? 'Criando...' : 'Criar projeto'}
        </button>
      </div>
    </div>
  )
}
