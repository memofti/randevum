'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, notifyWaitlist, getActiveUser } from '@/lib/supabase'
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
  // Reschedule
  const [rescheduleModal, setRescheduleModal] = useState(null) // appt obj
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '' })
  const [rescheduleTaken, setRescheduleTaken] = useState([])
  const [rescheduling, setRescheduling] = useState(false)

  const toast3 = (m) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  // Auth
  useEffect(() => {
    (async () => {
      const u = await getActiveUser()
      if (!u) { router.push('/login'); return }
      setUser(u)
    })()
  }, [router])

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
    setLocStatus('loading')
    navigator.geolocation?.getCurrentPosition(
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

  // Randevular
  useEffect(() => {
    if (tab !== 'appts' || !user) return
    setLoading(true)
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

  async function openReschedule(appt) {
    setRescheduleForm({ date: '', time: '' })
    setRescheduleTaken([])
    setRescheduleModal(appt)
  }
  async function loadRescheduleSlots(date) {
    if (!date || !rescheduleModal) return
    const { data } = await supabase.from('appointments').select('appointment_time')
      .eq('business_id', rescheduleModal.business_id)
      .eq('appointment_date', date)
      .in('status',['pending','confirmed'])
      .neq('id', rescheduleModal.id)
    setRescheduleTaken((data||[]).map(a => String(a.appointment_time).slice(0,5)))
  }
  async function confirmReschedule() {
    if (!rescheduleModal || !rescheduleForm.date || !rescheduleForm.time) return
    setRescheduling(true)
    try {
      const { error } = await supabase.from('appointments')
        .update({ appointment_date: rescheduleForm.date, appointment_time: rescheduleForm.time, status: 'pending' })
        .eq('id', rescheduleModal.id)
      if (error) {
        if (error.code === '23505') { toast3('❌ Bu saat dolu — başka saat seçin'); setRescheduling(false); return }
        throw error
      }
      const oldDate = rescheduleModal.appointment_date
      setAppointments(p => p.map(a => a.id===rescheduleModal.id
        ? {...a, appointment_date: rescheduleForm.date, appointment_time: rescheduleForm.time, status: 'pending'}
        : a))
      // Eski tarihte bekleyenlere haber ver
      notifyWaitlist(rescheduleModal.business_id, oldDate)
      setRescheduleModal(null)
      toast3('✅ Randevu taşındı')
    } catch(e) { toast3('❌ '+e.message) }
    finally { setRescheduling(false) }
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
  const themeProps = {
    user, businesses, appointments, activeAds, profile,
    tab, setTab, openDetail, detailBiz, bizServices, bizStaff,
    detailLoading, bookModal, setBookModal, setDetailBiz,
    activeAdDiscount, paymentEnabled, loyaltyEnabled, toast3, userLoc, locStatus, requestLocation,
    searchQ, setSearchQ, catFilter, setCatFilter, sortBy, setSortBy,
    cancelAppt, rescheduleAppt: openReschedule, setReviewModal, setReviewForm, qrModal, setQrModal,
    upcomingAppts, pastAppts, saveBooking,
    // Profil tab shared component props
    profLoading, profileForm, setProfileForm, editProfile, setEditProfile,
    savingProfile, saveProfile, setProfile, requestPushPermission,
    uiLang, setUiLang,
  }

  if (!user) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/20 border-t-orange-500 rounded-full animate-spin" /></div>

  const RescheduleOverlay = rescheduleModal && (
    <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setRescheduleModal(null)}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <div className="min-w-0">
            <div className="font-bold text-base">📆 Randevu Taşı</div>
            <div className="text-xs text-gray-500 truncate">{rescheduleModal.businesses?.name||'İşletme'} — {rescheduleModal.services?.name||''}</div>
          </div>
          <button onClick={()=>setRescheduleModal(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2.5">
            Mevcut: <b>{new Date(rescheduleModal.appointment_date).toLocaleDateString('tr-TR')}</b> {String(rescheduleModal.appointment_time).slice(0,5)}
          </div>
          <div><label className="text-xs font-bold block mb-1">Yeni Tarih *</label>
            <input type="date" min={new Date().toISOString().split('T')[0]}
              value={rescheduleForm.date}
              onChange={e=>{ setRescheduleForm(p=>({...p,date:e.target.value,time:''})); loadRescheduleSlots(e.target.value) }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/></div>
          <div><label className="text-xs font-bold block mb-1">Yeni Saat *</label>
            <input type="time" value={rescheduleForm.time}
              onChange={e=>setRescheduleForm(p=>({...p,time:e.target.value}))}
              disabled={!rescheduleForm.date}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 disabled:bg-gray-50"/>
            {rescheduleForm.time && rescheduleTaken.includes(rescheduleForm.time) && (
              <div className="text-xs text-red-600 mt-1">⚠️ Bu saat dolu</div>
            )}
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={()=>setRescheduleModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">İptal</button>
          <button onClick={confirmReschedule}
            disabled={rescheduling || !rescheduleForm.date || !rescheduleForm.time || rescheduleTaken.includes(rescheduleForm.time)}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold">
            {rescheduling?'Taşınıyor...':'✓ Taşı'}
          </button>
        </div>
      </div>
    </div>
  )

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

  const ThemeOverlays = <>{RescheduleOverlay}{ReviewOverlay}<QRModal qrModal={qrModal} setQrModal={setQrModal} /></>

  if (themeKey === 'minimal') return <>{ThemeOverlays}<MinimalTheme {...themeProps} /></>
  if (themeKey === 'luxury') return <>{ThemeOverlays}<LuxuryTheme {...themeProps} /></>
  if (themeKey === 'soft') return <>{ThemeOverlays}<SoftTheme {...themeProps} /></>
  if (themeKey === 'bold') return <>{ThemeOverlays}<BoldTheme {...themeProps} /></>
  if (themeKey === 'pulse') return <>{ThemeOverlays}<PulseTheme {...themeProps} /></>
  if (themeKey === 'spot') return <>{ThemeOverlays}<SpotTheme {...themeProps} /></>
  if (themeKey === 'atlas') return <>{ThemeOverlays}<AtlasTheme {...themeProps} /></>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {RescheduleOverlay}
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
      <BusinessDetailModal
        biz={detailBiz}
        bizIdx={businesses.findIndex(b=>b.id===detailBiz?.id)}
        services={bizServices}
        staff={bizStaff}
        reviews={bizReviews}
        canReview={!!appointments.find(a => a.business_id===detailBiz?.id && a.status==='completed')}
        onReview={() => {
          const a = appointments.find(a => a.business_id===detailBiz?.id && a.status==='completed')
          if (a) { setReviewModal(a); setReviewForm({ rating: 5, comment: '' }) }
        }}
        loading={detailLoading}
        onClose={()=>setDetailBiz(null)}
        onBook={()=>setBookModal(true)}
        variant="default"
        uiLang={uiLang}
      />
      {false && detailBiz && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => e.target===e.currentTarget && setDetailBiz(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header — Kapak Görseli */}
            <div className="relative h-48 flex items-center justify-center text-6xl flex-shrink-0 overflow-hidden" style={{ background: `${COLORS[businesses.findIndex(b=>b.id===detailBiz.id)%COLORS.length]}18` }}>
              {detailBiz.cover_url
                ? <img src={detailBiz.cover_url} alt={detailBiz.name} className="w-full h-full object-cover"/>
                : <span className="text-7xl">{detailBiz.emoji||'🏢'}</span>
              }
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"/>
              <button onClick={() => setDetailBiz(null)} className="absolute top-4 right-4 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm z-10">✕</button>
              <div className="absolute top-4 left-4 z-10"><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-500 text-white">● Müsait</span></div>
              {detailBiz.cover_url && <div className="absolute bottom-3 left-4 z-10 text-3xl">{detailBiz.emoji||'🏢'}</div>}
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
              {detailBiz.bio && <p className="text-gray-600 text-sm mb-3 leading-relaxed">{detailBiz.bio}</p>}
              {detailBiz.description && <p className="text-gray-500 text-sm mb-4 leading-relaxed">{detailBiz.description}</p>}
              {/* Sosyal Medya */}
              {(detailBiz.instagram||detailBiz.facebook||detailBiz.website) && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {detailBiz.instagram && <a href={detailBiz.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-pink-200 text-pink-600 hover:bg-pink-50">📸 Instagram</a>}
                  {detailBiz.facebook && <a href={detailBiz.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50">👍 Facebook</a>}
                  {detailBiz.website && <a href={detailBiz.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50">🌐 Website</a>}
                </div>
              )}
              <div className="flex gap-3 mb-5 text-sm">
                {detailBiz.phone && <a href={`tel:${detailBiz.phone}`} className="flex items-center gap-1.5 text-orange-500 font-semibold"><span>📞</span>{detailBiz.phone}</a>}
                {detailBiz.address && <span className="text-gray-500 flex items-center gap-1.5"><span>📍</span>{detailBiz.address}</span>}
              </div>

              {detailLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-400"><Spin /> Yükleniyor...</div>
              ) : (
                <>
                  {/* Galeri */}
                  {(detailBiz.gallery_urls||[]).length > 0 && (
                    <div className="mb-5">
                      <div className="font-bold text-sm mb-3">📸 Galeri</div>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {(detailBiz.gallery_urls||[]).map((url,i)=>(
                          <img key={i} src={url} alt="" className="flex-none w-28 h-28 object-cover rounded-xl border border-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={()=>window.open(url,'_blank')}/>
                        ))}
                      </div>
                    </div>
                  )}
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
      {false && bookModal && detailBiz && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={e => e.target===e.currentTarget && (setBookModal(false), setPayStep(false))}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <div className="font-bold">{payStep ? '💳 Ödeme' : 'Randevu Al'}</div>
                <div className="text-xs text-gray-500">{detailBiz.name}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">1</div>
                  <div className="h-px w-4 bg-gray-200" />
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${payStep?'bg-orange-500 text-white':'bg-gray-200 text-gray-500'}`}>2</div>
                </div>
                <button onClick={() => { setBookModal(false); setPayStep(false) }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg">✕</button>
              </div>
            </div>
            {!payStep ? (
              <>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="text-xs font-bold block mb-1">Hizmet *</label>
                    <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"
                      value={bookForm.service} onChange={e => setBookForm(p=>({...p,service:e.target.value,time:''}))}>
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
                        value={bookForm.date} onChange={e => {
                          const newDate = e.target.value
                          setBookForm(p=>({...p, date:newDate, time:''}))
                          loadTakenSlots(detailBiz?.id, newDate)
                        }} />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">
                        Saat {slotsLoading && <span className="text-gray-400 font-normal text-xs">(kontrol...)</span>}
                      </label>
                      {availableSlots === null ? (
                        <div className="w-full px-3 py-2.5 border border-red-200 bg-red-50 text-red-600 rounded-xl text-sm font-semibold flex items-center justify-center">İşletme Kapalı</div>
                      ) : (
                        <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"
                          value={bookForm.time} onChange={e => setBookForm(p=>({...p,time:e.target.value}))}
                          disabled={!bookForm.date || slotsLoading || !bookForm.service}>
                          <option value="">{bookForm.service ? 'Saat seçin' : 'Önce hizmet seçin'}</option>
                          {(() => {
                            const svcSel = bizServices.find(s => s.id === bookForm.service)
                            const dur = svcSel?.duration_min || 60
                            return availableSlots.map(t => {
                              const isTaken = isSlotConflict(t, dur, bookForm.staff)
                              return <option key={t} value={t} disabled={isTaken}>{t}{isTaken ? ' — Dolu' : ''}</option>
                            })
                          })()}
                        </select>
                      )}
                      {bookForm.date && bookedRanges.length > 0 && !slotsLoading && availableSlots !== null && (() => {
                        const svcSel = bizServices.find(s => s.id === bookForm.service)
                        const dur = svcSel?.duration_min || 60
                        const blocked = availableSlots.filter(t => isSlotConflict(t, dur, bookForm.staff)).length
                        return blocked > 0 ? <p className="text-xs text-amber-600 mt-1">⚠️ {blocked} saat dolu</p> : null
                      })()}
                    </div>
                  </div>
                </div>
                <div className="px-5 pb-5 flex gap-2">
                  <button onClick={() => setBookModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">İptal</button>
                  <button onClick={() => {
                    if (!bookForm.service || !bookForm.date) { toast3('❌ Hizmet ve tarih seçin'); return }
                    if (!bookForm.time) { toast3('❌ Lütfen saat seçin'); return }
                    const svcChk = bizServices.find(s => s.id === bookForm.service)
                    if (isSlotConflict(bookForm.time, svcChk?.duration_min || 60, bookForm.staff)) { toast3('❌ Bu saat dolu — başka saat veya personel seçin'); return }
                    if(!paymentEnabled) { bookAppt(); return }
                    setPayStep(true)
                  }} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors">
                    {paymentEnabled ? 'Devam → Ödeme' : 'Randevu Al'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Ödeme adımı */}
                <div className="p-5">
                  {/* Özet kart */}
                  {(() => {
                    const svc = bizServices.find(s=>s.id===bookForm.service)
                    return (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                        <div className="text-xs font-bold text-orange-700 mb-2">ÖZET</div>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between"><span className="text-gray-600">Hizmet</span><span className="font-semibold">{svc?.name}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Tarih</span><span className="font-semibold">{new Date(bookForm.date).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Saat</span><span className="font-semibold">{bookForm.time}</span></div>
                          <div className="flex justify-between border-t border-orange-200 pt-1.5 mt-1.5"><span className="font-bold">Toplam</span><span className="font-bold text-orange-600 text-base">₺{svc?.price||0}</span></div>
                        </div>
                      </div>
                    )
                  })()}
                  {/* Mock kart formu */}
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-xs font-bold block mb-1">Kart Üzerindeki İsim</label>
                      <input placeholder="AD SOYAD" value={payCard.name} onChange={e=>setPayCard(p=>({...p,name:e.target.value}))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 uppercase tracking-wide" />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Kart Numarası</label>
                      <input placeholder="1234 5678 9012 3456" maxLength={19} value={payCard.number}
                        onChange={e=>setPayCard(p=>({...p,number:e.target.value.replace(/\D/g,'').replace(/(\d{4})/g,'$1 ').trim()}))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 font-mono tracking-widest" />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-xs font-bold block mb-1">Son Kullanma</label>
                        <input placeholder="MM/YY" maxLength={5} value={payCard.expire}
                          onChange={e=>setPayCard(p=>({...p,expire:e.target.value.replace(/\D/g,'').replace(/(\d{2})/,'$1/').slice(0,5)}))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 font-mono" />
                      </div>
                      <div>
                        <label className="text-xs font-bold block mb-1">CVV</label>
                        <input placeholder="123" maxLength={3} type="password" value={payCard.cvv}
                          onChange={e=>setPayCard(p=>({...p,cvv:e.target.value.replace(/\D/g,'').slice(0,3)}))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 font-mono" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
                    <span>🔒</span> Güvenli ödeme · 256-bit SSL korumalı
                  </div>
                </div>
                <div className="px-5 pb-5 flex gap-2">
                  <button onClick={() => setPayStep(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">← Geri</button>
                  <button onClick={bookAppt} disabled={booking}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors">
                    {booking ? 'Kaydediliyor...' : '💳 Ödemeyi Tamamla'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="h-14 flex items-center px-4 sm:px-6 gap-2 flex-shrink-0" style={{background:theme.navBg}}>
        <div className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-sm">📅</div>
          <span className="text-white font-bold text-sm hidden sm:block">RandevuApp</span>
        </div>
        {[['home','🏠','Keşfet'],['map','🗺️','Harita'],['appts','📅','Randevularım'],['profile','👤','Profilim']].map(([k,ic,l]) => (
          <button key={k} onClick={() => { if(k!=='home' && k!=='map') setLoading(true); setTab(k) }}
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-sm font-semibold transition-all relative ${tab===k?'bg-white/20 text-white':'text-white/50 hover:text-white hover:bg-white/10'}`}>
            <span className="sm:hidden">{ic}</span>
            <span className="hidden sm:inline">{l}</span>
            {k==='appts' && upcomingAppts.length>0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold">{upcomingAppts.length}</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white border-2 border-white/20">
            {user.name?.[0]||'?'}
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); localStorage.removeItem('randevu_user'); router.push('/login') }}
            className="text-white/40 hover:text-white/70 text-xs transition-colors">Çıkış</button>
        </div>
      </nav>

      {/* HOME */}
      {tab === 'home' && (
        <>
          <div className="py-8 sm:py-12 px-4 sm:px-6 relative overflow-hidden" style={{background:"linear-gradient(135deg, "+theme.heroFrom+" 0%, "+theme.heroTo+" 100%)"}}>
            <div className="absolute right-0 top-0 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="max-w-4xl mx-auto relative z-10">
              <div className="text-white/60 text-sm mb-1">Merhaba, {user.name?.split(' ')[0]} 👋</div>
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
                <button onClick={() => { if(!userLoc) { requestLocation(); return } setSortBy('distance') }}
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
                        <button key={v} onClick={()=>{ if(v==='distance' && !userLoc) { requestLocation(); return } setSortBy(v) }}
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
            {false && activeAds.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sponsorlu</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {activeAds.filter(ad => {
                    if(ad.type === 'general') return true
                    if(ad.type === 'regional' && userLoc && ad.target_lat && ad.target_lng) {
                      const d = distKm(userLoc.lat, userLoc.lng, parseFloat(ad.target_lat), parseFloat(ad.target_lng))
                      return d <= (ad.target_radius_km || 20)
                    }
                    return ad.type === 'general'
                  }).map(ad => (
                    <div key={ad.id} onClick={async () => {
                      await supabase.from('ads').update({clicks: (ad.clicks||0)+1}).eq('id',ad.id)
                      const biz = businesses.find(b => b.id === ad.business_id)
                      if(biz) setDetailBiz(biz)
                    }} className="flex-none w-64 bg-white rounded-2xl border border-orange-200 shadow-sm cursor-pointer hover:shadow-md transition-all overflow-hidden relative">
                      <div className="absolute top-2 left-2 z-10 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Reklam</div>
                      {ad.image_url && <img src={ad.image_url} alt={ad.title} className="w-full h-32 object-cover"/>}
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{ad.businesses?.emoji||'🏢'}</span>
                          <span className="text-xs text-gray-500 font-semibold">{ad.businesses?.name}</span>
                          {ad.type==='regional' && <span className="ml-auto text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">📍 Yakında</span>}
                        </div>
                        <div className="font-bold text-sm mb-1">{ad.title}</div>
                        {ad.description && <div className="text-xs text-gray-500 line-clamp-2">{ad.description}</div>}
                        {ad.discount_pct > 0 && <div className="mt-2 inline-block bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">%{ad.discount_pct} İndirim</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                {false && filteredBiz.map((b,i) => (
                  <div key={b.id} onClick={() => openDetail(b)}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                    <div className="h-28 flex items-center justify-center text-5xl relative overflow-hidden" style={{ background:`${COLORS[i%COLORS.length]}15` }}>
                      {b.cover_url
                        ? <img src={b.cover_url} alt={b.name} className="w-full h-full object-cover"/>
                        : <span>{b.emoji||'🏢'}</span>
                      }
                      {b.cover_url && <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"/>}
                      <div className="absolute top-2 right-2 z-10"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500 text-white">● Müsait</span></div>
                      {b.cover_url && <div className="absolute bottom-2 left-2 z-10 text-xl">{b.emoji||'🏢'}</div>}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                        <span className="bg-white/90 text-sm font-bold px-3 py-1.5 rounded-full shadow-md">Detay Gör →</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="font-bold text-sm mb-0.5 truncate">{b.name}</div>
                      <div className="text-gray-500 text-xs mb-2">{b.category} · {b.city}</div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-amber-500 text-xs font-bold">★ {b.rating}</span>
                        <span className="text-gray-400 text-xs">({b.review_count} yorum)</span>
                        <span className="text-gray-300 text-xs">·</span>
                        <span className="text-gray-400 text-xs">{b.monthly_appointments} randevu/ay</span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="text-sm text-gray-500">den <b className="text-gray-900">₺{b.price_from}</b></div>
                        <div className="flex items-center gap-1.5">
                          {(b.address||b.city) && (
                            <button onClick={e=>{e.stopPropagation();setTab('map')}}
                              className="text-xs text-gray-400 hover:text-orange-500 px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-colors font-medium">
                              🗺️ Harita
                            </button>
                          )}
                          <button onClick={e => { e.stopPropagation(); openDetail(b) }}
                            className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                            Randevu Al
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
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
            setBookModal(true)
          }}
        />
      )}

      {/* RANDEVULARIM */}
      {tab === 'appts' && (
        <div className="max-w-3xl mx-auto w-full px-3 sm:px-6 py-5 sm:py-8">
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
                        <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-14 rounded-full flex-shrink-0" style={{background:sc}} />
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{background:sc+'22'}}>{a.businesses?.emoji||'🏢'}</div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm">{a.businesses?.name||'—'}</div>
                              <div className="text-gray-500 text-xs">{a.services?.name||'—'} · {a.staff?.name||'Herhangi personel'}</div>
                              <div className="text-xs font-semibold text-gray-700 mt-1">
                                📅 {new Date(a.appointment_date).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})} · ⏰ {String(a.appointment_time).slice(0,5)}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <Bdg s={a.status} />
                              <div className="text-xs font-bold text-gray-700">₺{a.price||0}</div>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                            <button onClick={()=>{
                              if(window.confirm('Randevuyu iptal etmek istediğinize emin misiniz?')) cancelAppt(a.id)
                            }} className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-semibold">✗ İptal</button>
                            {(() => {
                              const b = a.businesses
                              const q = b?.lat && b?.lng
                                ? `${b.lat},${b.lng}`
                                : encodeURIComponent([b?.name, b?.address, b?.city].filter(Boolean).join(' '))
                              return (
                                <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noopener noreferrer"
                                  className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 font-semibold text-center">🗺️ Yol</a>
                              )
                            })()}
                            {a.qr_token && <button onClick={()=>setQrModal(a)} className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 font-semibold">📲 QR</button>}
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
                      <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-gray-50">{a.businesses?.emoji||'🏢'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{a.businesses?.name||'—'}</div>
                          <div className="text-gray-400 text-xs">{a.services?.name||'—'} · {new Date(a.appointment_date).toLocaleDateString('tr-TR')}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <Bdg s={a.status} pastDue={apptDateTime(a).getTime() <= nowMs} />
                          {a.status === 'completed' && (
                            <div className="flex gap-1.5 flex-wrap">
                              <button onClick={() => { setReviewModal(a); setReviewForm({ rating: 5, comment: '' }) }}
                                className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 font-semibold">
                                ⭐ Değerlendir
                              </button>
                              <a href={'/fatura/'+a.id} target="_blank" rel="noopener noreferrer"
                                className="text-xs px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 font-semibold">
                                🧾 Fatura
                              </a>
                            </div>
                          )}
                        </div>
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

      {/* PROFİL — paylaşımlı bileşen */}
      {tab === 'profile' && <ProfileTab {...themeProps} variant="default" />}
    </div>
  )
}
