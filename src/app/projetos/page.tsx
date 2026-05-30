'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ProjectCard } from '@/components/ProjectCard'
import { statusLabel, typeLabel } from '@/lib/utils'

type Project = {
  id: string
  name: string
  type: string
  status: string
  coverImage: string | null
  description: string
  timerSeconds: number
  createdAt: string
  pdfPath: string | null
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filtered, setFiltered] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    let result = [...projects]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    }
    if (filterType !== 'all') {
      result = result.filter(p => p.type === filterType)
    }
    if (filterStatus !== 'all') {
      result = result.filter(p => p.status === filterStatus)
    }
    setFiltered(result)
  }, [search, filterType, filterStatus, projects])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data.projects || [])
      setFiltered(data.projects || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-0 pb-24">
      {/* Dark header */}
      <div className="bg-[#1a1a2e] text-white px-4 pt-8 pb-6 -mx-4 mb-4">
        <Link href="/" className="text-sm text-[#94a3b8] hover:text-white mb-3 inline-block">
          &larr; Voltar
        </Link>
        <h1 className="text-xl md:text-2xl font-display font-bold">Projetos &mdash; <span className="text-[#94a3b8] font-normal">{filtered.length} encontrados</span></h1>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar projetos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-sm"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1">
          {(['all', 'amigurumi', 'tapestry'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterType === t
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-[#64748b] hover:bg-gray-200'
              }`}
            >
              {t === 'all' ? 'Todos' : t === 'amigurumi' ? 'Amigurumi' : 'Tapestry'}
            </button>
          ))}
        </div>
        <div className="w-px bg-[#e2e8f0] mx-1" />
        <div className="flex gap-1">
          {(['all', 'in_progress', 'not_started', 'completed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterStatus === s
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-[#64748b] hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'Todos' : statusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Project Grid */}
      {loading ? (
        <div className="text-center py-12 text-[#64748b]">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-[#e2e8f0] text-center">
          <p className="text-[#64748b] mb-4">
            {projects.length === 0
              ? 'Nenhum projeto ainda'
              : 'Nenhum projeto encontrado com esses filtros'}
          </p>
          <Link
            href="/projetos/novo"
            className="bg-purple-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-purple-700 transition-colors inline-block"
          >
            Criar projeto
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] px-4 py-2 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-around">
          <Link href="/" className="flex flex-col items-center text-[#64748b] hover:text-purple-600">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span className="text-xs mt-0.5">Inicio</span>
          </Link>
          <Link href="/projetos" className="flex flex-col items-center text-purple-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            <span className="text-xs mt-0.5">Projetos</span>
          </Link>
          <Link href="/projetos/novo" className="flex flex-col items-center text-[#64748b] hover:text-purple-600">
            <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center -mt-4 shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </Link>
        </div>
      </nav>
    </div>
  )
}
