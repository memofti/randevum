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

export default function SoftTheme(props) {
  const { user, businesses, appointments, activeAds, profile, tab, setTab, openDetail, detailBiz, bizServices, bizStaff, detailLoading, bookModal, setBookModal, setDetailBiz, activeAdDiscount, paymentEnabled, toast3, userLoc, searchQ, setSearchQ, catFilter, setCatFilter, sortBy, setSortBy, cancelAppt, upcomingAppts, pastAppts } = props
  const filteredBiz = businesses
    .filter(b => (!catFilter || b.category === catFilter) && (!searchQ || b.name.toLowerCase().includes(searchQ.toLowerCase())))
    .map(b => ({ ...b, dist: userLoc && b.lat && b.lng ? distKm(userLoc.lat, userLoc.lng, parseFloat(b.lat), parseFloat(b.lng)) : null }))
    .sort((a, b) => sortBy === 'distance' ? (a.dist??9999)-(b.dist??9999) : (b.rating||0)-(a.rating||0))

  return (
    <div className="min-h-screen" style={{background:'#fdf6f0'}}>
      {/* NAV - Soft pastel */}
      <nav className="h-16 flex items-center px-6 gap-4 sticky top-0 z-40" style={{background:'#fff5ef',borderBottom:'1px solid #fde8d8'}}>
        <div className="flex items-center gap-2 mr-4">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{background:'#ff8fab'}}>📅</div>
          <span className="font-black text-lg" style={{color:'#6b3a3a'}}>randevu<span style={{color:'#ff8fab'}}>.</span></span>
        </div>
        {[['home','Keşfet'],['map','Harita'],['appts','Randevularım'],['profile','Profilim']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className="text-sm font-semibold transition-all px-3 py-1.5 rounded-full"
            style={tab===k?{background:'#ff8fab',color:'#fff'}:{color:'#b08080'}}>
            {l}
            {k==='appts' && upcomingAppts.length>0 && <span className="ml-1 bg-red-400 text-white text-xs rounded-full px-1.5 py-0.5">{upcomingAppts.length}</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{background:'#ff8fab'}}>{user.name?.[0]||'?'}</div>
          <button onClick={async()=>{ await supabase.auth.signOut(); localStorage.removeItem('randevu_user'); window.location.href='/login' }} style={{color:'#c9a0a0'}} className="text-sm">Çıkış</button>
        </div>
      </nav>

      {tab === 'home' && (
        <>
          {/* HERO - Soft */}
          <div className="py-14 px-6 text-center" style={{background:'linear-gradient(135deg,#fff5ef 0%,#ffe4f0 100%)'}}>
            <div className="max-w-2xl mx-auto">
              <div className="text-4xl mb-2">🌸</div>
              <h1 className="text-4xl font-black mb-2" style={{color:'#6b3a3a'}}>Kendinize Vakit Ayırın</h1>
              <p className="mb-8 text-base" style={{color:'#c9a0a0'}}>En güzel randevular burada sizi bekliyor</p>
              <div className="flex rounded-2xl overflow-hidden max-w-lg mx-auto shadow-md" style={{border:'2px solid #fde8d8'}}>
                <input className="flex-1 px-5 py-4 text-sm outline-none" style={{background:'#fff',color:'#6b3a3a'}} placeholder="Ne arıyorsunuz? 🔍"
                  value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                <button className="px-6 py-4 text-sm font-bold text-white" style={{background:'#ff8fab'}}>Ara</button>
              </div>
              <div className="flex gap-2 mt-5 flex-wrap justify-center">
                {[{v:'',l:'🌈 Tümü'},{v:'Güzellik',l:'💅 Güzellik'},{v:'Kuaför',l:'✂️ Kuaför'},{v:'Masaj',l:'🧘 Masaj'},{v:'Fitness',l:'🏋️ Fitness'},{v:'Sağlık',l:'💊 Sağlık'}].map(({v,l})=>(
                  <button key={v} onClick={()=>setCatFilter(v===catFilter&&v!==''?'':v)}
                    className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                    style={(!v&&!catFilter)||(catFilter===v&&v!=='')?{background:'#ff8fab',color:'#fff'}:{background:'white',color:'#c9a0a0',border:'1.5px solid #fde8d8'}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-6 py-8">
            {activeAds.length > 0 && <AdBanner ads={activeAds} userLoc={userLoc} businesses={businesses} onBizDetail={openDetail}/>}
            <h2 className="text-lg font-black mb-6" style={{color:'#6b3a3a'}}>{catFilter||'Tüm İşletmeler'} <span style={{color:'#e0b0b0',fontWeight:400,fontSize:'14px'}}>({filteredBiz.length})</span></h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBiz.map((b,i) => (
                <div key={b.id} onClick={() => openDetail(b)} className="group cursor-pointer rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1" style={{background:'#fff',border:'1.5px solid #fde8d8'}}>
                  <div className="h-44 relative overflow-hidden" style={{background:'linear-gradient(135deg,#ffe4f0,#fff5ef)'}}>
                    {b.cover_url ? <img src={b.cover_url} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                      : <div className="w-full h-full flex items-center justify-center text-5xl">{b.emoji||'🏢'}</div>}
                    <div className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full" style={{background:'#fff',color:'#ff8fab'}}>★ {b.rating}</div>
                  </div>
                  <div className="p-4">
                    <div className="font-black mb-1" style={{color:'#6b3a3a'}}>{b.name}</div>
                    <div className="text-xs mb-3" style={{color:'#c9a0a0'}}>{b.category} · {b.city}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{color:'#b08080'}}>₺{b.price_from}'den</span>
                      <button onClick={e=>{e.stopPropagation();openDetail(b)}} className="text-xs font-bold px-4 py-2 rounded-full text-white" style={{background:'#ff8fab'}}>Randevu Al</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'map' && <MapView businesses={businesses} onBook={(biz)=>{setDetailBiz(biz);setTab('home')}}/>}
      {tab === 'appts' && <AppointmentsTab {...props} variant="soft" />}
      {tab === 'profile' && <ProfileTab {...props} variant="soft" />}
      <BusinessDetailModal biz={detailBiz} bizIdx={businesses.findIndex(b=>b.id===detailBiz?.id)} services={bizServices} staff={bizStaff} loading={detailLoading} onClose={()=>setDetailBiz(null)} onBook={()=>setBookModal(true)}/>
      <BookingModal biz={bookModal&&detailBiz?detailBiz:null} services={bizServices} staff={bizStaff} onClose={()=>setBookModal(false)} onBook={async()=>{}} toast3={toast3} paymentEnabled={paymentEnabled} discount={activeAdDiscount}/>
    </div>
  )
}
