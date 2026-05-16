'use client'
const COLORS = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444']

export default function BusinessCard({ b, i, onDetail, onMap, highlighted }) {
  return (
    <div onClick={() => onDetail(b)}
      className={`bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group ${highlighted ? 'border-orange-400 ring-2 ring-orange-300 ring-offset-2' : 'border-gray-200'}`}>
      <div className="h-28 flex items-center justify-center text-5xl relative overflow-hidden" style={{ background:`${COLORS[i%COLORS.length]}15` }}>
        {b.cover_url
          ? <img src={b.cover_url} alt={b.name} className="w-full h-full object-cover"/>
          : <span>{b.emoji||'🏢'}</span>
        }
        {b.cover_url && <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"/>}
        <div className="absolute top-2 right-2 z-10"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500 text-white">● Müsait</span></div>
        {b.cover_url && <div className="absolute bottom-2 left-2 z-10 text-xl">{b.emoji||'🏢'}</div>}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
          <span className="bg-white/90 text-sm font-bold px-3 py-1.5 rounded-full shadow-md">Detay Gör →</span>
        </div>
      </div>
      <div className="p-4">
        <div className="font-bold text-sm mb-0.5 truncate">{b.name}</div>
        <div className="text-gray-500 text-xs mb-2">{b.category} · {b.city}</div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-amber-500 text-xs font-bold">★ {b.rating}</span>
          <span className="text-gray-400 text-xs">({b.review_count} yorum)</span>
          <span className="text-gray-300 text-xs">·</span>
          <span className="text-gray-400 text-xs">{b.dist ? (b.dist < 1 ? Math.round(b.dist*1000)+'m' : b.dist.toFixed(1)+'km') : b.monthly_appointments+' randevu/ay'}</span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">den <b className="text-gray-900">₺{b.price_from}</b></div>
          <div className="flex items-center gap-1.5">
            {(b.address||b.city) && (
              <button onClick={e=>{e.stopPropagation(); onMap()}}
                className="text-xs text-gray-400 hover:text-orange-500 px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-colors font-medium">
                🗺️ Harita
              </button>
            )}
            <a href={"/firma/"+b.id} onClick={e=>e.stopPropagation()}
              className="text-xs text-gray-400 hover:text-blue-500 px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors font-medium">
              🏢 Vitrin
            </a>
            <button onClick={e=>{e.stopPropagation(); onDetail(b)}}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
              Randevu Al
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
