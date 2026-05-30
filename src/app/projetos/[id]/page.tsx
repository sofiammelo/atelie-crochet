'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Timer } from '@/components/Timer'
import { formatTime, statusLabel, statusColor, typeLabel, typeColor } from '@/lib/utils'
import { parseCrochetPattern, type ParsedPattern } from '@/lib/pattern-parser'

type Project = {
  id: string
  name: string
  type: string
  status: string
  description: string
  coverImage: string | null
  patternText: string
  pdfPath: string | null
  currentLine: number
  pixelData: string | null
  pixelWidth: number | null
  pixelHeight: number | null
  originalImage: string | null
  currentRow: number
  timerSeconds: number
  createdAt: string
  rows: { id: string; rowIndex: number; rowData: string }[]
}

type Tab = 'guiar' | 'receita' | 'tempo' | 'opcoes'

function formatDate(dateString: string) {
  const d = new Date(dateString)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('guiar')
  const [activePartIndex, setActivePartIndex] = useState(0)
  const [completedLines, setCompletedLines] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (params.id) fetchProject()
  }, [params.id])

  async function fetchProject() {
    try {
      const res = await fetch(`/api/projects/${params.id}`)
      if (!res.ok) { setError(true); return }
      const data = await res.json()
      setProject(data.project)
    } catch (e) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  async function updateProject(data: any) {
    if (!project) return
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const result = await res.json()
        setProject(result.project)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const parsedPattern: ParsedPattern | null = project?.patternText
    ? parseCrochetPattern(project.patternText)
    : null

  const allLines = parsedPattern?.parts.flatMap(p => p.lines) || []
  const parts = parsedPattern?.parts || []
  const materials = parsedPattern?.materials || []

  const partLineRanges = useRef<{ start: number; end: number }[]>([])
  useEffect(() => {
    let start = 0
    partLineRanges.current = parts.map(p => {
      const range = { start, end: start + p.lines.length - 1 }
      start += p.lines.length
      return range
    })
  }, [parts])

  const totalLines = allLines.length
  const activePartLines = parts[activePartIndex]?.lines || []
  const activePartStart = partLineRanges.current[activePartIndex]?.start || 0

  const currentLineInPart = Math.max(0, Math.min(
    project?.currentLine !== undefined ? project.currentLine - activePartStart : 0,
    activePartLines.length - 1
  ))

  useEffect(() => {
    if (!project) return
    const stored = localStorage.getItem(`completed-${project.id}`)
    if (stored) {
      try {
        setCompletedLines(new Set(JSON.parse(stored)))
      } catch {}
    }
  }, [project?.id])

  const toggleLine = useCallback((globalIndex: number) => {
    setCompletedLines(prev => {
      const next = new Set(prev)
      if (next.has(globalIndex)) {
        next.delete(globalIndex)
      } else {
        next.add(globalIndex)
      }
      if (project) {
        localStorage.setItem(`completed-${project.id}`, JSON.stringify(Array.from(next)))
      }
      return next
    })
  }, [project])

  const goToLine = useCallback((globalIndex: number) => {
    updateProject({ currentLine: globalIndex })
  }, [])

  const goToPart = useCallback((partIdx: number) => {
    setActivePartIndex(partIdx)
    const range = partLineRanges.current[partIdx]
    if (range) {
      updateProject({ currentLine: range.start })
    }
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-8 text-center text-[#64748b] py-20">
        Carregando...
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-8 text-center py-20">
        <p className="text-[#64748b] mb-4">Projeto nao encontrado</p>
        <Link href="/projetos" className="text-purple-600 font-medium">
          Ver todos os projetos
        </Link>
      </div>
    )
  }

  let pixelGrid: string[][] = []
  if (project.pixelData) {
    try { pixelGrid = JSON.parse(project.pixelData) } catch {}
  }

  return (
    <div className="max-w-4xl mx-auto px-0 pt-0 pb-24">
      {/* Header */}
      <div className="bg-[#1a1a2e] text-white px-4 pt-8 pb-4">
        <Link href="/projetos" className="text-sm text-[#94a3b8] hover:text-white mb-3 inline-block">
          &larr; Todos os projetos
        </Link>
        <h1 className="text-xl md:text-2xl font-display font-bold mt-1">{project.name}</h1>
        <div className="flex items-center gap-3 mt-2 text-xs text-[#94a3b8]">
          <span className={`px-2 py-0.5 rounded-full text-xs border ${
            project.type === 'amigurumi'
              ? 'bg-pink-900/40 text-pink-300 border-pink-700'
              : 'bg-purple-900/40 text-purple-300 border-purple-700'
          }`}>
            {typeLabel(project.type)}
          </span>
          <span>{formatDate(project.createdAt)}</span>
          {project.timerSeconds > 0 && (
            <span>{Math.floor(project.timerSeconds / 60)} min</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e2e8f0] bg-white px-4">
        {([
          { key: 'guiar' as Tab, label: 'Guiar' },
          { key: 'receita' as Tab, label: 'Receita' },
          { key: 'tempo' as Tab, label: 'Tempo' },
          { key: 'opcoes' as Tab, label: 'Opcoes' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-[#64748b] hover:text-[#1a1a2e]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4">
        {activeTab === 'guiar' && (
          <GuiarTab
            project={project}
            parts={parts}
            activePartIndex={activePartIndex}
            setActivePartIndex={goToPart}
            activePartLines={activePartLines}
            activePartStart={activePartStart}
            currentLineInPart={currentLineInPart}
            completedLines={completedLines}
            toggleLine={toggleLine}
            goToLine={goToLine}
            totalLines={totalLines}
            pixelGrid={pixelGrid}
            updateProject={updateProject}
          />
        )}
        {activeTab === 'receita' && (
          <ReceitaTab
            materials={materials}
            parts={parts}
            totalLines={totalLines}
          />
        )}
        {activeTab === 'tempo' && (
          <div className="pt-4">
            <Timer projectId={project.id} initialSeconds={project.timerSeconds} />
          </div>
        )}
        {activeTab === 'opcoes' && (
          <OpcoesTab
            project={project}
            updateProject={updateProject}
            onDelete={() => {
              fetch(`/api/projects/${params.id}`, { method: 'DELETE' })
              router.push('/projetos')
            }}
          />
        )}
      </div>
    </div>
  )
}

function GuiarTab({
  project,
  parts,
  activePartIndex,
  setActivePartIndex,
  activePartLines,
  activePartStart,
  currentLineInPart,
  completedLines,
  toggleLine,
  goToLine,
  totalLines,
  pixelGrid,
  updateProject,
}: {
  project: Project
  parts: { name: string; lines: string[] }[]
  activePartIndex: number
  setActivePartIndex: (idx: number) => void
  activePartLines: string[]
  activePartStart: number
  currentLineInPart: number
  completedLines: Set<number>
  toggleLine: (globalIdx: number) => void
  goToLine: (globalIdx: number) => void
  totalLines: number
  pixelGrid: string[][]
  updateProject: (data: any) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const [guidelinesVisible, setGuidelinesVisible] = useState(true)

  const completedCount = completedLines.size

  useEffect(() => {
    if (itemRefs.current[currentLineInPart]) {
      itemRefs.current[currentLineInPart]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentLineInPart, activePartIndex])

  if (project.type === 'tapestry' && pixelGrid.length > 0) {
    return (
      <div className="pt-4">
        <TapestryGuideContent
          pixelGrid={pixelGrid}
          currentRow={project.currentRow}
          originalImage={project.originalImage}
          onUpdateRow={(row) => updateProject({ currentRow: row })}
        />
      </div>
    )
  }

  if (activePartLines.length === 0 && !project.pdfPath) {
    return (
      <div className="pt-4">
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 text-center shadow-sm">
          <p className="text-[#64748b]">Nenhuma receita adicionada ainda.</p>
          <Link href={`/projetos/${project.id}/editar`} className="text-purple-600 font-medium text-sm mt-1 inline-block">
            Adicionar receita
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-4">
      {/* PDF link */}
      {project.pdfPath && (
        <a
          href={project.pdfPath}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm mb-3 bg-purple-50 px-4 py-2 rounded-xl border border-purple-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Abrir PDF da receita
        </a>
      )}

      {/* Part subtabs */}
      {parts.length > 1 && (
        <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-thin">
          {parts.map((part, idx) => (
            <button
              key={idx}
              onClick={() => setActivePartIndex(idx)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                idx === activePartIndex
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-[#64748b] hover:bg-gray-200'
              }`}
            >
              {part.name}
            </button>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {totalLines > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-[#64748b] mb-1">
            <span>{completedCount}/{totalLines}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalLines) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-[#64748b]">
          {activePartLines.length} linha{activePartLines.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => {
              const newGlobal = Math.max(0, project.currentLine - 1)
              goToLine(newGlobal)
            }}
            disabled={project.currentLine <= 0}
            className="px-3 py-1 rounded-lg text-sm border border-[#e2e8f0] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-[#64748b]"
          >
            &larr; Anterior
          </button>
          <button
            onClick={() => {
              const newGlobal = Math.min(totalLines - 1, project.currentLine + 1)
              goToLine(newGlobal)
            }}
            disabled={project.currentLine >= totalLines - 1}
            className="px-3 py-1 rounded-lg text-sm border border-[#e2e8f0] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-[#64748b]"
          >
            Proxima &rarr;
          </button>
        </div>
      </div>

      {/* Line list */}
      {activePartLines.length > 0 && (
        <div ref={listRef} className="space-y-1 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
          {activePartLines.map((line, idx) => {
            const globalIdx = activePartStart + idx
            const isCurrent = (activePartStart + currentLineInPart) === globalIdx
            const isCompleted = completedLines.has(globalIdx)
            return (
              <div
                key={globalIdx}
                ref={(el) => { itemRefs.current[idx] = el }}
                className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  isCurrent && !isCompleted
                    ? 'bg-purple-100 border-2 border-purple-400 shadow-sm'
                    : isCompleted
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-transparent hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLine(globalIdx) }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    {isCompleted && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className={`w-6 text-xs font-mono font-bold ${
                    isCurrent ? 'text-purple-700' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {globalIdx + 1}
                  </span>
                </div>
                <span
                  onClick={() => goToLine(globalIdx)}
                  className={`text-sm leading-relaxed flex-1 ${
                    isCompleted ? 'text-gray-500 line-through' : isCurrent ? 'font-medium text-purple-900' : 'text-gray-700'
                  }`}
                >
                  {line}
                </span>
                {isCurrent && !isCompleted && (
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-300 shrink-0 ml-auto">
                    AGORA
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TapestryGuideContent({
  pixelGrid,
  currentRow,
  originalImage,
  onUpdateRow,
}: {
  pixelGrid: string[][]
  currentRow: number
  originalImage: string | null
  onUpdateRow: (row: number) => void
}) {
  const height = pixelGrid.length
  const width = pixelGrid[0]?.length || 0

  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden shadow-sm">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#1a1a2e]">Guia Visual - Jacquard</h3>
          <div className="flex items-center gap-2 text-sm text-[#64748b]">
            <span>{width}x{height}</span>
            {originalImage && (
              <a href={originalImage} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline text-xs">
                Ver original
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1">
            <button
              onClick={() => onUpdateRow(Math.max(0, currentRow - 1))}
              disabled={currentRow === 0}
              className="px-3 py-1 rounded-lg text-sm border border-[#e2e8f0] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &larr; Anterior
            </button>
            <button
              onClick={() => onUpdateRow(Math.min(height - 1, currentRow + 1))}
              disabled={currentRow >= height - 1}
              className="px-3 py-1 rounded-lg text-sm border border-[#e2e8f0] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Proxima &rarr;
            </button>
          </div>
          <span className="text-sm font-medium text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-300">
            Carreira {currentRow + 1} / {height}
          </span>
        </div>

        <div className="overflow-auto max-h-96 border border-[#e2e8f0] rounded-xl p-3 bg-white">
          <div className="inline-block">
            {pixelGrid.map((row, y) => (
              <div
                key={y}
                onClick={() => onUpdateRow(y)}
                className={`flex transition-all cursor-pointer ${
                  y === currentRow
                    ? 'bg-purple-100 shadow-md rounded-sm scale-[1.02]'
                    : 'hover:bg-gray-50'
                }`}
                style={{ marginBottom: y === currentRow ? 2 : 1, marginTop: y === currentRow ? 2 : 1 }}
              >
                <div className={`w-8 shrink-0 flex items-center justify-center text-xs font-mono ${
                  y === currentRow ? 'text-purple-700 font-bold' : 'text-gray-400'
                }`}>
                  {y + 1}
                </div>
                <div className="flex gap-[1px]">
                  {row.map((color, x) => (
                    <div
                      key={x}
                      style={{
                        width: y === currentRow ? 22 : 18,
                        height: y === currentRow ? 22 : 18,
                        backgroundColor: color,
                      }}
                      className="border border-gray-100"
                    />
                  ))}
                </div>
                {y === currentRow && (
                  <div className="ml-2 flex items-center">
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-300">
                      &larr; AGORA
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 p-3 bg-purple-50 rounded-xl border border-purple-200">
          <p className="text-xs font-medium text-purple-700 mb-2">Vizinhanca da carreira atual:</p>
          <div className="overflow-auto">
            <div className="inline-block">
              {pixelGrid
                .filter((_, y) => Math.abs(y - currentRow) <= 2)
                .map((row, y) => {
                  const actualY = currentRow - 2 + y
                  return (
                    <div key={actualY} className="flex items-center gap-1 mb-0.5">
                      <span className={`w-6 text-xs font-mono shrink-0 text-center ${
                        actualY === currentRow ? 'text-purple-700 font-bold' : 'text-gray-400'
                      }`}>
                        {actualY + 1}
                      </span>
                      <div className="flex gap-[1px]">
                        {row.map((color, x) => (
                          <div
                            key={x}
                            style={{
                              width: actualY === currentRow ? 20 : 14,
                              height: actualY === currentRow ? 20 : 14,
                              backgroundColor: color,
                            }}
                            className={`border ${actualY === currentRow ? 'border-purple-400' : 'border-gray-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReceitaTab({
  materials,
  parts,
  totalLines,
}: {
  materials: { name: string; items: string[] }[]
  parts: { name: string; lines: string[] }[]
  totalLines: number
}) {
  return (
    <div className="pt-4 space-y-4">
      {/* Materials */}
      {materials.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm">
          <h3 className="font-semibold text-[#1a1a2e] mb-3">Materiais</h3>
          <div className="space-y-3">
            {materials.map((mat, idx) => (
              <div key={idx}>
                <p className="text-xs font-medium text-purple-700 mb-1">{mat.name}</p>
                {mat.items.length > 0 && (
                  <ul className="space-y-1">
                    {mat.items.map((item, i) => (
                      <li key={i} className="text-sm text-[#64748b] flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-purple-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parts */}
      {parts.map((part, idx) => (
        <div key={idx} className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm">
          <h3 className="font-semibold text-[#1a1a2e] mb-2">
            {part.name}
            {part.lines.length > 0 && (
              <span className="text-xs font-normal text-[#64748b] ml-2">
                &mdash; {part.lines.length} linha{part.lines.length !== 1 ? 's' : ''}
              </span>
            )}
          </h3>
          {part.lines.length > 0 ? (
            <div className="space-y-1">
              {part.lines.map((line, i) => (
                <p key={i} className="text-sm text-gray-700 leading-relaxed">
                  <span className="text-xs text-gray-400 font-mono mr-2">{i + 1}.</span>
                  {line}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#64748b]">Nenhuma linha registrada.</p>
          )}
        </div>
      ))}

      {parts.length === 0 && materials.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 text-center shadow-sm">
          <p className="text-[#64748b]">Nenhuma receita adicionada ainda.</p>
        </div>
      )}
    </div>
  )
}

function OpcoesTab({
  project,
  updateProject,
  onDelete,
}: {
  project: Project
  updateProject: (data: any) => void
  onDelete: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('cover', file)
    try {
      const res = await fetch(`/api/projects/${project.id}/cover`, {
        method: 'PUT',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        updateProject({ coverImage: data.project.coverImage })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const statuses = [
    { value: 'not_started', label: 'Nao Iniciado' },
    { value: 'in_progress', label: 'Em Andamento' },
    { value: 'completed', label: 'Concluido' },
  ]

  return (
    <div className="pt-4 space-y-4">
      {/* Status */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm">
        <h3 className="font-semibold text-[#1a1a2e] mb-3">Status do projeto</h3>
        <div className="flex gap-2">
          {statuses.map(s => (
            <button
              key={s.value}
              onClick={() => updateProject({ status: s.value })}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                project.status === s.value
                  ? s.value === 'not_started'
                    ? 'bg-gray-100 text-gray-700 border-gray-400'
                    : s.value === 'in_progress'
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-400 shadow-sm'
                    : 'bg-green-50 text-green-700 border-green-400 shadow-sm'
                  : 'bg-white text-[#64748b] border-[#e2e8f0] hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cover Image */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm">
        <h3 className="font-semibold text-[#1a1a2e] mb-3">Imagem de capa</h3>
        {project.coverImage && (
          <div className="h-32 rounded-xl overflow-hidden mb-3">
            <img src={project.coverImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-4 py-2 rounded-xl border border-dashed border-[#e2e8f0] text-sm text-[#64748b] hover:border-purple-400 hover:text-purple-600 transition-all bg-gray-50"
        >
          {project.coverImage ? 'Trocar imagem' : 'Selecionar da galeria'}
        </button>
      </div>

      {/* Editar */}
      <Link
        href={`/projetos/${project.id}/editar`}
        className="block w-full bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm hover:bg-gray-50 transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#1a1a2e]">Editar projeto</span>
          <svg className="w-4 h-4 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <p className="text-xs text-[#64748b] mt-1">Alterar nome, descricao, receita e dados do projeto</p>
      </Link>

      {/* Delete */}
      <button
        onClick={() => {
          if (confirm('Tem certeza que deseja excluir este projeto?')) {
            onDelete()
          }
        }}
        className="w-full bg-white rounded-2xl border border-red-200 p-4 shadow-sm hover:bg-red-50 transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-red-600">Excluir projeto</span>
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <p className="text-xs text-red-500 mt-1">Esta acao nao pode ser desfeita</p>
      </button>
    </div>
  )
}
