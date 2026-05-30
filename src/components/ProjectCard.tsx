'use client'

import { C } from '@/lib/tokens'

const STATUS_DOT: Record<string, string> = {
  in_progress: '#d97706',
  completed: '#4A90D9',
  not_started: '#8DA4C0',
}

const TYPE_LABEL: Record<string, string> = {
  amigurumi: 'Amigurumi',
  tapestry: 'Tapestry',
}

const TYPE_EMOJI: Record<string, string> = {
  amigurumi: '\u{1F9F6}',
  tapestry: '\u{1F9F5}',
}

function fmtTime(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : '\u2014'
}

type Project = {
  id: string
  name: string
  type: string
  status: string
  coverImage: string | null
  description: string
  timerSeconds: number
  createdAt: string
  pdfPath: string | null
}

export function ProjectCard({
  project,
  onClick,
}: {
  project: Project
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fdfcfb', borderRadius: 16,
        border: '1px solid #ede8e0', overflow: 'hidden',
        cursor: 'pointer', transition: 'transform 0.18s, box-shadow 0.18s',
        boxShadow: '0 1px 8px rgba(42,37,32,0.06)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(42,37,32,0.12)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 8px rgba(42,37,32,0.06)'
      }}
    >
      <div style={{
        height: 90,
        background: project.coverImage
          ? `url(${project.coverImage}) center/cover`
          : `linear-gradient(135deg, ${C.sagePale}, ${C.creamDark})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!project.coverImage && (
          <span style={{ fontSize: 32, opacity: 0.6 }}>
            {TYPE_EMOJI[project.type] || '\u{1F9F6}'}
          </span>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{
            fontSize: 15, fontWeight: 600,
            color: C.ink, lineHeight: 1.3, flex: 1, marginRight: 8,
          }}>
            {project.name}
          </div>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: STATUS_DOT[project.status] || C.stone,
            flexShrink: 0, marginTop: 4,
          }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: 11, background: C.sagePale, color: C.sageDark,
            padding: '2px 8px', borderRadius: 20, fontWeight: 600,
          }}>
            {TYPE_LABEL[project.type] || project.type}
          </span>
          <span style={{ fontSize: 11, color: C.mutedLight }}>
            {fmtTime(project.timerSeconds || 0)}
          </span>
        </div>
      </div>
    </div>
  )
}
