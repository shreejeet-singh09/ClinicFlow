'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowRight, Bell, BadgeCheck, CalendarDays, Check, ChevronRight, Clock3, Copy, CreditCard, LayoutDashboard,
  LockKeyhole, LogOut, Mail, Pause, Play, Plus, QrCode, RefreshCcw, Search, Settings, ShieldCheck,
  Stethoscope, Trash2, UserPlus, Users, X, ClipboardList,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { getSupabaseBrowser } from '../lib/supabase-browser'
import {
  STATUS, STATUS_LABEL, STATUS_TONE, fetchVisits, fetchClinicById, fetchQueueStatus, setQueuePaused,
  transitionVisit, addWalkIn, fetchDayBilling, fetchMonthBilling, fetchPlatformSettings, fetchAuditEvents, subscribeClinic,
} from '../lib/db'
import { fmtINR, estRevenue } from '../lib/pricing'
import { fetchClinicEntitlements } from '../lib/entitlements'
import { fetchNotifications, markNotificationRead, markAllRead, subscribeNotifications } from '../lib/notifications'
import OnlineBadge, { useOnline } from '../components/OnlineBadge'

const supabase = () => getSupabaseBrowser()

// ==================================================================================
// Toast (shared)
// ==================================================================================
function Toast({ msg, onClose }) {
  useEffect(() => { if (!msg) return; const t = setTimeout(onClose, 2800); return () => clearTimeout(t) }, [msg, onClose])
  if (!msg) return null
  return <div className="fixed bottom-5 right-5 z-40 flex max-w-sm items-center gap-3 rounded-xl bg-slate-950 px-4 py-3 text-sm text-white shadow-2xl"><Check size={16} className="text-emerald-400" />{msg}<button onClick={onClose}><X size={15} /></button></div>
}

