'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DEMO_USERS = [
  { email: 'ahmet@email.com',     label: 'Müşteri',      sub: 'Ahmet Yılmaz',        redirect: '/customer', color: '#ff6b35', icon: '👤' },
  { email: 'selin@email.com',     label: 'Firma Sahibi', sub: 'Aura Beauty Lounge',  redirect: '/business', color: '#3b82f6', icon: '🏢' },
  { email: 'admin@randevuapp.com',label: 'Admin',        sub: 'Süper Admin',          redirect: '/admin',    color: '#8b5cf6', icon: '⚙️' },
]

export default function LoginPage() {
  const router = useRouter()
  const [demoLoading, setDemoLoading] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('login') // 'login' | 'register'

  async function loginAsDemo(user) {
    setDemoLoading(user.email)
    setError('')
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: 'demo1234',
      })
      if (authErr) throw authErr

      const { data: { user: authUser } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, role, email')
        .eq('id', authUser.id)
        .maybeSingle()
      if (!profile) throw new Error('Demo profili bulunamadı')

      localStorage.setItem('randevu_user', JSON.stringify({
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        role: profile.role,
      }))
      router.push(user.redirect)
    } catch (e) {
      setError(e.message)
      setDemoLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full filter blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full filter blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-orange-500/40">📅</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">RandevuApp</h1>
          <p className="text-white/40 text-sm">Randevu yönetim platformu</p>
        </div>

        {/* Demo Giriş */}
        <div className="mb-4">
          <div className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-3 text-center">Demo Hesaplar</div>
          <div className="space-y-2">
            {DEMO_USERS.map(u => (
              <button key={u.email} onClick={() => loginAsDemo(u)} disabled={!!demoLoading}
                className="w-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] hover:border-white/[0.2] rounded-2xl p-4 text-left transition-all group disabled:opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: u.color + '33', border: `1px solid ${u.color}44` }}>
                    {demoLoading === u.email ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : u.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold text-sm">{u.label}</div>
                    <div className="text-white/35 text-xs mt-0.5">{u.sub} · {u.email}</div>
                  </div>
                  <div className="text-white/25 group-hover:text-white/50 transition-colors">→</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-sm px-4 py-3 rounded-xl mb-4 text-center">{error}</div>
        )}

        {/* Ayırıcı */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/25 text-xs font-semibold">VEYA</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Tab Seçici */}
        <div className="bg-white/[0.06] border border-white/[0.1] rounded-2xl p-1 flex mb-4">
          <button onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'login' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40 hover:text-white/70'}`}>
            Giriş Yap
          </button>
          <button onClick={() => setTab('register')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'register' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40 hover:text-white/70'}`}>
            Hesap Oluştur
          </button>
        </div>

        {/* Giriş / Kayıt Formu */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
          {tab === 'login' ? (
            <LoginForm />
          ) : (
            <RegisterForm onSuccess={() => setTab('login')} />
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-5">
          Randevuları kolayca yönetin · RandevuApp © 2025
        </p>
      </div>
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) { setError('E-posta ve şifre gerekli'); return }
    setLoading(true)
    setError('')
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      // Profili çekip role göre yönlendir
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (profile) {
        localStorage.setItem('randevu_user', JSON.stringify({
          id: user.id,
          email: user.email,
          name: profile.full_name,
          role: profile.role,
        }))
      }
      const redirectMap = { admin: '/admin', business_owner: '/business' }
      router.push(redirectMap[profile?.role] || '/customer')
    } catch (e) {
      setError(e.message === 'Invalid login credentials' ? 'E-posta veya şifre hatalı' : e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot() {
    if (!email) { setError('Şifre sıfırlamak için önce e-posta girin'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setForgotSent(true)
  }

  if (forgotSent) return (
    <div className="text-center py-4">
      <div className="text-3xl mb-3">📧</div>
      <div className="text-white font-bold mb-2">Şifre sıfırlama e-postası gönderildi!</div>
      <div className="text-white/50 text-sm">{email} adresine baktığınızdan emin olun.</div>
      <button onClick={() => setForgotSent(false)} className="mt-4 text-orange-400 text-sm hover:underline">Geri dön</button>
    </div>
  )

  return (
    <form onSubmit={handleLogin} className="space-y-3">
      <div>
        <label className="text-white/50 text-xs font-semibold block mb-1.5">E-posta</label>
        <input id="login-email" type="email" placeholder="ornek@email.com" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-xl text-white text-sm outline-none focus:border-orange-500/60 placeholder:text-white/25 transition-colors" />
      </div>
      <div>
        <label className="text-white/50 text-xs font-semibold block mb-1.5">Şifre</label>
        <div className="relative">
          <input id="login-password" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-xl text-white text-sm outline-none focus:border-orange-500/60 placeholder:text-white/25 pr-10 transition-colors" />
          <button type="button" onClick={() => setShowPass(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-sm">{showPass ? '🙈' : '👁️'}</button>
        </div>
      </div>
      {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</div>}
      <button type="submit" disabled={loading}
        className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors">
        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </button>
      <button type="button" onClick={handleForgot} disabled={loading}
        className="w-full text-center text-xs text-white/30 hover:text-white/50 transition-colors">
        Şifremi unuttum
      </button>
    </form>
  )
}

function RegisterForm({ onSuccess }) {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: Rol, 2: Kişisel, 3: Şifre
  const [role, setRole] = useState('customer')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', bizName: '', bizCategory: '', bizCity: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleRegister() {
    if (!form.name || !form.email || !form.password) { setError('Tüm zorunlu alanları doldurun'); return }
    if (form.password.length < 6) { setError('Şifre en az 6 karakter olmalı'); return }
    if (form.password !== form.confirmPassword) { setError('Şifreler eşleşmiyor'); return }
    if (role === 'business_owner' && (!form.bizName || !form.bizCategory || !form.bizCity)) { setError('Firma bilgilerini doldurun'); return }
    setLoading(true)
    setError('')
    try {
      // Supabase Auth ile kayıt
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.name } }
      })
      if (authError) throw authError
      const userId = authData.user.id

      // Profil — handle_new_user trigger zaten satırı insert eder, biz role+phone'u güncelliyoruz
      await supabase.from('profiles').upsert({
        id: userId,
        full_name: form.name,
        email: form.email,
        phone: form.phone || null,
        role: role === 'business_owner' ? 'business_owner' : 'customer',
        loyalty_points: 0,
        loyalty_tier: 'bronze',
      }, { onConflict: 'id' })

      // Firma sahibiyse işletme kaydı oluştur (inceleme bekletir)
      if (role === 'business_owner') {
        const emojis = { Güzellik: '💆', Kuaför: '✂️', Masaj: '🧘', Fitness: '🏋️', Sağlık: '💊' }
        await supabase.from('businesses').insert({
          name: form.bizName,
          category: form.bizCategory,
          city: form.bizCity,
          owner_id: userId,
          status: 'review',
          rating: 0,
          review_count: 0,
          monthly_appointments: 0,
          price_from: 0,
          plan: 'free',
          emoji: emojis[form.bizCategory] || '🏢',
        })
      }

      // localStorage'a kaydet
      localStorage.setItem('randevu_user', JSON.stringify({
        id: userId,
        email: form.email,
        name: form.name,
        role: role === 'business_owner' ? 'business_owner' : 'customer',
        loyalty_points: 0,
      }))
      // Başarı
      router.push(role === 'business_owner' ? '/business' : '/customer')
    } catch (e) {
      setError(e.message === 'User already registered' ? 'Bu e-posta zaten kayıtlı' : e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Adım göstergesi */}
      <div className="flex items-center gap-2 mb-5">
        {[1, 2, 3].filter(s => !(s === 3 && role === 'customer') || role === 'business_owner' ? true : s <= 2).map((s, i, arr) => (
          <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${step === s ? 'bg-orange-500 text-white' : step > s ? 'bg-orange-500/30 text-orange-400' : 'bg-white/10 text-white/30'}`}>{s}</div>
            {i < arr.length - 1 && <div className={`flex-1 h-px ${step > s ? 'bg-orange-500/40' : 'bg-white/10'}`} />}
          </div>
        ))}
        <div className="ml-auto text-white/30 text-xs">
          {step === 1 ? 'Hesap Türü' : step === 2 ? 'Bilgiler' : 'Firma'}
        </div>
      </div>

      {/* Adım 1: Rol Seçimi */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="text-white font-bold text-sm mb-3">Hesap türünüzü seçin</div>
          {[
            { value: 'customer', icon: '👤', title: 'Müşteri', desc: 'Randevu alın, işletme keşfedin' },
            { value: 'business_owner', icon: '🏢', title: 'Firma Sahibi', desc: 'İşletmenizi listeyin, randevuları yönetin' },
          ].map(r => (
            <button key={r.value} onClick={() => setRole(r.value)}
              className={`w-full p-3.5 rounded-xl border text-left transition-all ${role === r.value ? 'border-orange-500/60 bg-orange-500/10' : 'border-white/10 bg-white/[0.04] hover:border-white/20'}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{r.icon}</span>
                <div>
                  <div className="text-white font-bold text-sm">{r.title}</div>
                  <div className="text-white/40 text-xs">{r.desc}</div>
                </div>
                {role === r.value && <span className="ml-auto text-orange-500 text-lg">✓</span>}
              </div>
            </button>
          ))}
          <button onClick={() => setStep(2)}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm mt-2 transition-colors">
            Devam Et →
          </button>
        </div>
      )}

      {/* Adım 2: Kişisel Bilgiler */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="text-white font-bold text-sm mb-3">Hesap bilgileri</div>
          <div>
            <label className="text-white/50 text-xs font-semibold block mb-1.5">Ad Soyad *</label>
            <input id="reg-name" placeholder="Ad Soyad" value={form.name} onChange={e => f('name', e.target.value)}
              className="w-full px-3 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-xl text-white text-sm outline-none focus:border-orange-500/60 placeholder:text-white/25" />
          </div>
          <div>
            <label className="text-white/50 text-xs font-semibold block mb-1.5">E-posta *</label>
            <input id="reg-email" type="email" placeholder="ornek@email.com" value={form.email} onChange={e => f('email', e.target.value)}
              className="w-full px-3 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-xl text-white text-sm outline-none focus:border-orange-500/60 placeholder:text-white/25" />
          </div>
          <div>
            <label className="text-white/50 text-xs font-semibold block mb-1.5">Telefon</label>
            <input id="reg-phone" placeholder="+90 555 000 00 00" value={form.phone} onChange={e => f('phone', e.target.value)}
              className="w-full px-3 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-xl text-white text-sm outline-none focus:border-orange-500/60 placeholder:text-white/25" />
          </div>
          <div>
            <label className="text-white/50 text-xs font-semibold block mb-1.5">Şifre * (min. 6 karakter)</label>
            <input id="reg-password" type="password" placeholder="••••••••" value={form.password} onChange={e => f('password', e.target.value)}
              className="w-full px-3 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-xl text-white text-sm outline-none focus:border-orange-500/60 placeholder:text-white/25" />
          </div>
          <div>
            <label className="text-white/50 text-xs font-semibold block mb-1.5">Şifre Tekrar *</label>
            <input id="reg-confirm" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={e => f('confirmPassword', e.target.value)}
              className="w-full px-3 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-xl text-white text-sm outline-none focus:border-orange-500/60 placeholder:text-white/25" />
          </div>
          {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</div>}
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setStep(1); setError('') }} className="flex-1 py-2.5 border border-white/15 rounded-xl text-white/60 text-sm font-semibold hover:bg-white/5">← Geri</button>
            {role === 'customer' ? (
              <button onClick={handleRegister} disabled={loading}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm">
                {loading ? 'Kaydediliyor...' : 'Hesap Oluştur ✓'}
              </button>
            ) : (
              <button onClick={() => { if (!form.name || !form.email || !form.password) { setError('Zorunlu alanları doldurun'); return } if (form.password !== form.confirmPassword) { setError('Şifreler eşleşmiyor'); return } setError(''); setStep(3) }}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm">
                Devam Et →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Adım 3: Firma Bilgileri (sadece business_owner) */}
      {step === 3 && role === 'business_owner' && (
        <div className="space-y-3">
          <div className="text-white font-bold text-sm mb-1">Firma bilgileri</div>
          <div className="text-white/40 text-xs mb-3">Başvurunuz admin onayından geçecek.</div>
          <div>
            <label className="text-white/50 text-xs font-semibold block mb-1.5">Firma Adı *</label>
            <input placeholder="Örn: Güzellik Salonu" value={form.bizName} onChange={e => f('bizName', e.target.value)}
              className="w-full px-3 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-xl text-white text-sm outline-none focus:border-orange-500/60 placeholder:text-white/25" />
          </div>
          <div>
            <label className="text-white/50 text-xs font-semibold block mb-1.5">Kategori *</label>
            <select value={form.bizCategory} onChange={e => f('bizCategory', e.target.value)}
              className="w-full px-3 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-xl text-white text-sm outline-none focus:border-orange-500/60">
              <option value="">Kategori seçin</option>
              {['Güzellik', 'Kuaför', 'Masaj', 'Fitness', 'Sağlık'].map(c => <option key={c} value={c} style={{ background: '#1e293b' }}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-white/50 text-xs font-semibold block mb-1.5">Şehir / İlçe *</label>
            <input placeholder="Örn: Kadıköy, İstanbul" value={form.bizCity} onChange={e => f('bizCity', e.target.value)}
              className="w-full px-3 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-xl text-white text-sm outline-none focus:border-orange-500/60 placeholder:text-white/25" />
          </div>
          {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</div>}
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setStep(2); setError('') }} className="flex-1 py-2.5 border border-white/15 rounded-xl text-white/60 text-sm font-semibold hover:bg-white/5">← Geri</button>
            <button onClick={handleRegister} disabled={loading}
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm">
              {loading ? 'Kaydediliyor...' : 'Başvuruyu Gönder ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
