'use client'

import { C, S } from '@/lib/tokens'

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

  // full-grid pixel size
  const maxGridPx = typeof window !== 'undefined'
    ? Math.min(window.innerWidth - 100, 420) : 320
  const ps = Math.max(Math.floor(maxGridPx / cols), 5)
  const rowLabelW = 24

  // big current-row pixel size
  const bigMax = typeof window !== 'undefined'
    ? Math.min(window.innerWidth - 64, 500) : 360
  const bigPs = Math.max(Math.floor(bigMax / cols), 12)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Current row — big */}
      <div style={{ ...S.card, padding: 18 }}>
        <div style={{
          fontSize: 11, color: C.muted, letterSpacing: 1,
          textTransform: 'uppercase', marginBottom: 6,
        }}>
          Linha atual
        </div>
        <div style={{
          fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 10,
        }}>
          {currentRow + 1} <span style={{ fontSize: 14, fontWeight: 400, color: C.muted }}>de {rows}</span>
        </div>
        <div style={{
          display: 'flex', gap: 2, flexWrap: 'nowrap', overflowX: 'auto',
          paddingBottom: 4,
        }}>
          {grid[currentRow]?.map((col, c) => (
            <div key={c} style={{
              width: bigPs, height: bigPs, background: col,
              borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)',
              flexShrink: 0,
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 2, marginTop: 3 }}>
          {grid[currentRow]?.map((_, c) => (
            <div key={c} style={{
              width: bigPs, textAlign: 'center', fontSize: 9,
              color: C.mutedLight, flexShrink: 0,
            }}>
              {c + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Full grid */}
      <div style={{ ...S.card, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', padding: '8px 12px 4px',
          borderBottom: `1px solid ${C.creamDark}`,
          overflowX: 'auto', gap: 1, alignItems: 'flex-end',
        }}>
          <div style={{ width: rowLabelW, flexShrink: 0 }} />
          {grid[0].map((_, c) => (
            <div key={c} style={{
              width: ps, flexShrink: 0, textAlign: 'center',
              fontSize: Math.min(ps * 0.5, 9), color: C.mutedLight,
              lineHeight: 1,
            }}>
              {c + 1}
            </div>
          ))}
        </div>

        <div style={{ maxHeight: 380, overflowY: 'auto', overflowX: 'auto' }}>
          {grid.map((row, r) => {
            const done = r < currentRow
            const active = r === currentRow
            return (
              <div key={r} style={{
                display: 'flex', gap: 1, alignItems: 'center',
                padding: active ? '6px 12px' : '3px 12px',
                background: active ? C.sagePale : done ? C.cream : 'transparent',
                borderBottom: `1px solid ${C.cream}`,
                position: 'relative',
              }}>
                <div style={{
                  width: rowLabelW, flexShrink: 0, textAlign: 'center',
                  fontSize: 10, fontWeight: 700,
                  color: done ? C.success : active ? C.sageDark : C.mutedLight,
                }}>
                  {done ? '\u2713' : active ? '\u25B6' : r + 1}
                </div>

                <div style={{ display: 'flex', gap: 1 }}>
                  {row.map((col, c) => (
                    <div key={c} style={{
                      width: ps, height: ps,
                      background: active ? col : done ? adjustColor(col, -25) : adjustColor(col, 20),
                      borderRadius: active ? 1.5 : 1,
                      border: active ? '0.5px solid rgba(0,0,0,0.1)' : '0.5px solid rgba(0,0,0,0.03)',
                      flexShrink: 0,
                    }} />
                  ))}
                </div>

                {active && (
                  <div style={{
                    position: 'absolute', right: 6,
                    background: C.sage, color: C.white,
                    fontSize: 8, fontWeight: 700,
                    padding: '2px 7px', borderRadius: 5,
                    letterSpacing: 0.5, whiteSpace: 'nowrap',
                  }}>
                    AGORA
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {currentRow < rows ? (
        <button onClick={onRowDone} style={{ ...S.btnPrimary, width: '100%', padding: '14px', fontSize: 15 }}>
          Linha {currentRow + 1} concluída
        </button>
      ) : (
        <div style={{
          textAlign: 'center', padding: 28,
          background: `${C.success}15`, borderRadius: 16,
          border: `1px solid ${C.success}40`,
        }}>
          <div style={{ fontSize: 22, color: C.success, fontWeight: 600 }}>
            Projeto concluído!
          </div>
        </div>
      )}
    </div>
  )
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount))
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount))
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}
