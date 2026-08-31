'use client'
import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { getSupabaseBrowser } from '../../lib/supabase-browser'

export default function UpdatePasswordPage() {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState(null)

  useEffect(() => {
    const sb = getSupabaseBrowser(); if (!sb) return
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function submit(e) {
    e.preventDefault(); setErr(''); setLoading(true)
    if (pw.length < 8) { setErr('Password must be at least 8 characters.'); setLoading(false); return }
    if (pw !== pw2) { setErr('Passwords do not match.'); setLoading(false); return }
    const sb = getSupabaseBrowser()
    const { error } = await sb.auth.updateUser({ password: pw })
    setLoading(false)
    if (error) setErr(error.message); else setOk(true)
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] p-5">
      <div className="mx-auto max-w-md pt-14">
        <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Activity size={19} /></div><span className="text-lg font-bold">Care<span className="text-blue-600">Pair</span></span></div>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">Choose a new password</h1>
        {!session && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Open this page from the email link so we can verify your account.</p>}
        {ok ? (
          <p className="mt-6 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-700">Password updated. <a className="font-semibold underline" href="/">Sign in</a></p>
        ) : (
          <form onSubmit={submit} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <input required type="password" placeholder="New password" value={pw} onChange={e => setPw(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm" />
            <input required type="password" placeholder="Confirm password" value={pw2} onChange={e => setPw2(e.target.value)} className="mt-3 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm" />
            {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}
            <button disabled={loading || !session} className="mt-5 h-12 w-full rounded-xl bg-blue-600 text-sm font-bold text-white shadow-xl shadow-blue-200 disabled:opacity-60">{loading ? 'Updating…' : 'Update password'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
