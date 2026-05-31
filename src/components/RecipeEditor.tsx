'use client'

import { useState } from 'react'
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
}

export function emptyRecipe(): Recipe {
  return { title: '', materials: '', sections: [] }
}

export function parseRecipe(json: string): Recipe {
  try { return JSON.parse(json) } catch { return emptyRecipe() }
}

function moveRow(sections: RecipeSection[], secId: string, rowId: string, dir: -1 | 1): RecipeSection[] {
  return sections.map(sec => {
    if (sec.id !== secId) return sec
    const idx = sec.rows.findIndex(r => r.id === rowId)
    if (idx === -1) return sec
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= sec.rows.length) return sec
    const rows = [...sec.rows]
    ;[rows[idx], rows[newIdx]] = [rows[newIdx], rows[idx]]
    return { ...sec, rows: rows.map((r, i) => ({ ...r, line: i + 1 })) }
  })
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

  const removeRow = (secId: string, rowId: string) => {
    setSections(s => s.map(sec =>
      sec.id !== secId ? sec : {
        ...sec,
        rows: sec.rows.filter(r => r.id !== rowId).map((r, i) => ({ ...r, line: i + 1 })),
      }
    ))
  }

  const updateRow = (secId: string, rowId: string, field: string, value: string) => {
    setSections(s => s.map(sec =>
      sec.id !== secId ? sec : {
        ...sec,
        rows: sec.rows.map(r => r.id === rowId ? { ...r, [field]: value } : r),
      }
    ))
  }

  const toggleRowType = (secId: string, rowId: string) => {
    setSections(s => s.map(sec =>
      sec.id !== secId ? sec : {
        ...sec,
        rows: sec.rows.map(r => r.id === rowId ? { ...r, type: r.type === 'note' ? 'instruction' : 'note' } : r),
      }
    ))
  }

  const removeSection = (secId: string) => {
    setSections(s => s.filter(sec => sec.id !== secId))
  }

  const iconSize = 26

  const btnMove = (secId: string, rowId: string, dir: -1 | 1) => (
    <button
      onPointerDown={e => e.preventDefault()}
      onClick={() => setSections(s => moveRow(s, secId, rowId, dir))}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.mutedLight, fontSize: 12, padding: 0, width: iconSize, height: iconSize, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      {dir === -1 ? '\u25B2' : '\u25BC'}
    </button>
  )

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
        <div key={sec.id} style={{ ...S.card, padding: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
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

          {sec.rows.map((row, ri) => (
            <div key={row.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
              {btnMove(sec.id, row.id, -1)}
              {btnMove(sec.id, row.id, 1)}
              <div
                onClick={() => toggleRowType(sec.id, row.id)}
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
                onChange={e => updateRow(sec.id, row.id, 'instruction', e.target.value)}
              />
              <button
                onClick={() => removeRow(sec.id, row.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.mutedLight, fontSize: 16, padding: 0, width: iconSize, height: iconSize, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                x
              </button>
            </div>
          ))}

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
