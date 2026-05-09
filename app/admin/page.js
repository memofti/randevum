'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const COLORS = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444']
function Spin() { return <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin flex-shrink-0" /> }
function StatusBdg({ s }) {
  const m={active:['bg-green-50 text-green-700 border-green-200','● Aktif'],review:['bg-amber-50 text-amber-700 border-amber-200','● İnceleme'],suspended:['bg-red-50 text-red-600 border-red-200','● Askıya'],passive:['bg-gray-100 text-gray-600 border-gray-200','● Pasif']}
  const [c,l]=m[s]||m.passive
  return <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${c}`}>{l}</span>
}
function PlanBdg({ p }) {
  const m={pro:'bg-orange-50 text-orange-600 border-orange-200',enterprise:'bg-slate-800 text-white border-slate-700',free:'bg-gray-100 text-gray-600 border-gray-200'}
  return <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${m[p]||m.free}`}>{p==='pro'?'Pro':p==='enterprise'?'Enterprise':'Ücretsiz'}</span>
}
function KPI({ label, value, sub, color }) {
  const ac={orange:'#f97316',green:'#16a34a',blue:'#2563eb',red:'#dc2626',gray:'#9ca3af'}
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</div>
      <div className="text-3xl font-extrabold tracking-tight mb-1" style={{color:ac[color]||'#111'}}>{value}</div>
      {sub && <div className="text-xs font-semibold text-green-600">{sub}</div>}
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{background:ac[color]||'#ccc'}} />
    </div>
  )
}
const NAV=[['dashboard','⊞','Dashboard'],['firms','🏢','Firmalar'],['requests','📬','Başvurular'],['ads','📢','Reklamlar'],['subscriptions','💳','Abonelikler'],['users','👥','Kullanıcılar']]

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard')
  const [firms, setFirms] = useState([])
  const [profiles, setProfiles] = useState([])
  const [appts, setAppts] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [allAds, setAllAds] = useState([])
  const [paymentEnabled, setPaymentEnabled] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [statusF, setStatusF] = useState('')
  const [form, setForm] = useState({name:'',category:'',city:'',owner_name:'',email:'',phone:'',price_from:0,plan:'free'})

  const toast3=(m)=>{setToast(m);setTimeout(()=>setToast(''),3500)}
  const fld=(k,v)=>setForm(p=>({...p,[k]:v}))

  useEffect(()=>{
    try {
      const raw=localStorage.getItem('randevu_user')
      if(!raw){router.push('/login');return}
      const u=JSON.parse(raw)
      if(u.role!=='admin'){router.push('/');return}
      setUser(u)
    } catch{router.push('/login')}
  },[router])

  async function loadAll() {
    setLoading(true)
    try {
      const [fr,pr,ar,payr,adsr2,settingsr]=await Promise.all([
        supabase.from('businesses').select('*').order('created_at',{ascending:false}),
        supabase.from('profiles').select('*').order('created_at',{ascending:false}),
        supabase.from('appointments').select('id,status,business_id'),
        supabase.from('payments').select('amount,created_at,status').eq('status','completed'),
        supabase.from('ads').select('*, businesses(name,emoji)').order('created_at',{ascending:false}),
        supabase.from('platform_settings').select('*'),
      ])
      setFirms(fr.data||[])
      setProfiles(pr.data||[])
      setAppts(ar.data||[])
      setPayments(payr?.data||[])
      if(adsr2?.data) setAllAds(adsr2.data)
      const paySet = settingsr?.data?.find(s=>s.key==='payment_enabled')
      if(paySet) setPaymentEnabled(paySet.value==='true')
    } catch(e){console.error(e)}
    finally{setLoading(false)}
  }
  useEffect(()=>{if(user)loadAll()},[user])

  async function approveFirm(id,name){
    await supabase.from('businesses').update({status:'active'}).eq('id',id)
    setFirms(p=>p.map(f=>f.id===id?{...f,status:'active'}:f))
    toast3(`✅ ${name} onaylandı`)
  }
  async function rejectFirm(id,name){
    await supabase.from('businesses').update({status:'passive'}).eq('id',id)
    setFirms(p=>p.map(f=>f.id===id?{...f,status:'passive'}:f))
    toast3(`${name} reddedildi`)
  }
  async function suspendFirm(id,name){
    if(!confirm(`${name} askıya alınsın mı?`))return
    await supabase.from('businesses').update({status:'suspended'}).eq('id',id)
    setFirms(p=>p.map(f=>f.id===id?{...f,status:'suspended'}:f))
    toast3(`⚠️ ${name} askıya alındı`)
  }
  async function saveFirm(){
    if(!form.name||!form.category||!form.city){toast3('❌ Zorunlu alanları doldurun');return}
    setSaving(true)
    try {
      const emojis={Güzellik:'💆',Kuaför:'✂️',Masaj:'🧘',Fitness:'🏋️',Sağlık:'💊'}
      await supabase.from('businesses').insert({...form,status:'review',rating:4.5,review_count:0,emoji:emojis[form.category]||'🏢'})
      setModal(false)
      setForm({name:'',category:'',city:'',owner_name:'',email:'',phone:'',price_from:0,plan:'free'})
      toast3(`✅ ${form.name} eklendi`)
      await loadAll()
    } catch(e){toast3('❌ '+e.message)}
    finally{setSaving(false)}
  }

  const reviewFirms=firms.filter(f=>f.status==='review')
  const activeFirms=firms.filter(f=>f.status==='active')
  const filtered=firms.filter(f=>{
    const q=search.toLowerCase()
    return(!q||f.name.toLowerCase().includes(q)||(f.email||'').toLowerCase().includes(q)||(f.city||'').toLowerCase().includes(q))&&(!statusF||f.status===statusF)
  })
  const planCounts=firms.reduce((a,f)=>({...a,[f.plan]:(a[f.plan]||0)+1}),{})

  if(!user) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/20 border-t-orange-500 rounded-full animate-spin" /></div>

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 relative">
      {/* Mobil Alt Navbar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-800 border-t border-white/10 flex">
        {[['dashboard','⊞','Panel'],['firms','🏢','Firmalar'],['requests','📬','Başvuru'],['users','👥','Kullanıcı'],['ads','📢','Reklam'],['subscriptions','💳','Abonelik']].map(([k,ic,l])=>(
          <button key={k} onClick={()=>setView(k)}
            className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-semibold transition-all relative ${view===k?'text-orange-500':'text-white/40'}`}>
            <span className="text-base">{ic}</span>
            <span className="text-[9px] mt-0.5 leading-none">{l}</span>
            {k==='requests'&&reviewFirms.length>0&&<span className="absolute top-0.5 right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center font-bold">{reviewFirms.length}</span>}
          </button>
        ))}
        <button onClick={async()=>{await supabase.auth.signOut();localStorage.removeItem('randevu_user');router.push('/login')}}
          className="flex-1 flex flex-col items-center justify-center py-2 text-xs font-semibold text-white/30">
          <span className="text-base">🚪</span>
          <span className="text-[9px] mt-0.5 leading-none">Çıkış</span>
        </button>
      </div>
      {toast&&<div className="fixed bottom-20 md:bottom-6 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-xl">{toast}</div>}

      {/* Modal */}
      {modal&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-start">
              <div><div className="font-bold">Yeni Firma Ekle</div><div className="text-xs text-gray-500">İnceleme kuyruğuna gidecek</div></div>
              <button onClick={()=>setModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Firma Adı *</label><input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.name} onChange={e=>fld('name',e.target.value)} placeholder="Örn: Güzellik Salonu" /></div>
                <div><label className="text-xs font-bold block mb-1">Kategori *</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.category} onChange={e=>fld('category',e.target.value)}>
                    <option value="">Seçin</option>{['Güzellik','Kuaför','Masaj','Fitness','Sağlık'].map(c=><option key={c}>{c}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Firma Sahibi *</label><input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.owner_name} onChange={e=>fld('owner_name',e.target.value)} placeholder="Ad Soyad" /></div>
                <div><label className="text-xs font-bold block mb-1">Şehir *</label><input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.city} onChange={e=>fld('city',e.target.value)} placeholder="İlçe, Şehir" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">E-posta</label><input type="email" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.email} onChange={e=>fld('email',e.target.value)} placeholder="firma@email.com" /></div>
                <div><label className="text-xs font-bold block mb-1">Telefon</label><input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.phone} onChange={e=>fld('phone',e.target.value)} placeholder="+90 555 000 00 00" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Başlangıç Fiyatı (₺)</label><input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.price_from} onChange={e=>fld('price_from',+e.target.value)} /></div>
                <div><label className="text-xs font-bold block mb-1">Plan</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.plan} onChange={e=>fld('plan',e.target.value)}>
                    <option value="free">Ücretsiz</option><option value="pro">Pro — ₺300/ay</option><option value="enterprise">Enterprise — ₺750/ay</option>
                  </select></div>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button onClick={()=>setModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={saveFirm} disabled={saving} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg text-sm font-semibold">{saving?'Kaydediliyor...':'Kaydet'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="hidden md:flex w-56 flex-shrink-0 bg-slate-800 flex-col h-screen">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-sm">📅</div>
            <div><div className="text-white text-sm font-bold">RandevuApp</div><div className="text-white/30 text-xs">Admin Paneli</div></div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(([key,icon,label])=>(
            <button key={key} onClick={()=>setView(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${view===key?'bg-white/10 text-white font-semibold':'text-white/50 hover:text-white/85 hover:bg-white/[0.07]'}`}>
              {view===key&&<div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-orange-500 rounded-r" />}
              <span>{icon}</span>{label}
              {key==='firms'&&firms.length>0&&<span className="ml-auto bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{firms.length}</span>}
              {key==='requests'&&reviewFirms.length>0&&<span className="ml-auto bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{reviewFirms.length}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/[0.07]">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/[0.05]">
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white">SA</div>
            <div className="flex-1 min-w-0"><div className="text-xs font-semibold text-white/85 truncate">{user.name}</div><div className="text-xs text-white/30">Admin</div></div>
            <button onClick={async()=>{await supabase.auth.signOut();localStorage.removeItem('randevu_user');router.push('/login')}} className="text-white/30 hover:text-white/60 text-xs transition-colors" title="Çıkış">🚪</button>
            <button onClick={async()=>{await supabase.auth.signOut();localStorage.removeItem('randevu_user');router.push('/login')}} className="text-white/30 hover:text-white/60 text-xs transition-colors" title="Çıkış">🚪</button>
          </div>
          <button onClick={async()=>{await supabase.auth.signOut();localStorage.removeItem('randevu_user');router.push('/login')}} className="w-full mt-2 text-xs text-white/30 hover:text-white/60 text-center py-1">Çıkış Yap</button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-5 gap-3 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">{NAV.find(x=>x[0]===view)?.[2]}</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full font-semibold">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Supabase · Canlı
            </div>
            <button onClick={()=>setModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">+ Firma Ekle</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5 pb-24 md:pb-5">
          {loading?(
            <div className="flex items-center justify-center gap-3 text-gray-400 py-20"><Spin /> Yükleniyor...</div>
          ):(
            <>
              {view==='dashboard'&&(
                <div>
                  <div className="mb-4"><h1 className="text-lg sm:text-xl font-bold">Platform Genel Bakış</h1><p className="text-gray-500 text-sm">Gerçek zamanlı Supabase verisi</p></div>
                  {reviewFirms.length>0&&(
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-sm cursor-pointer hover:bg-amber-100" onClick={()=>setView('requests')}>
                      ⚠️ <div><b>{reviewFirms.length} firma başvurusu</b> onay bekliyor → Başvuruları incele</div><span className="ml-auto text-amber-600">→</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    <KPI label="Toplam Firma" value={firms.length} sub={`${activeFirms.length} aktif`} color="orange" />
                    <KPI label="Kullanıcı" value={profiles.filter(p=>p.role==='customer').length} sub={'Firma: '+firms.length} color="green" />
                    <KPI label="Randevu" value={appts.length} sub="↑ %8" color="blue" />
                    <KPI label="Bekleyen Başvuru" value={reviewFirms.length} color="red" />
                  </div>
                  {/* Gelir KPI */}
                  {(() => {
                    const totalRev = payments.reduce((s,p) => s + (+p.amount||0), 0)
                    const thisMonth = new Date().toISOString().slice(0,7)
                    const monthRev = payments.filter(p => p.created_at?.startsWith(thisMonth)).reduce((s,p) => s + (+p.amount||0), 0)
                    const last6 = Array.from({length:6}, (_,i) => {
                      const d = new Date(); d.setMonth(d.getMonth()-5+i)
                      const key = d.toISOString().slice(0,7)
                      const label = d.toLocaleDateString('tr-TR',{month:'short'})
                      const rev = payments.filter(p=>p.created_at?.startsWith(key)).reduce((s,p)=>s+(+p.amount||0),0)
                      return {label, rev, key}
                    })
                    const maxRev = Math.max(...last6.map(m=>m.rev), 1)
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <div className="text-xs text-gray-500 mb-1">Toplam Gelir</div>
                          <div className="text-2xl font-extrabold text-gray-800">₺{totalRev.toLocaleString()}</div>
                          <div className="text-xs text-green-600 mt-1">💳 {payments.length} ödeme</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <div className="text-xs text-gray-500 mb-1">Bu Ay Gelir</div>
                          <div className="text-2xl font-extrabold text-orange-500">₺{monthRev.toLocaleString()}</div>
                          <div className="text-xs text-gray-400 mt-1">{new Date().toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <div className="text-xs text-gray-500 mb-2">Son 6 Ay</div>
                          <div className="flex items-end gap-1 h-12">
                            {last6.map(m => (
                              <div key={m.key} className="flex-1 flex flex-col items-center gap-0.5">
                                <div className="w-full bg-orange-500 rounded-sm transition-all" style={{height:`${Math.round(m.rev/maxRev*40)+2}px`, opacity: m.rev>0?1:0.2}} title={`₺${m.rev}`} />
                                <div className="text-[9px] text-gray-400">{m.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-gray-100 flex justify-between">
                        <span className="font-bold text-sm">Son Firmalar</span>
                        <button onClick={()=>setView('firms')} className="text-xs text-orange-500 hover:underline">Tümü →</button>
                      </div>
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr>{['Firma','Kategori','Plan','Durum'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                        <tbody>
                          {firms.slice(0,6).map((f,i)=>(
                            <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={()=>setView('firms')}>
                              <td className="px-4 py-3"><div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:COLORS[i%COLORS.length]}}>{f.name[0]}</div>
                                <div><div className="font-semibold text-sm">{f.name}</div><div className="text-xs text-gray-400">{f.city}</div></div>
                              </div></td>
                              <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200">{f.category}</span></td>
                              <td className="px-4 py-3"><PlanBdg p={f.plan} /></td>
                              <td className="px-4 py-3"><StatusBdg s={f.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="font-bold text-sm mb-3">Bekleyen Başvurular</div>
                        {reviewFirms.length===0?<div className="text-sm text-gray-400 text-center py-4">Bekleyen başvuru yok ✅</div>:
                          reviewFirms.slice(0,4).map(f=>(
                            <div key={f.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                              <div><div className="text-sm font-semibold">{f.name}</div><div className="text-xs text-gray-400">{f.category}</div></div>
                              <div className="flex gap-1.5">
                                <button onClick={()=>approveFirm(f.id,f.name)} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1 rounded-lg font-semibold">✓</button>
                                <button onClick={()=>rejectFirm(f.id,f.name)} className="text-xs bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-2.5 py-1 rounded-lg font-semibold">✗</button>
                              </div>
                            </div>
                          ))
                        }
                        {reviewFirms.length>4&&<button onClick={()=>setView('requests')} className="w-full text-xs text-orange-500 mt-2 hover:underline">+{reviewFirms.length-4} daha →</button>}
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="font-bold text-sm mb-3">Abonelik Dağılımı</div>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[['free','Ücretsiz','#6b7280'],['pro','Pro','#f97316'],['enterprise','Enterprise','#1e293b']].map(([p,l,c])=>(
                          <div key={p} className="text-center p-2 rounded-xl border border-gray-100">
                            <div className="text-xl font-extrabold" style={{color:c}}>{planCounts[p]||0}</div>
                            <div className="text-xs text-gray-500">{l}</div>
                          </div>
                        ))}
                      </div>
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

              {view==='firms'&&(
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div><h1 className="text-xl font-bold">Firmalar</h1><p className="text-gray-500 text-sm">{firms.length} firma · {activeFirms.length} aktif</p></div>
                    <div className="flex gap-2">
                      <button onClick={()=>setView('requests')} className="border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        📬 {reviewFirms.length>0&&<span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{reviewFirms.length}</span>}
                      </button>
                      <button onClick={()=>setModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Firma Ekle</button>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex gap-3 flex-wrap">
                      <input className="flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" placeholder="Ara..." value={search} onChange={e=>setSearch(e.target.value)} />
                      <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" value={statusF} onChange={e=>setStatusF(e.target.value)}>
                        <option value="">Tüm Durumlar</option><option value="active">Aktif</option><option value="review">İnceleme</option><option value="suspended">Askıya</option><option value="passive">Pasif</option>
                      </select>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr>{['Firma','Şehir','Kategori','Plan','Durum','Kayıt',''].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                        <tbody>
                          {filtered.map((f,i)=>(
                            <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50 group">
                              <td className="px-4 py-3"><div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:COLORS[i%COLORS.length]}}>{f.name[0]}</div>
                                <div><div className="font-semibold text-sm">{f.name}</div><div className="text-xs text-gray-400">{f.email||'—'}</div></div>
                              </div></td>
                              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{f.city}</td>
                              <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200">{f.category}</span></td>
                              <td className="px-4 py-3"><PlanBdg p={f.plan} /></td>
                              <td className="px-4 py-3"><StatusBdg s={f.status} /></td>
                              <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(f.created_at).toLocaleDateString('tr-TR')}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {f.status==='review'&&<button onClick={()=>approveFirm(f.id,f.name)} className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded-lg font-semibold">Onayla</button>}
                                  {f.status==='active'&&<button onClick={()=>suspendFirm(f.id,f.name)} className="text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg font-semibold">Askıya Al</button>}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filtered.length===0&&<tr><td colSpan="7" className="px-4 py-10 text-center text-gray-400">Sonuç bulunamadı</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-5 py-3 border-t border-gray-100 text-sm text-gray-500">{filtered.length} firma</div>
                  </div>
                </div>
              )}

              {view==='requests'&&(
                <div>
                  <h1 className="text-xl font-bold mb-5">Firma Başvuruları</h1>
                  {reviewFirms.length>0&&<div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-sm">⚠️ <div><b>{reviewFirms.length} başvuru</b> inceleme bekliyor.</div></div>}
                  {reviewFirms.length===0?(
                    <div className="bg-white border border-gray-200 rounded-xl p-16 text-center"><div className="text-5xl mb-4">✅</div><div className="font-bold mb-1">Bekleyen başvuru yok</div></div>
                  ):(
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr>{['Firma','Sahip','Kategori','Şehir','Tarih','İşlemler'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                        <tbody>
                          {reviewFirms.map((f,i)=>(
                            <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-3"><div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:COLORS[i%COLORS.length]}}>{f.name[0]}</div>
                                <span className="font-semibold text-sm">{f.name}</span>
                              </div></td>
                              <td className="px-4 py-3 text-sm text-gray-500">{f.owner_name||'—'}</td>
                              <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200">{f.category}</span></td>
                              <td className="px-4 py-3 text-sm text-gray-500">{f.city}</td>
                              <td className="px-4 py-3 text-xs text-gray-400">{new Date(f.created_at).toLocaleDateString('tr-TR')}</td>
                              <td className="px-4 py-3"><div className="flex gap-2">
                                <button onClick={()=>approveFirm(f.id,f.name)} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-semibold">✓ Onayla</button>
                                <button onClick={()=>rejectFirm(f.id,f.name)} className="text-xs bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-3 py-1.5 rounded-lg font-semibold">✗ Reddet</button>
                              </div></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {view==='users'&&(
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div><h1 className="text-xl font-bold">Kullanıcılar</h1><p className="text-gray-500 text-sm">{profiles.length} kayıtlı kullanıcı</p></div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                    <KPI label="Toplam" value={profiles.length} color="blue" />
                    <KPI label="Müşteri" value={profiles.filter(p=>p.role==='customer').length} color="green" />
                    <KPI label="Firma Sahibi" value={profiles.filter(p=>p.role==='business_owner').length} color="orange" />
                    <KPI label="Admin" value={profiles.filter(p=>p.role==='admin').length} color="gray" />
                  </div>
                  {/* Segment tabları */}
                  {['Tümü','Müşteriler','Firma Sahipleri','Adminler'].map((seg,si)=>{
                    const roleMap=[null,'customer','business_owner','admin']
                    const segProfiles = roleMap[si] ? profiles.filter(p=>p.role===roleMap[si]) : profiles
                    return null
                  })}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {[['all','Tümü',profiles.length],['customer','Müşteriler',profiles.filter(p=>p.role==='customer').length],['business_owner','Firma Sahipleri',profiles.filter(p=>p.role==='business_owner').length],['admin','Adminler',profiles.filter(p=>p.role==='admin').length]].map(([r,l,c])=>(
                      <button key={r} onClick={()=>setSearch(r==='all'?'':r)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${(r==='all'&&!['customer','business_owner','admin'].includes(search))||search===r?'bg-orange-500 text-white border-orange-500':'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        {l} <span className="opacity-70">({c})</span>
                      </button>
                    ))}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-gray-50"><tr>{['Kullanıcı','Telefon','Rol','Sadakat Puanı','Kayıt'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                      <tbody>
                        {profiles.filter(p=>!['customer','business_owner','admin'].includes(search)||p.role===search).map((p,i)=>(
                          <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3"><div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:COLORS[i%COLORS.length]}}>{p.full_name?.[0]||'?'}</div>
                              <div><div className="font-semibold text-sm">{p.full_name}</div><div className="text-xs text-gray-400">{p.email}</div></div>
                            </div></td>
                            <td className="px-4 py-3 text-sm text-gray-500">{p.phone||'—'}</td>
                            <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${p.role==='admin'?'bg-slate-800 text-white border-slate-700':p.role==='business_owner'?'bg-orange-50 text-orange-600 border-orange-200':'bg-gray-100 text-gray-600 border-gray-200'}`}>{p.role==='admin'?'👑 Admin':p.role==='business_owner'?'🏢 Firma Sahibi':'👤 Müşteri'}</span></td>
                            <td className="px-4 py-3"><div className="flex items-center gap-1.5"><span className="text-sm font-bold">{p.loyalty_points||0}</span><span className="text-xs text-amber-500">⭐</span></div></td>
                            <td className="px-4 py-3 text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {view==='ads'&&(
                <div>
                  <div className="mb-5"><h1 className="text-lg sm:text-xl font-bold">Reklam Yönetimi</h1><p className="text-gray-500 text-sm">{allAds.length} reklam</p></div>
                  {allAds.length===0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center"><div className="text-4xl mb-3">📢</div><div className="text-gray-400">Henüz reklam yok</div></div>
                  ) : (
                    <div className="space-y-3">
                      {allAds.map(ad=>(
                        <div key={ad.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <div className="flex items-start gap-4 flex-wrap">
                            {ad.image_url && <img src={ad.image_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0"/>}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-bold text-sm">{ad.businesses?.emoji} {ad.businesses?.name}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${ad.status==='active'?'bg-green-50 text-green-700 border-green-200':ad.status==='pending'?'bg-amber-50 text-amber-700 border-amber-200':'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                  {ad.status==='active'?'● Aktif':ad.status==='pending'?'⏳ Bekliyor':'⏸ Durdu'}
                                </span>
                                <span className="text-xs text-gray-400">{ad.type==='regional'?'📍 Bölgesel':'🌍 Genel'}</span>
                              </div>
                              <div className="font-semibold text-sm">{ad.title}</div>
                              {ad.description && <div className="text-xs text-gray-500 mt-0.5">{ad.description}</div>}
                              <div className="flex gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                                {ad.target_city && <span>📍 {ad.target_city}{ad.target_district?' / '+ad.target_district:''} · {ad.target_radius_km}km</span>}
                                {ad.discount_pct>0 && <span className="text-orange-500 font-bold">%{ad.discount_pct} indirim</span>}
                                <span>👁 {ad.impressions} · 🖱 {ad.clicks}</span>
                                <span>Bitiş: {new Date(ad.ends_at).toLocaleDateString('tr-TR')}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              {/* Durum değiştir */}
                              <div className="flex flex-col gap-1.5">
                                {ad.status==='pending' && (
                                  <button onClick={async()=>{
                                    await supabase.from('ads').update({status:'active'}).eq('id',ad.id)
                                    setAllAds(p=>p.map(a=>a.id===ad.id?{...a,status:'active'}:a))
                                  }} className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold">✓ Onayla</button>
                                )}
                                <select value={ad.status} onChange={async e=>{
                                  const s = e.target.value
                                  await supabase.from('ads').update({status:s}).eq('id',ad.id)
                                  setAllAds(p=>p.map(a=>a.id===ad.id?{...a,status:s}:a))
                                }} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
                                  <option value="pending">⏳ Bekliyor</option>
                                  <option value="active">● Aktif</option>
                                  <option value="paused">⏸ Durdur</option>
                                  <option value="expired">❌ Süresi doldu</option>
                                </select>
                              </div>
                              {/* Tür değiştir */}
                              <select value={ad.type} onChange={async e=>{
                                const t = e.target.value
                                await supabase.from('ads').update({type:t}).eq('id',ad.id)
                                setAllAds(p=>p.map(a=>a.id===ad.id?{...a,type:t}:a))
                              }} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
                                <option value="general">🌍 Genel</option>
                                <option value="regional">📍 Bölgesel</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {view==='subscriptions'&&(
                <div>
                  <h1 className="text-xl font-bold mb-5">Abonelikler</h1>
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    <KPI label="Pro Plan" value={planCounts.pro||0} sub={`₺${(planCounts.pro||0)*300}/ay`} color="orange" />
                    <KPI label="Enterprise" value={planCounts.enterprise||0} sub={`₺${(planCounts.enterprise||0)*750}/ay`} color="blue" />
                    <KPI label="Ücretsiz" value={planCounts.free||0} sub="Deneme" color="gray" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50"><tr>{['Firma','Plan','Durum','İşlem'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                      <tbody>
                        {firms.map(f=>(
                          <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-semibold">{f.name}</td>
                            <td className="px-4 py-3"><PlanBdg p={f.plan} /></td>
                            <td className="px-4 py-3"><StatusBdg s={f.status} /></td>
                            <td className="px-4 py-3"><div className="flex gap-2">
                              <select value={f.plan} onChange={async e=>{
                                const p=e.target.value
                                await supabase.from('businesses').update({plan:p}).eq('id',f.id)
                                setFirms(prev=>prev.map(x=>x.id===f.id?{...x,plan:p}:x))
                              }} className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-orange-400">
                                <option value="free">Ücretsiz</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                              </select>
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
