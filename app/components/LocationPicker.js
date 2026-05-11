'use client'
import { useEffect, useRef, useState } from 'react'

export default function LocationPicker({ lat, lng, onChange }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || mapInstance.current) return

    const initMap = async () => {
      try {
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          document.head.appendChild(link)
          await new Promise(r => setTimeout(r, 100))
        }

        const L = (await import('leaflet')).default

        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        const initLat = (lat && !isNaN(parseFloat(lat))) ? parseFloat(lat) : 41.015
        const initLng = (lng && !isNaN(parseFloat(lng))) ? parseFloat(lng) : 28.979
        const zoom = (lat && lng) ? 15 : 11

        const map = L.map(mapRef.current, { zoomControl: true }).setView([initLat, initLng], zoom)
        mapInstance.current = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19
        }).addTo(map)

        if (lat && lng && !isNaN(parseFloat(lat))) {
          markerRef.current = L.marker([parseFloat(lat), parseFloat(lng)], { draggable: true }).addTo(map)
          markerRef.current.on('dragend', e => {
            const p = e.target.getLatLng()
            onChange(p.lat, p.lng)
          })
        }

        map.on('click', e => {
          const { lat: newLat, lng: newLng } = e.latlng
          if (markerRef.current) {
            markerRef.current.setLatLng([newLat, newLng])
          } else {
            markerRef.current = L.marker([newLat, newLng], { draggable: true }).addTo(map)
            markerRef.current.on('dragend', ev => {
              const p = ev.target.getLatLng()
              onChange(p.lat, p.lng)
            })
          }
          onChange(newLat, newLng)
        })

        setReady(true)
      } catch(e) {
        console.error('LocationPicker error:', e)
        setError(true)
      }
    }

    initMap()

    return () => {
      try {
        if (mapInstance.current) {
          mapInstance.current.remove()
          mapInstance.current = null
          markerRef.current = null
        }
      } catch(e) {}
    }
  }, [])

  // lat/lng prop değişince marker güncelle
  useEffect(() => {
    if (!mapInstance.current || !ready || !lat || !lng) return
    try {
      import('leaflet').then(mod => {
        const L = mod.default
        const nlat = parseFloat(lat), nlng = parseFloat(lng)
        if (isNaN(nlat) || isNaN(nlng)) return
        if (markerRef.current) {
          markerRef.current.setLatLng([nlat, nlng])
        } else {
          markerRef.current = L.marker([nlat, nlng], { draggable: true }).addTo(mapInstance.current)
          markerRef.current.on('dragend', e => {
            const p = e.target.getLatLng()
            onChange(p.lat, p.lng)
          })
        }
        mapInstance.current.setView([nlat, nlng], 15)
      })
    } catch(e) {}
  }, [lat, lng, ready])

  if (error) {
    return (
      <div className="w-full h-48 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-400">
        Harita yüklenemedi — sayfa yenilenirse tekrar deneyin
      </div>
    )
  }

  return (
    <div>
      <div ref={mapRef} style={{ height: '220px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', background: '#f3f4f6' }} />
      <p className="text-xs text-gray-400 mt-1 text-center">
        {ready ? '📍 Haritaya tıklayın veya pin sürükleyin' : 'Harita yükleniyor...'}
      </p>
    </div>
  )
}
