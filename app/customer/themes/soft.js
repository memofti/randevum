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

// Pastel palette
const PINK = '#ffb3d1'
const LAV = '#c8b6ff'
const PEACH = '#ffd4a3'
const MINT = '#b8f2e6'
const SKY = '#c4e3ff'
const DEEP = '#3a2a4a'
const MUTED = '#7e6a8a'

// Bento tile size pattern — varies per index to create asymmetry
const BENTO_PATTERNS = [
  'md:col-span-3 md:row-span-2',   // 0 — large
  'md:col-span-2 md:row-span-1',   // 1
  'md:col-span-1 md:row-span-1',   // 2
  'md:col-span-2 md:row-span-1',   // 3
  'md:col-span-1 md:row-span-1',   // 4
  'md:col-span-3 md:row-span-1',   // 5 — wide
]

const TILE_COLORS = [
  { from:'#ffd6e0', to:'#ffb3d1', accent:'#e85d8a' },
  { from:'#dcd6ff', to:'#c8b6ff', accent:'#7a5cd1' },
  { from:'#ffe8c8', to:'#ffd4a3', accent:'#d68b3a' },
  { from:'#d4f5ec', to:'#b8f2e6', accent:'#3aa78f' },
  { from:'#dceaff', to:'#c4e3ff', accent:'#4a7ed1' },
  { from:'#ffd6e0', to:'#c8b6ff', accent:'#9b5cb8' },
]