function StatusPill({ tone = 'neutral', children }) {
  const tones = { done: 'bg-emerald-50 text-emerald-700', active: 'bg-blue-50 text-blue-700', waiting: 'bg-amber-50 text-amber-700', called: 'bg-indigo-50 text-indigo-700', neutral: 'bg-slate-100 text-slate-600' }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone] || tones.neutral}`}>{children}</span>
}

function Metric({ label, value, detail, icon: Icon, accent = 'blue' }) {
  const iconTone = accent === 'green' ? 'bg-emerald-50 text-emerald-600' : accent === 'amber' ? 'bg-amber-50 text-amber-600' : accent === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.03)]">
      <div className="mb-5 flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><span className={`rounded-xl p-2 ${iconTone}`}><Icon size={17} /></span></div>
      <div className="text-2xl font-bold tracking-tight text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{detail}</div>
    </div>
  )
}

// ==================================================================================
// SIGN-IN / SIGN-UP
// ==================================================================================
function SignIn({ onSignedIn }) {
  const [mode, setMode] = useState('signin')
  return mode === 'register' ? <RegisterClinic goBack={() => setMode('signin')} /> : <LoginForm onSignedIn={onSignedIn} goRegister={() => setMode('register')} />
}

function LoginForm({ onSignedIn, goRegister }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [err, setErr] = useState(''); const [loading, setLoading] = useState(false)
  const [showDemos, setShowDemos] = useState(false)
  async function submit(e) {
    e.preventDefault(); setErr(''); setLoading(true)
    const sb = supabase(); if (!sb) { setErr('Live login is not available (Supabase not configured).'); setLoading(false); return }
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) { setErr(error.message); setLoading(false); return }
    onSignedIn(data.session)
  }
  const demos = [
    { role: 'Platform admin', email: 'admin@clinicflow.local', pw: 'Admin@2026' },
    { role: 'Doctor · Sharma', email: 'sharma@clinicflow.local', pw: 'Doctor@2026' },
    { role: 'Receptionist · Sharma', email: 'reception.sharma@clinicflow.local', pw: 'Reception@2026' },
    { role: 'Doctor · Lakeside', email: 'anita@clinicflow.local', pw: 'Doctor@2026' },
  ]
  return (
    <div className="min-h-screen bg-[#f7f9fc] p-5 text-slate-900">
      <div className="mx-auto flex max-w-md flex-col justify-center gap-6 pt-14">
        <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Activity size={19} /></div><span className="text-lg font-bold">Clinic<span className="text-blue-600">Flow</span></span></div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sign in to your clinic workspace</h1>
          <p className="mt-2 text-sm text-slate-500">Doctors, receptionists, and platform admins share the same login. We route you to the right dashboard automatically.</p>
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Work email</label>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400" />
          <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">Password</label>
          <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400" />
          {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}
          <button disabled={loading} className="mt-5 h-12 w-full rounded-xl bg-blue-600 text-sm font-bold text-white shadow-xl shadow-blue-200 disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}</button>
          <div className="mt-3 text-center"><a href="/reset-password" className="text-xs font-semibold text-slate-500 hover:text-blue-600">Forgot password?</a></div>
        </form>
        <button onClick={() => setShowDemos(v => !v)} className="text-xs font-semibold text-slate-500 hover:text-blue-600">{showDemos ? 'Hide' : 'Show'} demo accounts</button>
        {showDemos && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs">
            {demos.map(d => (
              <button key={d.email} onClick={() => { setEmail(d.email); setPassword(d.pw) }} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-slate-50">
                <span><strong>{d.role}</strong><br /><span className="text-slate-500">{d.email} · {d.pw}</span></span>
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
        )}
        <div className="text-center text-xs text-slate-500">New clinic? <button onClick={goRegister} className="font-semibold text-blue-600">Register your clinic</button></div>
      </div>
    </div>
  )
}

function RegisterClinic({ goBack }) {
  const [f, setF] = useState({ clinicName: '', doctorName: '', email: '', phone: '', password: '', address: '', city: '', fee: 300 })
  const [err, setErr] = useState(''); const [loading, setLoading] = useState(false); const [done, setDone] = useState(false)
  async function submit(e) {
    e.preventDefault(); setErr(''); setLoading(true)
    const sb = supabase(); if (!sb) { setErr('Not available yet.'); setLoading(false); return }
    // 1) Sign up
    const { data: signUp, error: signErr } = await sb.auth.signUp({ email: f.email, password: f.password, options: { data: { name: f.doctorName } } })
    if (signErr && !String(signErr.message).toLowerCase().includes('registered')) { setErr(signErr.message); setLoading(false); return }
    // 2) Sign in (works whether the account already exists or was just created without email confirm)
    const { error: siErr } = await sb.auth.signInWithPassword({ email: f.email, password: f.password })
    if (siErr) { setErr(siErr.message); setLoading(false); return }
    // 3) Atomic RPC: creates clinic + profile + queue_status + trial subscription
    const { error: rpcErr } = await sb.rpc('register_clinic', {
      clinic_name: f.clinicName, doctor_name: f.doctorName, clinic_address: f.address,
      clinic_phone: f.phone, clinic_city: f.city || null, consultation_fee: Number(f.fee) || 300,
    })
    if (rpcErr) { setErr('Could not register clinic: ' + rpcErr.message); setLoading(false); return }
    setDone(true); setLoading(false)
  }
  if (done) return (
    <div className="min-h-screen bg-[#f7f9fc] p-5"><div className="mx-auto max-w-md pt-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={28} /></div>
      <h1 className="mt-5 text-2xl font-bold">Registration submitted</h1>
      <p className="mt-3 text-sm text-slate-500">Your clinic is pending approval from the ClinicFlow platform team. You&apos;ll be able to sign in and manage your queue as soon as it&apos;s approved.</p>
      <button onClick={goBack} className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">Back to sign in</button>
    </div></div>
  )
  return (
    <div className="min-h-screen bg-[#f7f9fc] p-5"><div className="mx-auto max-w-lg pt-10">
      <button onClick={goBack} className="text-xs font-semibold text-slate-500 hover:text-blue-600">← Back</button>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Register your clinic</h1>
      <p className="mt-2 text-sm text-slate-500">Fill in the basics. A platform admin will approve you shortly.</p>
      <form onSubmit={submit} className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <input required placeholder="Clinic name" value={f.clinicName} onChange={e => setF({ ...f, clinicName: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
        <input required placeholder="Doctor name" value={f.doctorName} onChange={e => setF({ ...f, doctorName: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
        <input required type="email" placeholder="Owner email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
        <input required type="password" placeholder="Password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
        <input required placeholder="Phone" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
        <input required placeholder="Clinic address" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
        <input placeholder="City" value={f.city} onChange={e => setF({ ...f, city: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
        <input required type="number" placeholder="Consultation fee (₹)" value={f.fee} onChange={e => setF({ ...f, fee: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
        {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}
        <button disabled={loading} className="mt-2 h-11 w-full rounded-lg bg-blue-600 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Submitting…' : 'Submit for approval'}</button>
      </form>
    </div></div>
  )
}

// ==================================================================================
// STAFF SHELL (Doctor + Receptionist)
// ==================================================================================
function StaffShell({ profile, clinic, children, activeTab, onTab, onSignOut, extra }) {
  const isReception = profile.role === 'receptionist'
  const items = isReception
    ? [{ k: 'queue', label: 'Live queue', icon: Users }, { k: 'search', label: 'Search', icon: Search }]
    : [{ k: 'overview', label: 'Overview', icon: LayoutDashboard }, { k: 'queue', label: 'Queue', icon: Users }, { k: 'calendar', label: 'Calendar', icon: CalendarDays }, { k: 'staff', label: 'Staff', icon: UserPlus }, { k: 'billing', label: 'Billing', icon: CreditCard }, { k: 'settings', label: 'Clinic settings', icon: Settings }, { k: 'audit', label: 'Audit log', icon: ClipboardList }]
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
        <div className="flex items-center gap-3 px-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200"><Activity size={19} /></div><span className="text-lg font-bold tracking-tight">Clinic<span className="text-blue-600">Flow</span></span></div>
        <div className="mt-3 px-2 text-xs font-semibold text-slate-500">{clinic?.name}</div>
        <div className="mt-8 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{isReception ? 'Reception' : 'Owner workspace'}</div>
        <nav className="mt-3 space-y-1">
          {items.map(({ k, label, icon: Icon }) => (
            <button key={k} onClick={() => onTab(k)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${activeTab === k ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
              <Icon size={17} />{label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /><span className="text-xs font-semibold">Realtime connected</span></div>
            <p className="text-xs leading-5 text-slate-400">Queue updates sync across every device.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 text-xs">
            <p className="font-semibold text-slate-900">{profile.name}</p>
            <p className="mt-0.5 text-slate-500">{profile.email}</p>
            <button onClick={onSignOut} className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-rose-600"><LogOut size={13} /> Sign out</button>
          </div>
        </div>
      </aside>
      <main className="lg:pl-[248px]">
        <header className="flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div>
            <p className="text-xs font-medium text-slate-400">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <h1 className="mt-0.5 text-lg font-bold text-slate-950">{isReception ? 'Reception desk' : `Good day, ${profile.name}`}</h1>
          </div>
          <div className="flex items-center gap-3">{extra}<div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{profile.name?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}</div></div>
        </header>
        <div className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8">{children}</div>
      </main>
    </div>
  )
}

// ==================================================================================
// STAFF: shared queue view (used by both Doctor + Receptionist)
// ==================================================================================
function QueueList({ visits, isReception, paused, onAction, onSelectPatient }) {
  const actionsFor = v => {
    if (v.status === STATUS.WAITING) return [{ label: 'Call', to: STATUS.CALLED, tone: 'primary' }, { label: 'No-show', to: STATUS.NO_SHOW, tone: 'ghost' }, { label: 'Cancel', to: STATUS.CANCELLED, tone: 'ghost' }]
    if (v.status === STATUS.CALLED) return [{ label: 'Start', to: STATUS.CONSULTING, tone: 'primary' }, { label: 'Skip', to: STATUS.SKIPPED, tone: 'ghost' }]
    if (v.status === STATUS.CONSULTING) return [{ label: 'Finish', to: STATUS.COMPLETED, tone: 'success' }]
    if (v.status === STATUS.SKIPPED) return [{ label: 'Call again', to: STATUS.CALLED, tone: 'primary' }, { label: 'Cancel', to: STATUS.CANCELLED, tone: 'ghost' }]
    return []
  }
  return (
    <div className="divide-y divide-slate-100">
      {visits.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">No patients in the queue yet.</div>}
      {visits.map(v => {
        const actions = isReception ? actionsFor(v) : []
        return (
          <div key={v.id} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 sm:gap-5">
            <div className="w-10 text-center text-sm font-bold text-slate-400">#{v.token_number}</div>
            <button onClick={() => onSelectPatient(v)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold text-slate-900">{v.patient?.name || '—'}</p>
              <p className="mt-0.5 text-xs text-slate-400">{v.patient?.age ?? '—'} yrs · {v.patient?.area || '—'}</p>
            </button>
            <div className="hidden text-xs text-slate-400 sm:block">{v.consultation_duration ? `${Math.round(v.consultation_duration / 60)}m` : '—'}</div>
            <StatusPill tone={STATUS_TONE[v.status]}>{STATUS_LABEL[v.status]}</StatusPill>
            {actions.map(a => (
              <button key={a.label} disabled={paused && a.to !== STATUS.CANCELLED && a.to !== STATUS.NO_SHOW} onClick={() => onAction(v, a.to)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${a.tone === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' : a.tone === 'success' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600'}`}>
                {a.label}
              </button>
            ))}
            <ChevronRight size={16} className="text-slate-300" />
          </div>
        )
      })}
    </div>
  )
}

