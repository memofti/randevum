'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const CAT_COLORS = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444']
const STATUS_CFG = {
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}
const STATUS_LBL = { confirmed:'✓ Onaylı', pending:'⏳ Bekliyor', completed:'Tamamlandı', cancelled:'İptal' }

function Spinner() { return <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin flex-shrink-0" /> }
function Badge({ s }) {
  return <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_CFG[s]||STATUS_CFG.completed}`}>{STATUS_LBL[s]||s}</span>
}
function KPI({ label, value, delta, color }) {
  const bar = {orange:'#f97316',green:'#16a34a',blue:'#2563eb',purple:'#9333ea',red:'#dc2626'}
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 relative overflow-hidden shadow-sm">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-extrabold tracking-tight mb-1 text-${color}-500`}>{value}</div>
      {delta && <div className="text-xs font-semibold text-green-600">{delta}</div>}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl" style={{background:bar[color]||'#ccc'}} />
    </div>
  )
}

const NAV = [['dashboard','⊞','Dashboard'],['appointments','📅','Randevular'],['staff','👥','Personel'],['services','✨','Hizmetler'],['customers','🤝','Müşteriler'],['reports','📊','Raporlar']]

export default function BusinessPage() {
  const [view, setView]     = useState('dashboard')
  const [bizId, setBizId]   = useState(null)
  const [appts, setAppts]   = useState([])
  const [staff, setStaff]   = useState([])
  const [services, setSvc]  = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast]   = useState(null)
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState({cname:'',cemail:'',service:'',staff:'',date:'',time:'10:00'})

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  useEffect(() => {
    supabase.from('businesses').select('id').eq('name','Aura Beauty Lounge').single()
      .then(({ data:b }) => { if (b) { setBizId(b.id); loadData(b.id) } })
  }, [])

  async function loadData(bId) {
    setLoading(true)
    const [a, s, sv] = await Promise.all([
      supabase.from('appointments').select('*, profiles(full_name,email), services(name,price), staff(name)').eq('business_id',bId).order('appointment_date',{ascending:false}),
      supabase.from('staff').select('*').eq('business_id',bId),
      supabase.from('services').select('*').eq('business_id',bId),
    ])
    setAppts(a.data||[]); setStaff(s.data||[]); setSvc(sv.data||[])
    setLoading(false)
  }

  async function confirmAppt(id) {
    await supabase.from('appointments').update({status:'confirmed'}).eq('id',id)
    setAppts(prev => prev.map(a => a.id===id ? {...a,status:'confirmed'} : a))
    showToast('Randevu onaylandı ✅')
  }
  async function cancelAppt(id) {
    await supabase.from('appointments').update({status:'cancelled'}).eq('id',id)
    setAppts(prev => prev.map(a => a.id===id ? {...a,status:'cancelled'} : a))
    showToast('Randevu iptal edildi')
  }
  async function saveAppt() {
    if (!form.cname||!form.service||!form.date) { showToast('❌ Zorunlu alanları doldurun'); return }
    let profileId = null
    if (form.cemail) {
      const {data:ex} = await supabase.from('profiles').select('id').eq('email',form.cemail).single()
      if (ex) profileId = ex.id
      else {
        const {data:np} = await supabase.from('profiles').insert({full_name:form.cname,email:form.cemail,role:'customer'}).select('id').single()
        profileId = np?.id
      }
    }
    const svc = services.find(s => s.id===form.service)
    await supabase.from('appointments').insert({
      business_id:bizId, profile_id:profileId,
      service_id:form.service, staff_id:form.staff||null,
      appointment_date:form.date, appointment_time:form.time,
      status:'pending', price:svc?.price||0
    })
    setModal(false)
    setForm({cname:'',cemail:'',service:'',staff:'',date:'',time:'10:00'})
    showToast('Randevu oluşturuldu ✅')
    if (bizId) loadData(bizId)
  }

  const revenue = appts.filter(a=>a.status!=='cancelled').reduce((s,a)=>s+(a.price||0),0)
  const customers = [...new Set(appts.map(a=>a.profile_id).filter(Boolean))]
  const svcDist = services.map((s,i) => ({...s, cnt:appts.filter(a=>a.service_id===s.id).length, color:CAT_COLORS[i%CAT_COLORS.length]})).sort((a,b)=>b.cnt-a.cnt)
  const maxCnt = Math.max(...svcDist.map(s=>s.cnt), 1)
  const custMap = {}
  appts.forEach(a => { if(a.profiles) custMap[a.profile_id]=a.profiles })

  return (
    <div className="flex h-screen bg-gray-50">
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-xl">{toast}</div>}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between">
              <div><div className="font-bold">Randevu Ekle</div><div className="text-xs text-gray-500">Yeni randevu oluştur</div></div>
              <button onClick={()=>setModal(false)} className="text-gray-400 hover:text-gray-600 text-lg w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Müşteri Adı *</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-orange-400" value={form.cname} onChange={e=>setForm(f=>({...f,cname:e.target.value}))} placeholder="Ad Soyad" /></div>
                <div><label className="text-xs font-bold block mb-1">E-posta</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-orange-400" value={form.cemail} onChange={e=>setForm(f=>({...f,cemail:e.target.value}))} placeholder="mail@email.com" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Hizmet *</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-orange-400" value={form.service} onChange={e=>setForm(f=>({...f,service:e.target.value}))}>
                    <option value="">Seçin</option>
                    {services.map(s=><option key={s.id} value={s.id}>{s.name} (₺{s.price})</option>)}
                  </select></div>
                <div><label className="text-xs font-bold block mb-1">Personel</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-orange-400" value={form.staff} onChange={e=>setForm(f=>({...f,staff:e.target.value}))}>
                    <option value="">Seçin</option>
                    {staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Tarih *</label>
                  <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-orange-400" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></div>
                <div><label className="text-xs font-bold block mb-1">Saat</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-orange-400" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}>
                    {['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(t=><option key={t}>{t}</option>)}
                  </select></div>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button onClick={()=>setModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={saveAppt} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-52 flex-shrink-0 bg-slate-800 flex flex-col">
        <div className="p-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-sm">💆</div>
            <div><div className="text-white text-sm font-bold">Aura Beauty</div><div className="text-white/30 text-xs">Firma Paneli</div></div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(([key,icon,label]) => (
            <button key={key} onClick={() => setView(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${view===key?'bg-white/[0.1] text-white font-semibold':'text-white/50 hover:text-white/85 hover:bg-white/[0.07]'}`}>
              {view===key && <div className="absolute left-0 top-[22%] bottom-[22%] w-0.5 bg-orange-500 rounded-r" />}
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/[0.07]">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/[0.05]">
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white">S</div>
            <div><div className="text-xs font-semibold text-white/85">Selin Hartavi</div><div className="text-xs text-white/30">Firma Sahibi</div></div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-5 gap-2 flex-shrink-0">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← Ana Sayfa</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-800">{NAV.find(x=>x[0]===view)?.[2]}</span>
          <div className="ml-auto">
            <button onClick={() => { setForm(f=>({...f,date:new Date().toISOString().split('T')[0]})); setModal(true) }}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">+ Randevu Ekle</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-3 text-gray-400 py-20"><Spinner /> Yükleniyor...</div>
          ) : (
            <>
              {view === 'dashboard' && (
                <div>
                  <div className="mb-5"><h1 className="text-xl font-bold">Dashboard</h1><p className="text-gray-500 text-sm">Aura Beauty Lounge · Kadıköy, İstanbul</p></div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                    <KPI label="Gelir" value={`₺${revenue.toLocaleString()||'0'}`} delta="↑ %18" color="orange" />
                    <KPI label="Randevu" value={appts.length} delta="↑ %12" color="green" />
                    <KPI label="Müşteri" value={customers.length} delta="↑ %8" color="blue" />
                    <KPI label="Personel" value={staff.length} color="purple" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-gray-100 flex justify-between items-center">
                        <div className="font-bold text-sm">Son Randevular</div>
                        <button onClick={()=>setView('appointments')} className="text-xs text-orange-500 hover:underline">Tümü →</button>
                      </div>
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Müşteri</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Hizmet</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Saat</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Durum</th>
                        </tr></thead>
                        <tbody>
                          {appts.slice(0,5).map(a => (
                            <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-semibold">{a.profiles?.full_name||'—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{a.services?.name||'—'}</td>
                              <td className="px-4 py-3 text-sm font-semibold">{String(a.appointment_time).slice(0,5)}</td>
                              <td className="px-4 py-3"><Badge s={a.status} /></td>
                            </tr>
                          ))}
                          {appts.length === 0 && <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-400 text-sm">Randevu bulunamadı</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="font-bold text-sm mb-3">Personel Durumu</div>
                        <div className="space-y-2.5">
                          {staff.map((s,i) => (
                            <div key={s.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:CAT_COLORS[i%CAT_COLORS.length]}}>{s.name[0]}</div>
                                <span className="text-sm font-medium">{s.name.split(' ')[0]}</span>
                              </div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${s.status==='available'?'bg-green-50 text-green-700 border-green-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {s.status==='available'?'Müsait':'Meşgul'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="font-bold text-sm mb-3">Hizmet Dağılımı</div>
                        {svcDist.map(s => (
                          <div key={s.id} className="mb-2.5">
                            <div className="flex justify-between text-xs mb-1"><span>{s.name}</span><span className="font-bold">{s.cnt} rndv</span></div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{width:`${s.cnt/maxCnt*100}%`,background:s.color}} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {view === 'appointments' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h1 className="text-xl font-bold">Randevular</h1>
                    <button onClick={() => { setForm(f=>({...f,date:new Date().toISOString().split('T')[0]})); setModal(true) }}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Ekle</button>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50"><tr>
                        {['Müşteri','Hizmet','Personel','Tarih','Saat','Tutar','Durum',''].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {appts.map(a => (
                          <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-semibold">{a.profiles?.full_name||'—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{a.services?.name||'—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{a.staff?.name||'—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{new Date(a.appointment_date).toLocaleDateString('tr-TR')}</td>
                            <td className="px-4 py-3 text-sm font-semibold">{String(a.appointment_time).slice(0,5)}</td>
                            <td className="px-4 py-3 text-sm font-semibold">₺{a.price||0}</td>
                            <td className="px-4 py-3"><Badge s={a.status} /></td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                {a.status==='pending' && <button onClick={()=>confirmAppt(a.id)} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded-lg">✓</button>}
                                {['pending','confirmed'].includes(a.status) && <button onClick={()=>cancelAppt(a.id)} className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-lg">✗</button>}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {appts.length===0 && <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">Randevu bulunamadı</td></tr>}
                      </tbody>
                    </table>
                    <div className="px-5 py-3 border-t border-gray-100 text-sm text-gray-500">{appts.length} randevu</div>
                  </div>
                </div>
              )}

              {view === 'staff' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h1 className="text-xl font-bold">Personel</h1>
                    <button className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Personel Ekle</button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                    <KPI label="Toplam" value={staff.length} color="blue" />
                    <KPI label="Müsait" value={staff.filter(s=>s.status==='available').length} color="green" />
                    <KPI label="Meşgul" value={staff.filter(s=>s.status==='busy').length} color="orange" />
                    <KPI label="İzinli" value={staff.filter(s=>s.status==='off').length} color="purple" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {staff.map((s,i) => (
                      <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-extrabold text-white" style={{background:CAT_COLORS[i%CAT_COLORS.length]}}>{s.name[0]}</div>
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${s.status==='available'?'bg-green-500':'bg-amber-500'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold">{s.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{s.speciality}</div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${s.status==='available'?'bg-green-50 text-green-700 border-green-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {s.status==='available'?'Müsait':'Meşgul'}
                        </span>
                        <div className="text-right">
                          <div className="text-lg font-extrabold text-orange-500">{s.appointment_count}</div>
                          <div className="text-xs text-gray-400">randevu</div>
                          <div className="text-xs font-bold text-amber-500">★ {s.rating}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === 'services' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h1 className="text-xl font-bold">Hizmetler</h1>
                    <button className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Hizmet Ekle</button>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50"><tr>
                        {['Hizmet','Süre','Fiyat','Durum'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {services.map(s => (
                          <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-semibold">{s.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{s.duration_min} dk</td>
                            <td className="px-4 py-3 text-sm font-semibold text-orange-600">₺{s.price}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${s.status==='active'?'bg-green-50 text-green-700 border-green-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {s.status==='active'?'Aktif':'Pasif'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {view === 'customers' && (
                <div>
                  <h1 className="text-xl font-bold mb-5">Müşteriler</h1>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50"><tr>
                        {['Müşteri','E-posta','Randevu','Harcama'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {Object.entries(custMap).map(([pid,c],i) => {
                          const cnt = appts.filter(a=>a.profile_id===pid).length
                          const spend = appts.filter(a=>a.profile_id===pid).reduce((s,a)=>s+(a.price||0),0)
                          return (
                            <tr key={pid} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-3"><div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:CAT_COLORS[i%CAT_COLORS.length]}}>{c.full_name?.[0]}</div>
                                <span className="font-semibold text-sm">{c.full_name}</span>
                              </div></td>
                              <td className="px-4 py-3 text-sm text-gray-500">{c.email}</td>
                              <td className="px-4 py-3 text-sm font-semibold">{cnt}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-orange-600">₺{spend}</td>
                            </tr>
                          )
                        })}
                        {Object.keys(custMap).length===0 && <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-400">Müşteri bulunamadı</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {view === 'reports' && (
                <div>
                  <h1 className="text-xl font-bold mb-5">Raporlar</h1>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                    <KPI label="Gelir" value={`₺${revenue.toLocaleString()}`} delta="↑ %18" color="orange" />
                    <KPI label="Randevu" value={appts.length} delta="↑ %12" color="green" />
                    <KPI label="Doluluk" value="%87" color="blue" />
                    <KPI label="İptal" value={`%${appts.length?Math.round(appts.filter(a=>a.status==='cancelled').length/appts.length*100):0}`} color="red" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="font-bold text-sm mb-4">Hizmet Dağılımı</div>
                      {svcDist.map(s => (
                        <div key={s.id} className="mb-3">
                          <div className="flex justify-between text-sm mb-1.5"><span>{s.name}</span><span className="font-bold">{maxCnt?Math.round(s.cnt/maxCnt*100):0}%</span></div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{width:`${maxCnt?s.cnt/maxCnt*100:0}%`,background:s.color}} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="font-bold text-sm mb-4">Personel Sıralaması</div>
                      {[...staff].sort((a,b)=>b.appointment_count-a.appointment_count).map((s,i) => (
                        <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                          <span className="text-lg">{['🥇','🥈','🥉'][i]||'🎖️'}</span>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:CAT_COLORS[i%CAT_COLORS.length]}}>{s.name[0]}</div>
                          <div className="flex-1"><div className="font-semibold text-sm">{s.name}</div><div className="text-xs text-gray-500">{s.appointment_count} randevu</div></div>
                          <div className="font-extrabold text-orange-500">★ {s.rating}</div>
                        </div>
                      ))}
                    </div>
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
