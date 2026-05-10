'use client'
const COLORS = ['#ff6b35','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444']

function Spin() { return <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin flex-shrink-0" /> }

export default function BusinessDetailModal({ biz, bizIdx, services, staff, loading, onClose, onBook, onWaitList }) {
  if (!biz) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Kapak */}
        <div className="relative h-48 flex items-center justify-center text-6xl flex-shrink-0 overflow-hidden"
          style={{ background: `${COLORS[bizIdx%COLORS.length]}18` }}>
          {biz.cover_url
            ? <img src={biz.cover_url} alt={biz.name} className="w-full h-full object-cover"/>
            : <span className="text-7xl">{biz.emoji||'🏢'}</span>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"/>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm z-10">✕</button>
          <div className="absolute top-4 left-4 z-10"><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-500 text-white">● Müsait</span></div>
          {biz.cover_url && <div className="absolute bottom-3 left-4 z-10 text-3xl">{biz.emoji||'🏢'}</div>}
        </div>
        <div className="p-5">
          {/* Başlık */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">{biz.name}</h2>
              <div className="text-gray-500 text-sm mt-0.5">{biz.category} · {biz.city}</div>
            </div>
            <div className="text-right">
              <div className="text-amber-500 font-bold">★ {biz.rating}</div>
              <div className="text-gray-400 text-xs">({biz.review_count} yorum)</div>
            </div>
          </div>
          {/* Bio */}
          {biz.bio && <p className="text-gray-600 text-sm mb-3 leading-relaxed">{biz.bio}</p>}
          {biz.description && <p className="text-gray-500 text-sm mb-4 leading-relaxed">{biz.description}</p>}
          {/* Sosyal medya */}
          {(biz.instagram||biz.facebook||biz.website) && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {biz.instagram && <a href={biz.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-pink-200 text-pink-600 hover:bg-pink-50">📸 Instagram</a>}
              {biz.facebook && <a href={biz.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50">👍 Facebook</a>}
              {biz.website && <a href={biz.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50">🌐 Website</a>}
            </div>
          )}
          {/* İletişim */}
          <div className="flex gap-3 mb-5 text-sm flex-wrap">
            {biz.phone && <a href={'tel:'+biz.phone} className="flex items-center gap-1.5 text-orange-500 font-semibold"><span>📞</span>{biz.phone}</a>}
            {biz.address && <span className="text-gray-500 flex items-center gap-1.5"><span>📍</span>{biz.address}</span>}
          </div>
          {loading ? <div className="flex items-center justify-center py-8 gap-2 text-gray-400"><Spin /> Yükleniyor...</div> : (
            <>
              {/* Galeri */}
              {(biz.gallery_urls||[]).length > 0 && (
                <div className="mb-5">
                  <div className="font-bold text-sm mb-3">📸 Galeri</div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {(biz.gallery_urls||[]).map((url,i) => (
                      <img key={i} src={url} alt="" className="flex-none w-28 h-28 object-cover rounded-xl border border-gray-100 cursor-pointer hover:opacity-90"
                        onClick={() => window.open(url,'_blank')}/>
                    ))}
                  </div>
                </div>
              )}
              {/* Hizmetler */}
              <div className="mb-5">
                <div className="font-bold text-sm mb-3">Hizmetler</div>
                {services.length === 0 ? <div className="text-gray-400 text-sm">Hizmet bilgisi yok</div> : (
                  <div className="grid grid-cols-1 gap-2">
                    {services.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div><div className="font-semibold text-sm">{s.name}</div><div className="text-gray-500 text-xs">{s.duration_min} dk</div></div>
                        <div className="font-bold text-orange-500">₺{s.price}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Personel */}
              {staff.length > 0 && (
                <div className="mb-5">
                  <div className="font-bold text-sm mb-3">Personel</div>
                  <div className="flex gap-3 flex-wrap">
                    {staff.map((s,i) => (
                      <div key={s.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:COLORS[i%COLORS.length]}}>{s.name[0]}</div>
                        <div><div className="text-xs font-semibold">{s.name.split(' ')[0]}</div><div className="text-xs text-amber-500 font-bold">★ {s.rating}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div className="space-y-2">
            <button onClick={onBook} className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-md shadow-orange-500/25">
              📅 Randevu Al
            </button>
            {onWaitList && <button onClick={onWaitList} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl text-sm">⏳ Bekleme Listesine Eklen</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
