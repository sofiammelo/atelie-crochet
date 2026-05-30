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
  const [inProgress, setInProgress] = useState<Project[]>([])
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
        setInProgress(all.filter((p: Project) => p.status === 'in_progress'))
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
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-sm text-[#64748b]">Ola, Usuaria</p>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-[#1a1a2e]">
            Meu Atelie de Croche
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-[#64748b] mb-6">
        <span><strong className="text-[#1a1a2e]">{stats.total}</strong> Total</span>
        <span className="w-1 h-1 rounded-full bg-[#cbd5e1]" />
        <span><strong className="text-green-600">{stats.inProgress}</strong> Andamento</span>
        <span className="w-1 h-1 rounded-full bg-[#cbd5e1]" />
        <span><strong className="text-blue-600">{stats.completed}</strong> Concluidos</span>
      </div>

      {inProgress.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#1a1a2e] mb-3">Em andamento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inProgress.slice(0, 2).map((p) => (
              <Link key={p.id} href={`/projetos/${p.id}`}>
                <div className="bg-white rounded-2xl p-4 border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-lg shrink-0">
                      {p.type === 'amigurumi' ? '\u{1F9F6}' : '\u{1F9F5}'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-[#1a1a2e] truncate">{p.name}</p>
                      <p className="text-xs text-[#64748b]">{p.type === 'amigurumi' ? 'Amigurumi' : 'Tapestry'}</p>
                    </div>
                  </div>
                  {p.timerSeconds > 0 && (
                    <p className="text-xs text-[#64748b] mt-2 ml-[3.25rem]">
                      {Math.floor(p.timerSeconds / 60)} min
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <Link href="/projetos/novo"
          className="flex-1 bg-[#1a1a2e] text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-[#2a2a3e] transition-colors flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo projeto
        </Link>
        <Link href="/projetos"
          className="flex-1 bg-white border border-[#e2e8f0] text-[#1a1a2e] px-5 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors text-center">
          Ver todos &ndash; {stats.total} projetos
        </Link>
      </div>

      {recentProjects.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[#1a1a2e] mb-3">Recentes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentProjects.slice(0, 4).map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] px-4 py-2 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-around">
          <Link href="/" className="flex flex-col items-center text-purple-600">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span className="text-xs mt-0.5">Inicio</span>
          </Link>
          <Link href="/projetos" className="flex flex-col items-center text-[#64748b] hover:text-purple-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            <span className="text-xs mt-0.5">Projetos</span>
          </Link>
          <Link href="/projetos/novo"
            className="flex flex-col items-center text-[#64748b] hover:text-purple-600">
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
