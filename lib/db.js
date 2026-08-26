'use client'
// ClinicFlow data helpers — thin wrapper around Supabase client.
import { getSupabaseBrowser } from './supabase-browser'

export const STATUS = {
  WAITING: 'waiting',
  CALLED: 'called',
  CONSULTING: 'consulting',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  SKIPPED: 'skipped',
}

export const STATUS_LABEL = {
  waiting: 'Waiting', called: 'Called', consulting: 'Consulting', completed: 'Completed',
  cancelled: 'Cancelled', no_show: 'No-show', skipped: 'Skipped',
}

export const STATUS_TONE = {
  waiting: 'waiting', called: 'called', consulting: 'active', completed: 'done',
  cancelled: 'neutral', no_show: 'neutral', skipped: 'neutral',
}

// Fetch today's visits (or a specific date) for a clinic — joined with patient basics.
export async function fetchVisits(clinicId, dateISO) {
  const sb = getSupabaseBrowser(); if (!sb) return []
  const date = dateISO || new Date().toISOString().slice(0, 10)
  const { data, error } = await sb
    .from('visits')
    .select('id, token_number, status, called_at, consultation_started_at, consultation_finished_at, consultation_duration, visit_date, patient:patients(id, name, age, phone, area)')
    .eq('clinic_id', clinicId)
    .eq('visit_date', date)
    .order('token_number', { ascending: true })
  if (error) throw error
  return data || []
}

export async function fetchClinicById(id) {
  const sb = getSupabaseBrowser(); if (!sb) return null
  const { data } = await sb.from('clinics').select('*').eq('id', id).single()
  return data
}

export async function fetchQueueStatus(clinicId) {
  const sb = getSupabaseBrowser(); if (!sb) return { is_paused: false }
  const { data } = await sb.from('queue_status').select('*').eq('clinic_id', clinicId).maybeSingle()
  return data || { is_paused: false }
}

export async function setQueuePaused(clinicId, paused, reason) {
  const sb = getSupabaseBrowser(); if (!sb) throw new Error('not configured')
  const { error } = await sb.from('queue_status').upsert({ clinic_id: clinicId, is_paused: paused, pause_reason: paused ? (reason || null) : null, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function transitionVisit(visitId, nextStatus) {
  const sb = getSupabaseBrowser(); if (!sb) throw new Error('not configured')
  const { data, error } = await sb.rpc('transition_visit', { target_visit: visitId, next_status: nextStatus })
  if (error) throw error
  return data
}

export async function addWalkIn(clinic, patient) {
  const sb = getSupabaseBrowser(); if (!sb) throw new Error('not configured')
  const { data, error } = await sb.rpc('join_clinic_queue', {
    qr_code: clinic.qr_identifier,
    patient_name: patient.name,
    patient_age: Number(patient.age),
    patient_phone: patient.phone,
    patient_area: patient.area || null,
  })
  if (error) throw error
  return data
}

export async function fetchDayBilling(clinicId, dateISO) {
  const sb = getSupabaseBrowser(); if (!sb) return { amount: 0, count: 0 }
  const { data } = await sb.from('billing_usage').select('amount').eq('clinic_id', clinicId).eq('usage_date', dateISO)
  const amount = (data || []).reduce((s, r) => s + Number(r.amount || 0), 0)
  return { amount, count: (data || []).length }
}

export async function fetchMonthBilling(clinicId) {
  const sb = getSupabaseBrowser(); if (!sb) return 0
  const start = new Date(); start.setDate(1)
  const { data } = await sb.from('billing_usage').select('amount').eq('clinic_id', clinicId).gte('usage_date', start.toISOString().slice(0, 10))
  return (data || []).reduce((s, r) => s + Number(r.amount || 0), 0)
}

export async function fetchPlatformSettings() {
  const sb = getSupabaseBrowser(); if (!sb) return { price_per_completed: 2.5, monthly_cap: 5000 }
  const { data } = await sb.from('platform_settings').select('*').eq('id', true).maybeSingle()
  return data || { price_per_completed: 2.5, monthly_cap: 5000 }
}

export async function fetchAuditEvents(clinicId, limit = 30) {
  const sb = getSupabaseBrowser(); if (!sb) return []
  const { data } = await sb.from('audit_events').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(limit)
  return data || []
}

export function subscribeClinic(clinicId, cb) {
  const sb = getSupabaseBrowser(); if (!sb) return () => {}
  const channel = sb
    .channel(`clinic-${clinicId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'visits', filter: `clinic_id=eq.${clinicId}` }, cb)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_status', filter: `clinic_id=eq.${clinicId}` }, cb)
    .subscribe()
  return () => { sb.removeChannel(channel) }
}
