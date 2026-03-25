'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const catColors = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444']
const catEmojis = { Güzellik:'💆', Kuaför:'✂️', Masaj:'🧘', Fitness:'🏋️', Sağlık:'💊' }
const statusMap = {
  confirmed: <span className="badge-green">✓ Onaylı</span>,
  pending:   <span className="badge-amber">⏳ Bekliyor</span>,
  completed: <span className="badge-gray">Tamamlandı</span>,
  cancelled: <span className="badge-red">İptal</span>,
}

function Avatar({ name, color, size = 8 }) {
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
      style={{ background: color }}>
      {name?.[0] || '?'}
    </div>
  )
}

function Spinner() {
  return <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
}

export default function CustomerPage() {
  const [tab, setTab] = useState('home')
  const [businesses, setBusinesses] = useState([])
  const [appointments, setAppointments] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => { loadBusinesses() }, [])
  useEffect(() => { if (tab === 'appts') loadAppts(); if (tab === 'profile') loadProfile() }, [tab])

  async function loadBusinesses() {
    setLoading(true)
    const { data } = await supabase.from('businesses').select('*').eq('status','active').order('rating', { ascending: false })
    setBusinesses(data || [])
    setLoading(false)
  }

  async function loadAppts() {
    setLoading(true)
    const { data: prof } = await supabase.from('profiles').select('id').eq('email','ahmet@email.com').single()
    if (!prof) { setLoading(false); return }
    const { data } = await supabase.from('appointments')
      .select('*, businesses(name,emoji,category), services(name,duration_min), staff(name)')
      .eq('profile_id', prof.id)
      .order('appointment_date', { ascending: true })
    setAppointments(data || [])
    setLoading(false)
  }

  async function loadProfile() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('email','ahmet@email.com').single()
    setProfile(data)
    setLoading(false)
  }

  async function cancelAppt(id) {
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
    showToast('Randevu iptal edildi.')
    loadAppts()
  }

  const pct = profile ? Math.min(100, Math.round((profile.loyalty_points / 3000) * 100)) : 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg transition-all ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {/* Top Nav */}
      <nav className="bg-slate-800 h-14 flex items-center px-6 gap-4 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-sm">📅</div>
          <span className="text-white font-bold text-base">RandevuApp</span>
        </Link>
        {[['home','Keşfet'],['appts','Randevularım'],['profile','Profilim']].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab===key ? 'bg-white/[0.12] text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.07]'}`}>
            {label}
          </button>
        ))}
        <div className="ml-auto w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-white border-2 border-white/20">A</div>
      </nav>

      {/* HOME */}
      {tab === 'home' && (
        <>
          {/* Hero */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 py-14 px-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 bg-orange-500/10 rounded-full filter blur-3xl" />
            <div className="max-w-4xl mx-auto relative z-10">
              <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">Randevunuzu Kolayca Alın</h1>
              <p className="text-white/60 mb-7 text-base">Binlerce işletme arasından arayın, anında rezervasyon yapın.</p>
              <div className="flex bg-white rounded-xl overflow-hidden shadow-xl max-w-lg">
                <input className="flex-1 px-4 py-3.5 text-sm outline-none text-gray-700" placeholder="İşletme, hizmet veya konum ara..." />
                <button className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors">Ara</button>
              </div>
              <div className="flex gap-2 mt-5 flex-wrap">
                {['✦ Tümü','💆 Güzellik','✂️ Kuaför','🧘 Masaj','🏋️ Fitness','💊 Sağlık'].map(c => (
                  <button key={c} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/[0.12] border border-white/[0.18] text-white/75 hover:bg-white/[0.2] transition-all">{c}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Business grid */}
          <div className="max-w-6xl mx-auto w-full px-6 py-8">
            <h2 className="text-lg font-bold mb-5">📍 Yakınındaki İşletmeler</h2>
            {loading ? (
              <div className="flex items-center gap-3 text-gray-400 py-12 justify-center"><Spinner /> Yükleniyor...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {businesses.map((b, i) => (
                  <div key={b.id} className="card overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer">
                    <div className="h-28 flex items-center justify-center text-5xl relative" style={{ background: `${catColors[i%catColors.length]}18` }}>
                      {b.emoji || catEmojis[b.category] || '🏢'}
                      <div className="absolute top-2.5 right-2.5">
                        <span className="badge-green">● Müsait</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="font-bold text-base mb-1">{b.name}</div>
                      <div className="text-gray-500 text-xs mb-3">{b.category} · {b.city}</div>
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="text-amber-500 text-xs font-bold">★ {b.rating}</span>
                        <span className="text-gray-400 text-xs">({b.review_count} yorum)</span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="text-sm text-gray-500">den <b className="text-gray-900 text-base">₺{b.price_from}</b></div>
                        <button onClick={() => setTab('appts')} className="btn-primary btn-sm">Randevu Al</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* APPOINTMENTS */}
      {tab === 'appts' && (
        <div className="max-w-3xl mx-auto w-full px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Randevularım</h2>
              <p className="text-gray-500 text-sm mt-0.5">Ahmet Yılmaz · ahmet@email.com</p>
            </div>
            <button className="btn-primary btn-sm">+ Yeni Randevu</button>
          </div>
          {loading ? (
            <div className="flex items-center gap-3 text-gray-400 py-12 justify-center"><Spinner /> Yükleniyor...</div>
          ) : appointments.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">Henüz randevu bulunmuyor.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {appointments.map(a => {
                const stripColor = { confirmed:'#ff6b35', pending:'#f59e0b', completed:'#9ca3af', cancelled:'#ef4444' }[a.status] || '#ccc'
                return (
                  <div key={a.id} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-1 h-14 rounded-full flex-shrink-0" style={{ background: stripColor }} />
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${stripColor}22` }}>
                      {a.businesses?.emoji || '🏢'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{a.businesses?.name}</div>
                      <div className="text-gray-500 text-xs">{a.staff?.name} · {a.services?.name}</div>
                      <div className="text-xs font-semibold text-gray-700 mt-1">
                        📅 {new Date(a.appointment_date).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}
                        {' · '}⏰ {String(a.appointment_time).slice(0,5)}
                        {a.services?.duration_min && ` · ${a.services.duration_min} dk`}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {statusMap[a.status]}
                      <div className="flex gap-2">
                        {a.status === 'confirmed' && (
                          <button className="btn-outline btn-sm text-xs">📱 QR</button>
                        )}
                        {['pending','confirmed'].includes(a.status) && (
                          <button onClick={() => cancelAppt(a.id)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                            İptal
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* PROFILE */}
      {tab === 'profile' && (
        <div className="max-w-4xl mx-auto w-full px-6 py-8">
          <h2 className="text-xl font-bold mb-6">Profilim</h2>
          {loading || !profile ? (
            <div className="flex items-center gap-3 text-gray-400 py-12 justify-center"><Spinner /> Yükleniyor...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                {/* Profile card */}
                <div className="card p-6 text-center">
                  <div className="w-18 h-18 rounded-full bg-orange-500 flex items-center justify-center text-3xl font-extrabold text-white mx-auto mb-4 border-4 border-orange-100"
                    style={{width:72,height:72}}>
                    {profile.full_name?.[0]}
                  </div>
                  <div className="font-bold text-lg mb-1">{profile.full_name}</div>
                  <div className="text-gray-500 text-sm mb-4">{profile.email}</div>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <span className="badge-orange">⭐ Gold Üye</span>
                  </div>
                </div>
                {/* Info */}
                <div className="card p-4">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Hesap Bilgileri</div>
                  {[['Ad Soyad', profile.full_name],['E-posta', profile.email],['Telefon', profile.phone || '—']].map(([l,v]) => (
                    <div key={l} className="flex justify-between py-2.5 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-500">{l}</span>
                      <span className="text-sm font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                {/* Points card */}
                <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{background:'linear-gradient(135deg,#ff6b35 0%,#ff9a50 100%)'}}>
                  <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
                  <div className="text-xs font-semibold opacity-75 mb-1 uppercase tracking-wider">Toplam Puan</div>
                  <div className="text-5xl font-extrabold tracking-tight leading-none mb-1">{profile.loyalty_points.toLocaleString()}</div>
                  <div className="text-sm opacity-75 mb-4">≈ ₺{Math.floor(profile.loyalty_points/10)} indirim hakkı</div>
                  <div className="flex justify-between text-xs opacity-70 mb-1.5">
                    <span>Platinum'a {3000-profile.loyalty_points} puan kaldı</span>
                    <span>{profile.loyalty_points}/3.000</span>
                  </div>
                  <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
                    <div className="h-full bg-white/80 rounded-full transition-all" style={{width:`${pct}%`}} />
                  </div>
                  <div className="absolute top-4 right-16 bg-white/20 border border-white/30 text-white text-xs font-bold px-3 py-1 rounded-full">
                    🥇 Gold
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[['Kazanılan','+320','text-green-600'],['Harcanan','-150','text-red-500'],['İşlem','12','text-gray-800']].map(([l,v,c]) => (
                    <div key={l} className="card p-4 text-center">
                      <div className={`text-2xl font-extrabold ${c} mb-1`}>{v}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
