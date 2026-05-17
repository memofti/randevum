'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

async function geocode(address) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`, { headers: { 'Accept-Language': 'tr', 'User-Agent': 'RandevuApp/1.0' } })
    const data = await r.json()
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {}
  return null
}

async function getRoute(fromLat, fromLng, toLat, toLng) {
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`)
    const data = await r.json()
    if (data.routes?.[0]) {
      const route = data.routes[0]
      return { coords: route.geometry.coordinates.map(c => [c[1], c[0]]), distance: (route.distance/1000).toFixed(1), duration: Math.round(route.duration/60), steps: route.legs[0]?.steps || [] }
    }
  } catch {}
  return null
}

// Navigasyon uygulamalarında aç
function openNavigation(app, toLat, toLng, name, fromLat, fromLng) {
  const urls = {
    google: `https://www.google.com/maps/dir/${fromLat && fromLng ? `${fromLat},${fromLng}` : ''}/${toLat},${toLng}/@${toLat},${toLng},15z`,
    yandex: `https://yandex.com.tr/maps/?rtext=${fromLat && fromLng ? `${fromLat},${fromLng}` : ''}~${toLat},${toLng}&rtt=auto`,
    apple: `maps://maps.apple.com/?daddr=${toLat},${toLng}&dirflg=d`,
    waze: `https://waze.com/ul?ll=${toLat},${toLng}&navigate=yes`,
  }
  window.open(urls[app], '_blank')
}

