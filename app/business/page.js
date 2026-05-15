'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, sendNotification, sendWhatsApp, uploadMedia, deleteMedia, notifyWaitlist, getActiveUser } from '@/lib/supabase'
import dynamic from 'next/dynamic'
const QRScanner = dynamic(() => import('@/app/components/business/QRScanner'), { ssr: false })

const COLORS = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444']

// Inline harita konum seçici
function LocPickerInline({ lat, lng, onSelect }) {
  const [searchQ, setSearchQ] = useState('')
  const [searching, setSearching] = useState(false)

  const searchAndGo = async () => {
    if (!searchQ.trim() || !mapRef.current) return
    setSearching(true)
    try {
      const r = await fetch('/api/geocode?q=' + encodeURIComponent(searchQ))
      const d = await r.json()
      if (d[0]) {
        const la = parseFloat(d[0].lat), lo = parseFloat(d[0].lon)
        mapRef.current.setView([la, lo], 16)
        import('leaflet').then(mod => {
          const L = mod.default
          if (markerRef.current) markerRef.current.setLatLng([la, lo])
          else {
            markerRef.current = L.marker([la,lo],{draggable:true}).addTo(mapRef.current)
            markerRef.current.on('dragend', e => { const p=e.target.getLatLng(); onSelect(p.lat,p.lng) })
          }
          onSelect(la, lo)
        })
      } else { alert('Adres bulunamadı') }
    } catch(e) {}
    setSearching(false)
  }

  const ref = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  useEffect(() => {
    if (!ref.current || mapRef.current) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    import('leaflet').then(mod => {
      const L = mod.default
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      const initLat = lat ? parseFloat(lat) : 41.015
      const initLng = lng ? parseFloat(lng) : 28.979
      const map = L.map(ref.current).setView([initLat, initLng], lat ? 14 : 10)
      mapRef.current = map
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution:'© OSM © CartoDB', maxZoom:19, subdomains:'abcd'
      }).addTo(map)
      if (lat && lng) {
        markerRef.current = L.marker([parseFloat(lat), parseFloat(lng)], {draggable:true}).addTo(map)
        markerRef.current.on('dragend', e => { const p=e.target.getLatLng(); onSelect(p.lat,p.lng) })
      }
      map.on('click', e => {
        const {lat:la, lng:lo} = e.latlng
        if (markerRef.current) markerRef.current.setLatLng([la,lo])
        else {
          markerRef.current = L.marker([la,lo],{draggable:true}).addTo(map)
          markerRef.current.on('dragend', ev => { const p=ev.target.getLatLng(); onSelect(p.lat,p.lng) })
        }
        onSelect(la,lo)
      })
    })
    return () => { if(mapRef.current){mapRef.current.remove();mapRef.current=null} }
  }, [])
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input placeholder="Adres ara — örn: Kadıköy, İstanbul"
          value={searchQ} onChange={e=>setSearchQ(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&searchAndGo()}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400"/>
        <button onClick={searchAndGo} disabled={searching}
          className="px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-bold rounded-lg">
          {searching?'...':'🔍 Ara'}
        </button>
      </div>
      <div ref={ref} style={{height:'240px',borderRadius:'12px',overflow:'hidden',border:'1px solid #e5e7eb'}}/>
      <p className="text-xs text-gray-400 mt-1 text-center">📍 Haritaya tıklayın veya pin sürükleyin</p>
    </div>
  )
}
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

const NAV = [['dashboard','⊞','Dashboard'],['calendar','📅','Takvim'],['appointments','📋','Randevular'],['qrscan','📷','QR Okut'],['staff','👥','Personel'],['services','✨','Hizmetler'],['customers','🤝','Müşteriler'],['reviews','⭐','Yorumlar'],['showcase','🖼️','Vitrin'],['ads','📢','Reklamlar'],['adpkgs','🎁','Reklam Paketleri'],['coupons','🎟️','Kuponlar'],['plans','📦','Üyelik Paketleri'],['reports','📊','Raporlar'],['settings','⚙️','Ayarlar']]

