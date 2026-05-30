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

  const isBrowser = typeof window !== 'undefined'
  const smallMax = isBrowser ? Math.min(window.innerWidth - 80, 480) : 380
  const sps = Math.max(Math.floor(smallMax / cols), 4)
  const bps = Math.max(Math.floor(sps * 2.5), 14)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...S.card, overflow: 'hidden' }}>
        {/* Column numbers */}
        <div style={{
          display: 'flex', borderBottom: `1px solid ${C.creamDark}`,
          alignItems: 'flex-end', paddingLeft: 30,
        }}>
          {grid[0].map((_, c) => (
            <div key={c} style={{
              width: sps, flexShrink: 0, textAlign: 'center',
              fontSize: Math.min(sps * 0.45, 9), color: C.mutedLight,
              lineHeight: '16px',
            }}>
              {c + 1}
            </div>
          ))}
        </div>

        {/* Rows as unified pixel block */}
        <div style={{ position: 'relative', maxHeight: 460, overflowY: 'auto', padding: 0 }}>
          {grid.map((row, r) => {
            const done = r < currentRow
            const active = r === currentRow
            const cellSize = active ? bps : sps
            const cellGap = active ? 1 : 0
            return (
              <div key={r} style={{
                display: 'flex',
                background: active ? C.sagePale : done ? 'transparent' : 'transparent',
                position: 'relative',
                alignItems: 'stretch',
                marginBottom: active ? 1 : 0,
              }}>
                {/* Row label — overlay on the left */}
                <div style={{
                  position: 'absolute', left: 2, top: 0, bottom: 0,
                  display: 'flex', alignItems: 'center', zIndex: 2,
                  width: 26, flexShrink: 0,
                }}>
                  <div style={{
                    fontSize: active ? 12 : 9, fontWeight: 700,
                    color: done ? C.success : active ? C.sageDark : C.mutedLight,
                    textAlign: 'center', width: '100%',
                    textShadow: '0 0 3px rgba(253,252,251,0.9)',
                  }}>
                    {done ? '\u2713' : active ? '\u25B6' : r + 1}
                  </div>
                </div>

                {/* Pixel row */}
                <div style={{
                  display: 'flex', gap: cellGap,
                  marginLeft: 30,
                }}>
                  {row.map((col, c) => (
                    <div key={c} style={{
                      width: cellSize, height: cellSize,
                      background: col,
                      opacity: done ? 0.55 : active ? 1 : 0.8,
                      flexShrink: 0,
                      outline: '0.5px solid rgba(0,0,0,0.07)',
                    }} />
                  ))}
                </div>

                {/* AGORA badge */}
                {active && (
                  <div style={{
                    position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                    background: C.sage, color: C.white,
                    fontSize: 9, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 5, letterSpacing: 0.5, whiteSpace: 'nowrap',
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
