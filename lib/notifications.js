'use client'
import { getSupabaseBrowser } from './supabase-browser'

export async function fetchNotifications(limit = 15) {
  const sb = getSupabaseBrowser(); if (!sb) return []
  const { data } = await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit)
  return data || []
}

export async function markNotificationRead(id) {
  const sb = getSupabaseBrowser(); if (!sb) return
  await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
}

export async function markAllRead() {
  const sb = getSupabaseBrowser(); if (!sb) return
  await sb.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
}

export function subscribeNotifications(userId, cb) {
  const sb = getSupabaseBrowser(); if (!sb) return () => {}
  const ch = sb.channel(`notifs-${userId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, cb).subscribe()
  return () => sb.removeChannel(ch)
}
