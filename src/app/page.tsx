'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ProjectCard } from '@/components/ProjectCard'

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

export default function Home() {
  const [inProgress, setInProgress] = useState<Project | null>(null)
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [stats, setStats] = useState({ total: 0, inProgress: 0, completed: 0 })

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      if (data.projects) {
        const all = data.projects
        const ip = all.find((p: Project) => p.status === 'in_progress')
        setInProgress(ip || null)
        setRecentProjects(all.slice(0, 4))
        setStats({
          total: all.length,
          inProgress: all.filter((p: Project) => p.status === 'in_progress').length,
          completed: all.filter((p: Project) => p.status === 'completed').length,
        })
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1a1a2e]">
          Ateliê Crochet
        </h1>
        <p className="text-[#64748b] mt-1">Seus projetos de crochê organizados</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-white rounded-2xl p-4 border border-[#e2e8f0] text-center shadow-sm">
          <p className="text-2xl font-bold text-[#1a1a2e]">{stats.total}</p>
          <p className="text-xs text-[#64748b]">Total</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#e2e8f0] text-center shadow-sm">
          <p className="text-2xl font-bold text-green-600">{stats.inProgress}</p>
          <p className="text-xs text-[#64748b]">Em Andamento</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#e2e8f0] text-center shadow-sm">
          <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
          <p className="text-xs text-[#64748b]">Concluídos</p>
        </div>
      </div>

      {/* In Progress Highlight */}
      {inProgress ? (
        <Link href={`/projetos/${inProgress.id}`}>
          <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-2xl p-6 mb-8 text-white shadow-lg hover:shadow-xl transition-shadow">
            <p className="text-sm opacity-80 mb-1">Continuar projeto</p>
            <h2 className="text-xl font-bold">{inProgress.name}</h2>
            <div className="flex items-center gap-3 mt-2 text-sm opacity-90">
              <span>{inProgress.type === 'amigurumi' ? '🧶 Amigurumi' : '🧵 Jacquard'}</span>
              <span>•</span>
              <span>{Math.floor(inProgress.timerSeconds / 60)} min</span>
            </div>
          </div>
        </Link>
      ) : (
        <div className="bg-white rounded-2xl p-6 mb-8 border border-dashed border-[#e2e8f0] text-center">
          <p className="text-[#64748b]">Nenhum projeto em andamento</p>
          <Link href="/projetos/novo" className="text-purple-600 font-medium mt-1 inline-block">
            Criar novo projeto
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link href="/projetos/novo?type=amigurumi" className="bg-white rounded-2xl p-4 border border-[#e2e8f0] hover:shadow-md transition-shadow text-center shadow-sm">
          <p className="text-2xl mb-1">🧶</p>
          <p className="font-medium text-sm">Novo Amigurumi</p>
        </Link>
        <Link href="/projetos/novo?type=tapestry" className="bg-white rounded-2xl p-4 border border-[#e2e8f0] hover:shadow-md transition-shadow text-center shadow-sm">
          <p className="text-2xl mb-1">🧵</p>
          <p className="font-medium text-sm">Novo Jacquard</p>
        </Link>
      </div>

      {/* Recent Projects */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1a1a2e]">Meus Projetos</h2>
          <Link href="/projetos" className="text-sm text-purple-600 font-medium">
            Ver todos
          </Link>
        </div>
        {recentProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentProjects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-dashed border-[#e2e8f0] text-center">
            <p className="text-[#64748b] mb-2">Nenhum projeto ainda</p>
            <Link href="/projetos/novo" className="bg-purple-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-purple-700 transition-colors inline-block">
              Criar primeiro projeto
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] px-4 py-2 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-around">
          <Link href="/" className="flex flex-col items-center text-purple-600">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span className="text-xs mt-0.5">Início</span>
          </Link>
          <Link href="/projetos" className="flex flex-col items-center text-[#64748b] hover:text-purple-600">
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
