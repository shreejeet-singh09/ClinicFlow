'use client'
// Central plan-based entitlement checks. Runs against public.subscriptions + public.plans.
// Server should always re-check via RLS/RPCs; this is UI convenience.
import { getSupabaseBrowser } from './supabase-browser'

export const FEATURES = {
  ANALYTICS: 'analytics',
  EXPORT: 'export',
  AUDIT: 'audit',
  MULTI_DOCTOR: 'multi_doctor',
  SSO: 'sso',
}

export async function fetchClinicEntitlements(clinicId) {
  const sb = getSupabaseBrowser(); if (!sb) return { plan: null, features: {}, limits: {} }
  const { data: sub } = await sb.from('subscriptions').select('*, plan:plans(*)').eq('clinic_id', clinicId).maybeSingle()
  if (!sub || !sub.plan) return { plan: null, features: {}, limits: {}, status: 'none' }
  return {
    plan: sub.plan,
    subscription: sub,
    status: sub.status,
    trial_ends_at: sub.trial_ends_at,
    features: sub.plan.features || {},
    limits: {
      monthly_visits: sub.plan.monthly_visits_limit,
      doctors: sub.plan.doctors_limit,
      receptionists: sub.plan.receptionists_limit,
    },
  }
}

export function hasFeature(entitlements, feature) {
  if (!entitlements) return false
  return Boolean(entitlements.features?.[feature])
}
