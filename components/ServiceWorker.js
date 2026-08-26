'use client'
import { useEffect } from 'react'

// ClinicFlow app version. Bump this whenever we ship a breaking client change
// so any previously-installed Service Worker + Cache Storage is cleared.
const APP_VERSION = 'clinicflow-2026-08-25e'

export default function ServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    ;(async () => {
      try {
        // 1) Always self-heal against any older cache. This runs before we register the new SW.
        const stored = localStorage.getItem('clinicflow_sw_version')
        if (stored !== APP_VERSION) {
          if ('caches' in window) {
            const keys = await caches.keys()
            await Promise.all(keys.map(k => caches.delete(k)))
          }
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations()
            await Promise.all(regs.map(r => r.unregister()))
          }
          localStorage.setItem('clinicflow_sw_version', APP_VERSION)
          // If we actually cleared something, force one reload so the user sees the fresh HTML.
          if (stored) { window.location.reload(); return }
        }
        // 2) Fresh registration on non-localhost hosts (preview + prod).
        if (!('serviceWorker' in navigator)) return
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      } catch {}
    })()
  }, [])
  return null
}
