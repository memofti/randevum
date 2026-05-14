'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { t as i18n } from '@/lib/i18n'
import dynamic from 'next/dynamic'
import AdBanner from '@/app/components/customer/AdBanner'
import BookingModal from '@/app/components/customer/BookingModal'
import BusinessDetailModal from '@/app/components/customer/BusinessDetailModal'
import QRModal from '@/app/components/customer/QRModal'
import ProfileTab from '@/app/components/customer/ProfileTab'
import AppointmentsTab from '@/app/components/customer/AppointmentsTab'

const MapView = dynamic(() => import('@/app/components/MapView'), { ssr: false })

const GOLD = '#d4af37'
const GOLD2 = '#f5e06e'

function distKm(a,b,c,d){const R=6371,dL=(c-a)*Math.PI/180,dN=(d-b)*Math.PI/180,e=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dN/2)**2;return R*2*Math.atan2(Math.sqrt(e),Math.sqrt(1-e))}

export default function LuxuryTheme(props) {
  const { user, businesses, activeAds, tab, setTab, openDetail, detailBiz, bizServices, bizStaff, detailLoading, bookModal, setBookModal, setDetailBiz, activeAdDiscount, paymentEnabled, toast3, userLoc, searchQ, setSearchQ, catFilter, setCatFilter, sortBy, setSortBy, upcomingAppts, uiLang='tr', saveBooking } = props
  const T = (k) => i18n(k, uiLang)
  const [heroVisible, setHeroVisible] = useState(false)
  useEffect(() => { const t = setTimeout(()=>setHeroVisible(true), 50); return ()=>clearTimeout(t) }, [])

  const filteredBiz = businesses
    .filter(b => (!catFilter || b.category === catFilter) && (!searchQ || b.name.toLowerCase().includes(searchQ.toLowerCase())))
    .map(b => ({ ...b, dist: userLoc && b.lat && b.lng ? distKm(userLoc.lat, userLoc.lng, parseFloat(b.lat), parseFloat(b.lng)) : null }))
    .sort((a, b) => sortBy === 'distance' ? (a.dist??9999)-(b.dist??9999) : (b.rating||0)-(a.rating||0))

  // Editorial layout: hero feature + grid + dense list
  const featured = filteredBiz[0]
  const editorial = filteredBiz.slice(1, 5)
  const rest = filteredBiz.slice(5)

  return (
    <div className="min-h-screen" style={{background:'#0a0a0a',color:'#fff'}}>
      {/* NAV - Luxury koyu */}
      <nav style={{background:'rgba(17,17,17,0.85)',borderBottom:'1px solid #222',backdropFilter:'blur(12px)'}} className="h-16 flex items-center px-6 gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{background:`linear-gradient(135deg,${GOLD},${GOLD2})`}}>📅</div>
          <span className="font-black text-lg tracking-widest" style={{color:GOLD}}>RANDEVU</span>
        </div>
        {[['home',T('discover')],['map',T('map')],['appts',T('appointments')],['profile',T('profile')]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className="text-sm font-semibold transition-all px-3 py-1.5 rounded-lg tracking-wider"
            style={tab===k?{color:GOLD,background:'rgba(212,175,55,0.1)'}:{color:'rgba(255,255,255,0.4)'}}>
            {l.toUpperCase()}
            {k==='appts' && upcomingAppts?.length>0 && <span className="ml-1.5 text-xs rounded-full px-1.5 py-0.5" style={{background:GOLD,color:'#000'}}>{upcomingAppts.length}</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{background:`linear-gradient(135deg,${GOLD},${GOLD2})`,color:'#000'}}>{user.name?.[0]||'?'}</div>
          <button onClick={async()=>{ await supabase.auth.signOut(); localStorage.removeItem('randevu_user'); window.location.href='/login' }} style={{color:'rgba(255,255,255,0.3)'}} className="text-sm">{T('logout')}</button>
        </div>
      </nav>

      {tab === 'home' && (
        <>
          {/* HERO — animated editorial */}
          <div className="relative overflow-hidden" style={{background:'linear-gradient(180deg,#111 0%,#0a0a0a 100%)'}}>
            {/* Subtle gold orbs */}
            <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full pointer-events-none" style={{background:'radial-gradient(circle, rgba(212,175,55,0.15), transparent 70%)'}}/>
            <div className="absolute top-40 -right-32 w-[28rem] h-[28rem] rounded-full pointer-events-none" style={{background:'radial-gradient(circle, rgba(245,224,110,0.08), transparent 70%)'}}/>
            <div className="absolute inset-0 pointer-events-none opacity-30" style={{backgroundImage:'radial-gradient(circle at 1px 1px, rgba(212,175,55,0.3) 1px, transparent 0)',backgroundSize:'40px 40px'}}/>

            <div className="py-24 px-6 text-center relative z-10">
              <div className="max-w-3xl mx-auto">
                <div className={'text-xs tracking-[0.4em] mb-6 transition-all duration-700 '+(heroVisible?'opacity-100 translate-y-0':'opacity-0 -translate-y-4')} style={{color:GOLD}}>—— PREMIUM RANDEVU KOLEKSİYONU ——</div>
                <h1 className={'font-black mb-6 tracking-tight transition-all duration-700 delay-100 '+(heroVisible?'opacity-100 translate-y-0':'opacity-0 translate-y-4')}
                    style={{fontSize:'clamp(2.5rem,6vw,4.5rem)',lineHeight:1.05,color:'#fff'}}>
                  Seçkin İşletmeler,<br/>
                  <span style={{background:`linear-gradient(135deg,${GOLD} 0%,${GOLD2} 50%,${GOLD} 100%)`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Kişiselleştirilmiş</span> Randevu.
                </h1>
                <p className={'mb-12 max-w-xl mx-auto leading-relaxed transition-all duration-700 delay-200 '+(heroVisible?'opacity-100 translate-y-0':'opacity-0 translate-y-4')}
                   style={{color:'rgba(255,255,255,0.5)',fontSize:'1.05rem'}}>
                  Premium kuaförler, masaj salonları ve güzellik merkezleri. Tek dokunuşla rezervasyon, sınırsız ayrıcalık.
                </p>
                <div className={'flex rounded-2xl overflow-hidden max-w-xl mx-auto transition-all duration-700 delay-300 '+(heroVisible?'opacity-100 translate-y-0':'opacity-0 translate-y-4')}
                     style={{border:'1px solid rgba(212,175,55,0.3)',boxShadow:'0 20px 60px -20px rgba(212,175,55,0.2)'}}>
                  <input className="flex-1 px-6 py-4 text-sm outline-none" style={{background:'rgba(255,255,255,0.04)',color:'#fff'}} placeholder="İşletme, kategori veya şehir ara…"
                    value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                  <button className="px-8 py-4 text-sm font-bold tracking-widest" style={{background:`linear-gradient(135deg,${GOLD},${GOLD2})`,color:'#000'}}>ARA →</button>
                </div>
                <div className={'flex gap-2 mt-8 flex-wrap justify-center items-center transition-all duration-700 delay-500 '+(heroVisible?'opacity-100':'opacity-0')}>
                  {[{v:'',l:'TÜMÜ'},{v:'Güzellik',l:'GÜZELLİK'},{v:'Kuaför',l:'KUAFÖR'},{v:'Masaj',l:'MASAJ'},{v:'Fitness',l:'FİTNESS'},{v:'Sağlık',l:'SAĞLIK'}].map(({v,l})=>{
                    const active = (!v&&!catFilter)||(catFilter===v&&v!=='')
                    return (
                      <button key={v} onClick={()=>setCatFilter(v===catFilter&&v!==''?'':v)}
                        className="px-5 py-2 text-xs font-semibold tracking-[0.2em] rounded-full transition-all"
                        style={active?{background:GOLD,color:'#000',border:`1px solid ${GOLD}`}:{background:'transparent',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.12)'}}>
                        {l}
                      </button>
                    )
                  })}
                  <span className="text-[10px] tracking-[0.3em] hidden sm:inline" style={{color:'rgba(255,255,255,0.3)'}}>·</span>
                  <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                    className="px-4 py-2 text-xs font-semibold tracking-[0.2em] rounded-full outline-none cursor-pointer transition-all"
                    style={{background:'transparent',color:GOLD,border:`1px solid ${GOLD}66`}}>
                    <option value="rating" style={{background:'#111',color:GOLD}}>★ EN POPÜLER</option>
                    <option value="distance" style={{background:'#111',color:GOLD}}>📍 EN YAKIN</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-14">
            {activeAds.length > 0 && <div className="mb-10"><AdBanner ads={activeAds} userLoc={userLoc} businesses={businesses} onBizDetail={openDetail} variant="luxury" uiLang={uiLang}/></div>}

            {/* SECTION 1 — Featured editorial */}
            {featured && (
              <div className="mb-16">
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-[10px] tracking-[0.4em] font-bold" style={{color:GOLD}}>EDİTÖR SEÇİMİ</div>
                  <div className="flex-1 h-px" style={{background:'linear-gradient(to right, rgba(212,175,55,0.4), transparent)'}}/>
                </div>
                <div onClick={()=>openDetail(featured)}
                  className="relative grid grid-cols-1 md:grid-cols-2 gap-0 rounded-2xl overflow-hidden cursor-pointer group"
                  style={{background:'#0f0f0f',border:'1px solid #1a1a1a'}}>
                  <div className="h-72 md:h-96 relative overflow-hidden" style={{background:'#1a1a1a'}}>
                    {featured.cover_url
                      ? <img src={featured.cover_url} alt={featured.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                      : <div className="w-full h-full flex items-center justify-center text-8xl">{featured.emoji||'🏢'}</div>}
                    <div className="absolute inset-0" style={{background:'linear-gradient(to right, transparent 50%, rgba(15,15,15,1) 100%)'}}/>
                  </div>
                  <div className="p-8 md:p-10 flex flex-col justify-center">
                    <div className="text-[10px] tracking-[0.3em] mb-3" style={{color:GOLD}}>{(featured.category||'').toUpperCase()} · {(featured.city||'').toUpperCase()}</div>
                    <h3 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">{featured.name}</h3>
                    {featured.bio && <p className="mb-6 leading-relaxed" style={{color:'rgba(255,255,255,0.55)'}}>{featured.bio.slice(0, 160)}{featured.bio.length>160?'…':''}</p>}
                    <div className="flex items-center gap-4 mb-6 text-xs">
                      <span className="font-bold" style={{color:GOLD}}>★ {featured.rating}</span>
                      <span style={{color:'rgba(255,255,255,0.3)'}}>·</span>
                      <span style={{color:'rgba(255,255,255,0.5)'}}>{featured.review_count||0} değerlendirme</span>
                      <span style={{color:'rgba(255,255,255,0.3)'}}>·</span>
                      <span style={{color:'rgba(255,255,255,0.5)'}}>₺{featured.price_from}'den</span>
                    </div>
                    <button onClick={e=>{e.stopPropagation();openDetail(featured)}}
                      className="self-start text-xs font-bold px-7 py-3 rounded-full tracking-[0.3em]"
                      style={{background:`linear-gradient(135deg,${GOLD},${GOLD2})`,color:'#000'}}>
                      REZERVASYON →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2 — Editorial cards (2x2) */}
            {editorial.length > 0 && (
              <div className="mb-16">
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-[10px] tracking-[0.4em] font-bold" style={{color:GOLD}}>SEÇKİN MEKÂNLAR</div>
                  <div className="flex-1 h-px" style={{background:'linear-gradient(to right, rgba(212,175,55,0.4), transparent)'}}/>
                  <div className="text-[10px] tracking-widest" style={{color:'rgba(255,255,255,0.35)'}}>{filteredBiz.length} İŞLETME</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {editorial.map((b) => (
                    <div key={b.id} onClick={()=>openDetail(b)} className="group cursor-pointer rounded-2xl overflow-hidden transition-all hover:-translate-y-1"
                      style={{background:'#0f0f0f',border:'1px solid #1a1a1a'}}>
                      <div className="h-56 relative overflow-hidden" style={{background:'#1a1a1a'}}>
                        {b.cover_url
                          ? <img src={b.cover_url} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                          : <div className="w-full h-full flex items-center justify-center text-6xl">{b.emoji||'🏢'}</div>}
                        <div className="absolute inset-0" style={{background:'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)'}}/>
                        <div className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full" style={{background:'rgba(0,0,0,0.6)',color:GOLD,border:'1px solid rgba(212,175,55,0.3)',backdropFilter:'blur(8px)'}}>★ {b.rating}</div>
                        <div className="absolute bottom-4 left-5 right-5">
                          <div className="text-[10px] tracking-[0.3em] mb-1" style={{color:GOLD}}>{(b.category||'').toUpperCase()}</div>
                          <div className="font-black text-xl text-white tracking-tight">{b.name}</div>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div className="text-xs" style={{color:'rgba(255,255,255,0.5)'}}>{b.city} · ₺{b.price_from}'den</div>
                        <span className="text-xs font-bold tracking-widest" style={{color:GOLD}}>REZERVE ET →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3 — Dense list */}
            {rest.length > 0 && (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-[10px] tracking-[0.4em] font-bold" style={{color:GOLD}}>TÜM İŞLETMELER</div>
                  <div className="flex-1 h-px" style={{background:'linear-gradient(to right, rgba(212,175,55,0.4), transparent)'}}/>
                </div>
                <div className="space-y-px rounded-2xl overflow-hidden" style={{background:'#1a1a1a'}}>
                  {rest.map(b => (
                    <div key={b.id} onClick={()=>openDetail(b)}
                      className="flex items-center gap-5 px-5 py-4 cursor-pointer transition-all hover:bg-white/[0.02]"
                      style={{background:'#0f0f0f'}}>
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{background:'#1a1a1a'}}>
                        {b.cover_url
                          ? <img src={b.cover_url} alt={b.name} className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center text-2xl">{b.emoji||'🏢'}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-base text-white truncate">{b.name}</div>
                        <div className="text-xs truncate" style={{color:'rgba(255,255,255,0.4)'}}>{b.category} · {b.city}</div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold" style={{color:GOLD}}>★ {b.rating}</div>
                        <div className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>₺{b.price_from}'den</div>
                      </div>
                      <div className="text-xs font-bold tracking-widest" style={{color:GOLD}}>→</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredBiz.length === 0 && (
              <div className="text-center py-24" style={{color:'rgba(255,255,255,0.3)'}}>
                <div className="text-5xl mb-4 opacity-40">🔍</div>
                Aradığınız kriterlere uygun işletme bulunamadı
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'map' && <MapView businesses={businesses} onBook={(biz)=>{setDetailBiz(biz);setTab('home')}}/>}
      {tab === 'appts' && <AppointmentsTab {...props} variant="luxury" />}
      {tab === 'profile' && <ProfileTab {...props} variant="luxury" />}

      <BusinessDetailModal biz={detailBiz} bizIdx={businesses.findIndex(b=>b.id===detailBiz?.id)} services={bizServices} staff={bizStaff} loading={detailLoading} onClose={()=>setDetailBiz(null)} onBook={()=>setBookModal(true)} variant="luxury" uiLang={uiLang}/>
      <BookingModal biz={bookModal&&detailBiz?detailBiz:null} services={bizServices} staff={bizStaff} onClose={()=>setBookModal(false)} onBook={saveBooking} toast3={toast3} paymentEnabled={paymentEnabled} discount={activeAdDiscount} variant="luxury" uiLang={uiLang} userId={user?.id}/>
      <QRModal qrModal={props.qrModal} setQrModal={props.setQrModal} />
    </div>
  )
}
