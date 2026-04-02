'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, sendNotification } from '@/lib/supabase'

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

const NAV = [['dashboard','⊞','Dashboard'],['calendar','📅','Takvim'],['appointments','📋','Randevular'],['staff','👥','Personel'],['services','✨','Hizmetler'],['customers','🤝','Müşteriler'],['reviews','⭐','Yorumlar'],['reports','📊','Raporlar'],['settings','⚙️','Ayarlar']]

export default function BusinessPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard')
  const [bizId, setBizId] = useState(null)
  const [bizInfo, setBizInfo] = useState(null)
  const [myBusinesses, setMyBusinesses] = useState([])
  const [bizSwitcher, setBizSwitcher] = useState(false)
  const [qrModal, setQrModal] = useState(null)
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
  const [reviews, setReviews] = useState([])
  const [planLimits, setPlanLimits] = useState(null)
  const [apptSearch, setApptSearch] = useState('')
  const [custSearch, setCustSearch] = useState('')
  // Calendar
  const [calDate, setCalDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  // Form
  const [form, setForm] = useState({cname:'',cemail:'',service:'',staff:'',date:'',time:'10:00'})
  // Staff CRUD
  const [staffModal, setStaffModal] = useState(false) // false | 'add' | staffObj
  const [staffForm, setStaffForm] = useState({name:'',speciality:'',phone:'',status:'available',rating:5.0})
  const [staffSaving, setStaffSaving] = useState(false)
  // Service CRUD
  const [svcModal, setSvcModal] = useState(false) // false | 'add' | svcObj
  const [svcForm, setSvcForm] = useState({name:'',duration_min:60,price:0,status:'active',description:''})
  const [svcSaving, setSvcSaving] = useState(false)
  // Biz Info Edit
  const [bizModal, setBizModal] = useState(false)
  const [bizForm, setBizForm] = useState({})
  const [bizSaving, setBizSaving] = useState(false)
  
  const [workingHours, setWorkingHours] = useState({})
  const [whSaving, setWhSaving] = useState(false)

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
      const [ar,sr,svr,nr,rr,pr2] = await Promise.all([
        supabase.from('appointments').select('id,profile_id,service_id,staff_id,appointment_date,appointment_time,status,price,profiles(full_name,email),services(name,price),staff(name)').eq('business_id',bId).order('appointment_date',{ascending:false}),
        supabase.from('staff').select('*').eq('business_id',bId),
        supabase.from('services').select('*').eq('business_id',bId),
        supabase.from('notifications').select('*').eq('business_id',bId).order('created_at',{ascending:false}).limit(20),
        supabase.from('reviews').select('*, profiles(full_name)').eq('business_id',bId).order('created_at',{ascending:false}),
        supabase.from('plan_limits').select('*').eq('plan', bizInfo?.plan || 'free').maybeSingle(),
      ])
      setAppts(ar.data||[])
      setStaff(sr.data||[])
      setSvcs(svr.data||[])
      setNotifs(nr.data||[])
      setReviews(rr?.data||[])
      if (pr2?.data) setPlanLimits(pr2.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!user) return
    // Önce owner_id ile ara (gerçek kullanıcılar), bulamazsan email ile eşleştir (demo)
    const findBusiness = async () => {
      // owner_id sütunu varsa kullan
      let { data: bs } = await supabase.from('businesses').select('*').eq('owner_id', user.id).eq('status','active')
      let b = bs?.[0] || null
      if (!b) {
        // Demo fallback: email'e göre eşleştir
        const emailBizMap = { 'selin@email.com': 'Aura Beauty Lounge' }
        const bizName = emailBizMap[user.email]
        if (bizName) {
          const res = await supabase.from('businesses').select('*').eq('name', bizName).maybeSingle()
          b = res.data
          if (b) bs = [b]
        }
      }
      if (bs && bs.length > 0) setMyBusinesses(bs)
      if (b) { 
        setBizId(b.id); 
        setBizInfo(b); 
        setBizForm(b);
        setWorkingHours(b.working_hours || {
          "1": { str: "09:00", end: "18:00", off: false },
          "2": { str: "09:00", end: "18:00", off: false },
          "3": { str: "09:00", end: "18:00", off: false },
          "4": { str: "09:00", end: "18:00", off: false },
          "5": { str: "09:00", end: "18:00", off: false },
          "6": { str: "09:00", end: "18:00", off: false },
          "0": { str: "09:00", end: "18:00", off: true },
        });
        loadAll(b.id) 
      } else setLoading(false)
    }
    findBusiness()
  }, [user, loadAll])

  async function saveWorkingHours() {
    setWhSaving(true)
    try {
      const { error } = await supabase.from('businesses').update({ working_hours: workingHours }).eq('id', bizId)
      if (error) throw error
      setBizInfo(p => ({ ...p, working_hours: workingHours }))
      toast3('✅ Çalışma saatleri güncellendi')
    } catch(e) { toast3('❌ ' + e.message) }
    finally { setWhSaving(false) }
  }

  async function confirmAppt(id) {
    await supabase.from('appointments').update({status:'confirmed'}).eq('id',id)
    sendNotification('confirmed', id)
    sendNotification('confirmed', id)
    setAppts(p=>p.map(a=>a.id===id?{...a,status:'confirmed'}:a))
    toast3('✅ Randevu onaylandı')
    const n = notifications.find(n=>n.message?.includes(id))
    if(n) await supabase.from('notifications').update({read:true}).eq('id',n.id)
    // Email gönder
    const appt = appts.find(a=>a.id===id)
    if(appt?.profiles?.email) {
      fetch('/api/email',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({type:'booking_confirmed',to:appt.profiles.email,data:{
          businessName:bizInfo?.name,serviceName:appt.services?.name||'Hizmet',
          date:new Date(appt.appointment_date).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}),
          time:String(appt.appointment_time).slice(0,5)
        }})}).catch(()=>{})
    }
  }
  async function cancelAppt(id) {
    await supabase.from('appointments').update({status:'cancelled'}).eq('id',id)
    sendNotification('cancelled', id)
    sendNotification('cancelled', id)
    setAppts(p=>p.map(a=>a.id===id?{...a,status:'cancelled'}:a))
    toast3('Randevu iptal edildi')
    // Email gönder
    const appt = appts.find(a=>a.id===id)
    if(appt?.profiles?.email) {
      fetch('/api/email',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({type:'booking_cancelled',to:appt.profiles.email,data:{
          businessName:bizInfo?.name,
          date:new Date(appt.appointment_date).toLocaleDateString('tr-TR'),
          time:String(appt.appointment_time).slice(0,5)
        }})}).catch(()=>{})
    }
  }
  async function completeAppt(id) {
    await supabase.from('appointments').update({status:'completed'}).eq('id',id)
    setAppts(p=>p.map(a=>a.id===id?{...a,status:'completed'}:a))
    toast3('✅ Randevu tamamlandı olarak işaretlendi')
    // Loyalty puan ekle
    const appt = appts.find(a=>a.id===id)
    if (appt?.profile_id && appt?.price > 0) {
      const pointsToAdd = Math.floor(appt.price / 10) // Her 10₺ = 1 puan
      const { data: profile } = await supabase
        .from('profiles').select('loyalty_points').eq('id', appt.profile_id).maybeSingle()
      if (profile) {
        const newPoints = (profile.loyalty_points || 0) + pointsToAdd
        const newTier = newPoints >= 3000 ? 'platinum' : newPoints >= 1500 ? 'gold' : newPoints >= 500 ? 'silver' : 'bronze'
        await supabase.from('profiles').update({ loyalty_points: newPoints, loyalty_tier: newTier }).eq('id', appt.profile_id)
        if (pointsToAdd > 0) toast3(`✅ Tamamlandı — Müşteriye ${pointsToAdd} puan eklendi`)
      }
    }
  }

  // --- Personel CRUD ---
  async function saveStaff() {
    if (!staffForm.name.trim()) { toast3('❌ İsim zorunlu'); return }
    setStaffSaving(true)
    try {
      if (staffModal === 'add') {
        const { data, error } = await supabase.from('staff').insert({ ...staffForm, business_id: bizId, appointment_count: 0 }).select().maybeSingle()
        if (error) throw error
        setStaff(p => [...p, data])
        toast3('✅ Personel eklendi')
      } else {
        const { error } = await supabase.from('staff').update({ name: staffForm.name, speciality: staffForm.speciality, phone: staffForm.phone, status: staffForm.status, rating: staffForm.rating }).eq('id', staffModal.id)
        if (error) throw error
        setStaff(p => p.map(s => s.id === staffModal.id ? { ...s, ...staffForm } : s))
        toast3('✅ Personel güncellendi')
      }
      setStaffModal(false)
      setStaffForm({ name: '', speciality: '', phone: '', status: 'available', rating: 5.0 })
    } catch(e) { toast3('❌ ' + e.message) }
    finally { setStaffSaving(false) }
  }
  async function deleteStaff(id, name) {
    if (!confirm(`${name} silinsin mi?`)) return
    await supabase.from('staff').delete().eq('id', id)
    setStaff(p => p.filter(s => s.id !== id))
    setStaffModal(false)
    toast3('🗑️ Personel silindi')
  }
  function openStaffAdd() {
    setStaffForm({ name: '', speciality: '', phone: '', status: 'available', rating: 5.0 })
    setStaffModal('add')
  }
  function openStaffEdit(s) {
    setStaffForm({ name: s.name, speciality: s.speciality || '', phone: s.phone || '', status: s.status || 'available', rating: s.rating || 5.0 })
    setStaffModal(s)
  }

  // --- Hizmet CRUD ---
  async function saveSvc() {
    if (!svcForm.name.trim()) { toast3('❌ İsim zorunlu'); return }
    setSvcSaving(true)
    try {
      if (svcModal === 'add') {
        const { data, error } = await supabase.from('services').insert({ ...svcForm, business_id: bizId, price: +svcForm.price, duration_min: +svcForm.duration_min }).select().maybeSingle()
        if (error) throw error
        setSvcs(p => [...p, data])
        toast3('✅ Hizmet eklendi')
      } else {
        const { error } = await supabase.from('services').update({ name: svcForm.name, duration_min: +svcForm.duration_min, price: +svcForm.price, status: svcForm.status, description: svcForm.description }).eq('id', svcModal.id)
        if (error) throw error
        setSvcs(p => p.map(s => s.id === svcModal.id ? { ...s, ...svcForm, price: +svcForm.price, duration_min: +svcForm.duration_min } : s))
        toast3('✅ Hizmet güncellendi')
      }
      setSvcModal(false)
      setSvcForm({ name: '', duration_min: 60, price: 0, status: 'active', description: '' })
    } catch(e) { toast3('❌ ' + e.message) }
    finally { setSvcSaving(false) }
  }
  async function deleteSvc(id, name) {
    if (!confirm(`${name} silinsin mi?`)) return
    await supabase.from('services').delete().eq('id', id)
    setSvcs(p => p.filter(s => s.id !== id))
    setSvcModal(false)
    toast3('🗑️ Hizmet silindi')
  }
  function openSvcAdd() {
    setSvcForm({ name: '', duration_min: 60, price: 0, status: 'active', description: '' })
    setSvcModal('add')
  }
  function openSvcEdit(s) {
    setSvcForm({ name: s.name, duration_min: s.duration_min, price: s.price, status: s.status || 'active', description: s.description || '' })
    setSvcModal(s)
  }

  // --- Firma Bilgileri Düzenle ---
  async function saveBizInfo() {
    setBizSaving(true)
    try {
      const { error } = await supabase.from('businesses').update({ name: bizForm.name, category: bizForm.category, city: bizForm.city, phone: bizForm.phone, address: bizForm.address, price_from: +bizForm.price_from }).eq('id', bizId)
      if (error) throw error
      setBizInfo(p => ({ ...p, ...bizForm }))
      setBizModal(false)
      toast3('✅ Firma bilgileri güncellendi')
    } catch(e) { toast3('❌ ' + e.message) }
    finally { setBizSaving(false) }
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
  // Gerçek KPI growth hesapla (bu ay vs geçen ay)
  const MONTHS_TR=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']
  const now = new Date()
  const thisMonthAppts = appts.filter(a=>{
    const d=new Date(a.appointment_date)
    return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && a.status!=='cancelled'
  })
  const prevMonthAppts = appts.filter(a=>{
    const d=new Date(a.appointment_date)
    const prev=new Date(now.getFullYear(),now.getMonth()-1,1)
    return d.getFullYear()===prev.getFullYear() && d.getMonth()===prev.getMonth() && a.status!=='cancelled'
  })
  const thisMonthRev = thisMonthAppts.reduce((s,a)=>s+(a.price||0),0)
  const prevMonthRev = prevMonthAppts.reduce((s,a)=>s+(a.price||0),0)
  const revenueGrowth = prevMonthRev > 0 ? Math.round((thisMonthRev - prevMonthRev) / prevMonthRev * 100) : null
  const apptGrowth = prevMonthAppts.length > 0 ? Math.round((thisMonthAppts.length - prevMonthAppts.length) / prevMonthAppts.length * 100) : null
  const thisMonthCusts = new Set(thisMonthAppts.map(a=>a.profile_id).filter(Boolean)).size
  const prevMonthCusts = new Set(prevMonthAppts.map(a=>a.profile_id).filter(Boolean)).size
  const custGrowth = prevMonthCusts > 0 ? Math.round((thisMonthCusts - prevMonthCusts) / prevMonthCusts * 100) : null
  function growthLabel(g) {
    if (g === null) return null
    return g >= 0 ? `↑ %${g}` : `↓ %${Math.abs(g)}`
  }
  const monthlyData = Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-5+i,1)
    const [y,m]=[d.getFullYear(),d.getMonth()]
    const ma=appts.filter(a=>{ const ad=new Date(a.appointment_date); return ad.getFullYear()===y&&ad.getMonth()===m&&a.status!=='cancelled' })
    return {label:MONTHS_TR[m],revenue:ma.reduce((s,a)=>s+(a.price||0),0),count:ma.length}
  })
  const maxRev=Math.max(...monthlyData.map(m=>m.revenue),1)
  // Saatlik dağılım
  const hourlyData=Array.from({length:9},(_,i)=>{
    const h=9+i
    return {hour:`${String(h).padStart(2,'0')}:00`,count:appts.filter(a=>parseInt(String(a.appointment_time).slice(0,2))===h).length}
  })
  const maxHour=Math.max(...hourlyData.map(h=>h.count),1)

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
      {/* QR KOD MODAL */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setQrModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div><div className="font-bold">Randevu QR Kodu</div><div className="text-xs text-gray-500">{qrModal.profiles?.full_name||'Müşteri'}</div></div>
              <button onClick={()=>setQrModal(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="p-5 flex flex-col items-center gap-4">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('RandevuApp|'+qrModal.id+'|'+qrModal.appointment_date+'|'+String(qrModal.appointment_time).slice(0,5))}`}
                alt="QR Kod" className="w-48 h-48 rounded-xl border border-gray-200" />
              <div className="text-center text-sm text-gray-600">
                <div className="font-semibold">{qrModal.services?.name||'Hizmet'}</div>
                <div className="text-gray-400">{new Date(qrModal.appointment_date).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})} · {String(qrModal.appointment_time).slice(0,5)}</div>
              </div>
              <div className="text-xs text-gray-400 text-center">Müşteri bu kodu göstererek randevusunu doğrulayabilir</div>
            </div>
            <div className="px-5 pb-5">
              <button onClick={()=>setQrModal(null)} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">Kapat</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-xl">{toast}</div>}

      {/* PERSONEL MODAL */}
      {staffModal&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setStaffModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div><div className="font-bold">{staffModal==='add'?'Personel Ekle':'Personel Düzenle'}</div></div>
              <button onClick={()=>setStaffModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-bold block mb-1">Ad Soyad *</label>
                <input value={staffForm.name} onChange={e=>setStaffForm(p=>({...p,name:e.target.value}))} placeholder="Örn: Ayşe Yılmaz" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
              <div><label className="text-xs font-bold block mb-1">Uzmanlık</label>
                <input value={staffForm.speciality} onChange={e=>setStaffForm(p=>({...p,speciality:e.target.value}))} placeholder="Örn: Manikür, Saç Boyama" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
              <div><label className="text-xs font-bold block mb-1">Telefon</label>
                <input value={staffForm.phone} onChange={e=>setStaffForm(p=>({...p,phone:e.target.value}))} placeholder="+90 555 000 00 00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Durum</label>
                  <select value={staffForm.status} onChange={e=>setStaffForm(p=>({...p,status:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400">
                    <option value="available">Müsait</option>
                    <option value="busy">Meşgul</option>
                    <option value="off">İzinli</option>
                  </select></div>
                <div><label className="text-xs font-bold block mb-1">Puan (1-5)</label>
                  <input type="number" min="1" max="5" step="0.1" value={staffForm.rating} onChange={e=>setStaffForm(p=>({...p,rating:+e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              {staffModal!=='add'&&<button onClick={()=>deleteStaff(staffModal.id,staffModal.name)} className="px-3 py-2.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-xl text-xs font-bold">🗑️ Sil</button>}
              <button onClick={()=>setStaffModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={saveStaff} disabled={staffSaving} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold">{staffSaving?'Kaydediliyor...':staffModal==='add'?'Ekle':'Güncelle'}</button>
            </div>
          </div>
        </div>
      )}

      {/* HİZMET MODAL */}
      {svcModal&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setSvcModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div><div className="font-bold">{svcModal==='add'?'Hizmet Ekle':'Hizmet Düzenle'}</div></div>
              <button onClick={()=>setSvcModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-bold block mb-1">Hizmet Adı *</label>
                <input value={svcForm.name} onChange={e=>setSvcForm(p=>({...p,name:e.target.value}))} placeholder="Örn: Klasik Manikür" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
              <div><label className="text-xs font-bold block mb-1">Açıklama</label>
                <input value={svcForm.description} onChange={e=>setSvcForm(p=>({...p,description:e.target.value}))} placeholder="Kısa açıklama" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Süre (dakika)</label>
                  <input type="number" min="15" step="15" value={svcForm.duration_min} onChange={e=>setSvcForm(p=>({...p,duration_min:+e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
                <div><label className="text-xs font-bold block mb-1">Fiyat (₺)</label>
                  <input type="number" min="0" value={svcForm.price} onChange={e=>setSvcForm(p=>({...p,price:+e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
              </div>
              <div><label className="text-xs font-bold block mb-1">Durum</label>
                <select value={svcForm.status} onChange={e=>setSvcForm(p=>({...p,status:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400">
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select></div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              {svcModal!=='add'&&<button onClick={()=>deleteSvc(svcModal.id,svcModal.name)} className="px-3 py-2.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-xl text-xs font-bold">🗑️ Sil</button>}
              <button onClick={()=>setSvcModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={saveSvc} disabled={svcSaving} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold">{svcSaving?'Kaydediliyor...':svcModal==='add'?'Ekle':'Güncelle'}</button>
            </div>
          </div>
        </div>
      )}

      {/* FİRMA BİLGİLERİ MODAL */}
      {bizModal&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setBizModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div className="font-bold">Firma Bilgilerini Düzenle</div>
              <button onClick={()=>setBizModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-bold block mb-1">Firma Adı</label>
                <input value={bizForm.name||''} onChange={e=>setBizForm(p=>({...p,name:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Kategori</label>
                  <select value={bizForm.category||''} onChange={e=>setBizForm(p=>({...p,category:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400">
                    {['Güzellik','Kuaför','Masaj','Fitness','Sağlık'].map(c=><option key={c}>{c}</option>)}
                  </select></div>
                <div><label className="text-xs font-bold block mb-1">Şehir</label>
                  <input value={bizForm.city||''} onChange={e=>setBizForm(p=>({...p,city:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
              </div>
              <div><label className="text-xs font-bold block mb-1">Adres</label>
                <input value={bizForm.address||''} onChange={e=>setBizForm(p=>({...p,address:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Telefon</label>
                  <input value={bizForm.phone||''} onChange={e=>setBizForm(p=>({...p,phone:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
                <div><label className="text-xs font-bold block mb-1">Başlangıç Fiyatı</label>
                  <input type="number" value={bizForm.price_from||0} onChange={e=>setBizForm(p=>({...p,price_from:+e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={()=>setBizModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={saveBizInfo} disabled={bizSaving} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold">{bizSaving?'Kaydediliyor...':'Güncelle'}</button>
            </div>
          </div>
        </div>
      )}

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
      <div className="hidden md:flex w-52 flex-shrink-0 bg-slate-800 flex-col h-screen">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-sm">{bizInfo?.emoji||'💆'}</div>
            <div><div className="text-white text-sm font-bold">{bizInfo?.name?.split(' ').slice(0,2).join(' ')||'Firma'}</div><div className="text-white/30 text-xs">Firma Paneli</div></div>
          </div>
        </div>
        {bizSwitcher && myBusinesses.length > 1 && (
          <div className="border-b border-white/10 bg-slate-900/50">
            {myBusinesses.map((b) => (
              <button key={b.id} onClick={() => { setBizId(b.id); setBizInfo(b); setBizSwitcher(false); loadAll(b.id) }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all ${b.id === bizId ? 'bg-white/10 text-white font-semibold' : 'text-white/50 hover:text-white hover:bg-white/[0.07]'}`}>
                <span className="text-base">{b.emoji||'🏢'}</span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{b.name}</div>
                  <div className="text-xs text-white/30 truncate">{b.city}</div>
                </div>
                {b.id === bizId && <span className="ml-auto text-orange-500 text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
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
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobil Alt Navbar - 2 satır */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-800 border-t border-white/10">
          <div className="flex">
            {NAV.slice(0,5).map(([key,icon,label])=>(
              <button key={key} onClick={()=>setView(key)}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 text-xs font-semibold transition-all relative ${view===key?'text-orange-500':'text-white/40 hover:text-white/70'}`}>
                <span className="text-base">{icon}</span>
                <span className="text-[9px] mt-0.5 leading-none">{label}</span>
                {key==='appointments'&&appts.filter(a=>a.status==='pending').length>0&&<span className="absolute top-0.5 right-1/4 w-3 h-3 bg-amber-500 rounded-full text-white text-[8px] flex items-center justify-center font-bold">{appts.filter(a=>a.status==='pending').length}</span>}
              </button>
            ))}
          </div>
          <div className="flex border-t border-white/5">
            {NAV.slice(5).map(([key,icon,label])=>(
              <button key={key} onClick={()=>setView(key)}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 text-xs font-semibold transition-all ${view===key?'text-orange-500':'text-white/40 hover:text-white/70'}`}>
                <span className="text-base">{icon}</span>
                <span className="text-[9px] mt-0.5 leading-none">{label}</span>
              </button>
            ))}
          </div>
        </div>
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

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 pb-28 md:pb-5">
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
                  {/* Plan Bilgisi */}
                  {bizInfo && planLimits && (
                    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl mb-4 shadow-sm flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${bizInfo.plan==='enterprise'?'bg-slate-800 text-white border-slate-700':bizInfo.plan==='pro'?'bg-orange-50 text-orange-600 border-orange-200':'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {bizInfo.plan==='enterprise'?'⚡ Enterprise':bizInfo.plan==='pro'?'🔥 Pro':'🆓 Ücretsiz'} Plan
                        </span>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className={staff.length>=planLimits.max_staff?'text-red-500 font-semibold':''}>👥 {staff.length}/{planLimits.max_staff}</span>
                          <span className={services.length>=planLimits.max_services?'text-red-500 font-semibold':''}>✨ {services.length}/{planLimits.max_services}</span>
                          <span>📅 max {planLimits.max_monthly_appts}/ay</span>
                        </div>
                      </div>
                      {bizInfo.plan !== 'enterprise' && (
                        <button onClick={() => toast3('Admin ile iletişime geçerek planınızı yükseltebilirsiniz.')}
                          className="text-xs font-bold px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg">⬆️ Planı Yükselt</button>
                      )}
                    </div>
                  )}
                  {/* Bekleyen uyarı */}
                  {appts.filter(a=>a.status==='pending').length>0 && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-sm cursor-pointer hover:bg-amber-100 transition-colors" onClick={()=>setView('appointments')}>
                      <span className="text-lg">⚠️</span>
                      <div><b>{appts.filter(a=>a.status==='pending').length} bekleyen randevu</b> onay bekliyor → Randevulara git</div>
                      <span className="ml-auto text-amber-600">→</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-5">
                    <KPI label="Bu Ay Gelir" value={`₺${thisMonthRev.toLocaleString()}`} sub={growthLabel(revenueGrowth)} color="orange" />
                    <KPI label="Randevu" value={appts.length} sub={growthLabel(apptGrowth)} color="green" />
                    <KPI label="Müşteri" value={Object.keys(custMap).length} sub={growthLabel(custGrowth)} color="blue" />
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
                                      {a.status==='confirmed'&&<button onClick={()=>setQrModal(a)} className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded-lg">QR</button>}
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
                                  {a.status==='pending'&&<button onClick={()=>confirmAppt(a.id)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg font-semibold">✓ Onayla</button>}
                                  {a.status==='confirmed'&&<button onClick={()=>completeAppt(a.id)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-lg font-semibold">✓ Tam.</button>}
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
                    <div><h1 className="text-xl font-bold">Personel</h1><p className="text-gray-500 text-sm">{staff.length} personel</p></div>
                    <button onClick={openStaffAdd} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Personel Ekle</button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-5">
                    <KPI label="Toplam" value={staff.length} color="blue" />
                    <KPI label="Müssait" value={staff.filter(s=>s.status==='available').length} color="green" />
                    <KPI label="Meşgul" value={staff.filter(s=>s.status==='busy').length} color="orange" />
                    <KPI label="Ort. Puan" value={staff.length?(staff.reduce((s,x)=>s+(+x.rating||0),0)/staff.length).toFixed(1):'—'} color="purple" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {staff.map((s,i)=>(
                      <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={()=>openStaffEdit(s)}>
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-extrabold text-white" style={{background:COLORS[i%COLORS.length]}}>{s.name[0]}</div>
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${s.status==='available'?'bg-green-500':s.status==='busy'?'bg-amber-500':'bg-gray-400'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm">{s.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{s.speciality||'Genel'}</div>
                          {s.phone&&<div className="text-xs text-gray-400 mt-0.5">{s.phone}</div>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-extrabold text-orange-500">{s.appointment_count||0}</div>
                          <div className="text-xs text-gray-400">randevu</div>
                          <div className="text-xs font-bold text-amber-500">★ {s.rating}</div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 text-sm">✏️</div>
                      </div>
                    ))}
                    {staff.length===0&&<div className="col-span-2 text-center py-12 text-gray-400">Henüz personel eklenmemiş — <button onClick={openStaffAdd} className="text-orange-500 hover:underline">hemen ekle</button></div>}
                  </div>
                </div>
              )}

              {/* HİZMETLER */}
              {view==='services' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div><h1 className="text-xl font-bold">Hizmetler</h1><p className="text-gray-500 text-sm">{services.length} hizmet</p></div>
                    <button onClick={openSvcAdd} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Hizmet Ekle</button>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50"><tr>
                        {['Hizmet','Açıklama','Süre','Fiyat','Randevu','Durum',''].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {services.map(s=>(
                          <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50 group">
                            <td className="px-4 py-3 text-sm font-semibold">{s.name}</td>
                            <td className="px-4 py-3 text-xs text-gray-400 max-w-[160px] truncate">{s.description||'—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{s.duration_min} dk</td>
                            <td className="px-4 py-3 text-sm font-semibold text-orange-600">₺{s.price}</td>
                            <td className="px-4 py-3 text-sm font-semibold">{appts.filter(a=>a.service_id===s.id).length}</td>
                            <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${s.status==='active'?'bg-green-50 text-green-700 border-green-200':'bg-gray-100 text-gray-600 border-gray-200'}`}>{s.status==='active'?'Aktif':'Pasif'}</span></td>
                            <td className="px-4 py-3">
                              <button onClick={()=>openSvcEdit(s)} className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-100">✏️ Düzenle</button>
                            </td>
                          </tr>
                        ))}
                        {services.length===0&&<tr><td colSpan="7" className="px-4 py-10 text-center text-gray-400">Hizmet yok — <button onClick={openSvcAdd} className="text-orange-500 hover:underline">hemen ekle</button></td></tr>}
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


              {/* YORUMLAR */}
              {view==='reviews'&&(
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h1 className="text-xl font-bold">Müşteri Yorumları</h1>
                      <p className="text-gray-500 text-sm">{reviews.length} yorum · Ort. ★ {reviews.length?(reviews.reduce((s,r)=>s+(+r.rating||0),0)/reviews.length).toFixed(1):'—'}</p>
                    </div>
                  </div>
                  {/* Özet */}
                  {reviews.length>0&&(
                    <div className="grid grid-cols-5 gap-3 mb-5">
                      {[5,4,3,2,1].map(star=>{
                        const cnt=reviews.filter(r=>Math.round(+r.rating)===star).length
                        const pct=reviews.length?Math.round(cnt/reviews.length*100):0
                        return (
                          <div key={star} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm text-center">
                            <div className="text-amber-400 text-lg font-bold">{'★'.repeat(star)}</div>
                            <div className="text-xl font-extrabold text-gray-800 mt-1">{cnt}</div>
                            <div className="text-xs text-gray-400">%{pct}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {reviews.length===0?(
                    <div className="bg-white border border-gray-200 rounded-xl p-16 text-center shadow-sm">
                      <div className="text-5xl mb-4">⭐</div>
                      <div className="font-bold mb-1">Henüz yorum yok</div>
                      <div className="text-sm text-gray-400">Müşteriler tamamlanan randevulardan sonra yorum yapabilir</div>
                    </div>
                  ):(
                    <div className="space-y-3">
                      {reviews.map(r=>(
                        <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-white">{r.profiles?.full_name?.[0]||'?'}</div>
                              <div>
                                <div className="font-semibold text-sm">{r.profiles?.full_name||'Anonim'}</div>
                                <div className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {[1,2,3,4,5].map(s=><span key={s} className={`text-lg ${s<=(+r.rating||0)?'text-amber-400':'text-gray-200'}`}>★</span>)}
                              <span className="text-sm font-bold text-gray-600 ml-1">{r.rating}</span>
                            </div>
                          </div>
                          {r.comment&&<p className="text-gray-600 text-sm leading-relaxed pl-11">{r.comment}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* RAPORLAR */}
              {view==='reports' && (
                <div>
                  <h1 className="text-xl font-bold mb-5">Raporlar</h1>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                    <KPI label="Toplam Gelir" value={`₺${revenue.toLocaleString()}`} sub={`${appts.filter(a=>a.status==='confirmed').length} onaylı`} color="orange" />
                    <KPI label="Randevu" value={appts.length} sub={`${appts.filter(a=>a.status==='pending').length} bekliyor`} color="green" />
                    <KPI label="Tamamlanan" value={appts.filter(a=>a.status==='completed').length} color="blue" />
                    <KPI label="İptal Oranı" value={`%${appts.length?Math.round(appts.filter(a=>a.status==='cancelled').length/appts.length*100):0}`} color="red" />
                  </div>
                  {/* Grafikler */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    {/* Aylık Gelir */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-5">
                        <div className="font-bold text-sm">📈 Aylık Gelir</div>
                        <div className="text-xs text-gray-400">Son 6 ay</div>
                      </div>
                      {monthlyData.map((m,i)=>(
                        <div key={i} className="flex items-center gap-3 mb-3 last:mb-0">
                          <div className="w-8 text-xs text-gray-500 flex-shrink-0 font-semibold">{m.label}</div>
                          <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden relative">
                            <div className="h-full rounded-lg bg-gradient-to-r from-orange-400 to-orange-500 transition-all flex items-center"
                              style={{width:`${maxRev>0?Math.max(m.revenue/maxRev*100,m.revenue>0?4:0):0}%`}}>
                              {m.revenue>0&&<span className="text-white text-xs font-bold px-2 truncate">{m.count} rdv</span>}
                            </div>
                          </div>
                          <div className="w-20 text-xs font-bold text-right text-gray-700">₺{m.revenue.toLocaleString()}</div>
                        </div>
                      ))}
                      {monthlyData.every(m=>m.revenue===0)&&<div className="text-gray-400 text-sm text-center py-4">Henüz gelir verisi yok</div>}
                    </div>
                    {/* Saatlik Dağılım */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-5">
                        <div className="font-bold text-sm">⏰ En Yoğun Saatler</div>
                        <div className="text-xs text-gray-400">Toplam {appts.length} randevu</div>
                      </div>
                      {hourlyData.map((h,i)=>(
                        <div key={i} className="flex items-center gap-3 mb-2.5 last:mb-0">
                          <div className="w-12 text-xs text-gray-500 flex-shrink-0 font-semibold">{h.hour}</div>
                          <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{width:`${maxHour>0?Math.max(h.count/maxHour*100,h.count>0?4:0):0}%`,
                              background:h.count===Math.max(...hourlyData.map(x=>x.count))?'#f97316':'#60a5fa'}} />
                          </div>
                          <div className="w-6 text-xs font-bold text-right text-gray-700">{h.count}</div>
                        </div>
                      ))}
                      {appts.length===0&&<div className="text-gray-400 text-sm text-center py-4">Henüz randevu yok</div>}
                    </div>
                  </div>
                  {/* Alt istatistikler */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="font-bold text-sm mb-4">Hizmet Dağılımı</div>
                      {svcDist.length===0&&<div className="text-gray-400 text-sm">Veri yok</div>}
                      {svcDist.map(s=>(
                        <div key={s.id} className="mb-3">
                          <div className="flex justify-between text-sm mb-1.5"><span>{s.name}</span><span className="font-bold">{s.cnt} randevu</span></div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{width:`${maxCnt?s.cnt/maxCnt*100:0}%`,background:s.color}} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="font-bold text-sm mb-4">🏆 Personel Sıralaması</div>
                      {staff.length===0&&<div className="text-gray-400 text-sm">Personel yok</div>}
                      {[...staff].sort((a,b)=>(b.appointment_count||0)-(a.appointment_count||0)).map((s,i)=>(
                        <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                          <span className="text-lg">{['🥇','🥈','🥉'][i]||'🎖️'}</span>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:COLORS[i%COLORS.length]}}>{s.name[0]}</div>
                          <div className="flex-1"><div className="font-semibold text-sm">{s.name}</div><div className="text-xs text-gray-500">{s.appointment_count||0} randevu</div></div>
                          <div className="font-bold text-amber-500">★ {s.rating}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* AYARLAR */}
              {view==='settings' && (
                <div>
                  <h1 className="text-xl font-bold mb-5">Ayarlar</h1>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {/* Firma Bilgileri */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                      <div className="font-bold text-sm border-b border-gray-100 pb-3">Firma Bilgileri</div>
                      <div><label className="text-xs font-bold block mb-1">Firma Adı</label>
                        <input value={bizForm.name||''} onChange={e=>setBizForm(p=>({...p,name:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold block mb-1">Kategori</label>
                          <select value={bizForm.category||''} onChange={e=>setBizForm(p=>({...p,category:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400">
                            {['Güzellik','Kuaför','Masaj','Fitness','Sağlık'].map(c=><option key={c}>{c}</option>)}
                          </select></div>
                        <div><label className="text-xs font-bold block mb-1">Şehir</label>
                          <input value={bizForm.city||''} onChange={e=>setBizForm(p=>({...p,city:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
                      </div>
                      <div><label className="text-xs font-bold block mb-1">Adres</label>
                        <input value={bizForm.address||''} onChange={e=>setBizForm(p=>({...p,address:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold block mb-1">Telefon</label>
                          <input value={bizForm.phone||''} onChange={e=>setBizForm(p=>({...p,phone:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
                        <div><label className="text-xs font-bold block mb-1">Başlangıç Fiyatı (₺)</label>
                          <input type="number" value={bizForm.price_from||0} onChange={e=>setBizForm(p=>({...p,price_from:+e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
                      </div>
                      <div className="pt-2">
                         <button onClick={saveBizInfo} disabled={bizSaving} className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold">{bizSaving?'Kaydediliyor...':'Firma Bilgilerini Kaydet'}</button>
                      </div>
                    </div>
                    {/* Çalışma Saatleri */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                      <div className="font-bold text-sm border-b border-gray-100 pb-3">Çalışma Saatleri</div>
                      <div className="space-y-3">
                         {['1','2','3','4','5','6','0'].map(d => {
                           const days = {'1':'Pazartesi','2':'Salı','3':'Çarşamba','4':'Perşembe','5':'Cuma','6':'Cumartesi','0':'Pazar'}
                           const wh = workingHours[d] || { str: '09:00', end: '18:00', off: false }
                           return (
                             <div key={d} className="flex items-center justify-between gap-3 p-2 hover:bg-gray-50 rounded-lg">
                               <div className="w-24 text-sm font-semibold text-gray-700">{days[d]}</div>
                               <div className="flex-1 flex gap-2 items-center">
                                 {wh.off ? (
                                   <div className="flex-1 text-center text-sm text-red-500 font-bold py-1.5 bg-red-50 rounded-lg border border-red-100">Kapalı</div>
                                 ) : (
                                   <>
                                     <input type="time" value={wh.str} onChange={e=>setWorkingHours(p=>({...p, [d]: {...wh, str: e.target.value}}))} className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" />
                                     <span className="text-gray-400">-</span>
                                     <input type="time" value={wh.end} onChange={e=>setWorkingHours(p=>({...p, [d]: {...wh, end: e.target.value}}))} className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" />
                                   </>
                                 )}
                               </div>
                               <label className="flex items-center gap-2 cursor-pointer w-20 justify-end">
                                 <input type="checkbox" checked={wh.off} onChange={e=>setWorkingHours(p=>({...p, [d]: {...wh, off: e.target.checked}}))} className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500 accent-orange-500" />
                                 <span className="text-sm font-medium text-gray-600">Kapalı</span>
                               </label>
                             </div>
                           )
                         })}
                      </div>
                      <div className="pt-2">
                         <button onClick={saveWorkingHours} disabled={whSaving} className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold">{whSaving?'Kaydediliyor...':'Çalışma Saatlerini Kaydet'}</button>
                      </div>
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
