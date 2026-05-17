'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase, logout } from '@/lib/supabase'
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

const INK   = '#fafafa'
const BG    = '#0a0a0f'
const PANEL = '#13131c'
const PANEL2= '#1c1c28'
const MINT  = '#00f0a8'
const PINK  = '#ff3d6e'
const MUTED = '#8e8ea6'
const SANS  = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif"

// Basit "şu an açık" tahmini: business saatleri yoksa default 09–21
function isOpenNow(b) {
  const hr = new Date().getHours()
  const op = b.opens_at ? parseInt(String(b.opens_at).slice(0,2)) : 9
  const cl = b.closes_at ? parseInt(String(b.closes_at).slice(0,2)) : 21
  return hr >= op && hr < cl
}

export default function PulseTheme(props) {
  const { user, businesses, activeAds, tab, setTab, openDetail, detailBiz, bizServices, bizStaff,
          detailLoading, bookModal, setBookModal, setDetailBiz, activeAdDiscount, paymentEnabled,
          toast3, userLoc, locStatus, requestLocation, searchQ, setSearchQ, catFilter, setCatFilter, sortBy, setSortBy,
          qrModal, setQrModal, upcomingAppts, uiLang='tr', saveBooking } = props
  const T = (k) => i18n(k, uiLang)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(()=>setMounted(true), 30); return ()=>clearTimeout(t) }, [])

  const enriched = useMemo(() => {
    const base = businesses
      .filter(b => (!catFilter || b.category === catFilter) && (!searchQ || b.name.toLowerCase().includes(searchQ.toLowerCase())))
      .map(b => ({ ...b, dist: userLoc && b.lat && b.lng ? distKm(userLoc.lat, userLoc.lng, parseFloat(b.lat), parseFloat(b.lng)) : null, open: isOpenNow(b) }))
    if (sortBy === 'distance') return base.sort((a,b) => (a.dist ?? 9999) - (b.dist ?? 9999))
    if (sortBy === 'price_asc') return base.sort((a,b) => (a.price_from||0) - (b.price_from||0))
    return base.sort((a,b) => (b.rating||0) - (a.rating||0))
  }, [businesses, catFilter, searchQ, sortBy, userLoc])

  // Story carousel: aktif sıralamanın ilk 10'u (en yakın seçiliyse en yakınlar, default'ta rating)
  const stories = enriched.slice(0, 10)

  // Kategori-bazlı şeritler (sadece sonuç olan kategoriler)
  const categoryShelves = useMemo(() => {
    const cats = [...new Set(enriched.map(b => b.category).filter(Boolean))]
    return cats.map(cat => ({
      cat,
      items: enriched.filter(b => b.category === cat).sort((a,b) => (b.rating||0)-(a.rating||0)).slice(0, 8)
    })).filter(s => s.items.length > 0)
  }, [enriched])

  // "Şimdi açık" şeridi
  const openNowShelf = enriched.filter(b => b.open).slice(0, 12)

  return (
    <div className="min-h-screen" style={{background:BG, color:INK, fontFamily:SANS}}>
      {/* NAV — sticky cam */}
      <header className="sticky top-0 z-40" style={{background:'rgba(10,10,15,0.85)', backdropFilter:'blur(20px) saturate(180%)', WebkitBackdropFilter:'blur(20px) saturate(180%)', borderBottom:'1px solid '+PANEL2}}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <div className="flex items-baseline gap-1.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black" style={{background:`linear-gradient(135deg,${MINT},${PINK})`, color:'#000'}}>P</div>
            <span className="font-black text-base tracking-tight">Pulse</span>
            <span className="hidden sm:inline text-[10px] font-bold tracking-[0.2em] ml-1" style={{color:MINT}}>● LIVE</span>
          </div>
          <nav className="ml-auto flex items-center gap-1">
            {[['home','🏠'],['map','🗺️'],['appts','📅'],['profile','👤']]
              .filter(([k]) => user || (k!=='profile' && k!=='appts'))
              .map(([k,ic]) => (
              <button key={k} onClick={()=>setTab(k)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${tab===k?'text-black':'text-white/60 hover:text-white'}`}
                style={tab===k?{background:MINT}:{}}>
                <span className="sm:hidden">{ic}</span>
                <span className="hidden sm:inline">{({home:T('discover')||'Keşfet',map:T('map')||'Harita',appts:T('appointments')||'Randevular',profile:T('profile')||'Profil'})[k]}</span>
                {k==='appts' && upcomingAppts?.length>0 && (
                  <span className="ml-1 text-[10px] font-black px-1.5 rounded-full" style={{background:tab===k?'#000':PINK, color:tab===k?MINT:'#fff'}}>{upcomingAppts.length}</span>
                )}
              </button>
            ))}
            {user ? (
              <button onClick={logout}
                className="ml-2 text-xs font-bold hidden sm:inline opacity-60 hover:opacity-100">{T('logout')||'Çıkış'}</button>
            ) : (
              <a href="/login" className="ml-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all" style={{background:MINT, color:'#000'}}>Giriş</a>
            )}
          </nav>
        </div>
      </header>

      {tab === 'home' && (
        <main className={`max-w-[1400px] mx-auto px-4 sm:px-6 pt-4 pb-32 sm:pb-16 transition-opacity duration-500 ${mounted?'opacity-100':'opacity-0'}`}>
          {/* HERO durumu — saat & şehir & açık sayısı */}
          <section className="mb-5 sm:mb-7 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="font-black tracking-tight" style={{fontSize:'clamp(1.75rem,5vw,2.75rem)', letterSpacing:'-0.03em'}}>
              {(() => { const h = new Date().getHours(); return h<6?'İyi geceler':h<12?'Günaydın':h<18?'İyi günler':'İyi akşamlar' })()},<br className="sm:hidden"/>
              <span style={{background:`linear-gradient(135deg,${MINT},${PINK})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}> {user?.name?.split(' ')[0] || 'misafir'}</span>
            </h1>
            <div className="flex items-center gap-2 text-xs sm:text-sm" style={{color:MUTED}}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:MINT}}/>
              <span><b style={{color:MINT}}>{openNowShelf.length}</b> mekân şu an açık</span>
            </div>
          </section>

          {/* ARAMA — pill */}
          <div className="mb-5 flex items-center gap-2 rounded-full px-4 py-2.5" style={{background:PANEL, border:'1px solid '+PANEL2}}>
            <span className="text-base">🔍</span>
            <input type="search" placeholder="Ne arıyorsun? (kuaför, masaj, fitness…)"
              value={searchQ} onChange={e=>setSearchQ(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/40" style={{color:INK}}/>
            {searchQ && <button onClick={()=>setSearchQ('')} className="text-white/40 hover:text-white text-sm">✕</button>}
          </div>

          {/* STORIES — yatay carousel */}
          {stories.length > 0 && (
            <section className="mb-7 -mx-4 sm:-mx-6 px-4 sm:px-6">
              <div className="flex items-center gap-3 overflow-x-auto pb-3 scrollbar-hide" style={{scrollSnapType:'x mandatory'}}>
                {stories.map((b, i) => (
                  <button key={b.id} onClick={()=>openDetail(b)}
                    className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
                    style={{scrollSnapAlign:'start'}}>
                    <div className="relative rounded-full p-[2.5px]" style={{background:`linear-gradient(135deg,${MINT} 0%,${PINK} 100%)`}}>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl sm:text-3xl"
                        style={{background:PANEL2, border:'2px solid '+BG}}>
                        {b.cover_url ? <img src={b.cover_url} alt={b.name} className="w-full h-full object-cover"/> : (b.emoji || '🏢')}
                      </div>
                      {b.open && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px]" style={{background:MINT, color:'#000', border:'2px solid '+BG}}>●</div>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold max-w-[5rem] truncate group-hover:text-white" style={{color:MUTED}}>{b.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* KATEGORİ CHIPS */}
          <div className="mb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 sm:-mx-6 px-4 sm:px-6">
            <button onClick={()=>setCatFilter('')} className="flex-shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap" style={!catFilter?{background:MINT, color:'#000'}:{background:PANEL, color:INK, border:'1px solid '+PANEL2}}>
              Tümü
            </button>
            {[...new Set(businesses.map(b => b.category).filter(Boolean))].map(cat => (
              <button key={cat} onClick={()=>setCatFilter(cat===catFilter?'':cat)}
                className="flex-shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap"
                style={catFilter===cat?{background:MINT, color:'#000'}:{background:PANEL, color:INK, border:'1px solid '+PANEL2}}>
                {cat}
              </button>
            ))}
          </div>
          {/* SORT — kategori altında belirgin */}
          <div className="mb-6 flex items-center gap-2 flex-wrap">
            <button onClick={()=>{ if(userLoc){setSortBy('distance');return} if(locStatus==='denied'){toast3?.('❌ Konum izni reddedildi. Tarayıcı ayarlarından izin verin.');return} requestLocation?.(true) }}
              className="text-xs font-bold px-4 py-1.5 rounded-full transition-all whitespace-nowrap flex items-center gap-1.5"
              style={sortBy==='distance'?{background:`linear-gradient(135deg,${MINT},${PINK})`, color:'#000', boxShadow:'0 4px 14px -4px '+MINT+'aa'}:{background:'transparent', color:MINT, border:'1.5px solid '+MINT}}>
              📍 Bana en yakın {locStatus==='loading' && '...'}
            </button>
            <button onClick={()=>setSortBy('rating')}
              className="text-xs font-bold px-4 py-1.5 rounded-full transition-all whitespace-nowrap"
              style={sortBy==='rating'?{background:PINK, color:'#fff'}:{background:PANEL, color:INK, border:'1px solid '+PANEL2}}>
              ⭐ En İyiler
            </button>
          </div>

          {/* REKLAMLAR */}
          {activeAds.length > 0 && <div className="mb-7"><AdBanner ads={activeAds} userLoc={userLoc} businesses={businesses} onBizDetail={openDetail} variant="default" uiLang={uiLang}/></div>}

          {/* KATEGORİ ŞERİTLERİ veya FİLTRELİ GRID */}
          {(catFilter || searchQ) ? (
            // Filtre/arama aktifse tek bir grid
            <section className="mt-2">
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-xl font-black tracking-tight">{catFilter || `"${searchQ}"`}</h2>
                <span className="text-sm" style={{color:MUTED}}>{enriched.length} sonuç</span>
              </div>
              {enriched.length === 0 ? (
                <div className="py-16 text-center" style={{color:MUTED}}>
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="font-semibold">Sonuç bulunamadı</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enriched.map(b => <PulseCard key={b.id} b={b} onDetail={openDetail}/>)}
                </div>
              )}
            </section>
          ) : (
            // Kategori şeritleri
            categoryShelves.map(({cat, items}) => (
              <ShelfRow key={cat} title={cat} emoji="✨" accent={PINK} items={items} onDetail={openDetail}/>
            ))
          )}
        </main>
      )}

      {tab === 'map' && <div className="bg-white text-black"><MapView businesses={businesses} onBook={async(biz)=>{setTab('home'); await openDetail(biz); setBookModal(true)}}/></div>}
      {tab === 'appts' && <div style={{background:BG,minHeight:'calc(100vh - 56px)'}}><AppointmentsTab {...props} variant="default" /></div>}
      {tab === 'profile' && <div style={{background:BG,minHeight:'calc(100vh - 56px)'}}><ProfileTab {...props} variant="default" /></div>}

      <BusinessDetailModal {...props.detailModalProps} variant="default"/>
      <BookingModal biz={bookModal&&detailBiz?detailBiz:null} services={bizServices} staff={bizStaff} onClose={()=>setBookModal(false)} onBook={saveBooking} toast3={toast3} paymentEnabled={paymentEnabled} loyaltyEnabled={props.loyaltyEnabled} discount={activeAdDiscount} variant="default" uiLang={uiLang} userId={user?.id} userPoints={user?.loyalty_points||0}/>
      <QRModal qrModal={qrModal} setQrModal={setQrModal} />
    </div>
  )
}

function ShelfRow({ title, emoji, accent, items, onDetail }) {
  return (
    <section className="mb-8 -mx-4 sm:-mx-6 px-4 sm:px-6">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-lg font-black tracking-tight" style={{letterSpacing:'-0.02em'}}>{emoji} {title}</h2>
        <span className="text-xs font-bold ml-auto" style={{color:accent}}>{items.length}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide" style={{scrollSnapType:'x mandatory'}}>
        {items.map(b => (
          <div key={b.id} className="flex-shrink-0 w-[68%] xs:w-[55%] sm:w-[42%] md:w-[31%] lg:w-[24%]" style={{scrollSnapAlign:'start'}}>
            <PulseCard b={b} onDetail={onDetail}/>
          </div>
        ))}
      </div>
    </section>
  )
}

function PulseCard({ b, onDetail }) {
  return (
    <article onClick={()=>onDetail(b)}
      className="cursor-pointer group rounded-2xl overflow-hidden transition-all hover:-translate-y-1"
      style={{background:PANEL, border:'1px solid '+PANEL2}}>
      <div className="relative" style={{aspectRatio:'4/3', background:PANEL2}}>
        {b.cover_url
          ? <img src={b.cover_url} alt={b.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
          : <div className="w-full h-full flex items-center justify-center text-5xl">{b.emoji || '🏢'}</div>}
        <div className="absolute inset-0" style={{background:'linear-gradient(to top, rgba(10,10,15,0.85) 0%, transparent 50%)'}}/>
        {b.open && (
          <div className="absolute top-2.5 left-2.5 text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider" style={{background:MINT, color:'#000'}}>● AÇIK</div>
        )}
        {b.dist != null && (
          <div className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'rgba(0,0,0,0.6)', color:'#fff', backdropFilter:'blur(8px)'}}>
            {b.dist<1 ? Math.round(b.dist*1000)+'m' : b.dist.toFixed(1)+'km'}
          </div>
        )}
        <div className="absolute bottom-2.5 left-2.5 right-2.5">
          <div className="text-[10px] font-bold tracking-widest mb-0.5" style={{color:MINT}}>{(b.category||'').toUpperCase()}</div>
          <div className="font-black text-base leading-tight truncate" style={{color:'#fff', letterSpacing:'-0.01em'}}>{b.name}</div>
        </div>
      </div>
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-black" style={{color:'#fff'}}>{(b.rating||0).toFixed(1)}<span style={{color:MINT}}> ★</span></span>
          <span style={{color:MUTED}}>·</span>
          <span className="font-bold" style={{color:MUTED}}>₺{b.price_from}'den</span>
        </div>
        <span className="text-xs font-black px-2.5 py-1 rounded-full transition-all opacity-0 group-hover:opacity-100" style={{background:MINT, color:'#000'}}>Detay →</span>
      </div>
    </article>
  )
}
