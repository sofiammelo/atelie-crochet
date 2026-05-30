export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    not_started: 'Não Iniciado',
    in_progress: 'Em Andamento',
    completed: 'Concluído',
  }
  return map[status] || status
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-700 border-gray-300',
    in_progress: 'bg-green-50 text-green-700 border-green-300',
    completed: 'bg-blue-50 text-blue-700 border-blue-300',
  }
  return map[status] || 'bg-gray-100 text-gray-700'
}

export function typeLabel(type: string): string {
  const map: Record<string, string> = {
    amigurumi: 'Amigurumi',
    tapestry: 'Jacquard / Tapestry',
  }
  return map[type] || type
}

export function typeColor(type: string): string {
  const map: Record<string, string> = {
    amigurumi: 'bg-pink-50 text-pink-700 border-pink-300',
    tapestry: 'bg-purple-50 text-purple-700 border-purple-300',
  }
  return map[type] || 'bg-gray-100 text-gray-700'
}
