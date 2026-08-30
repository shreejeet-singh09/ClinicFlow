import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPaymentProvider, isPaymentsConfigured } from '../../../lib/payments/provider'

function serverAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function health() {
  return NextResponse.json({
    service: 'CarePair API',
    configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    database: 'supabase',
    realtime: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'ready' : 'awaiting_env',
    payments: { configured: isPaymentsConfigured(), provider: process.env.PAYMENT_PROVIDER || 'noop' },
    time: new Date().toISOString(),
  })
}

export async function GET(request, ctx) {
  const { path } = await ctx.params
  const segments = path || []
  if (segments.length === 0) return health()
  if (segments[0] === 'health') return health()
  if (segments[0] === 'plans') {
    const admin = serverAdmin(); if (!admin) return NextResponse.json({ error: 'not_configured' }, { status: 500 })
    const { data } = await admin.from('plans').select('*').eq('is_active', true).order('price_inr')
    return NextResponse.json({ plans: data })
  }
  return NextResponse.json({ error: 'not_found' }, { status: 404 })
}

export async function POST(request, ctx) {
  const { path } = await ctx.params
  const segments = path || []

  // Payment webhook (idempotent, signature-verified when provider is configured)
  if (segments[0] === 'webhook' && segments[1] === 'payments') {
    const rawBody = await request.text()
    const signature = request.headers.get('x-signature') || ''
    const provider = getPaymentProvider()
    const verified = await provider.verifyWebhookSignature(rawBody, signature, process.env.PAYMENT_WEBHOOK_SECRET)
    if (!provider.configured) {
      return NextResponse.json({ ok: false, reason: 'payment provider not configured' }, { status: 501 })
    }
    if (!verified) return NextResponse.json({ ok: false, reason: 'bad signature' }, { status: 400 })
    let event
    try { event = JSON.parse(rawBody) } catch { return NextResponse.json({ ok: false, reason: 'bad payload' }, { status: 400 }) }
    const admin = serverAdmin(); if (!admin) return NextResponse.json({ ok: false, reason: 'server not configured' }, { status: 500 })
    // Idempotent insert; duplicate event_id will conflict
    const { error } = await admin.from('payment_webhook_events').insert({
      provider: provider.name, event_id: event.id || crypto.randomUUID(), event_type: event.type || null, payload: event, processed_at: new Date().toISOString(),
    })
    if (error && !error.message.includes('duplicate')) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    // TODO: apply event.type -> update subscription / invoice / payment rows
    return NextResponse.json({ ok: true })
  }

  // Staff invitations: create (auth’d) and revoke
  if (segments[0] === 'invitations' && segments[1] === 'create') {
    const admin = serverAdmin(); if (!admin) return NextResponse.json({ error: 'not_configured' }, { status: 500 })
    const authHeader = request.headers.get('authorization') || ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    if (!jwt) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { data: userRes, error: uerr } = await admin.auth.getUser(jwt)
    if (uerr || !userRes?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { data: prof } = await admin.from('profiles').select('*').eq('id', userRes.user.id).maybeSingle()
    if (!prof || prof.role !== 'clinic_owner') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await request.json().catch(() => ({}))
    if (!body.email || !body.role) return NextResponse.json({ error: 'email_and_role_required' }, { status: 400 })
    if (!['receptionist', 'clinic_owner'].includes(body.role)) return NextResponse.json({ error: 'invalid_role' }, { status: 400 })
    const { data, error } = await admin.from('staff_invitations').insert({
      clinic_id: prof.clinic_id, email: body.email.toLowerCase(), role: body.role, invited_by: userRes.user.id,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await admin.from('audit_events').insert({ clinic_id: prof.clinic_id, actor_user_id: userRes.user.id, event_type: 'STAFF_INVITED', metadata: { email: body.email, role: body.role } })
    return NextResponse.json({ invitation: data })
  }

  return NextResponse.json({ error: 'not_found' }, { status: 404 })
}

export async function DELETE(request, ctx) {
  const { path } = await ctx.params
  const segments = path || []
  if (segments[0] === 'invitations' && segments[1]) {
    const id = segments[1]
    const admin = serverAdmin(); if (!admin) return NextResponse.json({ error: 'not_configured' }, { status: 500 })
    const authHeader = request.headers.get('authorization') || ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userRes } = await admin.auth.getUser(jwt)
    if (!userRes?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { data: prof } = await admin.from('profiles').select('*').eq('id', userRes.user.id).maybeSingle()
    if (!prof || prof.role !== 'clinic_owner') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    await admin.from('staff_invitations').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', id).eq('clinic_id', prof.clinic_id)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'not_found' }, { status: 404 })
}
