'use client'

import { useState, useRef } from 'react'
import { C, S } from '@/lib/tokens'

export default function AdminIconePage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setDone(false)
    setError('')
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  async function handleSave() {
    if (!file) return
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/icon', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Falha ao salvar')
      setDone(true)
    } catch (e: any) {
      setError(e.message || 'Erro')
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen" style={{ background: C.cream }}>
      <div style={{
        background: `linear-gradient(135deg, ${C.sageDark} 0%, ${C.ink} 100%)`,
        padding: '52px 24px 28px',
      }}>
        <a href="/" style={{
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 10, padding: '7px 14px', color: 'rgba(255,255,255,0.7)',
          fontSize: 13, display: 'inline-block', textDecoration: 'none',
        }}>&larr; Voltar</a>
        <h1 style={{ margin: 0, color: C.white, fontSize: 28, fontWeight: 600, marginTop: 16 }}>
          Icone do site
        </h1>
      </div>

      <div style={{ padding: 24, maxWidth: 400, margin: '0 auto' }}>
        <div style={{ ...S.card, padding: 24 } as React.CSSProperties}>
          <label style={S.label}>Enviar imagem (png, jpg, svg)</label>
          <input
            ref={ref}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={handleFile}
            style={{ display: 'block', marginBottom: 16, fontSize: 13, color: C.muted }}
          />

          {preview && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 96, height: 96, borderRadius: 20, overflow: 'hidden',
                margin: '0 auto 8px', border: `2px solid ${C.creamDark}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: C.cream,
              }}>
                <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>Visualizacao do icone</div>
            </div>
          )}

          {error && (
            <div style={{ color: C.error, fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}

          {done && (
            <div style={{ color: C.sage, fontSize: 13, marginBottom: 12 }}>
              Icone salvo com sucesso!
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!file || saving}
            style={{
              ...S.btnPrimary, width: '100%', padding: '13px', fontSize: 14,
              opacity: !file || saving ? 0.5 : 1,
            }}
          >
            {saving ? 'Salvando...' : 'Salvar icone'}
          </button>
        </div>
      </div>
    </div>
  )
}
