'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const catColors = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444']
const statusBadge = {
  active:    <span className="badge-green">● Aktif</span>,
  review:    <span className="badge-amber">● İnceleme</span>,
  suspended: <span className="badge-red">● Askıya Alındı</span>,
  passive:   <span className="badge-gray">● Pasif</span>,
}
const planBadge = {
  pro:        <span className="badge-orange">Pro</span>,
  enterprise: <span className="badge-navy">Enterprise</span>,
  free:       <span className="badge-gray">Ücretsiz</span>,
}

function Spinner() {
  return <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin flex-shrink-0" />
}

function KPI({ label, value, delta, color }) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-extrabold tracking-tight mb-1 ${color}`}>{value}</div>
      {delta && <div className="text-xs font-semibold text-green-600">{delta}</div>}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl"
        style={{background: color.includes('orange')?'#f97316':color.includes('green')?'#16a34a':color.includes('blue')?'#2563eb':'#dc2626'}} />
    </div>
  )
}

export default function AdminPage() {
  const [view, setView] = useState('dashboard')
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(false)
  const [firmFilter, setFirmFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({ name:'', category:'', city:'', owner_name:'', email:'', phone:'', price_from:0, plan:'free' })

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500) }

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [firms, profiles, appts] = await Promise.all([
      supabase.from('businesses').select('*').order('created_at',{ascending:false}),
      supabase.from('profiles').select('*').order('created_at',{ascending:false}),
      supabase.from('appointments').select('*'),
    ])
    setData({ firms: firms.data||[], profiles: profiles.data||[], appts: appts.data||[] })
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const firms = data.firms || []
  const profiles = data.profiles || []
  const appts = data.appts || []

  const reviewFirms = firms.filter(f=>f.status==='review')
  const activeFirms = firms.filter(f=>f.status==='active')
  const filteredFirms = firms.filter(f => {
    const matchQ = !firmFilter || f.name.toLowerCase().includes(firmFilter.toLowerCase()) || (f.email||'').toLowerCase().includes(firmFilter.toLowerCase())
    const matchS = !statusFilter || f.status === statusFilter
    return matchQ && matchS
  })

  const planCounts = firms.reduce((a,f)=>({...a,[f.plan]:(a[f.plan]||0)+1}), {})
  const totalRevenue = firms.length * 350

  async function approveFirm(id, name) {
    await supabase.from('businesses').update({status:'active'}).eq('id',id)
    showToast(`${name} onaylandı! ✅`)
    loadAll()
  }
  async function rejectFirm(id, name) {
    await supabase.from('businesses').update({status:'passive'}).eq('id',id)
    showToast(`${name} reddedildi.`)
    loadAll()
  }
  async function suspendFirm(id, name) {
    if (!confirm(`${name} askıya alınsın mı?`)) return
    await supabase.from('businesses').update({status:'suspended'}).eq('id',id)
    showToast(`${name} askıya alındı.`)
    loadAll()
  }
  async function saveFirm() {
    const {name,category,city} = form
    if (!name || !category || !city) { showToast('Zorunlu alanları doldurun','error'); return }
    const catEmojis = {Güzellik:'💆',Kuaför:'✂️',Masaj:'🧘',Fitness:'🏋️',Sağlık:'💊'}
    const {error} = await supabase.from('businesses').insert({...form, status:'review', rating:4.5, review_count:0, emoji:catEmojis[category]||'🏢'})
    if (error) { showToast('Hata: '+error.message,'error'); return }
    setModal(false)
    showToast(`${name} eklendi ve incelemeye alındı ✅`)
    setForm({name:'',category:'',city:'',owner_name:'',email:'',phone:'',price_from:0,plan:'free'})
    loadAll()
  }

  const navItems = [
    ['dashboard','⊞','Dashboard'],
    ['firms','🏢','Firmalar'],
    ['requests','📬','Başvurular'],
    ['subscriptions','💳','Abonelikler'],
    ['users','👥','Kullanıcılar'],
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg ${toast.type==='error'?'bg-red-600 text-white':'bg-slate-800 text-white'}`}>
          {toast.type==='error'?'❌':'✅'} {toast.msg}
        </div>
      )}

      {/* Add Firm Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex items-start justify-between">
              <div><div className="font-bold text-base">Yeni Firma Ekle</div><div className="text-xs text-gray-500 mt-0.5">Supabase'e kaydedilecek</div></div>
              <button onClick={()=>setModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Firma Adı *</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Örn: Güzellik Salonu" /></div>
                <div><label className="text-xs font-bold block mb-1">Kategori *</label>
                  <select className="input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                    <option value="">Seçin</option>
                    {['Güzellik','Kuaför','Masaj','Fitness','Sağlık'].map(c=><option key={c}>{c}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Firma Sahibi *</label><input className="input" value={form.owner_name} onChange={e=>setForm(f=>({...f,owner_name:e.target.value}))} placeholder="Ad Soyad" /></div>
                <div><label className="text-xs font-bold block mb-1">Şehir *</label><input className="input" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} placeholder="İlçe, Şehir" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">E-posta</label><input className="input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="firma@email.com" /></div>
                <div><label className="text-xs font-bold block mb-1">Telefon</label><input className="input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+90 555 000 00 00" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Başlangıç Fiyatı (₺)</label><input className="input" type="number" value={form.price_from} onChange={e=>setForm(f=>({...f,price_from:+e.target.value}))} /></div>
                <div><label className="text-xs font-bold block mb-1">Plan</label>
                  <select className="input" value={form.plan} onChange={e=>setForm(f=>({...f,plan:e.target.value}))}>
                    <option value="free">Ücretsiz</option>
                    <option value="pro">Pro — ₺300/ay</option>
                    <option value="enterprise">Enterprise — ₺750/ay</option>
                  </select></div>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button onClick={()=>setModal(false)} className="btn-outline btn-sm">İptal</button>
              <button onClick={saveFirm} className="btn-primary btn-sm">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 bg-slate-800 flex flex-col">
        <div className="p-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-sm">📅</div>
            <div><div className="text-white text-sm font-bold">RandevuApp</div><div className="text-white/30 text-xs">Admin Paneli</div></div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map(([key,icon,label])=>(
            <button key={key} onClick={()=>setView(key)}
              className={`sidebar-item w-full ${view===key?'active':''}`}>
              <span>{icon}</span>{label}
              {key==='firms' && firms.length > 0 && <span className="ml-auto bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{firms.length}</span>}
              {key==='requests' && reviewFirms.length > 0 && <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{reviewFirms.length}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/[0.07]">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/[0.05]">
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white">SA</div>
            <div><div className="text-xs font-semibold text-white/85">Süper Admin</div><div className="text-xs text-white/30">admin@randevuapp.com</div></div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-5 gap-2 flex-shrink-0">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← Ana Sayfa</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-800">{navItems.find(x=>x[0]===view)?.[2]}</span>
          <div className="ml-auto flex gap-2">
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full font-semibold">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Supabase · Canlı
            </div>
            <button onClick={()=>setModal(true)} className="btn-primary btn-sm text-xs">+ Firma Ekle</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center gap-3 text-gray-400 justify-center py-20"><Spinner /> Supabase'den veri çekiliyor...</div>
          ) : (
            <>
              {/* ── DASHBOARD ── */}
              {view === 'dashboard' && (
                <div>
                  <div className="mb-5"><h1 className="text-xl font-bold">Platform Genel Bakış</h1><p className="text-gray-500 text-sm mt-0.5">Gerçek zamanlı Supabase verisi</p></div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <KPI label="Toplam Firma" value={firms.length} delta={`${activeFirms.length} aktif`} color="text-orange-500" />
                    <KPI label="Kullanıcı" value={profiles.filter(p=>p.role==='customer').length} delta="↑ %12.4" color="text-green-600" />
                    <KPI label="Toplam Randevu" value={appts.length} delta="↑ %8.1" color="text-blue-600" />
                    <KPI label="Bekleyen Başvuru" value={reviewFirms.length} color="text-red-500" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 card overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="font-bold text-sm">Son Eklenen Firmalar</div>
                        <button onClick={()=>setView('firms')} className="text-xs text-orange-500 hover:underline">Tümünü Gör →</button>
                      </div>
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr><th className="th">Firma</th><th className="th">Kategori</th><th className="th">Plan</th><th className="th">Durum</th></tr></thead>
                        <tbody>
                          {firms.slice(0,5).map((f,i)=>(
                            <tr key={f.id} className="table-row" onClick={()=>setView('firms')}>
                              <td className="td"><div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:catColors[i%catColors.length]}}>{f.name[0]}</div>
                                <div><div className="font-semibold text-sm">{f.name}</div><div className="text-xs text-gray-400">{f.city}</div></div>
                              </div></td>
                              <td className="td"><span className="badge-gray text-xs">{f.category}</span></td>
                              <td className="td">{planBadge[f.plan]||f.plan}</td>
                              <td className="td">{statusBadge[f.status]||f.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-4">
                      <div className="card p-4">
                        <div className="font-bold text-sm mb-3">Bekleyen Başvurular</div>
                        {reviewFirms.length === 0 ? (
                          <div className="text-sm text-gray-400 text-center py-4">Bekleyen başvuru yok ✅</div>
                        ) : reviewFirms.slice(0,3).map(f=>(
                          <div key={f.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                            <div>
                              <div className="text-sm font-semibold">{f.name}</div>
                              <div className="text-xs text-gray-400">{f.category} · {f.city}</div>
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={()=>approveFirm(f.id,f.name)} className="btn-primary btn-sm text-xs px-2 py-1">✓</button>
                              <button onClick={()=>rejectFirm(f.id,f.name)} className="btn-ghost btn-sm text-red-500 text-xs px-2 py-1">✗</button>
                            </div>
                          </div>
                        ))}
                        {reviewFirms.length > 3 && (
                          <button onClick={()=>setView('requests')} className="w-full mt-2 text-xs text-orange-500 hover:underline text-center">+{reviewFirms.length-3} daha →</button>
                        )}
                      </div>

                      <div className="card p-4">
                        <div className="font-bold text-sm mb-3">Abonelik Dağılımı</div>
                        {[['Pro',planCounts.pro||0,'#ff6b35'],['Enterprise',planCounts.enterprise||0,'#1e3a5f'],['Ücretsiz',planCounts.free||0,'#9ca3af']].map(([l,c,color])=>(
                          <div key={l} className="mb-2.5">
                            <div className="flex justify-between text-xs mb-1"><span className="font-medium">{l}</span><span className="font-bold">{c} firma</span></div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{width:`${firms.length?c/firms.length*100:0}%`,background:color}} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── FİRMALAR ── */}
              {view === 'firms' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div><h1 className="text-xl font-bold">Firmalar</h1><p className="text-gray-500 text-sm mt-0.5">{firms.length} firma · {activeFirms.length} aktif</p></div>
                    <div className="flex gap-2">
                      <button onClick={()=>setView('requests')} className="btn-outline btn-sm text-xs relative">
                        📬 Başvurular
                        {reviewFirms.length > 0 && <span className="ml-1.5 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{reviewFirms.length}</span>}
                      </button>
                      <button onClick={()=>setModal(true)} className="btn-primary btn-sm text-xs">+ Firma Ekle</button>
                    </div>
                  </div>

                  <div className="card overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex gap-3 flex-wrap">
                      <input className="input flex-1 min-w-[180px]" placeholder="Firma adı veya e-posta ara..." value={firmFilter} onChange={e=>setFirmFilter(e.target.value)} />
                      <select className="input w-44" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                        <option value="">Tüm Durumlar</option>
                        <option value="active">Aktif</option>
                        <option value="review">İnceleme</option>
                        <option value="suspended">Askıya Alındı</option>
                        <option value="passive">Pasif</option>
                      </select>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr><th className="th">Firma</th><th className="th">Şehir</th><th className="th">Kategori</th><th className="th">Plan</th><th className="th">Durum</th><th className="th">Kayıt</th><th className="th w-24" /></tr>
                        </thead>
                        <tbody>
                          {filteredFirms.map((f,i)=>(
                            <tr key={f.id} className="table-row group">
                              <td className="td">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:catColors[i%catColors.length]}}>{f.name[0]}</div>
                                  <div>
                                    <div className="font-semibold text-sm">{f.name}</div>
                                    <div className="text-xs text-gray-400">{f.email||'—'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="td text-gray-500 text-sm">{f.city}</td>
                              <td className="td"><span className="badge-gray">{f.category}</span></td>
                              <td className="td">{planBadge[f.plan]||f.plan}</td>
                              <td className="td">{statusBadge[f.status]||f.status}</td>
                              <td className="td text-gray-400 text-xs">{new Date(f.created_at).toLocaleDateString('tr-TR')}</td>
                              <td className="td">
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {f.status==='review' && <button onClick={()=>approveFirm(f.id,f.name)} className="btn-primary btn-sm text-xs px-2 py-1">Onayla</button>}
                                  {f.status==='active' && <button onClick={()=>suspendFirm(f.id,f.name)} className="text-xs font-semibold px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">Askıya Al</button>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm text-gray-500">{filteredFirms.length} firma gösteriliyor</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── BAŞVURULAR ── */}
              {view === 'requests' && (
                <div>
                  <h1 className="text-xl font-bold mb-5">Firma Başvuruları</h1>
                  {reviewFirms.length > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-sm">
                      <span className="text-lg">⚠️</span>
                      <div><b>{reviewFirms.length} başvuru</b> inceleme bekliyor. Onaylandıktan sonra firma sahibi platforma erişebilir.</div>
                    </div>
                  )}
                  {reviewFirms.length === 0 ? (
                    <div className="card p-16 text-center">
                      <div className="text-4xl mb-3">✅</div>
                      <div className="font-bold text-base mb-1">Bekleyen başvuru yok</div>
                      <div className="text-sm text-gray-400">Tüm başvurular işlendi</div>
                    </div>
                  ) : (
                    <div className="card overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr><th className="th">Firma</th><th className="th">Sahip</th><th className="th">Kategori</th><th className="th">Şehir</th><th className="th">Başvuru</th><th className="th">İşlemler</th></tr></thead>
                        <tbody>
                          {reviewFirms.map((f,i)=>(
                            <tr key={f.id} className="table-row">
                              <td className="td"><div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:catColors[i%catColors.length]}}>{f.name[0]}</div>
                                <span className="font-semibold text-sm">{f.name}</span>
                              </div></td>
                              <td className="td text-gray-500">{f.owner_name||'—'}</td>
                              <td className="td"><span className="badge-gray">{f.category}</span></td>
                              <td className="td text-gray-500">{f.city}</td>
                              <td className="td text-gray-400 text-xs">{new Date(f.created_at).toLocaleDateString('tr-TR')}</td>
                              <td className="td">
                                <div className="flex gap-2">
                                  <button onClick={()=>approveFirm(f.id,f.name)} className="btn-primary btn-sm text-xs">✓ Onayla</button>
                                  <button className="btn-outline btn-sm text-xs">İncele</button>
                                  <button onClick={()=>rejectFirm(f.id,f.name)} className="btn-ghost btn-sm text-xs text-red-500">✗ Reddet</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── KULLANICILAR ── */}
              {view === 'users' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div><h1 className="text-xl font-bold">Kullanıcılar</h1><p className="text-gray-500 text-sm mt-0.5">{profiles.length} kayıtlı kullanıcı</p></div>
                    <button className="btn-primary btn-sm text-xs">+ Kullanıcı Ekle</button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                    <KPI label="Toplam" value={profiles.length} color="text-gray-800" />
                    <KPI label="Müşteri" value={profiles.filter(p=>p.role==='customer').length} color="text-green-600" />
                    <KPI label="Firma Sahibi" value={profiles.filter(p=>p.role==='business_owner').length} color="text-orange-500" />
                    <KPI label="Admin" value={profiles.filter(p=>p.role==='admin').length} color="text-blue-600" />
                  </div>
                  <div className="card overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50"><tr><th className="th">Kullanıcı</th><th className="th">Telefon</th><th className="th">Rol</th><th className="th">Puan</th><th className="th">Tier</th><th className="th">Kayıt</th></tr></thead>
                      <tbody>
                        {profiles.map((p,i)=>(
                          <tr key={p.id} className="table-row">
                            <td className="td"><div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:catColors[i%catColors.length]}}>{p.full_name?.[0]}</div>
                              <div><div className="font-semibold text-sm">{p.full_name}</div><div className="text-xs text-gray-400">{p.email}</div></div>
                            </div></td>
                            <td className="td text-gray-500">{p.phone||'—'}</td>
                            <td className="td"><span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${p.role==='admin'?'bg-slate-800 text-white border-slate-700':p.role==='business_owner'?'bg-orange-50 text-orange-600 border-orange-200':'bg-gray-100 text-gray-600 border-gray-200'}`}>{p.role==='admin'?'Admin':p.role==='business_owner'?'Firma Sahibi':'Müşteri'}</span></td>
                            <td className="td font-semibold">{p.loyalty_points}</td>
                            <td className="td"><span className="badge-amber capitalize">{p.loyalty_tier}</span></td>
                            <td className="td text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── ABONELİKLER ── */}
              {view === 'subscriptions' && (
                <div>
                  <h1 className="text-xl font-bold mb-5">Abonelikler</h1>
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    <KPI label="Pro Plan" value={planCounts.pro||0} delta={`₺${(planCounts.pro||0)*300}/ay`} color="text-orange-500" />
                    <KPI label="Enterprise" value={planCounts.enterprise||0} delta={`₺${(planCounts.enterprise||0)*750}/ay`} color="text-blue-600" />
                    <KPI label="Ücretsiz" value={planCounts.free||0} color="text-gray-500" />
                  </div>
                  <div className="card overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50"><tr><th className="th">Firma</th><th className="th">Plan</th><th className="th">Durum</th><th className="th">İşlem</th></tr></thead>
                      <tbody>
                        {firms.map(f=>(
                          <tr key={f.id} className="table-row">
                            <td className="td font-semibold">{f.name}</td>
                            <td className="td">{planBadge[f.plan]||f.plan}</td>
                            <td className="td">{statusBadge[f.status]||f.status}</td>
                            <td className="td"><div className="flex gap-2">
                              {f.plan !== 'enterprise' && <button className="btn-primary btn-sm text-xs">Yükselt</button>}
                              <button className="btn-outline btn-sm text-xs">Değiştir</button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