export default function BusinessPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard')
  const [bizId, setBizId] = useState(null)
  const [bizInfo, setBizInfo] = useState(null)
  const [myBusinesses, setMyBusinesses] = useState([])
  const [bizSwitcher, setBizSwitcher] = useState(false)
  const [qrModal, setQrModal] = useState(null)
  const [planModal, setPlanModal] = useState(false)
  const [realtimeToast, setRealtimeToast] = useState('')
  const [showcase, setShowcase] = useState(null) // vitrin bilgileri
  const [adForm, setAdForm] = useState({ title:'', description:'', image_url:'', discount_pct:0, type:'general', target_city:'', target_district:'', target_radius_km:20, ends_at:'' })
  const [ads, setAds] = useState([])
  const [savingShowcase, setSavingShowcase] = useState(false)
  const [showLocPicker, setShowLocPicker] = useState(false)
  const [geoQuery, setGeoQuery] = useState('')
  const [geoSuggestions, setGeoSuggestions] = useState([])
  const [geoLoading, setGeoLoading] = useState(false)
  const [savingAd, setSavingAd] = useState(false)
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
  const [allPlans, setAllPlans] = useState([])
  const [adPackages, setAdPackages] = useState([])
  const [myAdPurchases, setMyAdPurchases] = useState([])
  const [myPlanRequests, setMyPlanRequests] = useState([])
  const [buyingPkg, setBuyingPkg] = useState('')
  const [buyingPlan, setBuyingPlan] = useState('')
  const [apptSearch, setApptSearch] = useState('')
  const [custSearch, setCustSearch] = useState('')
  // Calendar
  const [calDate, setCalDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  // Form
  const [form, setForm] = useState({cname:'',cemail:'',service:'',staff:'',date:'',time:'10:00'})
  // Staff CRUD
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [staffModal, setStaffModal] = useState(false) // false | 'add' | staffObj
  const [staffForm, setStaffForm] = useState({name:'',speciality:'',phone:'',password:'',avatar_url:'',status:'available'})
  const [staffSaving, setStaffSaving] = useState(false)
  // Personel takvimi
  const [staffCalId, setStaffCalId] = useState('')
  const [staffCalDate, setStaffCalDate] = useState(new Date().toISOString().split('T')[0])
  const [staffAvatarUploading, setStaffAvatarUploading] = useState(false)
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
  // Coupons
  const [coupons, setCoupons] = useState([])
  const [couponModal, setCouponModal] = useState(false) // false | 'add' | couponObj
  const [couponForm, setCouponForm] = useState({code:'',description:'',discount_pct:0,discount_amount:0,min_amount:0,max_uses:'',valid_until:'',status:'active'})
  const [couponSaving, setCouponSaving] = useState(false)

  const toast3 = (m) => { setToast(m); setTimeout(()=>setToast(''),3500) }
  const rtToast = (m) => { setRealtimeToast(m); setTimeout(()=>setRealtimeToast(''),6000) }
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  // Realtime — yeni randevu / bildirim
  useEffect(() => {
    if (!bizId) return
    const ch = supabase
      .channel('biz-rt-'+bizId)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'appointments', filter:`business_id=eq.${bizId}` },
        async (payload) => {
          try {
            const a = payload.new
            const [{data:p},{data:s},{data:st}] = await Promise.all([
              a.profile_id ? supabase.from('profiles').select('full_name,email').eq('id',a.profile_id).maybeSingle() : Promise.resolve({data:null}),
              a.service_id ? supabase.from('services').select('name,price,duration_min').eq('id',a.service_id).maybeSingle() : Promise.resolve({data:null}),
              a.staff_id   ? supabase.from('staff').select('name').eq('id',a.staff_id).maybeSingle()   : Promise.resolve({data:null}),
            ])
            const full = { ...a, profiles:p, services:s, staff:st }
            setAppts(prev => prev.find(x=>x.id===a.id) ? prev : [full, ...prev])
            const who = p?.full_name || 'Yeni müşteri'
            const time = String(a.appointment_time||'').slice(0,5)
            rtToast(`🔔 Yeni randevu: ${who} — ${s?.name||'Hizmet'} · ${a.appointment_date} ${time}`)
            try {
              const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=')
              audio.volume = 0.3
              audio.play().catch(()=>{})
            } catch {}
          } catch(e) { console.error('rt err', e) }
        })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications', filter:`business_id=eq.${bizId}` },
        (payload) => {
          setNotifs(prev => prev.find(n=>n.id===payload.new.id) ? prev : [payload.new, ...prev])
        })
      .on('postgres_changes', { event:'*', schema:'public', table:'plan_limits' },
        async () => {
          // Admin plan limitlerini değiştirince anlık güncelle
          const { data: plAll } = await supabase.from('plan_limits').select('*').order('price_monthly')
          const allPlansNow = plAll || []
          setAllPlans(allPlansNow)
          const planKey = bizInfo?.plan || 'free'
          const myPlan = allPlansNow.find(p => p.plan === planKey) || allPlansNow.find(p => p.plan === 'free')
          if (myPlan) {
            setPlanLimits(myPlan)
            rtToast('⚙️ Plan limitleri güncellendi')
          }
        })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'businesses', filter:`id=eq.${bizId}` },
        async (payload) => {
          // Admin firma planını değiştirince (örn. onay) anlık güncelle
          const newPlan = payload.new?.plan
          if (newPlan && newPlan !== bizInfo?.plan) {
            setBizInfo(p => p ? { ...p, plan: newPlan } : p)
            const { data: plAll } = await supabase.from('plan_limits').select('*').order('price_monthly')
            const my = (plAll||[]).find(p => p.plan === newPlan)
            if (my) { setPlanLimits(my); rtToast('🎉 Planınız '+newPlan.toUpperCase()+' olarak güncellendi') }
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [bizId, bizInfo?.plan])

  // Auth
  useEffect(() => {
    (async () => {
      const u = await getActiveUser()
      if (!u) { router.push('/login'); return }
      setUser(u)
    })()
  }, [router])

  const loadAll = useCallback(async (bId, bizPlanKey='free') => {
    setLoading(true)
    try {
      const [ar,sr,svr,nr,rr,plAll,adsr,pkgs,myPurch,myPlanReq,cpr] = await Promise.all([
        supabase.from('appointments').select('id,profile_id,service_id,staff_id,appointment_date,appointment_time,status,price,profiles(full_name,email),services(name,price,duration_min),staff(name)').eq('business_id',bId).order('appointment_date',{ascending:false}),
        supabase.from('staff').select('*').eq('business_id',bId),
        supabase.from('services').select('*').eq('business_id',bId),
        supabase.from('notifications').select('*').eq('business_id',bId).order('created_at',{ascending:false}).limit(20),
        supabase.from('reviews').select('*, profiles(full_name)').eq('business_id',bId).order('created_at',{ascending:false}),
        supabase.from('plan_limits').select('*').order('price_monthly'),
        supabase.from('ads').select('*').eq('business_id', bId).order('created_at', {ascending:false}),
        supabase.from('ad_packages').select('*').eq('status','active').order('sort_order'),
        supabase.from('ad_package_purchases').select('*').eq('business_id', bId).order('created_at',{ascending:false}),
        supabase.from('plan_upgrade_requests').select('*').eq('business_id', bId).order('created_at',{ascending:false}),
        supabase.from('coupons').select('*').eq('business_id', bId).order('created_at',{ascending:false}),
      ])
      setAppts(ar.data||[])
      setStaff(sr.data||[])
      setSvcs(svr.data||[])
      setNotifs(nr.data||[])
      setReviews(rr?.data||[])
      const allPlans = plAll?.data || []
      setAllPlans(allPlans)
      const myPlan = allPlans.find(p => p.plan === bizPlanKey) || allPlans.find(p => p.plan === 'free')
      if (myPlan) setPlanLimits(myPlan)
      setAds(adsr?.data||[])
      setAdPackages(pkgs?.data||[])
      setMyAdPurchases(myPurch?.data||[])
      setMyPlanRequests(myPlanReq?.data||[])
      setCoupons(cpr?.data||[])
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
        setBizForm({name:b.name||'',category:b.category||'',city:b.city||'',phone:b.phone||'',address:b.address||'',price_from:b.price_from||0,email:b.email||'',description:b.description||'',lat:b.lat||'',lng:b.lng||''});
        setShowcase({ cover_url: b.cover_url||'', gallery_urls: b.gallery_urls||[], bio: b.bio||'', instagram: b.instagram||'', facebook: b.facebook||'', website: b.website||'' });
        setWorkingHours(b.working_hours || {
          "1": { str: "09:00", end: "18:00", off: false },
          "2": { str: "09:00", end: "18:00", off: false },
          "3": { str: "09:00", end: "18:00", off: false },
          "4": { str: "09:00", end: "18:00", off: false },
          "5": { str: "09:00", end: "18:00", off: false },
          "6": { str: "09:00", end: "18:00", off: false },
          "0": { str: "09:00", end: "18:00", off: true },
        });
        loadAll(b.id, b.plan || 'free')
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
    sendWhatsApp('confirmed', id)
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
    const cancelled = appts.find(a => a.id === id)
    await supabase.from('appointments').update({status:'cancelled'}).eq('id',id)
    sendNotification('cancelled', id)
    sendWhatsApp('cancelled', id)
    setAppts(p=>p.map(a=>a.id===id?{...a,status:'cancelled'}:a))
    toast3('Randevu iptal edildi')
    if (cancelled) notifyWaitlist(cancelled.business_id || bizId, cancelled.appointment_date)
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
    if (staffModal === 'add' && planLimits && staff.length >= (planLimits.max_staff||0)) {
      toast3('❌ Personel limitiniz dolu ('+planLimits.max_staff+'). Üyelik planınızı yükseltin.')
      return
    }
    setStaffSaving(true)
    try {
      const payload = {
        name: staffForm.name,
        speciality: staffForm.speciality || null,
        phone: staffForm.phone || null,
        status: staffForm.status,
        avatar_url: staffForm.avatar_url || null,
      }
      if (staffForm.password && staffForm.password.length >= 4) {
        payload.password_hash = staffForm.password
      }
      if (staffModal === 'add') {
        const { data, error } = await supabase.from('staff').insert({ ...payload, business_id: bizId, appointment_count: 0 }).select().maybeSingle()
        if (error) throw error
        setStaff(p => [...p, data])
        toast3('✅ Personel eklendi')
      } else {
        const { error } = await supabase.from('staff').update(payload).eq('id', staffModal.id)
        if (error) throw error
        setStaff(p => p.map(s => s.id === staffModal.id ? { ...s, ...payload } : s))
        toast3('✅ Personel güncellendi')
      }
      setStaffModal(false)
      setStaffForm({ name:'', speciality:'', phone:'', password:'', avatar_url:'', status:'available' })
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
    setStaffForm({ name:'', speciality:'', phone:'', password:'', avatar_url:'', status:'available' })
    setStaffModal('add')
  }
  function openStaffEdit(s) {
    setStaffForm({ name: s.name, speciality: s.speciality || '', phone: s.phone || '', password: '', avatar_url: s.avatar_url || '', status: s.status || 'available' })
    setStaffModal(s)
  }
  async function uploadStaffAvatar(file) {
    if (!file) return
    if (file.size > 3*1024*1024) { toast3('❌ Foto max 3MB olmalı'); return }
    setStaffAvatarUploading(true)
    try {
      const url = await uploadMedia(file, 'staff')
      setStaffForm(p => ({ ...p, avatar_url: url }))
      toast3('✅ Foto yüklendi')
    } catch(e) { toast3('❌ ' + e.message) }
    finally { setStaffAvatarUploading(false) }
  }

  // --- Hizmet CRUD ---
  async function saveSvc() {
    if (!svcForm.name.trim()) { toast3('❌ İsim zorunlu'); return }
    if (svcModal === 'add' && planLimits && services.length >= (planLimits.max_services||0)) {
      toast3('❌ Hizmet limitiniz dolu ('+planLimits.max_services+'). Üyelik planınızı yükseltin.')
      return
    }
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

  // Coupons CRUD
  function openCouponAdd() {
    setCouponForm({code:'',description:'',discount_pct:0,discount_amount:0,min_amount:0,max_uses:'',valid_until:'',status:'active'})
    setCouponModal('add')
  }
  function openCouponEdit(c) {
    setCouponForm({
      code: c.code, description: c.description||'',
      discount_pct: c.discount_pct||0, discount_amount: c.discount_amount||0,
      min_amount: c.min_amount||0,
      max_uses: c.max_uses ?? '',
      valid_until: c.valid_until ? c.valid_until.slice(0,10) : '',
      status: c.status||'active',
    })
    setCouponModal(c)
  }
  async function saveCoupon() {
    const code = couponForm.code.trim().toUpperCase()
    if (!code) { toast3('❌ Kod zorunlu'); return }
    if (!couponForm.discount_pct && !couponForm.discount_amount) { toast3('❌ İndirim oranı veya tutarı girin'); return }
    if (!bizId) { toast3('❌ İşletme yüklenmedi'); return }
    setCouponSaving(true)
    try {
      const payload = {
        code,
        business_id: bizId,
        description: couponForm.description.trim() || null,
        discount_pct: +couponForm.discount_pct || 0,
        discount_amount: +couponForm.discount_amount || 0,
        min_amount: +couponForm.min_amount || 0,
        max_uses: couponForm.max_uses === '' ? null : +couponForm.max_uses,
        valid_until: couponForm.valid_until ? new Date(couponForm.valid_until).toISOString() : null,
        status: couponForm.status,
      }
      if (couponModal === 'add') {
        const { data, error } = await supabase.from('coupons').insert(payload).select().maybeSingle()
        if (error) throw error
        setCoupons(p => [data, ...p])
        toast3('✅ Kupon eklendi')
      } else {
        const { data, error } = await supabase.from('coupons').update(payload).eq('id', couponModal.id).select().maybeSingle()
        if (error) throw error
        setCoupons(p => p.map(c => c.id===couponModal.id ? {...c, ...data} : c))
        toast3('✅ Kupon güncellendi')
      }
      setCouponModal(false)
    } catch(e) { toast3('❌ '+e.message) }
    finally { setCouponSaving(false) }
  }
  async function deleteCoupon(id, code) {
    if (!confirm(`${code} kuponu silinsin mi?`)) return
    await supabase.from('coupons').delete().eq('id', id)
    setCoupons(p => p.filter(c => c.id !== id))
    setCouponModal(false)
    toast3('🗑️ Kupon silindi')
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
      const { error } = await supabase.from('businesses').update({ name: bizForm.name, category: bizForm.category, city: bizForm.city, phone: bizForm.phone, address: bizForm.address, price_from: +bizForm.price_from, email: bizForm.email||null, description: bizForm.description||null, lat: bizForm.lat ? +bizForm.lat : null, lng: bizForm.lng ? +bizForm.lng : null }).eq('id', bizId)
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
  // Reklam paketi satın al — admin onayı için pending kaydı oluştur
  async function buyAdPackage(pkg) {
    if (!bizId) return
    if (!confirm(`"${pkg.name}" paketini ₺${pkg.price} karşılığında satın almak istediğinize emin misiniz?\n\nİsteğiniz admin onayına gönderilecek.`)) return
    setBuyingPkg(pkg.id)
    try {
      const { data, error } = await supabase.from('ad_package_purchases').insert({
        business_id: bizId,
        package_id: pkg.id,
        package_name: pkg.name,
        price_at_purchase: pkg.price,
        status: 'pending',
      }).select().maybeSingle()
      if (error) throw error
      if (data) setMyAdPurchases(p => [data, ...p])
      await supabase.from('notifications').insert({
        type: 'admin_ad_purchase',
        title: 'Yeni reklam paketi satın alma talebi',
        message: `${bizInfo?.name || 'Firma'} "${pkg.name}" paketini (₺${pkg.price}) satın almak istiyor.`,
      })
      toast3('✅ Satın alma talebiniz alındı — admin onayı bekleniyor')
    } catch(e) { toast3('❌ '+e.message) }
    finally { setBuyingPkg('') }
  }

  async function buyPlan(p, label) {
    if (!bizId) return
    const currentPlan = bizInfo?.plan || 'free'
    if (p.plan === currentPlan) { toast3('Zaten bu planı kullanıyorsunuz'); return }
    if (!confirm(`"${label}" planına geçmek istediğinize emin misiniz?\n\nİsteğiniz admin onayına gönderilecek; onay sonrası plan aktif olur.`)) return
    setBuyingPlan(p.plan)
    try {
      const { data, error } = await supabase.from('plan_upgrade_requests').insert({
        business_id: bizId,
        requested_plan: p.plan,
        current_plan: currentPlan,
        status: 'pending',
      }).select().maybeSingle()
      if (error) throw error
      if (data) setMyPlanRequests(prev => [data, ...prev])
      await supabase.from('notifications').insert({
        type: 'admin_plan_request',
        title: 'Yeni üyelik planı talebi',
        message: `${bizInfo?.name || 'Firma'} ${currentPlan.toUpperCase()} → ${p.plan.toUpperCase()} planına geçmek istiyor (₺${p.price_monthly||0}/ay).`,
      })
      setPlanModal(false)
      toast3('✅ Plan talebiniz alındı — admin onayı bekleniyor')
    } catch(e) { toast3('❌ '+e.message) }
    finally { setBuyingPlan('') }
  }

  async function saveAppt() {
    if(!form.cname||!form.service||!form.date){ toast3('❌ Zorunlu alanları doldurun'); return }
    setSaving(true)
    try {
      const svc=services.find(s=>s.id===form.service)
      // Çakışma kontrolü — aynı personelde süre bazlı overlap
      const dur = svc?.duration_min || 60
      const [nh, nm] = String(form.time).split(':').map(Number)
      const nStart = nh*60 + nm
      const nEnd = nStart + dur
      const { data: dayAppts } = await supabase
        .from('appointments')
        .select('appointment_time, staff_id, services(duration_min)')
        .eq('business_id', bizId)
        .eq('appointment_date', form.date)
        .in('status', ['pending','confirmed'])
      const targetStaff = form.staff || null
      const conflict = (dayAppts||[]).some(a => {
        if ((a.staff_id || null) !== targetStaff) return false
        const [h,m] = String(a.appointment_time).split(':').map(Number)
        const s = h*60+m
        const e = s + (a.services?.duration_min || 60)
        return nStart < e && nEnd > s
      })
      if (conflict) { toast3('❌ Bu saatte ' + (targetStaff ? 'personelin' : 'firmanın') + ' başka randevusu var'); setSaving(false); return }
      let profileId = null
      if(form.cemail){
        const {data:ex}=await supabase.from('profiles').select('id').eq('email',form.cemail).maybeSingle()
        if(ex) profileId=ex.id
        else {
          const {data:np}=await supabase.from('profiles').insert({full_name:form.cname,email:form.cemail,role:'customer'}).select('id').maybeSingle()
          profileId=np?.id
        }
      }
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
      await loadAll(bizId, bizInfo?.plan || 'free')
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
      {/* PLAN YÜKSELTME MODAL */}
      {planModal && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setPlanModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <div className="font-bold text-lg">Plan Yükselt</div>
                <div className="text-xs text-gray-500">Şu anki plan: <b className="text-orange-500 uppercase">{bizInfo?.plan||'free'}</b></div>
              </div>
              <button onClick={()=>setPlanModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg">✕</button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {allPlans.map(p=>{
                const labels = {free:'Ücretsiz', pro:'Pro', enterprise:'Enterprise'}
                const colorMap = {free:'gray', pro:'orange', enterprise:'slate'}
                const label = labels[p.plan] || p.plan
                const isCurrent = bizInfo?.plan===p.plan
                const popular = p.plan==='pro'
                const features = [
                  `${p.max_staff||0} personel`,
                  `${p.max_services||0} hizmet`,
                  `${p.max_monthly_appts||0} randevu/ay`,
                  `${p.max_gallery_images||0} galeri görseli`,
                  `${p.max_ads||0} reklam`,
                  p.has_analytics && '📊 Analitik raporlar',
                  p.has_sms && '📱 SMS bildirimi',
                  p.has_custom_domain && '🌐 Özel domain',
                ].filter(Boolean)
                return (
                  <div key={p.plan} className={`border-2 rounded-2xl p-4 relative flex flex-col ${isCurrent?'border-orange-500 bg-orange-50':popular?'border-orange-300':'border-gray-200'}`}>
                    {popular && !isCurrent && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">Popüler</div>}
                    {isCurrent && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">Mevcut Plan</div>}
                    <div className="font-bold text-base mb-1">{label}</div>
                    <div className="text-2xl font-extrabold text-gray-800 mb-3">₺{p.price_monthly||0}<span className="text-sm text-gray-400 font-normal">/ay</span></div>
                    <ul className="space-y-1.5 flex-1 mb-4">
                      {features.map((f,i)=>(
                        <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="text-green-500 font-bold">✓</span>{f}
                        </li>
                      ))}
                    </ul>
                    {(() => {
                      const hasPending = myPlanRequests.some(r => r.requested_plan===p.plan && r.status==='pending')
                      if (isCurrent) return <div className="w-full py-2 text-center text-xs font-bold text-green-600 bg-green-50 rounded-xl border border-green-200">Aktif Plan</div>
                      if (hasPending) return <div className="w-full py-2 text-center text-xs font-bold text-amber-700 bg-amber-50 rounded-xl border border-amber-200">⏳ Onay Bekleniyor</div>
                      return (
                        <button onClick={()=>buyPlan(p, label)} disabled={buyingPlan===p.plan}
                          className={`w-full py-2 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-60 ${p.plan==='pro'?'bg-orange-500 hover:bg-orange-600':p.plan==='enterprise'?'bg-slate-800 hover:bg-slate-700':'bg-gray-400 hover:bg-gray-500'}`}>
                          {buyingPlan===p.plan ? 'İşleniyor...' : p.plan==='free' ? 'Ücretsize Geç' : 'Bu Planı Seç'}
                        </button>
                      )
                    })()}
                  </div>
                )
              })}
              {allPlans.length===0 && <div className="col-span-3 text-center py-8 text-gray-400">Plan listesi yükleniyor...</div>}
            </div>
            <div className="px-5 pb-5 text-xs text-gray-400 text-center">Gerçek ödeme entegrasyonu yakında · Şu an demo amaçlı</div>
          </div>
        </div>
      )}
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
      {realtimeToast && (
        <div className="fixed top-6 right-6 z-[60] bg-gradient-to-br from-orange-500 to-pink-500 text-white px-5 py-4 rounded-2xl text-sm font-bold shadow-2xl flex items-start gap-3 animate-pulse max-w-sm">
          <span className="text-2xl">🔔</span>
          <div className="flex-1">
            <div className="font-extrabold mb-0.5">Yeni Randevu Geldi!</div>
            <div className="text-xs font-semibold opacity-95">{realtimeToast.replace('🔔 Yeni randevu: ','')}</div>
          </div>
          <button onClick={()=>setRealtimeToast('')} className="text-white/80 hover:text-white text-lg leading-none">×</button>
        </div>
      )}

      {/* PERSONEL MODAL */}
      {staffModal&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setStaffModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div><div className="font-bold">{staffModal==='add'?'Personel Ekle':'Personel Düzenle'}</div></div>
              <button onClick={()=>setStaffModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">Profil Fotoğrafı</label>
                <div className="flex items-center gap-3">
                  {staffForm.avatar_url
                    ? <img src={staffForm.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover border border-gray-200" />
                    : <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xl text-gray-400">👤</div>
                  }
                  <label className="flex-1 px-3 py-2.5 border border-dashed border-gray-300 rounded-xl text-xs text-gray-500 cursor-pointer hover:bg-gray-50 text-center">
                    {staffAvatarUploading ? 'Yükleniyor...' : (staffForm.avatar_url ? '✏️ Değiştir' : '📷 Foto Yükle')}
                    <input type="file" accept="image/*" className="hidden" onChange={e=>uploadStaffAvatar(e.target.files?.[0])} />
                  </label>
                  {staffForm.avatar_url && <button onClick={()=>setStaffForm(p=>({...p,avatar_url:''}))} className="text-xs text-red-500">Sil</button>}
                </div>
              </div>
              <div><label className="text-xs font-bold block mb-1">Ad Soyad *</label>
                <input value={staffForm.name} onChange={e=>setStaffForm(p=>({...p,name:e.target.value}))} placeholder="Örn: Ayşe Yılmaz" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
              <div><label className="text-xs font-bold block mb-1">Uzmanlık</label>
                <input value={staffForm.speciality} onChange={e=>setStaffForm(p=>({...p,speciality:e.target.value}))} placeholder="Örn: Manikür, Saç Boyama" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold block mb-1">Telefon (giriş)</label>
                  <input value={staffForm.phone} onChange={e=>setStaffForm(p=>({...p,phone:e.target.value}))} placeholder="+90 555 000 00 00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
                <div><label className="text-xs font-bold block mb-1">Şifre {staffModal!=='add' && <span className="text-gray-400 font-normal">(boş bırak = değişmez)</span>}</label>
                  <input type="password" value={staffForm.password} onChange={e=>setStaffForm(p=>({...p,password:e.target.value}))} placeholder="En az 4 karakter" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
              </div>
              <div><label className="text-xs font-bold block mb-1">Durum</label>
                <select value={staffForm.status} onChange={e=>setStaffForm(p=>({...p,status:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400">
                  <option value="available">Müsait</option>
                  <option value="busy">Meşgul</option>
                  <option value="off">İzinli</option>
                </select></div>
              <p className="text-xs text-gray-400 leading-snug">★ Yıldız puanı sadece müşteri yorumlarıyla oluşur — buradan ayarlanamaz.</p>
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
      {couponModal && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setCouponModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <div className="font-bold">{couponModal==='add'?'Kupon Ekle':'Kupon Düzenle'}</div>
              <button onClick={()=>setCouponModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-bold block mb-1">Kod * (otomatik büyük harf)</label>
                <input value={couponForm.code} onChange={e=>setCouponForm(p=>({...p,code:e.target.value.toUpperCase()}))} placeholder="ÖRN: BAHAR20" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 uppercase font-mono tracking-wider"/></div>
              <div><label className="text-xs font-bold block mb-1">Açıklama</label>
                <input value={couponForm.description} onChange={e=>setCouponForm(p=>({...p,description:e.target.value}))} placeholder="Kısa açıklama" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-bold block mb-1">İndirim (%)</label>
                  <input type="number" min="0" max="100" value={couponForm.discount_pct} onChange={e=>setCouponForm(p=>({...p,discount_pct:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/></div>
                <div><label className="text-xs font-bold block mb-1">İndirim (₺)</label>
                  <input type="number" min="0" value={couponForm.discount_amount} onChange={e=>setCouponForm(p=>({...p,discount_amount:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-bold block mb-1">Min. Tutar (₺)</label>
                  <input type="number" min="0" value={couponForm.min_amount} onChange={e=>setCouponForm(p=>({...p,min_amount:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/></div>
                <div><label className="text-xs font-bold block mb-1">Max Kullanım</label>
                  <input type="number" min="1" value={couponForm.max_uses} onChange={e=>setCouponForm(p=>({...p,max_uses:e.target.value}))} placeholder="Sınırsız" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-bold block mb-1">Bitiş Tarihi</label>
                  <input type="date" value={couponForm.valid_until} onChange={e=>setCouponForm(p=>({...p,valid_until:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/></div>
                <div><label className="text-xs font-bold block mb-1">Durum</label>
                  <select value={couponForm.status} onChange={e=>setCouponForm(p=>({...p,status:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400">
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </select></div>
              </div>
              {couponModal!=='add' && (
                <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                  Kullanım: <b>{couponModal.used_count}</b>{couponModal.max_uses?' / '+couponModal.max_uses:''}
                </div>
              )}
            </div>
            <div className="px-5 pb-5 flex gap-2 sticky bottom-0 bg-white pt-2 border-t border-gray-100">
              {couponModal!=='add' && <button onClick={()=>deleteCoupon(couponModal.id, couponModal.code)} className="px-3 py-2.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-xl text-xs font-bold">🗑️ Sil</button>}
              <button onClick={()=>setCouponModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={saveCoupon} disabled={couponSaving} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold">{couponSaving?'Kaydediliyor...':couponModal==='add'?'Ekle':'Güncelle'}</button>
            </div>
          </div>
        </div>
      )}

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
              <button key={b.id} onClick={() => { setBizId(b.id); setBizInfo(b); setBizSwitcher(false); loadAll(b.id, b.plan || 'free') }}
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
        {/* Mobil Alt Navbar - Tek sıra scroll */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-800 border-t border-white/10">
          <div className="flex overflow-x-auto scrollbar-hide">
            {NAV.map(([key,icon,label])=>(
              <button key={key} onClick={()=>setView(key)}
                className={`flex-none flex flex-col items-center justify-center py-2 px-3 text-xs font-semibold transition-all relative min-w-[60px] ${view===key?'text-orange-500':'text-white/40'}`}>
                <span className="text-base">{icon}</span>
                <span className="text-[9px] mt-0.5 leading-none whitespace-nowrap">{label}</span>
                {key==='appointments'&&appts.filter(a=>a.status==='pending').length>0&&<span className="absolute top-0.5 right-1 w-3 h-3 bg-amber-500 rounded-full text-white text-[8px] flex items-center justify-center font-bold">{appts.filter(a=>a.status==='pending').length}</span>}
              </button>
            ))}
            <button onClick={async()=>{await supabase.auth.signOut();localStorage.removeItem('randevu_user');router.push('/login')}}
              className="flex-none flex flex-col items-center justify-center py-2 px-3 min-w-[60px] text-white/30">
              <span className="text-base">🚪</span>
              <span className="text-[9px] mt-0.5 leading-none">Çıkış</span>
            </button>
          </div>
        </div>
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-5 gap-2 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">{NAV.find(x=>x[0]===view)?.[2]}</span>
          <div className="ml-auto flex items-center gap-2">
            {/* QR Okut — kalıcı kısayol */}
            <button onClick={()=>setView('qrscan')} title="QR Kod Okut"
              className={'flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-colors '+(view==='qrscan'?'bg-purple-600 text-white border-purple-600':'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100')}>
              📷 <span className="hidden sm:inline">QR Okut</span>
            </button>
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
                        <button onClick={() => setPlanModal(true)}
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
                  <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <h1 className="text-xl font-bold">Takvim</h1>
                    <div className="flex gap-2">
                      <button onClick={()=>{
                        const d=new Date(); d.setMonth(d.getMonth()-1)
                        setSelectedDate(d.toISOString().split('T')[0].slice(0,7)+'-01')
                      }} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">←</button>
                      <button onClick={()=>setSelectedDate(new Date().toISOString().split('T')[0].slice(0,7)+'-01')}
                        className="px-3 py-1.5 border border-orange-300 text-orange-500 rounded-lg text-sm font-semibold">Bugün</button>
                      <button onClick={()=>{
                        const d=new Date(selectedDate||new Date()); d.setMonth(d.getMonth()+1)
                        setSelectedDate(d.toISOString().split('T')[0].slice(0,7)+'-01')
                      }} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">→</button>
                    </div>
                  </div>
                  {/* Aylık Takvim Görünümü */}
                  {(()=>{
                    const base = selectedDate ? new Date(selectedDate) : new Date()
                    const year = base.getFullYear(), month = base.getMonth()
                    const firstDay = new Date(year, month, 1).getDay()
                    const daysInMonth = new Date(year, month+1, 0).getDate()
                    const today = new Date().toISOString().split('T')[0]
                    const days = Array.from({length:42},(_,i)=>{
                      const d = i - (firstDay===0?6:firstDay-1)
                      if(d<1||d>daysInMonth) return null
                      const dateStr = year+'-'+String(month+1).padStart(2,'0')+'-'+String(d).padStart(2,'0')
                      const dayAppts = appts.filter(a=>a.appointment_date===dateStr)
                      return {d, dateStr, dayAppts}
                    })
                    return (
                      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-5">
                        <div className="px-5 py-3 border-b border-gray-100 font-bold text-sm">
                          {base.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}
                        </div>
                        <div className="grid grid-cols-7 border-b border-gray-100">
                          {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map(d=>(
                            <div key={d} className="py-2 text-center text-xs font-bold text-gray-400">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7">
                          {days.map((day,i)=>(
                            <div key={i} onClick={()=>day&&setSelectedDate(day.dateStr)}
                              className={'min-h-[60px] p-1.5 border-b border-r border-gray-50 cursor-pointer transition-colors '+(day?.dateStr===today?'bg-orange-50':'hover:bg-gray-50')+(day?.dateStr===selectedDate?' ring-2 ring-orange-400 ring-inset':'')}>
                              {day && (
                                <>
                                  <div className={'text-xs font-bold mb-1 '+(day.dateStr===today?'text-orange-500':'text-gray-600')}>{day.d}</div>
                                  {day.dayAppts.slice(0,3).map(a=>(
                                    <div key={a.id} className={'text-xs px-1 py-0.5 rounded mb-0.5 truncate '+(a.status==='confirmed'?'bg-green-100 text-green-700':a.status==='pending'?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-500')}>
                                      {String(a.appointment_time).slice(0,5)} {a.profiles?.full_name?.split(' ')[0]||''}
                                    </div>
                                  ))}
                                  {day.dayAppts.length>3&&<div className="text-xs text-gray-400">+{day.dayAppts.length-3}</div>}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                  {/* Seçili Güne Ait Randevular */}
                  {selectedDate && (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                      <div className="font-bold text-sm mb-3">{new Date(selectedDate).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})} Randevuları</div>
                      {appts.filter(a=>a.appointment_date===selectedDate).length===0
                        ? <div className="text-xs text-gray-400 text-center py-4">Bu güne ait randevu yok</div>
                        : appts.filter(a=>a.appointment_date===selectedDate).sort((a,b)=>String(a.appointment_time).localeCompare(String(b.appointment_time))).map(a=>(
                          <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                            <div className="text-xs font-bold text-gray-500 w-10">{String(a.appointment_time).slice(0,5)}</div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold">{a.profiles?.full_name||'—'}</div>
                              <div className="text-xs text-gray-400">{a.services?.name||'—'} · {a.staff?.name||'—'}</div>
                            </div>
                            <span className={'text-xs font-bold px-2 py-0.5 rounded-full '+(a.status==='confirmed'?'bg-green-100 text-green-700':a.status==='pending'?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-500')}>{a.status==='confirmed'?'Onaylı':a.status==='pending'?'Bekliyor':'Tamamlandı'}</span>
                          </div>
                        ))
                      }
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-5" style={{display:'none'}}>
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
                      <table className="w-full min-w-[700px]">
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

              {/* QR OKUT */}
              {view==='qrscan' && (
                <div>
                  <div className="mb-5">
                    <h1 className="text-xl font-bold">QR Okut</h1>
                    <p className="text-gray-500 text-sm">Müşterinin telefonundaki QR kodu okutun; randevu otomatik tamamlanır.</p>
                  </div>
                  <QRScanner bizId={bizId} />
                </div>
              )}

              {/* PERSONEL */}
              {view==='staff' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div><h1 className="text-xl font-bold">Personel</h1><p className="text-gray-500 text-sm">{staff.length}/{planLimits?.max_staff||'—'} personel</p></div>
                    {(() => {
                      const atLimit = planLimits && staff.length >= (planLimits.max_staff||0)
                      return (
                        <button onClick={()=> atLimit ? toast3('❌ Personel limitiniz dolu — planınızı yükseltin') : openStaffAdd()}
                          disabled={atLimit}
                          className={'text-xs font-bold px-4 py-2 rounded-lg transition-colors '+(atLimit?'bg-gray-200 text-gray-500 cursor-not-allowed':'bg-orange-500 hover:bg-orange-600 text-white')}
                          title={atLimit?'Plan limiti dolu':''}>
                          {atLimit ? '🔒 Limit Dolu' : '+ Personel Ekle'}
                        </button>
                      )
                    })()}
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-5">
                    <KPI label="Toplam" value={staff.length} color="blue" />
                    <KPI label="Müsait" value={staff.filter(s=>s.status==='available').length} color="green" />
                    <KPI label="Meşgul" value={staff.filter(s=>s.status==='busy').length} color="orange" />
                    <KPI label="Ort. Puan" value={staff.length?(staff.reduce((s,x)=>s+(+x.rating||0),0)/staff.length).toFixed(1):'—'} color="purple" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                    {staff.map((s,i)=>(
                      <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="relative flex-shrink-0 cursor-pointer" onClick={()=>openStaffEdit(s)}>
                          {s.avatar_url
                            ? <img src={s.avatar_url} alt={s.name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                            : <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-extrabold text-white" style={{background:COLORS[i%COLORS.length]}}>{s.name[0]}</div>
                          }
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${s.status==='available'?'bg-green-500':s.status==='busy'?'bg-amber-500':'bg-gray-400'}`} />
                        </div>
                        <div className="flex-1 cursor-pointer" onClick={()=>openStaffEdit(s)}>
                          <div className="font-bold text-sm">{s.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{s.speciality||'Genel'}</div>
                          {s.phone&&<div className="text-xs text-gray-400 mt-0.5">{s.phone}</div>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-extrabold text-orange-500">{s.appointment_count||0}</div>
                          <div className="text-xs text-gray-400">randevu</div>
                          <div className="text-xs font-bold text-amber-500">★ {Number(s.rating||0).toFixed(1)}</div>
                          <button onClick={(e)=>{e.stopPropagation(); setStaffCalId(s.id); setStaffCalDate(new Date().toISOString().split('T')[0])}}
                            className="mt-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-2 py-0.5 rounded-md font-bold">📅 Takvim</button>
                        </div>
                      </div>
                    ))}
                    {staff.length===0&&<div className="col-span-2 text-center py-12 text-gray-400">Henüz personel eklenmemiş — <button onClick={openStaffAdd} className="text-orange-500 hover:underline">hemen ekle</button></div>}
                  </div>

                  {/* PERSONEL TAKVİMİ */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
                      <div>
                        <div className="font-bold text-sm">📅 Personel Takvimi</div>
                        <div className="text-xs text-gray-500">Seçili personelin günlük randevuları</div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <select value={staffCalId} onChange={e=>setStaffCalId(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400">
                          <option value="">Personel seç</option>
                          {staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input type="date" value={staffCalDate} onChange={e=>setStaffCalDate(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" />
                      </div>
                    </div>
                    <div className="p-4">
                      {!staffCalId ? (
                        <div className="text-center py-8 text-gray-400 text-sm">Yukarıdan bir personel seçin</div>
                      ) : (() => {
                        const dayAppts = appts
                          .filter(a => a.staff_id===staffCalId && a.appointment_date===staffCalDate && a.status!=='cancelled')
                          .sort((a,b)=>String(a.appointment_time).localeCompare(String(b.appointment_time)))
                        if (dayAppts.length===0) return <div className="text-center py-8 text-gray-400 text-sm">Bu gün için randevu yok ✨</div>
                        return (
                          <div className="space-y-2">
                            {dayAppts.map(a=>(
                              <div key={a.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                                <div className="text-sm font-bold text-orange-500 w-14 flex-shrink-0">{String(a.appointment_time).slice(0,5)}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold truncate">{a.profiles?.full_name||'Müşteri'}</div>
                                  <div className="text-xs text-gray-500 truncate">{a.services?.name||'—'} · {a.services?.duration_min||60}dk</div>
                                </div>
                                <Bdg s={a.status} />
                                <div className="text-sm font-bold text-gray-700">₺{a.price||0}</div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* HİZMETLER */}
              {view==='services' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div><h1 className="text-xl font-bold">Hizmetler</h1><p className="text-gray-500 text-sm">{services.length}/{planLimits?.max_services||'—'} hizmet</p></div>
                    {(() => {
                      const atLimit = planLimits && services.length >= (planLimits.max_services||0)
                      return (
                        <button onClick={()=> atLimit ? toast3('❌ Hizmet limitiniz dolu — planınızı yükseltin') : openSvcAdd()}
                          disabled={atLimit}
                          className={'text-xs font-bold px-4 py-2 rounded-lg transition-colors '+(atLimit?'bg-gray-200 text-gray-500 cursor-not-allowed':'bg-orange-500 hover:bg-orange-600 text-white')}>
                          {atLimit ? '🔒 Limit Dolu' : '+ Hizmet Ekle'}
                        </button>
                      )
                    })()}
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
                  <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div><h1 className="text-xl font-bold">Müşteriler</h1><p className="text-gray-500 text-sm">{Object.keys(custMap).length} kayıtlı</p></div>
                    <button onClick={async()=>{
                      const msg = window.prompt('KVKK onayı olan müşterilere gönderilecek SMS:')
                      if(!msg) return
                      const eligible = uniqueCustomers.filter(c=>c.sms_consent&&!c.sms_unsubscribed)
                      if(eligible.length===0){ toast3('SMS onayı olan müşteri yok'); return }
                      await supabase.from('sms_campaigns').insert({business_id:bizId,title:'Toplu SMS',message:msg,target:'all',status:'sent',sent_count:eligible.length})
                      toast3('SMS kampanyası oluşturuldu! (' + eligible.length + '/' + uniqueCustomers.length + ' müşteri)')
                    }} className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl flex items-center gap-1.5">📱 Toplu SMS</button>
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

              {/* VİTRİN */}
              {view==='showcase'&&(
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div><h1 className="text-lg sm:text-xl font-bold">Vitrin Düzenle</h1><p className="text-gray-500 text-sm">İşletme sayfanızı özelleştirin</p></div>
                    <button onClick={async()=>{
                      setSavingShowcase(true)
                      await supabase.from('businesses').update({
                        cover_url: showcase.cover_url,
                        gallery_urls: showcase.gallery_urls,
                        bio: showcase.bio,
                        instagram: showcase.instagram,
                        facebook: showcase.facebook,
                        website: showcase.website,
                      }).eq('id',bizId)
                      setBizInfo(prev=>({...prev,...showcase}))
                      setSavingShowcase(false)
                      toast3('✅ Vitrin kaydedildi!')
                    }} disabled={savingShowcase} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-bold rounded-xl">
                      {savingShowcase?'Kaydediliyor...':'💾 Kaydet'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Kapak Görseli */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="font-bold text-sm mb-3">🖼️ Kapak Görseli</div>
                      {showcase?.cover_url && <img src={showcase.cover_url} alt="Kapak" className="w-full h-40 object-cover rounded-xl mb-3 border border-gray-100"/>}
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-orange-300 rounded-xl cursor-pointer hover:bg-orange-50 transition-colors">
                        <span className="text-orange-500 text-sm font-semibold">📤 Kapak Görseli Yükle</span>
                        <span className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — max 5MB</span>
                        <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                          const file = e.target.files?.[0]
                          if(!file) return
                          if(file.size > 5*1024*1024) { toast3('❌ Dosya max 5MB olabilir'); return }
                          toast3('⏳ Yükleniyor...')
                          try {
                            const url = await uploadMedia(file, 'covers/' + bizId)
                            setShowcase(p=>({...p, cover_url: url}))
                            toast3('✅ Kapak görseli yüklendi!')
                          } catch(err) { toast3('❌ Yükleme hatası: ' + err.message) }
                        }}/>
                      </label>
                      {showcase?.cover_url && (
                        <button onClick={async()=>{ await deleteMedia(showcase.cover_url); setShowcase(p=>({...p,cover_url:''})) }}
                          className="mt-2 text-xs text-red-500 hover:text-red-700">🗑️ Kapak görselini kaldır</button>
                      )}
                    </div>
                    {/* Hakkımızda */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="font-bold text-sm mb-3">📝 Hakkımızda</div>
                      <textarea rows={5} placeholder="İşletmenizi tanıtın..." value={showcase?.bio||''} onChange={e=>setShowcase(p=>({...p,bio:e.target.value}))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 resize-none"/>
                    </div>
                    {/* Sosyal Medya */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="font-bold text-sm mb-3">📱 Sosyal Medya & Web</div>
                      <div className="space-y-3">
                        {[
                          {key:'instagram',label:'Instagram',ph:'https://instagram.com/...'},
                          {key:'facebook',label:'Facebook',ph:'https://facebook.com/...'},
                          {key:'website',label:'Website',ph:'https://...'},
                        ].map(({key,label,ph})=>(
                          <div key={key}>
                            <label className="text-xs font-bold block mb-1">{label}</label>
                            <input placeholder={ph} value={showcase?.[key]||''} onChange={e=>setShowcase(p=>({...p,[key]:e.target.value}))}
                              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Galeri */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="font-bold text-sm mb-3">🎨 Galeri (URL ile ekle)</div>
                      <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-orange-300 rounded-xl cursor-pointer hover:bg-orange-50 transition-colors mb-3">
                        <span className="text-orange-500 text-sm font-semibold">📤 Galeri Görseli Ekle</span>
                        <span className="text-xs text-gray-400">Max {planLimits?.max_gallery_images||5} görsel · 5MB</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={async e=>{
                          const files = Array.from(e.target.files||[])
                          const current = showcase?.gallery_urls?.length||0
                          const limit = planLimits?.max_gallery_images||5
                          if(current + files.length > limit) { toast3('❌ Plan limitiniz: ' + limit + ' görsel'); return }
                          toast3('⏳ Yükleniyor...')
                          try {
                            const urls = await Promise.all(files.map(f => uploadMedia(f, 'gallery/' + bizId)))
                            setShowcase(p=>({...p, gallery_urls:[...(p.gallery_urls||[]),...urls]}))
                            toast3('✅ ' + files.length + ' görsel yüklendi!')
                          } catch(err) { toast3('❌ Hata: ' + err.message) }
                        }}/>
                      </label>
                      {(showcase?.gallery_urls||[]).length>0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {(showcase?.gallery_urls||[]).map((url,i)=>(
                            <div key={i} className="relative group">
                              <img src={url} alt="" className="w-full h-20 object-cover rounded-lg border border-gray-100"/>
                              <button onClick={()=>setShowcase(p=>({...p,gallery_urls:p.gallery_urls.filter((_,j)=>j!==i)}))}
                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center">×</button>
                            </div>
                          ))}
                        </div>
                      ) : <div className="text-xs text-gray-400 text-center py-4">Henüz görsel eklenmedi</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* REKLAMLAR */}
              {view==='ads'&&(
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div><h1 className="text-lg sm:text-xl font-bold">Reklam & Kampanya</h1><p className="text-gray-500 text-sm">{ads.length} aktif reklam</p></div>
                  </div>
                  {/* Yeni reklam formu */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-5">
                    <div className="font-bold text-sm mb-4">➕ Yeni Reklam Oluştur</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold block mb-1">Başlık *</label>
                        <input placeholder="Örn: Kış Sezonu %30 İndirim!" value={adForm.title} onChange={e=>setAdForm(p=>({...p,title:e.target.value}))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold block mb-1">Açıklama</label>
                        <textarea rows={2} placeholder="Kampanya detayları..." value={adForm.description} onChange={e=>setAdForm(p=>({...p,description:e.target.value}))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 resize-none"/>
                      </div>
                      <div>
                        <label className="text-xs font-bold block mb-1">Reklam Görseli</label>
                        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-orange-300 rounded-xl cursor-pointer hover:bg-orange-50 transition-colors">
                          {adForm.image_url ? (
                            <img src={adForm.image_url} alt="" className="h-full w-full object-cover rounded-xl"/>
                          ) : (
                            <>
                              <span className="text-orange-500 text-sm font-semibold">📤 Görsel Yükle</span>
                              <span className="text-xs text-gray-400">JPG, PNG — max 5MB</span>
                            </>
                          )}
                          <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                            const file = e.target.files?.[0]
                            if(!file) return
                            toast3('⏳ Yükleniyor...')
                            try {
                              const url = await uploadMedia(file, 'ads/' + bizId)
                              setAdForm(p=>({...p, image_url: url}))
                              toast3('✅ Görsel yüklendi!')
                            } catch(err) { toast3('❌ ' + err.message) }
                          }}/>
                        </label>
                      </div>
                      <div>
                        <label className="text-xs font-bold block mb-1">İndirim Oranı (%)</label>
                        <input type="number" min="0" max="100" placeholder="0" value={adForm.discount_pct} onChange={e=>setAdForm(p=>({...p,discount_pct:+e.target.value}))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/>
                      </div>
                      <div>
                        <label className="text-xs font-bold block mb-1">Reklam Türü</label>
                        <select value={adForm.type} onChange={e=>setAdForm(p=>({...p,type:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400">
                          <option value="general">🌍 Genel (Herkese göster)</option>
                          <option value="regional">📍 Bölgesel (Yakınlara göster)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold block mb-1">Bitiş Tarihi</label>
                        <input type="date" min={new Date().toISOString().split('T')[0]} value={adForm.ends_at} onChange={e=>setAdForm(p=>({...p,ends_at:e.target.value}))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/>
                      </div>
                      {adForm.type==='regional' && (<>
                        <div>
                          <label className="text-xs font-bold block mb-1">Hedef Şehir</label>
                          <input placeholder="İstanbul" value={adForm.target_city} onChange={e=>setAdForm(p=>({...p,target_city:e.target.value}))}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/>
                        </div>
                        <div>
                          <label className="text-xs font-bold block mb-1">Hedef İlçe (opsiyonel)</label>
                          <input placeholder="Kadıköy" value={adForm.target_district} onChange={e=>setAdForm(p=>({...p,target_district:e.target.value}))}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/>
                        </div>
                        <div>
                          <label className="text-xs font-bold block mb-1">Yarıçap (km)</label>
                          <input type="number" min="1" max="100" value={adForm.target_radius_km} onChange={e=>setAdForm(p=>({...p,target_radius_km:+e.target.value}))}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/>
                        </div>
                      </>)}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button onClick={async()=>{
                        if(!adForm.title) { toast3('❌ Başlık zorunlu'); return }
                        // Aktif reklam limiti kontrolü
                        const activeAdsCount = ads.filter(a => ['active','pending','approved'].includes(a.status) && (!a.ends_at || new Date(a.ends_at) > new Date())).length
                        const limit = planLimits?.max_ads || 0
                        if (activeAdsCount >= limit) {
                          toast3('❌ Aktif reklam limitiniz dolu ('+limit+'). Planınızı yükseltin veya eski bir reklamı kapatın.')
                          return
                        }
                        setSavingAd(true)
                        const { data: newAd } = await supabase.from('ads').insert({
                          business_id: bizId,
                          title: adForm.title,
                          description: adForm.description,
                          image_url: adForm.image_url,
                          discount_pct: adForm.discount_pct,
                          type: adForm.type,
                          target_city: adForm.target_city||null,
                          target_district: adForm.target_district||null,
                          target_radius_km: adForm.target_radius_km,
                          target_lat: bizInfo?.lat||null,
                          target_lng: bizInfo?.lng||null,
                          ends_at: adForm.ends_at ? new Date(adForm.ends_at).toISOString() : new Date(Date.now()+30*24*60*60*1000).toISOString(),
                          status: 'pending',
                        }).select().maybeSingle()
                        if(newAd) setAds(p=>[newAd,...p])
                        setAdForm({title:'',description:'',image_url:'',discount_pct:0,type:'general',target_city:'',target_district:'',target_radius_km:20,ends_at:''})
                        setSavingAd(false)
                        toast3('✅ Reklam oluşturuldu! Admin onayından sonra yayına girer.')
                      }} disabled={savingAd} className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-bold rounded-xl">
                        {savingAd?'Gönderiliyor...':'📢 Reklam Oluştur'}
                      </button>
                    </div>
                  </div>
                  {/* Mevcut reklamlar */}
                  {ads.length===0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
                      <div className="text-4xl mb-3">📢</div>
                      <div className="font-bold mb-1">Henüz reklam yok</div>
                      <div className="text-sm text-gray-400">İlk reklamınızı oluşturun ve müşterilere ulaşın</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ads.map(ad=>(
                        <div key={ad.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-4">
                          {ad.image_url && <img src={ad.image_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-gray-100"/>}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="font-bold text-sm">{ad.title}</div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${ad.status==='active'?'bg-green-50 text-green-700 border-green-200':ad.status==='pending'?'bg-amber-50 text-amber-700 border-amber-200':'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                {ad.status==='active'?'● Aktif':ad.status==='pending'?'⏳ Onay Bekliyor':'⏸ Durduruldu'}
                              </span>
                            </div>
                            {ad.description && <div className="text-xs text-gray-500 mt-0.5 truncate">{ad.description}</div>}
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                              <span>{ad.type==='regional'?'📍 Bölgesel':'🌍 Genel'}</span>
                              {ad.discount_pct>0 && <span className="text-orange-500 font-bold">%{ad.discount_pct} indirim</span>}
                              {ad.target_city && <span>📍 {ad.target_city}{ad.target_district ? ' / ' + ad.target_district : ''}</span>}
                              <span>👁 {ad.impressions} gösterim</span>
                              <span>🖱 {ad.clicks} tıklama</span>
                              <span>Bitiş: {new Date(ad.ends_at).toLocaleDateString('tr-TR')}</span>
                            </div>
                          </div>
                          <button onClick={async()=>{
                            await supabase.from('ads').delete().eq('id',ad.id)
                            setAds(p=>p.filter(a=>a.id!==ad.id))
                            toast3('Reklam silindi')
                          }} className="text-red-400 hover:text-red-600 text-xs flex-shrink-0">🗑️</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* REKLAM PAKETLERİ */}
              {view==='adpkgs' && (
                <div>
                  <div className="mb-5">
                    <h1 className="text-xl font-bold">Reklam Paketleri</h1>
                    <p className="text-sm text-gray-500">Daha fazla görünürlük için paketlerden satın al — Admin onayı sonrası aktif olur</p>
                  </div>

                  {/* Mevcut satın almalarım */}
                  {myAdPurchases.length>0 && (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-5">
                      <div className="px-4 py-3 border-b border-gray-100 font-bold text-sm">📋 Satın Almalarım ({myAdPurchases.length})</div>
                      <div className="divide-y divide-gray-100">
                        {myAdPurchases.slice(0,5).map(p=>{
                          const statusMap = {
                            pending: {l:'⏳ Onay Bekliyor', cls:'bg-amber-50 text-amber-700 border-amber-200'},
                            approved: {l:'✓ Aktif', cls:'bg-green-50 text-green-700 border-green-200'},
                            rejected: {l:'✗ Reddedildi', cls:'bg-red-50 text-red-600 border-red-200'},
                            expired: {l:'Süresi Doldu', cls:'bg-gray-100 text-gray-600 border-gray-200'},
                          }
                          const s = statusMap[p.status] || statusMap.pending
                          return (
                            <div key={p.id} className="flex items-center gap-3 p-3 text-sm">
                              <div className="flex-1">
                                <div className="font-semibold">{p.package_name}</div>
                                <div className="text-xs text-gray-400">₺{p.price_at_purchase} · {new Date(p.created_at).toLocaleDateString('tr-TR')}{p.expires_at?` → ${new Date(p.expires_at).toLocaleDateString('tr-TR')}`:''}</div>
                              </div>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${s.cls}`}>{s.l}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Paket kartları */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {adPackages.map(pkg=>{
                      const hasPending = myAdPurchases.some(p => p.package_id===pkg.id && p.status==='pending')
                      return (
                        <div key={pkg.id} className={'border-2 rounded-2xl p-5 relative flex flex-col '+(pkg.is_popular?'border-orange-500 bg-orange-50':'border-gray-200 bg-white')+' shadow-sm'}>
                          {pkg.is_popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">⭐ Popüler</div>}
                          {pkg.badge && <div className="text-4xl mb-3">{pkg.badge}</div>}
                          <div className="font-extrabold text-xl mb-1">{pkg.name}</div>
                          {pkg.description && <div className="text-sm text-gray-500 mb-4">{pkg.description}</div>}
                          <div className="mb-4">
                            <div className="text-3xl font-extrabold text-orange-500">₺{pkg.price}</div>
                            <div className="text-xs text-gray-400">{pkg.duration_days} gün boyunca aktif</div>
                          </div>
                          <ul className="space-y-2 mb-5 flex-1">
                            {(pkg.features||[]).map((f,i)=>(
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">✓</span>{f}
                              </li>
                            ))}
                          </ul>
                          <button onClick={()=>buyAdPackage(pkg)} disabled={buyingPkg===pkg.id || hasPending}
                            className={'w-full py-3 rounded-xl text-sm font-bold transition-colors '+
                              (hasPending?'bg-amber-100 text-amber-700 cursor-not-allowed':
                               pkg.is_popular?'bg-orange-500 hover:bg-orange-600 text-white':'bg-slate-800 hover:bg-slate-700 text-white')+
                              ' disabled:opacity-60'}>
                            {buyingPkg===pkg.id ? 'İşleniyor...' : hasPending ? '⏳ Onay Bekleniyor' : '🛒 Satın Al'}
                          </button>
                        </div>
                      )
                    })}
                    {adPackages.length===0 && <div className="col-span-3 text-center py-16 text-gray-400">Aktif paket bulunmuyor — Admin paket eklediğinde burada görünecek</div>}
                  </div>
                </div>
              )}

              {/* KUPONLARIM */}
              {view==='coupons' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h1 className="text-xl font-bold">Kuponlarım</h1>
                      <p className="text-sm text-gray-500">İşletmene özel indirim kodları — müşteriler randevu alırken kullanır</p>
                    </div>
                    <button onClick={openCouponAdd} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Kupon Ekle</button>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50"><tr>{['Kod','İndirim','Kullanım','Geçerlilik','Durum','İşlem'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                      <tbody>
                        {coupons.map(c=>(
                          <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              <div className="font-mono font-bold uppercase">{c.code}</div>
                              {c.description && <div className="text-xs text-gray-500">{c.description}</div>}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {c.discount_pct>0 && <span className="bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded mr-1">%{c.discount_pct}</span>}
                              {c.discount_amount>0 && <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">₺{c.discount_amount}</span>}
                              {c.min_amount>0 && <div className="text-[10px] text-gray-400 mt-0.5">min ₺{c.min_amount}</div>}
                            </td>
                            <td className="px-4 py-3 text-sm"><b>{c.used_count}</b>{c.max_uses?' / '+c.max_uses:''}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{c.valid_until ? new Date(c.valid_until).toLocaleDateString('tr-TR') : 'Sınırsız'}</td>
                            <td className="px-4 py-3">
                              <span className={'text-xs font-bold px-2 py-0.5 rounded-full border '+
                                (c.status==='active'?'bg-green-50 text-green-700 border-green-200':c.status==='inactive'?'bg-gray-100 text-gray-600 border-gray-200':'bg-red-50 text-red-600 border-red-200')}>
                                {c.status==='active'?'Aktif':c.status==='inactive'?'Pasif':'Süresi Doldu'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={()=>openCouponEdit(c)} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1 rounded-lg font-semibold mr-1">✏️</button>
                              <button onClick={()=>deleteCoupon(c.id, c.code)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg font-semibold">🗑️</button>
                            </td>
                          </tr>
                        ))}
                        {coupons.length===0 && <tr><td colSpan="6" className="px-4 py-12 text-center text-gray-400">Henüz kuponun yok — <button onClick={openCouponAdd} className="text-orange-500 hover:underline">ilkini ekle</button></td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ÜYELİK PAKETLERİ — Tüm planları incele */}
              {view==='plans' && (
                <div>
                  <div className="mb-5">
                    <h1 className="text-xl font-bold">Üyelik Paketleri</h1>
                    <p className="text-sm text-gray-500">Mevcut planınız: <b className="text-orange-500 uppercase">{bizInfo?.plan||'free'}</b> — Daha fazla özellik için yükseltin</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {allPlans.map(p=>{
                      const labels = {free:'Ücretsiz', pro:'Pro', enterprise:'Enterprise'}
                      const label = labels[p.plan] || p.plan
                      const isCurrent = bizInfo?.plan===p.plan
                      const popular = p.plan==='pro'
                      const features = [
                        `${p.max_staff||0} personel`,
                        `${p.max_services||0} hizmet`,
                        `${p.max_monthly_appts||0} randevu/ay`,
                        `${p.max_gallery_images||0} galeri görseli`,
                        `${p.max_ads||0} reklam`,
                        p.has_analytics && '📊 Gelişmiş analitik',
                        p.has_sms && '📱 SMS bildirimi',
                        p.has_custom_domain && '🌐 Özel domain',
                      ].filter(Boolean)
                      return (
                        <div key={p.plan} className={'border-2 rounded-2xl p-5 relative flex flex-col shadow-sm '+(isCurrent?'border-orange-500 bg-orange-50':popular?'border-orange-300 bg-white':'border-gray-200 bg-white')}>
                          {popular && !isCurrent && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">Popüler</div>}
                          {isCurrent && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">Mevcut Plan</div>}
                          <div className="font-extrabold text-xl mb-1">{label}</div>
                          <div className="mb-4">
                            <span className="text-3xl font-extrabold text-gray-800">₺{p.price_monthly||0}</span>
                            <span className="text-sm text-gray-400 font-normal">/ay</span>
                          </div>
                          <ul className="space-y-2 mb-5 flex-1">
                            {features.map((f,i)=>(
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">✓</span>{f}
                              </li>
                            ))}
                          </ul>
                          {(() => {
                            const hasPending = myPlanRequests.some(r => r.requested_plan===p.plan && r.status==='pending')
                            if (isCurrent) return <div className="w-full py-2.5 text-center text-sm font-bold text-green-600 bg-green-50 rounded-xl border border-green-200">✓ Aktif Plan</div>
                            if (hasPending) return <div className="w-full py-2.5 text-center text-sm font-bold text-amber-700 bg-amber-50 rounded-xl border border-amber-200">⏳ Onay Bekleniyor</div>
                            return (
                              <button onClick={()=>buyPlan(p, label)} disabled={buyingPlan===p.plan}
                                className={'w-full py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-60 '+(p.plan==='pro'?'bg-orange-500 hover:bg-orange-600':p.plan==='enterprise'?'bg-slate-800 hover:bg-slate-700':'bg-gray-400 hover:bg-gray-500')}>
                                {buyingPlan===p.plan ? 'İşleniyor...' : p.plan==='free' ? 'Ücretsize Geç' : 'Bu Planı Seç'}
                              </button>
                            )
                          })()}
                        </div>
                      )
                    })}
                    {allPlans.length===0 && <div className="col-span-3 text-center py-16 text-gray-400">Plan listesi yükleniyor...</div>}
                  </div>
                </div>
              )}

              {/* RAPORLAR */}
              {view==='reports' && (
                <div className="relative">
                  <div className="flex items-center justify-between mb-5">
                    <h1 className="text-xl font-bold">Raporlar & Analitik</h1>
                    <div className="text-xs text-gray-400">{new Date().toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</div>
                  </div>
                  {!planLimits?.has_analytics && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center" style={{background:'rgba(255,255,255,0.85)',backdropFilter:'blur(6px)'}}>
                      <div className="bg-white border-2 border-orange-200 rounded-2xl p-8 shadow-xl text-center max-w-md mx-4">
                        <div className="text-5xl mb-3">🔒</div>
                        <div className="font-extrabold text-lg mb-2">Bu özellik <span className="text-orange-500">Pro / Enterprise</span> planında</div>
                        <div className="text-sm text-gray-500 mb-5">Detaylı raporlar, gelir analizi ve müşteri istatistiklerini görmek için planınızı yükseltin.</div>
                        <button onClick={()=>setView('plans')} className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors">
                          📦 Planları İncele →
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Gelir Özeti */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    {[
                      ['Toplam Gelir','₺'+(appts.filter(a=>a.status==='completed').reduce((s,a)=>s+(+a.price||0),0)).toLocaleString(),'text-green-600','💰'],
                      ['Bu Ay','₺'+(appts.filter(a=>a.status==='completed'&&a.appointment_date?.startsWith(new Date().toISOString().slice(0,7))).reduce((s,a)=>s+(+a.price||0),0)).toLocaleString(),'text-orange-500','📅'],
                      ['Tamamlanan',appts.filter(a=>a.status==='completed').length+' randevu','text-blue-600','✅'],
                      ['İptal Oranı',(appts.length?Math.round(appts.filter(a=>a.status==='cancelled').length/appts.length*100):0)+'%','text-red-500','❌'],
                    ].map(([l,v,c,icon])=>(
                      <div key={l} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="text-xl mb-2">{icon}</div>
                        <div className={`text-xl font-extrabold ${c} mb-0.5`}>{v}</div>
                        <div className="text-xs text-gray-500">{l}</div>
                      </div>
                    ))}
                  </div>
                  {/* Aylık Gelir Grafiği */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-5">
                    <div className="font-bold text-sm mb-4">Son 6 Ay Gelir</div>
                    <div className="flex items-end gap-2 h-32">
                      {Array.from({length:6},(_,i)=>{
                        const d = new Date(); d.setMonth(d.getMonth()-5+i)
                        const key = d.toISOString().slice(0,7)
                        const label = d.toLocaleDateString('tr-TR',{month:'short'})
                        const rev = appts.filter(a=>a.status==='completed'&&a.appointment_date?.startsWith(key)).reduce((s,a)=>s+(+a.price||0),0)
                        return {key,label,rev}
                      }).map(({label,rev},i,arr)=>{
                        const max = Math.max(...arr.map(a=>a.rev),1)
                        const h = Math.round((rev/max)*100)
                        return (
                          <div key={label} className="flex-1 flex flex-col items-center gap-1">
                            <div className="text-xs font-bold text-gray-600">{rev>0?'₺'+(rev/1000).toFixed(1)+'k':''}</div>
                            <div className="w-full rounded-t-lg transition-all" style={{height:h+'%',minHeight:'4px',background:i===5?'#f97316':'#fed7aa'}}/>
                            <div className="text-xs text-gray-400">{label}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {/* Hizmet bazlı analiz */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="font-bold text-sm mb-3">Hizmet Analizi</div>
                      {services.map(s=>{
                        const cnt = appts.filter(a=>a.service_id===s.id&&a.status==='completed').length
                        const rev = cnt * (s.price||0)
                        return cnt > 0 ? (
                          <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                            <div className="flex-1">
                              <div className="text-sm font-semibold">{s.name}</div>
                              <div className="text-xs text-gray-400">{cnt} randevu</div>
                            </div>
                            <div className="text-sm font-bold text-orange-500">₺{rev.toLocaleString()}</div>
                          </div>
                        ) : null
                      })}
                      {services.filter(s=>appts.some(a=>a.service_id===s.id&&a.status==='completed')).length===0&&<div className="text-xs text-gray-400">Henüz tamamlanan randevu yok</div>}
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="font-bold text-sm mb-3">Personel Performansı</div>
                      {staff.map(s=>{
                        const cnt = appts.filter(a=>a.staff_id===s.id&&a.status==='completed').length
                        return (
                          <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600">{s.name[0]}</div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold">{s.name}</div>
                              <div className="text-xs text-gray-400">{cnt} randevu tamamlandı</div>
                            </div>
                            <div className="text-xs font-bold text-amber-500">★ {s.rating||0}</div>
                          </div>
                        )
                      })}
                      {staff.length===0&&<div className="text-xs text-gray-400">Personel bulunamadı</div>}
                    </div>
                  </div>
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
                      <div><label className="text-xs font-bold block mb-1">E-posta</label>
                        <input type="email" value={bizForm.email||''} onChange={e=>setBizForm(p=>({...p,email:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
                      <div><label className="text-xs font-bold block mb-1">Açıklama</label>
                        <textarea rows={3} value={bizForm.description||''} onChange={e=>setBizForm(p=>({...p,description:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 resize-none"/></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold block mb-1">Telefon</label>
                          <input value={bizForm.phone||''} onChange={e=>setBizForm(p=>({...p,phone:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
                        <div><label className="text-xs font-bold block mb-1">Başlangıç Fiyatı (₺)</label>
                          <input type="number" value={bizForm.price_from||0} onChange={e=>setBizForm(p=>({...p,price_from:+e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" /></div>
                      </div>
                      {/* Konum */}
                      <div>
                        <label className="text-xs font-bold block mb-2">📍 Konum <span className="text-gray-400 font-normal">(adresi yazıp "Konumu Bul" butonuna tıklayın)</span></label>
                        <button type="button" onClick={()=>setShowLocPicker(p=>!p)}
                          className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                          🗺️ {showLocPicker ? 'Haritayı Kapat' : 'Haritadan Konum Seç'}
                        </button>
                        {showLocPicker && <LocPickerInline lat={bizForm.lat} lng={bizForm.lng} onSelect={(lat,lng)=>{setBizForm(p=>({...p,lat,lng}));toast3('✅ Konum seçildi!')}} />}
                        {bizForm.lat && bizForm.lng && (
                          <div className="mt-1.5 text-xs text-green-700 font-semibold flex items-center gap-1.5 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                            ✅ Konum belirlendi · {parseFloat(bizForm.lat).toFixed(4)}, {parseFloat(bizForm.lng).toFixed(4)}
                            <button type="button" onClick={()=>setBizForm(p=>({...p,lat:'',lng:''}))} className="ml-auto text-red-400">✕</button>
                          </div>
                        )}
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
                                    <input type="time" value={wh.str} onChange={e=>setWorkingHours(p=>({...p,[d]:{...wh,str:e.target.value}}))} className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" />
                                    <span className="text-gray-400">-</span>
                                    <input type="time" value={wh.end} onChange={e=>setWorkingHours(p=>({...p,[d]:{...wh,end:e.target.value}}))} className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" />
                                  </>
                                )}
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer w-20 justify-end">
                                <input type="checkbox" checked={wh.off} onChange={e=>setWorkingHours(p=>({...p,[d]:{...wh,off:e.target.checked}}))} className="w-4 h-4 accent-orange-500" />
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
