'use client'
import { useState } from 'react'
import { Activity } from 'lucide-react'
import { getSupabaseBrowser } from '../../lib/supabase-browser'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault(); setErr(''); setStatus(''); setLoading(true)
    const sb = getSupabaseBrowser()
    if (!sb) { setErr('Supabase not configured.'); setLoading(false); return }
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/update-password` : undefined
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)
    if (error) setErr(error.message)
    else setStatus('If an account exists for that email, a password reset link has been sent.')
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] p-5">
      <div className="mx-auto max-w-md pt-14">
        <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Activity size={19} /></div><span className="text-lg font-bold">Care<span className="text-blue-600">Pair</span></span></div>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-500">Enter your work email and we’ll send a reset link.</p>
        <form onSubmit={submit} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Email</label>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400" />
          {status && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{status}</p>}
          {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}
          <button disabled={loading} className="mt-5 h-12 w-full rounded-xl bg-blue-600 text-sm font-bold text-white shadow-xl shadow-blue-200 disabled:opacity-60">{loading ? 'Sending…' : 'Send reset link'}</button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500"><a href="/" className="font-semibold text-blue-600">Back to sign in</a></p>
      </div>
    </div>
  )
}
