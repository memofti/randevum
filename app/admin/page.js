'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getActiveUser } from '@/lib/supabase'
import { t as i18n, getLang, setLang } from '@/lib/i18n'

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
const NAV_KEYS=[['dashboard','⊞','nav_dashboard'],['firms','🏢','nav_firms'],['categories','🗂️','nav_categories'],['requests','📬','nav_requests'],['ads','📢','nav_ads'],['adpkgs','🎁','nav_adpkgs'],['coupons','🎟️','nav_coupons'],['plans','📦','nav_plans'],['revenue','💰','nav_revenue'],['subscriptions','💳','nav_subscriptions'],['users','👥','nav_users']]

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
  const [firmDetail, setFirmDetail] = useState(null) // firma objesi veya null
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [firmSort, setFirmSort] = useState('newest') // newest | name | plan | status | appts
  const [firmPage, setFirmPage] = useState(1)
  const [firmPlanF, setFirmPlanF] = useState('') // '' | free | pro | enterprise
  const [revFilter, setRevFilter] = useState('') // '' | thisMonth | last3 | last12
  const [revSort, setRevSort] = useState('revenue') // revenue | name | commission | count
  const [couponOwnerF, setCouponOwnerF] = useState('') // '' | admin | business
  const [subsSearch, setSubsSearch] = useState('')
  const [adsStatusF, setAdsStatusF] = useState('')   // '' | pending | active | paused | expired
  const [adsTypeF, setAdsTypeF]     = useState('')   // '' | general | regional
  const [adsSearch, setAdsSearch]   = useState('')
  const [adsSort, setAdsSort]       = useState('newest') // newest | endsoon | clicks | impressions | firm
  const [adsPage, setAdsPage]       = useState(1)
  const [allAds, setAllAds] = useState([])
  const [paymentEnabled, setPaymentEnabled] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false)
  const [savingLoyalty, setSavingLoyalty] = useState(false)
  const [commissionRate, setCommissionRate] = useState(10)
  const [activeTheme, setActiveTheme] = useState('orange')
  const [statusF, setStatusF] = useState('')
  const [form, setForm] = useState({name:'',category:'',city:'',owner_name:'',email:'',phone:'',price_from:0,plan:'free'})
  const [planLimits, setPlanLimits] = useState([])
  const [planSaving, setPlanSaving] = useState('')
  const [adPackages, setAdPackages] = useState([])
  const [adPurchases, setAdPurchases] = useState([])
  const [planRequests, setPlanRequests] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [pkgModal, setPkgModal] = useState(false) // false | 'add' | pkg
  const [pkgForm, setPkgForm] = useState({name:'',description:'',price:0,duration_days:7,max_clicks:0,max_impressions:0,ad_credits:1,allow_regional:true,badge:'',features:'',is_popular:false,status:'active',sort_order:0})
  const [pkgSaving, setPkgSaving] = useState(false)
  const [coupons, setCoupons] = useState([])
  const [couponModal, setCouponModal] = useState(false) // false | 'add' | coupon
  const [couponForm, setCouponForm] = useState({code:'',description:'',discount_pct:0,discount_amount:0,min_amount:0,max_uses:'',valid_until:'',status:'active'})
  const [couponSaving, setCouponSaving] = useState(false)
  const [categories, setCategories] = useState([])
  const [catModal, setCatModal] = useState(false) // false | 'add' | category obj
  const [catForm, setCatForm] = useState({name:'', emoji:'🏢', sort_order:0, status:'active'})
  const [catSaving, setCatSaving] = useState(false)
  const [uiLang, setUiLang] = useState('tr')
  useEffect(()=>{ setUiLang(getLang()) },[])
  const T = (k, vars) => i18n(k, uiLang, vars)
  const NAV = NAV_KEYS.map(([k,i,key]) => [k, i, T(key)])

  const toast3=(m)=>{setToast(m);setTimeout(()=>setToast(''),3500)}
  const fld=(k,v)=>setForm(p=>({...p,[k]:v}))

  useEffect(()=>{
    (async()=>{
      const u = await getActiveUser()
      if(!u){router.push('/login');return}
      if(u.role!=='admin'){router.push('/');return}
      setUser(u)
    })()
  },[router])

  async function loadAll() {
    setLoading(true)
    try {
      const [fr,pr,ar,payr,adsr2,settingsr,plr,pkgsr,purchr,plReqs,cpr,catr]=await Promise.all([
        supabase.from('businesses').select('*').order('created_at',{ascending:false}),
        supabase.from('profiles').select('*').order('created_at',{ascending:false}),
        supabase.from('appointments').select('id,status,business_id'),
        supabase.from('payments').select('amount,created_at,status').eq('status','completed'),
        supabase.from('ads').select('*, businesses(name,emoji)').order('created_at',{ascending:false}),
        supabase.from('platform_settings').select('*'),
        supabase.from('plan_limits').select('*').order('price_monthly'),
        supabase.from('ad_packages').select('*').order('sort_order'),
        supabase.from('ad_package_purchases').select('*, businesses(name,emoji)').order('created_at',{ascending:false}),
        supabase.from('plan_upgrade_requests').select('*, businesses(name,emoji)').order('created_at',{ascending:false}),
        supabase.from('coupons').select('*, businesses(name)').order('created_at',{ascending:false}),
        supabase.from('business_categories').select('*').order('sort_order'),
      ])
      setFirms(fr.data||[])
      setProfiles(pr.data||[])
      setAppts(ar.data||[])
      setPayments(payr?.data||[])
      if(adsr2?.data) setAllAds(adsr2.data)
      setPlanLimits(plr?.data||[])
      setAdPackages(pkgsr?.data||[])
      setAdPurchases(purchr?.data||[])
      setPlanRequests(plReqs?.data||[])
      setCoupons(cpr?.data||[])
      setCategories(catr?.data||[])
      const paySet = settingsr?.data?.find(s=>s.key==='payment_enabled')
      if(paySet) setPaymentEnabled(paySet.value==='true')
      const loySet = settingsr?.data?.find(s=>s.key==='loyalty_enabled')
      if(loySet) setLoyaltyEnabled(loySet.value==='true')
      const commSet = settingsr?.data?.find(s=>s.key==='commission_rate')
      if(commSet) setCommissionRate(+commSet.value||10)
      const themeSet = settingsr?.data?.find(s=>s.key==='theme')
      if(themeSet) setActiveTheme(themeSet.value||'orange')
    } catch(e){console.error(e)}
    finally{setLoading(false)}
  }
  useEffect(()=>{if(user)loadAll()},[user])

  // Plan limits CRUD
  async function savePlanLimit(plan, patch) {
    setPlanSaving(plan)
    const { error } = await supabase.from('plan_limits').update(patch).eq('plan', plan)
    if (error) { toast3('❌ '+error.message); setPlanSaving(''); return }
    setPlanLimits(prev => prev.map(p => p.plan===plan ? {...p, ...patch} : p))
    toast3('✅ '+plan+' plan güncellendi')
    setPlanSaving('')
  }
  function updatePlanField(plan, field, value) {
    setPlanLimits(prev => prev.map(p => p.plan===plan ? {...p, [field]: value} : p))
  }

  // Ad packages CRUD
  function openPkgAdd() {
    setPkgForm({name:'',description:'',price:0,duration_days:7,max_clicks:0,max_impressions:0,ad_credits:1,allow_regional:true,badge:'',features:'',is_popular:false,status:'active',sort_order:adPackages.length+1})
    setPkgModal('add')
  }
  function openPkgEdit(p) {
    setPkgForm({
      name:p.name, description:p.description||'', price:p.price, duration_days:p.duration_days,
      max_clicks:p.max_clicks||0, max_impressions:p.max_impressions||0,
      ad_credits:p.ad_credits||1, allow_regional:p.allow_regional!==false,
      badge:p.badge||'',
      features:(p.features||[]).join('\n'), is_popular:p.is_popular||false,
      status:p.status||'active', sort_order:p.sort_order||0,
    })
    setPkgModal(p)
  }
  async function savePkg() {
    if (!pkgForm.name.trim()) { toast3('❌ İsim zorunlu'); return }
    setPkgSaving(true)
    try {
      const payload = {
        name: pkgForm.name,
        description: pkgForm.description || null,
        price: +pkgForm.price,
        duration_days: +pkgForm.duration_days,
        max_clicks: +pkgForm.max_clicks || 0,
        max_impressions: +pkgForm.max_impressions || 0,
        ad_credits: Math.max(1, +pkgForm.ad_credits || 1),
        allow_regional: !!pkgForm.allow_regional,
        badge: pkgForm.badge || null,
        features: pkgForm.features.split('\n').map(s=>s.trim()).filter(Boolean),
        is_popular: !!pkgForm.is_popular,
        status: pkgForm.status,
        sort_order: +pkgForm.sort_order || 0,
      }
      if (pkgModal === 'add') {
        const { data, error } = await supabase.from('ad_packages').insert(payload).select().maybeSingle()
        if (error) throw error
        setAdPackages(p => [...p, data].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)))
        toast3('✅ Paket eklendi')
      } else {
        const { error } = await supabase.from('ad_packages').update(payload).eq('id', pkgModal.id)
        if (error) throw error
        setAdPackages(p => p.map(x => x.id===pkgModal.id ? {...x, ...payload} : x).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)))
        toast3('✅ Paket güncellendi')
      }
      setPkgModal(false)
    } catch(e) { toast3('❌ '+e.message) }
    finally { setPkgSaving(false) }
  }
  async function deletePkg(id, name) {
    if (!confirm(`${name} paketi silinsin mi?`)) return
    await supabase.from('ad_packages').delete().eq('id', id)
    setAdPackages(p => p.filter(x => x.id !== id))
    setPkgModal(false)
    toast3('🗑️ Paket silindi')
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
    setCouponSaving(true)
    try {
      const payload = {
        code,
        business_id: null,
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
  // Kategori CRUD
  function openCatAdd() {
    setCatForm({ name:'', emoji:'🏢', sort_order: categories.length+1, status:'active' })
    setCatModal('add')
  }
  function openCatEdit(c) {
    setCatForm({ name:c.name, emoji:c.emoji||'🏢', sort_order:c.sort_order||0, status:c.status||'active' })
    setCatModal(c)
  }
  async function saveCat() {
    const name = catForm.name.trim()
    if (!name) { toast3('❌ İsim zorunlu'); return }
    setCatSaving(true)
    try {
      const payload = {
        name,
        emoji: catForm.emoji || '🏢',
        sort_order: +catForm.sort_order || 0,
        status: catForm.status || 'active',
      }
      if (catModal === 'add') {
        const { data, error } = await supabase.from('business_categories').insert(payload).select().maybeSingle()
        if (error) throw error
        setCategories(p => [...p, data].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)))
        toast3('✅ Kategori eklendi')
      } else {
        const { data, error } = await supabase.from('business_categories').update(payload).eq('id', catModal.id).select().maybeSingle()
        if (error) throw error
        setCategories(p => p.map(c => c.id===catModal.id ? data : c).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)))
        toast3('✅ Kategori güncellendi')
      }
      setCatModal(false)
    } catch(e) {
      const msg = String(e?.message||'')
      if (msg.includes('duplicate') || msg.includes('unique')) toast3('❌ Bu isim zaten kullanılıyor')
      else toast3('❌ '+msg)
    } finally {
      setCatSaving(false)
    }
  }
  async function deleteCat(id, name) {
    const usedBy = firms.filter(f => f.category === name).length
    const msg = usedBy > 0
      ? `"${name}" kategorisi ${usedBy} firmada kullanılıyor — silmeden önce o firmaların kategorisini değiştir. Yine de silmek istiyor musun?`
      : `"${name}" kategorisi silinsin mi?`
    if (!confirm(msg)) return
    const { error } = await supabase.from('business_categories').delete().eq('id', id)
    if (error) { toast3('❌ '+error.message); return }
    setCategories(p => p.filter(c => c.id !== id))
    setCatModal(false)
    toast3('🗑️ Kategori silindi')
  }
  async function approvePurchase(id) {
    const purch = adPurchases.find(p => p.id === id)
    if (!purch) return
    const pkg = adPackages.find(p => p.id === purch.package_id)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (pkg?.duration_days || 7))
    const credits = pkg?.ad_credits || 1
    const { error } = await supabase.from('ad_package_purchases').update({
      status:'approved', approved_at:new Date().toISOString(), expires_at:expiresAt.toISOString(),
    }).eq('id', id)
    if (error) { toast3('❌ '+error.message); return }
    setAdPurchases(p => p.map(x => x.id===id ? {
      ...x,
      status:'approved',
      expires_at:expiresAt.toISOString(),
      credits_total: x.credits_total || credits,
    } : x))
    toast3('✅ Satın alma onaylandı — '+credits+' kontör tanımlandı')
  }
  async function rejectPurchase(id) {
    await supabase.from('ad_package_purchases').update({status:'rejected'}).eq('id', id)
    setAdPurchases(p => p.map(x => x.id===id ? {...x, status:'rejected'} : x))
    toast3('Reddedildi')
  }

  async function approvePlanRequest(id) {
    const req = planRequests.find(r => r.id === id)
    if (!req) return
    const { error: e1 } = await supabase.from('businesses').update({ plan: req.requested_plan }).eq('id', req.business_id)
    if (e1) { toast3('❌ '+e1.message); return }
    const { error: e2 } = await supabase.from('plan_upgrade_requests').update({ status:'approved', updated_at:new Date().toISOString() }).eq('id', id)
    if (e2) { toast3('❌ '+e2.message); return }
    setPlanRequests(p => p.map(x => x.id===id ? {...x, status:'approved'} : x))
    setFirms(p => p.map(f => f.id===req.business_id ? {...f, plan: req.requested_plan} : f))
    toast3('✅ Plan talebi onaylandı')
  }
  async function rejectPlanRequest(id) {
    await supabase.from('plan_upgrade_requests').update({ status:'rejected', updated_at:new Date().toISOString() }).eq('id', id)
    setPlanRequests(p => p.map(x => x.id===id ? {...x, status:'rejected'} : x))
    toast3('Plan talebi reddedildi')
  }

  async function setFirmStatus(id, name, status, confirmMsg) {
    if (confirmMsg && !confirm(confirmMsg)) return
    const { error } = await supabase.from('businesses').update({ status }).eq('id', id)
    if (error) { toast3('❌ '+error.message); return }
    setFirms(p => p.map(f => f.id===id ? {...f, status} : f))
    const labels = { active:'✅ aktif', review:'🔄 inceleme', suspended:'⚠️ askıya alındı', passive:'⏸ pasif' }
    toast3(`${name} ${labels[status]||status}`)
  }
  async function setFirmPlan(id, name, plan) {
    const { error } = await supabase.from('businesses').update({ plan }).eq('id', id)
    if (error) { toast3('❌ '+error.message); return }
    setFirms(p => p.map(f => f.id===id ? {...f, plan} : f))
    toast3(`${name} planı → ${plan.toUpperCase()}`)
  }
  const approveFirm = (id,name) => setFirmStatus(id, name, 'active')
  const rejectFirm  = (id,name) => setFirmStatus(id, name, 'passive')
  const suspendFirm = (id,name) => setFirmStatus(id, name, 'suspended', `${name} askıya alınsın mı?`)
  const unsuspendFirm = (id,name) => setFirmStatus(id, name, 'active')
  async function saveFirm(){
    if(!form.name||!form.category||!form.city){toast3('❌ Zorunlu alanları doldurun');return}
    const catEmoji = categories.find(c => c.name === form.category)?.emoji || '🏢'
    setSaving(true)
    try {
      await supabase.from('businesses').insert({...form,status:'review',rating:4.5,review_count:0,emoji:catEmoji})
      setModal(false)
      setForm({name:'',category:'',city:'',owner_name:'',email:'',phone:'',price_from:0,plan:'free'})
      toast3(`✅ ${form.name} eklendi`)
      await loadAll()
    } catch(e){toast3('❌ '+e.message)}
    finally{setSaving(false)}
  }

  const reviewFirms=firms.filter(f=>f.status==='review')
  const activeFirms=firms.filter(f=>f.status==='active')
  const apptCountByFirm = appts.reduce((m,a)=>{ m[a.business_id]=(m[a.business_id]||0)+1; return m },{})
  const filteredAll = firms.filter(f=>{
    const q=search.toLowerCase()
    return(!q||f.name.toLowerCase().includes(q)||(f.email||'').toLowerCase().includes(q)||(f.city||'').toLowerCase().includes(q))
      && (!statusF||f.status===statusF)
      && (!firmPlanF||f.plan===firmPlanF)
  }).slice().sort((a,b)=>{
    if (firmSort==='name')   return (a.name||'').localeCompare(b.name||'','tr')
    if (firmSort==='plan')   { const ord={enterprise:0,pro:1,free:2}; return (ord[a.plan]??9)-(ord[b.plan]??9) }
    if (firmSort==='status') { const ord={active:0,review:1,suspended:2,passive:3}; return (ord[a.status]??9)-(ord[b.status]??9) }
    if (firmSort==='appts')  return (apptCountByFirm[b.id]||0) - (apptCountByFirm[a.id]||0)
    return new Date(b.created_at) - new Date(a.created_at)
  })
  const FIRM_PAGE_SIZE = 20
  const firmTotalPages = Math.max(1, Math.ceil(filteredAll.length / FIRM_PAGE_SIZE))
  const safeFirmPage = Math.min(firmPage, firmTotalPages)
  const filtered = filteredAll.slice((safeFirmPage-1)*FIRM_PAGE_SIZE, safeFirmPage*FIRM_PAGE_SIZE)
  const planCounts=firms.reduce((a,f)=>({...a,[f.plan]:(a[f.plan]||0)+1}),{})
  const statusCounts=firms.reduce((a,f)=>({...a,[f.status]:(a[f.status]||0)+1}),{})

  // Revenue date filter
  const revenueScopedPayments = (() => {
    if (!revFilter) return payments
    const now = new Date()
    if (revFilter==='thisMonth') {
      const mp = now.toISOString().slice(0,7)
      return payments.filter(p => (p.created_at||'').startsWith(mp))
    }
    if (revFilter==='last3') {
      const lim = new Date(now.getFullYear(), now.getMonth()-3, now.getDate())
      return payments.filter(p => new Date(p.created_at) >= lim)
    }
    if (revFilter==='last12') {
      const lim = new Date(now.getFullYear()-1, now.getMonth(), now.getDate())
      return payments.filter(p => new Date(p.created_at) >= lim)
    }
    return payments
  })()

  if(!user) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/20 border-t-orange-500 rounded-full animate-spin" /></div>

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 relative">
      {/* Mobil Alt Navbar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-800 border-t border-white/10 flex">
        {[['dashboard','⊞','Panel'],['firms','🏢','Firmalar'],['requests','📬','Başvuru'],['ads','📢','Reklam'],['adpkgs','🎁','Paket'],['plans','📦','Plan'],['revenue','💰','Gelir']].map(([k,ic,l])=>(
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

      {/* PAKET MODAL */}
      {pkgModal && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setPkgModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <div className="font-bold">{pkgModal==='add'?'Paket Ekle':'Paket Düzenle'}</div>
              <button onClick={()=>setPkgModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-bold block mb-1">İsim *</label>
                <input value={pkgForm.name} onChange={e=>setPkgForm(p=>({...p,name:e.target.value}))} placeholder="Örn: Pro Reklam" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/></div>
              <div><label className="text-xs font-bold block mb-1">Açıklama</label>
                <input value={pkgForm.description} onChange={e=>setPkgForm(p=>({...p,description:e.target.value}))} placeholder="Kısa açıklama" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div><label className="text-xs font-bold block mb-1">Fiyat (₺)</label>
                  <input type="number" min="0" value={pkgForm.price} onChange={e=>setPkgForm(p=>({...p,price:+e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/></div>
                <div><label className="text-xs font-bold block mb-1">Süre (gün, max 30)</label>
                  <input type="number" min="1" max="30" value={pkgForm.duration_days} onChange={e=>setPkgForm(p=>({...p,duration_days:Math.min(30,+e.target.value||1)}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/></div>
                <div><label className="text-xs font-bold block mb-1">🎟️ Kontör</label>
                  <input type="number" min="1" value={pkgForm.ad_credits} onChange={e=>setPkgForm(p=>({...p,ad_credits:+e.target.value}))} className="w-full px-3 py-2.5 border border-orange-300 bg-orange-50 rounded-xl text-sm outline-none focus:border-orange-500 font-bold"/></div>
                <div><label className="text-xs font-bold block mb-1" title="0 = sınırsız">Max Tıklama</label>
                  <input type="number" min="0" value={pkgForm.max_clicks} onChange={e=>setPkgForm(p=>({...p,max_clicks:+e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" placeholder="0 = sınırsız"/></div>
                <div><label className="text-xs font-bold block mb-1" title="0 = sınırsız">Max Gösterim</label>
                  <input type="number" min="0" value={pkgForm.max_impressions} onChange={e=>setPkgForm(p=>({...p,max_impressions:+e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" placeholder="0 = sınırsız"/></div>
                <div className="col-span-2 sm:col-span-3 flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white hover:bg-gray-50">
                    <input type="checkbox" checked={pkgForm.allow_regional} onChange={e=>setPkgForm(p=>({...p,allow_regional:e.target.checked}))} className="accent-orange-500"/>
                    <span className="font-bold">📍 Bölgesel hedefleme açık</span>
                    <span className="text-xs text-gray-400 ml-auto">{pkgForm.allow_regional?'şehir / ilçe / yarıçap':'sadece genel'}</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-xs font-bold block mb-1">Rozet (emoji)</label>
                  <input value={pkgForm.badge} onChange={e=>setPkgForm(p=>({...p,badge:e.target.value}))} placeholder="⭐" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/></div>
                <div><label className="text-xs font-bold block mb-1">Sıra</label>
                  <input type="number" value={pkgForm.sort_order} onChange={e=>setPkgForm(p=>({...p,sort_order:+e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/></div>
                <div><label className="text-xs font-bold block mb-1">Durum</label>
                  <select value={pkgForm.status} onChange={e=>setPkgForm(p=>({...p,status:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400">
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </select></div>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Özellikler (her satıra bir özellik)</label>
                <textarea value={pkgForm.features} onChange={e=>setPkgForm(p=>({...p,features:e.target.value}))} rows="5"
                  placeholder="7 gün aktif&#10;Şehir bazlı hedefleme&#10;Performans raporu"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={pkgForm.is_popular} onChange={e=>setPkgForm(p=>({...p,is_popular:e.target.checked}))} className="accent-orange-500" />
                <span className="text-sm">⭐ Popüler paket olarak işaretle</span>
              </label>
            </div>
            <div className="px-5 pb-5 flex gap-2 sticky bottom-0 bg-white pt-2 border-t border-gray-100">
              {pkgModal!=='add' && <button onClick={()=>deletePkg(pkgModal.id, pkgModal.name)} className="px-3 py-2.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-xl text-xs font-bold">🗑️ Sil</button>}
              <button onClick={()=>setPkgModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">İptal</button>
              <button onClick={savePkg} disabled={pkgSaving} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold">{pkgSaving?'Kaydediliyor...':pkgModal==='add'?'Ekle':'Güncelle'}</button>
            </div>
          </div>
        </div>
      )}

      {catModal && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setCatModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div className="font-bold">{catModal==='add'?'Kategori Ekle':'Kategori Düzenle'}</div>
              <button onClick={()=>setCatModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">İsim *</label>
                <input value={catForm.name} onChange={e=>setCatForm(p=>({...p,name:e.target.value}))}
                  placeholder="Örn: Berber, Kafe, Otopark" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold block mb-1">Emoji</label>
                  <input value={catForm.emoji} onChange={e=>setCatForm(p=>({...p,emoji:e.target.value}))}
                    maxLength={4} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-2xl text-center outline-none focus:border-orange-400"/>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Sıra</label>
                  <input type="number" value={catForm.sort_order} onChange={e=>setCatForm(p=>({...p,sort_order:+e.target.value}))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"/>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Durum</label>
                  <select value={catForm.status} onChange={e=>setCatForm(p=>({...p,status:e.target.value}))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400">
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </select>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-800">
                ℹ️ Emoji önerileri: ✂️ 💆 🧘 🏋️ 💊 🍽️ 🚗 🐶 📚 🔧 💅 🦷 🩺
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 border-t border-gray-100 pt-3">
              {catModal !== 'add' && (
                <button onClick={()=>deleteCat(catModal.id, catModal.name)}
                  className="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 rounded-lg font-bold">🗑️ Sil</button>
              )}
              <button onClick={()=>setCatModal(false)} className="ml-auto px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-lg">İptal</button>
              <button onClick={saveCat} disabled={catSaving}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg text-sm font-bold">
                {catSaving?'Kaydediliyor...':'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* FIRMA DETAY MODAL */}
      {firmDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setFirmDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex justify-between items-start">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0" style={{background:'#f97316'}}>{firmDetail.name?.[0]}</div>
                <div className="min-w-0">
                  <div className="font-bold truncate">{firmDetail.name}</div>
                  <div className="text-xs text-gray-500">{firmDetail.category} · {firmDetail.city}</div>
                </div>
              </div>
              <button onClick={()=>setFirmDetail(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg flex-shrink-0">✕</button>
            </div>

            <div className="p-5 space-y-5">
              {/* Status Değiştirici */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Durum</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    {v:'active',l:'✓ Aktif',cls:'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'},
                    {v:'review',l:'⏳ İnceleme',cls:'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'},
                    {v:'suspended',l:'⚠️ Askıda',cls:'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'},
                    {v:'passive',l:'⏸ Pasif',cls:'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200'},
                  ].map(s => {
                    const active = firmDetail.status === s.v
                    return (
                      <button key={s.v} disabled={active}
                        onClick={async()=>{
                          await setFirmStatus(firmDetail.id, firmDetail.name, s.v)
                          setFirmDetail(p => p ? {...p, status: s.v} : p)
                        }}
                        className={'text-xs font-bold px-3 py-2 rounded-lg border transition-colors '+(active?'ring-2 ring-orange-400 opacity-100 cursor-default '+s.cls:s.cls)}>
                        {s.l}{active && ' ✓'}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Plan Değiştirici */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Üyelik Planı</div>
                <div className="grid grid-cols-3 gap-2">
                  {['free','pro','enterprise'].map(plan => {
                    const labels = {free:'🆓 Ücretsiz', pro:'🔥 Pro', enterprise:'⚡ Enterprise'}
                    const active = firmDetail.plan === plan
                    return (
                      <button key={plan} disabled={active}
                        onClick={async()=>{
                          await setFirmPlan(firmDetail.id, firmDetail.name, plan)
                          setFirmDetail(p => p ? {...p, plan} : p)
                        }}
                        className={'text-xs font-bold px-3 py-2.5 rounded-lg border transition-colors '+(active?'bg-orange-500 text-white border-orange-500 cursor-default':'bg-white hover:bg-orange-50 text-gray-700 border-gray-200 hover:border-orange-300')}>
                        {labels[plan]}{active && ' ✓'}
                      </button>
                    )
                  })}
                </div>
                <div className="text-[11px] text-gray-400 mt-2">Plan değişikliği firmaya anında yansır (realtime).</div>
              </div>

              {/* Firma Bilgileri */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bilgiler</div>
                <div className="bg-gray-50 rounded-xl divide-y divide-gray-200 text-sm">
                  {[
                    ['E-posta', firmDetail.email||'—'],
                    ['Telefon', firmDetail.phone||'—'],
                    ['Adres', firmDetail.address||'—'],
                    ['Sahip', firmDetail.owner_name||'—'],
                    ['Başlangıç fiyatı', firmDetail.price_from ? '₺'+firmDetail.price_from : '—'],
                    ['Puan', firmDetail.rating ? '★ '+firmDetail.rating+' ('+(firmDetail.review_count||0)+')' : '—'],
                    ['Kayıt', new Date(firmDetail.created_at).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})],
                  ].map(([k,v]) => (
                    <div key={k} className="flex justify-between gap-3 px-3 py-2.5">
                      <span className="text-gray-500 text-xs uppercase tracking-wide">{k}</span>
                      <span className="font-semibold text-gray-800 text-right text-sm">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hızlı bağlantı */}
              <div className="flex gap-2">
                <a href={'/firma/'+firmDetail.id} target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-center hover:bg-gray-50">
                  🔗 Firma Sayfası
                </a>
                <button onClick={()=>setFirmDetail(null)}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold">
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    <option value="">Seçin</option>{categories.filter(c=>c.status==='active').map(c=><option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
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
            <div><div className="text-white text-sm font-bold">RandevuApp</div><div className="text-white/30 text-xs">{T('adminPanel')}</div></div>
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
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-3 sm:px-5 gap-2 sm:gap-3 flex-shrink-0 relative">
          <span className="text-sm font-semibold text-gray-800 truncate">{NAV.find(x=>x[0]===view)?.[2]}</span>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full font-semibold">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Supabase · Canlı
            </div>
            {(() => {
              const pendPlans = planRequests.filter(r=>r.status==='pending')
              const pendAds = adPurchases.filter(p=>p.status==='pending')
              const total = pendPlans.length + pendAds.length
              return (
                <button onClick={()=>setNotifOpen(p=>!p)} className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600">
                  🔔
                  {total>0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">{total}</span>}
                </button>
              )
            })()}
            <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden text-[10px] font-bold">
              {['tr','en'].map(l => (
                <button key={l} onClick={()=>{ setLang(l); setUiLang(l) }}
                  className={`px-2 py-1 ${uiLang===l?'bg-orange-500 text-white':'text-gray-500 hover:bg-gray-50'}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={()=>setModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg whitespace-nowrap"><span className="sm:hidden">+ Firma</span><span className="hidden sm:inline">{T('addBusiness')}</span></button>
          </div>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={()=>setNotifOpen(false)} />
              <div className="absolute top-12 right-5 z-50 w-96 max-w-[calc(100vw-1.5rem)] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="font-bold text-sm">Bildirimler</div>
                  <button onClick={()=>setNotifOpen(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                  {planRequests.filter(r=>r.status==='pending').length===0 && adPurchases.filter(p=>p.status==='pending').length===0 && (
                    <div className="p-6 text-center text-sm text-gray-400">Bekleyen istek yok ✅</div>
                  )}
                  {planRequests.filter(r=>r.status==='pending').map(r=>(
                    <div key={'pl-'+r.id} className="p-3 flex items-start gap-3 hover:bg-gray-50 cursor-pointer" onClick={()=>{setView('plans'); setNotifOpen(false)}}>
                      <div className="text-xl mt-0.5">📦</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate">Üyelik planı talebi</div>
                        <div className="text-xs text-gray-600 truncate">
                          {r.businesses?.name||'Firma'} · <span className="uppercase">{r.current_plan}</span> → <b className="uppercase text-orange-600">{r.requested_plan}</b>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{new Date(r.created_at).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">⏳ Onay</span>
                    </div>
                  ))}
                  {adPurchases.filter(p=>p.status==='pending').map(p=>(
                    <div key={'ad-'+p.id} className="p-3 flex items-start gap-3 hover:bg-gray-50 cursor-pointer" onClick={()=>{setView('ads'); setNotifOpen(false)}}>
                      <div className="text-xl mt-0.5">🎁</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate">Reklam paketi talebi</div>
                        <div className="text-xs text-gray-600 truncate">
                          {p.businesses?.name||'Firma'} · {p.package_name} · ₺{p.price_at_purchase}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{new Date(p.created_at).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">⏳ Onay</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5 pb-24 md:pb-5">
          {loading?(
            <div className="flex items-center justify-center gap-3 text-gray-400 py-20"><Spin /> Yükleniyor...</div>
          ):(
            <>
              {view==='dashboard'&&(
                <div>
                  <div className="bg-white border-2 border-orange-200 rounded-xl p-4 shadow-sm mb-5 flex items-center gap-4">
                    <div className="text-2xl">💳</div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">Ödeme Modu</div>
                      <div className="text-xs text-gray-500 mt-0.5">{paymentEnabled ? 'Aktif — ödemeler alınıyor' : 'Kapalı — 1 saatte otomatik onay'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold">{paymentEnabled?'AÇIK':'KAPALI'}</span>
                      <button onClick={async()=>{
                        setSavingPayment(true)
                        const v = !paymentEnabled
                        const { error } = await supabase.from('platform_settings').upsert({key:'payment_enabled',value:String(v),updated_at:new Date().toISOString()})
                        if (error) { toast3('❌ Kaydedilemedi: '+error.message); setSavingPayment(false); return }
                        setPaymentEnabled(v)
                        setSavingPayment(false)
                      }} disabled={savingPayment} className={'relative w-14 h-7 rounded-full transition-colors '+(paymentEnabled?'bg-orange-500':'bg-gray-300')}>
                        <div className={'absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all '+(paymentEnabled?'left-7':'left-0.5')}/>
                      </button>
                    </div>
                  </div>
                  <div className="bg-white border-2 border-amber-200 rounded-xl p-4 shadow-sm mb-5 flex items-center gap-4">
                    <div className="text-2xl">⭐</div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">Sadakat Programı</div>
                      <div className="text-xs text-gray-500 mt-0.5">{loyaltyEnabled ? 'Aktif — müşteriler puan kazanır ve harcayabilir' : 'Kapalı — puan kartı/harcama gizli, henüz aktif değil'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold">{loyaltyEnabled?'AÇIK':'KAPALI'}</span>
                      <button onClick={async()=>{
                        setSavingLoyalty(true)
                        const v = !loyaltyEnabled
                        const { error } = await supabase.from('platform_settings').upsert({key:'loyalty_enabled',value:String(v),updated_at:new Date().toISOString()})
                        if (error) { toast3('❌ Kaydedilemedi: '+error.message); setSavingLoyalty(false); return }
                        setLoyaltyEnabled(v)
                        setSavingLoyalty(false)
                      }} disabled={savingLoyalty} className={'relative w-14 h-7 rounded-full transition-colors '+(loyaltyEnabled?'bg-amber-500':'bg-gray-300')}>
                        <div className={'absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all '+(loyaltyEnabled?'left-7':'left-0.5')}/>
                      </button>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-4">
                    <div className="font-bold text-sm mb-3">Tema Secici</div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                      {[["default","Varsayilan","#f97316"],["minimal","Minimal","#111"],["luxury","Luxury","#d4af37"],["soft","Soft","#ff8fab"],["bold","Bold","#764ba2"],["pulse","Pulse","#00f0a8"],["spot","Spot","#ff2d75"],["atlas","Atlas","#a04268"]].map(([k,n,c])=>(
                        <button key={k} onClick={async()=>{
                          const { error } = await supabase.from("platform_settings").upsert({key:"theme",value:k,updated_at:new Date().toISOString()})
                          if (error) { toast3("❌ Tema kaydedilemedi: "+error.message); return }
                          setActiveTheme(k)
                          toast3("✅ "+n+" temasi kaydedildi")
                        }} className={"flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl border-2 "+(activeTheme===k?"border-orange-500 bg-orange-50":"border-gray-200 hover:border-gray-300")}>
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" style={{background:c}}/>
                          <span className="text-[11px] sm:text-xs font-semibold text-center leading-tight">{n}</span>
                          {activeTheme===k&&<span className="text-[10px] sm:text-xs text-green-600 font-bold">Aktif</span>}
                        </button>
                      ))}
                    </div>
                  </div>
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
                      <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px]">
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
                  {/* KPI tab'ları (tıklanır filtre) */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <button onClick={()=>{ setStatusF(''); setFirmPlanF(''); setFirmPage(1) }} className={'text-left rounded-xl '+(!statusF&&!firmPlanF?'ring-2 ring-orange-400':'')}>
                      <KPI label="Toplam" value={firms.length} color="blue" />
                    </button>
                    <button onClick={()=>{ setStatusF('active'); setFirmPlanF(''); setFirmPage(1) }} className={'text-left rounded-xl '+(statusF==='active'?'ring-2 ring-green-400':'')}>
                      <KPI label="Aktif" value={statusCounts.active||0} color="green" />
                    </button>
                    <button onClick={()=>{ setStatusF('review'); setFirmPlanF(''); setFirmPage(1) }} className={'text-left rounded-xl '+(statusF==='review'?'ring-2 ring-amber-400':'')}>
                      <KPI label="İnceleme" value={statusCounts.review||0} color="orange" />
                    </button>
                    <button onClick={()=>{ setStatusF('suspended'); setFirmPlanF(''); setFirmPage(1) }} className={'text-left rounded-xl '+(statusF==='suspended'?'ring-2 ring-red-400':'')}>
                      <KPI label="Askıda" value={statusCounts.suspended||0} color="gray" />
                    </button>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex gap-2 flex-wrap items-center">
                      <input className="flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400"
                        placeholder="Firma adı, e-posta veya şehir ara..."
                        value={search} onChange={e=>{ setSearch(e.target.value); setFirmPage(1) }} />
                      <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" value={statusF} onChange={e=>{ setStatusF(e.target.value); setFirmPage(1) }}>
                        <option value="">Tüm Durumlar</option><option value="active">Aktif</option><option value="review">İnceleme</option><option value="suspended">Askıda</option><option value="passive">Pasif</option>
                      </select>
                      <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" value={firmPlanF} onChange={e=>{ setFirmPlanF(e.target.value); setFirmPage(1) }}>
                        <option value="">Tüm Planlar</option><option value="free">Ücretsiz</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
                      </select>
                      <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" value={firmSort} onChange={e=>setFirmSort(e.target.value)}>
                        <option value="newest">Yeni → Eski</option>
                        <option value="name">İsme göre (A-Z)</option>
                        <option value="plan">Plana göre</option>
                        <option value="status">Duruma göre</option>
                        <option value="appts">İşleme göre (randevu)</option>
                      </select>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50"><tr>{['Firma','Şehir','Kategori','Plan','Durum','Kayıt',''].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                        <tbody>
                          {filtered.map((f,i)=>(
                            <tr key={f.id} onClick={()=>setFirmDetail(f)} className="border-t border-gray-100 hover:bg-gray-50 group cursor-pointer">
                              <td className="px-4 py-3"><div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:COLORS[i%COLORS.length]}}>{f.name[0]}</div>
                                <div><div className="font-semibold text-sm">{f.name}</div><div className="text-xs text-gray-400">{f.email||'—'}</div></div>
                              </div></td>
                              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{f.city}</td>
                              <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200">{f.category}</span></td>
                              <td className="px-4 py-3"><PlanBdg p={f.plan} /></td>
                              <td className="px-4 py-3"><StatusBdg s={f.status} /></td>
                              <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(f.created_at).toLocaleDateString('tr-TR')}</td>
                              <td className="px-4 py-3" onClick={e=>e.stopPropagation()}>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {f.status==='review'&&<button onClick={()=>approveFirm(f.id,f.name)} className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded-lg font-semibold">Onayla</button>}
                                  {f.status==='active'&&<button onClick={()=>suspendFirm(f.id,f.name)} className="text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg font-semibold">Askıya Al</button>}
                                  {(f.status==='suspended'||f.status==='passive')&&<button onClick={()=>unsuspendFirm(f.id,f.name)} className="text-xs bg-green-500 text-white px-2.5 py-1 rounded-lg font-semibold">✓ Aktifleştir</button>}
                                  <button onClick={()=>setFirmDetail(f)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg font-semibold">Detay →</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filtered.length===0&&<tr><td colSpan="7" className="px-4 py-10 text-center text-gray-400">Sonuç bulunamadı</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
                      <div className="text-xs text-gray-500">
                        {filteredAll.length>0
                          ? `${((safeFirmPage-1)*FIRM_PAGE_SIZE)+1}–${Math.min(safeFirmPage*FIRM_PAGE_SIZE, filteredAll.length)} / ${filteredAll.length} firma`
                          : '0 firma'}
                      </div>
                      {filteredAll.length > FIRM_PAGE_SIZE && (
                        <div className="flex items-center gap-1">
                          <button disabled={safeFirmPage<=1} onClick={()=>setFirmPage(p=>Math.max(1,p-1))}
                            className="px-2.5 py-1 text-xs font-bold rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50">‹ Önceki</button>
                          <span className="text-xs font-bold px-2">Sayfa {safeFirmPage} / {firmTotalPages}</span>
                          <button disabled={safeFirmPage>=firmTotalPages} onClick={()=>setFirmPage(p=>Math.min(firmTotalPages,p+1))}
                            className="px-2.5 py-1 text-xs font-bold rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Sonraki ›</button>
                        </div>
                      )}
                    </div>
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
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
                      <table className="w-full min-w-[720px]">
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

              {view==='categories'&&(() => {
                const activeCats = categories.filter(c=>c.status==='active')
                const usedCounts = {}
                firms.forEach(f => { if (f.category) usedCounts[f.category] = (usedCounts[f.category]||0)+1 })
                return (
                <div>
                  <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div>
                      <h1 className="text-xl font-bold">Kategoriler</h1>
                      <p className="text-gray-500 text-sm">{categories.length} kategori · {activeCats.length} aktif · Firmaların seçeneklerini buradan yönet</p>
                    </div>
                    <button onClick={openCatAdd} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">+ Kategori Ekle</button>
                  </div>
                  {categories.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                      <div className="text-4xl mb-3">🗂️</div>
                      <div className="font-bold mb-1">Kategori yok</div>
                      <button onClick={openCatAdd} className="text-orange-500 hover:underline text-sm">İlkini ekle →</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categories.map(c => {
                        const used = usedCounts[c.name] || 0
                        return (
                          <div key={c.id} className={'bg-white border-2 rounded-xl p-4 shadow-sm '+(c.status==='active'?'border-gray-200':'border-gray-100 opacity-60')}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl">{c.emoji||'🏢'}</div>
                                <div>
                                  <div className="font-bold text-sm">{c.name}</div>
                                  <div className="text-xs text-gray-400">Sıra: {c.sort_order} · {used} firma</div>
                                </div>
                              </div>
                              <span className={'text-[11px] font-bold px-2 py-0.5 rounded-full border '+(c.status==='active'?'bg-green-50 text-green-700 border-green-200':'bg-gray-100 text-gray-500 border-gray-200')}>
                                {c.status==='active'?'Aktif':'Pasif'}
                              </span>
                            </div>
                            <div className="flex gap-1.5 mt-3">
                              <button onClick={()=>openCatEdit(c)} className="flex-1 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-2.5 py-1.5 rounded-lg font-semibold">✏️ Düzenle</button>
                              <button onClick={()=>deleteCat(c.id, c.name)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2.5 py-1.5 rounded-lg font-semibold">🗑️</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                )
              })()}

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

              {view==='ads'&&(() => {
                const now = new Date()
                const statusCount = (s) => allAds.filter(a => a.status===s).length
                const typeCount = (t) => allAds.filter(a => a.type===t).length
                const totalImpr = allAds.reduce((s,a)=>s+(a.impressions||0),0)
                const totalClicks = allAds.reduce((s,a)=>s+(a.clicks||0),0)
                const ctr = totalImpr > 0 ? (totalClicks/totalImpr*100) : 0
                const q = adsSearch.toLowerCase()
                const filteredAds = allAds.filter(a => (
                  (!adsStatusF || a.status===adsStatusF)
                  && (!adsTypeF || a.type===adsTypeF)
                  && (!q || (a.title||'').toLowerCase().includes(q) || (a.businesses?.name||'').toLowerCase().includes(q) || (a.target_city||'').toLowerCase().includes(q))
                )).slice().sort((a,b) => {
                  if (adsSort==='endsoon')      return new Date(a.ends_at||0) - new Date(b.ends_at||0)
                  if (adsSort==='clicks')       return (b.clicks||0) - (a.clicks||0)
                  if (adsSort==='impressions')  return (b.impressions||0) - (a.impressions||0)
                  if (adsSort==='firm')         return (a.businesses?.name||'').localeCompare(b.businesses?.name||'','tr')
                  return new Date(b.created_at||0) - new Date(a.created_at||0)
                })
                const ADS_PAGE_SIZE = 20
                const adsTotalPages = Math.max(1, Math.ceil(filteredAds.length / ADS_PAGE_SIZE))
                const safeAdsPage = Math.min(adsPage, adsTotalPages)
                const pageAds = filteredAds.slice((safeAdsPage-1)*ADS_PAGE_SIZE, safeAdsPage*ADS_PAGE_SIZE)
                const remainingDays = (ad) => {
                  if (!ad.ends_at) return null
                  return Math.ceil((new Date(ad.ends_at) - now) / 86400000)
                }
                const statusMeta = {
                  pending:  { l:'⏳ Bekliyor',  cls:'bg-amber-50 text-amber-700 border-amber-200' },
                  active:   { l:'● Aktif',      cls:'bg-green-50 text-green-700 border-green-200' },
                  paused:   { l:'⏸ Durduruldu', cls:'bg-gray-100 text-gray-600 border-gray-200' },
                  expired:  { l:'❌ Süresi doldu', cls:'bg-red-50 text-red-700 border-red-200' },
                  rejected: { l:'✗ Reddedildi', cls:'bg-red-50 text-red-700 border-red-200' },
                }
                return (
                <div>
                  <div className="mb-4">
                    <h1 className="text-lg sm:text-xl font-bold">Reklam Yönetimi</h1>
                    <p className="text-gray-500 text-sm">{allAds.length} reklam · Onaylama, durdurma ve süresi geçenleri yönet</p>
                  </div>

                  {/* KPI'lar — tıklanır filtre */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                    <button onClick={()=>{ setAdsStatusF(''); setAdsPage(1) }} className={'text-left rounded-xl '+(!adsStatusF?'ring-2 ring-orange-400':'')}>
                      <KPI label="Toplam" value={allAds.length} color="blue" />
                    </button>
                    <button onClick={()=>{ setAdsStatusF('pending'); setAdsPage(1) }} className={'text-left rounded-xl '+(adsStatusF==='pending'?'ring-2 ring-amber-400':'')}>
                      <KPI label="Bekliyor" value={statusCount('pending')} color="orange" />
                    </button>
                    <button onClick={()=>{ setAdsStatusF('active'); setAdsPage(1) }} className={'text-left rounded-xl '+(adsStatusF==='active'?'ring-2 ring-green-400':'')}>
                      <KPI label="Aktif" value={statusCount('active')} color="green" />
                    </button>
                    <button onClick={()=>{ setAdsStatusF('paused'); setAdsPage(1) }} className={'text-left rounded-xl '+(adsStatusF==='paused'?'ring-2 ring-gray-400':'')}>
                      <KPI label="Durdurulan" value={statusCount('paused')} color="gray" />
                    </button>
                    <button onClick={()=>{ setAdsStatusF('expired'); setAdsPage(1) }} className={'text-left rounded-xl '+(adsStatusF==='expired'?'ring-2 ring-red-400':'')}>
                      <KPI label="Süresi Doldu" value={statusCount('expired')} color="gray" />
                    </button>
                  </div>

                  {/* Performans KPI'ları */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="text-xl mb-1">👁️</div>
                      <div className="text-base sm:text-lg font-extrabold">{totalImpr.toLocaleString('tr-TR')}</div>
                      <div className="text-xs text-gray-500">Toplam gösterim</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="text-xl mb-1">🖱️</div>
                      <div className="text-base sm:text-lg font-extrabold">{totalClicks.toLocaleString('tr-TR')}</div>
                      <div className="text-xs text-gray-500">Toplam tıklama</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
                      <div className="text-xl mb-1">📊</div>
                      <div className="text-base sm:text-lg font-extrabold text-orange-600">{ctr.toFixed(2)}%</div>
                      <div className="text-xs text-orange-700 font-semibold">CTR</div>
                    </div>
                  </div>

                  {/* Pending toplu eylem */}
                  {statusCount('pending') > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-sm font-bold text-amber-700">⏳ {statusCount('pending')} reklam onay bekliyor</div>
                      <button onClick={async()=>{
                        if (!confirm('Bekleyen tüm reklamları onaylamak istiyor musunuz?')) return
                        const pendingIds = allAds.filter(a=>a.status==='pending').map(a=>a.id)
                        if (pendingIds.length===0) return
                        const { error } = await supabase.from('ads').update({status:'active'}).in('id', pendingIds)
                        if (error) { toast3('❌ '+error.message); return }
                        setAllAds(p=>p.map(a=>a.status==='pending'?{...a,status:'active'}:a))
                        toast3('✅ '+pendingIds.length+' reklam onaylandı')
                      }} className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold">✓ Hepsini Onayla</button>
                    </div>
                  )}

                  {/* Filtre çubuğu */}
                  <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex items-center gap-2 flex-wrap">
                    <input className="flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400"
                      placeholder="Başlık, firma veya şehir ara..."
                      value={adsSearch} onChange={e=>{ setAdsSearch(e.target.value); setAdsPage(1) }}/>
                    <select value={adsStatusF} onChange={e=>{ setAdsStatusF(e.target.value); setAdsPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                      <option value="">Tüm Durumlar</option>
                      <option value="pending">⏳ Bekliyor</option>
                      <option value="active">● Aktif</option>
                      <option value="paused">⏸ Durdurulan</option>
                      <option value="expired">❌ Süresi Doldu</option>
                      <option value="rejected">✗ Reddedilen</option>
                    </select>
                    <select value={adsTypeF} onChange={e=>{ setAdsTypeF(e.target.value); setAdsPage(1) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                      <option value="">Tüm Türler</option>
                      <option value="general">🌍 Genel ({typeCount('general')})</option>
                      <option value="regional">📍 Bölgesel ({typeCount('regional')})</option>
                    </select>
                    <select value={adsSort} onChange={e=>setAdsSort(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                      <option value="newest">Yeni → Eski</option>
                      <option value="endsoon">Bitişi yakın</option>
                      <option value="clicks">En çok tıklanan</option>
                      <option value="impressions">En çok gösterilen</option>
                      <option value="firm">Firmaya göre (A-Z)</option>
                    </select>
                  </div>

                  {filteredAds.length===0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center"><div className="text-4xl mb-3">📢</div><div className="text-gray-400">{adsSearch||adsStatusF||adsTypeF?'Sonuç bulunamadı':'Henüz reklam yok'}</div></div>
                  ) : (
                    <>
                    <div className="space-y-3">
                      {pageAds.map(ad => {
                        const sm = statusMeta[ad.status] || statusMeta.pending
                        const days = remainingDays(ad)
                        return (
                        <div key={ad.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <div className="flex items-start gap-4 flex-wrap">
                            {ad.image_url
                              ? <img src={ad.image_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-100"/>
                              : <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-orange-50 text-orange-400">📢</div>
                            }
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-bold text-sm">{ad.businesses?.emoji} {ad.businesses?.name||'—'}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sm.cls}`}>{sm.l}</span>
                                <span className="text-xs text-gray-400">{ad.type==='regional'?'📍 Bölgesel':'🌍 Genel'}</span>
                                {days !== null && (
                                  days <= 0
                                    ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Süresi doldu</span>
                                    : days <= 3
                                      ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">⏳ {days} gün kaldı</span>
                                      : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">{days} gün kaldı</span>
                                )}
                              </div>
                              <div className="font-semibold text-sm">{ad.title}</div>
                              {ad.description && <div className="text-xs text-gray-500 mt-0.5">{ad.description}</div>}
                              <div className="flex gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                                {ad.target_city && <span>📍 {ad.target_city}{ad.target_district?' / '+ad.target_district:''} · {ad.target_radius_km}km</span>}
                                {ad.discount_pct>0 && <span className="text-orange-500 font-bold">%{ad.discount_pct} indirim</span>}
                                <span>👁 {ad.impressions} · 🖱 {ad.clicks} · CTR %{ad.impressions>0?((ad.clicks/ad.impressions)*100).toFixed(1):'0.0'}</span>
                                <span>Bitiş: {new Date(ad.ends_at).toLocaleDateString('tr-TR')}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              {ad.status==='pending' && (
                                <div className="flex gap-1.5">
                                  <button onClick={async()=>{
                                    await supabase.from('ads').update({status:'active'}).eq('id',ad.id)
                                    setAllAds(p=>p.map(a=>a.id===ad.id?{...a,status:'active'}:a))
                                  }} className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold">✓ Onayla</button>
                                  <button onClick={async()=>{
                                    if(!confirm('Reklam reddedilsin mi?')) return
                                    await supabase.from('ads').update({status:'rejected'}).eq('id',ad.id)
                                    setAllAds(p=>p.map(a=>a.id===ad.id?{...a,status:'rejected'}:a))
                                  }} className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg font-bold">Reddet</button>
                                </div>
                              )}
                              <select value={ad.status} onChange={async e=>{
                                const s = e.target.value
                                await supabase.from('ads').update({status:s}).eq('id',ad.id)
                                setAllAds(p=>p.map(a=>a.id===ad.id?{...a,status:s}:a))
                              }} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
                                <option value="pending">⏳ Bekliyor</option>
                                <option value="active">● Aktif</option>
                                <option value="paused">⏸ Durdurulan</option>
                                <option value="expired">❌ Süresi doldu</option>
                                <option value="rejected">✗ Reddedildi</option>
                              </select>
                              <select value={ad.type} onChange={async e=>{
                                const t = e.target.value
                                await supabase.from('ads').update({type:t}).eq('id',ad.id)
                                setAllAds(p=>p.map(a=>a.id===ad.id?{...a,type:t}:a))
                              }} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
                                <option value="general">🌍 Genel</option>
                                <option value="regional">📍 Bölgesel</option>
                              </select>
                              <button onClick={async()=>{
                                if (!confirm('Reklam silinsin mi? (Kontör iade edilmez)')) return
                                const { error } = await supabase.from('ads').delete().eq('id',ad.id)
                                if (error) { toast3('❌ '+error.message); return }
                                setAllAds(p=>p.filter(a=>a.id!==ad.id))
                                toast3('Reklam silindi')
                              }} className="text-xs text-red-500 hover:text-red-700">🗑️ Sil</button>
                            </div>
                          </div>
                        </div>
                        )
                      })}
                    </div>
                    {filteredAds.length > ADS_PAGE_SIZE && (
                      <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-xs text-gray-500">
                          {((safeAdsPage-1)*ADS_PAGE_SIZE)+1}–{Math.min(safeAdsPage*ADS_PAGE_SIZE, filteredAds.length)} / {filteredAds.length} reklam
                        </div>
                        <div className="flex items-center gap-1">
                          <button disabled={safeAdsPage<=1} onClick={()=>setAdsPage(p=>Math.max(1,p-1))}
                            className="px-2.5 py-1 text-xs font-bold rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50">‹ Önceki</button>
                          <span className="text-xs font-bold px-2">Sayfa {safeAdsPage} / {adsTotalPages}</span>
                          <button disabled={safeAdsPage>=adsTotalPages} onClick={()=>setAdsPage(p=>Math.min(adsTotalPages,p+1))}
                            className="px-2.5 py-1 text-xs font-bold rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Sonraki ›</button>
                        </div>
                      </div>
                    )}
                    </>
                  )}
                </div>
                )
              })()}
              {view==='revenue'&&(() => {
                const totalGross = revenueScopedPayments.reduce((s,p)=>s+(+p.amount||0),0)
                const totalComm = totalGross*commissionRate/100
                const thisMonthGross = payments.filter(p=>p.created_at?.startsWith(new Date().toISOString().slice(0,7))).reduce((s,p)=>s+(+p.amount||0),0)
                const lastMonthDate = new Date(); lastMonthDate.setMonth(lastMonthDate.getMonth()-1)
                const lastMonthKey = lastMonthDate.toISOString().slice(0,7)
                const lastMonthGross = payments.filter(p=>p.created_at?.startsWith(lastMonthKey)).reduce((s,p)=>s+(+p.amount||0),0)
                const mom = lastMonthGross > 0 ? Math.round(((thisMonthGross-lastMonthGross)/lastMonthGross)*100) : 0
                const avgTicket = revenueScopedPayments.length > 0 ? totalGross / revenueScopedPayments.length : 0
                const planRev = ['enterprise','pro','free'].map(plan => {
                  const fids = new Set(firms.filter(f=>f.plan===plan).map(f=>f.id))
                  const gross = revenueScopedPayments.filter(p=>fids.has(p.business_id)).reduce((s,p)=>s+(+p.amount||0),0)
                  return { plan, gross, count: firms.filter(f=>f.plan===plan).length }
                })
                const firmRows = firms.filter(f=>f.status==='active').map(f=>{
                  const fp = revenueScopedPayments.filter(p=>p.business_id===f.id)
                  const total = fp.reduce((s,p)=>s+(+p.amount||0),0)
                  return { ...f, _count: fp.length, _total: total, _comm: total*commissionRate/100 }
                }).sort((a,b)=>{
                  if (revSort==='name') return (a.name||'').localeCompare(b.name||'','tr')
                  if (revSort==='count') return b._count - a._count
                  if (revSort==='commission') return b._comm - a._comm
                  return b._total - a._total
                })
                return (
                <div>
                  <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h1 className="text-xl font-bold">Gelir Takibi</h1>
                      <p className="text-sm text-gray-500">Komisyonu güncellersen tüm raporlar yeniden hesaplanır.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
                      <span className="text-xs font-bold text-gray-500">Komisyon:</span>
                      <input type="number" min="0" max="100" value={commissionRate}
                        onChange={e=>setCommissionRate(+e.target.value)}
                        className="w-12 text-center font-bold text-orange-500 outline-none text-sm border-b border-orange-300"/>
                      <span className="text-xs text-gray-400">%</span>
                      <button onClick={async()=>{
                        const { error } = await supabase.from('platform_settings').upsert({key:'commission_rate',value:String(commissionRate),updated_at:new Date().toISOString()})
                        if (error) { toast3('❌ '+error.message); return }
                        toast3('✅ Komisyon oranı güncellendi')
                      }} className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded-lg font-bold">Kaydet</button>
                    </div>
                  </div>

                  {/* Zaman filtresi */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {[['','Tümü'],['thisMonth','Bu Ay'],['last3','Son 3 Ay'],['last12','Son 12 Ay']].map(([k,l])=>(
                      <button key={k||'all'} onClick={()=>setRevFilter(k)}
                        className={'px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors '+(revFilter===k?'bg-orange-500 text-white border-orange-500':'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
                        {l}
                      </button>
                    ))}
                  </div>

                  {/* Ana KPI'lar */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="text-xl mb-2">💳</div>
                      <div className="text-lg font-extrabold mb-0.5 text-gray-800">₺{totalGross.toLocaleString('tr-TR')}</div>
                      <div className="text-xs text-gray-500">Toplam Ciro</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
                      <div className="text-xl mb-2">💰</div>
                      <div className="text-lg font-extrabold mb-0.5 text-orange-600">₺{totalComm.toLocaleString('tr-TR')}</div>
                      <div className="text-xs text-orange-700 font-semibold">Komisyon Geliri (%{commissionRate})</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="text-xl mb-2">📅</div>
                      <div className="text-lg font-extrabold mb-0.5 text-blue-600">₺{thisMonthGross.toLocaleString('tr-TR')}</div>
                      <div className="text-xs text-gray-500">Bu Ay {mom !== 0 && <span className={'font-bold ml-1 '+(mom>=0?'text-green-600':'text-red-600')}>{mom>0?'+':''}{mom}%</span>}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="text-xl mb-2">📊</div>
                      <div className="text-lg font-extrabold mb-0.5 text-green-600">{revenueScopedPayments.length}</div>
                      <div className="text-xs text-gray-500">İşlem · Ort. ₺{avgTicket.toLocaleString('tr-TR',{maximumFractionDigits:0})}</div>
                    </div>
                  </div>

                  {/* Plan bazlı dağılım */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-5">
                    <div className="px-5 py-3 border-b border-gray-100 font-bold text-sm">Plan Bazlı Ciro Dağılımı</div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {planRev.map(({plan,gross,count}) => {
                        const pct = totalGross > 0 ? Math.round(gross/totalGross*100) : 0
                        const cmap = { enterprise:'#3b82f6', pro:'#f97316', free:'#9ca3af' }
                        const lmap = { enterprise:'Enterprise', pro:'Pro', free:'Ücretsiz' }
                        return (
                          <div key={plan} className="border border-gray-100 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{background:cmap[plan]}}/>{lmap[plan]}</span>
                              <span className="text-xs text-gray-400">{count} firma</span>
                            </div>
                            <div className="text-base font-extrabold" style={{color:cmap[plan]}}>₺{gross.toLocaleString('tr-TR')}</div>
                            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{width:pct+'%', background:cmap[plan]}}/>
                            </div>
                            <div className="text-[11px] text-gray-400 mt-1">%{pct} toplam ciro</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Firma bazlı tablo */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                      <span className="font-bold text-sm">Firma Bazlı Gelir <span className="text-xs text-gray-400 font-normal">({firmRows.length} aktif firma)</span></span>
                      <select value={revSort} onChange={e=>setRevSort(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none">
                        <option value="revenue">En çok ciro</option>
                        <option value="commission">En çok komisyon</option>
                        <option value="count">En çok işlem</option>
                        <option value="name">İsme göre (A-Z)</option>
                      </select>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[500px]">
                        <thead className="bg-gray-50"><tr>{['Firma','Plan','İşlem','Ciro','Komisyon'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                        <tbody>
                          {firmRows.map(f=>(
                            <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-3"><div className="font-semibold text-sm">{f.name}</div><div className="text-xs text-gray-400">{f.city}</div></td>
                              <td className="px-4 py-3"><PlanBdg p={f.plan}/></td>
                              <td className="px-4 py-3 text-sm text-gray-600">{f._count}</td>
                              <td className="px-4 py-3 text-sm font-bold">₺{f._total.toLocaleString('tr-TR')}</td>
                              <td className="px-4 py-3 text-sm font-bold text-orange-500">₺{f._comm.toLocaleString('tr-TR',{maximumFractionDigits:0})}</td>
                            </tr>
                          ))}
                          {firmRows.length===0 && <tr><td colSpan="5" className="px-4 py-10 text-center text-gray-400">Bu zaman aralığında ödeme yok</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                )
              })()}
              {view==='plans'&&(
                <div>
                  <h1 className="text-xl font-bold mb-2">Plan Limitleri</h1>
                  <p className="text-sm text-gray-500 mb-5">Firma planlarının limitlerini ve fiyatlarını düzenle. Değişiklikler tüm firmalara yansır.</p>
                  {planRequests.filter(r=>r.status==='pending').length>0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                      <div className="font-bold text-amber-700 text-sm mb-3">⏳ Onay Bekleyen Plan Talepleri ({planRequests.filter(r=>r.status==='pending').length})</div>
                      <div className="space-y-2">
                        {planRequests.filter(r=>r.status==='pending').map(r=>(
                          <div key={r.id} className="flex items-center gap-3 bg-white border border-amber-200 rounded-xl p-3 text-sm">
                            <div className="text-xl">{r.businesses?.emoji||'🏢'}</div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold truncate">{r.businesses?.name||'Firma'}</div>
                              <div className="text-xs text-gray-500">
                                <span className="uppercase">{r.current_plan}</span> → <b className="uppercase text-orange-600">{r.requested_plan}</b>
                                {' · '}{new Date(r.created_at).toLocaleDateString('tr-TR')}
                              </div>
                            </div>
                            <button onClick={()=>approvePlanRequest(r.id)} className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">✓ Onayla</button>
                            <button onClick={()=>rejectPlanRequest(r.id)} className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">✗ Reddet</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {planLimits.map(p=>{
                      const planLabels = {free:'Ücretsiz', pro:'Pro', enterprise:'Enterprise'}
                      const colors = {free:'#9ca3af', pro:'#f97316', enterprise:'#1e293b'}
                      return (
                        <div key={p.plan} className="bg-white border-2 rounded-xl p-5 shadow-sm" style={{borderColor:colors[p.plan]||'#d1d5db'}}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-extrabold text-lg" style={{color:colors[p.plan]||'#374151'}}>{planLabels[p.plan]||p.plan}</div>
                            <span className="text-xs font-bold uppercase px-2 py-1 rounded-full text-white" style={{background:colors[p.plan]||'#9ca3af'}}>{p.plan}</span>
                          </div>
                          <div className="space-y-2">
                            {[
                              ['price_monthly','Aylık Fiyat (₺)','number'],
                              ['max_staff','Max Personel','number'],
                              ['max_services','Max Hizmet','number'],
                              ['max_monthly_appts','Max Aylık Randevu','number'],
                              ['max_gallery_images','Max Galeri Görseli','number'],
                              ['max_ads','Max Reklam','number'],
                              ['max_ad_images','Reklam Başına Max Görsel','number'],
                              ['loyalty_points_per_appt','Randevu Başı Puan','number'],
                            ].map(([key,label,type])=>(
                              <div key={key}>
                                <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>
                                <input type={type} value={p[key]||0}
                                  onChange={e=>updatePlanField(p.plan, key, type==='number'?+e.target.value:e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" />
                              </div>
                            ))}
                            <div className="grid grid-cols-3 gap-2 pt-2">
                              {[['has_analytics','📊 Analitik'],['has_sms','📱 SMS'],['has_custom_domain','🌐 Domain']].map(([key,label])=>(
                                <button key={key} onClick={()=>updatePlanField(p.plan, key, !p[key])}
                                  className={'py-2 rounded-lg text-xs font-bold transition-colors '+(p[key]?'bg-green-500 text-white':'bg-gray-100 text-gray-400')}>
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button onClick={()=>{
                            const { plan, ...rest } = p
                            savePlanLimit(p.plan, rest)
                          }} disabled={planSaving===p.plan}
                            className="w-full mt-4 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-60"
                            style={{background:colors[p.plan]||'#9ca3af'}}>
                            {planSaving===p.plan?'Kaydediliyor...':'💾 Bu Planı Kaydet'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  {planLimits.length===0 && <div className="text-center py-12 text-gray-400">Plan tanımı yok</div>}
                </div>
              )}

              {view==='adpkgs'&&(
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h1 className="text-xl font-bold">Reklam Paketleri</h1>
                      <p className="text-sm text-gray-500">Firmalara satılacak reklam paketlerini yönet</p>
                    </div>
                    <button onClick={openPkgAdd} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">{T('addPackage')}</button>
                  </div>

                  {/* Platform geneli kontör KPI'leri */}
                  {(() => {
                    const now = new Date()
                    const active = adPurchases.filter(p => p.status==='approved' && (!p.expires_at || new Date(p.expires_at) > now))
                    const totalSold = adPurchases.filter(p => p.status==='approved' || p.status==='expired').reduce((s,p)=>s+(p.credits_total||0),0)
                    const totalUsed = adPurchases.filter(p => p.status==='approved' || p.status==='expired').reduce((s,p)=>s+(p.credits_used||0),0)
                    const activeRemaining = active.reduce((s,p)=>s+Math.max(0,(p.credits_total||0)-(p.credits_used||0)),0)
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
                        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Aktif Kalan</div>
                          <div className="text-2xl font-extrabold text-green-600 mt-0.5">{activeRemaining}</div>
                          <div className="text-[11px] text-gray-400">kullanılabilir kontör</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kullanılan</div>
                          <div className="text-2xl font-extrabold text-orange-500 mt-0.5">{totalUsed}</div>
                          <div className="text-[11px] text-gray-400">oluşturulan reklam</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Toplam Satılan</div>
                          <div className="text-2xl font-extrabold text-gray-700 mt-0.5">{totalSold}</div>
                          <div className="text-[11px] text-gray-400">tüm zamanlar</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Aktif Paket</div>
                          <div className="text-2xl font-extrabold text-blue-600 mt-0.5">{active.length}</div>
                          <div className="text-[11px] text-gray-400">firmada</div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Pending satın almalar */}
                  {adPurchases.filter(p=>p.status==='pending').length>0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                      <div className="font-bold text-amber-700 text-sm mb-3">⏳ Onay Bekleyen Satın Almalar ({adPurchases.filter(p=>p.status==='pending').length})</div>
                      <div className="space-y-2">
                        {adPurchases.filter(p=>p.status==='pending').map(p=>{
                          const pkg = adPackages.find(x => x.id === p.package_id)
                          const grantCredits = pkg?.ad_credits || 1
                          return (
                          <div key={p.id} className="bg-white border border-amber-200 rounded-lg p-3 flex items-center gap-3">
                            <div className="text-2xl">{p.businesses?.emoji||'🏢'}</div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm truncate">{p.businesses?.name||'Firma'}</div>
                              <div className="text-xs text-gray-500">{p.package_name} — ₺{p.price_at_purchase}</div>
                              <div className="text-[11px] text-green-700 font-bold mt-0.5">Onaylanırsa firmaya 🎟️ {grantCredits} kontör tanımlanacak</div>
                            </div>
                            <button onClick={()=>approvePurchase(p.id)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold">✓ Onayla</button>
                            <button onClick={()=>rejectPurchase(p.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-bold">✗</button>
                          </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Paket kartları */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    {adPackages.map(pkg=>(
                      <div key={pkg.id} className={'border-2 rounded-xl p-5 shadow-sm relative '+(pkg.is_popular?'border-orange-500 bg-orange-50':'border-gray-200 bg-white')}>
                        {pkg.is_popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">⭐ Popüler</div>}
                        {pkg.badge && <div className="text-3xl mb-2">{pkg.badge}</div>}
                        <div className="font-extrabold text-lg mb-1">{pkg.name}</div>
                        {pkg.description && <div className="text-xs text-gray-500 mb-3">{pkg.description}</div>}
                        <div className="text-2xl font-extrabold text-orange-500 mb-2">₺{pkg.price}<span className="text-sm text-gray-400 font-normal"> / {pkg.duration_days} gün</span></div>
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 text-[11px] font-bold px-2 py-0.5 rounded-full">🎟️ {pkg.ad_credits||1} kontör</span>
                          {pkg.max_clicks>0 && <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold px-2 py-0.5 rounded-full">🖱 {pkg.max_clicks.toLocaleString('tr-TR')} tık</span>}
                          {pkg.max_impressions>0 && <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold px-2 py-0.5 rounded-full">👁 {pkg.max_impressions.toLocaleString('tr-TR')} gösterim</span>}
                          <span className={'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border '+(pkg.allow_regional!==false?'bg-amber-50 text-amber-700 border-amber-200':'bg-gray-100 text-gray-500 border-gray-200')}>
                            {pkg.allow_regional!==false?'📍 Bölgesel':'🌍 Sadece genel'}
                          </span>
                        </div>
                        <ul className="space-y-1 mb-4">
                          {(pkg.features||[]).map((f,i)=>(
                            <li key={i} className="flex items-center gap-2 text-xs text-gray-600"><span className="text-green-500">✓</span>{f}</li>
                          ))}
                        </ul>
                        <div className="flex gap-2">
                          <button onClick={()=>openPkgEdit(pkg)} className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold">✏️ Düzenle</button>
                          <button onClick={()=>deletePkg(pkg.id, pkg.name)} className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold">🗑️</button>
                        </div>
                        <div className="mt-2 text-xs text-gray-400">Durum: <b className={pkg.status==='active'?'text-green-600':'text-gray-400'}>{pkg.status==='active'?'Aktif':'Pasif'}</b></div>
                      </div>
                    ))}
                    {adPackages.length===0 && <div className="col-span-3 text-center py-12 text-gray-400">Paket yok — <button onClick={openPkgAdd} className="text-orange-500 hover:underline">ilkini ekle</button></div>}
                  </div>

                  {/* Onaylı satın almalar (geçmiş) */}
                  {adPurchases.filter(p=>p.status!=='pending').length>0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="font-bold text-sm mb-3">📋 Satın Alma Geçmişi ({adPurchases.filter(p=>p.status!=='pending').length})</div>
                      <div className="space-y-2">
                        {adPurchases.filter(p=>p.status!=='pending').slice(0,10).map(p=>{
                          const total = p.credits_total||0
                          const used = p.credits_used||0
                          const remaining = Math.max(0, total - used)
                          return (
                          <div key={p.id} className="border border-gray-100 rounded-lg p-3 flex items-center gap-3 text-sm flex-wrap">
                            <div className="text-xl">{p.businesses?.emoji||'🏢'}</div>
                            <div className="flex-1 min-w-0"><b>{p.businesses?.name}</b> — {p.package_name}</div>
                            {(p.status==='approved' || p.status==='expired') && total > 0 && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200" title={`Toplam ${total} · Kullanılan ${used} · Kalan ${remaining}`}>
                                🎟️ {remaining}/{total}
                              </span>
                            )}
                            <span className={'text-xs font-bold px-2 py-0.5 rounded-full border '+
                              (p.status==='approved'?'bg-green-50 text-green-700 border-green-200':p.status==='rejected'?'bg-red-50 text-red-600 border-red-200':'bg-gray-100 text-gray-600 border-gray-200')}>
                              {p.status==='approved'?'Onaylandı':p.status==='rejected'?'Reddedildi':p.status==='expired'?'Süresi Doldu':p.status}
                            </span>
                            <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('tr-TR')}</span>
                          </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {view==='coupons'&&(() => {
                const adminCoupons = coupons.filter(c => !c.business_id)
                const bizCoupons   = coupons.filter(c =>  c.business_id)
                const filteredCoupons = couponOwnerF==='admin' ? adminCoupons : couponOwnerF==='business' ? bizCoupons : coupons
                return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h1 className="text-xl font-bold">Kuponlar</h1>
                      <p className="text-sm text-gray-500">Hem <b>platform geneli</b> (admin) hem de <b>firmaların kendi</b> oluşturduğu kuponlar burada listelenir.</p>
                    </div>
                    <button onClick={openCouponAdd} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg">{T('addCoupon')}</button>
                  </div>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {[['', 'Tümü', coupons.length], ['admin', '👑 Platform (Admin)', adminCoupons.length], ['business', '🏢 Firma Kuponu', bizCoupons.length]].map(([k,l,c])=>(
                      <button key={k||'all'} onClick={()=>setCouponOwnerF(k)}
                        className={'px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors '+(couponOwnerF===k?'bg-orange-500 text-white border-orange-500':'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
                        {l} <span className="opacity-70">({c})</span>
                      </button>
                    ))}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead className="bg-gray-50"><tr>{['Kod','Sahip','İndirim','Kullanım','Geçerlilik','Durum','İşlem'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredCoupons.map(c=>(
                          <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              <div className="font-mono font-bold uppercase">{c.code}</div>
                              {c.description && <div className="text-xs text-gray-500">{c.description}</div>}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {c.business_id ? (
                                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2 py-0.5 rounded-full">🏢 {c.businesses?.name||'Firma'}</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 font-bold px-2 py-0.5 rounded-full">👑 Platform</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {c.discount_pct>0 && <span className="bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded mr-1">%{c.discount_pct}</span>}
                              {c.discount_amount>0 && <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">₺{c.discount_amount}</span>}
                              {c.min_amount>0 && <div className="text-[10px] text-gray-400 mt-0.5">min ₺{c.min_amount}</div>}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <b>{c.used_count}</b>{c.max_uses ? ' / '+c.max_uses : ''}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {c.valid_until ? new Date(c.valid_until).toLocaleDateString('tr-TR') : 'Sınırsız'}
                            </td>
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
                        {filteredCoupons.length===0 && <tr><td colSpan="7" className="px-4 py-12 text-center text-gray-400">Kupon yok — <button onClick={openCouponAdd} className="text-orange-500 hover:underline">ilkini ekle</button></td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
                )
              })()}

              {view==='subscriptions'&&(() => {
                const planMeta = {
                  enterprise: { label:'Enterprise', color:'#3b82f6', kpi:'blue',   price:750 },
                  pro:        { label:'Pro',        color:'#f97316', kpi:'orange', price:300 },
                  free:       { label:'Ücretsiz',   color:'#6b7280', kpi:'gray',   price:0   },
                }
                const planOrder = ['enterprise','pro','free']
                const sQ = subsSearch.toLowerCase()
                const filterFirm = f => !sQ || f.name.toLowerCase().includes(sQ) || (f.email||'').toLowerCase().includes(sQ) || (f.city||'').toLowerCase().includes(sQ)
                const grouped = planOrder.map(p => ({
                  plan: p,
                  meta: planMeta[p],
                  list: firms.filter(f => f.plan === p).filter(filterFirm)
                }))
                const monthlyTotal = (planCounts.enterprise||0)*planMeta.enterprise.price + (planCounts.pro||0)*planMeta.pro.price
                return (
                <div>
                  <h1 className="text-xl font-bold mb-1">Abonelikler</h1>
                  <p className="text-sm text-gray-500 mb-5">Aylık tahmini gelir: <b className="text-orange-500">₺{monthlyTotal.toLocaleString('tr-TR')}</b></p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
                    <KPI label="Enterprise" value={planCounts.enterprise||0} sub={`₺${((planCounts.enterprise||0)*planMeta.enterprise.price).toLocaleString('tr-TR')}/ay`} color="blue" />
                    <KPI label="Pro Plan" value={planCounts.pro||0} sub={`₺${((planCounts.pro||0)*planMeta.pro.price).toLocaleString('tr-TR')}/ay`} color="orange" />
                    <KPI label="Ücretsiz" value={planCounts.free||0} sub="Deneme" color="gray" />
                  </div>
                  <div className="mb-4">
                    <input className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400 bg-white"
                      placeholder="Firma adı veya e-posta ara..." value={subsSearch} onChange={e=>setSubsSearch(e.target.value)} />
                  </div>
                  <div className="space-y-4">
                    {grouped.map(g => (
                      <div key={g.plan} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between" style={{background:g.meta.color+'08'}}>
                          <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full" style={{background:g.meta.color}}/>
                            <span className="font-bold text-sm">{g.meta.label}</span>
                            <span className="text-xs text-gray-500">{g.list.length} firma</span>
                          </div>
                          <div className="text-xs font-bold" style={{color:g.meta.color}}>
                            {g.meta.price>0 ? `₺${(g.list.length*g.meta.price).toLocaleString('tr-TR')}/ay` : '—'}
                          </div>
                        </div>
                        {g.list.length === 0 ? (
                          <div className="px-5 py-6 text-center text-sm text-gray-400">Bu planda firma yok</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px]">
                              <thead className="bg-gray-50"><tr>{['Firma','Şehir','Durum','Plan değiştir'].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                              <tbody>
                                {g.list.map(f=>(
                                  <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">
                                      <div className="font-semibold">{f.name}</div>
                                      {f.email && <div className="text-xs text-gray-400">{f.email}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{f.city||'—'}</td>
                                    <td className="px-4 py-3"><StatusBdg s={f.status} /></td>
                                    <td className="px-4 py-3">
                                      <select value={f.plan} onChange={async e=>{
                                        const p=e.target.value
                                        await supabase.from('businesses').update({plan:p}).eq('id',f.id)
                                        setFirms(prev=>prev.map(x=>x.id===f.id?{...x,plan:p}:x))
                                      }} className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-orange-400">
                                        <option value="free">Ücretsiz</option>
                                        <option value="pro">Pro</option>
                                        <option value="enterprise">Enterprise</option>
                                      </select>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                )
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
