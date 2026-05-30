'use client'

import { useState, useEffect, useRef } from 'react'
import { formatTime } from '@/lib/utils'

type TimerProps = {
  projectId: string
  initialSeconds: number
}

export function Timer({ projectId, initialSeconds }: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function toggle() {
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      setRunning(false)
      saveTimer(seconds)
    } else {
      setRunning(true)
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1)
      }, 1000)
    }
  }

  async function saveTimer(secs: number) {
    try {
      await fetch(`/api/projects/${projectId}/timer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds: secs }),
      })
    } catch (e) {
      console.error(e)
    }
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setRunning(false)
    setSeconds(0)
    saveTimer(0)
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-mono text-lg font-bold text-[#1a1a2e]">
            {formatTime(seconds)}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggle}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              running
                ? 'bg-red-50 text-red-600 border border-red-300 hover:bg-red-100'
                : 'bg-green-50 text-green-600 border border-green-300 hover:bg-green-100'
            }`}
          >
            {running ? 'Pausar' : 'Iniciar'}
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-50 text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
