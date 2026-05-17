'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, notifyWaitlist, getActiveUser, logout } from '@/lib/supabase'
import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/app/components/MapView'), { ssr: false })
import BusinessCard from '@/app/components/customer/BusinessCard'
import AdBanner from '@/app/components/customer/AdBanner'
import BusinessDetailModal from '@/app/components/customer/BusinessDetailModal'
import BookingModal from '@/app/components/customer/BookingModal'
import QRModal from '@/app/components/customer/QRModal'
import ProfileTab from '@/app/components/customer/ProfileTab'
import AppointmentsTab from '@/app/components/customer/AppointmentsTab'
const MinimalTheme = dynamic(() => import('@/app/customer/themes/minimal'), { ssr: false })
const LuxuryTheme = dynamic(() => import('@/app/customer/themes/luxury'), { ssr: false })
const SoftTheme = dynamic(() => import('@/app/customer/themes/soft'), { ssr: false })
const BoldTheme = dynamic(() => import('@/app/customer/themes/bold'), { ssr: false })
const PulseTheme = dynamic(() => import('@/app/customer/themes/pulse'), { ssr: false })
const SpotTheme = dynamic(() => import('@/app/customer/themes/spot'), { ssr: false })
const AtlasTheme = dynamic(() => import('@/app/customer/themes/atlas'), { ssr: false })

function distKm(lat1,lng1,lat2,lng2){const R=6371,dL=(lat2-lat1)*Math.PI/180,dN=(lng2-lng1)*Math.PI/180,a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}

const COLORS = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444']

