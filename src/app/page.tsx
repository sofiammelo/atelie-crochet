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

function fmtTime(s = 0) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : '\u2014'
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (e) { console.error(e) }
  }

  const inProgress = projects.filter(p => p.status === 'in_progress')
  const completed = projects.filter(p => p.status === 'completed')

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
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div style={{
          background: C.ink, padding: '52px 24px 28px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -70, right: -70, width: 220, height: 220, borderRadius: '50%', background: `${C.sage}20` }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: `${C.sage}10` }} />
          <div style={{ position: 'relative' }}>
            <div>
              <div style={{ fontSize: 11, color: C.sageLight, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                Ola
              </div>
              <h1 style={{ margin: 0, color: C.white, fontSize: 30, fontWeight: 600, lineHeight: 1.1 }}>
                Meu Atelie<br /><span style={{ color: C.sageLight, fontStyle: 'italic' }}>de Croche</span>
              </h1>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
              {[[projects.length, 'Total'], [inProgress.length, 'Andamento'], [completed.length, 'Concluídos']].map(([n, l]) => (
                <div key={l}>
                  <div style={{ color: C.white, fontSize: 26, fontWeight: 600 }}>{n}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 1 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 20px 0' }}>
          {/* In progress */}
          {inProgress.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.ink }}>Em andamento</h2>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.warn }} />
              </div>
              {inProgress.slice(0, 3).map(p => (
                <a key={p.id} href={`/projetos/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 14, padding: 14, cursor: 'pointer', marginBottom: 10 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: p.coverImage ? `url(${p.coverImage}) center/cover` : C.sagePale, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {!p.coverImage && (p.type === 'amigurumi' ? '\u{1F9F6}' : '\u{1F9F5}')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 16, color: C.ink }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                        {p.type === 'amigurumi' ? 'Amigurumi' : 'Tapestry'} &middot; {fmtTime(p.timerSeconds)}
                      </div>
                    </div>
                    <div style={{ color: C.stone, fontSize: 20 }}>&rsaquo;</div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {inProgress.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 20px', background: `${C.sage}0a`, borderRadius: 18, marginBottom: 28, border: `1.5px dashed ${C.sage}50` }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Nenhum projeto ativo</div>
              <div style={{ fontSize: 13, color: C.muted }}>Crie um projeto para comecar</div>
            </div>
          )}

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
            <a href="/projetos/novo" style={{ textDecoration: 'none' }}>
              <div style={{ padding: '20px 16px', borderRadius: 18, background: C.sage, color: C.white, fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>
                <div style={{ fontSize: 26, marginBottom: 8, opacity: 0.85 }}>+</div>
                Novo<br />projeto
              </div>
            </a>
            <a href="/projetos" style={{ textDecoration: 'none' }}>
              <div style={{ padding: '20px 16px', borderRadius: 18, border: `1.5px solid ${C.creamDark}`, background: C.white, color: C.ink, fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>
                <div style={{ fontSize: 26, marginBottom: 8, opacity: 0.5 }}>&#x1F4C1;</div>
                Ver todos<br />
                <span style={{ fontSize: 13, fontWeight: 400, color: C.muted }}>{projects.length} projetos</span>
              </div>
            </a>
          </div>

          {/* Recent */}
          {projects.length > 0 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: C.ink, margin: '0 0 14px' }}>Recentes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.slice(0, 4).map(p => (
                  <ProjectCard key={p.id} project={p} onClick={() => window.location.href = `/projetos/${p.id}`} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Nav — mobile only */}
      <div className="md:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(253,252,251,0.93)', backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${C.creamDark}`, display: 'flex', justifyContent: 'center', padding: '8px 0 20px',
      }}>
        <div className="flex items-center justify-around" style={{ width: '100%', maxWidth: 400 }}>
          {[
            { s: 'home', icon: '\u2302', label: 'Início' },
            { s: 'projects', icon: '\u25EB', label: 'Projetos' },
            { s: 'create', icon: '+', label: 'Criar', special: true },
          ].map(item => (
            <a key={item.s} href={item.s === 'create' ? '/projetos/novo' : item.s === 'home' ? '/' : '/projetos'} style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', textDecoration: 'none',
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