function WalkInModal({ clinic, onClose, onCreated }) {
  const [f, setF] = useState({ name: '', age: '', phone: '', area: '' })
  const [err, setErr] = useState(''); const [loading, setLoading] = useState(false)
  async function submit(e) {
    e.preventDefault(); setLoading(true); setErr('')
    try { const v = await addWalkIn(clinic, f); onCreated(v); onClose() } catch (err) { setErr(err.message); setLoading(false) }
  }
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-5">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold">Add walk-in patient</h3>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input required placeholder="Name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          <input required type="number" min="0" max="130" placeholder="Age" value={f.age} onChange={e => setF({ ...f, age: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          <input required placeholder="Phone" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          <input placeholder="City / area / locality (optional)" value={f.area} onChange={e => setF({ ...f, area: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}
          <div className="mt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button>
            <button disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">{loading ? 'Creating…' : 'Create token'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ==================================================================================
// CLINIC WORKSPACE (both doctor and receptionist share live data)
// ==================================================================================
function ClinicWorkspace({ profile, onSignOut }) {
  const isReception = profile.role === 'receptionist'
  const [tab, setTab] = useState(isReception ? 'queue' : 'overview')
  const [clinic, setClinic] = useState(null)
  const [visits, setVisits] = useState([])
  const [paused, setPaused] = useState(false)
  const [pauseReason, setPauseReason] = useState(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [calendarVisits, setCalendarVisits] = useState([])
  const [calendarBilling, setCalendarBilling] = useState({ amount: 0, count: 0 })
  const [walkIn, setWalkIn] = useState(false)
  const [settings, setSettings] = useState({ price_per_completed: 2.5, monthly_cap: 5000 })
  const [monthUsage, setMonthUsage] = useState(0)
  const [selectedVisit, setSelectedVisit] = useState(null)
  const [audit, setAudit] = useState([])
  const [busy, setBusy] = useState({})
  const online = useOnline()
  const [pendingActions, setPendingActions] = useState(0)

  const loadEverything = useCallback(async () => {
    if (!profile.clinic_id) return
    const [c, vs, qs, s, mu] = await Promise.all([
      fetchClinicById(profile.clinic_id),
      fetchVisits(profile.clinic_id),
      fetchQueueStatus(profile.clinic_id),
      fetchPlatformSettings(),
      fetchMonthBilling(profile.clinic_id),
    ])
    setClinic(c); setVisits(vs); setPaused(qs?.is_paused || false); setPauseReason(qs?.pause_reason || null)
    setSettings(s); setMonthUsage(mu)
  }, [profile.clinic_id])

  useEffect(() => { loadEverything() }, [loadEverything])

  useEffect(() => {
    if (!profile.clinic_id) return
    const unsub = subscribeClinic(profile.clinic_id, loadEverything)
    return unsub
  }, [profile.clinic_id, loadEverything])

  useEffect(() => {
    if (tab !== 'calendar' || !profile.clinic_id) return
    ;(async () => {
      const [vs, bill] = await Promise.all([fetchVisits(profile.clinic_id, selectedDate), fetchDayBilling(profile.clinic_id, selectedDate)])
      setCalendarVisits(vs); setCalendarBilling(bill)
    })()
  }, [tab, profile.clinic_id, selectedDate])

  useEffect(() => {
    if (tab !== 'audit' || !profile.clinic_id) return
    fetchAuditEvents(profile.clinic_id).then(setAudit)
  }, [tab, profile.clinic_id])

  const completed = useMemo(() => visits.filter(v => v.status === STATUS.COMPLETED), [visits])
  const waiting = useMemo(() => visits.filter(v => v.status === STATUS.WAITING), [visits])
  const consulting = useMemo(() => visits.find(v => v.status === STATUS.CONSULTING), [visits])
  const nextUp = useMemo(() => waiting[0], [waiting])
  const estRev = estRevenue(clinic?.consultation_fee, completed.length)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return visits
    return visits.filter(v => `${v.patient?.name || ''} ${v.token_number} ${v.patient?.phone || ''}`.toLowerCase().includes(q))
  }, [visits, search])

  async function act(v, to) {
    if (busy[v.id]) return
    setBusy(b => ({ ...b, [v.id]: true }))
    if (!online) {
      // Enqueue in indexedDB
      try {
        const { queueOfflineAction } = await import('../lib/offline-queue')
        await queueOfflineAction({ type: 'transition', visit_id: v.id, to })
        setPendingActions(p => p + 1)
        setToast('Offline — action queued and will retry when online.')
      } catch { setToast('Offline queue unavailable in this browser.') }
      setBusy(b => ({ ...b, [v.id]: false }))
      return
    }
    try { await transitionVisit(v.id, to); setToast(`Token #${v.token_number} → ${STATUS_LABEL[to]}`) }
    catch (e) { setToast('Action failed: ' + e.message) }
    finally { setBusy(b => ({ ...b, [v.id]: false })); loadEverything() }
  }

  // Drain offline queue on reconnect
  useEffect(() => {
    if (!online) return
    let cancelled = false
    ;(async () => {
      try {
        const { getPendingActions, clearOfflineAction } = await import('../lib/offline-queue')
        const items = await getPendingActions()
        if (cancelled) return
        setPendingActions(items.length)
        for (const it of items) {
          if (it.type === 'transition') {
            try { await transitionVisit(it.visit_id, it.to); await clearOfflineAction(it.action_id) } catch { /* keep queued */ }
          } else { await clearOfflineAction(it.action_id) }
        }
        const remaining = await getPendingActions(); setPendingActions(remaining.length)
        if (items.length) loadEverything()
      } catch {}
    })()
    return () => { cancelled = true }
  }, [online, loadEverything])

  async function togglePause() {
    try { await setQueuePaused(profile.clinic_id, !paused, !paused ? 'Doctor break' : null); setToast(!paused ? 'Queue paused' : 'Queue resumed') } catch (e) { setToast('Could not update: ' + e.message) }
  }

  if (!clinic) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading your workspace…</div>

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${clinic.slug}` : `/join/${clinic.slug}`

  const extraHeader = (
    <div className="flex items-center gap-3">
      <NotificationsBell userId={profile.id} onToast={setToast} />
      <OnlineBadge pending={pendingActions} />
      <button onClick={loadEverything} className="hidden rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-blue-600 sm:block"><RefreshCcw size={15} /></button>
    </div>
  )

  return (
    <StaffShell profile={profile} clinic={clinic} activeTab={tab} onTab={setTab} onSignOut={onSignOut} extra={extraHeader}>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />{isReception ? 'RECEPTION DESK' : 'OWNER DASHBOARD'}</div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">{tab === 'calendar' ? 'Clinic calendar' : tab === 'settings' ? 'Clinic settings' : tab === 'audit' ? 'Audit log' : tab === 'search' ? 'Search patients' : tab === 'staff' ? 'Staff & invitations' : tab === 'billing' ? 'Subscription & billing' : tab === 'queue' ? 'Today’s queue' : 'Clinic overview'}</h2>
          <p className="mt-2 text-sm text-slate-500">{isReception ? 'Keep the waiting room moving with clear, simple actions.' : 'A calm view of your clinic, patients, and practice health.'}</p>
        </div>
        {isReception && tab === 'queue' && (
          <div className="flex gap-2">
            <button onClick={togglePause} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm ${paused ? 'bg-amber-500 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Resume queue' : 'Pause queue'}</button>
            <button onClick={() => setWalkIn(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200"><Plus size={16} /> Add walk-in</button>
          </div>
        )}
      </div>
      {paused && <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><Pause size={16} /><span><strong>Queue paused.</strong> {pauseReason || 'Waiting patients are safe — no new consultation can start.'}</span></div>}

      {tab === 'overview' && !isReception && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Patients completed" value={completed.length} detail={`out of ${visits.length} today`} icon={Check} accent="green" />
            <Metric label="Currently waiting" value={waiting.length} detail={nextUp ? `Next: #${nextUp.token_number}` : '—'} icon={Clock3} />
            <Metric label="Consulting now" value={consulting ? `#${consulting.token_number}` : '—'} detail={consulting?.patient?.name || 'Idle'} icon={Stethoscope} />
            <Metric label="Est. revenue" value={fmtINR(estRev)} detail={`SaaS usage ${fmtINR(monthUsage)} · cap ${fmtINR(settings.monthly_cap)}`} icon={Activity} accent="green" />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_330px]">
            <section className="rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h3 className="font-bold">Live queue</h3><p className="mt-1 text-xs text-slate-400">{visits.length} visits today · updates in realtime</p></div></div>
              <QueueList visits={filtered} isReception={false} paused={paused} onAction={act} onSelectPatient={setSelectedVisit} />
            </section>
            <aside className="space-y-6">
              <ClinicQR clinic={clinic} url={publicUrl} onCopy={() => setToast('Public link copied.')} />
              {nextUp && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center justify-between"><h3 className="font-bold">Next up</h3><span className="text-xs font-semibold text-blue-600">#{nextUp.token_number}</span></div>
                  <div className="mt-5 flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-xl font-bold text-amber-700">#{nextUp.token_number}</div><div><p className="font-semibold">{nextUp.patient?.name}</p><p className="mt-1 text-xs text-slate-400">Should be ready</p></div></div>
                </div>
              )}
            </aside>
          </div>
        </>
      )}

      {tab === 'queue' && (
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="font-bold">Live queue</h3><p className="mt-1 text-xs text-slate-400">{visits.length} visits today · realtime</p></div>
            <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={15} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or token" className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-400 sm:w-56" /></div>
          </div>
          <QueueList visits={filtered} isReception={isReception} paused={paused} onAction={act} onSelectPatient={setSelectedVisit} />
        </section>
      )}

      {tab === 'search' && isReception && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 text-slate-400" size={15} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, or token" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm" /></div>
          <div className="mt-4"><QueueList visits={filtered} isReception={isReception} paused={paused} onAction={act} onSelectPatient={setSelectedVisit} /></div>
        </section>
      )}

      {tab === 'calendar' && !isReception && (
        <CalendarView selectedDate={selectedDate} setSelectedDate={setSelectedDate} visits={calendarVisits} billing={calendarBilling} clinic={clinic} settings={settings} />
      )}

      {tab === 'settings' && !isReception && (
        <SettingsPanel clinic={clinic} onSaved={loadEverything} onToast={setToast} publicUrl={publicUrl} />
      )}

      {tab === 'staff' && !isReception && (
        <StaffPanel clinicId={clinic.id} onToast={setToast} />
      )}

      {tab === 'billing' && !isReception && (
        <BillingPanel clinicId={clinic.id} onToast={setToast} />
      )}

      {tab === 'audit' && !isReception && (
        <AuditPanel events={audit} />
      )}

      {selectedVisit && <PatientDetailsModal v={selectedVisit} onClose={() => setSelectedVisit(null)} />}
      {walkIn && <WalkInModal clinic={clinic} onClose={() => setWalkIn(false)} onCreated={loadEverything} />}
      <Toast msg={toast} onClose={() => setToast('')} />
    </StaffShell>
  )
}

