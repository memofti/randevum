'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import AdBanner from '@/app/components/customer/AdBanner'
import BookingModal from '@/app/components/customer/BookingModal'
import BusinessDetailModal from '@/app/components/customer/BusinessDetailModal'
const MapView = dynamic(() => import('@/app/components/MapView'), { ssr: false })
function distKm(a,b,c,d){const R=6371,dL=(c-a)*Math.PI/180,dN=(d-b)*Math.PI/180,e=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dN/2)**2;return R*2*Math.atan2(Math.sqrt(e),Math.sqrt(1-e))}

export default function LuxuryTheme({ user, businesses, appointments, activeAds, profile, tab, setTab, openDetail, detailBiz, bizServices, bizStaff, detailLoading, bookModal, setBookModal, setDetailBiz, activeAdDiscount, paymentEnabled, toast3, userLoc, searchQ, setSearchQ, catFilter, setCatFilter, sortBy, setSortBy, cancelAppt, setReviewModal, setReviewForm, upcomingAppts, pastAppts }) {
  const filteredBiz = businesses
    .filter(b => (!catFilter || b.category === catFilter) && (!searchQ || b.name.toLowerCase().includes(searchQ.toLowerCase())))
    .map(b => ({ ...b, dist: userLoc && b.lat && b.lng ? distKm(userLoc.lat, userLoc.lng, parseFloat(b.lat), parseFloat(b.lng)) : null }))
    .sort((a, b) => sortBy === 'distance' ? (a.dist??9999)-(b.dist??9999) : (b.rating||0)-(a.rating||0))

  return (
    <div className="min-h-screen" style={{background:'#0a0a0a',color:'#fff'}}>
      {/* NAV - Luxury koyu */}
      <nav style={{background:'#111',borderBottom:'1px solid #222'}} className="h-16 flex items-center px-6 gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{background:'linear-gradient(135deg,#d4af37,#f5e06e)'}}>📅</div>
          <span className="font-black text-lg tracking-widest" style={{color:'#d4af37'}}>RANDEVU</span>
        </div>
        {[['home','Keşfet'],['map','Harita'],['appts','Randevularım'],['profile','Profilim']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className="text-sm font-semibold transition-all px-3 py-1.5 rounded-lg tracking-wider"
            style={tab===k?{color:'#d4af37',background:'rgba(212,175,55,0.1)'}:{color:'rgba(255,255,255,0.4)'}}>
            {l.toUpperCase()}
            {k==='appts' && upcomingAppts.length>0 && <span className="ml-1.5 text-xs rounded-full px-1.5 py-0.5" style={{background:'#d4af37',color:'#000'}}>{upcomingAppts.length}</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{background:'linear-gradient(135deg,#d4af37,#f5e06e)',color:'#000'}}>{user.name?.[0]||'?'}</div>
          <button onClick={async()=>{ await supabase.auth.signOut(); localStorage.removeItem('randevu_user'); window.location.href='/login' }} style={{color:'rgba(255,255,255,0.3)'}} className="text-sm">Çıkış</button>
        </div>
      </nav>

      {tab === 'home' && (
        <>
          {/* HERO - Luxury */}
          <div className="py-20 px-6 text-center relative overflow-hidden" style={{background:'linear-gradient(180deg,#111 0%,#0a0a0a 100%)'}}>
            <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.15) 0%, transparent 70%)'}}/>
            <div className="max-w-2xl mx-auto relative z-10">
              <div className="text-xs tracking-widest mb-4" style={{color:'#d4af37'}}>PREMIUM RANDEVU SERVİSİ</div>
              <h1 className="text-5xl font-black mb-4 tracking-tight" style={{color:'#fff'}}>Randevunuzu Alın</h1>
              <p className="mb-10" style={{color:'rgba(255,255,255,0.4)'}}>Seçkin işletmelerin kapısını aralayın</p>
              <div className="flex rounded-xl overflow-hidden max-w-lg mx-auto" style={{border:'1px solid rgba(212,175,55,0.3)'}}>
                <input className="flex-1 px-5 py-4 text-sm outline-none" style={{background:'rgba(255,255,255,0.05)',color:'#fff'}} placeholder="İşletme ara..."
                  value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                <button className="px-6 py-4 text-sm font-bold tracking-wider" style={{background:'#d4af37',color:'#000'}}>ARA</button>
              </div>
              <div className="flex gap-2 mt-6 flex-wrap justify-center">
                {[{v:'',l:'Tümü'},{v:'Güzellik',l:'Güzellik'},{v:'Kuaför',l:'Kuaför'},{v:'Masaj',l:'Masaj'},{v:'Fitness',l:'Fitness'},{v:'Sağlık',l:'Sağlık'}].map(({v,l})=>(
                  <button key={v} onClick={()=>setCatFilter(v===catFilter&&v!==''?'':v)}
                    className="px-4 py-1.5 text-xs font-semibold tracking-wider rounded-full transition-all"
                    style={(!v&&!catFilter)||(catFilter===v&&v!=='')?{background:'#d4af37',color:'#000',border:'1px solid #d4af37'}:{background:'transparent',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.15)'}}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-6 py-10">
            {activeAds.length > 0 && <AdBanner ads={activeAds} userLoc={userLoc} businesses={businesses} onBizDetail={openDetail}/>}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black tracking-wider" style={{color:'rgba(255,255,255,0.9)'}}>{(catFilter||'TÜM İŞLETMELER').toUpperCase()}</h2>
              <div style={{color:'rgba(255,255,255,0.3)',fontSize:'13px'}}>{filteredBiz.length} sonuç</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBiz.map((b,i) => (
                <div key={b.id} onClick={() => openDetail(b)} className="group cursor-pointer rounded-xl overflow-hidden transition-all hover:scale-[1.02]" style={{background:'#111',border:'1px solid #1a1a1a'}}>
                  <div className="h-48 relative overflow-hidden" style={{background:'#1a1a1a'}}>
                    {b.cover_url ? <img src={b.cover_url} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                      : <div className="w-full h-full flex items-center justify-center text-5xl">{b.emoji||'🏢'}</div>}
                    <div className="absolute inset-0" style={{background:'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)'}}/>
                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                      <div className="font-black text-white text-base">{b.name}</div>
                      <div className="text-xs font-bold px-2 py-1 rounded-full" style={{background:'rgba(212,175,55,0.2)',color:'#d4af37',border:'1px solid rgba(212,175,55,0.3)'}}>★ {b.rating}</div>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>{b.category.toUpperCase()} · {b.city.toUpperCase()}</div>
                      <div className="text-sm font-semibold mt-1" style={{color:'rgba(255,255,255,0.7)'}}>₺{b.price_from}'den</div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();openDetail(b)}} className="text-xs font-bold px-4 py-2 rounded-lg tracking-wider" style={{background:'#d4af37',color:'#000'}}>REZERVE ET</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'map' && <MapView businesses={businesses} onBook={(biz)=>{setDetailBiz(biz);setTab('home')}}/>}
      {tab === 'appts' && (
        <div className="max-w-2xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-black tracking-wider mb-6" style={{color:'#d4af37'}}>RANDEVULARIM</h1>
          <div className="space-y-3">
            {[...upcomingAppts,...pastAppts].map(a=>(
              <div key={a.id} className="rounded-xl p-5 flex items-center gap-4" style={{background:'#111',border:'1px solid #1a1a1a'}}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{background:'#1a1a1a'}}>{a.businesses?.emoji||'🏢'}</div>
                <div className="flex-1">
                  <div className="font-bold text-white">{a.businesses?.name}</div>
                  <div className="text-sm" style={{color:'rgba(255,255,255,0.4)'}}>{a.services?.name} · {new Date(a.appointment_date).toLocaleDateString('tr-TR')} {String(a.appointment_time).slice(0,5)}</div>
                </div>
                <div className="text-xs font-bold px-3 py-1 rounded-full" style={{background:'rgba(212,175,55,0.1)',color:'#d4af37',border:'1px solid rgba(212,175,55,0.2)'}}>{a.status==='confirmed'?'ONAYLANDI':a.status==='pending'?'BEKLİYOR':'TAMAMLANDI'}</div>
              </div>
            ))}
            {upcomingAppts.length===0&&pastAppts.length===0&&<div className="text-center py-16" style={{color:'rgba(255,255,255,0.3)'}}>Henüz randevu yok</div>}
          </div>
        </div>
      )}
      {tab === 'profile' && (
        <div className="max-w-md mx-auto px-6 py-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-4" style={{background:'linear-gradient(135deg,#d4af37,#f5e06e)',color:'#000'}}>{user.name?.[0]||'?'}</div>
          <div className="text-2xl font-black mb-1" style={{color:'#fff'}}>{user.name}</div>
          <div className="text-sm mb-6" style={{color:'rgba(255,255,255,0.4)'}}>{user.email}</div>
          <button onClick={async()=>{ await supabase.auth.signOut(); localStorage.removeItem('randevu_user'); window.location.href='/login' }}
            className="w-full py-3 rounded-xl text-sm font-bold tracking-wider" style={{border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.4)'}}>ÇIKIŞ YAP</button>
        </div>
      )}
      <BusinessDetailModal biz={detailBiz} bizIdx={businesses.findIndex(b=>b.id===detailBiz?.id)} services={bizServices} staff={bizStaff} loading={detailLoading} onClose={()=>setDetailBiz(null)} onBook={()=>setBookModal(true)}/>
      <BookingModal biz={bookModal&&detailBiz?detailBiz:null} services={bizServices} staff={bizStaff} onClose={()=>setBookModal(false)} onBook={async()=>{}} toast3={toast3} paymentEnabled={paymentEnabled} discount={activeAdDiscount}/>
    </div>
  )
}
