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

  // pixel size based on 12 cols per ~264px, scales dynamically
  const maxGridPx = Math.min(typeof window !== 'undefined' ? window.innerWidth - 90 : 300, 420)
  const ps = Math.max(Math.floor(maxGridPx / cols), 6)
  const rowLabelW = 28

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Full grid */}
      <div style={{ ...S.card, overflow: 'hidden' }}>
        {/* Col numbers */}
        <div style={{
          display: 'flex', padding: '8px 14px 4px', borderBottom: `1px solid ${C.creamDark}`,
          overflowX: 'auto', gap: 1,
        }}>
          <div style={{ width: rowLabelW, flexShrink: 0 }} />
          {grid[0].map((_, c) => (
            <div key={c} style={{
              width: ps, flexShrink: 0, textAlign: 'center',
              fontSize: Math.min(ps * 0.55, 10), color: C.mutedLight,
            }}>
              {c + 1}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ maxHeight: 440, overflowY: 'auto', overflowX: 'auto' }}>
          {grid.map((row, r) => {
            const done = r < currentRow
            const active = r === currentRow
            return (
              <div key={r} style={{
                display: 'flex', gap: 1, alignItems: 'center',
                padding: active ? '8px 14px' : '4px 14px',
                background: active ? `${C.sagePale}` : done ? `${C.cream}` : 'transparent',
                borderBottom: `1px solid ${C.cream}`,
                position: 'relative',
              }}>
                {/* Row label */}
                <div style={{
                  width: rowLabelW, flexShrink: 0, textAlign: 'center',
                  fontSize: 11, fontWeight: 700,
                  color: done ? C.success : active ? C.sageDark : C.mutedLight,
                }}>
                  {done ? '\u2713' : active ? '\u25B6' : r + 1}
                </div>

                {/* Pixel strip */}
                <div style={{ display: 'flex', gap: 1 }}>
                  {row.map((col, c) => (
                    <div key={c} style={{
                      width: ps, height: ps,
                      background: active ? col : done ? adjustColor(col, -20) : adjustColor(col, 15),
                      borderRadius: active ? 1.5 : 1,
                      border: active ? '0.5px solid rgba(0,0,0,0.08)' : '0.5px solid rgba(0,0,0,0.03)',
                      flexShrink: 0,
                    }} />
                  ))}
                </div>

                {/* AGORA badge */}
                {active && (
                  <div style={{
                    position: 'absolute', right: 10,
                    background: C.sage,
                    color: C.white, fontSize: 9, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 6,
                    letterSpacing: 0.5,
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
          Linha {currentRow + 1} concluida
        </button>
      ) : (
        <div style={{
          textAlign: 'center', padding: 28,
          background: `${C.success}15`, borderRadius: 16,
          border: `1px solid ${C.success}40`,
        }}>
          <div style={{ fontSize: 22, color: C.success, fontWeight: 600 }}>
            Projeto concluido!
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
