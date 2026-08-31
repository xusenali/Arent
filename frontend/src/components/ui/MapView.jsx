import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Leaflet default marker icon Vite bilan buziladi — DivIcon bilan almashtirish
function createMarkerIcon(color = '#d2c4b4', isActive = false) {
  const size = isActive ? 36 : 28
  const ring = isActive ? `box-shadow:0 0 0 3px ${color}55,0 0 12px ${color}88;` : ''
  return L.divIcon({
    className: '',
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;
        background:${color};transform:rotate(-45deg);
        ${ring}
        border:2px solid #0a0a0a;
        transition:all .2s;
      "></div>`,
  })
}

const STATUS_COLOR = {
  active: '#34d399',
  overdue: '#f87171',
  default: '#d2c4b4',
}

/**
 * props:
 *   markers: Array<{ id, latitude, longitude, workerName, status, updatedAt }>
 *   activeMarkerId: string | null
 *   onMarkerClick: (id) => void
 */
export default function MapView({ markers, activeMarkerId, onMarkerClick }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layersRef = useRef({})

  // Xarita bir marta yaratiladi
  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [39.6547, 66.9758], // Samarqand
      zoom: 12,
      zoomControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      subdomains: 'abc',
      maxZoom: 19,
      className: 'osm-dark-tiles',
    }).addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Markerlar yangilanganida qayta chizamiz
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Eski markerlarni tozalaymiz
    Object.values(layersRef.current).forEach((m) => m.remove())
    layersRef.current = {}

    if (markers.length === 0) return

    const bounds = []

    markers.forEach((marker) => {
      const color = STATUS_COLOR[marker.status] ?? STATUS_COLOR.default
      const isActive = marker.id === activeMarkerId
      const icon = createMarkerIcon(color, isActive)

      const updatedText = marker.updatedAt
        ? new Date(marker.updatedAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
        : '—'

      const leafletMarker = L.marker([marker.latitude, marker.longitude], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:sans-serif;min-width:140px">
            <p style="font-weight:700;margin:0 0 4px">${marker.workerName}</p>
            <p style="color:#9a9a9a;font-size:11px;margin:0">Yangilangan: ${updatedText}</p>
          </div>`,
          { className: 'leaflet-popup-dark' }
        )
        .on('click', () => onMarkerClick?.(marker.id))

      layersRef.current[marker.id] = leafletMarker
      bounds.push([marker.latitude, marker.longitude])
    })

    if (bounds.length === 1) {
      map.setView(bounds[0], 15)
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [markers, activeMarkerId, onMarkerClick])

  // Aktiv marker o'zgarganda — popup ochiladi
  useEffect(() => {
    if (!activeMarkerId || !layersRef.current[activeMarkerId]) return
    layersRef.current[activeMarkerId].openPopup()
  }, [activeMarkerId])

  return (
    <>
      <style>{`
        .osm-dark-tiles {
          filter: invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.6);
        }
        .leaflet-popup-dark .leaflet-popup-content-wrapper {
          background: #1a1a1a;
          color: #e5e5e5;
          border: 1px solid #2a2a2a;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,.6);
        }
        .leaflet-popup-dark .leaflet-popup-tip {
          background: #1a1a1a;
        }
        .leaflet-popup-dark .leaflet-popup-close-button {
          color: #9a9a9a;
        }
        .leaflet-container {
          background: #0a0a0a;
        }
      `}</style>
      <div
        ref={containerRef}
        className="h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-border"
      />
    </>
  )
}
