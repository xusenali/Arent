import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import ConfirmModal from '../../components/ui/ConfirmModal.jsx'
import Button from '../../components/ui/Button.jsx'
import {
  EyeIcon, PencilIcon, TrashIcon,
  SearchIcon, ChevronLeftIcon, ChevronRightIcon,
} from '../../components/ui/icons.jsx'
import { deleteWorker, fetchWorkers } from '../../api/adminApi.js'

// ─── constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE   = 10
// ─── shared ui ────────────────────────────────────────────────────────────────

function EmptyState({ text }) {
  return (
    <div className="rounded-xl border border-border bg-surface py-12 text-center text-sm text-text-muted">
      {text}
    </div>
  )
}

function SearchInput({ value, onChange, placeholder = "Ism yoki telefon..." }) {
  return (
    <div className="relative mb-4">
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-4 text-sm text-text placeholder:text-text-muted focus:border-gold focus:outline-none transition-colors"
      />
    </div>
  )
}

function Pagination({ page, total, onChange }) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-xs text-text-muted">{total} ta · {page}/{totalPages} sahifa</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:border-gold/40 hover:text-text disabled:opacity-30"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce((acc, p, i, arr) => {
            if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
            acc.push(p)
            return acc
          }, [])
          .map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="px-1 text-text-muted">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onChange(p)}
                className={[
                  'flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-xs font-bold transition-all',
                  p === page
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-border text-text-muted hover:border-gold/40 hover:text-text',
                ].join(' ')}
              >
                {p}
              </button>
            )
          )}
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:border-gold/40 hover:text-text disabled:opacity-30"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ─── active workers tab ───────────────────────────────────────────────────────

function WorkerRow({ row, onDelete, t }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:px-5">
      {/* avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-sm font-black text-text-muted select-none">
        {row.full_name?.[0] ?? '?'}
      </div>

      {/* info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">{row.full_name}</p>
        <p className="text-xs text-text-muted">{row.phone}</p>
      </div>

      {/* status */}
      <StatusBadge status={row.status} />

      {/* action icons */}
      <div className="flex shrink-0 items-center divide-x divide-border overflow-hidden rounded-lg border border-border">
        <Link
          to={`/admin/workers/${row.id}`}
          className="flex h-8 w-9 items-center justify-center text-text-muted hover:bg-surface-hover hover:text-gold transition-colors"
          title="Batafsil"
        >
          <EyeIcon className="h-4 w-4" />
        </Link>
        <Link
          to={`/admin/workers/${row.id}`}
          className="flex h-8 w-9 items-center justify-center text-text-muted hover:bg-surface-hover hover:text-blue-400 transition-colors"
          title="Tahrirlash"
        >
          <PencilIcon className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => onDelete(row)}
          className="flex h-8 w-9 items-center justify-center text-text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
          title="O'chirish"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function WorkersList({ t }) {
  const [workers,       setWorkers]       = useState([])
  const [isLoading,     setIsLoading]     = useState(true)
  const [error,         setError]         = useState(null)
  const [deleting,      setDeleting]      = useState(null)
  const [isProcessing,  setIsProcessing]  = useState(false)
  const [search,        setSearch]        = useState('')
  const [page,          setPage]          = useState(1)

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try { setWorkers(await fetchWorkers()) }
    catch (e) { setError(e.message) }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q
      ? workers.filter((w) =>
          w.full_name?.toLowerCase().includes(q) || w.phone?.includes(q)
        )
      : workers
  }, [workers, search])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleDelete() {
    setIsProcessing(true)
    try {
      await deleteWorker(deleting.id)
      await load()
    }
    catch (e) { setError(e.message) }
    finally { setIsProcessing(false); setDeleting(null) }
  }

  if (isLoading) return <p className="text-sm text-text-muted">{t('common.loading')}</p>
  if (error)     return <p className="text-sm text-red-400">{error}</p>

  return (
    <>
      <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} />

      {paged.length === 0 ? (
        <EmptyState text={search ? "Qidiruv natijasi yo'q" : t('workers.empty')} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {paged.map((row) => (
            <WorkerRow
              key={row.id} row={row} t={t}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      <Pagination page={page} total={filtered.length} onChange={setPage} />

      <ConfirmModal
        open={Boolean(deleting)}
        title={t('workers.delete_title')}
        description={`${deleting?.full_name ?? ''} ${t('workers.delete_desc')}`}
        variant="outline"
        confirmLabel={t('common.delete')}
        loading={isProcessing}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function WorkersPage() {
  const { t } = useTranslation()

  return (
    <div>
      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl font-black text-text sm:text-2xl">{t('workers.title')}</h1>
        <p className="text-xs text-text-muted sm:text-sm">{t('workers.subtitle')}</p>
      </div>

      <WorkersList t={t} />
    </div>
  )
}
