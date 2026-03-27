'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DEMO_USERS = [
  { email: 'ahmet@email.com',     label: '👤 Müşteri',      sub: 'Ahmet Yılmaz',        redirect: '/customer', color: '#ff6b35' },
  { email: 'selin@email.com',     label: '🏢 Firma Sahibi', sub: 'Aura Beauty Lounge',  redirect: '/business', color: '#3b82f6' },
  { email: 'admin@randevuapp.com',label: '⚙️ Admin',        sub: 'Süper Admin',          redirect: '/admin',    color: '#8b5cf6' },
]

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')

  async function loginAs(user) {
    setLoading(user.email)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, full_name, role, email')
        .eq('email', user.email)
        .maybeSingle()

      if (err) throw err
      if (!data) throw new Error('Kullanıcı bulunamadı')

      // Session bilgisini localStorage'a yaz
      localStorage.setItem('randevu_user', JSON.stringify({
        id: data.id,
        email: data.email,
        name: data.full_name,
        role: data.role,
      }))

      router.push(user.redirect)
    } catch (e) {
      setError(e.message)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full filter blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full filter blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-orange-500/40">📅</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">RandevuApp</h1>
          <p className="text-white/50 text-sm">Demo hesabıyla giriş yapın</p>
        </div>

        {/* Demo login kartları */}
        <div className="space-y-3 mb-6">
          {DEMO_USERS.map(u => (
            <button key={u.email} onClick={() => loginAs(u)} disabled={!!loading}
              className="w-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] hover:border-white/[0.2] rounded-2xl p-5 text-left transition-all group disabled:opacity-60">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 font-bold" style={{ background: u.color + '33', border: `1px solid ${u.color}44` }}>
                  {loading === u.email ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : u.label.split(' ')[0]}
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold text-sm">{u.label.split(' ').slice(1).join(' ')}</div>
                  <div className="text-white/40 text-xs mt-0.5">{u.sub} · {u.email}</div>
                </div>
                <div className="text-white/30 group-hover:text-white/60 transition-colors text-lg">→</div>
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-sm px-4 py-3 rounded-xl mb-4 text-center">{error}</div>
        )}

        {/* Manuel giriş */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
          <div className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">veya e-posta ile giriş</div>
          <ManualLogin onLogin={(email, redirect) => loginAs({ email, redirect, label: '', sub: '', color: '#ff6b35' })} />
        </div>

        <p className="text-center text-white/25 text-xs mt-6">
          Bu bir demo uygulamadır · Gerçek şifre sistemi bağlanabilir
        </p>
      </div>
    </div>
  )
}

function ManualLogin({ onLogin }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    // Role'e göre yönlendir
    const redirectMap = {
      'admin@randevuapp.com': '/admin',
      'selin@email.com': '/business',
    }
    const redirect = redirectMap[email] || '/customer'
    await onLogin(email, redirect)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        placeholder="E-posta adresiniz"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="flex-1 px-3 py-2.5 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white text-sm outline-none focus:border-orange-500/60 placeholder:text-white/30"
      />
      <button type="submit" disabled={loading}
        className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl disabled:opacity-60 transition-colors whitespace-nowrap">
        {loading ? '...' : 'Giriş'}
      </button>
    </form>
  )
}
