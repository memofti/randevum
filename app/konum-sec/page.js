'use client'
import { useEffect, useRef, useState } from 'react'

export default function KonumSec() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)
  const [pos, setPos] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    setTimeout(async () => {
      const L = (await import('leaflet')).default
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current).setView([41.015, 28.979], 11)
      mapInstance.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB', maxZoom: 19, subdomains: 'abcd'
      }).addTo(map)

      map.on('click', e => {
        const { lat, lng } = e.latlng
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
          markerRef.current.on('dragend', ev => {
            const p = ev.target.getLatLng()
            setPos({ lat: p.lat, lng: p.lng })
          })
        }
        setPos({ lat, lng })
      })

      setReady(true)
    }, 100)
  }, [])

  const handleConfirm = () => {
    if (!pos) return
    if (window.opener) {
      window.opener.postMessage({ type: 'KONUM_SEC', lat: pos.lat, lng: pos.lng }, '*')
    }
    window.close()
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-slate-800 px-4 py-3 flex items-center gap-3">
        <div className="text-white font-bold text-sm flex-1">📍 Haritadan Konum Seç</div>
        {pos && (
          <div className="text-white/60 text-xs">{pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}</div>
        )}
        <button onClick={handleConfirm} disabled={!pos}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-bold rounded-lg">
          ✓ Konumu Onayla
        </button>
        <button onClick={() => window.close()} className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg">
          İptal
        </button>
      </div>
      {!ready && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Harita yükleniyor...
        </div>
      )}
      <div ref={mapRef} className="flex-1" />
      <div className="bg-white px-4 py-2 text-xs text-gray-400 text-center border-t">
        {pos ? `Seçilen konum: ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)} — Onaylamak için yukarıdaki butona tıklayın` : 'Haritaya tıklayarak konum seçin'}
      </div>
    </div>
  )
}
