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

function distKm(a,b,c,d){const R=6371,dL=(c-a)*Math.PI/180,dN=(d-b)*Math.PI/180,e=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dN/2)**2;return R*2*Math.atan2(Math.sqrt(e),Math.sqrt(1-e))}

// Refined palette
const INK = '#111111'
const PAPER = '#fbfaf6'   // very soft warm white
const MUTED = '#8a8580'
const OLIVE = '#5d6d3e'   // secondary accent — warm deep olive
const TERRA = '#b04a3a'   // primary accent — warm terracotta
const SANS = "-apple-system, 'SF Pro Display', 'Inter', 'Helvetica Neue', system-ui, sans-serif"

export default function MinimalTheme(props) {
  const { user, businesses, activeAds, tab, setTab, openDetail, detailBiz, bizServices, bizStaff, detailLoading, bookModal, setBookModal, setDetailBiz, activeAdDiscount, paymentEnabled, toast3, userLoc, searchQ, setSearchQ, catFilter, setCatFilter, sortBy, setSortBy, qrModal, setQrModal, upcomingAppts, uiLang='tr', saveBooking } = props
  const T = (k) => i18n(k, uiLang)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(()=>setMounted(true), 30); return ()=>clearTimeout(t) }, [])

  const filteredBiz = businesses
    .filter(b => (!catFilter || b.category === catFilter) && (!searchQ || b.name.toLowerCase().includes(searchQ.toLowerCase())))
    .map(b => ({ ...b, dist: userLoc && b.lat && b.lng ? distKm(userLoc.lat, userLoc.lng, parseFloat(b.lat), parseFloat(b.lng)) : null }))
    .sort((a, b) => sortBy === 'distance' ? (a.dist??9999)-(b.dist??9999) : (b.rating||0)-(a.rating||0))

  const featured = filteredBiz[0]
  const rest = filteredBiz.slice(1)

  return (
    <div className="min-h-screen" style={{background:PAPER,color:INK,fontFamily:SANS,fontFeatureSettings:'"ss01","cv11","kern"'}}>
      {/* NAV — ince, sade */}
      <header className="sticky top-0 z-40" style={{background:PAPER+'ee',backdropFilter:'blur(12px)',borderBottom:'1px solid '+INK+'14'}}>
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-5 flex items-center gap-6">
          <div className="font-bold text-base tracking-tight" style={{letterSpacing:'-0.02em'}}>
            randevu<span style={{color:TERRA}}>.</span>
          </div>
          <nav className="ml-auto flex items-center gap-1">
            {[['home',T('discover')],['map',T('map')],['appts',T('appointments')],['profile',T('profile')]].map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)}
                className="text-sm font-medium px-3 py-1.5 rounded-full transition-all"
                style={tab===k?{color:INK,background:INK+'0a'}:{color:MUTED}}>
                {l}
                {k==='appts' && upcomingAppts?.length>0 && <span className="ml-1.5 text-[10px] rounded-full px-1.5 py-0.5" style={{background:TERRA,color:'#fff'}}>{upcomingAppts.length}</span>}
              </button>
            ))}
            <button onClick={async()=>{ await supabase.auth.signOut(); localStorage.removeItem('randevu_user'); window.location.href='/login' }} className="ml-3 text-sm font-medium" style={{color:MUTED}}>{T('logout')}</button>
          </nav>
        </div>
      </header>

      {tab === 'home' && (
        <main className="max-w-[1200px] mx-auto px-6 sm:px-10">
          {/* HERO — minimal, tek odak */}
          <section className={'py-16 sm:py-24 transition-all duration-700 '+(mounted?'opacity-100 translate-y-0':'opacity-0 translate-y-3')}>
            <h1 className="font-bold mb-7 tracking-tight" style={{fontSize:'clamp(2.75rem,7.5vw,5.5rem)',lineHeight:1.0,letterSpacing:'-0.045em',color:INK}}>
              İyi şeyler, <span style={{color:OLIVE,fontStyle:'italic',fontWeight:500}}>doğru zamanda.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed mb-10" style={{color:MUTED}}>
              Şehirde özenle seçilmiş işletmeler. Tek bir tıklama.
            </p>
            <div className="flex items-center max-w-2xl" style={{borderBottom:'1.5px solid '+INK}}>
              <input className="flex-1 py-4 text-base outline-none bg-transparent" style={{color:INK}} placeholder="Mekân, kategori, şehir…"
                value={searchQ} onChange={e => setSearchQ(e.target.value)} />
              <button className="text-sm font-semibold px-3 py-3" style={{color:TERRA}}>Ara →</button>
            </div>
          </section>

          {/* CATEGORY — sade pill row */}
          <div className="flex items-center gap-1.5 mb-12 overflow-x-auto pb-1 -mx-1 px-1">
            {[{v:'',l:'Tümü'},{v:'Güzellik',l:'Güzellik'},{v:'Kuaför',l:'Kuaför'},{v:'Masaj',l:'Masaj'},{v:'Fitness',l:'Fitness'},{v:'Sağlık',l:'Sağlık'}].map(({v,l})=>{
              const active = (!v&&!catFilter)||(catFilter===v&&v!=='')
              return (
                <button key={v} onClick={()=>setCatFilter(v===catFilter&&v!==''?'':v)}
                  className="text-sm font-medium whitespace-nowrap px-4 py-2 rounded-full transition-all"
                  style={active?{background:INK,color:PAPER}:{color:MUTED,border:'1px solid '+INK+'1a'}}>
                  {l}
                </button>
              )
            })}
            <div className="ml-auto flex items-center gap-2 text-sm" style={{color:MUTED}}>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="bg-transparent text-sm font-medium outline-none" style={{color:INK}}>
                <option value="rating">En yüksek puan</option>
                <option value="distance">Bana en yakın</option>
              </select>
            </div>
          </div>

          {activeAds.length > 0 && <div className="mb-16"><AdBanner ads={activeAds} userLoc={userLoc} businesses={businesses} onBizDetail={openDetail} variant="minimal" uiLang={uiLang}/></div>}

          {/* FEATURED — geniş foto, sade caption */}
          {featured && (
            <article onClick={()=>openDetail(featured)} className="cursor-pointer group mb-20">
              <div className="relative overflow-hidden mb-6 rounded-sm" style={{aspectRatio:'16/9',background:'#eaeae3'}}>
                {featured.cover_url
                  ? <img src={featured.cover_url} alt={featured.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"/>
                  : <div className="w-full h-full flex items-center justify-center" style={{fontSize:'10rem',color:'#d8d8d0'}}>{featured.emoji||'🏛'}</div>}
                <div className="absolute top-5 left-5 text-[10px] tracking-[0.25em] font-semibold px-3 py-1.5 rounded-full" style={{background:PAPER,color:TERRA}}>ÖNE ÇIKAN</div>
              </div>
              <div className="grid grid-cols-12 gap-6 items-end">
                <div className="col-span-12 md:col-span-8">
                  <h2 className="font-bold mb-2" style={{fontSize:'clamp(1.75rem,3.5vw,2.75rem)',lineHeight:1.05,letterSpacing:'-0.035em'}}>
                    {featured.name}
                  </h2>
                  <div className="text-sm" style={{color:MUTED}}>{featured.category} · {featured.city}</div>
                </div>
                <div className="col-span-12 md:col-span-4 flex md:justify-end items-center gap-6">
                  <div>
                    <div className="text-2xl font-semibold" style={{color:INK,letterSpacing:'-0.02em'}}>{(featured.rating||0).toFixed(1)}<span className="text-base ml-1" style={{color:TERRA}}>★</span></div>
                    <div className="text-xs mt-0.5" style={{color:MUTED}}>{featured.review_count||0} yorum</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold" style={{color:INK,letterSpacing:'-0.02em'}}>₺{featured.price_from}</div>
                    <div className="text-xs mt-0.5" style={{color:MUTED}}>başlangıç</div>
                  </div>
                </div>
              </div>
            </article>
          )}

          {/* GRID — 2 sütun, geniş foto */}
          {rest.length > 0 && (
            <section className="mb-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-14">
                {rest.map((b) => (
                  <article key={b.id} onClick={()=>openDetail(b)} className="group cursor-pointer">
                    <div className="relative overflow-hidden mb-4 rounded-sm" style={{aspectRatio:'4/3',background:'#eaeae3'}}>
                      {b.cover_url
                        ? <img src={b.cover_url} alt={b.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"/>
                        : <div className="w-full h-full flex items-center justify-center" style={{fontSize:'7rem',color:'#d8d8d0'}}>{b.emoji||'🏛'}</div>}
                      {b.dist && <div className="absolute top-3 left-3 text-[10px] tracking-widest font-semibold px-2.5 py-1 rounded-full" style={{background:PAPER+'e6',color:INK,backdropFilter:'blur(8px)'}}>{b.dist<1?Math.round(b.dist*1000)+' M':b.dist.toFixed(1)+' KM'}</div>}
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-bold text-xl tracking-tight truncate" style={{letterSpacing:'-0.025em'}}>{b.name}</h3>
                        <div className="text-sm mt-1" style={{color:MUTED}}>{b.category} · {b.city}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-base font-semibold">{(b.rating||0).toFixed(1)}<span style={{color:TERRA}} className="ml-0.5">★</span></div>
                        <div className="text-sm" style={{color:MUTED}}>₺{b.price_from}'den</div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {filteredBiz.length === 0 && (
            <div className="text-center py-32" style={{color:MUTED}}>
              <div className="text-base font-medium mb-2" style={{color:INK}}>Sonuç yok.</div>
              <div className="text-sm">Başka bir kategori veya kelime dene.</div>
            </div>
          )}

          {/* SIMPLE FOOTER */}
          <footer className="py-16 mt-8 text-sm flex items-center justify-between" style={{borderTop:'1px solid '+INK+'12',color:MUTED}}>
            <div>
              randevu<span style={{color:TERRA}}>.</span> — {new Date().getFullYear()}
            </div>
            <div>{filteredBiz.length} mekân</div>
          </footer>
        </main>
      )}

      {tab === 'map' && <MapView businesses={businesses} onBook={(biz)=>{setDetailBiz(biz);setTab('home')}}/>}
      {tab === 'appts' && <AppointmentsTab {...props} variant="minimal" />}
      {tab === 'profile' && <ProfileTab {...props} variant="minimal" />}

      <BusinessDetailModal biz={detailBiz} bizIdx={businesses.findIndex(b=>b.id===detailBiz?.id)} services={bizServices} staff={bizStaff} loading={detailLoading} onClose={()=>setDetailBiz(null)} onBook={()=>setBookModal(true)} variant="minimal" uiLang={uiLang}/>
      <BookingModal biz={bookModal&&detailBiz?detailBiz:null} services={bizServices} staff={bizStaff} onClose={()=>setBookModal(false)} onBook={saveBooking} toast3={toast3} paymentEnabled={paymentEnabled} discount={activeAdDiscount} variant="minimal" uiLang={uiLang} userId={user?.id}/>
      <QRModal qrModal={qrModal} setQrModal={setQrModal} />
    </div>
  )
}