export default function SoftTheme(props) {
  const { user, businesses, activeAds, tab, setTab, openDetail, detailBiz, bizServices, bizStaff, detailLoading, bookModal, setBookModal, setDetailBiz, activeAdDiscount, paymentEnabled, toast3, userLoc, locStatus, requestLocation, searchQ, setSearchQ, catFilter, setCatFilter, sortBy, setSortBy, qrModal, setQrModal, upcomingAppts, uiLang='tr', saveBooking } = props
  const T = (k) => i18n(k, uiLang)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(()=>setMounted(true), 50); return ()=>clearTimeout(t) }, [])

  const filteredBiz = businesses
    .filter(b => (!catFilter || b.category === catFilter) && (!searchQ || b.name.toLowerCase().includes(searchQ.toLowerCase())))
    .map(b => ({ ...b, dist: userLoc && b.lat && b.lng ? distKm(userLoc.lat, userLoc.lng, parseFloat(b.lat), parseFloat(b.lng)) : null }))
    .sort((a, b) => sortBy === 'distance' ? (a.dist??9999)-(b.dist??9999) : (b.rating||0)-(a.rating||0))

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{background:'linear-gradient(135deg,#fff0f6 0%,#f0e6ff 35%,#ffe8d4 65%,#dcf5ed 100%)',color:DEEP}}>
      {/* PASTEL MESH ORBS — fixed, drift */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full opacity-60 animate-blob" style={{background:'radial-gradient(circle, '+PINK+' 0%, transparent 65%)',filter:'blur(40px)'}}/>
        <div className="absolute top-1/3 -right-32 w-[32rem] h-[32rem] rounded-full opacity-50 animate-blob-2" style={{background:'radial-gradient(circle, '+LAV+' 0%, transparent 65%)',filter:'blur(50px)'}}/>
        <div className="absolute bottom-0 left-1/4 w-[26rem] h-[26rem] rounded-full opacity-50 animate-blob-3" style={{background:'radial-gradient(circle, '+PEACH+' 0%, transparent 65%)',filter:'blur(45px)'}}/>
        <div className="absolute top-1/2 left-1/2 w-[22rem] h-[22rem] rounded-full opacity-40 animate-blob" style={{background:'radial-gradient(circle, '+MINT+' 0%, transparent 65%)',filter:'blur(40px)'}}/>
      </div>

      <style jsx>{`
        @keyframes blob { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(40px,-30px) scale(1.08); } 66% { transform: translate(-25px,20px) scale(0.95); } }
        @keyframes blob-2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,40px) scale(1.12); } }
        @keyframes blob-3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-40px) scale(1.1); } }
        .animate-blob { animation: blob 18s ease-in-out infinite; }
        .animate-blob-2 { animation: blob-2 22s ease-in-out infinite; }
        .animate-blob-3 { animation: blob-3 20s ease-in-out infinite; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .float-soft { animation: float 6s ease-in-out infinite; }
      `}</style>

      {/* GLASS NAV */}
      <nav className="sticky top-3 z-40 mx-3 sm:mx-6 mt-3 rounded-full px-4 py-2.5 flex items-center gap-2 sm:gap-4" style={{background:'rgba(255,255,255,0.55)',backdropFilter:'blur(20px) saturate(180%)',WebkitBackdropFilter:'blur(20px) saturate(180%)',border:'1px solid rgba(255,255,255,0.6)',boxShadow:'0 10px 30px -10px rgba(155,92,184,0.15)'}}>
        <div className="flex items-center gap-2 mr-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-lg float-soft" style={{background:'linear-gradient(135deg,'+PINK+','+LAV+')'}}>🌸</div>
          <span className="font-black text-lg tracking-tight hidden sm:inline" style={{color:DEEP,letterSpacing:'-0.02em'}}>randevu<span style={{color:'#e85d8a'}}>.</span></span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {[['home',T('discover')],['map',T('map')],['appts',T('appointments')],['profile',T('profile')]]
            .filter(([k]) => user || (k!=='profile' && k!=='appts'))
            .map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className="text-xs sm:text-sm font-bold transition-all px-3 sm:px-4 py-1.5 rounded-full whitespace-nowrap"
              style={tab===k?{background:'linear-gradient(135deg,'+PINK+','+LAV+')',color:'#fff',boxShadow:'0 4px 14px -4px rgba(232,93,138,0.5)'}:{color:MUTED}}>
              {l}
              {k==='appts' && upcomingAppts?.length>0 && <span className="ml-1 text-[10px] rounded-full px-1.5 py-0.5" style={{background:'rgba(255,255,255,0.5)',color:DEEP}}>{upcomingAppts.length}</span>}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {user ? (<>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow" style={{background:'linear-gradient(135deg,'+LAV+','+PINK+')'}}>{user.name?.[0]||'?'}</div>
            <button onClick={logout} className="text-xs hidden sm:inline" style={{color:MUTED}}>{T('logout')}</button>
          </>) : (
            <a href="/login" className="px-3 py-1.5 rounded-full text-xs font-bold text-white shadow" style={{background:'linear-gradient(135deg,'+PINK+','+LAV+')'}}>Giriş</a>
          )}
        </div>
      </nav>

      {tab === 'home' && (
        <main className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-10 sm:pt-14 pb-32 sm:pb-14">
          {/* HERO — Bento intro */}
          <section className={'grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-10 transition-all duration-700 '+(mounted?'opacity-100 translate-y-0':'opacity-0 translate-y-4')}>
            <div className="md:col-span-2 rounded-[2rem] p-7 sm:p-10 relative overflow-hidden" style={{background:'rgba(255,255,255,0.55)',backdropFilter:'blur(24px) saturate(180%)',WebkitBackdropFilter:'blur(24px) saturate(180%)',border:'1px solid rgba(255,255,255,0.7)',boxShadow:'0 20px 60px -20px rgba(122,92,209,0.2)'}}>
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-50" style={{background:'radial-gradient(circle, '+PINK+', transparent 70%)',filter:'blur(20px)'}}/>
              <div className="relative">
                <div className="inline-flex items-center gap-2 mb-5 px-3 py-1 rounded-full text-xs font-bold" style={{background:'rgba(255,255,255,0.7)',color:'#e85d8a',border:'1px solid rgba(232,93,138,0.2)'}}>
                  🌸 Bugün kendinize iyi davranın
                </div>
                <h1 className="font-black tracking-tight mb-4" style={{fontSize:'clamp(2rem,5.5vw,3.75rem)',lineHeight:1.05,letterSpacing:'-0.03em',color:DEEP}}>
                  Yumuşacık<br/>
                  <span style={{background:'linear-gradient(135deg,#e85d8a,#9b5cb8,#d68b3a)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>bir randevu</span> ile<br/>
                  güne başlayın.
                </h1>
                <p className="mb-7 max-w-md text-base sm:text-lg" style={{color:MUTED}}>Pastel pencerelerden süzülen ışık gibi nazik. Şehirdeki en şirin işletmeleri keşfedin.</p>
                <div className="flex items-center gap-2 rounded-full overflow-hidden p-1.5 max-w-lg" style={{background:'rgba(255,255,255,0.8)',border:'1px solid rgba(255,255,255,0.9)',boxShadow:'0 8px 24px -8px rgba(232,93,138,0.2)'}}>
                  <input className="flex-1 px-5 py-2.5 text-sm outline-none bg-transparent" placeholder="Ne arıyorsunuz? Salon, masaj…"
                    value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                  <button className="px-5 py-2.5 text-sm font-bold text-white rounded-full" style={{background:'linear-gradient(135deg,#e85d8a,#9b5cb8)'}}>Ara ✨</button>
                </div>
              </div>
            </div>
            {/* Stats tile */}
            <div className="rounded-[2rem] p-6 flex flex-col justify-between relative overflow-hidden" style={{background:'linear-gradient(135deg,'+LAV+','+PINK+')',color:'#fff',boxShadow:'0 20px 60px -20px rgba(122,92,209,0.4)'}}>
              <div className="absolute -bottom-10 -right-10 text-9xl opacity-20 select-none">✨</div>
              <div>
                <div className="text-xs tracking-widest opacity-80 mb-2">BU AY</div>
                <div className="text-5xl sm:text-6xl font-black" style={{letterSpacing:'-0.03em',textShadow:'0 2px 10px rgba(0,0,0,0.1)'}}>{filteredBiz.length.toString().padStart(2,'0')}</div>
                <div className="text-sm font-semibold opacity-90 mt-1">harika mekân</div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="rounded-2xl p-3" style={{background:'rgba(255,255,255,0.25)',backdropFilter:'blur(10px)'}}>
                  <div className="text-2xl font-black">{(filteredBiz.reduce((s,b)=>s+(b.rating||0),0)/(filteredBiz.length||1)).toFixed(1)}</div>
                  <div className="text-[10px] tracking-widest opacity-80 mt-0.5">ORT. ★</div>
                </div>
                <div className="rounded-2xl p-3" style={{background:'rgba(255,255,255,0.25)',backdropFilter:'blur(10px)'}}>
                  <div className="text-2xl font-black">{[...new Set(businesses.map(b=>b.city))].length}</div>
                  <div className="text-[10px] tracking-widest opacity-80 mt-0.5">ŞEHİR</div>
                </div>
              </div>
            </div>
          </section>

          {/* CATEGORY PILLS — soft glass */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {[{v:'',l:'🌈 Tümü'},{v:'Güzellik',l:'💅 Güzellik'},{v:'Kuaför',l:'✂️ Kuaför'},{v:'Masaj',l:'🧘 Masaj'},{v:'Fitness',l:'🏋️ Fitness'},{v:'Sağlık',l:'💊 Sağlık'}].map(({v,l})=>{
              const active = (!v&&!catFilter)||(catFilter===v&&v!=='')
              return (
                <button key={v} onClick={()=>setCatFilter(v===catFilter&&v!==''?'':v)}
                  className="px-5 py-2.5 rounded-full text-sm font-bold transition-all"
                  style={active?{background:'linear-gradient(135deg,#e85d8a,#9b5cb8)',color:'#fff',boxShadow:'0 6px 18px -6px rgba(232,93,138,0.5)'}:{background:'rgba(255,255,255,0.55)',color:MUTED,backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.7)'}}>
                  {l}
                </button>
              )
            })}
          </div>
          {/* SORT — kategori altında belirgin */}
          <div className="flex items-center gap-2 mb-8 flex-wrap">
            <button onClick={()=>{ if(!userLoc && requestLocation){ requestLocation(true) } else { setSortBy('distance') } }}
              className="px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-1.5"
              style={sortBy==='distance'?{background:'linear-gradient(135deg,#e85d8a,#9b5cb8)',color:'#fff',boxShadow:'0 6px 18px -6px rgba(232,93,138,0.5)'}:{background:'rgba(255,255,255,0.8)',color:'#e85d8a',border:'1.5px solid #e85d8a'}}>
              📍 Bana en yakın {locStatus==='loading'&&'…'}
            </button>
            <button onClick={()=>setSortBy('rating')}
              className="px-5 py-2.5 rounded-full text-sm font-bold transition-all"
              style={sortBy==='rating'?{background:'rgba(58,42,74,0.95)',color:'#fff'}:{background:'rgba(255,255,255,0.55)',color:MUTED,border:'1px solid rgba(255,255,255,0.7)'}}>
              ⭐ En iyiler
            </button>
          </div>

          {activeAds.length > 0 && <div className="mb-8"><AdBanner ads={activeAds} userLoc={userLoc} businesses={businesses} onBizDetail={openDetail} variant="soft" uiLang={uiLang}/></div>}

          {/* BENTO GRID — varying tile sizes */}
          <div className="grid grid-cols-1 md:grid-cols-4 auto-rows-auto md:auto-rows-[200px] gap-4 sm:gap-5">
            {filteredBiz.map((b,i) => {
              const pattern = BENTO_PATTERNS[i % BENTO_PATTERNS.length]
              const color = TILE_COLORS[i % TILE_COLORS.length]
              const isLarge = pattern.includes('row-span-2')
              const isWide = pattern.includes('col-span-3') || pattern.includes('col-span-2')
              return (
                <div key={b.id} onClick={()=>openDetail(b)} className={'group cursor-pointer rounded-[1.75rem] p-5 relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-2xl '+pattern}
                  style={{background:'linear-gradient(135deg,'+color.from+' 0%, '+color.to+' 100%)',border:'1px solid rgba(255,255,255,0.7)',boxShadow:'0 12px 36px -16px rgba(122,92,209,0.25)'}}>
                  {/* Glass image overlay if cover */}
                  {b.cover_url && (
                    <div className="absolute inset-0 opacity-80">
                      <img src={b.cover_url} alt={b.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>
                      <div className="absolute inset-0" style={{background:'linear-gradient(to top, '+color.to+'cc 0%, transparent 60%)'}}/>
                    </div>
                  )}
                  {!b.cover_url && (
                    <div className="absolute -bottom-4 -right-4 select-none opacity-50" style={{fontSize:isLarge?'10rem':'6rem'}}>{b.emoji||'🌸'}</div>
                  )}

                  {/* Floating rating sticker */}
                  <div className="absolute top-4 right-4 z-10 rounded-full px-3 py-1.5 text-xs font-black float-soft" style={{background:'rgba(255,255,255,0.85)',backdropFilter:'blur(10px)',color:color.accent,boxShadow:'0 4px 12px -4px rgba(0,0,0,0.1)'}}>
                    ★ {b.rating?.toFixed(1)}
                  </div>

                  <div className="relative h-full flex flex-col z-10">
                    <div className="inline-block self-start text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full mb-auto" style={{background:'rgba(255,255,255,0.7)',color:color.accent,backdropFilter:'blur(8px)'}}>
                      {(b.category||'').toUpperCase()}
                    </div>
                    <div className="mt-auto">
                      <div className="font-black text-white" style={{fontSize:isLarge?'1.75rem':'1.15rem',letterSpacing:'-0.02em',lineHeight:1.1,textShadow:'0 2px 12px rgba(0,0,0,0.25)'}}>{b.name}</div>
                      <div className="text-xs font-semibold mt-1 text-white/90" style={{textShadow:'0 1px 6px rgba(0,0,0,0.2)'}}>{b.city}{b.dist?' · '+(b.dist<1?Math.round(b.dist*1000)+'m':b.dist.toFixed(1)+'km'):''}</div>
                      {(isLarge||isWide) && (
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs font-bold text-white/95" style={{textShadow:'0 1px 6px rgba(0,0,0,0.2)'}}>₺{b.price_from}'den</span>
                          <span className="text-xs font-black tracking-widest px-3 py-1.5 rounded-full" style={{background:'rgba(255,255,255,0.85)',color:color.accent,backdropFilter:'blur(8px)'}}>
                            REZERVE ET →
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredBiz.length === 0 && (
            <div className="text-center py-24 rounded-[2rem]" style={{background:'rgba(255,255,255,0.55)',backdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.7)'}}>
              <div className="text-6xl mb-4 float-soft">🌸</div>
              <div className="font-bold text-lg mb-1" style={{color:DEEP}}>Sonuç bulunamadı</div>
              <div className="text-sm" style={{color:MUTED}}>Başka bir kategori dene</div>
            </div>
          )}
        </main>
      )}

      {tab === 'map' && <MapView businesses={businesses} onBook={(biz)=>{setDetailBiz(biz);setTab('home')}}/>}
      {tab === 'appts' && <AppointmentsTab {...props} variant="soft" />}
      {tab === 'profile' && <ProfileTab {...props} variant="soft" />}

      <BusinessDetailModal {...props.detailModalProps} variant="soft"/>
      <BookingModal biz={bookModal&&detailBiz?detailBiz:null} services={bizServices} staff={bizStaff} onClose={()=>setBookModal(false)} onBook={saveBooking} toast3={toast3} paymentEnabled={paymentEnabled} loyaltyEnabled={props.loyaltyEnabled} discount={activeAdDiscount} variant="soft" uiLang={uiLang} userId={user?.id} userPoints={user?.loyalty_points||0}/>
      <QRModal qrModal={qrModal} setQrModal={setQrModal} />
    </div>
  )
}
