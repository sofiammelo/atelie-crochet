'use client'

import { useState, useRef } from 'react'
import { C, S, fonts } from '@/lib/tokens'

export type RecipeRow = {
  id: string
  line: number
  instruction: string
  stitches?: string
  type?: 'instruction' | 'note'
}

export type RecipeSection = {
  id: string
  name: string
  rows: RecipeRow[]
}

export type Recipe = {
  title: string
  materials: string
  sections: RecipeSection[]
  notes?: string[]
  _counter?: number
  _progress?: Record<string, number>
}

export function emptyRecipe(): Recipe {
  return { title: '', materials: '', sections: [] }
}

export function parseRecipe(json: string): Recipe {
  try { return JSON.parse(json) } catch { return emptyRecipe() }
}

export function RecipeEditor({
  recipe,
  onSave,
  onCancel,
}: {
  recipe: Recipe
  onSave: (r: Recipe) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(recipe.title || '')
  const [materials, setMaterials] = useState(recipe.materials || '')
  const [sections, setSections] = useState<RecipeSection[]>(
    recipe.sections?.length > 0 ? recipe.sections : []
  )
  const [newRowText, setNewRowText] = useState<Record<string, string>>({})

  const addSection = () => {
    setSections(s => [...s, {
      id: Date.now().toString(),
      name: 'Nova seção',
      rows: [],
    }])
  }

  const addRow = (secId: string) => {
    const txt = (newRowText[secId] || '').trim()
    if (!txt) return
    setSections(s => s.map(sec =>
      sec.id !== secId ? sec : {
        ...sec,
        rows: [...sec.rows, {
          id: Date.now().toString(),
          line: sec.rows.length + 1,
          instruction: txt,
        }],
      }
    ))
    setNewRowText(r => ({ ...r, [secId]: '' }))
  }

  const removeSection = (secId: string) => {
    setSections(s => s.filter(sec => sec.id !== secId))
  }

  const iconSize = 26
  const dragged = useRef<{ secId: string; rowId: string } | null>(null)
  const hoveredEl = useRef<HTMLDivElement | null>(null)
  function clearRowHover() {
    if (hoveredEl.current) {
      hoveredEl.current.style.borderTop = ''
      hoveredEl.current.style.borderBottom = ''
      hoveredEl.current = null
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={S.label}>Titulo da receita</label>
        <input
          style={S.input}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ex: Urso Amigurumi"
        />
      </div>

      <div>
        <label style={S.label}>Materiais</label>
        <textarea
          style={{ ...S.input, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }}
          value={materials}
          onChange={e => setMaterials(e.target.value)}
          placeholder="Fio cru 100g, fio marrom 50g, agulha 3mm, olhos de segurança 12mm, enchimento..."
        />
      </div>

      {sections.map(sec => (
        <div key={sec.id}
          draggable
          onDragStart={e => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ action: 'section', secId: sec.id }))
            e.dataTransfer.effectAllowed = 'move'
            const el = e.currentTarget
            setTimeout(() => { el.style.opacity = '0.3' }, 0)
          }}
          onDragOver={e => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          }}
          onDrop={e => {
            e.preventDefault()
            e.currentTarget.style.removeProperty('opacity')
            clearRowHover()
            const d = dragged.current
            if (!d) {
              try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'))
                if (data?.action === 'section' && data.secId !== sec.id) {
                  setSections(s => {
                    const arr = [...s]
                    const from = arr.findIndex(x => x.id === data.secId)
                    if (from === -1) return s
                    const [removed] = arr.splice(from, 1)
                    const to = arr.findIndex(x => x.id === sec.id)
                    arr.splice(to < from ? to : to + 1, 0, removed)
                    return arr
                  })
                }
              } catch {}
              return
            }
            if (d.secId !== sec.id) return
            setSections(s => s.map(ssec => {
              if (ssec.id !== sec.id) return ssec
              const rows = [...ssec.rows]
              const from = rows.findIndex(r => r.id === d.rowId)
              if (from === -1) return ssec
              const [removed] = rows.splice(from, 1)
              rows.push(removed)
              return { ...ssec, rows: rows.map((r, i) => ({ ...r, line: i + 1 })) }
            }))
          }}
          onDragEnd={e => { e.currentTarget.style.removeProperty('opacity'); dragged.current = null }}
          style={{ ...S.card, padding: 16 }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <div style={{ cursor: 'grab', color: C.mutedLight, fontSize: 16, userSelect: 'none', flexShrink: 0 }}>&#x2630;</div>
            <input
              style={{ ...S.input, flex: 1 }}
              value={sec.name}
              onChange={e => setSections(s => s.map(x => x.id === sec.id ? { ...x, name: e.target.value } : x))}
              placeholder="Nome da secao (ex: Cabeca)"
            />
            <button
              onClick={() => removeSection(sec.id)}
              style={{ padding: '0 14px', borderRadius: 8, border: `1px solid ${C.error}40`, background: 'transparent', color: C.error, cursor: 'pointer', fontSize: 18 }}
            >
              x
            </button>
          </div>

          {sec.rows
            .map((row, ri) => (
              <div key={row.id}
                draggable
                onDragStart={e => {
                  dragged.current = { secId: sec.id, rowId: row.id }
                  e.dataTransfer.setData('text/plain', Date.now().toString())
                  e.dataTransfer.effectAllowed = 'move'
                  e.currentTarget.style.opacity = '0.3'
                }}
                onDragOver={e => {
                  e.preventDefault()
                  clearRowHover()
                  const rect = e.currentTarget.getBoundingClientRect()
                  const y = e.clientY - rect.top
                  const where = y < rect.height / 2 ? 'before' : 'after'
                  e.currentTarget.style.borderTop = where === 'before' ? `2px solid ${C.sage}` : '2px solid transparent'
                  e.currentTarget.style.borderBottom = where === 'after' ? `2px solid ${C.sage}` : 'none'
                  hoveredEl.current = e.currentTarget
                }}
                onDragLeave={e => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return
                  clearRowHover()
                }}
                onDrop={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  clearRowHover()
                  const d = dragged.current
                  if (!d || d.secId !== sec.id || d.rowId === row.id) return
                  setSections(s => s.map(ssec => {
                    if (ssec.id !== sec.id) return ssec
                    const rows = [...ssec.rows]
                    const from = rows.findIndex(r => r.id === d.rowId)
                    if (from === -1) return ssec
                    const [removed] = rows.splice(from, 1)
                    const to = rows.findIndex(r => r.id === row.id)
                    rows.splice(to < from ? to : to + 1, 0, removed)
                    return { ...ssec, rows: rows.map((r, i) => ({ ...r, line: i + 1 })) }
                  }))
                }}
                onDragEnd={e => {
                  e.currentTarget.style.removeProperty('opacity')
                  clearRowHover()
                  dragged.current = null
                }}
                style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}
              >
                <div style={{
                  cursor: 'grab', color: C.mutedLight, fontSize: 14, lineHeight: 1,
                  padding: '0 2px', userSelect: 'none', flexShrink: 0, width: 16, textAlign: 'center',
                }}>
                  &#x2630;
                </div>
                <div
                  onClick={() => {
                    setSections(s => s.map(ssec =>
                      ssec.id !== sec.id ? ssec : {
                        ...ssec,
                        rows: ssec.rows.map(r => r.id === row.id ? { ...r, type: r.type === 'note' ? 'instruction' : 'note' } : r),
                      }
                    ))
                  }}
                  style={{
                    width: iconSize, height: iconSize, borderRadius: 6, flexShrink: 0,
                    background: row.type === 'note' ? C.info : C.sagePale,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: C.white, cursor: 'pointer', userSelect: 'none',
                  }}
                  title={row.type === 'note' ? 'Clique para virar instrução' : 'Clique para virar nota'}
                >
                  {row.type === 'note' ? '!' : ri + 1}
                </div>
                <input
                  style={{
                    flex: 1, fontSize: 13, border: 'none', outline: 'none',
                    background: row.type === 'note' ? `${C.info}08` : C.cream,
                    borderRadius: 8, padding: '6px 10px',
                    lineHeight: 1.5, fontStyle: row.type === 'note' ? 'italic' : 'normal',
                    color: row.type === 'note' ? C.info : C.inkLight,
                  }}
                  value={row.instruction}
                  onChange={e => {
                    const val = e.target.value
                    setSections(s => s.map(ssec =>
                      ssec.id !== sec.id ? ssec : {
                        ...ssec,
                        rows: ssec.rows.map(r => r.id === row.id ? { ...r, instruction: val } : r),
                      }
                    ))
                  }}
                />
                <button
                  onClick={() => {
                    setSections(s => s.map(ssec =>
                      ssec.id !== sec.id ? ssec : {
                        ...ssec,
                        rows: ssec.rows.filter(r => r.id !== row.id).map((r, i) => ({ ...r, line: i + 1 })),
                      }
                    ))
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.mutedLight, fontSize: 16, padding: 0, width: iconSize, height: iconSize, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  x
                </button>
              </div>
            )
            )}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              style={{ ...S.input, flex: 1, fontSize: 13 }}
              placeholder="Nova instrucao de linha..."
              value={newRowText[sec.id] || ''}
              onChange={e => setNewRowText(r => ({ ...r, [sec.id]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') addRow(sec.id) }}
            />
            <button
              onClick={() => addRow(sec.id)}
              style={{ ...S.btnPrimary, padding: '0 18px', fontSize: 18 }}
            >
              +
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addSection}
        style={{
          padding: '12px', borderRadius: 12, border: `1.5px dashed ${C.sage}`,
          background: 'transparent', color: C.sage, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        + Adicionar secao
      </button>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{ ...S.btnGhost, flex: 1 }}>Cancelar</button>
        <button
          onClick={() => onSave({ title, materials, sections })}
          style={{ ...S.btnPrimary, flex: 2 }}
        >
          Salvar receita
        </button>
      </div>
    </div>
  )
}
