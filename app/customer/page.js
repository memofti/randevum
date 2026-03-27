'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const COLORS = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444']

function Spin() { return <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin flex-shrink-0" /> }
function Bdg({ s }) {
  const m = { confirmed:['bg-green-50 text-green-700 border-green-200','✓ Onaylı'], pending:['bg-amber-50 text-amber-700 border-amber-200','⏳ Bekliyor'], completed:['bg-gray-100 text-gray-600 border-gray-200','Tamamlandı'], cancelled:['bg-red-50 text-red-600 border-red-200','İptal'] }
  const [c,l] = m[s]||m.completed
  return <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border ${c}`}>{l}</span>
}

export default function CustomerPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('home')
  const [businesses, setBusinesses] = useState([])
  const [catFilter, setCatFilter] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [appointments, setAppointments] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  // İşletme detay modal
  const [detailBiz, setDetailBiz] = useState(null)
  const [bizServices, setBizServices] = useState([])
  const [bizStaff, setBizStaff] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  // Randevu al modal
  const [bookModal, setBookModal] = useState(false)
  const [bookForm, setBookForm] = useState({ service:'', staff:'', date:'', time:'10:00' })
  const [booking, setBooking] = useState(false)

  const toast3 = (m) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  // Auth
  useEffect(() => {
    try {
      const raw = localStorage.getItem('randevu_user')
      if (!raw) { router.push('/login'); return }
      setUser(JSON.parse(raw))
    } catch { router.push('/login') }
  }, [router])

  // İşletmeler — user'dan bağımsız, sayfa açılır açılmaz yükle
  useEffect(() => {
    supabase.from('businesses').select('*').eq('status','active').order('rating',{ascending:false})
      .then(({ data }) => { setBusinesses(data||[]); setLoading(false) })
  }, [])

  // Randevular
  useEffect(() => {
    if (tab !== 'appts' || !user) return
    setLoading(true)
    supabase.from('appointments')
      .select('id, appointment_date, appointment_time, status, price, businesses(name,emoji), services(name,duration_min), staff(name)')
      .eq('profile_id', user.id)
      .order('appointment_date', { ascending: false })
      .then(({ data }) => { setAppointments(data||[]); setLoading(false) })
  }, [tab, user])

  // Profil
  useEffect(() => {
    if (tab !== 'profile' || !user) return
    setLoading(true)
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      .then(({ data }) => { setProfile(data); setLoading(false) })
  }, [tab, user])

  // İşletme detay aç
  async function openDetail(biz) {
    setDetailBiz(biz)
    setDetailLoading(true)
    const [{ data: svcs }, { data: stff }] = await Promise.all([
      supabase.from('services').select('*').eq('business_id', biz.id).eq('status','active'),
      supabase.from('staff').select('*').eq('business_id', biz.id),
    ])
    setBizServices(svcs||[])
    setBizStaff(stff||[])
    setDetailLoading(false)
  }

  // Randevu al
  async function bookAppt() {
    if (!bookForm.service || !bookForm.date) { toast3('❌ Hizmet ve tarih seçin'); return }
    setBooking(true)
    try {
      const svc = bizServices.find(s => s.id === bookForm.service)
      await supabase.from('appointments').insert({
        business_id: detailBiz.id,
        profile_id: user.id,
        service_id: bookForm.service,
        staff_id: bookForm.staff || null,
        appointment_date: bookForm.date,
        appointment_time: bookForm.time,
        status: 'pending',
        price: svc?.price || 0,
      })
      setBookModal(false)
      setDetailBiz(null)
      setBookForm({ service:'', staff:'', date:'', time:'10:00' })
      toast3('✅ Randevu talebiniz alındı! Onay bekleniyor.')
    } catch (e) {
      toast3('❌ ' + e.message)
    } finally {
      setBooking(false)
    }
  }

  async function cancelAppt(id) {
    await supabase.from('appointments').update({ status:'cancelled' }).eq('id', id)
    setAppointments(p => p.map(a => a.id===id ? {...a,status:'cancelled'} : a))
    toast3('Randevu iptal edildi')
  }

  const filteredBiz = businesses.filter(b => {
    const matchCat = !catFilter || b.category === catFilter
    const matchQ = !searchQ || b.name.toLowerCase().includes(searchQ.toLowerCase()) || b.city.toLowerCase().includes(searchQ.toLowerCase())
    return matchCat && matchQ
  })
  const cats = [...new Set(businesses.map(b => b.category))]
  const upcomingAppts = appointments.filter(a => ['pending','confirmed'].includes(a.status))
  const pastAppts = appointments.filter(a => ['completed','cancelled'].includes(a.status))
  const pct = profile ? Math.min(100, Math.round((profile.loyalty_points||0)/3000*100)) : 0

  if (!user) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/20 border-t-orange-500 rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-xl animate-in slide-in-from-bottom-2">{toast}</div>}

      {/* İşletme Detay Modal */}
      {detailBiz && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => e.target===e.currentTarget && setDetailBiz(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="relative h-36 flex items-center justify-center text-6xl flex-shrink-0" style={{ background: `${COLORS[businesses.findIndex(b=>b.id===detailBiz.id)%COLORS.length]}18` }}>
              {detailBiz.emoji||'🏢'}
              <button onClick={() => setDetailBiz(null)} className="absolute top-4 right-4 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm">✕</button>
              <div className="absolute top-4 left-4"><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">● Müsait</span></div>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">{detailBiz.name}</h2>
                  <div className="text-gray-500 text-sm mt-0.5">{detailBiz.category} · {detailBiz.city}</div>
                </div>
                <div className="text-right">
                  <div className="text-amber-500 font-bold">★ {detailBiz.rating}</div>
                  <div className="text-gray-400 text-xs">({detailBiz.review_count} yorum)</div>
                </div>
              </div>
              {detailBiz.description && <p className="text-gray-600 text-sm mb-4 leading-relaxed">{detailBiz.description}</p>}
              <div className="flex gap-3 mb-5 text-sm">
                {detailBiz.phone && <a href={`tel:${detailBiz.phone}`} className="flex items-center gap-1.5 text-orange-500 font-semibold"><span>📞</span>{detailBiz.phone}</a>}
                {detailBiz.address && <span className="text-gray-500 flex items-center gap-1.5"><span>📍</span>{detailBiz.address}</span>}
              </div>

              {detailLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-400"><Spin /> Yükleniyor...</div>
              ) : (
                <>
                  {/* Hizmetler */}
                  <div className="mb-5">
                    <div className="font-bold text-sm mb-3">Hizmetler</div>
                    {bizServices.length === 0 ? <div className="text-gray-400 text-sm">Hizmet bilgisi yok</div> : (
                      <div className="grid grid-cols-1 gap-2">
                        {bizServices.map(s => (
                          <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div><div className="font-semibold text-sm">{s.name}</div><div className="text-gray-500 text-xs">{s.duration_min} dk</div></div>
                            <div className="font-bold text-orange-500">₺{s.price}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Personel */}
                  {bizStaff.length > 0 && (
                    <div className="mb-5">
                      <div className="font-bold text-sm mb-3">Personel</div>
                      <div className="flex gap-3 flex-wrap">
                        {bizStaff.map((s,i) => (
                          <div key={s.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:COLORS[i%COLORS.length]}}>{s.name[0]}</div>
                            <div><div className="text-xs font-semibold">{s.name.split(' ')[0]}</div><div className="text-xs text-amber-500 font-bold">★ {s.rating}</div></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <button onClick={() => setBookModal(true)}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-md shadow-orange-500/25">
                📅 Randevu Al
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Randevu Al Modal */}
      {bookModal && detailBiz && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={e => e.target===e.currentTarget && setBookModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div><div className="font-bold">Randevu Al</div><div className="text-xs text-gray-500">{detailBiz.name}</div></div>
              <button onClick={() => setBookModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">Hizmet *</label>
                <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"
                  value={bookForm.service} onChange={e => setBookForm(p=>({...p,service:e.target.value}))}>
                  <option value="">Hizmet seçin</option>
                  {bizServices.map(s => <option key={s.id} value={s.id}>{s.name} — ₺{s.price} ({s.duration_min} dk)</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Personel</label>
                <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"
                  value={bookForm.staff} onChange={e => setBookForm(p=>({...p,staff:e.target.value}))}>
                  <option value="">Fark etmez</option>
                  {bizStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Tarih *</label>
                  <input type="date" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"
                    min={new Date().toISOString().split('T')[0]}
                    value={bookForm.date} onChange={e => setBookForm(p=>({...p,date:e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Saat</label>
                  <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"
                    value={bookForm.time} onChange={e => setBookForm(p=>({...p,time:e.target.value}))}>
                    {['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setBookModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={bookAppt} disabled={booking}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors">
                {booking ? 'Kaydediliyor...' : 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="bg-slate-800 h-14 flex items-center px-6 gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-sm">📅</div>
          <span className="text-white font-bold text-sm hidden sm:block">RandevuApp</span>
        </div>
        {[['home','🏠','Keşfet'],['appts','📅','Randevularım'],['profile','👤','Profilim']].map(([k,ic,l]) => (
          <button key={k} onClick={() => { setLoading(true); setTab(k) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all relative ${tab===k?'bg-white/20 text-white':'text-white/50 hover:text-white hover:bg-white/10'}`}>
            <span className="sm:hidden">{ic}</span>
            <span className="hidden sm:inline">{l}</span>
            {k==='appts' && upcomingAppts.length>0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center font-bold">{upcomingAppts.length}</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white border-2 border-white/20">
            {user.name?.[0]||'?'}
          </div>
          <button onClick={() => { localStorage.removeItem('randevu_user'); router.push('/login') }}
            className="text-white/40 hover:text-white/70 text-xs transition-colors hidden sm:block">Çıkış</button>
        </div>
      </nav>

      {/* HOME */}
      {tab === 'home' && (
        <>
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 py-12 px-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="max-w-4xl mx-auto relative z-10">
              <div className="text-white/60 text-sm mb-1">Merhaba, {user.name?.split(' ')[0]} 👋</div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight mb-5">Randevunuzu Alın</h1>
              <div className="flex bg-white rounded-xl overflow-hidden shadow-xl max-w-lg">
                <input className="flex-1 px-4 py-3 text-sm outline-none" placeholder="İşletme veya hizmet ara..."
                  value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                <button className="px-5 py-3 bg-orange-500 text-white text-sm font-bold">Ara</button>
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                <button onClick={() => setCatFilter('')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${!catFilter?'bg-orange-500 border-orange-500 text-white':'bg-white/10 border-white/15 text-white/75 hover:bg-white/20'}`}>
                  ✦ Tümü
                </button>
                {cats.map(c => (
                  <button key={c} onClick={() => setCatFilter(c===catFilter?'':c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${catFilter===c?'bg-orange-500 border-orange-500 text-white':'bg-white/10 border-white/15 text-white/75 hover:bg-white/20'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-6 py-8 w-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">
                {catFilter ? `${catFilter} İşletmeleri` : '📍 Yakınındaki İşletmeler'}
                <span className="ml-2 text-sm font-normal text-gray-400">({filteredBiz.length})</span>
              </h2>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-3 text-gray-400 py-16"><Spin /> Yükleniyor...</div>
            ) : filteredBiz.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">🔍</div>
                <div className="font-semibold">Sonuç bulunamadı</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBiz.map((b,i) => (
                  <div key={b.id} onClick={() => openDetail(b)}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                    <div className="h-28 flex items-center justify-center text-5xl relative" style={{ background:`${COLORS[i%COLORS.length]}15` }}>
                      {b.emoji||'🏢'}
                      <div className="absolute top-2 right-2"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">● Müsait</span></div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="bg-white/90 text-sm font-bold px-3 py-1.5 rounded-full shadow-md">Detay Gör →</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="font-bold text-sm mb-0.5">{b.name}</div>
                      <div className="text-gray-500 text-xs mb-2">{b.category} · {b.city}</div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-amber-500 text-xs font-bold">★ {b.rating}</span>
                        <span className="text-gray-400 text-xs">({b.review_count} yorum)</span>
                        <span className="text-gray-300 text-xs">·</span>
                        <span className="text-gray-400 text-xs">{b.monthly_appointments} randevu/ay</span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="text-sm text-gray-500">den <b className="text-gray-900">₺{b.price_from}</b></div>
                        <button onClick={e => { e.stopPropagation(); openDetail(b) }}
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
          <div className="flex items-center justify-between mb-5">
            <div><h1 className="text-xl font-bold">Randevularım</h1><p className="text-gray-500 text-sm">{user.name}</p></div>
            <button onClick={() => { setTab('home') }} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Yeni Randevu</button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 text-gray-400 py-16"><Spin /> Yükleniyor...</div>
          ) : (
            <>
              {/* Yaklaşan */}
              {upcomingAppts.length > 0 && (
                <div className="mb-6">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Yaklaşan ({upcomingAppts.length})</div>
                  <div className="space-y-3">
                    {upcomingAppts.map(a => {
                      const sc = {confirmed:'#ff6b35',pending:'#f59e0b'}[a.status]||'#ccc'
                      return (
                        <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="w-1 h-14 rounded-full flex-shrink-0" style={{background:sc}} />
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{background:sc+'22'}}>{a.businesses?.emoji||'🏢'}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm">{a.businesses?.name||'—'}</div>
                            <div className="text-gray-500 text-xs">{a.staff?.name||'Personel'} · {a.services?.name||'—'}</div>
                            <div className="text-xs font-semibold text-gray-700 mt-1">
                              📅 {new Date(a.appointment_date).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})} · ⏰ {String(a.appointment_time).slice(0,5)}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <Bdg s={a.status} />
                            <button onClick={() => cancelAppt(a.id)}
                              className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">İptal</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Geçmiş */}
              {pastAppts.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Geçmiş ({pastAppts.length})</div>
                  <div className="space-y-2">
                    {pastAppts.map(a => (
                      <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4 opacity-75">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-gray-50">{a.businesses?.emoji||'🏢'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{a.businesses?.name||'—'}</div>
                          <div className="text-gray-400 text-xs">{a.services?.name||'—'} · {new Date(a.appointment_date).toLocaleDateString('tr-TR')}</div>
                        </div>
                        <Bdg s={a.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {appointments.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
                  <div className="text-4xl mb-3">📅</div>
                  <div className="text-gray-500 font-semibold mb-2">Henüz randevu yok</div>
                  <button onClick={() => setTab('home')} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-6 py-2.5 rounded-lg">İşletme Bul</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* PROFİL */}
      {tab === 'profile' && (
        <div className="max-w-4xl mx-auto w-full px-6 py-8">
          <h1 className="text-xl font-bold mb-6">Profilim</h1>
          {loading || !profile ? (
            <div className="flex items-center justify-center gap-3 text-gray-400 py-16"><Spin /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-2xl font-extrabold text-white mx-auto mb-4 border-4 border-orange-100">{profile.full_name?.[0]||'?'}</div>
                  <div className="font-bold text-lg mb-1">{profile.full_name}</div>
                  <div className="text-gray-500 text-sm mb-4">{profile.email}</div>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">⭐ {profile.loyalty_tier?.charAt(0).toUpperCase()+profile.loyalty_tier?.slice(1)||'Bronze'}</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  {[['Telefon', profile.phone||'—'], ['Üye Tarihi', new Date(profile.created_at).toLocaleDateString('tr-TR')]].map(([l,v]) => (
                    <div key={l} className="flex justify-between py-2.5 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-500">{l}</span>
                      <span className="text-sm font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => { localStorage.removeItem('randevu_user'); router.push('/login') }}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition-colors">
                  🚪 Çıkış Yap
                </button>
              </div>
              <div className="md:col-span-2 space-y-4">
                <div className="rounded-2xl p-5 text-white relative overflow-hidden shadow-md" style={{background:'linear-gradient(135deg,#ff6b35,#ff9a50)'}}>
                  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
                  <div className="text-xs font-semibold opacity-80 uppercase tracking-wider mb-1">Toplam Puan</div>
                  <div className="text-5xl font-extrabold leading-none mb-1">{(profile.loyalty_points||0).toLocaleString()}</div>
                  <div className="text-sm opacity-75 mb-4">≈ ₺{Math.floor((profile.loyalty_points||0)/10)} indirim hakkı</div>
                  <div className="flex justify-between text-xs opacity-70 mb-1.5">
                    <span>Platinum'a {Math.max(0,3000-(profile.loyalty_points||0))} puan kaldı</span>
                    <span>{profile.loyalty_points||0}/3.000</span>
                  </div>
                  <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
                    <div className="h-full bg-white/80 rounded-full" style={{width:`${pct}%`}} />
                  </div>
                  <div className="absolute top-4 right-4 bg-white/20 border border-white/30 text-xs font-bold px-3 py-1 rounded-full">🥇 Gold</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[['Toplam Randevu', appointments.length,'text-gray-800'], ['Tamamlanan', appointments.filter(a=>a.status==='completed').length,'text-green-600'], ['Bekleyen', upcomingAppts.length,'text-orange-500']].map(([l,v,c]) => (
                    <div key={l} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                      <div className={`text-2xl font-extrabold ${c} mb-1`}>{v}</div>
                      <div className="text-xs text-gray-500">{l}</div>
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
