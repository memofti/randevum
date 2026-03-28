'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const COLORS = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444']
const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
const DAYS   = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz']

function Spin() { return <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin flex-shrink-0" /> }
function Bdg({ s }) {
  const m = {confirmed:['bg-green-50 text-green-700 border-green-200','✓ Onaylı'],pending:['bg-amber-50 text-amber-700 border-amber-200','⏳ Bekliyor'],completed:['bg-gray-100 text-gray-600 border-gray-200','Tamamlandı'],cancelled:['bg-red-50 text-red-600 border-red-200','İptal']}
  const [c,l]=m[s]||m.completed
  return <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${c}`}>{l}</span>
}
function KPI({ label, value, sub, color }) {
  const ac={orange:'#f97316',green:'#16a34a',blue:'#2563eb',purple:'#9333ea',red:'#dc2626'}
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</div>
      <div className="text-3xl font-extrabold tracking-tight mb-1" style={{color:ac[color]||'#111'}}>{value}</div>
      {sub && <div className="text-xs font-semibold text-green-600">{sub}</div>}
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{background:ac[color]||'#ccc'}} />
    </div>
  )
}

const NAV = [['dashboard','⊞','Dashboard'],['calendar','📅','Takvim'],['appointments','📋','Randevular'],['staff','👥','Personel'],['services','✨','Hizmetler'],['customers','🤝','Müşteriler'],['reports','📊','Raporlar']]

export default function BusinessPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard')
  const [bizId, setBizId] = useState(null)
  const [bizInfo, setBizInfo] = useState(null)
  const [appts, setAppts] = useState([])
  const [staff, setStaff] = useState([])
  const [services, setSvcs] = useState([])
  const [notifications, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  // Filters
  const [apptStatus, setApptStatus] = useState('')
  const [apptSearch, setApptSearch] = useState('')
  const [custSearch, setCustSearch] = useState('')
  // Calendar
  const [calDate, setCalDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  // Form
  const [form, setForm] = useState({cname:'',cemail:'',service:'',staff:'',date:'',time:'10:00'})

  const toast3 = (m) => { setToast(m); setTimeout(()=>setToast(''),3500) }
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  // Auth
  useEffect(() => {
    try {
      const raw = localStorage.getItem('randevu_user')
      if (!raw) { router.push('/login'); return }
      setUser(JSON.parse(raw))
    } catch { router.push('/login') }
  }, [router])

  const loadAll = useCallback(async (bId) => {
    setLoading(true)
    try {
      const [ar,sr,svr,nr] = await Promise.all([
        supabase.from('appointments').select('id,profile_id,service_id,staff_id,appointment_date,appointment_time,status,price,profiles(full_name,email),services(name,price),staff(name)').eq('business_id',bId).order('appointment_date',{ascending:false}),
        supabase.from('staff').select('*').eq('business_id',bId),
        supabase.from('services').select('*').eq('business_id',bId),
        supabase.from('notifications').select('*').eq('business_id',bId).order('created_at',{ascending:false}).limit(20),
      ])
      setAppts(ar.data||[])
      setStaff(sr.data||[])
      setSvcs(svr.data||[])
      setNotifs(nr.data||[])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!user) return
    // Önce owner_id ile ara (gerçek kullanıcılar), bulamazsan email ile eşleştir (demo)
    const findBusiness = async () => {
      // owner_id sütunu varsa kullan
      let { data: b } = await supabase.from('businesses').select('*').eq('owner_id', user.id).eq('status','active').maybeSingle()
      if (!b) {
        // Demo fallback: email'e göre eşleştir
        const emailBizMap = { 'selin@email.com': 'Aura Beauty Lounge' }
        const bizName = emailBizMap[user.email]
        if (bizName) {
          const res = await supabase.from('businesses').select('*').eq('name', bizName).maybeSingle()
          b = res.data
        }
      }
      if (b) { setBizId(b.id); setBizInfo(b); loadAll(b.id) } else setLoading(false)
    }
    findBusiness()
  }, [user, loadAll])

  async function confirmAppt(id) {
    await supabase.from('appointments').update({status:'confirmed'}).eq('id',id)
    setAppts(p=>p.map(a=>a.id===id?{...a,status:'confirmed'}:a))
    toast3('✅ Randevu onaylandı')
    // Bildirim mark as read
    const n = notifications.find(n=>n.message?.includes(id))
    if(n) await supabase.from('notifications').update({read:true}).eq('id',n.id)
  }
  async function cancelAppt(id) {
    await supabase.from('appointments').update({status:'cancelled'}).eq('id',id)
    setAppts(p=>p.map(a=>a.id===id?{...a,status:'cancelled'}:a))
    toast3('Randevu iptal edildi')
  }
  async function markAllRead() {
    await supabase.from('notifications').update({read:true}).eq('business_id',bizId)
    setNotifs(p=>p.map(n=>({...n,read:true})))
  }
  async function saveAppt() {
    if(!form.cname||!form.service||!form.date){ toast3('❌ Zorunlu alanları doldurun'); return }
    setSaving(true)
    try {
      let profileId = null
      if(form.cemail){
        const {data:ex}=await supabase.from('profiles').select('id').eq('email',form.cemail).maybeSingle()
        if(ex) profileId=ex.id
        else {
          const {data:np}=await supabase.from('profiles').insert({full_name:form.cname,email:form.cemail,role:'customer'}).select('id').maybeSingle()
          profileId=np?.id
        }
      }
      const svc=services.find(s=>s.id===form.service)
      const {data:newAppt}=await supabase.from('appointments').insert({
        business_id:bizId,profile_id:profileId,service_id:form.service||null,staff_id:form.staff||null,
        appointment_date:form.date,appointment_time:form.time,status:'pending',price:svc?.price||0
      }).select().maybeSingle()
      // Bildirim oluştur
      if(newAppt){
        await supabase.from('notifications').insert({
          business_id:bizId,profile_id:profileId,type:'new_appointment',
          title:'Yeni Randevu Eklendi',
          message:`${form.cname} — ${svc?.name||'Hizmet'} · ${form.date} ${form.time}`,read:false
        })
      }
      setModal(false)
      setForm({cname:'',cemail:'',service:'',staff:'',date:'',time:'10:00'})
      toast3('✅ Randevu oluşturuldu')
      await loadAll(bizId)
    } catch(e){ toast3('❌ '+e.message) }
    finally { setSaving(false) }
  }

  const revenue = appts.filter(a=>a.status!=='cancelled').reduce((s,a)=>s+(a.price||0),0)
  const custMap = {}
  appts.forEach(a=>{ if(a.profiles&&a.profile_id) custMap[a.profile_id]=a.profiles })
  const svcDist = services.map((s,i)=>({...s,cnt:appts.filter(a=>a.service_id===s.id).length,color:COLORS[i%COLORS.length]})).sort((a,b)=>b.cnt-a.cnt)
  const maxCnt = Math.max(...svcDist.map(s=>s.cnt),1)
  const unreadCount = notifications.filter(n=>!n.read).length

  // Filtreli randevular
  const filteredAppts = appts.filter(a => {
    const matchS = !apptStatus || a.status===apptStatus
    const matchQ = !apptSearch || (a.profiles?.full_name||'').toLowerCase().includes(apptSearch.toLowerCase()) || (a.services?.name||'').toLowerCase().includes(apptSearch.toLowerCase())
    return matchS && matchQ
  })

  // Filtreli müşteriler
  const filteredCusts = Object.entries(custMap).filter(([,c]) =>
    !custSearch || (c.full_name||'').toLowerCase().includes(custSearch.toLowerCase()) || (c.email||'').toLowerCase().includes(custSearch.toLowerCase())
  )

  // Takvim verisi
  const year = calDate.getFullYear(), month = calDate.getMonth()
  const firstDay = new Date(year,month,1).getDay()
  const offset = firstDay===0?6:firstDay-1
  const daysInMonth = new Date(year,month+1,0).getDate()
  const apptsByDay = {}
  appts.forEach(a => {
    const d = new Date(a.appointment_date)
    if(d.getFullYear()===year && d.getMonth()===month) {
      const day=d.getDate()
      if(!apptsByDay[day]) apptsByDay[day]=[]
      apptsByDay[day].push(a)
    }
  })
  const today = new Date()
  const selectedAppts = selectedDay ? (apptsByDay[selectedDay]||[]) : []

  if(!user) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/20 border-t-orange-500 rounded-full animate-spin" /></div>

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-xl">{toast}</div>}

      {/* Bildirim panel */}
      {notifOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)}>
          <div className="absolute right-4 top-14 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <span className="font-bold text-sm">Bildirimler</span>
              <button onClick={markAllRead} className="text-xs text-orange-500 hover:underline">Tümünü okundu işaretle</button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length===0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">Bildirim yok</div>
              ) : notifications.map(n => (
                <div key={n.id} className={`px-4 py-3 border-b border-gray-50 ${!n.read?'bg-orange-50/50':''}`}>
                  <div className="flex items-start gap-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read?'bg-orange-500':'bg-gray-200'}`} />
                    <div>
                      <div className="text-sm font-semibold">{n.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{n.message}</div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('tr-TR',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-start">
              <div><div className="font-bold">Randevu Ekle</div><div className="text-xs text-gray-500">{bizInfo?.name}</div></div>
              <button onClick={()=>setModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Müşteri Adı *</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" placeholder="Ad Soyad" value={form.cname} onChange={e=>f('cname',e.target.value)} /></div>
                <div><label className="text-xs font-bold block mb-1">E-posta</label>
                  <input type="email" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" placeholder="mail@email.com" value={form.cemail} onChange={e=>f('cemail',e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Hizmet *</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.service} onChange={e=>f('service',e.target.value)}>
                    <option value="">Seçin</option>
                    {services.map(s=><option key={s.id} value={s.id}>{s.name} — ₺{s.price}</option>)}
                  </select></div>
                <div><label className="text-xs font-bold block mb-1">Personel</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.staff} onChange={e=>f('staff',e.target.value)}>
                    <option value="">Fark etmez</option>
                    {staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Tarih *</label>
                  <input type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.date} onChange={e=>f('date',e.target.value)} /></div>
                <div><label className="text-xs font-bold block mb-1">Saat</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={form.time} onChange={e=>f('time',e.target.value)}>
                    {['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(t=><option key={t}>{t}</option>)}
                  </select></div>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button onClick={()=>setModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={saveAppt} disabled={saving} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg text-sm font-semibold">{saving?'Kaydediliyor...':'Kaydet'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-52 flex-shrink-0 bg-slate-800 flex flex-col h-screen">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-sm">{bizInfo?.emoji||'💆'}</div>
            <div><div className="text-white text-sm font-bold">{bizInfo?.name?.split(' ').slice(0,2).join(' ')||'Firma'}</div><div className="text-white/30 text-xs">Firma Paneli</div></div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(([key,icon,label])=>(
            <button key={key} onClick={()=>setView(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${view===key?'bg-white/10 text-white font-semibold':'text-white/50 hover:text-white/85 hover:bg-white/[0.07]'}`}>
              {view===key && <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-orange-500 rounded-r" />}
              <span>{icon}</span>{label}
              {key==='appointments' && appts.filter(a=>a.status==='pending').length>0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{appts.filter(a=>a.status==='pending').length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/[0.07]">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/[0.05]">
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white">{user.name?.[0]||'S'}</div>
            <div className="flex-1 min-w-0"><div className="text-xs font-semibold text-white/85 truncate">{user.name}</div><div className="text-xs text-white/30">Firma Sahibi</div></div>
          </div>
          <button onClick={async()=>{await supabase.auth.signOut();localStorage.removeItem('randevu_user');router.push('/login')}} className="w-full mt-2 text-xs text-white/30 hover:text-white/60 transition-colors text-center py-1">Çıkış Yap</button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-5 gap-2 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">{NAV.find(x=>x[0]===view)?.[2]}</span>
          <div className="ml-auto flex items-center gap-2">
            {/* Bildirim zili */}
            <button onClick={()=>setNotifOpen(p=>!p)} className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600">
              🔔
              {unreadCount>0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">{unreadCount}</span>}
            </button>
            <button onClick={()=>{setForm(p=>({...p,date:new Date().toISOString().split('T')[0]}));setModal(true)}}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Randevu Ekle</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-3 text-gray-400 py-20"><Spin /> Yükleniyor...</div>
          ) : (
            <>
              {/* DASHBOARD */}
              {view==='dashboard' && (
                <div>
                  <div className="mb-5">
                    <h1 className="text-xl font-bold">Dashboard</h1>
                    <p className="text-gray-500 text-sm">{bizInfo?.name} · {bizInfo?.city}</p>
                  </div>
                  {/* Bekleyen uyarı */}
                  {appts.filter(a=>a.status==='pending').length>0 && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-sm cursor-pointer hover:bg-amber-100 transition-colors" onClick={()=>setView('appointments')}>
                      <span className="text-lg">⚠️</span>
                      <div><b>{appts.filter(a=>a.status==='pending').length} bekleyen randevu</b> onay bekliyor → Randevulara git</div>
                      <span className="ml-auto text-amber-600">→</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                    <KPI label="Bu Ay Gelir" value={`₺${revenue.toLocaleString()}`} sub="↑ %18" color="orange" />
                    <KPI label="Randevu" value={appts.length} sub="↑ %12" color="green" />
                    <KPI label="Müşteri" value={Object.keys(custMap).length} sub="↑ %8" color="blue" />
                    <KPI label="Personel" value={staff.length} color="purple" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-gray-100 flex justify-between items-center">
                        <span className="font-bold text-sm">Son Randevular</span>
                        <button onClick={()=>setView('appointments')} className="text-xs text-orange-500 hover:underline">Tümü →</button>
                      </div>
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr>
                          {['Müşteri','Hizmet','Tarih','Saat','Durum',''].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {appts.slice(0,6).map(a=>(
                            <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-2.5 text-sm font-semibold">{a.profiles?.full_name||'—'}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-500">{a.services?.name||'—'}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-500 whitespace-nowrap">{new Date(a.appointment_date).toLocaleDateString('tr-TR',{day:'numeric',month:'short'})}</td>
                              <td className="px-4 py-2.5 text-sm font-semibold">{String(a.appointment_time).slice(0,5)}</td>
                              <td className="px-4 py-2.5"><Bdg s={a.status} /></td>
                              <td className="px-4 py-2.5">
                                {a.status==='pending' && <button onClick={()=>confirmAppt(a.id)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg">✓</button>}
                              </td>
                            </tr>
                          ))}
                          {appts.length===0 && <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400 text-sm">Henüz randevu yok</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="font-bold text-sm mb-3">Personel Durumu</div>
                        {staff.map((s,i)=>(
                          <div key={s.id} className="flex items-center justify-between mb-2.5 last:mb-0">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:COLORS[i%COLORS.length]}}>{s.name[0]}</div>
                              <span className="text-sm font-medium">{s.name.split(' ')[0]}</span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${s.status==='available'?'bg-green-50 text-green-700 border-green-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>
                              {s.status==='available'?'Müsait':'Meşgul'}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="font-bold text-sm mb-3">Hizmet Dağılımı</div>
                        {svcDist.map(s=>(
                          <div key={s.id} className="mb-2.5">
                            <div className="flex justify-between text-xs mb-1"><span>{s.name}</span><span className="font-bold">{s.cnt}</span></div>
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

              {/* TAKVİM */}
              {view==='calendar' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h1 className="text-xl font-bold">Takvim</h1>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>setCalDate(new Date(year,month-1,1))} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">←</button>
                      <span className="font-semibold text-sm w-32 text-center">{MONTHS[month]} {year}</span>
                      <button onClick={()=>setCalDate(new Date(year,month+1,1))} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">→</button>
                      <button onClick={()=>{setCalDate(new Date());setSelectedDay(new Date().getDate())}} className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-semibold">Bugün</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS.map(d=><div key={d} className="text-center text-xs font-bold text-gray-500 py-2">{d}</div>)}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {Array(offset).fill(null).map((_,i)=><div key={`e${i}`} />)}
                        {Array(daysInMonth).fill(null).map((_,i)=>{
                          const day=i+1
                          const isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===day
                          const hasAppts=(apptsByDay[day]||[]).length>0
                          const isSelected=selectedDay===day
                          return (
                            <button key={day} onClick={()=>setSelectedDay(day===selectedDay?null:day)}
                              className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all relative
                                ${isSelected?'bg-orange-500 text-white shadow-md shadow-orange-500/25':
                                  isToday?'bg-orange-50 border-2 border-orange-300 text-orange-600':
                                  hasAppts?'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100':
                                  'hover:bg-gray-50 text-gray-700 border border-transparent'}`}>
                              {day}
                              {hasAppts && !isSelected && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-500" />}
                              {hasAppts && isSelected && <div className="text-xs opacity-80">{(apptsByDay[day]||[]).length}</div>}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      {selectedDay ? (
                        <>
                          <div className="font-bold text-sm mb-3">{selectedDay} {MONTHS[month]} · {selectedAppts.length} randevu</div>
                          {selectedAppts.length===0 ? (
                            <div className="text-gray-400 text-sm text-center py-8">Bu gün randevu yok</div>
                          ) : (
                            <div className="space-y-2">
                              {selectedAppts.map(a=>(
                                <div key={a.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                  <div className="flex justify-between items-start mb-1">
                                    <div className="font-semibold text-sm">{String(a.appointment_time).slice(0,5)}</div>
                                    <Bdg s={a.status} />
                                  </div>
                                  <div className="text-sm text-gray-700">{a.profiles?.full_name||'—'}</div>
                                  <div className="text-xs text-gray-500">{a.services?.name||'—'} · {a.staff?.name||'—'}</div>
                                  {a.status==='pending' && (
                                    <div className="flex gap-1.5 mt-2">
                                      <button onClick={()=>confirmAppt(a.id)} className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg">✓ Onayla</button>
                                      <button onClick={()=>cancelAppt(a.id)} className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-lg">✗</button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-3xl mb-3">📅</div>
                          <div className="text-gray-500 text-sm">Günü seçerek randevuları görün</div>
                          <div className="mt-4 space-y-1">
                            {Object.entries(apptsByDay).slice(0,5).map(([d,arr])=>(
                              <button key={d} onClick={()=>setSelectedDay(+d)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm transition-colors">
                                <span className="font-semibold">{d} {MONTHS[month]}</span>
                                <span className="ml-2 text-gray-400">{arr.length} randevu</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* RANDEVULAR */}
              {view==='appointments' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div><h1 className="text-xl font-bold">Randevular</h1><p className="text-gray-500 text-sm">{appts.length} toplam · {appts.filter(a=>a.status==='pending').length} bekliyor</p></div>
                    <button onClick={()=>{setForm(p=>({...p,date:new Date().toISOString().split('T')[0]}));setModal(true)}} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Ekle</button>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex gap-3 flex-wrap">
                      <input className="flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400"
                        placeholder="Müşteri veya hizmet ara..." value={apptSearch} onChange={e=>setApptSearch(e.target.value)} />
                      <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" value={apptStatus} onChange={e=>setApptStatus(e.target.value)}>
                        <option value="">Tüm Durumlar</option>
                        <option value="pending">⏳ Bekliyor</option>
                        <option value="confirmed">✓ Onaylı</option>
                        <option value="completed">Tamamlandı</option>
                        <option value="cancelled">İptal</option>
                      </select>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr>
                          {['Müşteri','Hizmet','Personel','Tarih','Saat','Tutar','Durum',''].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {filteredAppts.map(a=>(
                            <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-semibold">{a.profiles?.full_name||'—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{a.services?.name||'—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{a.staff?.name||'—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{new Date(a.appointment_date).toLocaleDateString('tr-TR')}</td>
                              <td className="px-4 py-3 text-sm font-semibold">{String(a.appointment_time).slice(0,5)}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-orange-600">₺{a.price||0}</td>
                              <td className="px-4 py-3"><Bdg s={a.status} /></td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1">
                                  {a.status==='pending'&&<button onClick={()=>confirmAppt(a.id)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg">✓</button>}
                                  {['pending','confirmed'].includes(a.status)&&<button onClick={()=>cancelAppt(a.id)} className="text-xs bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-2 py-1 rounded-lg">✗</button>}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredAppts.length===0&&<tr><td colSpan="8" className="px-4 py-10 text-center text-gray-400">Sonuç bulunamadı</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-5 py-3 border-t border-gray-100 text-sm text-gray-500">{filteredAppts.length} kayıt</div>
                  </div>
                </div>
              )}

              {/* PERSONEL */}
              {view==='staff' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h1 className="text-xl font-bold">Personel</h1>
                    <button className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Personel Ekle</button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                    <KPI label="Toplam" value={staff.length} color="blue" />
                    <KPI label="Müsait" value={staff.filter(s=>s.status==='available').length} color="green" />
                    <KPI label="Meşgul" value={staff.filter(s=>s.status==='busy').length} color="orange" />
                    <KPI label="Ort. Puan" value={staff.length?(staff.reduce((s,x)=>s+(+x.rating||0),0)/staff.length).toFixed(1):'—'} color="purple" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {staff.map((s,i)=>(
                      <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-extrabold text-white" style={{background:COLORS[i%COLORS.length]}}>{s.name[0]}</div>
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${s.status==='available'?'bg-green-500':s.status==='busy'?'bg-amber-500':'bg-gray-400'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm">{s.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{s.speciality||'Genel'}</div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${s.status==='available'?'bg-green-50 text-green-700 border-green-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {s.status==='available'?'Müsait':s.status==='busy'?'Meşgul':'İzinli'}
                        </span>
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-extrabold text-orange-500">{s.appointment_count||0}</div>
                          <div className="text-xs text-gray-400">randevu</div>
                          <div className="text-xs font-bold text-amber-500">★ {s.rating}</div>
                        </div>
                      </div>
                    ))}
                    {staff.length===0&&<div className="col-span-2 text-center py-12 text-gray-400">Henüz personel eklenmemiş</div>}
                  </div>
                </div>
              )}

              {/* HİZMETLER */}
              {view==='services' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h1 className="text-xl font-bold">Hizmetler</h1>
                    <button className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Hizmet Ekle</button>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50"><tr>
                        {['Hizmet Adı','Süre','Fiyat','Randevu','Durum'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {services.map(s=>(
                          <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-semibold">{s.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{s.duration_min} dk</td>
                            <td className="px-4 py-3 text-sm font-semibold text-orange-600">₺{s.price}</td>
                            <td className="px-4 py-3 text-sm font-semibold">{appts.filter(a=>a.service_id===s.id).length}</td>
                            <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${s.status==='active'?'bg-green-50 text-green-700 border-green-200':'bg-gray-100 text-gray-600 border-gray-200'}`}>{s.status==='active'?'Aktif':'Pasif'}</span></td>
                          </tr>
                        ))}
                        {services.length===0&&<tr><td colSpan="5" className="px-4 py-10 text-center text-gray-400">Hizmet yok</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MÜŞTERİLER */}
              {view==='customers' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div><h1 className="text-xl font-bold">Müşteriler</h1><p className="text-gray-500 text-sm">{Object.keys(custMap).length} kayıtlı</p></div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400"
                        placeholder="İsim veya e-posta ara..." value={custSearch} onChange={e=>setCustSearch(e.target.value)} />
                    </div>
                    <table className="w-full">
                      <thead className="bg-gray-50"><tr>
                        {['Müşteri','E-posta','Randevu','Harcama','Son Ziyaret'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {filteredCusts.map(([pid,c],i)=>{
                          const custAppts=appts.filter(a=>a.profile_id===pid)
                          const spend=custAppts.reduce((s,a)=>s+(a.price||0),0)
                          const last=custAppts[0]?.appointment_date
                          return (
                            <tr key={pid} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-3"><div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:COLORS[i%COLORS.length]}}>{c.full_name?.[0]}</div>
                                <span className="font-semibold text-sm">{c.full_name}</span>
                              </div></td>
                              <td className="px-4 py-3 text-sm text-gray-500">{c.email}</td>
                              <td className="px-4 py-3 text-sm font-semibold">{custAppts.length}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-orange-600">₺{spend}</td>
                              <td className="px-4 py-3 text-xs text-gray-400">{last?new Date(last).toLocaleDateString('tr-TR'):'—'}</td>
                            </tr>
                          )
                        })}
                        {filteredCusts.length===0&&<tr><td colSpan="5" className="px-4 py-10 text-center text-gray-400">{custSearch?'Sonuç bulunamadı':'Müşteri yok'}</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* RAPORLAR */}
              {view==='reports' && (
                <div>
                  <h1 className="text-xl font-bold mb-5">Raporlar</h1>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                    <KPI label="Gelir" value={`₺${revenue.toLocaleString()}`} sub="↑ %18" color="orange" />
                    <KPI label="Randevu" value={appts.length} sub="↑ %12" color="green" />
                    <KPI label="Tamamlanan" value={appts.filter(a=>a.status==='completed').length} color="blue" />
                    <KPI label="İptal Oranı" value={`%${appts.length?Math.round(appts.filter(a=>a.status==='cancelled').length/appts.length*100):0}`} color="red" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="font-bold text-sm mb-4">Hizmet Dağılımı</div>
                      {svcDist.map(s=>(
                        <div key={s.id} className="mb-3">
                          <div className="flex justify-between text-sm mb-1.5"><span>{s.name}</span><span className="font-bold">{maxCnt?Math.round(s.cnt/maxCnt*100):0}%</span></div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{width:`${maxCnt?s.cnt/maxCnt*100:0}%`,background:s.color}} />
                          </div>
                        </div>
                      ))}
                      {svcDist.length===0&&<div className="text-gray-400 text-sm">Veri yok</div>}
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="font-bold text-sm mb-4">Personel Sıralaması</div>
                      {[...staff].sort((a,b)=>(b.appointment_count||0)-(a.appointment_count||0)).map((s,i)=>(
                        <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                          <span className="text-lg">{['🥇','🥈','🥉'][i]||'🎖️'}</span>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:COLORS[i%COLORS.length]}}>{s.name[0]}</div>
                          <div className="flex-1"><div className="font-semibold text-sm">{s.name}</div><div className="text-xs text-gray-500">{s.appointment_count||0} randevu</div></div>
                          <div className="font-bold text-amber-500">★ {s.rating}</div>
                        </div>
                      ))}
                      {staff.length===0&&<div className="text-gray-400 text-sm">Personel yok</div>}
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
