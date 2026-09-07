import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchArchivedWorkers } from '../../api/adminApi.js'
import { formatDate } from '../../utils/date.js'

export default function ArchivePage() {
  const [workers, setWorkers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchArchivedWorkers()
      .then(setWorkers)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = workers.filter((w) =>
    w.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    w.phone?.includes(search)
  )

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-black text-text sm:text-2xl">Arxiv</h1>
        <p className="mt-1 text-sm text-text-muted">Ijarasi yakunlangan ishchilar</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Ism yoki telefon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-gold/50 focus:outline-none sm:max-w-xs"
        />
      </div>

      {isLoading && <p className="text-text-muted">Yuklanmoqda...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-10 text-center">
          <p className="text-text-muted">Arxiv bo'sh</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {filtered.map((w, i) => (
            <Link
              key={w.id}
              to={`/admin/workers/${w.id}`}
              className={[
                'flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-surface-hover sm:px-5',
                i !== 0 && 'border-t border-border',
              ].join(' ')}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{w.full_name}</p>
                <p className="text-xs text-text-muted">{w.phone}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className="inline-block rounded-full bg-border px-2.5 py-0.5 text-xs font-semibold text-text-muted">
                  Yakunlangan
                </span>
                {w.created_at && (
                  <p className="mt-0.5 text-[10px] text-text-muted">{formatDate(w.created_at)}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && (
        <p className="mt-4 text-xs text-text-muted">{filtered.length} ta ishchi</p>
      )}
    </div>
  )
}
