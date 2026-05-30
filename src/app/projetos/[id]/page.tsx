'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Timer } from '@/components/Timer'
import { formatTime, statusLabel, statusColor, typeLabel, typeColor } from '@/lib/utils'

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

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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
        <p className="text-4xl mb-3">😢</p>
        <p className="text-[#64748b] mb-4">Projeto não encontrado</p>
        <Link href="/projetos" className="text-purple-600 font-medium">
          Ver todos os projetos
        </Link>
      </div>
    )
  }

  const lines = project.patternText ? project.patternText.split('\n').filter(l => l.trim()) : []

  let pixelGrid: string[][] = []
  if (project.pixelData) {
    try { pixelGrid = JSON.parse(project.pixelData) } catch {}
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-24">
      {/* Back */}
      <Link href="/projetos" className="text-sm text-[#64748b] hover:text-purple-600 mb-4 inline-block">
        ← Todos os projetos
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden shadow-sm mb-4">
        {project.coverImage && (
          <div className="h-40 md:h-56 overflow-hidden">
            <img src={project.coverImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-[#1a1a2e]">
                {project.name}
              </h1>
              <p className="text-[#64748b] mt-1">{project.description}</p>
            </div>
            <Link
              href={`/projetos/${project.id}/editar`}
              className="text-[#64748b] hover:text-purple-600 p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`text-xs px-3 py-1 rounded-full border ${typeColor(project.type)}`}>
              {typeLabel(project.type)}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full border ${statusColor(project.status)}`}>
              {statusLabel(project.status)}
            </span>
            {project.type === 'amigurumi' && lines.length > 0 && (
              <span className="text-xs px-3 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-300">
                {project.currentLine}/{lines.length} linhas
              </span>
            )}
            {project.type === 'tapestry' && pixelGrid.length > 0 && (
              <span className="text-xs px-3 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-300">
                Carreira {project.currentRow}/{pixelGrid.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="mb-4">
        <Timer projectId={project.id} initialSeconds={project.timerSeconds} />
      </div>

      {/* Type-specific content */}
      {project.type === 'amigurumi' && (
        <AmigurumiGuide
          lines={lines}
          currentLine={project.currentLine}
          pdfPath={project.pdfPath}
          onUpdateLine={(line) => updateProject({ currentLine: line })}
        />
      )}

      {project.type === 'tapestry' && (
        <TapestryGuide
          pixelGrid={pixelGrid}
          currentRow={project.currentRow}
          originalImage={project.originalImage}
          onUpdateRow={(row) => updateProject({ currentRow: row })}
        />
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        {project.status !== 'completed' && (
          <button
            onClick={() => updateProject({ status: 'completed' })}
            className="flex-1 bg-green-50 text-green-700 border border-green-300 px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors"
          >
            Marcar como Concluído
          </button>
        )}
        {project.status === 'not_started' && (
          <button
            onClick={() => updateProject({ status: 'in_progress' })}
            className="flex-1 bg-purple-50 text-purple-700 border border-purple-300 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-100 transition-colors"
          >
            Iniciar Projeto
          </button>
        )}
        <button
          onClick={async () => {
            if (confirm('Tem certeza que deseja excluir este projeto?')) {
              await fetch(`/api/projects/${params.id}`, { method: 'DELETE' })
              router.push('/projetos')
            }
          }}
          className="bg-red-50 text-red-600 border border-red-300 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
        >
          Excluir
        </button>
      </div>
    </div>
  )
}

function AmigurumiGuide({
  lines,
  currentLine,
  pdfPath,
  onUpdateLine,
}: {
  lines: string[]
  currentLine: number
  pdfPath: string | null
  onUpdateLine: (line: number) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (itemRefs.current[currentLine]) {
      itemRefs.current[currentLine]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentLine])

  if (lines.length === 0 && !pdfPath) {
    return (
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 text-center shadow-sm">
        <p className="text-[#64748b]">Nenhuma receita adicionada ainda.</p>
        <Link href={`/projetos/${useParams().id}/editar`} className="text-purple-600 font-medium text-sm mt-1 inline-block">
          Adicionar receita
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden shadow-sm">
      {/* PDF View */}
      {pdfPath && (
        <div className="p-4 border-b border-[#e2e8f0]">
          <a
            href={pdfPath}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Abrir PDF da receita
          </a>
        </div>
      )}

      {/* Line-by-line Guide */}
      {lines.length > 0 && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[#1a1a2e]">Guia Linha por Linha</h3>
            <div className="flex gap-1">
              <button
                onClick={() => onUpdateLine(Math.max(0, currentLine - 1))}
                disabled={currentLine === 0}
                className="px-3 py-1 rounded-lg text-sm border border-[#e2e8f0] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <button
                onClick={() => onUpdateLine(Math.min(lines.length - 1, currentLine + 1))}
                disabled={currentLine >= lines.length - 1}
                className="px-3 py-1 rounded-lg text-sm border border-[#e2e8f0] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Próxima →
              </button>
            </div>
          </div>

          <div ref={listRef} className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin">
            {lines.map((line, idx) => (
              <div
                key={idx}
                ref={(el) => { itemRefs.current[idx] = el }}
                onClick={() => onUpdateLine(idx)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  idx === currentLine
                    ? 'bg-purple-100 border-2 border-purple-400 shadow-sm'
                    : idx < currentLine
                    ? 'bg-green-50 border border-green-200 opacity-60'
                    : 'bg-gray-50 border border-transparent hover:border-gray-200'
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  idx === currentLine
                    ? 'bg-purple-500 text-white'
                    : idx < currentLine
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {idx + 1}
                </span>
                <span className={`text-sm ${
                  idx === currentLine ? 'font-medium text-purple-900' :
                  idx < currentLine ? 'text-gray-500 line-through' : 'text-gray-700'
                }`}>
                  {line}
                </span>
                {idx === currentLine && (
                  <span className="ml-auto text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-300 shrink-0">
                    AGORA
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TapestryGuide({
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
  if (pixelGrid.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 text-center shadow-sm">
        <p className="text-[#64748b]">Nenhum dado de pixel encontrado.</p>
      </div>
    )
  }

  const height = pixelGrid.length
  const width = pixelGrid[0]?.length || 0

  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden shadow-sm">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#1a1a2e]">Guia Visual - Jacquard</h3>
          <div className="flex items-center gap-2 text-sm text-[#64748b]">
            <span>{width}×{height}</span>
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
              ← Anterior
            </button>
            <button
              onClick={() => onUpdateRow(Math.min(height - 1, currentRow + 1))}
              disabled={currentRow >= height - 1}
              className="px-3 py-1 rounded-lg text-sm border border-[#e2e8f0] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Próxima →
            </button>
          </div>
          <span className="text-sm font-medium text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-300">
            Carreira {currentRow + 1} / {height}
          </span>
        </div>

        {/* Full Grid with current row highlighted */}
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
                {/* Row number */}
                <div className={`w-8 shrink-0 flex items-center justify-center text-xs font-mono ${
                  y === currentRow ? 'text-purple-700 font-bold' : 'text-gray-400'
                }`}>
                  {y + 1}
                </div>
                {/* Row pixel data */}
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
                {/* Current row indicator */}
                {y === currentRow && (
                  <div className="ml-2 flex items-center">
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-300">
                      ← AGORA
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Simplified view - just current and nearby rows */}
        <div className="mt-4 p-3 bg-purple-50 rounded-xl border border-purple-200">
          <p className="text-xs font-medium text-purple-700 mb-2">Vizinhança da carreira atual:</p>
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
