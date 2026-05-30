'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { C, S, fonts } from '@/lib/tokens'

export default function NewProjectPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [type, setType] = useState('amigurumi')

  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [parsingPdf, setParsingPdf] = useState(false)
  const [pdfText, setPdfText] = useState('')

  const [submitting, setSubmitting] = useState(false)

  async function handlePdfSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfFile(file)
    setParsingPdf(true)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.text) setPdfText(data.text)
    } catch (e) { console.error(e) } finally { setParsingPdf(false) }
  }

  function buildRecipe() {
    const recipe: any = {
      title: name.trim(),
      materials: '',
      sections: [],
    }

    if (type === 'amigurumi') {
      if (pdfText) {
        const lines = pdfText.split('\n').filter(l => l.trim())
        recipe.sections.push({
          id: 'sec-1',
          name: 'Receita',
          rows: lines.map((line, i) => ({
            id: `row-${i}`,
            line: i + 1,
            instruction: line.trim(),
          })),
        })
      }
    }

    return JSON.stringify(recipe)
  }

  async function handleCreate() {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          status: 'not_started',
          patternText: pdfText || '',
          recipe: buildRecipe(),
        }),
      })
      const data = await res.json()
      if (data.project) router.push(`/projetos/${data.project.id}`)
    } catch (e) { console.error(e) } finally { setSubmitting(false) }
  }

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', minHeight: '100vh', background: C.cream }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${C.sageDark} 0%, ${C.ink} 100%)`,
        padding: '52px 20px 28px',
      }}>
        <a href="/" style={{
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 10, padding: '7px 14px', color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer', fontSize: 13, display: 'inline-block', textDecoration: 'none',
        }}>
          &larr; Voltar
        </a>
        <h1 style={{
          margin: 0, color: C.white, fontFamily: fonts.display,
          fontSize: 28, fontWeight: 600, marginTop: 16,
        }}>
          Novo projeto
        </h1>
      </div>

      <div style={{ padding: '24px 20px 100px' }}>
        {/* Name */}
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Nome do projeto</label>
          <input
            style={S.input}
            placeholder="Ex: Urso Amigurumi"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Type */}
        <div style={{ marginBottom: 24 }}>
          <label style={S.label}>Tipo</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['amigurumi', '\u{1F9F6}', 'Amigurumi', 'Bonecos e personagens'],
              ['tapestry', '\u{1F9F5}', 'Tapestry', 'Jacquard em pixels'],
            ].map(([t, em, lb, sub]) => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  padding: '16px 12px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                  border: `1.5px solid ${type === t ? C.sage : C.creamDark}`,
                  background: type === t ? C.sagePale : C.white,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: 26, marginBottom: 8 }}>{em}</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{lb}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* PDF Upload — Amigurumi */}
        {type === 'amigurumi' && (
          <div style={{ marginBottom: 24 }}>
            <label style={S.label}>Importar receita de PDF (opcional)</label>
            <label style={{
              ...S.card, padding: '16px 18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14,
              background: pdfFile ? C.sagePale : C.white,
            }}>
              <span style={{ fontSize: 24 }}>&#x1F4C4;</span>
              <div style={{ flex: 1 }}>
                {parsingPdf ? (
                  <div style={{ fontSize: 13, color: C.muted }}>Processando PDF...</div>
                ) : pdfFile ? (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.sageDark }}>{pdfFile.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {pdfText.split('\n').length} linhas extraidas
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>Upload de PDF</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      Extraimos o texto automaticamente
                    </div>
                  </>
                )}
              </div>
              <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handlePdfSelect} />
            </label>
            {pdfText && (
              <div style={{
                marginTop: 8, padding: 12, borderRadius: 10,
                background: C.cream, border: `1px solid ${C.creamDark}`,
                maxHeight: 120, overflowY: 'auto', fontSize: 12,
                color: C.muted, lineHeight: 1.6,
              }}>
                {pdfText.substring(0, 300)}{pdfText.length > 300 ? '...' : ''}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={!name.trim() || submitting}
          style={{
            ...S.btnPrimary, width: '100%', padding: '14px', fontSize: 15,
            opacity: name.trim() && !submitting ? 1 : 0.45,
          }}
        >
          {submitting ? 'Criando...' : 'Criar projeto'}
        </button>
      </div>
    </div>
  )
}
