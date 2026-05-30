'use client'

import { useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function NewProjectForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultType = searchParams.get('type') || 'amigurumi'

  const [name, setName] = useState('')
  const [type, setType] = useState(defaultType)
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('not_started')

  const [patternText, setPatternText] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [parsingPdf, setParsingPdf] = useState(false)
  const [inputMethod, setInputMethod] = useState<'write' | 'pdf'>('write')

  const [tapestryMethod, setTapestryMethod] = useState<'pixel' | 'convert' | 'create'>('pixel')
  const [pixelFile, setPixelFile] = useState<File | null>(null)
  const [convertFile, setConvertFile] = useState<File | null>(null)
  const [createWidth, setCreateWidth] = useState(10)
  const [createHeight, setCreateHeight] = useState(10)
  const [pixelGrid, setPixelGrid] = useState<string[][]>([])
  const [currentColor, setCurrentColor] = useState('#d946ef')
  const [convertedResult, setConvertedResult] = useState<{ pixels: string[][]; width: number; height: number } | null>(null)

  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const convertInputRef = useRef<HTMLInputElement>(null)

  const colors = ['#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#1a1a2e', '#64748b', '#ffffff']

  function initPixelGrid(w: number, h: number) {
    const grid: string[][] = []
    for (let y = 0; y < h; y++) {
      const row: string[] = []
      for (let x = 0; x < w; x++) {
        row.push('#ffffff')
      }
      grid.push(row)
    }
    setPixelGrid(grid)
  }

  function handleCreateSize() {
    const w = Math.min(Math.max(1, createWidth), 100)
    const h = Math.min(Math.max(1, createHeight), 100)
    setCreateWidth(w)
    setCreateHeight(h)
    initPixelGrid(w, h)
  }

  function paintPixel(y: number, x: number) {
    if (pixelGrid.length === 0) return
    const newGrid = pixelGrid.map(function(row) { return [...row] })
    newGrid[y][x] = currentColor
    setPixelGrid(newGrid)
  }

  async function handlePdfFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfFile(file)
    setParsingPdf(true)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.text) {
        setPatternText(data.text)
      }
    } catch (e) {
      console.error('Erro ao processar PDF:', e)
    } finally {
      setParsingPdf(false)
    }
  }

  function handlePixelFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPixelFile(file)
  }

  async function handleConvertImage() {
    if (!convertFile) return
    const formData = new FormData()
    formData.append('image', convertFile)
    formData.append('maxSize', '40')
    try {
      const res = await fetch('/api/convert-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.pixels) {
        setConvertedResult({ pixels: data.pixels, width: data.width, height: data.height })
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleSubmit() {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      let coverUrl = null
      if (coverFile) {
        const cf = new FormData()
        cf.append('file', coverFile)
        cf.append('type', 'image')
        const r = await fetch('/api/upload', { method: 'POST', body: cf })
        const d = await r.json()
        coverUrl = d.url
      }
      let pdfUrl = null
      if (type === 'amigurumi' && inputMethod === 'pdf' && pdfFile) {
        const pf = new FormData()
        pf.append('file', pdfFile)
        pf.append('type', 'pdf')
        const r = await fetch('/api/upload', { method: 'POST', body: pf })
        const d = await r.json()
        pdfUrl = d.url
      }
      const projectData: Record<string, unknown> = {
        name: name.trim(), type, status, description,
      }
      if (type === 'amigurumi') {
        projectData.patternText = patternText
        if (pdfUrl) projectData.pdfPath = pdfUrl
      }
      if (type === 'tapestry') {
        if (tapestryMethod === 'pixel' && pixelFile) {
          const imgF = new FormData()
          imgF.append('file', pixelFile)
          imgF.append('type', 'image')
          const r = await fetch('/api/upload', { method: 'POST', body: imgF })
          const d = await r.json()
          projectData.originalImage = d.url
        } else if (tapestryMethod === 'convert' && convertedResult) {
          projectData.pixelData = JSON.stringify(convertedResult.pixels)
          projectData.pixelWidth = convertedResult.width
          projectData.pixelHeight = convertedResult.height
        } else if (tapestryMethod === 'create' && pixelGrid.length > 0) {
          projectData.pixelData = JSON.stringify(pixelGrid)
          projectData.pixelWidth = createWidth
          projectData.pixelHeight = createHeight
        }
      }
      if (coverUrl) projectData.coverImage = coverUrl
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      })
      const data = await res.json()
      if (data.project) router.push('/projetos/' + data.project.id)
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">
      <Link href="/" className="text-sm text-[#64748b] hover:text-purple-600 mb-4 inline-block">
        &larr; Voltar
      </Link>
      <h1 className="text-2xl font-display font-bold text-[#1a1a2e] mb-6">Novo Projeto</h1>

      {/* Basic Info */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 mb-4 shadow-sm">
        <h2 className="font-semibold text-lg mb-4">Informacoes Basicas</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Nome do Projeto *</label>
            <input type="text" value={name} onChange={function(e) { setName(e.target.value) }}
              placeholder="Ex: Urso de Croche"
              className="w-full px-4 py-2.5 rounded-xl border border-[#e2e8f0] bg-[#faf5f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Tipo</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={function() { setType('amigurumi') }}
                className={'p-4 rounded-xl border-2 text-center transition-all ' + (type === 'amigurumi' ? 'border-purple-500 bg-purple-50' : 'border-[#e2e8f0] bg-white hover:border-purple-300')}>
                <span className="text-2xl block mb-1">{'\u{1F9F6}'}</span>
                <span className="text-sm font-medium">Amigurumi</span>
              </button>
              <button onClick={function() { setType('tapestry') }}
                className={'p-4 rounded-xl border-2 text-center transition-all ' + (type === 'tapestry' ? 'border-purple-500 bg-purple-50' : 'border-[#e2e8f0] bg-white hover:border-purple-300')}>
                <span className="text-2xl block mb-1">{'\u{1F9F5}'}</span>
                <span className="text-sm font-medium">Jacquard/Tapestry</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Descricao</label>
            <textarea value={description} onChange={function(e) { setDescription(e.target.value) }}
              placeholder="Descricao opcional do projeto..." rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e2e8f0] bg-[#faf5f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Status</label>
            <div className="flex gap-2">
              {[{ value: 'not_started', label: 'Nao Iniciado' }, { value: 'in_progress', label: 'Em Andamento' }, { value: 'completed', label: 'Concluido' }].map(function(s) {
                return (
                  <button key={s.value} onClick={function() { setStatus(s.value) }}
                    className={'px-4 py-2 rounded-full text-sm font-medium border transition-colors ' + (status === s.value ? 'bg-purple-50 text-purple-700 border-purple-400' : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-purple-300')}>
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Capa (opcional)</label>
            <div onClick={function() { fileInputRef.current?.click() }}
              className="border-2 border-dashed border-[#e2e8f0] rounded-xl p-6 text-center cursor-pointer hover:border-purple-300 transition-colors">
              {coverPreview
                ? <img src={coverPreview} alt="Preview" className="max-h-32 mx-auto rounded-lg" />
                : <div>
                    <svg className="w-8 h-8 mx-auto text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-[#64748b] mt-2">Clique para adicionar imagem de capa</p>
                  </div>
              }
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={function(e) { const f = e.target.files?.[0]; if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)) } }} />
          </div>
        </div>
      </div>

      {/* Amigurumi Section */}
      {type === 'amigurumi' && <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 mb-4 shadow-sm">
        <h2 className="font-semibold text-lg mb-4">Receita / Pattern</h2>
        <div className="flex gap-2 mb-4">
          <button onClick={function() { setInputMethod('write') }}
            className={'px-4 py-2 rounded-full text-sm font-medium border transition-colors ' + (inputMethod === 'write' ? 'bg-purple-50 text-purple-700 border-purple-400' : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-purple-300')}>
            Escrever a mao
          </button>
          <button onClick={function() { setInputMethod('pdf') }}
            className={'px-4 py-2 rounded-full text-sm font-medium border transition-colors ' + (inputMethod === 'pdf' ? 'bg-purple-50 text-purple-700 border-purple-400' : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-purple-300')}>
            Upload PDF
          </button>
        </div>

        {inputMethod === 'write' && <div>
          <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Escreva a receita (uma linha por etapa)</label>
          <p className="text-xs text-[#64748b] mb-2">Cada linha sera uma etapa no guia.</p>
          <textarea value={patternText} onChange={function(e) { setPatternText(e.target.value) }}
            placeholder="Carr 1: 6 pb no anel magico" rows={10}
            className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] bg-[#faf5f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 font-mono" />
        </div>}

        {inputMethod === 'pdf' && <div>
          <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Upload de PDF</label>
          <div onClick={function() { document.getElementById('pdf-upload')?.click() }}
            className="border-2 border-dashed border-[#e2e8f0] rounded-xl p-8 text-center cursor-pointer hover:border-purple-300 transition-colors">
            {parsingPdf ? (
              <div>
                <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-[#64748b]">Processando PDF...</p>
              </div>
            ) : pdfFile ? (
              <div>
                <svg className="w-10 h-10 mx-auto text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-purple-600 mt-2 font-medium">{pdfFile.name}</p>
                <p className="text-xs text-[#64748b] mt-1">Clique para trocar</p>
              </div>
            ) : (
              <div>
                <svg className="w-10 h-10 mx-auto text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-[#64748b] mt-2">Clique para fazer upload do PDF</p>
              </div>
            )}
          </div>
          <input id="pdf-upload" type="file" accept=".pdf" className="hidden"
            onChange={handlePdfFileSelect} />
          {patternText && inputMethod === 'pdf' && (
            <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-200 max-h-48 overflow-y-auto">
              <p className="text-xs font-medium text-purple-700 mb-1">Texto extraído do PDF:</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{patternText.substring(0, 500)}{patternText.length > 500 ? '...' : ''}</pre>
            </div>
          )}
        </div>}
      </div>}

      {/* Tapestry Section */}
      {type === 'tapestry' && <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 mb-4 shadow-sm">
        <h2 className="font-semibold text-lg mb-4">Configuracao do Jacquard</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={function() { setTapestryMethod('pixel') }}
            className={'px-4 py-2 rounded-full text-sm font-medium border transition-colors ' + (tapestryMethod === 'pixel' ? 'bg-purple-50 text-purple-700 border-purple-400' : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-purple-300')}>
            Upload pixel art
          </button>
          <button onClick={function() { setTapestryMethod('convert') }}
            className={'px-4 py-2 rounded-full text-sm font-medium border transition-colors ' + (tapestryMethod === 'convert' ? 'bg-purple-50 text-purple-700 border-purple-400' : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-purple-300')}>
            Converter imagem
          </button>
          <button onClick={function() { setTapestryMethod('create') }}
            className={'px-4 py-2 rounded-full text-sm font-medium border transition-colors ' + (tapestryMethod === 'create' ? 'bg-purple-50 text-purple-700 border-purple-400' : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-purple-300')}>
            Criar pixel art
          </button>
        </div>

        {tapestryMethod === 'pixel' && <div>
          <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Upload de imagem pixelada</label>
          <div onClick={function() { document.getElementById('pixel-upload')?.click() }}
            className="border-2 border-dashed border-[#e2e8f0] rounded-xl p-8 text-center cursor-pointer hover:border-purple-300 transition-colors">
            {pixelFile
              ? <div>
                  <img src={URL.createObjectURL(pixelFile)} alt="Preview" className="max-h-32 mx-auto rounded-lg" />
                  <p className="text-sm text-purple-600 mt-2 font-medium">{pixelFile.name}</p>
                </div>
              : <div>
                  <svg className="w-10 h-10 mx-auto text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-[#64748b] mt-2">Clique para upload</p>
                </div>
            }
          </div>
          <input id="pixel-upload" type="file" accept="image/*" className="hidden" onChange={handlePixelFileUpload} />
        </div>}

        {tapestryMethod === 'convert' && <div>
          <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Converter imagem para pixel art</label>
          <p className="text-xs text-[#64748b] mb-2">A imagem sera convertida automaticamente (max 40x40 pixels)</p>
          <div onClick={function() { convertInputRef.current?.click() }}
            className="border-2 border-dashed border-[#e2e8f0] rounded-xl p-6 text-center cursor-pointer hover:border-purple-300 transition-colors mb-3">
            {convertFile
              ? <img src={URL.createObjectURL(convertFile)} alt="Preview" className="max-h-32 mx-auto rounded-lg" />
              : <div>
                  <svg className="w-8 h-8 mx-auto text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-[#64748b] mt-2">Selecione uma imagem</p>
                </div>
            }
          </div>
          <input ref={convertInputRef} type="file" accept="image/*" className="hidden"
            onChange={function(e) { setConvertFile(e.target.files?.[0] || null) }} />
          {convertFile && <button onClick={handleConvertImage}
            className="w-full bg-purple-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
            Converter
          </button>}
          {convertedResult && <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
            <p className="text-sm font-medium text-purple-700 mb-2">
              Convertido! {convertedResult.width}x{convertedResult.height} pixels
            </p>
            <div className="overflow-auto max-h-40">
              <div className="inline-block" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(' + convertedResult.width + ', 12px)',
                gap: '1px'
              }}>
                {convertedResult.pixels.map(function(row, y) {
                  return row.map(function(color, x) {
                    return <div key={'' + y + '-' + x} style={{ width: 12, height: 12, backgroundColor: color }} />
                  })
                })}
              </div>
            </div>
          </div>}
        </div>}

        {tapestryMethod === 'create' && <div>
          <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Criar seu pixel art</label>
          <div className="flex gap-2 mb-3">
            <input type="number" value={createWidth}
              onChange={function(e) { setCreateWidth(Number(e.target.value)) }} min={1} max={100}
              className="w-20 px-3 py-2 rounded-xl border border-[#e2e8f0] bg-[#faf5f0] text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="Larg" />
            <span className="self-center text-[#64748b]">x</span>
            <input type="number" value={createHeight}
              onChange={function(e) { setCreateHeight(Number(e.target.value)) }} min={1} max={100}
              className="w-20 px-3 py-2 rounded-xl border border-[#e2e8f0] bg-[#faf5f0] text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="Alt" />
            <button onClick={handleCreateSize}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
              Criar
            </button>
          </div>
          {pixelGrid.length > 0 && <div>
            <div className="flex flex-wrap gap-1 mb-3">
              {colors.map(function(c) {
                return <button key={c} onClick={function() { setCurrentColor(c) }}
                  className={'w-7 h-7 rounded-full border-2 transition-all ' + (currentColor === c ? 'border-gray-800 scale-110' : 'border-gray-300')}
                  style={{ backgroundColor: c }} />
              })}
            </div>
            <div className="overflow-auto max-h-60 border border-[#e2e8f0] rounded-xl p-2 bg-white">
              <div className="inline-block" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(' + createWidth + ', 20px)',
                gap: '1px'
              }}>
                {pixelGrid.map(function(row, y) {
                  return row.map(function(color, x) {
                    return <div key={'' + y + '-' + x}
                      onClick={function() { paintPixel(y, x) }}
                      style={{ width: 20, height: 20, backgroundColor: color, cursor: 'pointer' }}
                      className="hover:opacity-80 border border-gray-200" />
                  })
                })}
              </div>
            </div>
          </div>}
        </div>}
      </div>}

      <button onClick={handleSubmit} disabled={submitting || !name.trim()}
        className={'w-full py-3 rounded-xl text-base font-semibold transition-all ' + (submitting || !name.trim() ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:shadow-lg hover:scale-[1.01]')}>
        {submitting ? 'Criando...' : 'Criar Projeto'}
      </button>
      <div className="h-16" />
    </div>
  )
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 pt-8 text-center text-[#64748b] py-20">Carregando...</div>}>
      <NewProjectForm />
    </Suspense>
  )
}
