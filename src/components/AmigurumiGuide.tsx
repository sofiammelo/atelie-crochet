'use client'

import { useState, useRef, useEffect } from 'react'
import { C, S, fonts } from '@/lib/tokens'
import type { Recipe } from '@/components/RecipeEditor'

export function AmigurumiGuide({
  recipe,
  currentLine,
  onUpdateLine,
  onCompleteSection,
}: {
  recipe: Recipe
  currentLine: number
  onUpdateLine: (line: number) => void
  onCompleteSection?: () => void
}) {
  const sections = recipe.sections || []
  const [sectionIdx, setSectionIdx] = useState(0)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  const sec = sections[sectionIdx]
  const rows = sec?.rows || []
  const lineInSection = Math.min(currentLine, rows.length - 1)

  useEffect(() => {
    rowRefs.current[lineInSection]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [lineInSection, sectionIdx])

  if (!sec) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>
        <div style={{ fontFamily: fonts.display, fontSize: 22, color: C.ink, marginBottom: 8 }}>
          Nenhuma receita ainda
        </div>
        <div style={{ fontSize: 14 }}>Adicione sua receita na aba Receita</div>
      </div>
    )
  }

  const allDone = currentLine >= rows.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Section tabs */}
      {sections.length > 1 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {sections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setSectionIdx(i); onUpdateLine(0) }}
              style={{
                padding: '8px 18px', borderRadius: 20, whiteSpace: 'nowrap',
                border: `1.5px solid ${i === sectionIdx ? C.sage : C.creamDark}`,
                background: i === sectionIdx ? C.sage : 'transparent',
                color: i === sectionIdx ? C.white : C.muted,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Progress */}
      <div style={{ ...S.card, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: C.muted }}>Progresso &mdash; {sec.name}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.sage }}>
            {Math.min(currentLine, rows.length)}/{rows.length}
          </span>
        </div>
        <div style={{ height: 4, background: C.sagePale, borderRadius: 2 }}>
          <div style={{
            height: 4, background: C.sage, borderRadius: 2,
            width: `${Math.min((currentLine / rows.length) * 100, 100)}%`,
            transition: 'width 0.5s',
          }} />
        </div>
      </div>

      {/* Rows */}
      {rows.map((row, i) => {
        const done = i < currentLine
        const active = i === currentLine
        return (
          <div
            key={row.id}
            ref={el => { rowRefs.current[i] = el }}
            onClick={() => onUpdateLine(i)}
            style={{
              ...S.card,
              padding: '14px 16px',
              background: active ? C.sagePale : done ? `${C.success}0a` : C.white,
              border: active ? `1.5px solid ${C.sage}` : done ? `1px solid ${C.success}30` : `1px solid ${C.creamDark}`,
              opacity: done ? 0.65 : 1,
              cursor: 'pointer',
              transition: 'all 0.25s',
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: active ? C.sage : done ? C.success : C.creamDark,
                color: active || done ? C.white : C.muted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
              }}>
                {done ? '\u2713' : i + 1}
              </div>
              <div style={{ flex: 1, paddingTop: 3 }}>
                <div style={{
                  fontSize: 14, color: active ? C.ink : done ? C.muted : C.inkLight,
                  lineHeight: 1.6, fontWeight: active ? 500 : 400,
                }}>
                  {row.instruction}
                </div>
                {row.stitches && (
                  <div style={{ fontSize: 11, color: C.mutedLight, marginTop: 4 }}>
                    {row.stitches} pontos
                  </div>
                )}
              </div>
              {active && !done && (
                <div style={{
                  fontSize: 10, fontWeight: 700, color: C.sage,
                  background: `${C.sage}18`, padding: '3px 8px',
                  borderRadius: 20, whiteSpace: 'nowrap',
                }}>
                  AGORA
                </div>
              )}
            </div>
          </div>
        )
      })}

      {!allDone ? (
        <button
          onClick={() => onUpdateLine(currentLine + 1)}
          style={{ ...S.btnPrimary, width: '100%', padding: '14px', fontSize: 15 }}
        >
          Linha {currentLine + 1} concluida
        </button>
      ) : (
        <div style={{
          textAlign: 'center', padding: 24,
          background: `${C.success}12`, borderRadius: 16,
          border: `1px solid ${C.success}30`,
        }}>
          <div style={{ fontFamily: fonts.display, fontSize: 20, color: C.success, fontWeight: 600, marginBottom: 4 }}>
            Secao concluida!
          </div>
          {sectionIdx < sections.length - 1 && (
            <button
              onClick={() => { setSectionIdx(sectionIdx + 1); onUpdateLine(0) }}
              style={{ ...S.btnPrimary, marginTop: 12, background: C.success }}
            >
              Proxima secao &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  )
}
