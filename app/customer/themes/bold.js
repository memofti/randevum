'use client'
import { useState, useEffect } from 'react'
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

// Pop Editorial palette — high contrast, vivid accent
const PAPER = '#ffffff'
const INK = '#0a0a12'
const COBALT = '#1736ff'
const COBALT_DARK = '#0f24c4'
const MUTED = '#5a5d6a'
const RULE = '#0a0a1214'
const SANS = "-apple-system, 'SF Pro Display', 'Inter', 'Helvetica Neue', system-ui, sans-serif"

export default function BoldTheme(props) {
  const { user, businesses, activeAds, tab, setTab, openDetail, detailBiz, bizServices, bizStaff, detailLoading, bookModal, setBookModal, setDetailBiz, activeAdDiscount, paymentEnabled, toast3, userLoc, locStatus, requestLocation, searchQ, setSearchQ, catFilter, setCatFilter, sortBy, setSortBy, qrModal, setQrModal, upcomingAppts, uiLang='tr', saveBooking } = props
  const T = (k) => i18n(k, uiLang)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(()=>setMounted(true), 30); return ()=>clearTimeout(t) }, [])

  const filteredBiz = businesses
    .filter(b => (!catFilter || b.category === catFilter) && (!searchQ || b.name.toLowerCase().includes(searchQ.toLowerCase())))
    .map(b => ({ ...b, dist: userLoc && b.lat && b.lng ? distKm(userLoc.lat, userLoc.lng, parseFloat(b.lat), parseFloat(b.lng)) : null }))
    .sort((a, b) => sortBy === 'distance' ? (a.dist??9999)-(b.dist??9999) : (b.rating||0)-(a.rating||0))

  const featured = filteredBiz[0]
  const rest = filteredBiz.slice(1)
  const issue = String(filteredBiz.length).padStart(2,'0')

  return (
    <div className="min-h-screen" style={{background:PAPER,color:INK,fontFamily:SANS,fontFeatureSettings:'"ss01","cv11","kern"'}}>
      {/* NAV — kalın bant + büyük tipografi */}
      <header className="sticky top-0 z-40" style={{background:PAPER,borderBottom:'2px solid '+INK}}>
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-3.5 flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="font-black text-xl sm:text-2xl tracking-tight" style={{letterSpacing:'-0.04em'}}>RANDEVU</span>
            <span className="text-[10px] font-bold tracking-[0.25em] hidden sm:inline" style={{color:COBALT}}>VOL.{issue}</span>
          </div>
          <nav className="ml-auto flex items-center gap-1">
            {[['home',T('discover')],['map',T('map')],['appts',T('appointments')],['profile',T('profile')]]
              .filter(([k]) => user || (k!=='profile' && k!=='appts'))
              .map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)}
                className="text-sm font-bold transition-all px-3.5 py-2 whitespace-nowrap"
                style={tab===k?{background:COBALT,color:'#fff'}:{color:INK}}>
                {l}
                {k==='appts' && upcomingAppts?.length>0 && <span className="ml-1.5 text-xs font-black" style={{color:tab===k?'#fff':COBALT}}>·{upcomingAppts.length}</span>}
              </button>
            ))}
            {user ? (
              <button onClick={() => logout()}
                className="ml-2 text-sm font-bold hidden sm:inline" style={{color:MUTED}}>{T('logout')}</button>
            ) : (
              <a href="/login" className="ml-2 px-3.5 py-2 text-sm font-bold" style={{background:COBALT,color:'#fff'}}>Giriş</a>
            )}
          </nav>
        </div>
      </header>

      {tab === 'home' && (
        <main className="max-w-[1280px] mx-auto px-5 sm:px-8 pb-32 sm:pb-14">
          {/* HERO — büyük italik display */}
          <section className={'pt-12 sm:pt-20 pb-12 sm:pb-16 transition-all duration-700 '+(mounted?'opacity-100 translate-y-0':'opacity-0 translate-y-3')}>
            <div className="grid grid-cols-12 gap-6 sm:gap-10 items-end">
              <div className="col-span-12 md:col-span-8">
                {/* Issue stamp */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[11px] font-black tracking-[0.3em]" style={{color:COBALT}}>VOL.{issue}</span>
                  <span className="h-px flex-1" style={{background:INK}}/>
                  <span className="text-[11px] font-black tracking-[0.3em]" style={{color:MUTED}}>{new Date().getFullYear()}</span>
                </div>
                <h1 className="font-black tracking-tight mb-2" style={{fontSize:'clamp(3rem,9vw,7.5rem)',lineHeight:0.92,letterSpacing:'-0.05em'}}>
                  Şehrin <em style={{color:COBALT,fontStyle:'italic',fontWeight:900}}>en</em><br/>
                  iyi randevu<br/>
                  <em style={{color:COBALT,fontStyle:'italic',fontWeight:900}}>koleksiyonu.</em>
                </h1>
              </div>
              <div className="col-span-12 md:col-span-4 md:pl-6 md:border-l-2" style={{borderColor:INK}}>
                <div className="text-base sm:text-lg font-medium leading-snug mb-5" style={{color:INK}}>
                  Atölyeler, salonlar, stüdyolar. Tek dokunuş, net fiyat, net zaman.
                </div>
                <div className="text-xs font-black tracking-[0.2em] uppercase" style={{color:MUTED}}>
                  Sayı {issue} — {filteredBiz.length} mekân
                </div>
              </div>
            </div>

            {/* Search — kalın çerçeve */}
            <div className="mt-10 sm:mt-14 max-w-3xl">
              <div className="flex items-center" style={{border:'2px solid '+INK,background:PAPER}}>
                <span className="px-4 text-lg font-black" style={{color:COBALT}}>↳</span>
                <input className="flex-1 py-4 text-base sm:text-lg outline-none bg-transparent font-medium" style={{color:INK}}
                  placeholder="İşletme, kategori, şehir ara…"
                  value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                <button className="px-6 py-4 text-sm font-black tracking-[0.15em] whitespace-nowrap" style={{background:INK,color:PAPER}}>
                  ARA →
                </button>
              </div>
            </div>
          </section>

          {/* CATEGORY — kalın chip'ler */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2" style={{borderTop:'2px solid '+INK,paddingTop:'1.25rem'}}>
            {[{v:'',l:'TÜMÜ'},{v:'Güzellik',l:'GÜZELLİK'},{v:'Kuaför',l:'KUAFÖR'},{v:'Masaj',l:'MASAJ'},{v:'Fitness',l:'FİTNESS'},{v:'Sağlık',l:'SAĞLIK'}].map(({v,l})=>{
              const active = (!v&&!catFilter)||(catFilter===v&&v!=='')
              return (
                <button key={v} onClick={()=>setCatFilter(v===catFilter&&v!==''?'':v)}
                  className="text-xs font-black tracking-[0.15em] whitespace-nowrap px-4 py-2.5 transition-all"
                  style={active
                    ?{background:COBALT,color:'#fff'}
                    :{color:INK,border:'2px solid '+INK,background:PAPER}}>
                  {l}
                </button>
              )
            })}
          </div>
          {/* SORT — kategori altında belirgin */}
          <div className="flex items-center gap-2 mb-10 flex-wrap">
            <button onClick={()=>{ if(userLoc){setSortBy('distance');return} if(locStatus==='denied'){toast3?.('❌ Konum izni reddedildi. Tarayıcı ayarlarından izin verin.');return} requestLocation?.(true) }}
              className="text-xs font-black tracking-[0.15em] whitespace-nowrap px-4 py-2.5 transition-all flex items-center gap-1.5"
              style={sortBy==='distance'?{background:COBALT,color:'#fff',boxShadow:'4px 4px 0 0 '+INK}:{color:COBALT,border:'2px solid '+COBALT,background:PAPER}}>
              📍 EN YAKIN {locStatus==='loading'&&'…'}
            </button>
            <button onClick={()=>setSortBy('rating')}
              className="text-xs font-black tracking-[0.15em] whitespace-nowrap px-4 py-2.5 transition-all"
              style={sortBy==='rating'?{background:INK,color:PAPER}:{color:INK,border:'2px solid '+INK,background:PAPER}}>
              ⭐ EN POPÜLER
            </button>
          </div>

          {activeAds.length > 0 && <div className="mb-14"><AdBanner ads={activeAds} userLoc={userLoc} businesses={businesses} onBizDetail={openDetail} variant="bold" uiLang={uiLang}/></div>}

          {/* FEATURED — Vol.01 büyük editör seçimi */}
          {featured && (
            <article onClick={()=>openDetail(featured)} className="cursor-pointer group mb-16 sm:mb-24">
              <div className="grid grid-cols-12 gap-6 sm:gap-10 items-start" style={{borderTop:'2px solid '+INK,paddingTop:'1.5rem'}}>
                <div className="col-span-12 md:col-span-7 relative overflow-hidden" style={{aspectRatio:'4/3',background:'#eaeaea'}}>
                  {featured.cover_url
                    ? <img src={featured.cover_url} alt={featured.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"/>
                    : <div className="w-full h-full flex items-center justify-center text-9xl">{featured.emoji||'★'}</div>}
                  {/* Numbered tag */}
                  <div className="absolute top-0 left-0 px-3 py-1.5 text-[11px] font-black tracking-[0.25em]" style={{background:COBALT,color:'#fff'}}>
                    No.01 · EDİTÖR SEÇİMİ
                  </div>
                </div>
                <div className="col-span-12 md:col-span-5 md:pt-2">
                  <div className="text-[11px] font-black tracking-[0.3em] mb-3" style={{color:COBALT}}>
                    {(featured.category||'').toUpperCase()} · {(featured.city||'').toUpperCase()}
                  </div>
                  <h2 className="font-black tracking-tight mb-5" style={{fontSize:'clamp(2rem,4.5vw,3.75rem)',lineHeight:0.95,letterSpacing:'-0.04em'}}>
                    {featured.name}
                  </h2>
                  {featured.bio && <p className="text-base mb-6 leading-relaxed" style={{color:INK}}>{featured.bio.slice(0,170)}{featured.bio.length>170?'…':''}</p>}
                  <div className="grid grid-cols-2 gap-4 mb-7">
                    <div>
                      <div className="text-[10px] font-black tracking-[0.25em] mb-1" style={{color:MUTED}}>PUAN</div>
                      <div className="font-black" style={{fontSize:'clamp(2rem,3vw,2.75rem)',color:COBALT,letterSpacing:'-0.03em',lineHeight:1}}>
                        {(featured.rating||0).toFixed(1)}<span className="text-base ml-1">★</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black tracking-[0.25em] mb-1" style={{color:MUTED}}>FİYAT</div>
                      <div className="font-black" style={{fontSize:'clamp(2rem,3vw,2.75rem)',color:INK,letterSpacing:'-0.03em',lineHeight:1}}>
                        ₺{featured.price_from}
                      </div>
                    </div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();openDetail(featured)}}
                    className="text-sm font-black tracking-[0.15em] px-6 py-3.5 transition-all hover:brightness-110"
                    style={{background:COBALT,color:'#fff'}}>
                    REZERVE ET →
                  </button>
                </div>
              </div>
            </article>
          )}

          {/* GRID — numaralı kartlar */}
          {rest.length > 0 && (
            <section className="mb-16">
              <div className="flex items-baseline gap-3 mb-8" style={{borderTop:'2px solid '+INK,paddingTop:'1.25rem'}}>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight" style={{letterSpacing:'-0.03em'}}>İçindekiler</h3>
                <div className="text-xs font-black tracking-[0.25em]" style={{color:COBALT}}>· {String(rest.length).padStart(2,'0')} MEKÂN</div>
                <div className="flex-1 h-px" style={{background:INK+'20'}}/>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
                {rest.map((b,i) => (
                  <article key={b.id} onClick={()=>openDetail(b)} className="cursor-pointer group">
                    {/* Image */}
                    <div className="relative overflow-hidden mb-4" style={{aspectRatio:'4/5',background:'#eaeaea'}}>
                      {b.cover_url
                        ? <img src={b.cover_url} alt={b.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"/>
                        : <div className="w-full h-full flex items-center justify-center text-7xl">{b.emoji||'★'}</div>}
                      {/* Numbered stamp */}
                      <div className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-black tracking-[0.25em]" style={{background:PAPER,color:INK}}>
                        No.{String(i+2).padStart(2,'0')}
                      </div>
                      {/* Distance */}
                      {b.dist && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-black tracking-[0.2em]" style={{background:COBALT,color:'#fff'}}>
                          {b.dist<1?Math.round(b.dist*1000)+' M':b.dist.toFixed(1)+' KM'}
                        </div>
                      )}
                    </div>
                    {/* Caption */}
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-[11px] font-black tracking-[0.25em]" style={{color:COBALT}}>{(b.category||'').toUpperCase()}</span>
                      <span className="text-[11px] font-black" style={{color:MUTED}}>·</span>
                      <span className="text-[11px] font-black tracking-[0.2em]" style={{color:MUTED}}>{(b.city||'').toUpperCase()}</span>
                    </div>
                    <h3 className="font-black text-2xl mb-3 group-hover:text-[#1736ff] transition-colors" style={{letterSpacing:'-0.025em',lineHeight:1.05}}>
                      {b.name}
                    </h3>
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-3">
                        <span className="text-base font-black" style={{color:INK}}>{(b.rating||0).toFixed(1)}<span className="ml-0.5" style={{color:COBALT}}>★</span></span>
                        <span className="text-base font-bold" style={{color:MUTED}}>₺{b.price_from}'den</span>
                      </div>
                      <span className="text-xs font-black tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity" style={{color:COBALT}}>OKU →</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {filteredBiz.length === 0 && (
            <div className="text-center py-32" style={{borderTop:'2px solid '+INK,marginTop:'2rem'}}>
              <div className="text-xs font-black tracking-[0.3em] mb-3" style={{color:COBALT}}>— SONUÇ YOK —</div>
              <div className="text-lg font-bold">Aradığınız kriterlere uygun mekân yok.</div>
              <div className="text-sm mt-2 font-medium" style={{color:MUTED}}>Filtreyi değiştirip tekrar deneyin.</div>
            </div>
          )}

          {/* MASTHEAD FOOTER */}
          <footer className="py-12 mt-8 flex flex-col sm:flex-row items-start sm:items-baseline gap-3 sm:gap-6" style={{borderTop:'2px solid '+INK}}>
            <div className="font-black text-2xl tracking-tight" style={{letterSpacing:'-0.03em'}}>
              RANDEVU<span style={{color:COBALT}}>.</span>
            </div>
            <div className="text-xs font-black tracking-[0.25em]" style={{color:MUTED}}>
              VOL.{issue} · {new Date().getFullYear()} · {user.name?.toUpperCase()}
            </div>
            <div className="sm:ml-auto text-xs font-black tracking-[0.25em]" style={{color:COBALT}}>
              POP EDITORIAL
            </div>
          </footer>
        </main>
      )}

      {tab === 'map' && <MapView businesses={businesses} onBook={(biz)=>{setDetailBiz(biz);setTab('home')}}/>}
      {tab === 'appts' && <AppointmentsTab {...props} variant="bold" />}
      {tab === 'profile' && <ProfileTab {...props} variant="bold" />}

      <BusinessDetailModal {...props.detailModalProps} variant="bold"/>
      <BookingModal biz={bookModal&&detailBiz?detailBiz:null} services={bizServices} staff={bizStaff} onClose={()=>setBookModal(false)} onBook={saveBooking} toast3={toast3} paymentEnabled={paymentEnabled} loyaltyEnabled={props.loyaltyEnabled} discount={activeAdDiscount} variant="bold" uiLang={uiLang} userId={user?.id} userPoints={user?.loyalty_points||0}/>
      <QRModal qrModal={qrModal} setQrModal={setQrModal} />
    </div>
  )
}
