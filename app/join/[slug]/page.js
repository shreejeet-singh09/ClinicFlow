'use client'
import { useEffect, useRef, useState, use } from 'react'
import { Activity, Clock3, LockKeyhole, RefreshCcw } from 'lucide-react'
import { getSupabaseBrowser } from '../../../lib/supabase-browser'

export default function PublicQueuePage({ params }) {
  // Next 15: params is a Promise. Unwrap with React.use().
  const resolved = use(params)
  const slug = resolved?.slug || 'clinic'
  const [form, setForm] = useState({ name: '', age: '', phone: '', area: '' })
  const [ticket, setTicket] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [showCalledAlert, setShowCalledAlert] = useState(false)
  const previousStatusRef = useRef(null)
  const [clinic, setClinic] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = getSupabaseBrowser()

  useEffect(() => {
    let alive = true
    async function loadClinic() {
      if (!supabase) return
      const { data } = await supabase.from('clinics').select('id,name,status,doctor_name,slug,qr_identifier').eq('slug', slug).maybeSingle()
      if (alive) setClinic(data)
    }
    loadClinic()
    return () => { alive = false }
  }, [supabase, slug])

  async function joinQueue(event) {
    event.preventDefault(); setLoading(true); setError('')
    if (!supabase) { setError('Live queue is temporarily unavailable. Please ask reception for help.'); setLoading(false); return }
    if (!clinic) { setError('This clinic link is not recognised.'); setLoading(false); return }
    if (clinic.status !== 'active') { setError('This clinic is not accepting patients right now.'); setLoading(false); return }
    const { data, error: joinError } = await supabase.rpc('join_clinic_queue', {
      qr_code: clinic.qr_identifier,
      patient_name: form.name,
      patient_age: Number(form.age),
      patient_phone: form.phone,
      patient_area: form.area || null,
    })
    if (joinError) {
      setError(joinError.message)
      setLoading(false)
      return
    }

    setTicket(data)

    localStorage.setItem(
      `CarePair_ticket_${slug}`,
      JSON.stringify(data)
    )

    setLoading(false)
  }
  useEffect(() => {
    const savedTicket = localStorage.getItem(`CarePair_ticket_${slug}`)

    if (savedTicket) {
      try {
        setTicket(JSON.parse(savedTicket))
      } catch {
        localStorage.removeItem(`CarePair_ticket_${slug}`)
      }
    }
  }, [slug])
  useEffect(() => {
    if (!ticket?.patient_access_token || !supabase) return
    let cancelled = false
    const refresh = async () => {
      const started = performance.now()

      const { data, error } = await supabase.rpc(
        'public_queue_snapshot',
        { access_token: ticket.patient_access_token }
      )

      console.log(
        'Queue refresh:',
        Math.round(performance.now() - started),
        'ms',
        error
      )

      if (data && !cancelled) {
        const wasCalled = previousStatusRef.current === 'CALLED'
        const isCalled = data.status === 'CALLED'

        if (isCalled && !wasCalled) {
          setShowCalledAlert(true)
        }

        previousStatusRef.current = data.status
        setSnapshot(data)
      }
    }
    refresh()
    // Realtime: re-fetch snapshot whenever ANY visit in this clinic changes (queue movement affects position + wait time)
    const channel = supabase
      .channel(`public-queue-${ticket.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits', filter: `clinic_id=eq.${ticket.clinic_id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_status', filter: `clinic_id=eq.${ticket.clinic_id}` }, refresh)
      .subscribe()
    const interval = setInterval(refresh, 2000)
    return () => { cancelled = true; supabase.removeChannel(channel); clearInterval(interval) }
  }, [ticket, supabase])
  useEffect(() => {
    if (!showCalledAlert) return

    // =========================
    // 📳 MAX VIBRATION ~6 SECONDS
    // =========================
    if (navigator.vibrate) {
      navigator.vibrate([
        700, 150,
        700, 150,
        700, 150,
        700, 150,
        700, 150,
        700
      ])
    }

    // =========================
    // 🔊 LOUD CALLING SOUND ~6 SECONDS
    // =========================
    let audioContext = null
    const oscillators = []

    try {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext

      if (AudioContext) {
        audioContext = new AudioContext()

        // Try to wake the audio context
        if (audioContext.state === 'suspended') {
          audioContext.resume()
        }

        const now = audioContext.currentTime

        // Calling pattern:
        // LOUD → pause → LOUD → pause...
        for (let i = 0; i < 6; i++) {
          const startTime = now + i * 1.0

          const oscillator = audioContext.createOscillator()
          const gain = audioContext.createGain()

          oscillator.type = 'square'

          // Two-tone calling sound
          oscillator.frequency.setValueAtTime(
            i % 2 === 0 ? 880 : 660,
            startTime
          )

          // Loud but within normal Web Audio range
          gain.gain.setValueAtTime(0.001, startTime)

          gain.gain.exponentialRampToValueAtTime(
            1.0,
            startTime + 0.02
          )

          gain.gain.setValueAtTime(
            1.0,
            startTime + 0.65
          )

          gain.gain.exponentialRampToValueAtTime(
            0.001,
            startTime + 0.8
          )

          oscillator.connect(gain)
          gain.connect(audioContext.destination)

          oscillator.start(startTime)
          oscillator.stop(startTime + 0.8)

          oscillators.push(oscillator)
        }
      }
    } catch (error) {
      console.log('Alert sound unavailable:', error)
    }

    // =========================
    // 🛑 CLEANUP
    // =========================
    const timeout = setTimeout(() => {
      if (navigator.vibrate) {
        navigator.vibrate(0)
      }
    }, 6000)

    return () => {
      if (navigator.vibrate) {
        navigator.vibrate(0)
      }

      clearTimeout(timeout)

      oscillators.forEach((oscillator) => {
        try {
          oscillator.stop()
        } catch { }
      })

      if (audioContext) {
        audioContext.close()
      }
    }
  }, [showCalledAlert])

  

const bannerText = () => {
  if (!snapshot) return ''
  if (snapshot.queue_paused) return { title: 'Queue paused', sub: 'The doctor is on a short break. We\u2019ll resume shortly.', tone: 'amber' }
  if (snapshot.status === 'COMPLETED') return { title: 'Consultation completed', sub: 'Thank you for visiting. Have a good day!', tone: 'green' }
  if (snapshot.status === 'CONSULTING') return { title: 'Please enter the consultation room', sub: 'Your turn is now.', tone: 'blue' }
  if (snapshot.status === 'CALLED') return { title: 'You are being called', sub: 'Please head to the consultation room now.', tone: 'blue' }
  if (snapshot.status === 'CANCELLED') return { title: 'Visit cancelled', sub: 'Please talk to reception if this was a mistake.', tone: 'rose' }
  if (snapshot.status === 'NO_SHOW') return { title: 'Marked as no-show', sub: 'Please contact reception to rejoin.', tone: 'rose' }
  if (snapshot.status === 'SKIPPED') return { title: 'Skipped for now', sub: 'You will be called again shortly.', tone: 'amber' }
  if (snapshot.patients_ahead === 0) return { title: 'You\u2019re next', sub: 'Please be ready when your token is called.', tone: 'blue' }
  return { title: 'Waiting', sub: 'This page updates automatically.', tone: 'amber' }
}

if (snapshot) {
  const banner = bannerText()
  const toneCls = banner.tone === 'green' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : banner.tone === 'blue' ? 'border-blue-200 bg-blue-50 text-blue-800' : banner.tone === 'rose' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'
  return (
    <div className="min-h-screen bg-[#f7f9fc] px-5 py-8 text-slate-900">

      {showCalledAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-600/95 px-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
              <span className="text-4xl">🔔</span>
            </div>

            <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">
              You're being called
            </h2>

            <p className="mt-3 text-lg text-slate-600">
              Please head to the consultation room now.
            </p>

            <button
              type="button"
              onClick={() => setShowCalledAlert(false)}
              className="mt-8 h-14 w-full rounded-2xl bg-blue-600 text-lg font-bold text-white shadow-lg"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Activity size={16} /></div><span className="font-bold">Clinic<span className="text-blue-600">Flow</span></span></div>
          <span className="text-xs font-semibold text-emerald-600">● Live queue</span>
        </div>
        <div className="mt-10 text-center">
          <p className="text-sm font-semibold text-blue-600">{snapshot.clinic_name}</p>
          {snapshot.doctor_name && <p className="text-xs text-slate-500">{snapshot.doctor_name}</p>}
          <h1 className="mt-3 text-3xl font-bold">Your queue status</h1>
          <div className="mt-6 rounded-3xl bg-blue-600 p-7 text-center text-white shadow-2xl shadow-blue-200">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">My token</p>
            <div className="my-3 text-7xl font-bold tracking-tighter">#{snapshot.token_number}</div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs text-blue-100">CURRENTLY SERVING</p>
              <p className="mt-1 text-2xl font-bold">#{snapshot.current_token || '\u2014'}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-3xl font-bold">{snapshot.patients_ahead}</p><p className="mt-1 text-xs text-slate-500">patients ahead</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-3xl font-bold">~{snapshot.estimated_wait_minutes}m</p><p className="mt-1 text-xs text-slate-500">estimated wait</p></div>
          </div>
          <div className={`mt-6 flex items-center gap-3 rounded-2xl border p-4 text-left text-sm ${toneCls}`}>
            <Clock3 size={18} /><span><strong>{banner.title}</strong><br /><span className="text-xs">{banner.sub}</span></span>
          </div>
          <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-slate-400"><LockKeyhole size={13} />Your details stay private to the clinic</p>
        </div>
      </div>
    </div>
  )
}

return (
  <div className="min-h-screen bg-[#f7f9fc] px-5 py-8 text-slate-900">
    <div className="mx-auto max-w-md">
      <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Activity size={16} /></div><span className="font-bold">Clinic<span className="text-blue-600">Flow</span></span></div>
      <div className="mt-12">
        <p className="text-sm font-semibold text-blue-600">JOIN CLINIC QUEUE</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{clinic?.name || 'Loading clinic\u2026'}</h1>
        {clinic?.doctor_name && <p className="mt-1 text-sm text-slate-500">{clinic.doctor_name}</p>}
        <p className="mt-4 text-sm leading-6 text-slate-500">Enter your details and keep this page open for live updates. No app or account needed.</p>
        {clinic && clinic.status !== 'active' && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">This clinic is not accepting patients right now.</p>}
        <form onSubmit={joinQueue} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <input required placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400" />
            <input required placeholder="Age" type="number" min="0" max="130" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400" />
            <input required placeholder="Mobile number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400" />
            <input placeholder="City / area / locality (optional)" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400" />
          </div>
          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <button disabled={loading || !clinic || clinic.status !== 'active'} className="mt-5 h-12 w-full rounded-xl bg-blue-600 text-sm font-bold text-white shadow-xl shadow-blue-200 disabled:opacity-60">{loading ? 'Joining\u2026' : 'Get my token'}</button>
        </form>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-slate-400"><LockKeyhole size={13} />Only the clinic can see your personal details</p>
      </div>
    </div>
  </div>
)
}
