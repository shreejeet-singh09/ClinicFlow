'use client'
import { useEffect, useState, use } from 'react'
import { Activity, Check, X } from 'lucide-react'
import { getSupabaseBrowser } from '../../../lib/supabase-browser'

export default function InvitationAcceptPage({ params }) {
  const { token } = use(params)
  const [preview, setPreview] = useState(null)
  const [session, setSession] = useState(null)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [signup, setSignup] = useState({ password: '' })

  useEffect(() => {
    const sb = getSupabaseBrowser(); if (!sb) { setErr('Not configured'); return }
    sb.rpc('preview_staff_invitation', { invite_token: token }).then(({ data, error }) => {
      if (error) setErr(error.message); else setPreview(data)
    })
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [token])

  async function signInOrUp(e) {
    e.preventDefault(); setBusy(true); setErr('')
    const sb = getSupabaseBrowser()
    // Try sign in first
    let { error } = await sb.auth.signInWithPassword({ email: preview.email, password: signup.password })
    if (error && error.message.toLowerCase().includes('invalid')) {
      // Try sign up
      const r = await sb.auth.signUp({ email: preview.email, password: signup.password })
      if (r.error) { setErr(r.error.message); setBusy(false); return }
      await sb.auth.signInWithPassword({ email: preview.email, password: signup.password })
    } else if (error) {
      setErr(error.message); setBusy(false); return
    }
    setBusy(false)
  }

  async function accept() {
    setBusy(true); setErr('')
    const sb = getSupabaseBrowser()
    const { error } = await sb.rpc('accept_staff_invitation', { invite_token: token })
    setBusy(false)
    if (error) setErr(error.message); else setOk(true)
  }

  if (err && !preview) return (
    <div className="min-h-screen bg-[#f7f9fc] p-5"><div className="mx-auto max-w-md pt-14"><h1 className="text-2xl font-bold">Invitation error</h1><p className="mt-3 rounded-lg bg-rose-50 px-3 py-3 text-sm text-rose-700">{err}</p></div></div>
  )

  if (!preview) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading invitation…</div>

  const emailMatches = session?.user?.email?.toLowerCase() === preview.email.toLowerCase()

  return (
    <div className="min-h-screen bg-[#f7f9fc] p-5">
      <div className="mx-auto max-w-md pt-14">
        <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Activity size={19} /></div><span className="text-lg font-bold">Care<span className="text-blue-600">Pair</span></span></div>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">Join {preview.clinic_name}</h1>
        <p className="mt-2 text-sm text-slate-500">You’ve been invited as <strong>{preview.role}</strong> for <strong>{preview.clinic_name}</strong>. This invitation was sent to <strong>{preview.email}</strong>.</p>
        {preview.status !== 'pending' && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800">This invitation is {preview.status}.</p>}
        {preview.status === 'pending' && (
          ok ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-800"><Check className="mr-2 inline" size={16} /> You’re in. <a href="/" className="font-semibold underline">Open dashboard</a></div>
          ) : session && emailMatches ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm">Signed in as <strong>{session.user.email}</strong>.</p>
              <button onClick={accept} disabled={busy} className="mt-4 h-12 w-full rounded-xl bg-blue-600 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Joining…' : `Join ${preview.clinic_name}`}</button>
              {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}
            </div>
          ) : session && !emailMatches ? (
            <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">You’re signed in as {session.user.email}, but this invitation is for {preview.email}. Please sign out and sign in with the invited email.</div>
          ) : (
            <form onSubmit={signInOrUp} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Set / confirm your password</label>
              <input required type="password" placeholder="Password" value={signup.password} onChange={e => setSignup({ password: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm" />
              {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}
              <button disabled={busy} className="mt-4 h-12 w-full rounded-xl bg-blue-600 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Please wait…' : 'Continue'}</button>
              <p className="mt-3 text-xs text-slate-500">If you already have a CarePair account for this email, enter its password. Otherwise, we’ll create one.</p>
            </form>
          )
        )}
      </div>
    </div>
  )
}
