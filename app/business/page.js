'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const catColors = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444']
const statusBadge = {
  confirmed: <span className="badge-green">✓ Onaylı</span>,
  pending:   <span className="badge-amber">⏳ Bekliyor</span>,
  completed: <span className="badge-gray">Tamamlandı</span>,
  cancelled: <span className="badge-red">İptal</span>,
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
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl" style={{background: color === 'text-orange-500' ? '#f97316' : color === 'text-green-600' ? '#16a34a' : color === 'text-blue-600' ? '#2563eb' : '#dc2626'}} />
    </div>
  )
}

export default function BusinessPage() {
  const [view, setView] = useState('dashboard')
  const [bizId, setBizId] = useState(null)
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(false)

  // Appt form
  const [form, setForm] = useState({ cname:'', cemail:'', service:'', staff:'', date:'', time:'14:00' })
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  const loadDashboard = useCallback(async (bId) => {
    setLoading(true)
    const [appts, staffList, svcList] = await Promise.all([
      supabase.from('appointments').select('*, profiles(full_name,email), services(name,price), staff(name)').eq('business_id', bId).order('appointment_date', { ascending: false }),
      supabase.from('staff').select('*').eq('business_id', bId),
      supabase.from('services').select('*').eq('business_id', bId),
    ])
    const a = appts.data || []
    const s = staffList.data || []
    const sv = svcList.data || []
    setStaff(s); setServices(sv)
    const confirmed = a.filter(x => x.status !== 'cancelled')
    const revenue = confirmed.reduce((sum, x) => sum + (x.price || 0), 0)
    setData({ appts: a, staff: s, services: sv, stats: { revenue, apptCount: a.length, customerCount: new Set(a.map(x=>x.profile_id)).size } })
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.from('businesses').select('id').eq('name','Aura Beauty Lounge').single()
      .then(({ data: b }) => { if (b) { setBizId(b.id); loadDashboard(b.id) } })
  }, [loadDashboard])

  const navItems = [
    ['dashboard','⊞','Dashboard'],
    ['appointments','📅','Randevular'],
    ['staff','👥','Personel'],
    ['services','✨','Hizmetler'],
    ['customers','🤝','Müşteriler'],
    ['reports','📊','Raporlar'],
  ]

  async function saveAppt() {
    if (!form.cname || !form.service || !form.date) { showToast('Zorunlu alanları doldurun'); return }
    let profileId = null
    if (form.cemail) {
      const { data: existing } = await supabase.from('profiles').select('id').eq('email', form.cemail).single()
      if (existing) { profileId = existing.id }
      else {
        const { data: np } = await supabase.from('profiles').insert({ full_name: form.cname, email: form.cemail, role: 'customer' }).select('id').single()
        profileId = np?.id
      }
    }
    const svc = services.find(s => s.id === form.service)
    await supabase.from('appointments').insert({
      business_id: bizId, profile_id: profileId,
      service_id: form.service, staff_id: form.staff || null,
      appointment_date: form.date, appointment_time: form.time,
      status: 'pending', price: svc?.price || 0
    })
    setModal(false)
    showToast('Randevu oluşturuldu! ✅')
    loadDashboard(bizId)
    setForm({ cname:'', cemail:'', service:'', staff:'', date:'', time:'14:00' })
  }

  async function confirmAppt(id) {
    await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', id)
    showToast('Randevu onaylandı ✅')
    loadDashboard(bizId)
  }
  async function cancelAppt(id) {
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
    showToast('Randevu iptal edildi')
    loadDashboard(bizId)
  }

  const svcDist = (data.services || []).reduce((acc, s, i) => {
    const cnt = (data.appts || []).filter(a => a.service_id === s.id).length
    acc.push({ name: s.name, count: cnt, color: catColors[i%catColors.length] })
    return acc
  }, []).sort((a,b)=>b.count-a.count)
  const maxSvc = Math.max(...svcDist.map(x=>x.count), 1)

  const staffRank = (data.staff || []).map((s, i) => ({
    ...s,
    apptCount: (data.appts||[]).filter(a=>a.staff_id===s.id).length,
    color: catColors[i%catColors.length]
  })).sort((a,b)=>b.apptCount-a.apptCount)

  const uniqueCustomers = {}
  ;(data.appts||[]).forEach(a => { if (a.profiles) uniqueCustomers[a.profile_id] = a.profiles })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-lg">
          {toast}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex items-start justify-between">
              <div>
                <div className="font-bold text-base">Randevu Ekle</div>
                <div className="text-xs text-gray-500 mt-0.5">Yeni randevu oluştur</div>
              </div>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-gray-700 block mb-1">Müşteri Adı *</label>
                  <input className="input" placeholder="Ad Soyad" value={form.cname} onChange={e=>setForm(f=>({...f,cname:e.target.value}))} /></div>
                <div><label className="text-xs font-bold text-gray-700 block mb-1">E-posta</label>
                  <input className="input" type="email" placeholder="musteri@email.com" value={form.cemail} onChange={e=>setForm(f=>({...f,cemail:e.target.value}))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-gray-700 block mb-1">Hizmet *</label>
                  <select className="input" value={form.service} onChange={e=>setForm(f=>({...f,service:e.target.value}))}>
                    <option value="">Seçin</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} (₺{s.price})</option>)}
                  </select></div>
                <div><label className="text-xs font-bold text-gray-700 block mb-1">Personel</label>
                  <select className="input" value={form.staff} onChange={e=>setForm(f=>({...f,staff:e.target.value}))}>
                    <option value="">Seçin</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-gray-700 block mb-1">Tarih *</label>
                  <input className="input" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></div>
                <div><label className="text-xs font-bold text-gray-700 block mb-1">Saat</label>
                  <select className="input" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}>
                    {['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'].map(t=><option key={t}>{t}</option>)}
                  </select></div>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button onClick={() => setModal(false)} className="btn-outline btn-sm">İptal</button>
              <button onClick={saveAppt} className="btn-primary btn-sm">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Layout */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh)]" style={{paddingTop:0}}>
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 bg-slate-800 flex flex-col">
          <div className="p-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-sm">💆</div>
              <div>
                <div className="text-white text-sm font-bold">Aura Beauty</div>
                <div className="text-white/30 text-xs">Firma Paneli</div>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-2 space-y-0.5">
            {navItems.map(([key, icon, label]) => (
              <button key={key} onClick={() => setView(key)}
                className={`sidebar-item w-full ${view===key?'active':''}`}>
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
            <span className="text-sm font-semibold text-gray-800">{navItems.find(x=>x[0]===view)?.[2]}</span>
            <div className="ml-auto flex gap-2">
              <button onClick={() => { setModal(true); setForm(f=>({...f, date: new Date().toISOString().split('T')[0]})) }}
                className="btn-primary btn-sm text-xs">+ Randevu Ekle</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center gap-3 text-gray-400 justify-center py-16"><Spinner /> Supabase'den yükleniyor...</div>
            ) : (
              <>
                {/* DASHBOARD */}
                {view === 'dashboard' && (
                  <div>
                    <div className="mb-5"><h1 className="text-xl font-bold">Dashboard</h1><p className="text-gray-500 text-sm mt-0.5">Aura Beauty Lounge · Kadıköy, İstanbul</p></div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                      <KPI label="Bu Ay Gelir" value={`₺${(data.stats?.revenue||24600).toLocaleString()}`} delta="↑ %18" color="text-orange-500" />
                      <KPI label="Randevu" value={data.stats?.apptCount||0} delta="↑ %12" color="text-green-600" />
                      <KPI label="Müşteri" value={data.stats?.customerCount||0} delta="↑ %8" color="text-blue-600" />
                      <KPI label="Personel" value={data.staff?.length||0} color="text-purple-600" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      <div className="lg:col-span-2 card overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                          <div className="font-bold text-sm">Son Randevular</div>
                          <button onClick={() => setView('appointments')} className="text-xs text-orange-500 hover:underline">Tümünü Gör →</button>
                        </div>
                        <table className="w-full">
                          <thead className="bg-gray-50"><tr><th className="th">Müşteri</th><th className="th">Hizmet</th><th className="th">Saat</th><th className="th">Durum</th></tr></thead>
                          <tbody>
                            {(data.appts||[]).slice(0,5).map(a => (
                              <tr key={a.id} className="table-row">
                                <td className="td font-semibold">{a.profiles?.full_name||'—'}</td>
                                <td className="td text-gray-500">{a.services?.name||'—'}</td>
                                <td className="td font-semibold">{String(a.appointment_time).slice(0,5)}</td>
                                <td className="td">{statusBadge[a.status]||a.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="space-y-4">
                        <div className="card p-4">
                          <div className="font-bold text-sm mb-3">Personel Durumu</div>
                          <div className="space-y-2.5">
                            {(data.staff||[]).map((s,i)=>(
                              <div key={s.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:catColors[i%catColors.length]}}>{s.name[0]}</div>
                                  <span className="text-sm font-semibold">{s.name.split(' ')[0]}</span>
                                </div>
                                <span className={`badge-${s.status==='available'?'green':'amber'}`}>{s.status==='available'?'Müsait':'Meşgul'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="card p-4">
                          <div className="font-bold text-sm mb-3">Hizmet Dağılımı</div>
                          {svcDist.map(s=>(
                            <div key={s.name} className="mb-2">
                              <div className="flex justify-between text-xs mb-1"><span>{s.name}</span><span className="font-bold">{s.count} rndv</span></div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{width:`${maxSvc?s.count/maxSvc*100:0}%`,background:s.color}} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* APPOINTMENTS */}
                {view === 'appointments' && (
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <h1 className="text-xl font-bold">Randevular</h1>
                      <button onClick={() => { setModal(true); setForm(f=>({...f,date:new Date().toISOString().split('T')[0]})) }}
                        className="btn-primary btn-sm">+ Ekle</button>
                    </div>
                    <div className="card overflow-hidden">
                      <div className="flex gap-3 p-4 border-b border-gray-100 flex-wrap">
                        <select className="input w-40"><option>Tüm Durumlar</option><option>Onaylı</option><option>Bekliyor</option><option>Tamamlandı</option></select>
                        <select className="input w-40"><option>Tüm Personel</option>{(data.staff||[]).map(s=><option key={s.id}>{s.name}</option>)}</select>
                      </div>
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr><th className="th">Müşteri</th><th className="th">Hizmet</th><th className="th">Personel</th><th className="th">Tarih</th><th className="th">Saat</th><th className="th">Tutar</th><th className="th">Durum</th><th className="th" /></tr></thead>
                        <tbody>
                          {(data.appts||[]).map(a=>(
                            <tr key={a.id} className="table-row">
                              <td className="td font-semibold">{a.profiles?.full_name||'—'}</td>
                              <td className="td text-gray-500">{a.services?.name||'—'}</td>
                              <td className="td text-gray-500">{a.staff?.name||'—'}</td>
                              <td className="td text-gray-500">{new Date(a.appointment_date).toLocaleDateString('tr-TR')}</td>
                              <td className="td font-semibold">{String(a.appointment_time).slice(0,5)}</td>
                              <td className="td font-semibold">₺{a.price||0}</td>
                              <td className="td">{statusBadge[a.status]||a.status}</td>
                              <td className="td">
                                <div className="flex gap-1.5">
                                  {a.status==='pending' && <button onClick={()=>confirmAppt(a.id)} className="btn-primary btn-sm text-xs px-2 py-1">✓</button>}
                                  {['pending','confirmed'].includes(a.status) && <button onClick={()=>cancelAppt(a.id)} className="btn-ghost btn-sm text-red-500 text-xs px-2 py-1">✗</button>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="px-5 py-3 border-t border-gray-100 text-sm text-gray-500">{data.appts?.length||0} randevu</div>
                    </div>
                  </div>
                )}

                {/* STAFF */}
                {view === 'staff' && (
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <h1 className="text-xl font-bold">Personel</h1>
                      <button className="btn-primary btn-sm">+ Personel Ekle</button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                      <KPI label="Toplam" value={(data.staff||[]).length} color="text-gray-800" />
                      <KPI label="Müsait" value={(data.staff||[]).filter(s=>s.status==='available').length} color="text-green-600" />
                      <KPI label="Meşgul" value={(data.staff||[]).filter(s=>s.status==='busy').length} color="text-amber-600" />
                      <KPI label="Ort. Puan" value="4.8" color="text-amber-500" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(data.staff||[]).map((s,i)=>(
                        <div key={s.id} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-extrabold text-white" style={{background:catColors[i%catColors.length]}}>{s.name[0]}</div>
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${s.status==='available'?'bg-green-500':'bg-amber-500'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold">{s.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{s.speciality}</div>
                          </div>
                          <span className={`badge-${s.status==='available'?'green':'amber'}`}>{s.status==='available'?'Müsait':'Meşgul'}</span>
                          <div className="text-right flex-shrink-0">
                            <div className="text-lg font-extrabold text-orange-500">{s.appointment_count}</div>
                            <div className="text-xs text-gray-400">randevu</div>
                            <div className="text-xs font-bold text-amber-500">★ {s.rating}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SERVICES */}
                {view === 'services' && (
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <h1 className="text-xl font-bold">Hizmetler</h1>
                      <button className="btn-primary btn-sm">+ Hizmet Ekle</button>
                    </div>
                    <div className="card overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr><th className="th">Hizmet</th><th className="th">Süre</th><th className="th">Fiyat</th><th className="th">Durum</th></tr></thead>
                        <tbody>
                          {(data.services||[]).map(s=>(
                            <tr key={s.id} className="table-row">
                              <td className="td font-semibold">{s.name}</td>
                              <td className="td text-gray-500">{s.duration_min} dk</td>
                              <td className="td font-semibold text-orange-600">₺{s.price}</td>
                              <td className="td"><span className={`badge-${s.status==='active'?'green':'amber'}`}>{s.status==='active'?'Aktif':'Pasif'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* CUSTOMERS */}
                {view === 'customers' && (
                  <div>
                    <h1 className="text-xl font-bold mb-5">Müşteriler</h1>
                    <div className="card overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr><th className="th">Müşteri</th><th className="th">E-posta</th><th className="th">Randevu</th><th className="th">Harcama</th></tr></thead>
                        <tbody>
                          {Object.entries(uniqueCustomers).map(([pid, c],i)=>{
                            const cnt = (data.appts||[]).filter(a=>a.profile_id===pid).length
                            const spend = (data.appts||[]).filter(a=>a.profile_id===pid).reduce((s,a)=>s+(a.price||0),0)
                            return (
                              <tr key={pid} className="table-row">
                                <td className="td"><div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:catColors[i%catColors.length]}}>{c.full_name?.[0]}</div>
                                  <span className="font-semibold">{c.full_name}</span>
                                </div></td>
                                <td className="td text-gray-500">{c.email}</td>
                                <td className="td font-semibold">{cnt}</td>
                                <td className="td font-semibold text-orange-600">₺{spend}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* REPORTS */}
                {view === 'reports' && (
                  <div>
                    <h1 className="text-xl font-bold mb-5">Raporlar</h1>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                      <KPI label="Gelir" value={`₺${(data.stats?.revenue||0).toLocaleString()}`} delta="↑ %18" color="text-orange-500" />
                      <KPI label="Randevu" value={data.stats?.apptCount||0} delta="↑ %12" color="text-green-600" />
                      <KPI label="Doluluk" value="%87" delta="↑ %4" color="text-blue-600" />
                      <KPI label="İptal" value={`%${data.appts?.length?Math.round((data.appts.filter(a=>a.status==='cancelled').length/data.appts.length)*100):0}`} color="text-red-500" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="card p-5">
                        <div className="font-bold text-sm mb-4">Hizmet Dağılımı</div>
                        {svcDist.map(s=>(
                          <div key={s.name} className="mb-3">
                            <div className="flex justify-between text-sm mb-1.5"><span className="font-medium">{s.name}</span><span className="font-bold">{maxSvc?Math.round(s.count/maxSvc*100):0}%</span></div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{width:`${maxSvc?s.count/maxSvc*100:0}%`,background:s.color}} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="card p-5">
                        <div className="font-bold text-sm mb-4">Personel Sıralaması</div>
                        {staffRank.map((s,i)=>(
                          <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                            <span className="text-xl w-6">{['🥇','🥈','🥉'][i]||'🎖️'}</span>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:s.color}}>{s.name[0]}</div>
                            <div className="flex-1"><div className="font-semibold text-sm">{s.name}</div><div className="text-xs text-gray-500">{s.apptCount} randevu</div></div>
                            <div className="text-base font-extrabold text-orange-500">{s.apptCount*580 ? `₺${(s.apptCount*580).toLocaleString()}` : '—'}</div>
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
    </div>
  )
}
