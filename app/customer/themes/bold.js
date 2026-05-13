'use client'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import AdBanner from '@/app/components/customer/AdBanner'
import BookingModal from '@/app/components/customer/BookingModal'
import BusinessDetailModal from '@/app/components/customer/BusinessDetailModal'
import ProfileTab from '@/app/components/customer/ProfileTab'
import AppointmentsTab from '@/app/components/customer/AppointmentsTab'
const MapView = dynamic(() => import('@/app/components/MapView'), { ssr: false })
function distKm(a,b,c,d){const R=6371,dL=(c-a)*Math.PI/180,dN=(d-b)*Math.PI/180,e=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dN/2)**2;return R*2*Math.atan2(Math.sqrt(e),Math.sqrt(1-e))}

export default function BoldTheme(props) {
  const { user, businesses, appointments, activeAds, profile, tab, setTab, openDetail, detailBiz, bizServices, bizStaff, detailLoading, bookModal, setBookModal, setDetailBiz, activeAdDiscount, paymentEnabled, toast3, userLoc, searchQ, setSearchQ, catFilter, setCatFilter, sortBy, setSortBy, upcomingAppts, pastAppts } = props
  const filteredBiz = businesses
    .filter(b => (!catFilter || b.category === catFilter) && (!searchQ || b.name.toLowerCase().includes(searchQ.toLowerCase())))
    .map(b => ({ ...b, dist: userLoc && b.lat && b.lng ? distKm(userLoc.lat, userLoc.lng, parseFloat(b.lat), parseFloat(b.lng)) : null }))
    .sort((a, b) => sortBy === 'distance' ? (a.dist??9999)-(b.dist??9999) : (b.rating||0)-(a.rating||0))

  return (
    <div className="min-h-screen" style={{background:'#f8f8f8'}}>
      {/* NAV - Bold */}
      <nav className="h-16 flex items-center px-6 gap-4 sticky top-0 z-40" style={{background:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)'}}>
        <div className="flex items-center gap-2 mr-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white" style={{background:'rgba(255,255,255,0.2)'}}>📅</div>
          <span className="font-black text-xl text-white tracking-tight">RandevuApp</span>
        </div>
        {[['home','Keşfet'],['map','Harita'],['appts','Randevularım'],['profile','Profilim']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className="text-sm font-bold transition-all px-3 py-1.5 rounded-lg"
            style={tab===k?{background:'rgba(255,255,255,0.25)',color:'#fff'}:{color:'rgba(255,255,255,0.6)'}}>
            {l}
            {k==='appts' && upcomingAppts.length>0 && <span className="ml-1 text-xs rounded-full px-1.5 py-0.5 bg-yellow-400 text-gray-900 font-black">{upcomingAppts.length}</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-purple-700 bg-white">{user.name?.[0]||'?'}</div>
          <button onClick={async()=>{ await supabase.auth.signOut(); localStorage.removeItem('randevu_user'); window.location.href='/login' }} className="text-white/60 text-sm">Çıkış</button>
        </div>
      </nav>

      {tab === 'home' && (
        <>
          {/* HERO - Bold gradient */}
          <div className="py-16 px-6 text-center relative overflow-hidden" style={{background:'linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%)'}}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{background:'#fff'}}/>
              <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full opacity-20 blur-3xl" style={{background:'#ffd700'}}/>
            </div>
            <div className="max-w-2xl mx-auto relative z-10">
              <div className="inline-block bg-white/20 text-white text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-wide">✨ En İyi İşletmeler</div>
              <h1 className="text-5xl font-black text-white mb-3 tracking-tight">Randevunuzu<br/>Hemen Alın</h1>
              <p className="text-white/70 mb-8 text-lg">Yakınınızdaki en iyi uzmanlarla buluşun</p>
              <div className="flex rounded-2xl overflow-hidden max-w-xl mx-auto shadow-2xl">
                <input className="flex-1 px-5 py-4 text-sm outline-none" style={{background:'#fff',color:'#333'}} placeholder="İşletme veya hizmet ara..."
                  value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                <button className="px-6 py-4 text-sm font-black text-white" style={{background:'linear-gradient(135deg,#f093fb,#f5576c)'}}>Ara →</button>
              </div>
              <div className="flex gap-2 mt-5 flex-wrap justify-center">
                {[{v:'',l:'🔥 Tümü'},{v:'Güzellik',l:'💅 Güzellik'},{v:'Kuaför',l:'✂️ Kuaför'},{v:'Masaj',l:'🧘 Masaj'},{v:'Fitness',l:'💪 Fitness'},{v:'Sağlık',l:'💊 Sağlık'}].map(({v,l})=>(
                  <button key={v} onClick={()=>setCatFilter(v===catFilter&&v!==''?'':v)}
                    className="px-4 py-2 rounded-full text-sm font-bold transition-all"
                    style={(!v&&!catFilter)||(catFilter===v&&v!=='')?{background:'#fff',color:'#764ba2'}:{background:'rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.85)',border:'1px solid rgba(255,255,255,0.2)'}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-6 py-8">
            {activeAds.length > 0 && <AdBanner ads={activeAds} userLoc={userLoc} businesses={businesses} onBizDetail={openDetail}/>}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black" style={{color:'#333'}}>{catFilter||'Tüm İşletmeler'} <span className="text-gray-400 font-normal text-sm">({filteredBiz.length})</span></h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBiz.map((b,i) => (
                <div key={b.id} onClick={() => openDetail(b)} className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="h-48 relative overflow-hidden">
                    {b.cover_url ? <img src={b.cover_url} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                      : <div className="w-full h-full flex items-center justify-center text-5xl" style={{background:'linear-gradient(135deg,#667eea20,#f093fb20)'}}>{b.emoji||'🏢'}</div>}
                    <div className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full text-white shadow-lg" style={{background:'linear-gradient(135deg,#667eea,#764ba2)'}}>★ {b.rating}</div>
                    {b.dist && <div className="absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full bg-white text-gray-600 shadow">{b.dist<1?Math.round(b.dist*1000)+'m':b.dist.toFixed(1)+'km'}</div>}
                  </div>
                  <div className="p-4">
                    <div className="font-black text-gray-900 mb-1">{b.name}</div>
                    <div className="text-xs text-gray-400 mb-3">{b.category} · {b.city}</div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                      <span className="text-sm font-bold text-gray-600">₺{b.price_from}'den</span>
                      <button onClick={e=>{e.stopPropagation();openDetail(b)}} className="text-xs font-black px-4 py-2 rounded-xl text-white" style={{background:'linear-gradient(135deg,#667eea,#764ba2)'}}>Randevu Al</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'map' && <MapView businesses={businesses} onBook={(biz)=>{setDetailBiz(biz);setTab('home')}}/>}
      {tab === 'appts' && <AppointmentsTab {...props} variant="bold" />}
      {tab === 'profile' && <ProfileTab {...props} variant="bold" />}
      <BusinessDetailModal biz={detailBiz} bizIdx={businesses.findIndex(b=>b.id===detailBiz?.id)} services={bizServices} staff={bizStaff} loading={detailLoading} onClose={()=>setDetailBiz(null)} onBook={()=>setBookModal(true)}/>
      <BookingModal biz={bookModal&&detailBiz?detailBiz:null} services={bizServices} staff={bizStaff} onClose={()=>setBookModal(false)} onBook={async()=>{}} toast3={toast3} paymentEnabled={paymentEnabled} discount={activeAdDiscount}/>
    </div>
  )
}
