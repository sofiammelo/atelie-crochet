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
    <div className="max-w-4xl mx-auto px-4 pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-[#64748b] hover:text-purple-600 mb-1 inline-block">
            ← Voltar
          </Link>
          <h1 className="text-2xl font-display font-bold text-[#1a1a2e]">Meus Projetos</h1>
        </div>
        <Link
          href="/projetos/novo"
          className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-[#e2e8f0] mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[#e2e8f0] bg-[#faf5f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 rounded-xl border border-[#e2e8f0] bg-[#faf5f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="all">Todos os tipos</option>
            <option value="amigurumi">Amigurumi</option>
            <option value="tapestry">Jacquard/Tapestry</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-xl border border-[#e2e8f0] bg-[#faf5f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="all">Todos os status</option>
            <option value="not_started">Não Iniciado</option>
            <option value="in_progress">Em Andamento</option>
            <option value="completed">Concluído</option>
          </select>
        </div>
      </div>

      {/* Project Count */}
      <p className="text-sm text-[#64748b] mb-4">
        {filtered.length} {filtered.length === 1 ? 'projeto' : 'projetos'} encontrados
      </p>

      {/* Project List */}
      {loading ? (
        <div className="text-center py-12 text-[#64748b]">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-[#e2e8f0] text-center">
          <p className="text-4xl mb-3">🧶</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
            <span className="text-xs mt-0.5">Início</span>
          </Link>
          <Link href="/projetos" className="flex flex-col items-center text-purple-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            <span className="text-xs mt-0.5">Projetos</span>
          </Link>
          <Link href="/projetos/novo" className="flex flex-col items-center text-[#64748b] hover:text-purple-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            <span className="text-xs mt-0.5">Novo</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
