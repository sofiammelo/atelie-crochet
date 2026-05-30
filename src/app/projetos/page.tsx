'use client'

import { useEffect, useState } from 'react'
import { C, S, fonts } from '@/lib/tokens'
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

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Nao iniciados',
  in_progress: 'Andamento',
  completed: 'Concluidos',
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
    <div style={{ maxWidth: 540, margin: '0 auto', minHeight: '100vh', background: C.cream, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: C.ink, padding: '52px 24px 24px' }}>
        <a href="/" style={{
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 10, padding: '7px 14px', color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer', fontSize: 13, marginBottom: 16, display: 'inline-block',
          textDecoration: 'none',
        }}>
          &larr; Inicio
        </a>
        <h1 style={{ margin: 0, color: C.white, fontFamily: fonts.display, fontSize: 26, fontWeight: 600 }}>
          Projetos
        </h1>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>
          {filtered.length} encontrados
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar projetos..."
            style={{ ...S.input, paddingLeft: 40 }}
          />
          <span style={{
            position: 'absolute', left: 14, top: '50%',
            transform: 'translateY(-50%)', color: C.mutedLight, fontSize: 14,
          }}>
            &#x2315;
          </span>
        </div>

        {/* Type filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {[['all', 'Todos'], ['amigurumi', 'Amigurumi'], ['tapestry', 'Tapestry']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterType(v)}
              style={{
                padding: '7px 16px', borderRadius: 20, whiteSpace: 'nowrap',
                border: `1.5px solid ${filterType === v ? C.sage : C.creamDark}`,
                background: filterType === v ? C.sagePale : C.white,
                color: filterType === v ? C.sageDark : C.muted,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {l}
            </button>
          ))}
          <div style={{ width: 1, background: C.creamDark, margin: '0 4px' }} />
          {[['all', 'Todos'], ['in_progress', 'Andamento'], ['completed', 'Concluidos'], ['not_started', 'Nao iniciados']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              style={{
                padding: '7px 16px', borderRadius: 20, whiteSpace: 'nowrap',
                border: `1.5px solid ${filterStatus === v ? C.sageDark : C.creamDark}`,
                background: filterStatus === v ? C.ink : C.white,
                color: filterStatus === v ? C.white : C.muted,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Carregando...</div>
        ) : filtered.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {filtered.map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => window.location.href = `/projetos/${p.id}`} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>
            <div style={{ fontFamily: fonts.display, fontSize: 18, marginBottom: 8 }}>
              Nenhum projeto encontrado
            </div>
            <a href="/projetos/novo" style={{ ...S.btnPrimary, display: 'inline-block', textDecoration: 'none' }}>
              Criar projeto
            </a>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 540,
        background: 'rgba(253,252,251,0.93)', backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${C.creamDark}`, display: 'flex', padding: '8px 0 20px',
        zIndex: 50,
      }}>
        {[
          { s: 'home', icon: '\u2302', label: 'Inicio' },
          { s: 'projects', icon: '\u25EB', label: 'Projetos' },
          { s: 'create', icon: '+', label: 'Criar', special: true },
        ].map(item => (
          <a
            key={item.s}
            href={item.s === 'create' ? '/projetos/novo' : item.s === 'home' ? '/' : '/projetos'}
            style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '6px 0', textDecoration: 'none',
            }}
          >
            {item.special ? (
              <div style={{
                width: 44, height: 44, borderRadius: 14, background: C.sage,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, color: C.white, marginTop: -10,
                boxShadow: `0 4px 16px ${C.sage}60`,
              }}>
                {item.icon}
              </div>
            ) : (
              <>
                <span style={{ fontSize: 18, color: '#b0a8a0' }}>{item.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.mutedLight, letterSpacing: 0.3 }}>
                  {item.label}
                </span>
              </>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
