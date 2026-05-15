'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function normalizePhone(p) {
  return String(p || '').replace(/\D/g, '').replace(/^0/, '').replace(/^90/, '')
}

export default function StaffLoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function login() {
    setError('')
    if (!phone.trim() || !password.trim()) { setError('Telefon ve şifre zorunlu'); return }
    setLoading(true)
    try {
      // RPC: tüm staff tablosunu çekmeden server-side eşleştirme yapar
      const { data, error } = await supabase.rpc('staff_login', {
        p_phone: phone,
        p_password: password,
      })
      if (error) throw error
      const match = Array.isArray(data) ? data[0] : data
      if (!match) { setError('Telefon veya şifre hatalı'); setLoading(false); return }
      // Şifre, randevu update RPC'leri için sessionStorage'da tutulur
      sessionStorage.setItem('randevu_staff_pw', password)
      localStorage.setItem('randevu_staff', JSON.stringify({
        id: match.id,
        name: match.name,
        phone: match.phone,
        business_id: match.business_id,
        avatar_url: match.avatar_url,
        speciality: match.speciality,
        business_name: match.business_name,
        business_emoji: match.business_emoji,
      }))
      router.push('/staff')
    } catch (e) {
      setError(e.message || 'Giriş hatası')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full filter blur-3xl" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-blue-500/40">👤</div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">Personel Girişi</h1>
          <p className="text-white/40 text-sm">Telefon ve şifrenizle giriş yapın</p>
        </div>

        <div className="bg-white/[0.06] border border-white/[0.1] rounded-2xl p-5 space-y-3">
          <div>
            <label className="text-white/60 text-xs font-bold block mb-1.5">Telefon</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+90 555 000 00 00" autoComplete="tel"
              className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-white/60 text-xs font-bold block mb-1.5">Şifre</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}
              placeholder="••••••" autoComplete="current-password"
              className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white text-sm outline-none focus:border-blue-400" />
          </div>
          {error && <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-xs px-3 py-2 rounded-lg">{error}</div>}
          <button onClick={login} disabled={loading}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors">
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap →'}
          </button>
        </div>

        <div className="text-center mt-5">
          <button onClick={()=>router.push('/login')} className="text-white/40 hover:text-white/70 text-xs">
            ← Müşteri / Firma Girişi
          </button>
        </div>
      </div>
    </div>
  )
}
