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

  // small pixel size for non-current rows
  const smallMax = isBrowser ? Math.min(window.innerWidth - 80, 460) : 380
  const sps = Math.max(Math.floor(smallMax / cols), 5)
  const bps = Math.max(Math.floor(sps * 2.2), 14)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Single grid — all rows together, current row bigger */}
      <div style={{ ...S.card, overflow: 'hidden' }}>
        {/* Column numbers */}
        <div style={{
          display: 'flex', padding: '8px 12px 4px',
          borderBottom: `1px solid ${C.creamDark}`,
          gap: 1, alignItems: 'flex-end',
        }}>
          <div style={{ width: 26, flexShrink: 0 }} />
          {grid[0].map((_, c) => (
            <div key={c} style={{
              width: sps, flexShrink: 0, textAlign: 'center',
              fontSize: Math.min(sps * 0.45, 9), color: C.mutedLight,
            }}>
              {c + 1}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {grid.map((row, r) => {
            const done = r < currentRow
            const active = r === currentRow
            const ps = active ? bps : sps
            return (
              <div key={r} style={{
                display: 'flex', gap: 1, alignItems: 'center',
                padding: active ? '10px 12px' : '2px 12px',
                background: active ? C.sagePale : done ? C.cream : 'transparent',
                borderBottom: `1px solid ${active ? C.sageLight : C.cream}`,
                position: 'relative',
                transition: 'padding 0.2s, background 0.2s',
              }}>
                <div style={{
                  width: 26, flexShrink: 0, textAlign: 'center',
                  fontSize: active ? 13 : 10, fontWeight: 700,
                  color: done ? C.success : active ? C.sageDark : C.mutedLight,
                }}>
                  {done ? '\u2713' : active ? '\u25B6' : r + 1}
                </div>

                <div style={{ display: 'flex', gap: active ? 1.5 : 0.5 }}>
                  {row.map((col, c) => (
                    <div key={c} style={{
                      width: ps, height: ps,
                      background: col,
                      borderRadius: active ? 2 : 1,
                      border: active
                        ? '1px solid rgba(0,0,0,0.12)'
                        : done ? '0.5px solid rgba(0,0,0,0.04)' : '0.5px solid rgba(0,0,0,0.02)',
                      flexShrink: 0,
                      opacity: done ? 0.6 : active ? 1 : 0.85,
                    }} />
                  ))}
                </div>

                {active && (
                  <div style={{
                    marginLeft: 6, background: C.sage, color: C.white,
                    fontSize: 9, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 5, letterSpacing: 0.5, whiteSpace: 'nowrap',
                    flexShrink: 0,
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
