'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const COLORS = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444']

function Spin() {
  return <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
}

function Badge({ status }) {
  const map = {
    confirmed: ['bg-green-50 text-green-700 border-green-200', '✓ Onaylı'],
    pending:   ['bg-amber-50 text-amber-700 border-amber-200', '⏳ Bekliyor'],
    completed: ['bg-gray-100 text-gray-600 border-gray-200', 'Tamamlandı'],
    cancelled: ['bg-red-50 text-red-600 border-red-200', 'İptal'],
  }
  const [cls, lbl] = map[status] || map.completed
  return <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border ${cls}`}>{lbl}</span>
}

export default function CustomerPage() {
  const [tab, setTab] = useState('home')
  const [businesses, setBusinesses] = useState([])
  const [appointments, setAppointments] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const toast3 = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  // İşletmeler
  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('status', 'active')
          .order('rating', { ascending: false })
        if (error) throw error
        setBusinesses(data || [])
      } catch (e) {
        console.error('businesses:', e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Randevular
  useEffect(() => {
    if (tab !== 'appts') return
    async function load() {
      setLoading(true)
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', 'ahmet@email.com')
          .maybeSingle()
        
        if (!prof) { setAppointments([]); return }

        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id, appointment_date, appointment_time, status, price,
            businesses(name, emoji),
            services(name, duration_min),
            staff(name)
          `)
          .eq('profile_id', prof.id)
          .order('appointment_date', { ascending: false })
        
        if (error) throw error
        setAppointments(data || [])
      } catch (e) {
        console.error('appointments:', e.message)
        setAppointments([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tab])

  // Profil
  useEffect(() => {
    if (tab !== 'profile') return
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', 'ahmet@email.com')
          .maybeSingle()
        if (error) throw error
        setProfile(data)
      } catch (e) {
        console.error('profile:', e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tab])

  async function cancelAppt(id) {
    try {
      const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
      if (error) throw error
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
      toast3('Randevu iptal edildi ✅')
    } catch (e) {
      toast3('Hata: ' + e.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-xl animate-bounce">
          {toast}
        </div>
      )}

      {/* NAV */}
      <nav className="bg-slate-800 h-14 flex items-center px-6 gap-3 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-sm">📅</div>
          <span className="text-white font-bold text-sm">RandevuApp</span>
        </Link>
        {[['home','🏠 Keşfet'],['appts','📅 Randevularım'],['profile','👤 Profilim']].map(([k,l]) => (
          <button key={k} onClick={() => { setLoading(true); setTab(k) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              tab === k ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}>{l}</button>
        ))}
        <div className="ml-auto w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white border-2 border-white/20">A</div>
      </nav>

      {/* HOME */}
      {tab === 'home' && (
        <>
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 py-14 px-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="max-w-4xl mx-auto relative z-10">
              <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">Randevunuzu Kolayca Alın</h1>
              <p className="text-white/60 mb-6 text-sm">Binlerce işletme arasından arayın, anında rezervasyon yapın.</p>
              <div className="flex bg-white rounded-xl overflow-hidden shadow-xl max-w-lg">
                <input className="flex-1 px-4 py-3 text-sm outline-none" placeholder="İşletme, hizmet veya konum ara..." />
                <button className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors">Ara</button>
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                {['✦ Tümü','💆 Güzellik','✂️ Kuaför','🧘 Masaj','🏋️ Fitness'].map(c => (
                  <button key={c} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-white/75 hover:bg-white/20 transition-all">{c}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-6 py-8 w-full">
            <h2 className="font-bold text-lg mb-5">📍 Yakınındaki İşletmeler</h2>
            {loading ? (
              <div className="flex items-center justify-center gap-3 text-gray-400 py-16"><Spin /> Yükleniyor...</div>
            ) : businesses.length === 0 ? (
              <div className="text-center py-16 text-gray-400">Henüz işletme eklenmemiş.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {businesses.map((b, i) => (
                  <div key={b.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer">
                    <div className="h-28 flex items-center justify-center text-5xl relative" style={{ background: `${COLORS[i % COLORS.length]}15` }}>
                      {b.emoji || '🏢'}
                      <div className="absolute top-2 right-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">● Müsait</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="font-bold text-sm mb-0.5">{b.name}</div>
                      <div className="text-gray-500 text-xs mb-2">{b.category} · {b.city}</div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-amber-500 text-xs font-bold">★ {b.rating}</span>
                        <span className="text-gray-400 text-xs">({b.review_count} yorum)</span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="text-sm text-gray-500">den <b className="text-gray-900">₺{b.price_from}</b></div>
                        <button onClick={() => setTab('appts')}
                          className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                          Randevu Al
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* RANDEVULARIM */}
      {tab === 'appts' && (
        <div className="max-w-3xl mx-auto w-full px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-xl font-bold">Randevularım</h1><p className="text-gray-500 text-sm">Ahmet Yılmaz</p></div>
            <button className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Yeni Randevu</button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-3 text-gray-400 py-16"><Spin /> Yükleniyor...</div>
          ) : appointments.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
              <div className="text-4xl mb-3">📅</div>
              <div className="text-gray-400 font-semibold">Henüz randevu bulunmuyor</div>
              <button onClick={() => setTab('home')} className="mt-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-6 py-2.5 rounded-lg transition-colors">İşletme Bul</button>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map(a => {
                const stripColor = { confirmed:'#ff6b35', pending:'#f59e0b', completed:'#9ca3af', cancelled:'#ef4444' }[a.status] || '#ccc'
                return (
                  <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="w-1 h-14 rounded-full flex-shrink-0" style={{ background: stripColor }} />
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: stripColor + '22' }}>
                      {a.businesses?.emoji || '🏢'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{a.businesses?.name || '—'}</div>
                      <div className="text-gray-500 text-xs">{a.staff?.name || 'Personel'} · {a.services?.name || '—'}</div>
                      <div className="text-xs font-semibold text-gray-700 mt-1">
                        📅 {new Date(a.appointment_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {' · '}⏰ {String(a.appointment_time).slice(0, 5)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge status={a.status} />
                      {['pending', 'confirmed'].includes(a.status) && (
                        <button onClick={() => cancelAppt(a.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                          İptal Et
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* PROFİL */}
      {tab === 'profile' && (
        <div className="max-w-4xl mx-auto w-full px-6 py-8">
          <h1 className="text-xl font-bold mb-6">Profilim</h1>
          {loading || !profile ? (
            <div className="flex items-center justify-center gap-3 text-gray-400 py-16"><Spin /> Yükleniyor...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-2xl font-extrabold text-white mx-auto mb-4 border-4 border-orange-100">
                    {profile.full_name?.[0] || '?'}
                  </div>
                  <div className="font-bold text-lg mb-1">{profile.full_name}</div>
                  <div className="text-gray-500 text-sm mb-4">{profile.email}</div>
                  <div className="flex gap-2 justify-center">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      ⭐ {profile.loyalty_tier?.charAt(0).toUpperCase() + profile.loyalty_tier?.slice(1)} Üye
                    </span>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  {[['Telefon', profile.phone || '—'], ['Rol', 'Müşteri']].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-2.5 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-500">{l}</span>
                      <span className="text-sm font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 space-y-4">
                <div className="rounded-2xl p-5 text-white relative overflow-hidden shadow-md" style={{ background: 'linear-gradient(135deg,#ff6b35,#ff9a50)' }}>
                  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
                  <div className="text-xs font-semibold opacity-80 uppercase tracking-wider mb-1">Toplam Puan</div>
                  <div className="text-5xl font-extrabold leading-none mb-1">{profile.loyalty_points?.toLocaleString() || 0}</div>
                  <div className="text-sm opacity-75 mb-4">≈ ₺{Math.floor((profile.loyalty_points || 0) / 10)} indirim hakkı</div>
                  <div className="flex justify-between text-xs opacity-70 mb-1.5">
                    <span>Platinum'a {Math.max(0, 3000 - (profile.loyalty_points || 0))} puan kaldı</span>
                    <span>{profile.loyalty_points || 0}/3.000</span>
                  </div>
                  <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
                    <div className="h-full bg-white/80 rounded-full transition-all" style={{ width: `${Math.min(100, Math.round(((profile.loyalty_points || 0) / 3000) * 100))}%` }} />
                  </div>
                  <div className="absolute top-4 right-4 bg-white/20 border border-white/30 text-xs font-bold px-3 py-1 rounded-full">🥇 Gold</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[['Kazanılan','+320','text-green-600'],['Harcanan','-150','text-red-500'],['İşlem','12','text-gray-800']].map(([l,v,c]) => (
                    <div key={l} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
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
