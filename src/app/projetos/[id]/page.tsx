'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { C, S } from '@/lib/tokens'
import { AmigurumiGuide } from '@/components/AmigurumiGuide'
import { TapestryGuide } from '@/components/TapestryGuide'
import { RecipeEditor, parseRecipe, emptyRecipe, type Recipe } from '@/components/RecipeEditor'

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
  recipe: string
  pixelData: string | null
  pixelWidth: number | null
  pixelHeight: number | null
  originalImage: string | null
  currentRow: number
  timerSeconds: number
  createdAt: string
  rows: { id: string; rowIndex: number; rowData: string }[]
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function useTimer(init = 0) {
  const [secs, setSecs] = useState(init)
  const [running, setRunning] = useState(false)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (running) ref.current = setInterval(() => setSecs(s => s + 1), 1000)
    else if (ref.current) { clearInterval(ref.current); ref.current = null }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running])

  const fmt = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const fmtShort = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : '\u2014'
  }
  return { secs, setSecs, running, setRunning, fmt, fmtShort }
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('guide')
  const [editingRecipe, setEditingRecipe] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const timer = useTimer(0)

  useEffect(() => { if (params.id) fetchProject() }, [params.id])

  async function fetchProject() {
    try {
      const res = await fetch(`/api/projects/${params.id}`)
      if (!res.ok) return setLoading(false)
      const data = await res.json()
      setProject(data.project)
      timer.setSecs(data.project?.timerSeconds || 0)
    } catch (e) { console.error(e) } finally { setLoading(false) }
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
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    if (!timer.running && project) {
      updateProject({ timerSeconds: timer.secs })
    }
  }, [timer.running])

  const recipe = project ? parseRecipe(project.recipe) : emptyRecipe()

  const TABS = [
    { id: 'guide', label: 'Guiar', icon: '\u25B6' },
    { id: 'recipe', label: project?.type === 'amigurumi' ? 'Receita' : 'Grade', icon: '\uD83D\uDCCB' },
    { id: 'timer', label: 'Tempo', icon: '\u23F1' },
    { id: 'settings', label: 'Opções', icon: '\u2699' },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.cream }}>
      <div style={{ color: C.muted, fontSize: 14 }}>Carregando...</div>
    </div>
  )

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.cream }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>Projeto não encontrado</div>
        <a href="/projetos" style={{ ...S.btnPrimary, textDecoration: 'none' }}>Ver projetos</a>
      </div>
    </div>
  )

  let pixelGrid: string[][] = []
  if (project.pixelData) { try { pixelGrid = JSON.parse(project.pixelData) } catch {} }

  return (
    <div className="min-h-screen" style={{ background: C.cream, paddingBottom: 80 }}>
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div style={{
          background: `linear-gradient(135deg, ${C.sageDark} 0%, ${C.ink} 100%)`,
          padding: '52px 20px 28px', position: 'relative',
        }}>
          <a href="/projetos" style={{
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10,
            padding: '7px 14px', color: '#fff', fontSize: 13, textDecoration: 'none', display: 'inline-block',
          }}>&larr; Voltar</a>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              {project.type === 'amigurumi' ? 'Amigurumi' : 'Tapestry / Jacquard'}
            </div>
            <h1 style={{ margin: 0, color: '#fff', fontSize: 28, fontWeight: 600, lineHeight: 1.2 }}>
              {project.name}
            </h1>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 8 }}>
              Criado em {fmtDate(project.createdAt)} &middot; {timer.fmtShort(timer.secs)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: C.white, borderBottom: `1px solid ${C.creamDark}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '13px 4px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600, color: tab === t.id ? C.sage : C.mutedLight,
              borderBottom: tab === t.id ? `2px solid ${C.sage}` : '2px solid transparent', marginBottom: -1,
            }}>
              <div style={{ fontSize: 15, marginBottom: 2 }}>{t.icon}</div>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 16px 0' }}>
          {/* GUIDE — Amigurumi */}
          {tab === 'guide' && project.type === 'amigurumi' && (
            <AmigurumiGuide
              recipe={recipe}
              currentLine={project.currentLine || 0}
              onUpdateLine={(line) => updateProject({ currentLine: line, status: line > 0 ? 'in_progress' : project.status })}
            />
          )}

          {/* GUIDE — Tapestry */}
          {tab === 'guide' && project.type === 'tapestry' && (
            pixelGrid.length > 0
              ? <TapestryGuide
                  grid={pixelGrid}
                  currentRow={project.currentRow || 0}
                  onRowDone={() => updateProject({
                    currentRow: (project.currentRow || 0) + 1,
                    status: (project.currentRow || 0) + 1 >= pixelGrid.length ? 'completed' : 'in_progress',
                  })}
                />
              : <div style={{ textAlign: 'center', padding: 48, color: C.muted } as React.CSSProperties}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: C.ink, marginBottom: 8 }}>
                    Nenhuma grade configurada
                  </div>
                  <div style={{ fontSize: 14 }}>Vá na aba Grade para configurar</div>
                </div>
          )}

          {/* RECIPE — Amigurumi */}
          {tab === 'recipe' && project.type === 'amigurumi' && (
            editingRecipe
              ? <RecipeEditor
                  recipe={recipe}
                  onSave={r => { updateProject({ recipe: JSON.stringify(r) }); setEditingRecipe(false) }}
                  onCancel={() => setEditingRecipe(false)}
                />
              : <>
                  {recipe.materials && (
                    <div style={{ ...S.card, padding: 16, marginBottom: 16, background: `${C.warn}0a`, border: `1px solid ${C.warn}30` } as React.CSSProperties}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.warn, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                        Materiais
                      </div>
                      <div style={{ fontSize: 13, color: C.inkLight, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {recipe.materials}
                      </div>
                    </div>
                  )}
                  {(recipe.sections || []).map(sec => (
                    <div key={sec.id} style={{ ...S.card, marginBottom: 14, overflow: 'hidden' } as React.CSSProperties}>
                      <div style={{ padding: '12px 16px', background: C.sagePale, borderBottom: `1px solid ${C.creamDark}` }}>
                        <div style={{ fontWeight: 600, fontSize: 17, color: C.ink }}>{sec.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{sec.rows.length} linha{sec.rows.length !== 1 ? 's' : ''}</div>
                      </div>
                      {sec.rows.map(r => (
                        <div key={r.id} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: `1px solid ${C.cream}` }}>
                          <div style={{ width: 20, height: 20, background: C.sagePale, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: C.sage, flexShrink: 0 }}>
                            {r.line}
                          </div>
                          <div style={{ fontSize: 13, color: C.inkLight, lineHeight: 1.6 }}>{r.instruction}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <button onClick={() => setEditingRecipe(true)} style={{ width: '100%', padding: '13px', borderRadius: 12, border: `1.5px dashed ${C.sage}`, background: 'transparent', color: C.sage, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {recipe.sections?.length ? 'Editar receita' : 'Criar receita'}
                  </button>
                </>
          )}

          {/* GRADE — Tapestry */}
          {tab === 'recipe' && project.type === 'tapestry' && (
            <PixelTab project={project} pixelGrid={pixelGrid} onUpdate={updateProject} />
          )}

          {/* TIMER */}
          {tab === 'timer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...S.card, padding: 28, textAlign: 'center' } as React.CSSProperties}>
                <div style={{ fontSize: 12, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Tempo total</div>
                <div style={{ fontFamily: 'monospace', fontSize: 40, fontWeight: 700, color: C.ink, letterSpacing: 4 }}>
                  {timer.fmt(timer.secs)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => timer.setRunning((r: boolean) => !r)} style={{ flex: 2, ...S.btnPrimary, padding: '14px', fontSize: 15 }}>
                  {timer.running ? 'Pausar' : 'Iniciar'}
                </button>
                <button onClick={() => { timer.setRunning(false); timer.setSecs(project.timerSeconds || 0) }} style={{ flex: 1, ...S.btnGhost, padding: '14px' }}>
                  &xmap;
                </button>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {tab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ ...S.card, padding: 18 } as React.CSSProperties}>
                <label style={S.label}>Status</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    ['not_started', 'Não iniciado', C.mutedLight],
                    ['in_progress', 'Em andamento', C.warn],
                    ['completed', 'Concluído', C.success],
                  ].map(([s, l, col]) => (
                    <button key={s} onClick={() => updateProject({ status: s })} style={{
                      flex: 1, padding: '10px 4px', borderRadius: 10,
                      border: `1.5px solid ${project.status === s ? col : C.creamDark}`,
                      background: project.status === s ? `${col}18` : 'transparent',
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      color: project.status === s ? col : C.muted,
                    }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <a href={`/projetos/${project.id}/editar`} style={{ ...S.card, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>Editar projeto</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Nome, descrição e dados</div>
                </div>
                <span style={{ fontSize: 18, color: C.stone }}>&rsaquo;</span>
              </a>

              <button onClick={() => setShowDeleteConfirm(true)} style={{ ...S.btnDanger, width: '100%', padding: '13px', textAlign: 'center' }}>
                Excluir projeto
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ ...S.card, padding: 28, maxWidth: 340, width: '100%' } as React.CSSProperties}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Excluir projeto?</div>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Esta ação não pode ser desfeita.</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowDeleteConfirm(false)} style={{ ...S.btnGhost, flex: 1 }}>Cancelar</button>
                <button onClick={async () => { await fetch(`/api/projects/${params.id}`, { method: 'DELETE' }); router.push('/projetos') }} style={{ flex: 1, ...S.btnPrimary, background: C.error }}>Excluir</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PixelTab({ project, pixelGrid, onUpdate }: { project: Project; pixelGrid: string[][]; onUpdate: (data: any) => void }) {
  const [converting, setConverting] = useState(false)
  const [convertFile, setConvertFile] = useState<File | null>(null)
  const [maxSize, setMaxSize] = useState(40)

  async function convertImage(file: File) {
    setConverting(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('maxSize', String(maxSize))
      const res = await fetch('/api/convert-image', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        if (data.pixels) onUpdate({ pixelData: JSON.stringify(data.pixels), currentRow: 0, status: 'in_progress', pixelWidth: data.width, pixelHeight: data.height })
      }
    } catch (e) { console.error(e) } finally { setConverting(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 14, color: C.muted, margin: '0 0 8px' }}>
        Configure ou atualize a grade do seu Tapestry.
      </p>

      {/* Option 1: Upload pixel image */}
      <label style={{ ...S.card, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 } as React.CSSProperties}>
        <span style={{ fontSize: 24 }}>&#x1F5BC;</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>Upload de imagem pixelada</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Envie uma imagem que já está em pixels</div>
        </div>
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          const fd = new FormData()
          fd.append('image', file)
          fd.append('maxSize', String(maxSize))
          fetch('/api/convert-image', { method: 'POST', body: fd }).then(r => r.json()).then(d => {
            if (d.pixels) onUpdate({ pixelData: JSON.stringify(d.pixels), currentRow: 0, status: 'in_progress', pixelWidth: d.width, pixelHeight: d.height })
          })
        }} />
      </label>

      {/* Option 2: Convert image */}
      <div style={{ ...S.card, padding: '14px 18px' } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
          <span style={{ fontSize: 24 }}>&#x1F4F7;</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>Converter imagem</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Qualquer foto — convertemos em pixels</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <label style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: C.cream, border: `1px solid ${C.creamDark}` }}>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) convertImage(f) }} />
            <span style={{ fontSize: 13, color: C.muted }}>Selecionar imagem</span>
          </label>
        </div>
        {/* Detail level */}
        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Nível de detalhe:</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { v: 20, l: 'Simples' },
              { v: 40, l: 'Detalhado' },
              { v: 60, l: 'Muito detalhado' },
            ].map(({ v, l }) => (
              <button key={v} onClick={() => setMaxSize(v)} style={{
                flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer',
                border: `1.5px solid ${maxSize === v ? C.sage : C.creamDark}`,
                background: maxSize === v ? C.sagePale : C.white,
                color: maxSize === v ? C.sageDark : C.muted,
                fontSize: 11, fontWeight: 600,
              }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {converting && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Convertendo...</div>}
      </div>

      {/* Status */}
      {pixelGrid.length > 0 && (
        <div style={{ ...S.card, padding: 16, textAlign: 'center', background: C.sagePale } as React.CSSProperties}>
          <div style={{ fontSize: 13, color: C.sageDark, fontWeight: 600 }}>
            Grade {pixelGrid[0]?.length}x{pixelGrid.length} configurada
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            Vá na aba Guiar para acompanhar linha a linha
          </div>
        </div>
      )}
    </div>
  )
}
