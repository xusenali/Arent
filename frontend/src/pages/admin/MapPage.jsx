import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MapView from '../../components/ui/MapView.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { fetchAdminLocations } from '../../api/adminApi.js'

const POLL_INTERVAL = 15_000 // 15 soniya

const FRESHNESS_ICON = { fresh: '🟢', stale: '🟡', never: '⚫' }
const FRESHNESS_LABEL = { fresh: 'Yangi (8s ichida)', stale: '8 soatdan oshgan', never: 'Ulashmagan' }
const FRESHNESS_COLOR = { fresh: 'text-emerald-400', stale: 'text-amber-400', never: 'text-text-muted' }

function toMarkers(locations) {
  return locations
    .filter((loc) => loc.latitude != null && loc.longitude != null)
    .map((loc) => ({
      id: loc.worker_id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      status: loc.rental_status ?? 'active',
      workerName: loc.worker_name,
      updatedAt: loc.recorded_at,
    }))
}

export default function MapPage() {
  const { t } = useTranslation()
  const [locations, setLocations] = useState([])
  const [error, setError] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const timerRef = useRef(null)

  const load = useCallback(() => {
    fetchAdminLocations()
      .then((data) => {
        setLocations(data)
        setLastUpdated(new Date())
        setError(null)
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    load()
    timerRef.current = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(timerRef.current)
  }, [load])

  const markers = toMarkers(locations)

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3 sm:mb-8">
        <div>
          <h1 className="text-xl font-black text-text sm:text-2xl">{t('map.title')}</h1>
          <p className="text-xs text-text-muted sm:text-sm">{t('map.subtitle')}</p>
        </div>
        {lastUpdated && (
          <span className="mt-1 text-xs text-text-muted">
            {t('map.updated')}: {lastUpdated.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {!error && locations.length === 0 && (
        <div className="rounded-xl border border-border bg-surface py-16 text-center">
          <p className="mb-2 text-sm font-semibold text-text">{t('map.empty')}</p>
          <p className="text-xs text-text-muted">
            Ishchilar Telegram bot orqali joylashuvini ulashganida bu yerda ko'rinadi.
          </p>
        </div>
      )}

      {/* Joylashuv holati legenda */}
      {locations.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-3 text-xs text-text-muted">
          <span>🟢 8 soatdan kam</span>
          <span>🟡 8 soatdan oshgan</span>
          <span>⚫ Ulashmagan</span>
        </div>
      )}

      {locations.length > 0 && (
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_300px]">
          {markers.length > 0 ? (
            <MapView
              markers={markers}
              activeMarkerId={activeId}
              onMarkerClick={setActiveId}
            />
          ) : (
            <div className="rounded-xl border border-border bg-surface py-16 text-center">
              <p className="text-sm text-text-muted">Hozircha hech kim joylashuvini ulashmagan</p>
            </div>
          )}

          <div className="space-y-2 lg:max-h-[520px] lg:overflow-y-auto">
            {locations.map((location) => {
              const freshness = location.freshness ?? 'never'
              const hasLocation = location.latitude != null
              return (
                <button
                  key={location.worker_id}
                  type="button"
                  onClick={() => hasLocation && setActiveId(
                    activeId === location.worker_id ? null : location.worker_id
                  )}
                  className={[
                    'w-full rounded-xl border p-3 text-left transition-colors',
                    hasLocation && activeId === location.worker_id
                      ? 'border-gold bg-gold/5'
                      : 'border-border bg-surface hover:border-gold/30',
                    !hasLocation ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-text">{location.worker_name}</p>
                    {location.rental_status && <StatusBadge status={location.rental_status} />}
                  </div>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className="text-sm">{FRESHNESS_ICON[freshness]}</span>
                    <span className={['text-xs font-medium', FRESHNESS_COLOR[freshness]].join(' ')}>
                      {FRESHNESS_LABEL[freshness]}
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-text-muted">
                    {location.recorded_at
                      ? new Date(location.recorded_at).toLocaleString('uz-UZ')
                      : 'Hech qachon ulashmagan'}
                  </p>
                  <Link
                    to={`/admin/workers/${location.worker_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-medium text-gold hover:underline"
                  >
                    {t('common.details')} →
                  </Link>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
