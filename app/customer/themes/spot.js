'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
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

const BG     = '#000'
const INK    = '#fff'
const ACCENT = '#ff2d75'   // canlı pembe — TikTok / Instagram vibe
const ACCENT2= '#22d3ee'   // cyan ikincil
const MUTED  = 'rgba(255,255,255,0.65)'
const SANS   = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif"

export default function SpotTheme(props) {
  const { user, businesses, activeAds, tab, setTab, openDetail, detailBiz, bizServices, bizStaff,
          detailLoading, bookModal, setBookModal, setDetailBiz, activeAdDiscount, paymentEnabled,
          toast3, userLoc, locStatus, requestLocation, searchQ, setSearchQ, catFilter, setCatFilter, sortBy, setSortBy,
          qrModal, setQrModal, upcomingAppts, uiLang='tr', saveBooking } = props
  const T = (k) => i18n(k, uiLang)
  const containerRef = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [liked, setLiked] = useState(new Set())

  const feed = useMemo(() => businesses
    .filter(b => (!catFilter || b.category === catFilter) && (!searchQ || b.name.toLowerCase().includes(searchQ.toLowerCase())))
    .map(b => ({ ...b, dist: userLoc && b.lat && b.lng ? distKm(userLoc.lat, userLoc.lng, parseFloat(b.lat), parseFloat(b.lng)) : null }))
    .sort((a,b) => sortBy === 'distance' ? (a.dist??9999)-(b.dist??9999) : (b.rating||0)-(a.rating||0))
  , [businesses, catFilter, searchQ, sortBy, userLoc])

  // Snap scroll: aktif kart index'i hesapla (ilk görünür kart)
  useEffect(() => {
    if (tab !== 'home') return
    const el = containerRef.current
    if (!el) return
    const onScroll = () => {
      const h = el.clientHeight
      const idx = Math.round(el.scrollTop / h)
      if (idx !== activeIdx) setActiveIdx(idx)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [activeIdx, tab])

  const toggleLike = (id) => setLiked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="min-h-screen" style={{background:BG, color:INK, fontFamily:SANS, overflow:'hidden'}}>
      {/* Üst bar — sadece home tabında fixed (overlay), diğer tablarda normal flow */}
      <header className={`${tab==='home'?'fixed top-0 left-0 right-0':'sticky top-0'} z-50`} style={{background: tab==='home' ? 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)' : 'rgba(10,10,10,0.95)', backdropFilter: tab==='home'?undefined:'blur(20px)', WebkitBackdropFilter: tab==='home'?undefined:'blur(20px)', borderBottom: tab==='home'?'none':'1px solid rgba(255,255,255,0.08)'}}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2">
          <button onClick={()=>setTab('home')} className="flex items-center gap-1.5 transition-opacity hover:opacity-80">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black" style={{background:ACCENT}}>S</div>
            <span className="font-black tracking-tight text-base">Spot</span>
          </button>
          {/* Nav butonlar — diğer tablardan home'a dönmek için */}
          <nav className="ml-3 hidden sm:flex items-center gap-1">
            {[['home','🏠 Keşfet'],['map','🗺️ Harita']].map(([k,l]) => (
              <button key={k} onClick={()=>setTab(k)}
                className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                style={tab===k?{background:'rgba(255,255,255,0.15)', color:'#fff'}:{color:'rgba(255,255,255,0.5)'}}>
                {l}
              </button>
            ))}
          </nav>
          {tab === 'home' && (
            <button onClick={()=>setShowFilters(v=>!v)} className="ml-auto px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
              style={{background:'rgba(255,255,255,0.1)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)'}}>
              <span>🔍</span> {catFilter || 'Filtre'}{catFilter && <span className="ml-1 text-[10px] opacity-60">✕</span>}
            </button>
          )}
          {tab !== 'home' && <div className="ml-auto"/>}
          <button onClick={()=>setTab('map')} className="sm:hidden px-3 py-1.5 rounded-full text-xs font-bold" style={{background:'rgba(255,255,255,0.1)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)'}}>
            🗺️
          </button>
          {user && (
            <button onClick={()=>setTab('appts')} className="px-3 py-1.5 rounded-full text-xs font-bold relative"
              style={{background: tab==='appts'?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.1)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)'}}>
              📅
              {upcomingAppts?.length>0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center" style={{background:ACCENT, color:'#fff'}}>{upcomingAppts.length}</span>}
            </button>
          )}
          {user ? (
            <button onClick={()=>setTab('profile')} className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs" style={{background: tab==='profile'?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.1)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)'}}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </button>
          ) : (
            <a href="/login" className="px-3 py-1.5 rounded-full text-xs font-bold" style={{background:ACCENT,color:'#fff'}}>Giriş</a>
          )}
        </div>

        {/* Filtre panel — slide down, sadece home tabında */}
        {showFilters && tab === 'home' && (
          <div className="absolute left-0 right-0 top-14 p-4 sm:p-6" style={{background:'rgba(0,0,0,0.95)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
            <div className="max-w-screen-2xl mx-auto">
              <input type="search" placeholder="Mekân, kategori, şehir ara…"
                value={searchQ} onChange={e=>setSearchQ(e.target.value)}
                className="w-full mb-3 px-4 py-3 rounded-full outline-none text-sm" style={{background:'rgba(255,255,255,0.1)', color:INK}}/>
              <div className="text-[10px] font-black tracking-[0.25em] mb-2 opacity-60">KATEGORİ</div>
              <div className="flex flex-wrap gap-2 mb-3">
                <button onClick={()=>setCatFilter('')} className="text-xs font-bold px-3 py-1.5 rounded-full" style={!catFilter?{background:ACCENT, color:'#fff'}:{background:'rgba(255,255,255,0.1)', color:INK}}>
                  Tümü
                </button>
                {[...new Set(businesses.map(b => b.category).filter(Boolean))].map(c => (
                  <button key={c} onClick={()=>setCatFilter(c===catFilter?'':c)} className="text-xs font-bold px-3 py-1.5 rounded-full" style={catFilter===c?{background:ACCENT, color:'#fff'}:{background:'rgba(255,255,255,0.1)', color:INK}}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="text-[10px] font-black tracking-[0.25em] mb-2 opacity-60">SIRALA</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={()=>setSortBy('rating')} className="text-xs font-bold px-3 py-1.5 rounded-full" style={sortBy==='rating'?{background:ACCENT2, color:'#000'}:{background:'rgba(255,255,255,0.1)', color:INK}}>⭐ En İyiler</button>
                <button onClick={()=>{ if(!userLoc && requestLocation){requestLocation(true)} else {setSortBy('distance')} }} className="text-xs font-bold px-3 py-1.5 rounded-full" style={sortBy==='distance'?{background:ACCENT2, color:'#000'}:{background:'rgba(255,255,255,0.1)', color:INK}}>📍 Yakındakiler {locStatus==='loading'&&'...'}</button>
                <button onClick={()=>setSortBy('price_asc')} className="text-xs font-bold px-3 py-1.5 rounded-full" style={sortBy==='price_asc'?{background:ACCENT2, color:'#000'}:{background:'rgba(255,255,255,0.1)', color:INK}}>₺ Ucuzdan</button>
              </div>
              <button onClick={()=>setShowFilters(false)} className="mt-4 w-full py-2.5 rounded-full text-xs font-bold" style={{background:ACCENT, color:'#fff'}}>Uygula</button>
            </div>
          </div>
        )}
      </header>

      {tab === 'home' && (
        <main ref={containerRef} className="overflow-y-scroll snap-y snap-mandatory"
          style={{height:'100vh', scrollbarWidth:'none'}}>
          {/* Kampanya — feed'in başında, ilk slide */}
          {activeAds.length > 0 && (
            <section className="snap-start flex items-center justify-center px-4 sm:px-8 pt-20 pb-12" style={{minHeight:'100vh'}}>
              <div className="w-full max-w-2xl mx-auto">
                <div className="text-xs font-black tracking-[0.3em] mb-4" style={{color:ACCENT}}>● BUGÜNÜN KAMPANYALARI</div>
                <AdBanner ads={activeAds} userLoc={userLoc} businesses={businesses} onBizDetail={openDetail} variant="luxury" uiLang={uiLang}/>
                <div className="mt-6 text-xs text-center opacity-50">↓ Kaydır · Tüm mekanları gör</div>
              </div>
            </section>
          )}
          {feed.length === 0 ? (
            <FeedEmpty/>
          ) : feed.map((b, i) => (
            <FeedCard key={b.id} b={b} idx={i} total={feed.length} active={i===activeIdx}
              liked={liked.has(b.id)} onLike={()=>toggleLike(b.id)}
              onDetail={()=>openDetail(b)} onMap={()=>setTab('map')}
              onNext={()=>containerRef.current?.scrollTo({top:(i+1)*window.innerHeight, behavior:'smooth'})}/>
          ))}
        </main>
      )}

      {/* Sol alt: ilerleme göstergesi */}
      {tab === 'home' && feed.length > 0 && (
        <div className="fixed bottom-4 left-4 z-40 px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-2 pointer-events-none"
          style={{background:'rgba(0,0,0,0.5)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)'}}>
          <span style={{color:ACCENT2}}>{activeIdx+1}</span><span style={{color:MUTED}}>/ {feed.length}</span>
        </div>
      )}

      {tab === 'map' && <div className="bg-white text-black" style={{paddingTop:'56px'}}><MapView businesses={businesses} onBook={async(biz)=>{setTab('home'); await openDetail(biz); setBookModal(true)}}/></div>}
      {tab === 'appts' && <div style={{background:BG, minHeight:'100vh', paddingTop:'56px'}}><AppointmentsTab {...props} variant="luxury" /></div>}
      {tab === 'profile' && <div style={{background:BG, minHeight:'100vh', paddingTop:'56px'}}><ProfileTab {...props} variant="luxury" /></div>}

      <BusinessDetailModal {...props.detailModalProps} variant="luxury"/>
      <BookingModal biz={bookModal&&detailBiz?detailBiz:null} services={bizServices} staff={bizStaff} onClose={()=>setBookModal(false)} onBook={saveBooking} toast3={toast3} paymentEnabled={paymentEnabled} loyaltyEnabled={props.loyaltyEnabled} discount={activeAdDiscount} variant="luxury" uiLang={uiLang} userId={user?.id} userPoints={user?.loyalty_points||0}/>
      <QRModal qrModal={qrModal} setQrModal={setQrModal} />
    </div>
  )
}

function FeedCard({ b, idx, total, active, liked, onLike, onDetail, onMap, onNext }) {
  return (
    <section className="snap-start relative overflow-hidden" style={{height:'100vh', width:'100%', background:'#0a0a0a'}}>
      {/* Cover full-bleed */}
      {b.cover_url ? (
        <img src={b.cover_url} alt={b.name}
          className={'absolute inset-0 w-full h-full object-cover transition-transform duration-1000 '+(active?'scale-100':'scale-105')}/>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{background:`linear-gradient(135deg, ${ACCENT}33, ${ACCENT2}33)`}}>
          <span className="text-[12rem] opacity-50">{b.emoji || '🏢'}</span>
        </div>
      )}
      {/* Üst koyu gradient (header okunabilsin) */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none" style={{background:'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)'}}/>
      {/* Alt koyu gradient (bilgi alanı) */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{background:'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.95) 100%)', height:'60%'}}/>

      {/* Sağ taraf: dikey aksiyon barı */}
      <div className="absolute right-3 sm:right-6 bottom-32 sm:bottom-1/3 z-10 flex flex-col items-center gap-4">
        <button onClick={onLike} className="flex flex-col items-center gap-1 transition-transform active:scale-95">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
            style={{background:liked?ACCENT:'rgba(255,255,255,0.15)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)'}}>
            {liked ? '❤️' : '🤍'}
          </div>
          <span className="text-[10px] font-bold">{liked?'Kayıtlı':'Kaydet'}</span>
        </button>
        <button onClick={onMap} className="flex flex-col items-center gap-1 transition-transform active:scale-95">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
            style={{background:'rgba(255,255,255,0.15)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)'}}>🗺️</div>
          <span className="text-[10px] font-bold">Harita</span>
        </button>
        <a href={'/firma/'+b.id} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 transition-transform active:scale-95">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
            style={{background:'rgba(255,255,255,0.15)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)'}}>🏢</div>
          <span className="text-[10px] font-bold">Vitrin</span>
        </a>
      </div>

      {/* Alt: bilgi + ana CTA */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-8 pb-8 sm:pb-12 max-w-2xl">
        <div className="text-[10px] font-black tracking-[0.3em] mb-2" style={{color:ACCENT}}>
          {(b.category||'').toUpperCase()} {b.dist != null && <span style={{color:'rgba(255,255,255,0.5)'}}>· {b.dist<1?Math.round(b.dist*1000)+'m':b.dist.toFixed(1)+'km'}</span>}
        </div>
        <h2 className="font-black mb-3 tracking-tight" style={{fontSize:'clamp(2rem,7vw,3.5rem)', letterSpacing:'-0.03em', lineHeight:1}}>
          {b.name}
        </h2>
        {b.bio && <p className="text-sm sm:text-base mb-4 max-w-md" style={{color:MUTED, lineHeight:1.4}}>{b.bio.slice(0,140)}{b.bio.length>140?'…':''}</p>}
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-1.5 font-black text-lg">
            <span style={{color:ACCENT2}}>{(b.rating||0).toFixed(1)}</span><span className="text-base">★</span>
            <span className="text-xs font-bold" style={{color:MUTED}}>({b.review_count||0})</span>
          </div>
          <div className="flex items-center gap-1.5 font-black text-lg">
            <span style={{color:'rgba(255,255,255,0.5)'}}>₺</span>
            <span>{b.price_from}</span>
            <span className="text-xs font-bold" style={{color:MUTED}}>'den</span>
          </div>
        </div>
        <button onClick={onDetail}
          className="w-full sm:w-auto px-6 py-4 rounded-full font-black tracking-wider text-sm transition-all active:scale-95"
          style={{background:ACCENT, color:'#fff', boxShadow:'0 8px 32px '+ACCENT+'66'}}>
          📅 RANDEVU AL
        </button>
      </div>

      {/* Aşağı kaydır göstergesi (son kart değilse) */}
      {active && idx < total-1 && (
        <button onClick={onNext} className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-xs font-bold flex flex-col items-center gap-0.5 opacity-70 animate-bounce">
          <span>↓</span>
          <span className="text-[10px]">Kaydır</span>
        </button>
      )}
    </section>
  )
}

function FeedEmpty() {
  return (
    <section className="snap-start flex items-center justify-center" style={{height:'100vh'}}>
      <div className="text-center px-6">
        <div className="text-6xl mb-4">🔍</div>
        <div className="font-black text-2xl mb-2">Sonuç yok</div>
        <div className="text-sm" style={{color:MUTED}}>Filtreyi değiştirip tekrar dene</div>
      </div>
    </section>
  )
}