export default function MapView({ businesses, onBook }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const routeLayerRef = useRef(null)
  const markersRef = useRef([])
  const userMarkerRef = useRef(null)
  const listRef = useRef(null)

  const [userLocation, setUserLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('idle')
  const [bizCoords, setBizCoords] = useState({})
  const [selectedBiz, setSelectedBiz] = useState(null)
  const [route, setRoute] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [distances, setDistances] = useState({})
  const [geocoding, setGeocoding] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  // Mobile'da varsayılan: harita; desktop'ta yine list+map yan yana açık
  const [showList, setShowList] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(min-width: 768px)').matches
  })
  const [navModal, setNavModal] = useState(null)
  const [filterCat, setFilterCat] = useState('')
  const [filterSort, setFilterSort] = useState('rating') // { biz, lat, lng }
  const [searchQ, setSearchQ] = useState('')

  useEffect(() => {
    // Leaflet CSS yükle
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
  }, [])

  // Haritadan/markerdan firma seçilince liste başa kaydır
  useEffect(() => {
    if (selectedBiz && listRef.current) listRef.current.scrollTo({ top: 0, behavior: 'smooth' })
  }, [selectedBiz?.id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (mapInstanceRef.current) return
    let cancelled = false

    ;(async () => {
      const mod = await import('leaflet')
      if (cancelled || !mapRef.current || mapInstanceRef.current) return
      const L = mod.default || mod
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      // Önceki broken mount'tan kalan claim varsa temizle (strict mode double-mount)
      if (mapRef.current._leaflet_id) {
        try { delete mapRef.current._leaflet_id } catch {}
      }
      const map = L.map(mapRef.current, { zoomControl: true }).setView([41.015, 28.979], 12)
      mapInstanceRef.current = map
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map)
      setMapReady(true)
      requestAnimationFrame(() => { try { map.invalidateSize() } catch {} })
      if (typeof ResizeObserver !== 'undefined' && mapRef.current) {
        const ro = new ResizeObserver(() => { try { map.invalidateSize() } catch {} })
        ro.observe(mapRef.current)
        map._resizeObserver = ro
      }
    })()

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current._resizeObserver?.disconnect() } catch {}
        try { mapInstanceRef.current.remove() } catch {}
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Mobilde Harita sekmesine geçince Leaflet'i tetikle (display:none → flex)
  useEffect(() => {
    if (!showList && mapInstanceRef.current) {
      const id = setTimeout(() => { try { mapInstanceRef.current.invalidateSize() } catch {} }, 80)
      return () => clearTimeout(id)
    }
  }, [showList])

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationStatus('denied'); return }
    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setUserLocation(loc)
      setLocationStatus('granted')
      import('leaflet').then(mod => {
        const L = mod.default || mod
        if (!mapInstanceRef.current) return
        const userIcon = L.divIcon({ className: '', html: `<div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 5px rgba(59,130,246,0.25)"></div>`, iconSize:[18,18], iconAnchor:[9,9] })
        if (userMarkerRef.current) userMarkerRef.current.remove()
        userMarkerRef.current = L.marker([loc.lat, loc.lng], { icon: userIcon }).addTo(mapInstanceRef.current).bindPopup('<b>📍 Konumunuz</b>')
        mapInstanceRef.current.setView([loc.lat, loc.lng], 13)
      })
    }, () => setLocationStatus('denied'), { enableHighAccuracy: true, timeout: 10000 })
  }, [])

  useEffect(() => {
    if (!mapReady || !businesses.length) return
    const visibleBiz = businesses.filter(b =>
      (!filterCat || b.category === filterCat) &&
      (!searchQ || b.name.toLowerCase().includes(searchQ.toLowerCase()) || (b.city||'').toLowerCase().includes(searchQ.toLowerCase()))
    )
    import('leaflet').then(async mod => {
      const L = mod.default || mod
      if (!mapInstanceRef.current) return
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      setGeocoding(true)
      const coords = {}
      for (const biz of visibleBiz) {
        if (biz.lat && biz.lng) { coords[biz.id] = { lat: biz.lat, lng: biz.lng } }
        else {
          const addr = [biz.address, biz.city, 'Türkiye'].filter(Boolean).join(', ')
          const result = await geocode(addr)
          if (result) coords[biz.id] = result
        }
        if (!coords[biz.id]) continue
        const { lat, lng } = coords[biz.id]
        const icon = L.divIcon({ className: '', html: `<div style="width:36px;height:36px;background:#f97316;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(249,115,22,0.5);display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer">${biz.emoji||'🏢'}</div>`, iconSize:[36,36], iconAnchor:[18,18], popupAnchor:[0,-20] })
        const marker = L.marker([lat, lng], { icon }).addTo(mapInstanceRef.current)
          .bindPopup(`<div style="min-width:160px;font-family:sans-serif"><div style="font-weight:700;font-size:14px;margin-bottom:4px">${biz.name}</div><div style="color:#6b7280;font-size:12px;margin-bottom:6px">${biz.category} · ${biz.city}</div><div style="color:#f97316;font-weight:700;font-size:13px">₺${biz.price_from}'den</div></div>`)
          .on('click', () => { setSelectedBiz(biz); setShowList(true) })
        markersRef.current.push(marker)
      }
      setBizCoords(coords)
      setGeocoding(false)
    })
  }, [mapReady, businesses, filterCat, searchQ])

  useEffect(() => {
    if (!userLocation || !Object.keys(bizCoords).length) return
    const d = {}
    for (const [id, c] of Object.entries(bizCoords)) d[id] = calcDistance(userLocation.lat, userLocation.lng, c.lat, c.lng)
    setDistances(d)
  }, [userLocation, bizCoords])

  const showRoute = useCallback(async (biz) => {
    if (!userLocation || !bizCoords[biz.id]) return
    setRouteLoading(true); setRoute(null)
    const { lat: toLat, lng: toLng } = bizCoords[biz.id]
    const result = await getRoute(userLocation.lat, userLocation.lng, toLat, toLng)
    if (result) {
      import('leaflet').then(mod => {
        const L = mod.default || mod
        if (!mapInstanceRef.current) return
        if (routeLayerRef.current) routeLayerRef.current.remove()
        routeLayerRef.current = L.polyline(result.coords, { color: '#f97316', weight: 5, opacity: 0.8 }).addTo(mapInstanceRef.current)
        mapInstanceRef.current.fitBounds(L.latLngBounds([[userLocation.lat, userLocation.lng],[toLat, toLng]]), { padding: [60,60] })
      })
      setRoute(result)
      setShowList(false)
    }
    setRouteLoading(false)
  }, [userLocation, bizCoords])

  const clearRoute = useCallback(() => {
    if (routeLayerRef.current) { routeLayerRef.current.remove(); routeLayerRef.current = null }
    setRoute(null); setSelectedBiz(null)
  }, [])

  const stepIcon = (maneuver) => {
    const t = maneuver?.type || '', m = maneuver?.modifier || ''
    if (t==='depart') return '🚀'; if (t==='arrive') return '🏁'
    if (m==='left') return '⬅️'; if (m==='right') return '➡️'
    if (m==='slight left') return '↖️'; if (m==='slight right') return '↗️'
    if (m==='straight') return '⬆️'; if (m==='uturn') return '↩️'
    return '•'
  }

  const COLORS = ['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899']
  const sortedBiz = businesses
    .filter(b => (!filterCat || b.category === filterCat) && (!searchQ || b.name.toLowerCase().includes(searchQ.toLowerCase()) || (b.city||'').toLowerCase().includes(searchQ.toLowerCase())))
    .sort((a,b) => {
      if (filterSort === 'distance') return (distances[a.id]||999) - (distances[b.id]||999)
      if (filterSort === 'price_asc') return (a.price_from||0) - (b.price_from||0)
      if (filterSort === 'reviews') return (b.review_count||0) - (a.review_count||0)
      return (b.rating||0) - (a.rating||0)
    })
    .sort((a,b) => {
      // Haritada seçili olan firmayı listenin başına al
      if (selectedBiz?.id === a.id) return -1
      if (selectedBiz?.id === b.id) return 1
      return 0
    })

  return (
    <div className="flex flex-col md:flex-row w-full" style={{ height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* Navigasyon Uygulama Seçici Modal */}
      {navModal && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-end sm:items-center justify-center p-4" onClick={() => setNavModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <div className="font-bold text-base">Navigasyon Uygulaması Seç</div>
              <div className="text-xs text-gray-500 mt-0.5">{navModal.biz.name} — {navModal.biz.address || navModal.biz.city}</div>
            </div>
            <div className="p-4 space-y-2">
              {[
                { id: 'google', label: 'Google Maps', emoji: '🗺️', color: '#4285f4' },
                { id: 'yandex', label: 'Yandex Haritalar', emoji: '🧭', color: '#ff0000' },
                { id: 'waze',   label: 'Waze',           emoji: '🚗', color: '#33ccff' },
                { id: 'apple',  label: 'Apple Maps',     emoji: '🍎', color: '#000000' },
              ].map(app => (
                <button key={app.id} onClick={() => { openNavigation(app.id, navModal.lat, navModal.lng, navModal.biz.name, userLocation?.lat, userLocation?.lng); setNavModal(null) }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-left">
                  <span className="text-2xl">{app.emoji}</span>
                  <span className="font-semibold text-sm">{app.label}</span>
                  <span className="ml-auto text-gray-400 text-xs">→</span>
                </button>
              ))}
            </div>
            <div className="px-4 pb-4">
              <button onClick={() => setNavModal(null)} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50">İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobil Toggle */}
      <div className="md:hidden flex border-b border-gray-200 bg-white flex-shrink-0">
        <button onClick={() => setShowList(true)} className={`flex-1 py-2.5 text-sm font-bold transition-all ${showList?'text-orange-500 border-b-2 border-orange-500':'text-gray-400'}`}>
          📋 İşletmeler ({sortedBiz.length})
        </button>
        <button onClick={() => setShowList(false)} className={`flex-1 py-2.5 text-sm font-bold transition-all ${!showList?'text-orange-500 border-b-2 border-orange-500':'text-gray-400'}`}>
          🗺️ Harita
        </button>
      </div>

      {/* Sol Panel */}
      <div className={`${showList?'flex':'hidden'} md:flex flex-col bg-white border-r border-gray-100 overflow-hidden w-full md:w-80 flex-shrink-0`} style={{height:"100%"}}>

        {/* Konum */}
        <div className="p-3 border-b border-gray-100 flex-shrink-0">
          {locationStatus==='idle' && <button onClick={getLocation} className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">📍 Konumumu Kullan</button>}
          {locationStatus==='loading' && <div className="text-center py-2 text-orange-500 text-sm font-semibold">🔄 Konum alınıyor...</div>}
          {locationStatus==='granted' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0" />
              <span className="text-xs font-semibold text-green-800 flex-1">Konumunuz belirlendi</span>
              <button onClick={clearRoute} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
          )}
          {locationStatus==='denied' && <div className="px-3 py-2 bg-red-50 rounded-xl border border-red-200 text-xs text-red-600">⚠️ Konum erişimi reddedildi.</div>}
          {geocoding && <div className="mt-2 text-xs text-gray-400 text-center">🗺️ İşletmeler yükleniyor...</div>}
        </div>

        {/* Arama */}
        <div className="px-3 pt-2 pb-2 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <input type="search" placeholder="Firma adı veya şehir ara..." value={searchQ}
              onChange={e=>setSearchQ(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg pl-8 pr-8 py-2 outline-none focus:border-orange-400 transition-colors"/>
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔎</span>
            {searchQ && (
              <button onClick={()=>setSearchQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xs rounded-full">✕</button>
            )}
          </div>
        </div>

        {/* Filtre */}
        <div className="px-3 pb-2 border-b border-gray-100 flex-shrink-0">
          <div className="flex gap-1.5 flex-wrap">
            <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
              className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none bg-white">
              <option value="">Tüm Sektörler</option>
              {[...new Set(businesses.map(b=>b.category).filter(Boolean))].map(c=>(
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={filterSort} onChange={e=>setFilterSort(e.target.value)}
              className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none bg-white">
              <option value="rating">⭐ Puana Göre</option>
              <option value="distance">📍 En Yakın</option>
              <option value="price_asc">₺ Ucuza Göre</option>
              <option value="reviews">💬 Yoruma Göre</option>
            </select>
          </div>
        </div>
        {/* Rota */}
        {route && (
          <div className="p-3 bg-orange-50 border-b border-orange-200 flex-shrink-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-sm font-bold">🚗 {selectedBiz?.name}</div>
                <div className="text-xs text-gray-500 mt-0.5"><b className="text-orange-500">{route.distance} km</b> · ~{route.duration} dk</div>
              </div>
              <button onClick={clearRoute} className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0">✕</button>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1">
              {route.steps.map((step, i) => step.name && (
                <div key={i} className="flex gap-2 text-xs border-b border-orange-100 pb-1 text-gray-600">
                  <span className="flex-shrink-0">{stepIcon(step.maneuver)}</span>
                  <span>{step.name}{step.distance>0 && <span className="text-orange-500 font-semibold"> · {step.distance>1000?`${(step.distance/1000).toFixed(1)}km`:`${Math.round(step.distance)}m`}</span>}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liste */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain" style={{minHeight:0}}>
          {sortedBiz.map((biz, i) => {
            const dist = distances[biz.id]
            const hasCoords = !!bizCoords[biz.id]
            const isSelected = selectedBiz?.id === biz.id
            return (
              <div key={biz.id} onClick={() => {
                setSelectedBiz(biz)
                if (bizCoords[biz.id] && mapInstanceRef.current) {
                  import('leaflet').then(mod => { mapInstanceRef.current?.setView([bizCoords[biz.id].lat, bizCoords[biz.id].lng], 15) })
                  setShowList(false)
                }
              }} className={`p-3 border-b border-gray-50 cursor-pointer transition-all ${isSelected?'bg-orange-50 border-l-[3px] border-l-orange-500':'hover:bg-gray-50 border-l-[3px] border-l-transparent'}`}>
                <div className="flex items-start gap-2.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{background:`${COLORS[i%5]}22`}}>{biz.emoji||'🏢'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{biz.name}</div>
                    <div className="text-gray-500 text-xs">{biz.category} · {biz.city}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-orange-500 font-bold text-xs">₺{biz.price_from}'den</span>
                      <span className="text-gray-400 text-xs">★ {biz.rating}</span>
                      {dist && <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">📍 {dist<1?`${Math.round(dist*1000)}m`:`${dist.toFixed(1)}km`}</span>}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div className="mt-2.5 space-y-1.5">
                    {/* Navigasyon butonu */}
                    {hasCoords && (
                      <button onClick={e => { e.stopPropagation(); setNavModal({ biz, lat: bizCoords[biz.id].lat, lng: bizCoords[biz.id].lng }) }}
                        className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5">
                        🧭 Navigasyona Aktar
                      </button>
                    )}
                    <div className="flex gap-1.5">
                      {userLocation && hasCoords && (
                        <button onClick={e => { e.stopPropagation(); showRoute(biz) }} disabled={routeLoading}
                          className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors">
                          {routeLoading?'⏳...':'🗺️ Rota'}
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); onBook && onBook(biz) }}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors">
                        📅 Randevu Al
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Harita */}
      <div className={`${!showList?'flex':'hidden'} md:flex flex-1 relative`} style={{ minHeight: '300px' }}>
        <div ref={mapRef} className="w-full h-full" />
        {locationStatus==='idle' && (
          <div className="absolute top-3 right-3 z-[1000]">
            <button onClick={() => { getLocation(); setShowList(false) }} className="bg-white border-2 border-orange-500 text-orange-500 text-xs font-bold px-3 py-2 rounded-xl shadow-lg flex items-center gap-1.5">📍 Konumumu Bul</button>
          </div>
        )}
        {/* Mobile harita üstü arama + kategori bar */}
        <div className="md:hidden absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2">
          <div className="relative bg-white/95 backdrop-blur rounded-xl shadow-md">
            <input type="search" placeholder="Firma adı veya şehir ara..." value={searchQ}
              onChange={e=>setSearchQ(e.target.value)}
              className="w-full text-sm pl-9 pr-9 py-2.5 outline-none rounded-xl bg-transparent"/>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔎</span>
            {searchQ && (
              <button onClick={()=>setSearchQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 text-sm rounded-full">✕</button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide bg-white/95 backdrop-blur rounded-xl px-2 py-1.5 shadow-md">
            <button onClick={()=>setFilterCat('')} className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
              style={!filterCat?{background:'#f97316',color:'#fff'}:{background:'#f3f4f6',color:'#0a0a0a'}}>Tümü</button>
            {[...new Set(businesses.map(b=>b.category).filter(Boolean))].map(c => (
              <button key={c} onClick={()=>setFilterCat(c===filterCat?'':c)} className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                style={filterCat===c?{background:'#f97316',color:'#fff'}:{background:'#f3f4f6',color:'#0a0a0a'}}>{c}</button>
            ))}
          </div>
        </div>
        {/* Liste butonu — arama + kategori barının altında */}
        <div className="md:hidden absolute top-[8.5rem] left-3 z-[1000]">
          <button onClick={() => setShowList(true)} className="bg-white border border-gray-200 text-gray-700 text-xs font-bold px-3 py-2 rounded-xl shadow-lg">📋 Liste</button>
        </div>
        <div className="absolute bottom-4 right-3 z-[1000] bg-white rounded-xl px-3 py-2 shadow-md flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> Sen
          <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" /> İşletme
          <div className="w-4 h-0.5 bg-orange-500 rounded" /> Rota
        </div>
      </div>
    </div>
  )
}
