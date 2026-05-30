'use client'

import { useEffect, useState } from 'react'
import { C, S } from '@/lib/tokens'
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filtered, setFiltered] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchProjects() }, [])

  useEffect(() => {
    let result = [...projects]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    }
    if (filterType !== 'all') result = result.filter(p => p.type === filterType)
    if (filterStatus !== 'all') result = result.filter(p => p.status === filterStatus)
    setFiltered(result)
  }, [search, filterType, filterStatus, projects])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data.projects || [])
      setFiltered(data.projects || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen" style={{ background: C.cream, paddingBottom: 80 }}>
      {/* Desktop top nav */}
      <div className="hidden md:flex items-center justify-between" style={{
        background: C.white, borderBottom: `1px solid ${C.creamDark}`, padding: '12px 24px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <a href="/" style={{ fontWeight: 700, fontSize: 16, color: C.ink, textDecoration: 'none' }}>Ateliê Crochê</a>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/" style={{ fontSize: 13, color: C.muted, textDecoration: 'none', fontWeight: 500 }}>Início</a>
          <a href="/projetos" style={{ fontSize: 13, color: C.muted, textDecoration: 'none', fontWeight: 500 }}>Projetos</a>
          <a href="/projetos/novo" style={{ ...S.btnPrimary, padding: '7px 16px', fontSize: 12, textDecoration: 'none' }}>Novo projeto</a>
        </div>
      </div>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div style={{ background: C.ink, padding: '52px 24px 24px' }}>
          <a href="/" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '7px 14px', color: 'rgba(255,255,255,0.7)', fontSize: 13, display: 'inline-block', textDecoration: 'none' }}>
            &larr; Inicio
          </a>
          <h1 style={{ margin: 0, color: C.white, fontSize: 26, fontWeight: 600, marginTop: 12 }}>
            Projetos
          </h1>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>
            {filtered.length} encontrados
          </div>
        </div>

        <div style={{ padding: '20px 20px 0' }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar projetos..." style={{ ...S.input, paddingLeft: 40 }} />
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.mutedLight, fontSize: 14 }}>&#x2315;</span>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {[['all', 'Todos'], ['amigurumi', 'Amigurumi'], ['tapestry', 'Tapestry']].map(([v, l]) => (
              <button key={v} onClick={() => setFilterType(v)} style={{
                padding: '7px 16px', borderRadius: 20, whiteSpace: 'nowrap', border: `1.5px solid ${filterType === v ? C.sage : C.creamDark}`,
                background: filterType === v ? C.sagePale : C.white, color: filterType === v ? C.sageDark : C.muted,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>{l}</button>
            ))}
            <div style={{ width: 1, background: C.creamDark, margin: '0 4px' }} />
            {[['all', 'Todos'], ['in_progress', 'Andamento'], ['completed', 'Concluídos'], ['not_started', 'Não iniciados']].map(([v, l]) => (
              <button key={v} onClick={() => setFilterStatus(v)} style={{
                padding: '7px 16px', borderRadius: 20, whiteSpace: 'nowrap', border: `1.5px solid ${filterStatus === v ? C.sageDark : C.creamDark}`,
                background: filterStatus === v ? C.ink : C.white, color: filterStatus === v ? C.white : C.muted,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Carregando...</div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filtered.map(p => (
                <ProjectCard key={p.id} project={p} onClick={() => window.location.href = `/projetos/${p.id}`} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Nenhum projeto encontrado</div>
              <a href="/projetos/novo" style={{ ...S.btnPrimary, display: 'inline-block', textDecoration: 'none' }}>Criar projeto</a>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Nav — mobile only */}
      <div className="md:hidden" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(253,252,251,0.93)', backdropFilter: 'blur(12px)', borderTop: `1px solid ${C.creamDark}`, display: 'flex', justifyContent: 'center', padding: '8px 0 20px' }}>
        <div className="flex items-center justify-around" style={{ width: '100%', maxWidth: 400 }}>
          {[
            { s: 'home', icon: '\u2302', label: 'Início' },
            { s: 'projects', icon: '\u25EB', label: 'Projetos' },
            { s: 'create', icon: '+', label: 'Criar', special: true },
          ].map(item => (
            <a key={item.s} href={item.s === 'create' ? '/projetos/novo' : item.s === 'home' ? '/' : '/projetos'} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', textDecoration: 'none',
            }}>
              {item.special ? (
                <div style={{ width: 44, height: 44, borderRadius: 14, background: C.sage, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: C.white, marginTop: -10, boxShadow: `0 4px 16px ${C.sage}60` }}>
                  {item.icon}
                </div>
              ) : (
                <>
                  <span style={{ fontSize: 18, color: C.stone }}>{item.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.mutedLight, letterSpacing: 0.3 }}>{item.label}</span>
                </>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