function ClinicQR({ clinic, url, onCopy }) {
  return (
    <div className="rounded-2xl bg-blue-600 p-6 text-white shadow-xl shadow-blue-100">
      <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-100">Patient join QR</p><h3 className="mt-2 text-xl font-bold">Let patients join<br />without an app.</h3></div><QrCode size={32} className="text-blue-200" /></div>
      <div className="mt-5 flex justify-center rounded-2xl bg-white p-4"><QRCodeSVG value={url} size={140} bgColor="transparent" fgColor="#0f172a" /></div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-white/10 p-3">
        <span className="truncate text-xs font-semibold">{url}</span>
        <button onClick={() => { navigator.clipboard?.writeText(url); onCopy() }}><Copy size={15} className="text-blue-100" /></button>
      </div>
    </div>
  )
}

function CalendarView({ selectedDate, setSelectedDate, visits, billing, clinic, settings }) {
  const d = new Date(selectedDate + 'T00:00:00')
  const y = d.getFullYear(), m = d.getMonth()
  const first = new Date(y, m, 1); const last = new Date(y, m + 1, 0)
  const days = []
  for (let i = 0; i < first.getDay(); i++) days.push(null)
  for (let i = 1; i <= last.getDate(); i++) days.push(i)
  const completedCount = visits.filter(v => v.status === STATUS.COMPLETED).length
  const cancelled = visits.filter(v => v.status === STATUS.CANCELLED).length
  const noshow = visits.filter(v => v.status === STATUS.NO_SHOW).length
  const avgConsult = completedCount ? Math.round(visits.filter(v => v.consultation_duration).reduce((s, v) => s + v.consultation_duration, 0) / completedCount / 60) : 0
  const est = estRevenue(clinic?.consultation_fee, completedCount)
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <button onClick={() => { const nd = new Date(y, m - 1, 1); setSelectedDate(nd.toISOString().slice(0, 10)) }} className="text-slate-500">‹</button>
          <h3 className="font-bold">{first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={() => { const nd = new Date(y, m + 1, 1); setSelectedDate(nd.toISOString().slice(0, 10)) }} className="text-slate-500">›</button>
        </div>
        <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs text-slate-400">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => <span key={i} className="py-2 font-semibold">{label}</span>)}
          {days.map((n, i) => n === null ? <span key={i} /> : (
            <button key={i} onClick={() => setSelectedDate(new Date(y, m, n).toISOString().slice(0, 10))} className={`rounded-lg py-2.5 text-sm ${n === d.getDate() ? 'bg-blue-600 font-bold text-white shadow-lg shadow-blue-200' : 'text-slate-600 hover:bg-blue-50'}`}>{n}</button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Selected day</p><h3 className="mt-1 text-xl font-bold">{d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</h3></div>
          <CalendarDays className="text-slate-300" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Completed" value={completedCount} detail={`${visits.length} total`} icon={Check} accent="green" />
          <Metric label="Cancelled" value={cancelled} detail={`No-shows ${noshow}`} icon={X} accent="rose" />
          <Metric label="Est. revenue" value={fmtINR(est)} detail={`₹${clinic?.consultation_fee} × ${completedCount}`} icon={Activity} accent="green" />
          <Metric label="SaaS usage" value={fmtINR(billing.amount)} detail={`Cap ${fmtINR(settings.monthly_cap)}`} icon={ShieldCheck} accent="amber" />
        </div>
        <div className="mt-6 rounded-xl border border-slate-100">
          <div className="border-b border-slate-100 p-3 text-xs font-semibold text-slate-500">Visit details</div>
          <div className="max-h-80 divide-y divide-slate-100 overflow-auto">
            {visits.length === 0 && <div className="p-5 text-sm text-slate-500">No visits on this day.</div>}
            {visits.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-3">
                <div className="w-8 text-center text-xs font-bold text-slate-400">#{v.token_number}</div>
                <div className="flex-1"><p className="text-sm font-medium">{v.patient?.name}</p><p className="text-xs text-slate-400">{v.patient?.age} yrs · {v.patient?.area || '—'}</p></div>
                <StatusPill tone={STATUS_TONE[v.status]}>{STATUS_LABEL[v.status]}</StatusPill>
                <span className="text-xs text-slate-400">{v.consultation_duration ? `${Math.round(v.consultation_duration / 60)}m` : ''}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4"><ExportButton clinicId={clinic.id} date={selectedDate} /></div>
      </div>
    </div>
  )
}

function ExportButton({ clinicId, date }) {
  async function download() {
    const rows = await fetchVisits(clinicId, date)
    const header = ['token', 'name', 'age', 'phone', 'area', 'status', 'consultation_duration_seconds', 'called_at', 'started_at', 'finished_at']
    const csv = [header.join(',')].concat(rows.map(r => [r.token_number, `"${(r.patient?.name || '').replace(/"/g, '""')}"`, r.patient?.age || '', r.patient?.phone || '', r.patient?.area || '', r.status, r.consultation_duration || '', r.called_at || '', r.consultation_started_at || '', r.consultation_finished_at || ''].join(','))).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `clinicflow-${date}.csv`; a.click()
  }
  return <button onClick={download} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-600">Export CSV</button>
}

function SettingsPanel({ clinic, onSaved, onToast, publicUrl }) {
  const [f, setF] = useState({ name: clinic.name, doctor_name: clinic.doctor_name || '', address: clinic.address || '', phone: clinic.phone || '', city: clinic.city || '', consultation_fee: clinic.consultation_fee, opening_hours: JSON.stringify(clinic.opening_hours || {}, null, 2) })
  const [saving, setSaving] = useState(false)
  async function save(e) {
    e.preventDefault(); setSaving(true)
    const sb = supabase()
    let openingHours = {}; try { openingHours = JSON.parse(f.opening_hours || '{}') } catch {}
    const { error } = await sb.from('clinics').update({ name: f.name, doctor_name: f.doctor_name, address: f.address, phone: f.phone, city: f.city, consultation_fee: Number(f.consultation_fee) || 0, opening_hours: openingHours, updated_at: new Date().toISOString() }).eq('id', clinic.id)
    setSaving(false)
    if (error) onToast('Could not save: ' + error.message); else { onToast('Clinic settings saved.'); onSaved() }
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="font-bold">Clinic profile</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs"><span className="text-slate-500">Clinic name</span><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
          <label className="text-xs"><span className="text-slate-500">Doctor name</span><input value={f.doctor_name} onChange={e => setF({ ...f, doctor_name: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
          <label className="text-xs sm:col-span-2"><span className="text-slate-500">Address</span><input value={f.address} onChange={e => setF({ ...f, address: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
          <label className="text-xs"><span className="text-slate-500">City</span><input value={f.city} onChange={e => setF({ ...f, city: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
          <label className="text-xs"><span className="text-slate-500">Phone</span><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
          <label className="text-xs"><span className="text-slate-500">Consultation fee (₹)</span><input type="number" value={f.consultation_fee} onChange={e => setF({ ...f, consultation_fee: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
          <label className="text-xs sm:col-span-2"><span className="text-slate-500">Opening hours (JSON, e.g. {'{"mon":["09:00-13:00","17:00-20:00"]}'})</span><textarea rows={4} value={f.opening_hours} onChange={e => setF({ ...f, opening_hours: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 p-3 font-mono text-xs" /></label>
        </div>
        <button disabled={saving} className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>
      </form>
      <aside className="space-y-4">
        <ClinicQR clinic={clinic} url={publicUrl} onCopy={() => onToast('Public link copied.')} />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs">
          <h4 className="font-bold text-sm">Public clinic URL</h4>
          <p className="mt-2 break-all text-slate-500">{publicUrl}</p>
        </div>
      </aside>
    </div>
  )
}

function AuditPanel({ events }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold">Recent activity</h3>
      <p className="mt-1 text-xs text-slate-400">Last {events.length} events on this clinic.</p>
      <div className="mt-4 divide-y divide-slate-100">
        {events.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No audit events yet.</p>}
        {events.map(e => (
          <div key={e.id} className="flex items-center gap-3 py-3 text-sm">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{e.event_type}</span>
            <span className="flex-1 text-slate-500">visit {e.visit_id?.slice(0, 8)}</span>
            <span className="text-xs text-slate-400">{new Date(e.created_at).toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PatientDetailsModal({ v, onClose }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-5">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between"><h3 className="text-lg font-bold">Token #{v.token_number} · {v.patient?.name}</h3><button onClick={onClose}><X size={17} /></button></div>
        <div className="mt-4 space-y-2 text-sm">
          <p><span className="text-slate-500">Age:</span> {v.patient?.age}</p>
          <p><span className="text-slate-500">Phone:</span> {v.patient?.phone}</p>
          <p><span className="text-slate-500">Area:</span> {v.patient?.area || '—'}</p>
          <p><span className="text-slate-500">Status:</span> <StatusPill tone={STATUS_TONE[v.status]}>{STATUS_LABEL[v.status]}</StatusPill></p>
          {v.called_at && <p><span className="text-slate-500">Called at:</span> {new Date(v.called_at).toLocaleTimeString('en-IN')}</p>}
          {v.consultation_started_at && <p><span className="text-slate-500">Started:</span> {new Date(v.consultation_started_at).toLocaleTimeString('en-IN')}</p>}
          {v.consultation_finished_at && <p><span className="text-slate-500">Finished:</span> {new Date(v.consultation_finished_at).toLocaleTimeString('en-IN')}</p>}
          {v.consultation_duration && <p><span className="text-slate-500">Duration:</span> {Math.round(v.consultation_duration / 60)} min</p>}
        </div>
      </div>
    </div>
  )
}

// ==================================================================================
// PLATFORM ADMIN
// ==================================================================================
function AdminDashboard({ profile, onSignOut }) {
  const [clinics, setClinics] = useState([])
  const [totals, setTotals] = useState({ today: 0, month: 0, patientsToday: 0, completedToday: 0 })
  const [confirm, setConfirm] = useState(null)
  const [notice, setNotice] = useState('')
  const [settings, setSettings] = useState({ price_per_completed: 2.5, monthly_cap: 5000 })
  const [savingSettings, setSavingSettings] = useState(false)

  async function load() {
    const sb = supabase(); if (!sb) return
    const [{ data: cs }, { data: bill }, { data: today }] = await Promise.all([
      sb.from('clinics').select('id, name, slug, doctor_name, status, city, consultation_fee, created_at'),
      sb.from('billing_usage').select('clinic_id, amount, usage_date'),
      sb.from('visits').select('id, status, clinic_id, visit_date').eq('visit_date', new Date().toISOString().slice(0, 10)),
    ])
    setClinics(cs || [])
    const today0 = new Date().toISOString().slice(0, 10)
    const monthStart = new Date(); monthStart.setDate(1); const monthStartISO = monthStart.toISOString().slice(0, 10)
    const rev = (bill || []).reduce((acc, r) => {
      const amt = Number(r.amount)
      if (r.usage_date === today0) acc.today += amt
      if (r.usage_date >= monthStartISO) acc.month += amt
      acc.byClinic[r.clinic_id] = (acc.byClinic[r.clinic_id] || 0) + (r.usage_date >= monthStartISO ? amt : 0)
      return acc
    }, { today: 0, month: 0, byClinic: {} })
    setTotals({ today: rev.today, month: rev.month, patientsToday: (today || []).length, completedToday: (today || []).filter(t => t.status === 'completed').length, byClinic: rev.byClinic })
    const s = await fetchPlatformSettings(); setSettings(s)
  }
  useEffect(() => { load() }, [])

  async function updateStatus(id, status) {
    const sb = supabase()
    const { error } = await sb.from('clinics').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { setNotice('Failed: ' + error.message); return }
    setNotice(`Clinic status → ${status.replace('_', ' ')}`); setTimeout(() => setNotice(''), 2400); load()
  }
  async function removeClinic(id) {
    const sb = supabase(); const { error } = await sb.from('clinics').delete().eq('id', id)
    if (error) setNotice('Delete blocked: ' + error.message)
    else { setNotice('Clinic removed.'); setTimeout(() => setNotice(''), 2400); load() }
    setConfirm(null)
  }
  async function savePricing() {
    setSavingSettings(true)
    const sb = supabase()
    const { error } = await sb.from('platform_settings').update({ price_per_completed: Number(settings.price_per_completed), monthly_cap: Number(settings.monthly_cap), updated_at: new Date().toISOString() }).eq('id', true)
    setSavingSettings(false)
    if (error) setNotice('Save failed: ' + error.message); else setNotice('Platform pricing saved.')
    setTimeout(() => setNotice(''), 2400)
  }

  const badge = s => s === 'active' ? 'bg-emerald-50 text-emerald-700' : s === 'pending_approval' ? 'bg-amber-50 text-amber-700' : s === 'suspended' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] flex-col border-r border-slate-800 bg-slate-950 px-5 py-6 text-white lg:flex">
        <div className="flex items-center gap-3 px-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500"><Activity size={19} /></div><span className="text-lg font-bold">Clinic<span className="text-blue-400">Flow</span></span></div>
        <div className="mt-10 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Platform control</div>
        <nav className="mt-3 space-y-1">
          <button className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold text-white"><LayoutDashboard size={17} /> Overview</button>
        </nav>
        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-semibold text-blue-300">PLATFORM ADMIN</p><p className="mt-2 text-xs leading-5 text-slate-400">Row-level security protects tenants.</p></div>
          <button onClick={onSignOut} className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"><LogOut size={14} /> Sign out</button>
        </div>
      </aside>
      <main className="lg:pl-[248px]">
        <header className="flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div><p className="text-xs font-medium text-slate-400">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p><h1 className="mt-0.5 text-lg font-bold text-slate-950">Platform overview</h1></div>
          <div className="flex items-center gap-3"><OnlineBadge /><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">PA</div></div>
        </header>
        <div className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8">
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-600"><span className="h-2 w-2 rounded-full bg-blue-500" />CLINICFLOW PLATFORM</div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">Good day, {profile.name}.</h2>
            <p className="mt-2 text-sm text-slate-500">Approve clinics, protect tenant boundaries, and keep platform revenue visible.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Registered clinics" value={clinics.length} detail={`${clinics.filter(c => c.status === 'pending_approval').length} need approval`} icon={LayoutDashboard} />
            <Metric label="Active clinics" value={clinics.filter(c => c.status === 'active').length} detail={`${Math.round(clinics.filter(c => c.status === 'active').length / Math.max(1, clinics.length) * 100)}% of all clinics`} icon={Check} accent="green" />
            <Metric label="Patients today" value={totals.patientsToday} detail={`${totals.completedToday} completed`} icon={Users} />
            <Metric label="SaaS revenue today" value={fmtINR(totals.today)} detail={`This month ${fmtINR(totals.month)}`} icon={Activity} accent="amber" />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_330px]">
            <section className="rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div><h3 className="font-bold">Clinic management</h3><p className="mt-1 text-xs text-slate-400">Tenant statuses and capped monthly usage.</p></div>
                <StatusPill tone="waiting">{clinics.filter(c => c.status === 'pending_approval').length} pending</StatusPill>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Clinic</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Month usage</th><th className="px-3 py-3">Registered</th><th className="px-3 py-3">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {clinics.map(c => {
                      const monthlyUsage = totals.byClinic?.[c.id] || 0
                      return (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4"><p className="font-semibold text-slate-900">{c.name}</p><p className="mt-1 text-xs text-slate-400">{c.doctor_name || '—'} · {c.city || '—'}</p></td>
                          <td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${badge(c.status)}`}>{c.status.toUpperCase()}</span></td>
                          <td className="px-3 py-4"><p className="font-semibold">{fmtINR(monthlyUsage)}</p><p className="text-xs text-slate-400">cap {fmtINR(settings.monthly_cap)}</p></td>
                          <td className="px-3 py-4 text-xs text-slate-500">{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                          <td className="px-3 py-4">
                            <div className="flex flex-wrap gap-2">
                              {c.status === 'pending_approval' && <><button onClick={() => updateStatus(c.id, 'active')} className="rounded-lg bg-blue-600 px-2.5 py-2 text-[11px] font-bold text-white">Approve</button><button onClick={() => updateStatus(c.id, 'rejected')} className="rounded-lg border border-slate-200 px-2.5 py-2 text-[11px]">Reject</button></>}
                              {c.status === 'active' && <button onClick={() => updateStatus(c.id, 'suspended')} className="rounded-lg border border-rose-200 px-2.5 py-2 text-[11px] text-rose-600">Suspend</button>}
                              {c.status === 'suspended' && <button onClick={() => updateStatus(c.id, 'active')} className="rounded-lg border border-emerald-200 px-2.5 py-2 text-[11px] text-emerald-700">Reactivate</button>}
                              <button onClick={() => setConfirm(c)} className="rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] text-slate-500">Delete</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
            <aside className="space-y-6">
              <div className="rounded-2xl bg-slate-950 p-6 text-white">
                <div className="flex items-center justify-between"><h3 className="font-bold">Revenue snapshot</h3><Activity size={17} className="text-blue-400" /></div>
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between border-b border-white/10 pb-4"><span className="text-sm text-slate-400">Today</span><strong>{fmtINR(totals.today)}</strong></div>
                  <div className="flex justify-between"><span className="text-sm text-slate-400">This month</span><strong>{fmtINR(totals.month)}</strong></div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="font-bold">Platform pricing</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <label className="block text-xs"><span className="text-slate-500">Price / completed (₹)</span><input type="number" step="0.1" value={settings.price_per_completed} onChange={e => setSettings({ ...settings, price_per_completed: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
                  <label className="block text-xs"><span className="text-slate-500">Monthly cap (₹)</span><input type="number" value={settings.monthly_cap} onChange={e => setSettings({ ...settings, monthly_cap: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
                  <button onClick={savePricing} disabled={savingSettings} className="mt-2 w-full rounded-lg bg-blue-600 py-2 text-sm font-bold text-white disabled:opacity-60">{savingSettings ? 'Saving…' : 'Save pricing'}</button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      {confirm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-5">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold">Delete {confirm.name}?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">This removes the clinic and its tenant data. Cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3"><button onClick={() => setConfirm(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button><button onClick={() => removeClinic(confirm.id)} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white">Delete clinic</button></div>
          </div>
        </div>
      )}
      {notice && <div className="fixed bottom-5 right-5 z-30 rounded-xl bg-slate-950 px-4 py-3 text-sm text-white shadow-2xl">{notice}</div>}
    </div>
  )
}

// ==================================================================================
// PENDING/SUSPENDED clinic messaging
// ==================================================================================
function ClinicUnavailable({ profile, clinic, onSignOut }) {
  const msg = clinic?.status === 'pending_approval' ? 'Your clinic is awaiting platform admin approval.' : clinic?.status === 'suspended' ? 'Your clinic is currently suspended. Please contact ClinicFlow support.' : 'Your clinic is not active.'
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc] p-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700"><ShieldCheck size={26} /></div>
        <h1 className="mt-4 text-xl font-bold">{clinic?.name}</h1>
        <p className="mt-2 text-sm text-slate-500">{msg}</p>
        <p className="mt-1 text-xs text-slate-400">Status: {clinic?.status}</p>
        <button onClick={onSignOut} className="mt-6 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Sign out</button>
      </div>
    </div>
  )
}

// ==================================================================================
// ROOT ROUTER
// ==================================================================================

// ==================================================================================
// NotificationsBell — real Supabase in-app notifications
// ==================================================================================
function NotificationsBell({ userId, onToast }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const unread = items.filter(n => !n.read_at).length
  const refresh = () => fetchNotifications().then(setItems)
  useEffect(() => { refresh() }, [])
  useEffect(() => {
    if (!userId) return
    const unsub = subscribeNotifications(userId, refresh)
    return unsub
  }, [userId])
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-blue-600" aria-label="Notifications">
        <Bell size={16} />
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2"><span className="text-sm font-bold">Notifications</span><button onClick={async () => { await markAllRead(); refresh() }} className="text-xs font-semibold text-blue-600">Mark all read</button></div>
          <div className="max-h-80 divide-y divide-slate-100 overflow-auto">
            {items.length === 0 && <p className="p-4 text-center text-xs text-slate-500">You’re all caught up.</p>}
            {items.map(n => (
              <button key={n.id} onClick={async () => { if (!n.read_at) { await markNotificationRead(n.id); refresh() } }} className={`w-full rounded-lg px-3 py-3 text-left text-sm hover:bg-slate-50 ${!n.read_at ? 'bg-blue-50/40' : ''}`}>
                <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                {n.body && <p className="mt-1 text-xs text-slate-500">{n.body}</p>}
                <p className="mt-1 text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString('en-IN')}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ==================================================================================
// StaffPanel — list current staff + create/revoke invitations (server-side via /api)
// ==================================================================================
function StaffPanel({ clinicId, onToast }) {
  const [staff, setStaff] = useState([])
  const [invitations, setInvitations] = useState([])
  const [form, setForm] = useState({ email: '', role: 'receptionist' })
  const [busy, setBusy] = useState(false)
  const [lastLink, setLastLink] = useState(null)

  async function load() {
    const sb = supabase()
    const [{ data: s }, { data: inv }] = await Promise.all([
      sb.from('profiles').select('id, name, email, role').eq('clinic_id', clinicId),
      sb.from('staff_invitations').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }),
    ])
    setStaff(s || []); setInvitations(inv || [])
  }
  useEffect(() => { load() }, [clinicId])

  async function invite(e) {
    e.preventDefault(); setBusy(true); setLastLink(null)
    const sb = supabase()
    const { data: { session } } = await sb.auth.getSession()
    const res = await fetch('/api/invitations/create', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }, body: JSON.stringify(form) })
    setBusy(false)
    const j = await res.json()
    if (!res.ok) { onToast('Invite failed: ' + (j.error || res.status)); return }
    const link = `${window.location.origin}/invite/${j.invitation.token}`
    setLastLink(link)
    onToast('Invitation created. Share the link.')
    setForm({ email: '', role: 'receptionist' })
    load()
  }

  async function revoke(id) {
    const sb = supabase(); const { data: { session } } = await sb.auth.getSession()
    const res = await fetch(`/api/invitations/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session?.access_token || ''}` } })
    if (res.ok) { onToast('Invitation revoked.'); load() } else onToast('Could not revoke.')
  }

  async function removeStaff(userId) {
    const sb = supabase()
    // Detach from clinic (keep auth account intact)
    const { error } = await sb.from('profiles').update({ clinic_id: null }).eq('id', userId)
    if (error) onToast('Could not remove: ' + error.message); else { onToast('Staff removed.'); load() }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5"><h3 className="font-bold">Current staff</h3><p className="mt-1 text-xs text-slate-400">People who can sign into this clinic.</p></div>
        <div className="divide-y divide-slate-100">
          {staff.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No staff yet.</p>}
          {staff.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{s.name?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{s.name}</p><p className="text-xs text-slate-400">{s.email}</p></div>
              <StatusPill tone={s.role === 'clinic_owner' ? 'active' : 'called'}>{s.role.replace('_', ' ')}</StatusPill>
              {s.role !== 'clinic_owner' && <button onClick={() => removeStaff(s.id)} className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:border-rose-200 hover:text-rose-600"><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 p-5">
          <h4 className="text-sm font-bold">Pending & past invitations</h4>
          <div className="mt-3 divide-y divide-slate-100">
            {invitations.length === 0 && <p className="py-4 text-xs text-slate-500">No invitations yet.</p>}
            {invitations.map(i => (
              <div key={i.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="flex-1"><p className="text-sm">{i.email}</p><p className="text-xs text-slate-400">{i.role} · expires {new Date(i.expires_at).toLocaleDateString('en-IN')}</p></div>
                <StatusPill tone={i.status === 'pending' ? 'waiting' : i.status === 'accepted' ? 'done' : 'neutral'}>{i.status}</StatusPill>
                {i.status === 'pending' && (
                  <>
                    <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/invite/${i.token}`); onToast('Invitation link copied.') }} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-600">Copy link</button>
                    <button onClick={() => revoke(i.id)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 hover:border-rose-200 hover:text-rose-600">Revoke</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <aside className="space-y-4">
        <form onSubmit={invite} className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="text-sm font-bold">Invite staff</h4>
          <p className="mt-1 text-xs text-slate-500">Creates a one-time invitation link. Email sending will be enabled when a provider is configured.</p>
          <input required type="email" placeholder="staff@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-3 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="mt-3 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm">
            <option value="receptionist">Receptionist</option>
            <option value="clinic_owner">Doctor / Owner</option>
          </select>
          <button disabled={busy} className="mt-3 h-11 w-full rounded-lg bg-blue-600 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Creating…' : 'Create invitation'}</button>
          {lastLink && <p className="mt-3 break-all rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><strong>Link:</strong> {lastLink}</p>}
        </form>
      </aside>
    </div>
  )
}

// ==================================================================================
// BillingPanel — clinic subscription, plans, invoices (payment provider stubbed)
// ==================================================================================
function BillingPanel({ clinicId, onToast }) {
  const [entitlements, setEntitlements] = useState(null)
  const [plans, setPlans] = useState([])
  const [invoices, setInvoices] = useState([])
  const [paymentsCfg, setPaymentsCfg] = useState(null)

  async function load() {
    const sb = supabase()
    const [ent, { data: p }, { data: inv }, h] = await Promise.all([
      fetchClinicEntitlements(clinicId),
      sb.from('plans').select('*').eq('is_active', true).order('price_inr'),
      sb.from('invoices').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }),
      fetch('/api').then(r => r.json()).catch(() => ({})),
    ])
    setEntitlements(ent); setPlans(p || []); setInvoices(inv || []); setPaymentsCfg(h.payments || { configured: false })
  }
  useEffect(() => { load() }, [clinicId])

  async function selectPlan(planCode) {
    if (!paymentsCfg?.configured) { onToast('Payments are not configured yet. Contact platform admin.'); return }
    onToast('Checkout flow will start once PAYMENT_PROVIDER is configured.')
  }

  if (!entitlements) return <div className="text-sm text-slate-500">Loading billing…</div>

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Current plan</h3>
              <p className="mt-1 text-xs text-slate-400">Your clinic subscription and included features.</p>
            </div>
            <StatusPill tone={entitlements.status === 'active' ? 'done' : entitlements.status === 'trialing' ? 'called' : 'waiting'}>{entitlements.status}</StatusPill>
          </div>
          {entitlements.plan ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div><p className="text-xs text-slate-500">Plan</p><p className="text-lg font-bold">{entitlements.plan.name}</p></div>
              <div><p className="text-xs text-slate-500">Price</p><p className="text-lg font-bold">{fmtINR(entitlements.plan.price_inr)}<span className="text-xs font-normal text-slate-400"> /mo</span></p></div>
              <div><p className="text-xs text-slate-500">Visit limit</p><p className="text-lg font-bold">{entitlements.plan.monthly_visits_limit ?? 'Unlimited'}</p></div>
            </div>
          ) : <p className="mt-4 text-sm text-slate-500">No active subscription. Choose a plan below.</p>}
          {entitlements.trial_ends_at && entitlements.status === 'trialing' && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Trial ends on {new Date(entitlements.trial_ends_at).toLocaleDateString('en-IN')}.</p>}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-bold">Available plans</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {plans.map(p => {
              const active = entitlements.plan?.id === p.id
              return (
                <div key={p.id} className={`rounded-2xl border p-4 ${active ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center justify-between"><h4 className="font-bold">{p.name}</h4>{active && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">Current</span>}</div>
                  <p className="mt-2 text-2xl font-bold">{fmtINR(p.price_inr)}<span className="text-xs font-normal text-slate-500"> /mo</span></p>
                  <ul className="mt-3 space-y-1 text-xs text-slate-600">
                    <li>{p.monthly_visits_limit ?? 'Unlimited'} visits / month</li>
                    <li>{p.doctors_limit ?? 'Unlimited'} doctor(s)</li>
                    <li>{p.receptionists_limit ?? 'Unlimited'} receptionist(s)</li>
                    {Object.entries(p.features || {}).filter(([, v]) => v).map(([k]) => <li key={k}>✓ {k.replace('_', ' ')}</li>)}
                  </ul>
                  <button onClick={() => selectPlan(p.code)} disabled={active} className="mt-4 h-9 w-full rounded-lg bg-blue-600 text-xs font-bold text-white disabled:opacity-40">{active ? 'Current plan' : 'Choose plan'}</button>
                </div>
              )
            })}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-bold">Invoices</h3>
          <p className="mt-1 text-xs text-slate-400">Payment records for your clinic.</p>
          <div className="mt-4 divide-y divide-slate-100">
            {invoices.length === 0 && <p className="py-4 text-sm text-slate-500">No invoices yet.</p>}
            {invoices.map(i => (
              <div key={i.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{i.invoice_number}</span>
                <span className="flex-1 text-slate-500">{i.period_start ? `${i.period_start} → ${i.period_end}` : new Date(i.created_at).toLocaleDateString('en-IN')}</span>
                <span className="font-semibold">{fmtINR(i.amount_inr)}</span>
                <StatusPill tone={i.status === 'paid' ? 'done' : i.status === 'open' ? 'waiting' : 'neutral'}>{i.status}</StatusPill>
              </div>
            ))}
          </div>
        </section>
      </div>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs">
          <h4 className="text-sm font-bold">Payment provider</h4>
          <p className="mt-2 text-slate-500">Provider: <strong>{paymentsCfg?.provider || 'noop'}</strong></p>
          <p className="mt-1 text-slate-500">Status: {paymentsCfg?.configured ? <span className="font-semibold text-emerald-600">Configured</span> : <span className="font-semibold text-amber-600">NOT CONFIGURED</span>}</p>
          <p className="mt-3 text-slate-500">The billing architecture is ready. Set <code className="rounded bg-slate-100 px-1">PAYMENT_PROVIDER</code>, <code className="rounded bg-slate-100 px-1">PAYMENT_API_KEY</code>, <code className="rounded bg-slate-100 px-1">PAYMENT_WEBHOOK_SECRET</code> to activate checkout.</p>
        </div>
      </aside>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [clinic, setClinic] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sb = supabase(); if (!sb) { setReady(true); return }
    let mounted = true
    sb.auth.getSession().then(({ data }) => { if (mounted) setSession(data.session) })
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { setSession(s) })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    async function loadProfile() {
      if (!session) { setProfile(null); setClinic(null); setReady(true); return }
      const sb = supabase()
      let { data: prof } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      // Self-heal: if profile is missing (e.g. legacy signup where clinic insert failed),
      // create one with role=clinic_owner and no clinic. User can then complete setup.
      if (!prof) {
        const { data: healed } = await sb.rpc('ensure_self_profile')
        prof = healed
      }
      setProfile(prof)
      if (prof?.clinic_id) {
        const c = await fetchClinicById(prof.clinic_id); setClinic(c)
      } else {
        setClinic(null)
      }
      setReady(true)
    }
    loadProfile()
  }, [session])

  async function signOut() { const sb = supabase(); if (sb) await sb.auth.signOut(); setSession(null); setProfile(null); setClinic(null) }

  if (!ready) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading ClinicFlow…</div>
  if (!session) return <SignIn onSignedIn={s => setSession(s)} />
  if (!profile) return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc] p-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-lg font-bold">Account not linked to a clinic</h1>
        <p className="mt-2 text-sm text-slate-500">We couldn’t create your profile automatically. Contact the ClinicFlow platform admin.</p>
        <button onClick={signOut} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Sign out</button>
      </div>
    </div>
  )
  if (profile.role === 'platform_admin') return <AdminDashboard profile={profile} onSignOut={signOut} />
  // Profile exists but no clinic yet → invite them to complete setup with the atomic RPC.
  if (!profile.clinic_id) return <CompleteClinicSetup profile={profile} onDone={() => window.location.reload()} onSignOut={signOut} />
  if (!clinic || clinic.status !== 'active') return <ClinicUnavailable profile={profile} clinic={clinic} onSignOut={signOut} />
  return <ClinicWorkspace profile={profile} onSignOut={signOut} />
}

function CompleteClinicSetup({ profile, onDone, onSignOut }) {
  const [f, setF] = useState({ clinicName: '', doctorName: profile.name || '', address: '', phone: '', city: '', fee: 300 })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('')
    const sb = supabase()
    const { error } = await sb.rpc('register_clinic', {
      clinic_name: f.clinicName, doctor_name: f.doctorName, clinic_address: f.address,
      clinic_phone: f.phone, clinic_city: f.city || null, consultation_fee: Number(f.fee) || 300,
    })
    setBusy(false)
    if (error) setErr(error.message); else onDone()
  }
  return (
    <div className="min-h-screen bg-[#f7f9fc] p-5">
      <div className="mx-auto max-w-lg pt-10">
        <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Activity size={19} /></div><span className="text-lg font-bold">Clinic<span className="text-blue-600">Flow</span></span></div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Complete your clinic setup</h1>
        <p className="mt-2 text-sm text-slate-500">Signed in as <strong>{profile.email}</strong>. Tell us about your clinic — an admin will approve it shortly.</p>
        <form onSubmit={submit} className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <input required placeholder="Clinic name" value={f.clinicName} onChange={e => setF({ ...f, clinicName: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          <input required placeholder="Doctor name" value={f.doctorName} onChange={e => setF({ ...f, doctorName: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          <input required placeholder="Phone" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          <input required placeholder="Clinic address" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          <input placeholder="City" value={f.city} onChange={e => setF({ ...f, city: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          <input required type="number" placeholder="Consultation fee (₹)" value={f.fee} onChange={e => setF({ ...f, fee: e.target.value })} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}
          <div className="flex gap-3">
            <button disabled={busy} className="h-11 flex-1 rounded-lg bg-blue-600 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Submitting…' : 'Submit for approval'}</button>
            <button type="button" onClick={onSignOut} className="h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold">Sign out</button>
          </div>
        </form>
      </div>
    </div>
  )
}
