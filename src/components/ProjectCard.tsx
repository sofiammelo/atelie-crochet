import Link from 'next/link'
import { statusLabel, statusColor, typeLabel, typeColor, formatTime } from '@/lib/utils'

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

const TYPE_ICON: Record<string, string> = {
  amigurumi: '\u{1F9F6}',
  tapestry: '\u{1F9F5}',
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projetos/${project.id}`}>
      <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden hover:shadow-md transition-all group">
        {project.coverImage ? (
          <div className="h-28 overflow-hidden">
            <img
              src={project.coverImage}
              alt={project.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="h-16 bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 flex items-center justify-center">
            <span className="text-xl">{TYPE_ICON[project.type] || '\u{1F9F6}'}</span>
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-[#1a1a2e] truncate">{project.name}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${typeColor(project.type)}`}>
              {typeLabel(project.type)}
            </span>
          </div>
          {project.timerSeconds > 0 && (
            <p className="text-xs text-[#64748b] mt-2">
              {Math.floor(project.timerSeconds / 60)} min
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
