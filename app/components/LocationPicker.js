'use client'
import { useEffect, useRef, useState } from 'react'

export default function LocationPicker({ lat, lng, onChange }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || mapInstance.current) return
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    import('leaflet').then(mod => {
      const L = mod.default || mod
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      const initLat = lat || 41.015
      const initLng = lng || 28.979
      const map = L.map(mapRef.current).setView([initLat, initLng], lat ? 15 : 11)
      mapInstance.current = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19
      }).addTo(map)

      // Başlangıç marker
      if (lat && lng) {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
        markerRef.current.on('dragend', e => {
          const pos = e.target.getLatLng()
          onChange(pos.lat, pos.lng)
        })
      }

      // Haritaya tıklayınca pin koy
      map.on('click', e => {
        const { lat: newLat, lng: newLng } = e.latlng
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng])
        } else {
          markerRef.current = L.marker([newLat, newLng], { draggable: true }).addTo(map)
          markerRef.current.on('dragend', ev => {
            const pos = ev.target.getLatLng()
            onChange(pos.lat, pos.lng)
          })
        }
        onChange(newLat, newLng)
      })
      setReady(true)
    })
    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null }
    }
  }, [])

  // lat/lng dışarıdan değişince marker'ı güncelle
  useEffect(() => {
    if (!mapInstance.current || !lat || !lng) return
    import('leaflet').then(mod => {
      const L = mod.default || mod
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapInstance.current)
        markerRef.current.on('dragend', e => {
          const pos = e.target.getLatLng()
          onChange(pos.lat, pos.lng)
        })
      }
      mapInstance.current.setView([lat, lng], 15)
    })
  }, [lat, lng])

  return (
    <div className="space-y-1">
      <div ref={mapRef} style={{ height: '220px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }} />
      {!ready && <div className="text-xs text-gray-400 text-center">Harita yükleniyor...</div>}
      {ready && <div className="text-xs text-gray-400 text-center">📍 Haritaya tıklayın veya pin'i sürükleyin</div>}
    </div>
  )
}
