'use client'
import { useState, useEffect, useMemo } from 'react'
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

const PAPER = '#faf7f2'   // krem
const INK   = '#1a1614'   // koyu kahve-siyah
const MUTED = '#7a716a'
const RULE  = 'rgba(26,22,20,0.12)'
const SERIF = "'Playfair Display', 'Cormorant Garamond', Georgia, 'Times New Roman', serif"
const SANS  = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif"

// Kategori → marka rengi
const CAT_COLORS = {
  'Sağlık':    '#2f6e4d',
  'Güzellik':  '#a04268',
  'Kuaför':    '#a04268',
  'Masaj':     '#7a4a8f',
  'Spa':       '#7a4a8f',
  'Fitness':   '#c25a2a',
  'Spor':      '#c25a2a',
  'Sanat':     '#3d5a8f',
  'Diğer':     '#5a5550',
}
const colorFor = (cat) => CAT_COLORS[cat] || '#5a5550'

export default function AtlasTheme(props) {
  const { user, businesses, activeAds, tab, setTab, openDetail, detailBiz, bizServices, bizStaff,
          detailLoading, bookModal, setBookModal, setDetailBiz, activeAdDiscount, paymentEnabled,
          toast3, userLoc, locStatus, requestLocation, searchQ, setSearchQ, catFilter, setCatFilter, sortBy, setSortBy,
          qrModal, setQrModal, upcomingAppts, uiLang='tr', saveBooking } = props
  const T = (k) => i18n(k, uiLang)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(()=>setMounted(true), 30); return ()=>clearTimeout(t) }, [])

  const enriched = useMemo(() => businesses
    .map(b => ({ ...b, dist: userLoc && b.lat && b.lng ? distKm(userLoc.lat, userLoc.lng, parseFloat(b.lat), parseFloat(b.lng)) : null }))
  , [businesses, userLoc])

  const filtered = useMemo(() => {
    const base = enriched.filter(b => (!catFilter || b.category === catFilter) && (!searchQ || b.name.toLowerCase().includes(searchQ.toLowerCase())))
    if (sortBy === 'distance') return base.sort((a,b) => (a.dist ?? 9999) - (b.dist ?? 9999))
    if (sortBy === 'price_asc') return base.sort((a,b) => (a.price_from||0) - (b.price_from||0))
    if (sortBy === 'reviews') return base.sort((a,b) => (b.review_count||0) - (a.review_count||0))
    return base.sort((a,b) => (b.rating||0) - (a.rating||0))
  }, [enriched, catFilter, searchQ, sortBy])

  // Tüm farklı kategoriler — sticky bar için
  const cats = useMemo(() => [...new Set(businesses.map(b => b.category).filter(Boolean))], [businesses])

  // "Bugünün Seçkisi" — rating en yüksek 1 mekan
  const featured = filtered[0]
  const rest = filtered.slice(1)
  const accent = catFilter ? colorFor(catFilter) : INK

  const todayLabel = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()

  return (
    <div className="min-h-screen" style={{background:PAPER, color:INK, fontFamily:SANS}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&display=swap');
      `}</style>

      {/* MASTHEAD */}
      <header className="border-b" style={{borderColor:RULE, background:PAPER}}>
        <div className="max-w-[1280px] mx-auto px-5 sm:px-10 py-4 flex items-baseline gap-3 sm:gap-6">
          <div>
            <h1 className="font-black tracking-tight" style={{fontFamily:SERIF, fontSize:'clamp(1.5rem,3vw,2.25rem)', letterSpacing:'-0.02em', lineHeight:1}}>
              Atlas
              <span className="text-xs font-normal ml-2" style={{color:MUTED, fontFamily:SANS, letterSpacing:'0.2em'}}>· {todayLabel}</span>
            </h1>
          </div>
          <nav className="ml-auto flex items-center gap-3 sm:gap-5">
            {[['home', T('discover')||'Keşfet'], ['map', T('map')||'Harita'], ['appts', T('appointments')||'Randevular'], ['profile', T('profile')||'Profil']].map(([k,l]) => (
              <button key={k} onClick={()=>setTab(k)}
                className="text-xs sm:text-sm font-bold transition-all py-1 relative"
                style={tab===k?{color:INK, borderBottom:'2px solid '+INK}:{color:MUTED}}>
                {l}
                {k==='appts' && upcomingAppts?.length>0 && <span className="ml-1 text-[10px] font-black px-1.5 rounded-full" style={{background:accent, color:PAPER}}>{upcomingAppts.length}</span>}
              </button>
            ))}
            <button onClick={async()=>{ await supabase.auth.signOut(); localStorage.removeItem('randevu_user'); window.location.href='/login' }}
              className="hidden sm:inline text-xs font-bold" style={{color:MUTED}}>{T('logout')||'Çıkış'}</button>
          </nav>
        </div>
      </header>

      {/* STICKY KATEGORİ BAR */}
      {tab === 'home' && (
        <div className="sticky top-0 z-30" style={{background:PAPER, borderBottom:'1px solid '+RULE}}>
          <div className="max-w-[1280px] mx-auto px-5 sm:px-10 py-3 flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
            <button onClick={()=>setCatFilter('')}
              className="text-xs font-bold tracking-[0.15em] whitespace-nowrap px-2.5 py-1.5 transition-all uppercase"
              style={!catFilter?{color:INK, borderBottom:'2px solid '+INK}:{color:MUTED}}>
              Hepsi
            </button>
            {cats.map(c => (
              <button key={c} onClick={()=>setCatFilter(c===catFilter?'':c)}
                className="text-xs font-bold tracking-[0.15em] whitespace-nowrap px-2.5 py-1.5 transition-all uppercase"
                style={catFilter===c?{color:colorFor(c), borderBottom:'2px solid '+colorFor(c)}:{color:MUTED}}>
                {c}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              <input type="search" placeholder="Ara..."
                value={searchQ} onChange={e=>setSearchQ(e.target.value)}
                className="text-xs px-2 py-1 outline-none bg-transparent border-b"
                style={{borderColor:RULE, color:INK, width:'5.5rem'}}/>
              <select value={sortBy} onChange={e=>{ if(e.target.value==='distance' && !userLoc && requestLocation){ requestLocation(true) } else { setSortBy(e.target.value) } }}
                className="text-[10px] font-bold tracking-[0.15em] uppercase outline-none cursor-pointer px-1.5 py-1"
                style={{background:'transparent', color:INK, border:'1px solid '+RULE}}>
                <option value="rating">⭐ Puan</option>
                <option value="distance">📍 Yakın</option>
                <option value="price_asc">₺ Ucuz</option>
                <option value="reviews">💬 Yorum</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {tab === 'home' && (
        <main className={`max-w-[1280px] mx-auto px-5 sm:px-10 pt-8 sm:pt-12 pb-32 sm:pb-20 transition-opacity duration-500 ${mounted?'opacity-100':'opacity-0'}`}>
          {/* HERO başlık */}
          <section className="mb-12 sm:mb-16 max-w-3xl">
            <div className="text-[11px] font-black tracking-[0.3em] mb-3" style={{color:accent}}>
              SAYI N°{String(filtered.length).padStart(2,'0')} · {todayLabel}
            </div>
            <h2 className="font-black mb-4" style={{fontFamily:SERIF, fontSize:'clamp(2.25rem,6vw,4rem)', letterSpacing:'-0.025em', lineHeight:0.98, color:INK}}>
              {catFilter
                ? <>İstanbul'un en iyi <em style={{fontStyle:'italic', color:accent}}>{catFilter.toLowerCase()}</em> mekânları.</>
                : <>Şehrin <em style={{fontStyle:'italic', color:accent}}>özenle seçilmiş</em> randevuları.</>
              }
            </h2>
            <p className="text-base sm:text-lg leading-relaxed" style={{color:MUTED, fontFamily:SERIF, fontStyle:'italic'}}>
              Editörlerin ve müşterilerin onayladığı, kanıtlanmış işletmeler.
            </p>
          </section>

          {/* REKLAM */}
          {activeAds.length > 0 && <div className="mb-12"><AdBanner ads={activeAds} userLoc={userLoc} businesses={businesses} onBizDetail={openDetail} variant="minimal" uiLang={uiLang}/></div>}

          {/* BUGÜNÜN SEÇKİSİ — featured */}
          {featured && (
            <article onClick={()=>openDetail(featured)} className="cursor-pointer group mb-14 sm:mb-20">
              <div className="text-[11px] font-black tracking-[0.3em] mb-4" style={{color:colorFor(featured.category)}}>
                ★ BUGÜNÜN SEÇKİSİ
              </div>
              <div className="grid grid-cols-12 gap-6 sm:gap-10">
                <div className="col-span-12 md:col-span-7 relative overflow-hidden" style={{aspectRatio:'4/3', background:'#e8e2d8'}}>
                  {featured.cover_url
                    ? <img src={featured.cover_url} alt={featured.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"/>
                    : <div className="w-full h-full flex items-center justify-center text-9xl opacity-60">{featured.emoji || '★'}</div>}
                </div>
                <div className="col-span-12 md:col-span-5">
                  <div className="text-[11px] font-black tracking-[0.25em] mb-3 uppercase" style={{color:colorFor(featured.category)}}>
                    {featured.category} · {featured.city}
                  </div>
                  <h3 className="font-black mb-4" style={{fontFamily:SERIF, fontSize:'clamp(1.75rem,4vw,3rem)', letterSpacing:'-0.02em', lineHeight:0.98}}>
                    {featured.name}
                  </h3>
                  {featured.bio && (
                    <p className="text-base sm:text-lg mb-6 leading-relaxed" style={{color:'#3a342f', fontFamily:SERIF}}>
                      {featured.bio.slice(0,180)}{featured.bio.length>180?'…':''}
                    </p>
                  )}
                  <div className="flex items-baseline gap-6 mb-6">
                    <div>
                      <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{color:MUTED}}>Puan</div>
                      <div className="font-black" style={{fontFamily:SERIF, fontSize:'2.25rem', lineHeight:1, color:INK}}>
                        {(featured.rating||0).toFixed(1)}<span style={{color:colorFor(featured.category), fontSize:'1.25rem', marginLeft:'0.25rem'}}>★</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{color:MUTED}}>Başlangıç</div>
                      <div className="font-black" style={{fontFamily:SERIF, fontSize:'2.25rem', lineHeight:1, color:INK}}>
                        ₺{featured.price_from}
                      </div>
                    </div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();openDetail(featured)}}
                    className="text-xs font-black tracking-[0.2em] uppercase px-5 py-3 transition-all hover:opacity-80"
                    style={{background:INK, color:PAPER}}>
                    Detay & Randevu →
                  </button>
                </div>
              </div>
            </article>
          )}

          {/* MASONRY GRID — geri kalan */}
          {rest.length > 0 && (
            <section>
              <div className="flex items-baseline gap-3 mb-6 pb-3" style={{borderBottom:'1px solid '+RULE}}>
                <h3 className="font-black" style={{fontFamily:SERIF, fontSize:'clamp(1.5rem,2.5vw,2rem)', letterSpacing:'-0.02em'}}>
                  {catFilter ? `Tüm ${catFilter.toLowerCase()} mekânları` : 'Daha fazlası'}
                </h3>
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{color:MUTED}}>· N°{String(rest.length).padStart(2,'0')}</span>
              </div>
              {/* Tailwind columns ile masonry */}
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 sm:gap-8 [&>*]:mb-6 [&>*]:sm:mb-8 [&>*]:break-inside-avoid">
                {rest.map((b, i) => <AtlasCard key={b.id} b={b} i={i} onDetail={openDetail}/>)}
              </div>
            </section>
          )}

          {filtered.length === 0 && (
            <div className="py-24 text-center">
              <div className="text-[11px] font-black tracking-[0.3em] mb-2" style={{color:MUTED}}>— SONUÇ YOK —</div>
              <div className="font-black" style={{fontFamily:SERIF, fontSize:'1.5rem'}}>Aramanıza uygun mekân bulunamadı.</div>
            </div>
          )}

          {/* COLOPHON */}
          <footer className="mt-20 pt-6 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6" style={{borderTop:'1px solid '+RULE}}>
            <div className="font-black tracking-tight" style={{fontFamily:SERIF, fontSize:'1.25rem'}}>
              Atlas<span style={{color:accent}}>.</span>
            </div>
            <div className="text-[11px] tracking-[0.25em] uppercase font-bold" style={{color:MUTED}}>
              Şehrin randevu rehberi · {new Date().getFullYear()}
            </div>
            <div className="sm:ml-auto text-[11px] tracking-[0.25em] uppercase font-bold" style={{color:accent}}>
              {user?.name?.toUpperCase()} · Okuyucu
            </div>
          </footer>
        </main>
      )}

      {tab === 'map' && <MapView businesses={businesses} onBook={async(biz)=>{setTab('home'); await openDetail(biz); setBookModal(true)}}/>}
      {tab === 'appts' && <div style={{background:PAPER, minHeight:'calc(100vh - 60px)'}}><AppointmentsTab {...props} variant="minimal" /></div>}
      {tab === 'profile' && <div style={{background:PAPER, minHeight:'calc(100vh - 60px)'}}><ProfileTab {...props} variant="minimal" /></div>}

      <BusinessDetailModal biz={detailBiz} bizIdx={businesses.findIndex(b=>b.id===detailBiz?.id)} services={bizServices} staff={bizStaff} loading={detailLoading} onClose={()=>setDetailBiz(null)} onBook={()=>setBookModal(true)} variant="minimal" uiLang={uiLang}/>
      <BookingModal biz={bookModal&&detailBiz?detailBiz:null} services={bizServices} staff={bizStaff} onClose={()=>setBookModal(false)} onBook={saveBooking} toast3={toast3} paymentEnabled={paymentEnabled} discount={activeAdDiscount} variant="minimal" uiLang={uiLang} userId={user?.id} userPoints={user?.loyalty_points||0}/>
      <QRModal qrModal={qrModal} setQrModal={setQrModal} />
    </div>
  )
}

function AtlasCard({ b, i, onDetail }) {
  const c = colorFor(b.category)
  // Masonry'de çeşitlilik için aspect ratio değişken (image varsa serbest)
  const ar = i % 3 === 0 ? '3/4' : i % 3 === 1 ? '1/1' : '4/5'
  return (
    <article onClick={()=>onDetail(b)} className="cursor-pointer group">
      <div className="relative overflow-hidden mb-3" style={{aspectRatio:ar, background:'#e8e2d8'}}>
        {b.cover_url
          ? <img src={b.cover_url} alt={b.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"/>
          : <div className="w-full h-full flex items-center justify-center text-6xl opacity-60">{b.emoji || '★'}</div>}
      </div>
      <div className="text-[10px] font-black tracking-[0.2em] uppercase mb-1.5" style={{color:c}}>
        {b.category} · {b.city}
      </div>
      <h4 className="font-black mb-2 transition-colors group-hover:opacity-80" style={{fontFamily:SERIF, fontSize:'clamp(1.25rem,1.8vw,1.625rem)', letterSpacing:'-0.015em', lineHeight:1.05}}>
        {b.name}
      </h4>
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-3 text-sm">
          <span className="font-black" style={{color:INK}}>{(b.rating||0).toFixed(1)}<span style={{color:c, marginLeft:'2px'}}>★</span></span>
          <span style={{color:MUTED}}>·</span>
          <span className="font-bold" style={{color:'#3a342f'}}>₺{b.price_from}'den</span>
        </div>
        {b.dist != null && (
          <span className="text-[10px] tracking-[0.15em] uppercase font-bold" style={{color:MUTED}}>
            {b.dist<1 ? Math.round(b.dist*1000)+' m' : b.dist.toFixed(1)+' km'}
          </span>
        )}
      </div>
    </article>
  )
}
