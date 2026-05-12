'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import AdBanner from '@/app/components/customer/AdBanner'
import BookingModal from '@/app/components/customer/BookingModal'
import BusinessDetailModal from '@/app/components/customer/BusinessDetailModal'

const MapView = dynamic(() => import('@/app/components/MapView'), { ssr: false })

function distKm(a,b,c,d){const R=6371,dL=(c-a)*Math.PI/180,dN=(d-b)*Math.PI/180,e=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dN/2)**2;return R*2*Math.atan2(Math.sqrt(e),Math.sqrt(1-e))}

export default function MinimalTheme({ user, businesses, appointments, activeAds, profile, tab, setTab, openDetail, detailBiz, bizServices, bizStaff, detailLoading, bookModal, setBookModal, setDetailBiz, activeAdDiscount, paymentEnabled, toast3, userLoc, searchQ, setSearchQ, catFilter, setCatFilter, sortBy, setSortBy, cancelAppt, setReviewModal, setReviewForm, qrModal, setQrModal, upcomingAppts, pastAppts }) {

  const cats = [...new Set(businesses.map(b => b.category))]
  const filteredBiz = businesses
    .filter(b => (!catFilter || b.category === catFilter) && (!searchQ || b.name.toLowerCase().includes(searchQ.toLowerCase())))
    .map(b => ({ ...b, dist: userLoc && b.lat && b.lng ? distKm(userLoc.lat, userLoc.lng, parseFloat(b.lat), parseFloat(b.lng)) : null }))
    .sort((a, b) => sortBy === 'distance' ? (a.dist??9999)-(b.dist??9999) : (b.rating||0)-(a.rating||0))

  return (
    <div className="min-h-screen bg-white">
      {/* NAV — Minimal beyaz */}
      <nav className="bg-white border-b border-gray-100 h-16 flex items-center px-6 gap-4 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-sm">📅</div>
          <span className="text-gray-900 font-black text-lg tracking-tight">randevu</span>
        </div>
        {[['home','Keşfet'],['map','Harita'],['appts','Randevularım'],['profile','Profilim']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={'text-sm font-semibold transition-all px-3 py-1.5 rounded-lg '+(tab===k?'text-gray-900 bg-gray-100':'text-gray-400 hover:text-gray-700')}>
            {l}
            {k==='appts' && upcomingAppts.length>0 && <span className="ml-1.5 bg-gray-900 text-white text-xs rounded-full px-1.5 py-0.5">{upcomingAppts.length}</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <div className="text-sm text-gray-500 font-medium hidden sm:block">{user.name?.split(' ')[0]}</div>
          <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-sm font-bold text-white">{user.name?.[0]||'?'}</div>
          <button onClick={async()=>{ await supabase.auth.signOut(); localStorage.removeItem('randevu_user'); window.location.href='/login' }} className="text-gray-400 hover:text-gray-700 text-sm">Çıkış</button>
        </div>
      </nav>

      {tab === 'home' && (
        <>
          {/* HERO — Minimal */}
          <div className="bg-gray-50 border-b border-gray-100 py-12 px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Randevunuzu Alın</h1>
              <p className="text-gray-400 text-lg mb-8">Yakınınızdaki en iyi işletmeleri keşfedin</p>
              <div className="flex bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200 max-w-xl mx-auto">
                <input className="flex-1 px-5 py-4 text-sm outline-none text-gray-700 placeholder:text-gray-300" placeholder="İşletme veya hizmet ara..."
                  value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                <button className="px-6 py-4 bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors">Ara</button>
              </div>
              {/* Kategori pills */}
              <div className="flex gap-2 mt-6 flex-wrap justify-center">
                {[{v:'',l:'Tümü'},{v:'Güzellik',l:'💅 Güzellik'},{v:'Kuaför',l:'✂️ Kuaför'},{v:'Masaj',l:'🧘 Masaj'},{v:'Fitness',l:'🏋️ Fitness'},{v:'Sağlık',l:'💊 Sağlık'}].map(({v,l})=>(
                  <button key={v} onClick={()=>setCatFilter(v===catFilter&&v!==''?'':v)}
                    className={'px-4 py-2 rounded-full text-sm font-semibold transition-all border '+((!v&&!catFilter)||(catFilter===v&&v!=='')?'bg-gray-900 border-gray-900 text-white':'bg-white border-gray-200 text-gray-600 hover:border-gray-400')}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Kampanyalar */}
          {activeAds.length > 0 && (
            <div className="max-w-6xl mx-auto px-6 pt-8">
              <AdBanner ads={activeAds} userLoc={userLoc} businesses={businesses} onBizDetail={openDetail}/>
            </div>
          )}

          {/* Firma Grid */}
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-900">{catFilter||'Tüm İşletmeler'} <span className="text-gray-300 font-normal text-base">({filteredBiz.length})</span></h2>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none text-gray-600">
                <option value="rating">⭐ En Yüksek Puan</option>
                <option value="distance">📍 En Yakın</option>
                <option value="price_asc">₺ Ucuzdan Pahalıya</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBiz.map((b,i) => (
                <div key={b.id} onClick={() => openDetail(b)} className="group cursor-pointer border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-300 hover:shadow-lg transition-all duration-300">
                  <div className="h-48 bg-gray-100 relative overflow-hidden">
                    {b.cover_url ? <img src={b.cover_url} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                      : <div className="w-full h-full flex items-center justify-center text-5xl">{b.emoji||'🏢'}</div>}
                    <div className="absolute top-3 right-3 bg-white text-xs font-bold px-2.5 py-1 rounded-full text-gray-700 shadow-sm">★ {b.rating}</div>
                  </div>
                  <div className="p-5">
                    <div className="text-base font-black text-gray-900 mb-1">{b.name}</div>
                    <div className="text-sm text-gray-400 mb-3">{b.category} · {b.city}{b.dist?(' · '+(b.dist<1?Math.round(b.dist*1000)+'m':b.dist.toFixed(1)+'km')):''}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">₺{b.price_from}'den</span>
                      <button onClick={e=>{e.stopPropagation();openDetail(b)}} className="bg-gray-900 hover:bg-gray-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">Randevu Al</button>
                    </div>
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
          <h1 className="text-2xl font-black text-gray-900 mb-6">Randevularım</h1>
          {upcomingAppts.length === 0 && pastAppts.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <div className="text-5xl mb-4">📅</div>
              <div className="font-bold text-gray-500">Henüz randevu yok</div>
              <button onClick={()=>setTab('home')} className="mt-4 bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-bold">İşletme Bul</button>
            </div>
          ) : (
            <div className="space-y-3">
              {[...upcomingAppts,...pastAppts].map(a=>(
                <div key={a.id} className="border border-gray-100 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">{a.businesses?.emoji||'🏢'}</div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{a.businesses?.name}</div>
                    <div className="text-sm text-gray-400">{a.services?.name} · {new Date(a.appointment_date).toLocaleDateString('tr-TR')} {String(a.appointment_time).slice(0,5)}</div>
                  </div>
                  <div className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-600">{a.status==='confirmed'?'Onaylı':a.status==='pending'?'Bekliyor':'Tamamlandı'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'profile' && (
        <div className="max-w-md mx-auto px-6 py-8 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center text-3xl font-black text-white mx-auto mb-4">{user.name?.[0]||'?'}</div>
          <div className="text-2xl font-black text-gray-900 mb-1">{user.name}</div>
          <div className="text-gray-400 text-sm">{user.email}</div>
          <button onClick={async()=>{ await supabase.auth.signOut(); localStorage.removeItem('randevu_user'); window.location.href='/login' }}
            className="mt-6 w-full py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50">Çıkış Yap</button>
        </div>
      )}

      {/* Modals */}
      <BusinessDetailModal biz={detailBiz} bizIdx={businesses.findIndex(b=>b.id===detailBiz?.id)} services={bizServices} staff={bizStaff} loading={detailLoading} onClose={()=>setDetailBiz(null)} onBook={()=>setBookModal(true)}/>
      <BookingModal biz={bookModal&&detailBiz?detailBiz:null} services={bizServices} staff={bizStaff} onClose={()=>setBookModal(false)} onBook={async(form,card)=>{}} toast3={toast3} paymentEnabled={paymentEnabled} discount={activeAdDiscount}/>
    </div>
  )
}