function Spin() { return <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin flex-shrink-0" /> }
function Bdg({ s, pastDue }) {
  // Tarihi geçmiş ama firma 'completed' işaretlememiş — "tamamlandı" gibi davranma
  if (pastDue && (s === 'confirmed' || s === 'pending')) {
    return <span className="inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">⏳ Tamamlandı bekleniyor</span>
  }
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
  const [sortBy, setSortBy] = useState('rating') // rating | price_asc | price_desc | distance
  const [minRating, setMinRating] = useState(0)
  const [maxPrice, setMaxPrice] = useState(9999)
  const [showFilters, setShowFilters] = useState(false)
  const [userLoc, setUserLoc] = useState(null)
  const [locStatus, setLocStatus] = useState('idle') // idle | loading | granted | denied
  const [appointments, setAppointments] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profLoading, setProfLoading] = useState(false)
  const [bizLoading, setBizLoading] = useState(true)
  const [activeAds, setActiveAds] = useState([])
  const [paymentEnabled, setPaymentEnabled] = useState(false)
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false)
  const [activeAdDiscount, setActiveAdDiscount] = useState(0)
  const [uiLang, setUiLang] = useState('tr')
  const [theme, setTheme] = useState({primary:'#f97316',primaryDark:'#ea580c',navBg:'#1e293b',heroFrom:'#1e293b',heroTo:'#334155',accent:'#ff6b35',name:'orange'})

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('lang')||'tr' : 'tr'
    setUiLang(saved)
  }, []) // aktif kampanya indirimi %
  const [toast, setToast] = useState('')
  // İşletme detay modal
  const [detailBiz, setDetailBiz] = useState(null)
  const [bizServices, setBizServices] = useState([])
  const [bizStaff, setBizStaff] = useState([])
  const [bizReviews, setBizReviews] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  // Randevu al modal
  const [bookModal, setBookModal] = useState(false)
  const [bookForm, setBookForm] = useState({ service:'', staff:'', date:'', time:'' })
  const [booking, setBooking] = useState(false)
  const [payStep, setPayStep] = useState(false)
  const [payCard, setPayCard] = useState({ name:'', number:'', expire:'', cvv:'' })
  // Slot doluluk — staff bazlı süre kontrolü
  const [bookedRanges, setBookedRanges] = useState([]) // [{staff_id, start, end}]
  const [slotsLoading, setSlotsLoading] = useState(false)
  // Profil düzenleme
  const [editProfile, setEditProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  // Yorum sistemi
  const [reviewModal, setReviewModal] = useState(null)
  const [qrModal, setQrModal] = useState(null)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)

  const toast3 = (m) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  // Auth — misafir modu: kullanıcı yoksa null kalır, sadece randevu işleminde /login'e yönlendir
  useEffect(() => {
    (async () => {
      const u = await getActiveUser()
      if (u) setUser(u)
    })()
  }, [])

  const requireAuth = (action='işlem') => {
    if (user) return true
    toast3?.(action+' için giriş yap')
    router.push('/login')
    return false
  }

  // Konum — sayfa açılınca iste
  useEffect(() => {
    if (typeof window === 'undefined') return
    setLocStatus('loading')
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocStatus('granted')
      },
      () => setLocStatus('denied'),
      { timeout: 8000, enableHighAccuracy: false }
    )
  }, [])

  const requestPushPermission = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    try {
      const { requestNotificationPermission, subscribePush } = await import('@/lib/push')
      const perm = await requestNotificationPermission()
      if (perm !== 'granted') { toast3('🔕 Bildirim izni reddedildi'); return }
      const sub = await subscribePush(user?.id)
      toast3(sub ? '🔔 Bildirimler aktif!' : '🔔 Yerel bildirimler aktif (push key yok)')
    } catch(e) { toast3('❌ '+e.message) }
  }

  const requestLocation = (autoSort=true) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocStatus('denied')
      toast3('❌ Tarayıcınız konum desteklemiyor (veya güvenli bağlantı gerekli)')
      return
    }
    setLocStatus('loading')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLoc(loc)
        setLocStatus('granted')
        if(autoSort) setSortBy('distance')
      },
      () => { setLocStatus('denied'); toast3('❌ Konum izni reddedildi. Tarayıcı ayarlarından izin verin.') },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Tema realtime — admin değiştirince anında uygulansın
  useEffect(() => {
    const ch = supabase
      .channel('platform-settings-rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'platform_settings' }, (payload) => {
        const row = payload.new || payload.old
        if (row?.key === 'theme' && payload.new?.value) {
          setTheme(p => ({ ...p, name: payload.new.value }))
        }
        if (row?.key === 'payment_enabled' && payload.new?.value !== undefined) {
          setPaymentEnabled(payload.new.value === 'true')
        }
        if (row?.key === 'loyalty_enabled' && payload.new?.value !== undefined) {
          setLoyaltyEnabled(payload.new.value === 'true')
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // Müşteriye yönelik bildirimler — yer açıldı vs.
  useEffect(() => {
    if (!user?.id) return
    const ch = supabase
      .channel('notifs-customer-'+user.id)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications', filter:`profile_id=eq.${user.id}` }, (payload) => {
        const n = payload.new
        if (!n) return
        toast3((n.title || '🔔') + ' ' + (n.message || ''))
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try { new Notification(n.title || 'Bildirim', { body: n.message || '' }) } catch {}
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.id])

  // İşletmeler
  useEffect(() => {
    supabase.from('businesses').select('*').eq('status','active').order('rating',{ascending:false})
      .then(async ({ data }) => {
        setBusinesses(data||[])
        setLoading(false)
        setBizLoading(false)
        try {
          const [{ data: ads }, { data: settings }] = await Promise.all([
            supabase.from('ads').select('*, businesses(name,emoji,category,city,price_from,rating)').eq('status','active').gte('ends_at', new Date().toISOString()),
            supabase.from('platform_settings').select('*'),
          ])
          setActiveAds(ads||[])
          const paySet = (settings||[]).find(s=>s.key==='payment_enabled')
          if(paySet) setPaymentEnabled(paySet.value==='true')
          const loySet = (settings||[]).find(s=>s.key==='loyalty_enabled')
          if(loySet) setLoyaltyEnabled(loySet.value==='true')
          const themeSet = (settings||[]).find(s=>s.key==='theme')
          if (themeSet?.value) setTheme(p => ({ ...p, name: themeSet.value }))
        } catch(e) { console.log('load err:', e) }
      })
  }, [])

  // Randevular — kullanıcı yüklenince çek (canReview, badge count, vs. için keşfette de gerekli)
  useEffect(() => {
    if (!user) return
    if (tab === 'appts') setLoading(true)
    supabase.from('appointments')
      .select('id, business_id, appointment_date, appointment_time, status, price, qr_token, businesses(name,emoji,address,city,lat,lng), services(name,duration_min), staff(name)')
      .eq('profile_id', user.id)
      .order('appointment_date', { ascending: false })
      .then(({ data }) => { setAppointments(data||[]); setLoading(false) })
  }, [tab, user])

  // Profil
  useEffect(() => {
    if (tab !== 'profile' || !user) return
    setProfLoading(true)
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        setProfile(data)
        setProfileForm({ full_name: data?.full_name || '', phone: data?.phone || '' })
        setProfLoading(false)
      }).catch(()=>setProfLoading(false))
  }, [tab, user])

  // Profil kaydet
  async function saveProfile() {
    if (!profileForm.full_name.trim()) { toast3('❌ Ad Soyad zorunlu'); return }
    setSavingProfile(true)
    const { error } = await supabase.from('profiles').update({
      full_name: profileForm.full_name,
      phone: profileForm.phone,
    }).eq('id', user.id)
    if (error) { toast3('❌ ' + error.message); setSavingProfile(false); return }
    setProfile(p => ({ ...p, full_name: profileForm.full_name, phone: profileForm.phone }))
    const updatedUser = { ...user, name: profileForm.full_name }
    localStorage.setItem('randevu_user', JSON.stringify(updatedUser))
    setEditProfile(false)
    setSavingProfile(false)
    toast3('✅ Profil güncellendi')
  }

  // Yorum gönder
  async function submitReview() {
    if (!reviewModal) return
    setSubmittingReview(true)
    try {
      const { error } = await supabase.from('reviews').insert({
        business_id: reviewModal.business_id,
        profile_id: user.id,
        appointment_id: reviewModal.id,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      })
      if (error) throw error
      // Rating + review_count DB trigger ile güncelleniyor (update_business_rating)
      setReviewModal(null)
      setReviewForm({ rating: 5, comment: '' })
      toast3('✅ Yorumunuz gönderildi, teşekkürler!')
    } catch (e) {
      toast3('❌ ' + e.message)
    } finally {
      setSubmittingReview(false)
    }
  }

  // İşletme detay aç
  async function openDetail(biz, discount=0) {
    setDetailBiz(biz)
    setActiveAdDiscount(discount)
    setDetailLoading(true)
    setBookedRanges([])
    setBizReviews([])
    try {
      const [{ data: svcs }, { data: stff }, { data: revs }] = await Promise.all([
        supabase.from('services').select('*').eq('business_id', biz.id).eq('status','active'),
        supabase.from('staff').select('*').eq('business_id', biz.id),
        supabase.from('reviews').select('*, profiles(full_name)').eq('business_id', biz.id).order('created_at', { ascending: false }).limit(20),
      ])
      setBizServices(svcs||[])
      setBizStaff(stff||[])
      setBizReviews(revs||[])
    } catch(e) {
      toast3('❌ Detay yüklenemedi: '+(e?.message||''))
    } finally {
      setDetailLoading(false)
    }
  }

  // Dolu aralıkları çek — süre + staff bazlı çakışma kontrolü
  async function loadTakenSlots(bizId, date) {
    if (!bizId || !date) { setBookedRanges([]); return }
    setSlotsLoading(true)
    const { data } = await supabase
      .from('appointments')
      .select('appointment_time, staff_id, services(duration_min)')
      .eq('business_id', bizId)
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed'])
    const ranges = (data || []).map(a => {
      const [h, m] = String(a.appointment_time).split(':').map(Number)
      const start = h * 60 + m
      const dur = a.services?.duration_min || 60
      return { staff_id: a.staff_id, start, end: start + dur }
    })
    setBookedRanges(ranges)
    setSlotsLoading(false)
  }

  // Bir slot başlama saati + süre, secili personel için doluyla çakışıyor mu?
  function isSlotConflict(timeStr, durationMin, staffId) {
    if (!timeStr || !durationMin) return false
    const [h, m] = timeStr.split(':').map(Number)
    const start = h * 60 + m
    const end = start + durationMin
    const relevant = staffId
      ? bookedRanges.filter(r => r.staff_id === staffId)
      : bookedRanges.filter(r => !r.staff_id)
    return relevant.some(r => start < r.end && end > r.start)
  }

  // Tema-bağımsız randevu kaydetme — BookingModal onBook callback olarak kullanılır
  async function saveBooking(form, payCard) {
    if (!form.service||!form.date||!form.time){ toast3('❌ Hizmet, tarih ve saat seçin'); return }
    setBooking(true)
    try {
      // İşletmenin plan limiti — aylık randevu kontrolü
      const bizPlanKey = detailBiz.plan || 'free'
      const { data: planRow } = await supabase.from('plan_limits').select('max_monthly_appts, loyalty_points_per_appt').eq('plan', bizPlanKey).maybeSingle()
      if (planRow?.max_monthly_appts) {
        const d = new Date(form.date)
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
        const monthEnd = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split('T')[0]
        const { count: monthCount } = await supabase.from('appointments')
          .select('id', { count:'exact', head:true })
          .eq('business_id', detailBiz.id)
          .gte('appointment_date', monthStart).lte('appointment_date', monthEnd)
          .not('status','in','("cancelled")')
        if ((monthCount||0) >= planRow.max_monthly_appts) {
          toast3('❌ Bu firma bu ayın randevu kotasını doldurdu ('+planRow.max_monthly_appts+'). Önümüzdeki ay deneyin.')
          setBooking(false); return
        }
      }

      const svc = bizServices.find(s=>s.id===form.service)
      const finalPrice = form.total ?? svc?.price ?? 0
      const { data: newAppt, error: apptErr } = await supabase.from('appointments').insert({
        business_id: detailBiz.id, profile_id: user.id,
        service_id: form.service, staff_id: form.staff||null,
        appointment_date: form.date, appointment_time: form.time,
        status: 'pending', price: finalPrice,
      }).select().maybeSingle()
      if (apptErr) {
        if (apptErr.code === '23505') { toast3('❌ Bu saat az önce dolduruldu — başka saat seçin'); setBooking(false); return }
        throw apptErr
      }
      if (newAppt) {
        await supabase.from('payments').insert({
          appointment_id: newAppt.id, profile_id: user.id,
          business_id: detailBiz.id, amount: finalPrice,
          status: 'completed', method: 'card',
          card_last4: payCard?.number ? payCard.number.replace(/\s/g,'').slice(-4) : null,
        })
      }
      try {
        // Önce kullanılan puanları düş
        const redeemed = form.pointsUsed || 0
        const earned = planRow?.loyalty_points_per_appt ?? 10
        if (redeemed > 0) {
          await supabase.from('loyalty_transactions').insert({profile_id:user.id,business_id:detailBiz.id,points:-redeemed,type:'redeem',description:'Randevu indirimi'})
        }
        await supabase.from('loyalty_transactions').insert({profile_id:user.id,business_id:detailBiz.id,points:earned,type:'earn',description:detailBiz.name+' randevusu'})
        const newBalance = Math.max(0, (user.loyalty_points||0) - redeemed + earned)
        await supabase.from('profiles').update({loyalty_points:newBalance}).eq('id',user.id)
        setUser(p=>({...p,loyalty_points:newBalance}))
      } catch(e) {}
      // Kupon tüketimi — booking başarılıysa redeem
      if (form.couponId) {
        try { await supabase.rpc('redeem_coupon', { p_coupon_id: form.couponId }) } catch(e) {}
      }
      setBookModal(false); setDetailBiz(null)
      if (newAppt) {
        fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
          body: JSON.stringify({ type: 'new_appointment', appointment_id: newAppt.id })
        }).catch(()=>{})
      }
      toast3(paymentEnabled ? '✅ Randevu talebiniz alındı! Firma onayı bekleniyor.' : '✅ Randevunuz oluşturuldu! Firma 1 saat içinde onaylamazsa otomatik onaylanacak.')
    } catch(e) { toast3('❌ '+e.message) }
    finally { setBooking(false) }
  }

  // Randevu al — eski default JSX için
  async function bookAppt() {
    if (!bookForm.service || !bookForm.date || !bookForm.time) { toast3('❌ Hizmet, tarih ve saat seçin'); return }
    const svcCheck = bizServices.find(s => s.id === bookForm.service)
    if (isSlotConflict(bookForm.time, svcCheck?.duration_min || 60, bookForm.staff)) {
      toast3('❌ Bu saat dolu — başka saat veya personel seçin'); return
    }
    // Müşterinin aynı saatte başka randevusu var mı?
    const { data: existing } = await supabase.from('appointments')
      .select('id').eq('profile_id', user.id)
      .eq('appointment_date', bookForm.date)
      .eq('appointment_time', bookForm.time)
      .not('status','in','("cancelled")')
      .maybeSingle()
    if (existing) { toast3('❌ Bu tarih ve saatte zaten aktif bir randevunuz var!'); return }
    setBooking(true)
    try {
      const svc = bizServices.find(s => s.id === bookForm.service)
      const { data: newAppt, error: apptErr } = await supabase.from('appointments').insert({
        business_id: detailBiz.id,
        profile_id: user.id,
        service_id: bookForm.service,
        staff_id: bookForm.staff || null,
        appointment_date: bookForm.date,
        appointment_time: bookForm.time,
        status: 'pending',
        price: svc?.price || 0,
      }).select().maybeSingle()
      if (apptErr) {
        if (apptErr.code === '23505') { toast3('❌ Bu saat az önce dolduruldu — başka saat seçin'); setBooking(false); return }
        throw apptErr
      }

      // Ödeme kaydı oluştur
      if (newAppt) {
        const last4 = payCard.number ? payCard.number.replace(/\s/g,'').slice(-4) : null
        await supabase.from('payments').insert({
          appointment_id: newAppt.id,
          profile_id: user.id,
          business_id: detailBiz.id,
          amount: svc?.price || 0,
          status: 'completed',
          method: 'card',
          card_last4: last4,
        })
      }
      // Email gönder (arka planda)
      if (user.email) {
        const dateStr = new Date(bookForm.date).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})
        fetch('/api/email',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({type:'new_booking',to:user.email,data:{
            businessName:detailBiz.name,customerName:user.name,
            serviceName:svc?.name||'Hizmet',date:dateStr,time:bookForm.time,price:svc?.price||0
          }})}).catch(()=>{})
      }
      // Sadakat puanı — randevu alındığında 10 puan
      try {
        await supabase.from('loyalty_transactions').insert({
          profile_id: user.id,
          business_id: detailBiz.id,
          points: 10,
          type: 'earn',
          description: detailBiz.name + ' randevusu'
        })
        await supabase.from('profiles').update({
          loyalty_points: (user.loyalty_points||0) + 10
        }).eq('id', user.id)
        setUser(p=>({...p, loyalty_points:(p.loyalty_points||0)+10}))
      } catch(e) { console.log('Puan hatasi:', e) }
      setBookModal(false)
      setDetailBiz(null)
      setBookForm({ service:'', staff:'', date:'', time:'' })
      setPayStep(false)
      setPayCard({ name:'', number:'', expire:'', cvv:'' })
      setBookedRanges([])
      toast3('✅ Randevu talebiniz alındı! Onay bekleniyor.')
    } catch (e) {
      toast3('❌ ' + e.message)
    } finally {
      setBooking(false)
    }
  }

  async function cancelAppt(id) {
    const appt = appointments.find(a => a.id === id)
    await supabase.from('appointments').update({ status:'cancelled' }).eq('id', id)
    setAppointments(p => p.map(a => a.id===id ? {...a,status:'cancelled'} : a))
    toast3('Randevu iptal edildi')
    if (appt) {
      // Firma sahibine ve müşteriye notification — edge function
      fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
        body: JSON.stringify({ type: 'cancelled', appointment_id: id })
      }).catch(()=>{})
      notifyWaitlist(appt.business_id, appt.appointment_date)
    }
  }

  const generateSlots = () => {
    if (!bookForm.date || !detailBiz) return []
    const day = new Date(bookForm.date).getDay()
    const defaultWH = {
      "1": { str: "09:00", end: "18:00", off: false },
      "2": { str: "09:00", end: "18:00", off: false },
      "3": { str: "09:00", end: "18:00", off: false },
      "4": { str: "09:00", end: "18:00", off: false },
      "5": { str: "09:00", end: "18:00", off: false },
      "6": { str: "10:00", end: "15:00", off: false },
      "0": { str: "09:00", end: "18:00", off: true },
    }
    const wh = (detailBiz.working_hours || defaultWH)[day]
    if (!wh || wh.off) return null
    
    const [startH, startM] = (wh.str||"09:00").split(':').map(Number)
    const [endH, endM] = (wh.end||"18:00").split(':').map(Number)
    let currentMin = startH * 60 + startM
    const endTotalMin = endH * 60 + endM
    
    const svc = bizServices.find(s => s.id === bookForm.service)
    const duration = svc ? svc.duration_min : 60
    
    const slots = []
    while (currentMin + duration <= endTotalMin) {
      const h = Math.floor(currentMin / 60)
      const m = currentMin % 60
      const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
      slots.push(timeStr)
      currentMin += duration
    }
    return slots
  }
  const availableSlots = generateSlots()

  const filteredBiz = businesses
    .filter(b => {
      const matchCat = !catFilter || b.category === catFilter
      const matchQ = !searchQ || b.name.toLowerCase().includes(searchQ.toLowerCase()) || b.city.toLowerCase().includes(searchQ.toLowerCase()) || (b.tags||[]).some(t => t.toLowerCase().includes(searchQ.toLowerCase()))
      const matchRating = minRating === 0 || (b.rating||0) >= minRating
      const matchPrice = maxPrice >= 9999 || (b.price_from||0) <= maxPrice
      return matchCat && matchQ && matchRating && matchPrice
    })
    .map(b => {
      const dist = (userLoc && b.lat && b.lng) ? distKm(userLoc.lat, userLoc.lng, parseFloat(b.lat), parseFloat(b.lng)) : (userLoc ? 9999 : null)
      return { ...b, dist }
    })
    .sort((a, b) => {
      if (sortBy === 'distance') return (a.dist ?? 9999) - (b.dist ?? 9999)
      if (sortBy === 'price_asc') return (a.price_from||0) - (b.price_from||0)
      if (sortBy === 'price_desc') return (b.price_from||0) - (a.price_from||0)
      if (sortBy === 'reviews') return (b.review_count||0) - (a.review_count||0)
      return (b.rating||0) - (a.rating||0)
    })
  const cats = [...new Set(businesses.map(b => b.category))]
  // Yaklaşan = aktif statü VE randevu zamanı gelecekte; geçmiş = diğer her şey
  const apptDateTime = (a) => new Date(`${a.appointment_date}T${String(a.appointment_time||'23:59').slice(0,5)}`)
  const nowMs = Date.now()
  const upcomingAppts = appointments.filter(a => ['pending','confirmed'].includes(a.status) && apptDateTime(a).getTime() > nowMs)
  const pastAppts = appointments.filter(a => !(['pending','confirmed'].includes(a.status) && apptDateTime(a).getTime() > nowMs))
  const pct = profile ? Math.min(100, Math.round((profile.loyalty_points||0)/3000*100)) : 0

  const themeKey = theme?.name || 'default'
  const detailModalProps = {
    biz: detailBiz,
    bizIdx: businesses.findIndex(b=>b.id===detailBiz?.id),
    services: bizServices,
    staff: bizStaff,
    reviews: bizReviews,
    canReview: !!appointments.find(a => a.business_id===detailBiz?.id && a.status==='completed'),
    onReview: () => {
      const a = appointments.find(a => a.business_id===detailBiz?.id && a.status==='completed')
      if (a) { setReviewModal(a); setReviewForm({ rating: 5, comment: '' }); setDetailBiz(null) }
    },
    loading: detailLoading,
    onClose: () => setDetailBiz(null),
    onBook: () => { if (requireAuth('Randevu almak')) setBookModal(true) },
    uiLang,
  }
  // Misafir koruması: setBookModal(true) çağrılırsa user yoksa /login'e yönlendir
  const guardedSetBookModal = (open) => {
    if (open === true && !user) {
      requireAuth('Randevu almak')
      return
    }
    setBookModal(open)
  }
  const themeProps = {
    user, businesses, appointments, activeAds, profile,
    tab, setTab, openDetail, detailBiz, bizServices, bizStaff,
    detailLoading, bookModal, setBookModal: guardedSetBookModal, setDetailBiz,
    activeAdDiscount, paymentEnabled, loyaltyEnabled, toast3, userLoc, locStatus, requestLocation,
    searchQ, setSearchQ, catFilter, setCatFilter, sortBy, setSortBy,
    cancelAppt, setReviewModal, setReviewForm, qrModal, setQrModal,
    upcomingAppts, pastAppts, saveBooking,
    bizReviews, detailModalProps,
    // Profil tab shared component props
    profLoading, profileForm, setProfileForm, editProfile, setEditProfile,
    savingProfile, saveProfile, setProfile, requestPushPermission,
    uiLang, setUiLang,
  }

  // Misafir modu: user null olabilir — sayfayı yine render et

  const ReviewOverlay = reviewModal && (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && setReviewModal(null)}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <div>
            <div className="font-bold">Değerlendirme Yaz</div>
            <div className="text-xs text-gray-500">{reviewModal.businesses?.name}</div>
          </div>
          <button onClick={() => setReviewModal(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold block mb-2">Puan</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setReviewForm(p => ({ ...p, rating: star }))}
                  className={`text-3xl transition-transform hover:scale-110 ${star <= reviewForm.rating ? 'text-amber-400' : 'text-gray-200'}`}>
                  ★
                </button>
              ))}
              <span className="ml-2 text-sm font-bold text-gray-600 self-center">{reviewForm.rating}/5</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold block mb-2">Yorumunuz (opsiyonel)</label>
            <textarea rows={3} placeholder="Deneyiminizi paylaşın..." value={reviewForm.comment}
              onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 resize-none" />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={() => setReviewModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">İptal</button>
          <button onClick={submitReview} disabled={submittingReview}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold">
            {submittingReview ? 'Gönderiliyor...' : '⭐ Gönder'}
          </button>
        </div>
      </div>
    </div>
  )

  const ThemeOverlays = <>{ReviewOverlay}<QRModal qrModal={qrModal} setQrModal={setQrModal} /></>

  if (themeKey === 'minimal') return <>{ThemeOverlays}<MinimalTheme {...themeProps} /></>
  if (themeKey === 'luxury') return <>{ThemeOverlays}<LuxuryTheme {...themeProps} /></>
  if (themeKey === 'soft') return <>{ThemeOverlays}<SoftTheme {...themeProps} /></>
  if (themeKey === 'bold') return <>{ThemeOverlays}<BoldTheme {...themeProps} /></>
  if (themeKey === 'pulse') return <>{ThemeOverlays}<PulseTheme {...themeProps} /></>
  if (themeKey === 'spot') return <>{ThemeOverlays}<SpotTheme {...themeProps} /></>
  if (themeKey === 'atlas') return <>{ThemeOverlays}<AtlasTheme {...themeProps} /></>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {ReviewOverlay}
      <QRModal qrModal={qrModal} setQrModal={setQrModal} />
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-xl animate-in slide-in-from-bottom-2">{toast}</div>}

      {/* PROFİL DÜZENLEME MODAL */}
      {editProfile && profile && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && setEditProfile(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div className="font-bold">Profili Düzenle</div>
              <button onClick={() => setEditProfile(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1.5">Ad Soyad *</label>
                <input value={profileForm.full_name} onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1.5">Telefon</label>
                <input placeholder="+90 555 000 00 00" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1.5">E-posta</label>
                <input value={profile.email} disabled className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-1">E-posta değiştirilemez</p>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setEditProfile(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={saveProfile} disabled={savingProfile}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold">
                {savingProfile ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* İşletme Detay Modal */}
      <BusinessDetailModal {...detailModalProps} variant="default" />

      {/* Randevu Al Modal */}
      <BookingModal
        biz={bookModal && detailBiz ? detailBiz : null}
        services={bizServices}
        staff={bizStaff}
        discount={activeAdDiscount}
        paymentEnabled={paymentEnabled} loyaltyEnabled={loyaltyEnabled}
        variant="default"
        uiLang={uiLang}
        userId={user?.id}
        userPoints={user?.loyalty_points||0}
        onClose={()=>{setBookModal(false)}}
        onBook={saveBooking}
        toast3={toast3}
      />

      {/* NAV */}
      <nav className="h-14 flex items-center px-4 sm:px-6 gap-2 flex-shrink-0" style={{background:theme.navBg}}>
        <div className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-sm">📅</div>
          <span className="text-white font-bold text-sm hidden sm:block">RandevuApp</span>
        </div>
        {[['home','🏠','Keşfet'],['map','🗺️','Harita'],['appts','📅','Randevularım'],['profile','👤','Profilim']]
          .filter(([k]) => user || (k!=='profile' && k!=='appts'))
          .map(([k,ic,l]) => (
          <button key={k} onClick={() => { if(k!=='home' && k!=='map') setLoading(true); setTab(k) }}
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-sm font-semibold transition-all relative ${tab===k?'bg-white/20 text-white':'text-white/50 hover:text-white hover:bg-white/10'}`}>
            <span className="sm:hidden">{ic}</span>
            <span className="hidden sm:inline">{l}</span>
            {k==='appts' && upcomingAppts.length>0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold">{upcomingAppts.length}</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white border-2 border-white/20">
                {user.name?.[0]||'?'}
              </div>
              <button onClick={logout}
                className="text-white/40 hover:text-white/70 text-xs transition-colors">Çıkış</button>
            </>
          ) : (
            <button onClick={() => router.push('/login')}
              className="text-white text-xs font-bold bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-lg transition-colors">Giriş</button>
          )}
        </div>
      </nav>

      {/* HOME */}
      {tab === 'home' && (
        <>
          <div className="py-8 sm:py-12 px-4 sm:px-6 relative overflow-hidden" style={{background:"linear-gradient(135deg, "+theme.heroFrom+" 0%, "+theme.heroTo+" 100%)"}}>
            <div className="absolute right-0 top-0 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="max-w-4xl mx-auto relative z-10">
              <div className="text-white/60 text-sm mb-1">{user ? `Merhaba, ${user.name?.split(' ')[0]} 👋` : 'Hoş geldin 👋'}</div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight mb-4">Randevunuzu Alın</h1>
              <div className="flex bg-white rounded-xl overflow-hidden shadow-xl w-full sm:max-w-lg">
                <input className="flex-1 px-4 py-3 text-sm outline-none" placeholder="İşletme veya hizmet ara..."
                  value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                <button className="px-5 py-3 text-white text-sm font-bold" style={{background:theme.primary}}>Ara</button>
              </div>
              {/* Konum Butonu */}
              {locStatus === 'idle' && (
                <button onClick={requestLocation} className="mt-3 flex items-center gap-2 bg-white/5 border border-white/15 rounded-xl px-3 py-2 hover:bg-white/10 transition-colors">
                  <span className="text-lg">📍</span>
                  <span className="text-xs text-white/70">Yakınındaki işletmeleri görmek için konumunu paylaş</span>
                </button>
              )}
              {locStatus === 'loading' && (
                <div className="mt-3 flex items-center gap-2 bg-white/5 border border-white/15 rounded-xl px-3 py-2">
                  <span className="text-xs text-white/60">🔄 Konum alınıyor...</span>
                </div>
              )}
              {locStatus === 'denied' && (
                <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-400/30 rounded-xl px-3 py-2">
                  <span className="text-xs text-red-300 flex-1">⚠️ Konum izni reddedildi</span>
                  <button onClick={requestLocation} className="text-xs bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg font-semibold">Tekrar Dene</button>
                </div>
              )}
              {locStatus === 'granted' && userLoc && (
                <div className="mt-3 flex items-center gap-2 bg-green-500/10 border border-green-400/30 rounded-xl px-3 py-2">
                  <span className="text-xs text-green-300">✅ Konum aktif — yakınındaki işletmeler gösteriliyor</span>
                </div>
              )}
              <div className="flex gap-2 mt-4 flex-wrap items-center">
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
              {/* SORT — kategori altında belirgin */}
              <div className="flex gap-2 mt-3 flex-wrap items-center">
                <button onClick={() => { if(userLoc){setSortBy('distance');return} if(locStatus==='denied'){toast3('❌ Konum izni reddedildi. Tarayıcı ayarlarından izin verin.');return} requestLocation(true) }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all flex items-center gap-1.5 ${sortBy==='distance'?'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30':'bg-white/10 border-orange-400 text-orange-400 hover:bg-orange-500/10'}`}>
                  📍 Bana en yakın {locStatus==='loading'&&'…'}
                </button>
                <button onClick={()=>setSortBy('rating')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${sortBy==='rating'?'bg-white text-slate-900 border-white':'bg-white/10 border-white/15 text-white/75 hover:bg-white/20'}`}>
                  ⭐ En İyiler
                </button>
                <button onClick={()=>setSortBy('price_asc')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${sortBy==='price_asc'?'bg-white text-slate-900 border-white':'bg-white/10 border-white/15 text-white/75 hover:bg-white/20'}`}>
                  ₺ Ucuzdan
                </button>
                <button onClick={() => setShowFilters(p=>!p)}
                  className={`ml-auto px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${showFilters?'bg-white text-orange-600 border-white':'bg-white/10 border-white/15 text-white/75 hover:bg-white/20'}`}>
                  ⚙️ Tümü {(minRating>0||maxPrice<9999)?<span className="w-1.5 h-1.5 rounded-full bg-orange-500" />:null}
                </button>
              </div>
              {showFilters && (
                <div className="mt-3 bg-white/[0.08] border border-white/15 rounded-2xl p-4 flex flex-wrap gap-4">
                  <div>
                    <div className="text-white/50 text-xs font-semibold mb-2">Sıralama</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {[['rating','⭐ Puan'],['distance','📍 En Yakın'],['price_asc','₺ Ucuz→Pahalı'],['price_desc','₺ Pahalı→Ucuz'],['reviews','💬 Yorum']].map(([v,l])=>(
                        <button key={v} onClick={()=>{ if(v==='distance'){ if(userLoc){setSortBy('distance');return} if(locStatus==='denied'){toast3('❌ Konum izni reddedildi. Tarayıcı ayarlarından izin verin.');return} requestLocation(true); return } setSortBy(v) }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${sortBy===v?'bg-orange-500 text-white':'bg-white/10 text-white/70 hover:bg-white/20'}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/50 text-xs font-semibold mb-2">Min Puan: {minRating===0?'Hepsi':'★ '+minRating+'+'}</div>
                    <div className="flex gap-1.5">
                      {[0,3,4,4.5].map(r=>(
                        <button key={r} onClick={()=>setMinRating(r)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${minRating===r?'bg-orange-500 text-white':'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                          {r===0?'Hepsi':'★ '+r+'+'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/50 text-xs font-semibold mb-2">Max Fiyat: {maxPrice>=9999?'Hepsi':'₺'+maxPrice}</div>
                    <div className="flex gap-1.5">
                      {[[9999,'Hepsi'],[1000,'₺1000'],[500,'₺500'],[300,'₺300']].map(([v,l])=>(
                        <button key={v} onClick={()=>setMaxPrice(v)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${maxPrice===v?'bg-orange-500 text-white':'bg-white/10 text-white/70 hover:bg-white/20'}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={()=>{setMinRating(0);setMaxPrice(9999);setSortBy('rating')}}
                    className="text-xs text-white/40 hover:text-white/70 underline self-end">Sıfırla</button>
                </div>
              )}
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-6 sm:pt-8 pb-32 sm:pb-12 w-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">
                {catFilter ? `${catFilter} İşletmeleri` : '📍 Yakınındaki İşletmeler'}
                <span className="ml-2 text-sm font-normal text-gray-400">({filteredBiz.length})</span>
              </h2>
            </div>
            {/* REKLAM BANNER'LARI */}
            <AdBanner ads={activeAds} userLoc={userLoc} businesses={businesses} onBizDetail={openDetail} variant="default" uiLang={uiLang}/>
            {bizLoading ? (
              <div className="flex items-center justify-center gap-3 text-gray-400 py-16"><Spin /> Yükleniyor...</div>
            ) : filteredBiz.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">🔍</div>
                <div className="font-semibold">Sonuç bulunamadı</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBiz.map((b,i) => (
                  <BusinessCard key={b.id} b={b} i={i} onDetail={openDetail} onMap={()=>setTab('map')}/>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* HARİTA */}
      {tab === 'map' && (
        <MapView
          businesses={businesses}
          onBook={async (biz) => {
            setTab('home')
            await openDetail(biz)
            if (requireAuth('Randevu almak')) setBookModal(true)
          }}
        />
      )}

      {/* RANDEVULARIM */}
      {tab === 'appts' && !user && (
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-3">🔒</div>
          <div className="text-xl font-bold mb-2">Giriş yap</div>
          <div className="text-sm text-gray-500 mb-6">Randevularını görmek için hesabına giriş yap.</div>
          <button onClick={() => router.push('/login')} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white">Giriş Yap</button>
        </div>
      )}
      {tab === 'appts' && user && (
        loading
          ? <div className="flex items-center justify-center gap-3 text-gray-400 py-16"><Spin /> Yükleniyor...</div>
          : <AppointmentsTab
              upcomingAppts={upcomingAppts}
              pastAppts={pastAppts}
              cancelAppt={cancelAppt}
              setReviewModal={setReviewModal}
              setReviewForm={setReviewForm}
              setQrModal={setQrModal}
              setTab={setTab}
              openDetail={openDetail}
              businesses={businesses}
              uiLang={uiLang}
              variant="default"
            />
      )}

      {/* PROFİL — paylaşımlı bileşen */}
      {tab === 'profile' && !user && (
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-3">👤</div>
          <div className="text-xl font-bold mb-2">Giriş yap</div>
          <div className="text-sm text-gray-500 mb-6">Profilini görmek için hesabına giriş yap.</div>
          <button onClick={() => router.push('/login')} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white">Giriş Yap</button>
        </div>
      )}
      {tab === 'profile' && user && <ProfileTab {...themeProps} variant="default" />}
    </div>
  )
}
