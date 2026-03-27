'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const CAT_COLORS = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444']
const STATUS_CFG = { active:'bg-green-50 text-green-700 border-green-200', review:'bg-amber-50 text-amber-700 border-amber-200', suspended:'bg-red-50 text-red-600 border-red-200', passive:'bg-gray-100 text-gray-600 border-gray-200' }
const STATUS_LBL = { active:'● Aktif', review:'● İnceleme', suspended:'● Askıya Alındı', passive:'● Pasif' }
const PLAN_CFG   = { pro:'bg-orange-50 text-orange-600 border-orange-200', enterprise:'bg-slate-800 text-white border-slate-700', free:'bg-gray-100 text-gray-600 border-gray-200' }
const PLAN_LBL   = { pro:'Pro', enterprise:'Enterprise', free:'Ücretsiz' }

function Spinner() { return <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin flex-shrink-0" /> }
function StatusBadge({ s }) {
  return <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_CFG[s]||STATUS_CFG.passive}`}>{STATUS_LBL[s]||s}</span>
}
function PlanBadge({ p }) {
  return <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${PLAN_CFG[p]||PLAN_CFG.free}`}>{PLAN_LBL[p]||p}</span>
}
function KPI({ label, value, delta, color }) {
  const bar = {orange:'#f97316',green:'#16a34a',blue:'#2563eb',red:'#dc2626',gray:'#9ca3af'}
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 relative overflow-hidden shadow-sm">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-extrabold tracking-tight mb-1 text-${color}-500`}>{value}</div>
      {delta && <div className="text-xs font-semibold text-green-600">{delta}</div>}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl" style={{background:bar[color]||'#ccc'}} />
    </div>
  )
}

const NAV = [['dashboard','⊞','Dashboard'],['firms','🏢','Firmalar'],['requests','📬','Başvurular'],['subscriptions','💳','Abonelikler'],['users','👥','Kullanıcılar']]

