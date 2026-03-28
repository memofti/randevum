'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

// Haversine formülü — iki nokta arası km
function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// OpenStreetMap Nominatim ile adres → koordinat
async function geocode(address) {
  try {
    const q = encodeURIComponent(address)
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { 'Accept-Language': 'tr', 'User-Agent': 'RandevuApp/1.0' }
    })
    const data = await r.json()
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch { }
  return null
}

// OSRM ile yol tarifi — ücretsiz, API key gerekmez
async function getRoute(fromLat, fromLng, toLat, toLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`
    const r = await fetch(url)
    const data = await r.json()
    if (data.routes?.[0]) {
      const route = data.routes[0]
      return {
        coords: route.geometry.coordinates.map(c => [c[1], c[0]]),
        distance: (route.distance / 1000).toFixed(1),
        duration: Math.round(route.duration / 60),
        steps: route.legs[0]?.steps || []
      }
    }
  } catch { }
  return null
}

export default function MapView({ businesses, onBook }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const routeLayerRef = useRef(null)
  const markersRef = useRef([])
  const userMarkerRef = useRef(null)

  const [userLocation, setUserLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('idle') // idle | loading | granted | denied
  const [bizCoords, setBizCoords] = useState({}) // { bizId: { lat, lng } }
  const [selectedBiz, setSelectedBiz] = useState(null)
  const [route, setRoute] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [distances, setDistances] = useState({}) // { bizId: km }
  const [geocoding, setGeocoding] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  // Haritayı başlat
  useEffect(() => {
    if (typeof window === 'undefined' || mapInstanceRef.current) return
    let map

    import('leaflet').then(mod => {
      const L = mod.default || mod
      // Fix default icon paths
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (!mapRef.current || mapInstanceRef.current) return

      map = L.map(mapRef.current, { zoomControl: true }).setView([41.015, 28.979], 12)
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(map)

      setMapReady(true)
    })

    return () => {
      if (map) { map.remove(); mapInstanceRef.current = null }
    }
  }, [])

  // Kullanıcı konumunu al
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationStatus('denied'); return }
    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setLocationStatus('granted')

        import('leaflet').then(mod => {
          const L = mod.default || mod
          if (!mapInstanceRef.current) return

          // Kullanıcı markerı
          const userIcon = L.divIcon({
            className: '',
            html: `<div style="position:relative">
              <div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 5px rgba(59,130,246,0.25)"></div>
            </div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          })

          if (userMarkerRef.current) userMarkerRef.current.remove()
          userMarkerRef.current = L.marker([loc.lat, loc.lng], { icon: userIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup('<b>📍 Konumunuz</b>')

          mapInstanceRef.current.setView([loc.lat, loc.lng], 13)
        })
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // İşletmeleri haritaya ekle + geocode
  useEffect(() => {
    if (!mapReady || !businesses.length) return

    import('leaflet').then(async mod => {
      const L = mod.default || mod
      if (!mapInstanceRef.current) return

      // Önceki markerları temizle
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      setGeocoding(true)
      const coords = {}

      for (const biz of businesses) {
        // Veritabanında lat/lng varsa kullan, yoksa geocode et
        if (biz.lat && biz.lng) {
          coords[biz.id] = { lat: biz.lat, lng: biz.lng }
        } else {
          const addr = [biz.address, biz.city, 'Türkiye'].filter(Boolean).join(', ')
          const result = await geocode(addr)
          if (result) coords[biz.id] = result
        }

        if (!coords[biz.id]) continue

        const { lat, lng } = coords[biz.id]
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:36px;height:36px;background:#f97316;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(249,115,22,0.5);display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;transition:transform 0.2s" class="biz-marker">${biz.emoji || '🏢'}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -20]
        })

        const marker = L.marker([lat, lng], { icon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div style="min-width:160px;font-family:sans-serif">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px">${biz.name}</div>
              <div style="color:#6b7280;font-size:12px;margin-bottom:6px">${biz.category} · ${biz.city}</div>
              <div style="color:#f97316;font-weight:700;font-size:13px">₺${biz.price_from}'den</div>
            </div>
          `)
          .on('click', () => setSelectedBiz(biz))

        markersRef.current.push(marker)
      }

      setBizCoords(coords)
      setGeocoding(false)
    })
  }, [mapReady, businesses])

  // Mesafeleri hesapla
  useEffect(() => {
    if (!userLocation || !Object.keys(bizCoords).length) return
    const d = {}
    for (const [id, c] of Object.entries(bizCoords)) {
      d[id] = calcDistance(userLocation.lat, userLocation.lng, c.lat, c.lng)
    }
    setDistances(d)
  }, [userLocation, bizCoords])

  // Yol tarifi al
  const showRoute = useCallback(async (biz) => {
    if (!userLocation || !bizCoords[biz.id]) return
    setRouteLoading(true)
    setRoute(null)

    const { lat: toLat, lng: toLng } = bizCoords[biz.id]
    const result = await getRoute(userLocation.lat, userLocation.lng, toLat, toLng)

    if (result) {
      import('leaflet').then(mod => {
        const L = mod.default || mod
        if (!mapInstanceRef.current) return

        // Önceki rotayı kaldır
        if (routeLayerRef.current) routeLayerRef.current.remove()

        // Rota çiz
        routeLayerRef.current = L.polyline(result.coords, {
          color: '#f97316',
          weight: 5,
          opacity: 0.8,
          dashArray: null
        }).addTo(mapInstanceRef.current)

        // Haritayı rotaya sığdır
        const bounds = L.latLngBounds([
          [userLocation.lat, userLocation.lng],
          [toLat, toLng]
        ])
        mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] })
      })
      setRoute(result)
    }
    setRouteLoading(false)
  }, [userLocation, bizCoords])

  // Rotayı temizle
  const clearRoute = useCallback(() => {
    if (routeLayerRef.current) { routeLayerRef.current.remove(); routeLayerRef.current = null }
    setRoute(null)
    setSelectedBiz(null)
  }, [])

  // Adım ikonları
  const stepIcon = (maneuver) => {
    const type = maneuver?.type || ''
    const mod = maneuver?.modifier || ''
    if (type === 'depart') return '🚀'
    if (type === 'arrive') return '🏁'
    if (mod === 'left') return '⬅️'
    if (mod === 'right') return '➡️'
    if (mod === 'slight left') return '↖️'
    if (mod === 'slight right') return '↗️'
    if (mod === 'straight') return '⬆️'
    if (mod === 'uturn') return '↩️'
    return '•'
  }

  // Mesafeye göre sıralı firmalar
  const sortedBiz = userLocation
    ? [...businesses].sort((a, b) => (distances[a.id] || 999) - (distances[b.id] || 999))
    : businesses

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* Sol Panel */}
      <div style={{ width: '340px', flexShrink: 0, overflowY: 'auto', background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>

        {/* Konum Butonu */}
        <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          {locationStatus === 'idle' && (
            <button onClick={getLocation}
              style={{ width: '100%', padding: '10px 16px', background: '#f97316', color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              📍 Konumumu Kullan
            </button>
          )}
          {locationStatus === 'loading' && (
            <div style={{ textAlign: 'center', padding: '10px', color: '#f97316', fontSize: '13px', fontWeight: 600 }}>
              🔄 Konum alınıyor...
            </div>
          )}
          {locationStatus === 'granted' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#dcfce7', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <div style={{ width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#166534', flex: 1 }}>Konumunuz belirlendi</span>
              <button onClick={clearRoute} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '12px' }}>✕</button>
            </div>
          )}
          {locationStatus === 'denied' && (
            <div style={{ padding: '10px 12px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca', fontSize: '12px', color: '#dc2626' }}>
              ⚠️ Konum erişimi reddedildi. Tarayıcı ayarlarından izin verin.
            </div>
          )}
          {geocoding && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>🗺️ İşletmeler haritaya yükleniyor...</div>
          )}
        </div>

        {/* Rota Detayı */}
        {route && (
          <div style={{ padding: '12px 16px', background: '#fff7ed', borderBottom: '1px solid #fed7aa', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>🚗 {selectedBiz?.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  <b style={{ color: '#f97316' }}>{route.distance} km</b> · yaklaşık <b>{route.duration} dk</b>
                </div>
              </div>
              <button onClick={clearRoute} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>✕ İptal</button>
            </div>
            {/* Adım adım yol tarifi */}
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {route.steps.map((step, i) => (
                step.name && (
                  <div key={i} style={{ display: 'flex', gap: '8px', padding: '4px 0', fontSize: '11px', borderBottom: '1px solid #fed7aa', color: '#374151' }}>
                    <span style={{ flexShrink: 0, fontSize: '14px' }}>{stepIcon(step.maneuver)}</span>
                    <span>{step.name}{step.distance > 0 && <span style={{ color: '#f97316', fontWeight: 600 }}> · {step.distance > 1000 ? `${(step.distance / 1000).toFixed(1)} km` : `${Math.round(step.distance)} m`}</span>}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* İşletme Listesi */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sortedBiz.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' }}>İşletme bulunamadı</div>
          )}
          {sortedBiz.map((biz, i) => {
            const dist = distances[biz.id]
            const hasCoords = !!bizCoords[biz.id]
            const isSelected = selectedBiz?.id === biz.id
            return (
              <div key={biz.id}
                onClick={() => {
                  setSelectedBiz(biz)
                  if (bizCoords[biz.id] && mapInstanceRef.current) {
                    import('leaflet').then(mod => {
                      const L = mod.default || mod
                      mapInstanceRef.current?.setView([bizCoords[biz.id].lat, bizCoords[biz.id].lng], 15)
                    })
                  }
                }}
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  background: isSelected ? '#fff7ed' : 'white',
                  borderLeft: isSelected ? '3px solid #f97316' : '3px solid transparent',
                  transition: 'background 0.15s'
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'][i % 5]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                    {biz.emoji || '🏢'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>{biz.name}</div>
                    <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>{biz.category} · {biz.city}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#f97316', fontWeight: 700, fontSize: '12px' }}>₺{biz.price_from}'den</span>
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>★ {biz.rating}</span>
                      {dist && <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px' }}>📍 {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}</span>}
                    </div>
                  </div>
                </div>
                {/* Seçiliyse aksiyon butonları */}
                {isSelected && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                    {userLocation && hasCoords && (
                      <button onClick={e => { e.stopPropagation(); showRoute(biz) }} disabled={routeLoading}
                        style={{ flex: 1, padding: '7px', background: routeLoading ? '#fed7aa' : '#f97316', color: 'white', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        {routeLoading ? '⏳ Hesaplanıyor...' : '🧭 Yol Tarifi'}
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); onBook && onBook(biz) }}
                      style={{ flex: 1, padding: '7px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                      📅 Randevu Al
                    </button>
                  </div>
                )}
                {!hasCoords && !geocoding && (
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>⚠️ Konum bulunamadı</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sağ: Harita */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Leaflet CSS */}
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Konum bul butonu (harita üzerinde) */}
        {locationStatus === 'idle' && (
          <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 1000 }}>
            <button onClick={getLocation}
              style={{ background: 'white', border: '2px solid #f97316', borderRadius: '12px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: '#f97316', boxShadow: '0 2px 10px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📍 Konumumu Bul
            </button>
          </div>
        )}

        {/* Harita bilgi etiketi */}
        <div style={{ position: 'absolute', bottom: '24px', right: '16px', zIndex: 1000, background: 'white', borderRadius: '10px', padding: '8px 12px', fontSize: '11px', color: '#64748b', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '50%', flexShrink: 0 }} /> Konumunuz
          <div style={{ width: '12px', height: '12px', background: '#f97316', borderRadius: '50%', flexShrink: 0 }} /> İşletme
          <div style={{ height: '2px', width: '20px', background: '#f97316', borderRadius: '2px' }} /> Rota
        </div>
      </div>
    </div>
  )
}
