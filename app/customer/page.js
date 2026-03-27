'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const CAT_COLORS = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444']
const STRIP_COLOR = { confirmed:'#ff6b35', pending:'#f59e0b', completed:'#9ca3af', cancelled:'#ef4444' }

function Spinner() {
  return <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin flex-shrink-0" />
}
function StatusBadge({ s }) {
  const cfg = {
    confirmed: 'bg-green-50 text-green-700 border-green-200',
    pending:   'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-gray-100 text-gray-600 border-gray-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
  }
  const lbl = { confirmed:'✓ Onaylı', pending:'⏳ Bekliyor', completed:'Tamamlandı', cancelled:'İptal' }
  return <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border ${cfg[s] || cfg.completed}`}>{lbl[s] || s}</span>
}

export default function CustomerPage() {
  const [tab, setTab] = useState('home')
  const [businesses, setBusinesses] = useState([])
  const [appointments, setAppointments] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState({ biz:true, appts:false, profile:false })
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    supabase.from('businesses').select('*').eq('status','active').order('rating',{ascending:false})
      .then(({ data }) => { setBusinesses(data||[]); setLoading(l=>({...l,biz:false})) })
  }, [])

  useEffect(() => {
    if (tab !== 'appts') return
    setLoading(l=>({...l,appts:true}))
    supabase.from('profiles').select('id').eq('email','ahmet@email.com').single()
      .then(async ({ data:prof }) => {
        if (!prof) { setLoading(l=>({...l,appts:false})); return }
        const { data } = await supabase.from('appointments')
          .select('*, businesses(name,emoji), services(name,duration_min), staff(name)')
          .eq('profile_id', prof.id).order('appointment_date')
        setAppointments(data||[])
        setLoading(l=>({...l,appts:false}))
      })
  }, [tab])

  useEffect(() => {
    if (tab !== 'profile') return
    setLoading(l=>({...l,profile:true}))
    supabase.from('profiles').select('*').eq('email','ahmet@email.com').single()
      .then(({ data }) => { setProfile(data); setLoading(l=>({...l,profile:false})) })
  }, [tab])

  async function cancelAppt(id) {
    await supabase.from('appointments').update({status:'cancelled'}).eq('id',id)
    setAppointments(prev => prev.map(a => a.id===id ? {...a,status:'cancelled'} : a))
    showToast('Randevu iptal edildi.')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-xl">✅ {toast}</div>
      )}
      <nav className="bg-slate-800 h-14 flex items-center px-6 gap-3 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2 mr-3">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-sm">📅</div>
          <span className="text-white font-bold">RandevuApp</span>
        </Link>
        {[['home','Keşfet'],['appts','Randevularım'],['profile','Profilim']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab===k?'bg-white/[0.12] text-white':'text-white/50 hover:text-white/80 hover:bg-white/[0.07]'}`}>{l}</button>
        ))}
        <div className="ml-auto w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white border-2 border-white/20">A</div>
      </nav>

      {tab === 'home' && (
        <div className="flex-1">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 py-12 px-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 bg-orange-500/10 rounded-full filter blur-3xl" />
            <div className="max-w-4xl mx-auto relative z-10">
              <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">Randevunuzu Kolayca Alın</h1>
              <p className="text-white/60 mb-6">Binlerce işletme arasından arayın, anında rezervasyon yapın.</p>
              <div className="flex bg-white rounded-xl overflow-hidden shadow-xl max-w-lg">
                <input className="flex-1 px-4 py-3 text-sm outline-none" placeholder="İşletme, hizmet veya konum ara..." />
                <button className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors">Ara</button>
              </div>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-6 py-8">
            <h2 className="text-lg font-bold mb-5">📍 Yakınındaki İşletmeler</h2>
            {loading.biz ? (
              <div className="flex items-center justify-center gap-3 text-gray-400 py-16"><Spinner /> Yükleniyor...</div>
            ) : businesses.length === 0 ? (
              <div className="text-center py-16 text-gray-400">İşletme bulunamadı.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {businesses.map((b,i) => (
                  <div key={b.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="h-28 flex items-center justify-center text-5xl relative" style={{background:`${CAT_COLORS[i%CAT_COLORS.length]}18`}}>
                      {b.emoji||'🏢'}
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">● Müsait</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="font-bold text-sm mb-1">{b.name}</div>
                      <div className="text-gray-500 text-xs mb-3">{b.category} · {b.city}</div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-amber-500 text-xs font-bold">★ {b.rating}</span>
                        <span className="text-gray-400 text-xs">({b.review_count} yorum)</span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="text-sm text-gray-500">den <b className="text-gray-900">₺{b.price_from}</b></div>
                        <button onClick={() => setTab('appts')} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">Randevu Al</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'appts' && (
        <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div><h2 className="text-xl font-bold">Randevularım</h2><p className="text-gray-500 text-sm">Ahmet Yılmaz</p></div>
            <button className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Yeni Randevu</button>
          </div>
          {loading.appts ? (
            <div className="flex items-center justify-center gap-3 text-gray-400 py-16"><Spinner /> Yükleniyor...</div>
          ) : appointments.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
              <div className="text-4xl mb-3">📅</div>
              <div className="text-gray-400 font-semibold">Henüz randevu bulunmuyor</div>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map(a => (
                <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="w-1 h-12 rounded-full flex-shrink-0" style={{background:STRIP_COLOR[a.status]||'#ccc'}} />
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{background:`${STRIP_COLOR[a.status]||'#ccc'}22`}}>
                    {a.businesses?.emoji||'🏢'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{a.businesses?.name}</div>
                    <div className="text-gray-500 text-xs">{a.staff?.name} · {a.services?.name}</div>
                    <div className="text-xs font-semibold text-gray-700 mt-1">
                      📅 {new Date(a.appointment_date).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})} · ⏰ {String(a.appointment_time).slice(0,5)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <StatusBadge s={a.status} />
                    <div className="flex gap-1.5">
                      {['pending','confirmed'].includes(a.status) && (
                        <button onClick={() => cancelAppt(a.id)} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200">İptal</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'profile' && (
        <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
          <h2 className="text-xl font-bold mb-6">Profilim</h2>
          {loading.profile || !profile ? (
            <div className="flex items-center justify-center gap-3 text-gray-400 py-16"><Spinner /> Yükleniyor...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-2xl font-extrabold text-white mx-auto mb-4 border-4 border-orange-100">
                    {profile.full_name?.[0]}
                  </div>
                  <div className="font-bold text-lg mb-1">{profile.full_name}</div>
                  <div className="text-gray-500 text-sm mb-4">{profile.email}</div>
                  <span className="inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">⭐ Gold Üye</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  {[['Ad Soyad',profile.full_name],['E-posta',profile.email],['Telefon',profile.phone||'—']].map(([l,v]) => (
                    <div key={l} className="flex justify-between py-2.5 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-500">{l}</span>
                      <span className="text-sm font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 space-y-4">
                <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{background:'linear-gradient(135deg,#ff6b35,#ff9a50)'}}>
                  <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
                  <div className="text-xs font-semibold opacity-75 uppercase tracking-wider mb-1">Toplam Puan</div>
                  <div className="text-5xl font-extrabold leading-none mb-1">{profile.loyalty_points.toLocaleString()}</div>
                  <div className="text-sm opacity-75 mb-4">≈ ₺{Math.floor(profile.loyalty_points/10)} indirim hakkı</div>
                  <div className="flex justify-between text-xs opacity-70 mb-1.5">
                    <span>Platinum'a {Math.max(0,3000-profile.loyalty_points)} puan kaldı</span>
                    <span>{profile.loyalty_points}/3.000</span>
                  </div>
                  <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
                    <div className="h-full bg-white/80 rounded-full" style={{width:`${Math.min(100,Math.round(profile.loyalty_points/3000*100))}%`}} />
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