export default function AdminPage() {
  const [view, setView] = useState('dashboard')
  const [firms, setFirms] = useState([])
  const [profiles, setProfiles] = useState([])
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(false)
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('')
  const [form, setForm] = useState({name:'',category:'',city:'',owner_name:'',email:'',phone:'',price_from:0,plan:'free'})

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  async function loadAll() {
    setLoading(true)
    const [f, p, a] = await Promise.all([
      supabase.from('businesses').select('*').order('created_at',{ascending:false}),
      supabase.from('profiles').select('*').order('created_at',{ascending:false}),
      supabase.from('appointments').select('*'),
    ])
    setFirms(f.data||[])
    setProfiles(p.data||[])
    setAppts(a.data||[])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function approveFirm(id, name) {
    await supabase.from('businesses').update({status:'active'}).eq('id',id)
    setFirms(prev => prev.map(f => f.id===id ? {...f,status:'active'} : f))
    showToast(`${name} onaylandı ✅`)
  }
  async function rejectFirm(id, name) {
    await supabase.from('businesses').update({status:'passive'}).eq('id',id)
    setFirms(prev => prev.map(f => f.id===id ? {...f,status:'passive'} : f))
    showToast(`${name} reddedildi`)
  }
  async function suspendFirm(id, name) {
    if (!confirm(`${name} askıya alınsın mı?`)) return
    await supabase.from('businesses').update({status:'suspended'}).eq('id',id)
    setFirms(prev => prev.map(f => f.id===id ? {...f,status:'suspended'} : f))
    showToast(`${name} askıya alındı`)
  }
  async function saveFirm() {
    if (!form.name||!form.category||!form.city) { showToast('❌ Zorunlu alanları doldurun'); return }
    const emojis = {Güzellik:'💆',Kuaför:'✂️',Masaj:'🧘',Fitness:'🏋️',Sağlık:'💊'}
    const {error} = await supabase.from('businesses').insert({
      ...form, status:'review', rating:4.5, review_count:0,
      emoji:emojis[form.category]||'🏢'
    })
    if (error) { showToast('❌ '+error.message); return }
    setModal(false)
    setForm({name:'',category:'',city:'',owner_name:'',email:'',phone:'',price_from:0,plan:'free'})
    showToast(`${form.name} eklendi ✅`)
    loadAll()
  }

  const reviewFirms = firms.filter(f=>f.status==='review')
  const activeFirms = firms.filter(f=>f.status==='active')
  const filteredFirms = firms.filter(f => {
    const q = search.toLowerCase()
    return (!q || f.name.toLowerCase().includes(q) || (f.email||'').toLowerCase().includes(q))
        && (!statusF || f.status===statusF)
  })
  const planCounts = firms.reduce((a,f)=>({...a,[f.plan]:(a[f.plan]||0)+1}),{})

  return (
    <div className="flex h-screen bg-gray-50">
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-xl">{toast}</div>}

      {/* Modal Firma Ekle */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between">
              <div><div className="font-bold">Yeni Firma Ekle</div><div className="text-xs text-gray-500">Supabase'e kaydedilecek</div></div>
              <button onClick={()=>setModal(false)} className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Firma Adı *</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Örn: Güzellik Salonu" /></div>
                <div><label className="text-xs font-bold block mb-1">Kategori *</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                    <option value="">Seçin</option>
                    {['Güzellik','Kuaför','Masaj','Fitness','Sağlık'].map(c=><option key={c}>{c}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Firma Sahibi *</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.owner_name} onChange={e=>setForm(f=>({...f,owner_name:e.target.value}))} placeholder="Ad Soyad" /></div>
                <div><label className="text-xs font-bold block mb-1">Şehir *</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} placeholder="İlçe, Şehir" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">E-posta</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="firma@email.com" /></div>
                <div><label className="text-xs font-bold block mb-1">Telefon</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+90 555 000 00 00" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Başlangıç Fiyatı (₺)</label>
                  <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.price_from} onChange={e=>setForm(f=>({...f,price_from:+e.target.value}))} /></div>
                <div><label className="text-xs font-bold block mb-1">Plan</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.plan} onChange={e=>setForm(f=>({...f,plan:e.target.value}))}>
                    <option value="free">Ücretsiz</option><option value="pro">Pro — ₺300/ay</option><option value="enterprise">Enterprise — ₺750/ay</option>
                  </select></div>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button onClick={()=>setModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={saveFirm} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold">Kaydet</button>
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
          {NAV.map(([key,icon,label]) => (
            <button key={key} onClick={()=>setView(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${view===key?'bg-white/[0.1] text-white font-semibold':'text-white/50 hover:text-white/85 hover:bg-white/[0.07]'}`}>
              {view===key && <div className="absolute left-0 top-[22%] bottom-[22%] w-0.5 bg-orange-500 rounded-r" />}
              <span>{icon}</span>{label}
              {key==='firms' && firms.length>0 && <span className="ml-auto bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{firms.length}</span>}
              {key==='requests' && reviewFirms.length>0 && <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{reviewFirms.length}</span>}
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
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-5 gap-2 flex-shrink-0">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← Ana Sayfa</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-800">{NAV.find(x=>x[0]===view)?.[2]}</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full font-semibold">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Supabase · Canlı
            </div>
            <button onClick={()=>setModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">+ Firma Ekle</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-3 text-gray-400 py-20"><Spinner /> Supabase'den yükleniyor...</div>
          ) : (
            <>
              {/* DASHBOARD */}
              {view === 'dashboard' && (
                <div>
                  <div className="mb-5"><h1 className="text-xl font-bold">Platform Genel Bakış</h1><p className="text-gray-500 text-sm">Gerçek zamanlı Supabase verisi</p></div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <KPI label="Toplam Firma" value={firms.length} delta={`${activeFirms.length} aktif`} color="orange" />
                    <KPI label="Kullanıcı" value={profiles.filter(p=>p.role==='customer').length} delta="↑ %12" color="green" />
                    <KPI label="Randevu" value={appts.length} delta="↑ %8" color="blue" />
                    <KPI label="Bekleyen" value={reviewFirms.length} color="red" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-gray-100 flex justify-between">
                        <div className="font-bold text-sm">Son Firmalar</div>
                        <button onClick={()=>setView('firms')} className="text-xs text-orange-500 hover:underline">Tümü →</button>
                      </div>
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr>
                          {['Firma','Kategori','Plan','Durum'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {firms.slice(0,6).map((f,i)=>(
                            <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={()=>setView('firms')}>
                              <td className="px-4 py-3"><div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:CAT_COLORS[i%CAT_COLORS.length]}}>{f.name[0]}</div>
                                <div><div className="font-semibold text-sm">{f.name}</div><div className="text-xs text-gray-400">{f.city}</div></div>
                              </div></td>
                              <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200">{f.category}</span></td>
                              <td className="px-4 py-3"><PlanBadge p={f.plan} /></td>
                              <td className="px-4 py-3"><StatusBadge s={f.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="font-bold text-sm mb-3">Bekleyen Başvurular</div>
                        {reviewFirms.length===0 ? (
                          <div className="text-sm text-gray-400 text-center py-4">Bekleyen başvuru yok ✅</div>
                        ) : reviewFirms.slice(0,4).map(f=>(
                          <div key={f.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                            <div>
                              <div className="text-sm font-semibold">{f.name}</div>
                              <div className="text-xs text-gray-400">{f.category}</div>
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={()=>approveFirm(f.id,f.name)} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded-lg">✓</button>
                              <button onClick={()=>rejectFirm(f.id,f.name)} className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-lg">✗</button>
                            </div>
                          </div>
                        ))}
                        {reviewFirms.length>4 && <button onClick={()=>setView('requests')} className="w-full text-xs text-orange-500 mt-2 hover:underline">+{reviewFirms.length-4} daha →</button>}
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="font-bold text-sm mb-3">Abonelik Dağılımı</div>
                        {[['Pro',planCounts.pro||0,'#f97316'],['Enterprise',planCounts.enterprise||0,'#1e3a5f'],['Ücretsiz',planCounts.free||0,'#9ca3af']].map(([l,c,color])=>(
                          <div key={l} className="mb-2.5">
                            <div className="flex justify-between text-xs mb-1"><span>{l}</span><span className="font-bold">{c}</span></div>
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

              {/* FİRMALAR */}
              {view === 'firms' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div><h1 className="text-xl font-bold">Firmalar</h1><p className="text-gray-500 text-sm">{firms.length} firma · {activeFirms.length} aktif</p></div>
                    <div className="flex gap-2">
                      <button onClick={()=>setView('requests')} className="border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        📬 Başvurular {reviewFirms.length>0 && <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{reviewFirms.length}</span>}
                      </button>
                      <button onClick={()=>setModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Firma Ekle</button>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex gap-3">
                      <input className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" placeholder="Firma adı veya e-posta ara..." value={search} onChange={e=>setSearch(e.target.value)} />
                      <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" value={statusF} onChange={e=>setStatusF(e.target.value)}>
                        <option value="">Tüm Durumlar</option>
                        {Object.entries(STATUS_LBL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr>
                          {['Firma','Şehir','Kategori','Plan','Durum','Kayıt',''].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {filteredFirms.map((f,i)=>(
                            <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50 group">
                              <td className="px-4 py-3"><div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:CAT_COLORS[i%CAT_COLORS.length]}}>{f.name[0]}</div>
                                <div><div className="font-semibold text-sm">{f.name}</div><div className="text-xs text-gray-400">{f.email||'—'}</div></div>
                              </div></td>
                              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{f.city}</td>
                              <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200">{f.category}</span></td>
                              <td className="px-4 py-3"><PlanBadge p={f.plan} /></td>
                              <td className="px-4 py-3"><StatusBadge s={f.status} /></td>
                              <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(f.created_at).toLocaleDateString('tr-TR')}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {f.status==='review' && <button onClick={()=>approveFirm(f.id,f.name)} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded-lg">Onayla</button>}
                                  {f.status==='active' && <button onClick={()=>suspendFirm(f.id,f.name)} className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-lg">Askıya Al</button>}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredFirms.length===0 && <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">Sonuç bulunamadı</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-5 py-3 border-t border-gray-100 text-sm text-gray-500">{filteredFirms.length} firma gösteriliyor</div>
                  </div>
                </div>
              )}

              {/* BAŞVURULAR */}
              {view === 'requests' && (
                <div>
                  <h1 className="text-xl font-bold mb-5">Firma Başvuruları</h1>
                  {reviewFirms.length>0 && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-sm">
                      ⚠️ <div><b>{reviewFirms.length} başvuru</b> inceleme bekliyor.</div>
                    </div>
                  )}
                  {reviewFirms.length===0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
                      <div className="text-4xl mb-3">✅</div>
                      <div className="font-bold mb-1">Bekleyen başvuru yok</div>
                      <div className="text-sm text-gray-400">Tüm başvurular işlendi</div>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr>
                          {['Firma','Sahip','Kategori','Şehir','Başvuru','İşlemler'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {reviewFirms.map((f,i)=>(
                            <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-3"><div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:CAT_COLORS[i%CAT_COLORS.length]}}>{f.name[0]}</div>
                                <span className="font-semibold text-sm">{f.name}</span>
                              </div></td>
                              <td className="px-4 py-3 text-sm text-gray-500">{f.owner_name||'—'}</td>
                              <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200">{f.category}</span></td>
                              <td className="px-4 py-3 text-sm text-gray-500">{f.city}</td>
                              <td className="px-4 py-3 text-xs text-gray-400">{new Date(f.created_at).toLocaleDateString('tr-TR')}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <button onClick={()=>approveFirm(f.id,f.name)} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-semibold">✓ Onayla</button>
                                  <button onClick={()=>rejectFirm(f.id,f.name)} className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-semibold">✗ Reddet</button>
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

              {/* KULLANICILAR */}
              {view === 'users' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div><h1 className="text-xl font-bold">Kullanıcılar</h1><p className="text-gray-500 text-sm">{profiles.length} kayıtlı</p></div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                    <KPI label="Toplam" value={profiles.length} color="blue" />
                    <KPI label="Müşteri" value={profiles.filter(p=>p.role==='customer').length} color="green" />
                    <KPI label="Firma Sahibi" value={profiles.filter(p=>p.role==='business_owner').length} color="orange" />
                    <KPI label="Admin" value={profiles.filter(p=>p.role==='admin').length} color="gray" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50"><tr>
                        {['Kullanıcı','Telefon','Rol','Puan','Kayıt'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {profiles.map((p,i)=>(
                          <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3"><div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:CAT_COLORS[i%CAT_COLORS.length]}}>{p.full_name?.[0]}</div>
                              <div><div className="font-semibold text-sm">{p.full_name}</div><div className="text-xs text-gray-400">{p.email}</div></div>
                            </div></td>
                            <td className="px-4 py-3 text-sm text-gray-500">{p.phone||'—'}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${p.role==='admin'?'bg-slate-800 text-white border-slate-700':p.role==='business_owner'?'bg-orange-50 text-orange-600 border-orange-200':'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                {p.role==='admin'?'Admin':p.role==='business_owner'?'Firma Sahibi':'Müşteri'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold">{p.loyalty_points}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ABONELİKLER */}
              {view === 'subscriptions' && (
                <div>
                  <h1 className="text-xl font-bold mb-5">Abonelikler</h1>
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    <KPI label="Pro Plan" value={planCounts.pro||0} delta={`₺${(planCounts.pro||0)*300}/ay`} color="orange" />
                    <KPI label="Enterprise" value={planCounts.enterprise||0} delta={`₺${(planCounts.enterprise||0)*750}/ay`} color="blue" />
                    <KPI label="Ücretsiz" value={planCounts.free||0} color="gray" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50"><tr>
                        {['Firma','Plan','Durum','İşlem'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {firms.map(f=>(
                          <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold text-sm">{f.name}</td>
                            <td className="px-4 py-3"><PlanBadge p={f.plan} /></td>
                            <td className="px-4 py-3"><StatusBadge s={f.status} /></td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {f.plan!=='enterprise' && <button className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1 rounded-lg">Yükselt</button>}
                                <button className="text-xs border border-gray-200 hover:bg-gray-50 px-2.5 py-1 rounded-lg">Değiştir</button>
                              </div>
                            </td>
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
