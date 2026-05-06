'use client'
import { supabase } from '@/lib/supabase'

function distKm(lat1,lng1,lat2,lng2){const R=6371,dL=(lat2-lat1)*Math.PI/180,dN=(lng2-lng1)*Math.PI/180,a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}

export default function AdBanner({ ads, userLoc, businesses, onBizDetail }) {
  if (!ads.length) return null

  const visibleAds = ads.filter(ad => {
    if (ad.type === 'general') return true
    if (ad.type === 'regional' && userLoc && ad.target_lat && ad.target_lng) {
      return distKm(userLoc.lat, userLoc.lng, parseFloat(ad.target_lat), parseFloat(ad.target_lng)) <= (ad.target_radius_km || 20)
    }
    return false
  })

  if (!visibleAds.length) return null

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sponsorlu</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {visibleAds.map(ad => (
          <div key={ad.id} onClick={async () => {
            await supabase.from('ads').update({clicks: (ad.clicks||0)+1}).eq('id', ad.id)
            const biz = businesses.find(b => b.id === ad.business_id)
            if (biz) onBizDetail(biz)
          }} className="flex-none w-64 bg-white rounded-2xl border border-orange-200 shadow-sm cursor-pointer hover:shadow-md transition-all overflow-hidden relative">
            <div className="absolute top-2 left-2 z-10 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Reklam</div>
            {ad.image_url && <img src={ad.image_url} alt={ad.title} className="w-full h-32 object-cover"/>}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{ad.businesses?.emoji||'🏢'}</span>
                <span className="text-xs text-gray-500 font-semibold">{ad.businesses?.name}</span>
                {ad.type==='regional' && <span className="ml-auto text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">📍 Yakında</span>}
              </div>
              <div className="font-bold text-sm mb-1">{ad.title}</div>
              {ad.description && <div className="text-xs text-gray-500 line-clamp-2">{ad.description}</div>}
              {ad.discount_pct > 0 && <div className="mt-2 inline-block bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">%{ad.discount_pct} İndirim</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
