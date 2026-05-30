'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

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
  currentRow: number
  timerSeconds: number
}

export default function EditProjectPage() {
  const params = useParams()
  const router = useRouter()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('not_started')
  const [patternText, setPatternText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [projectType, setProjectType] = useState('amigurumi')

  useEffect(() => {
    if (params.id) fetchProject()
  }, [params.id])

  async function fetchProject() {
    try {
      const res = await fetch(`/api/projects/${params.id}`)
      const data = await res.json()
      const p = data.project
      setName(p.name)
      setDescription(p.description)
      setStatus(p.status)
      setPatternText(p.patternText)
      setProjectType(p.type)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/projects/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, status, patternText }),
      })
      router.push(`/projetos/${params.id}`)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 pt-8 text-center text-[#6B82A0] py-20">Carregando...</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">
      <Link href={`/projetos/${params.id}`} className="text-sm text-[#6B82A0] hover:text-[#4A90D9] mb-4 inline-block">
        ← Voltar
      </Link>
      <h1 className="text-2xl font-bold text-[#1A2A4A] mb-6">Editar Projeto</h1>

      <div className="bg-white rounded-2xl border border-[#ede8e0] p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1A2A4A] mb-1">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[#ede8e0] bg-[#fdfcfb] text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C8EE]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1A2A4A] mb-1">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl border border-[#ede8e0] bg-[#fdfcfb] text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C8EE] resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Status</label>
          <div className="flex gap-2">
            {[
              { value: 'not_started', label: 'Não Iniciado' },
              { value: 'in_progress', label: 'Em Andamento' },
              { value: 'completed', label: 'Concluído' },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  status === s.value
                    ? 'bg-[#E8F0FE] text-[#4A90D9] border-[#4A90D9]'
                    : 'bg-white text-[#6B82A0] border-[#ede8e0] hover:border-[#A8C8EE]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {projectType === 'amigurumi' && (
          <div>
            <label className="block text-sm font-medium text-[#1A2A4A] mb-1">Receita (uma linha por etapa)</label>
            <textarea
              value={patternText}
              onChange={(e) => setPatternText(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 rounded-xl border border-[#ede8e0] bg-[#fdfcfb] text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C8EE] font-mono"
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 bg-[#4A90D9] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#3A7BC8] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <Link
            href={`/projetos/${params.id}`}
            className="px-6 py-2.5 rounded-xl text-sm font-medium border border-[#ede8e0] hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </div>
    </div>
  )
}
