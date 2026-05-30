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
  const bps = Math.max(Math.floor(sps * 2.5), 12)
  const leftW = Math.min(28, 9 + String(rows).length * 7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...S.card, overflow: 'hidden' }}>
        {/* Header: row label + column numbers */}
        <div style={{
          display: 'flex', borderBottom: `1px solid ${C.creamDark}`,
          position: 'sticky', top: 0, background: C.white, zIndex: 3,
        }}>
          <div style={{ width: leftW, flexShrink: 0 }} />
          <div style={{ display: 'flex' }}>
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
        </div>

        {/* Rows */}
        <div style={{ maxHeight: 460, overflowY: 'auto', padding: 0 }}>
          {grid.map((row, r) => {
            const done = r < currentRow
            const active = r === currentRow
            const cellSize = active ? bps : sps
            return (
              <div key={r} style={{
                display: 'flex', alignItems: 'center',
                background: active ? C.sagePale : 'transparent',
                minHeight: cellSize,
              }}>
                {/* Row number column */}
                <div style={{
                  width: leftW, flexShrink: 0, textAlign: 'center',
                  fontSize: active ? 10 : 8, fontWeight: 700,
                  color: done ? C.success : active ? C.sageDark : C.mutedLight,
                  lineHeight: `${cellSize}px`,
                }}>
                  {done ? '\u2713' : active ? '\u25B6' : r + 1}
                </div>

                {/* Pixel cells */}
                <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                  {row.map((col, c) => (
                    <div key={c} style={{
                      width: cellSize, height: cellSize,
                      background: col,
                      opacity: done ? 0.55 : active ? 1 : 0.8,
                      outline: '0.5px solid rgba(0,0,0,0.07)',
                    }} />
                  ))}
                </div>

                {/* AGORA indicator (inline after pixels) */}
                {active && (
                  <div style={{
                    marginLeft: 4, fontSize: 8, fontWeight: 700,
                    color: C.sageDark, whiteSpace: 'nowrap',
                    lineHeight: `${cellSize}px`, flexShrink: 0,
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
