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
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-extrabold text-base text-gray-800">🎁 Size Özel Kampanyalar</h2>
          <p className="text-xs text-gray-400 mt-0.5">Yakınındaki işletmelerin özel teklifleri</p>
        </div>
        {visibleAds.length > 2 && <span className="text-xs text-gray-400">→ kaydır</span>}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {visibleAds.map(ad => (
          <div key={ad.id} onClick={async () => {
            await supabase.from('ads').update({clicks: (ad.clicks||0)+1}).eq('id', ad.id)
            const biz = businesses.find(b => b.id === ad.business_id)
            if (biz) onBizDetail(biz, ad.discount_pct||0)
          }} className="flex-none w-72 bg-white rounded-2xl shadow-md cursor-pointer hover:shadow-xl transition-all overflow-hidden border border-gray-100 hover:-translate-y-0.5">
            {ad.image_url
              ? <div className="relative h-36 overflow-hidden">
                  <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover"/>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"/>
                  {ad.discount_pct > 0 && <div className="absolute top-3 right-3 bg-orange-500 text-white text-sm font-extrabold px-3 py-1 rounded-full shadow-lg">%{ad.discount_pct} İndirim</div>}
                  {ad.type==='regional' && <div className="absolute top-3 left-3 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">📍 Yakında</div>}
                </div>
              : <div className="h-20 bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center text-4xl relative">
                  {ad.businesses?.emoji||'🏢'}
                  {ad.discount_pct > 0 && <div className="absolute top-2 right-2 bg-white text-orange-500 text-xs font-extrabold px-2 py-0.5 rounded-full">%{ad.discount_pct} İndirim</div>}
                </div>
            }
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{ad.businesses?.emoji||'🏢'}</span>
                <span className="text-xs text-gray-500 font-semibold truncate">{ad.businesses?.name}</span>
              </div>
              <div className="font-extrabold text-sm text-gray-800 mb-1">{ad.title}</div>
              {ad.description && <div className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{ad.description}</div>}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-orange-500 font-bold">Detayları gör →</span>
                {ad.businesses?.price_from && <span className="text-xs text-gray-400">₺{ad.businesses.price_from}'den</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
