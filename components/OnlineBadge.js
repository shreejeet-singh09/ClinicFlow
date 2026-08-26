'use client'
import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

export function useOnline() {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    setOnline(navigator.onLine)
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}

export default function OnlineBadge({ pending = 0 }) {
  const online = useOnline()
  if (online && !pending) return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><Wifi size={11} /> Online</span>
  if (!online) return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"><WifiOff size={11} /> Offline · {pending} queued</span>
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700"><Wifi size={11} /> Syncing · {pending}</span>
}
