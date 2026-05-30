'use client'

import { C, S, fonts } from '@/lib/tokens'

export function TapestryGuide({
  grid,
  currentRow,
  onRowDone,
}: {
  grid: string[][]
  currentRow: number
  onRowDone: () => void
}) {
  if (!grid || !grid.length) return null
  const rows = grid.length
  const cols = grid[0].length
  const cs = Math.min(Math.floor(Math.min(typeof window !== 'undefined' ? window.innerWidth - 48 : 360, 360) / cols), 20)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Current row */}
      <div style={{ ...S.card, padding: 20 }}>
        <div style={{
          fontSize: 11, color: C.muted, letterSpacing: 1,
          textTransform: 'uppercase', marginBottom: 4,
        }}>
          Linha atual
        </div>
        <div style={{
          fontFamily: fonts.display, fontSize: 32, fontWeight: 600,
          color: C.ink, marginBottom: 14,
        }}>
          {currentRow + 1} <span style={{ fontSize: 16, fontWeight: 400, color: C.muted }}>de {rows}</span>
        </div>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
          {grid[currentRow]?.map((col, c) => (
            <div key={c} style={{
              width: cs + 4, height: cs + 4, background: col,
              borderRadius: 3, border: `1.5px solid ${C.creamDark}`, flexShrink: 0,
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 0, marginTop: 4 }}>
          {grid[currentRow]?.map((_, c) => (
            <div key={c} style={{ width: cs + 4, textAlign: 'center', fontSize: 9, color: C.mutedLight }}>
              {c + 1}
            </div>
          ))}
        </div>
      </div>

      {/* All rows overview */}
      <div style={{ ...S.card, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.creamDark}` }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: C.muted,
            letterSpacing: 1, textTransform: 'uppercase',
          }}>
            Visao geral
          </div>
        </div>
        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
          {grid.map((row, r) => (
            <div key={r} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px',
              background: r === currentRow ? `${C.sage}18` : r < currentRow ? `${C.success}0a` : 'transparent',
              borderBottom: `1px solid ${C.creamDark}`,
            }}>
              <div style={{
                width: 22, fontSize: 11, fontWeight: 700,
                color: r < currentRow ? C.success : r === currentRow ? C.sage : C.mutedLight,
                textAlign: 'center', flexShrink: 0,
              }}>
                {r < currentRow ? '\u2713' : r === currentRow ? '\u25B6' : r + 1}
              </div>
              <div style={{ display: 'flex', gap: 1, overflow: 'hidden', flexShrink: 0 }}>
                {row.map((col, c) => (
                  <div key={c} style={{
                    width: cs, height: cs, background: col, borderRadius: 1,
                    border: r === currentRow ? '0.5px solid rgba(0,0,0,0.15)' : 'none',
                  }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {currentRow < rows ? (
        <button onClick={onRowDone} style={{ ...S.btnPrimary, width: '100%', padding: '14px', fontSize: 15 }}>
          Linha {currentRow + 1} concluida
        </button>
      ) : (
        <div style={{
          textAlign: 'center', padding: 28,
          background: `${C.success}15`, borderRadius: 16,
          border: `1px solid ${C.success}40`,
        }}>
          <div style={{ fontFamily: fonts.display, fontSize: 22, color: C.success, fontWeight: 600 }}>
            Projeto concluido!
          </div>
        </div>
      )}
    </div>
  )
}
