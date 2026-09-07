import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import ConfirmModal from '../../components/ui/ConfirmModal.jsx'
import Button from '../../components/ui/Button.jsx'
import {
  CheckIcon, XIcon, EyeIcon, PencilIcon, TrashIcon,
  SearchIcon, ChevronLeftIcon, ChevronRightIcon,
} from '../../components/ui/icons.jsx'
import { approveWorker, deleteWorker, fetchWorkers } from '../../api/adminApi.js'
import { fetchAdminApplications, approveApplication, rejectApplication } from '../../api/applicationsApi.js'

// ─── constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE   = 10
const TYPE_LABEL  = { scooter: '🛴', bike: '🚲' }
const PERIOD_LABEL = { daily: 'Kunlik', weekly: 'Haftalik', monthly: 'Oylik' }
const PAY_LABEL   = { start: 'Boshida', end: 'Oxirida' }

function fmt(n) { return n ? Number(n).toLocaleString('uz-UZ') + " so'm" : null }

// ─── shared ui ────────────────────────────────────────────────────────────────

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="mb-5 -mx-4 sm:mx-0">
      <div className="flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 scrollbar-none">
        {tabs.map((t) => {
          const isActive = active === t.value
          return (
            <button key={t.value} type="button" onClick={() => onChange(t.value)}
              className={[
                'flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all',
                isActive
                  ? 'border-gold/60 bg-gold/10 text-gold'
                  : 'border-border bg-surface text-text-muted hover:border-gold/30 hover:text-text',
              ].join(' ')}>
              {t.label}
              {t.count != null && (
                <span className={[
                  'rounded-full px-1.5 py-0.5 text-[10px] font-black',
                  isActive ? 'bg-gold text-black' : 'bg-border text-text-muted',
                ].join(' ')}>
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

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

// ─── approve application modal ────────────────────────────────────────────────

function ApproveAppModal({ app, onClose, onDone }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function confirm() {
    setLoading(true); setError(null)
    try { await approveApplication(app.id); onDone(app.id) }
    catch (e) { setError(e.message); setLoading(false) }
  }

  const price = fmt(app.total_amount)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <h2 className="mb-4 text-base font-black text-text">Arizani tasdiqlash</h2>

        <dl className="mb-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-muted">Ism</dt>
            <dd className="font-semibold text-text">{app.full_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Telefon</dt>
            <dd className="text-text">{app.phone}</dd>
          </div>
          {app.unit_name && (
            <div className="flex justify-between">
              <dt className="text-text-muted">Transport</dt>
              <dd className="font-semibold text-text">
                {TYPE_LABEL[app.unit_type] ?? ''} {app.unit_name}
              </dd>
            </div>
          )}
          {app.battery_count != null && (
            <div className="flex justify-between">
              <dt className="text-text-muted">Batareya</dt>
              <dd className="font-semibold text-text">{app.battery_count} ta</dd>
            </div>
          )}
          {app.unit_type !== 'scooter' && (
            <div className="flex justify-between">
              <dt className="text-text-muted">Davr</dt>
              <dd className="font-semibold text-text">{PERIOD_LABEL[app.period_type] ?? app.period_type}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-text-muted">To'lov</dt>
            <dd className="font-semibold text-text">{PAY_LABEL[app.pay_timing] ?? app.pay_timing}</dd>
          </div>
          {price && (
            <div className="flex justify-between border-t border-border pt-1.5">
              <dt className="font-semibold text-text-muted">Jami</dt>
              <dd className="font-black text-gold">{price}</dd>
            </div>
          )}
        </dl>

        <div className="mb-4 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2.5 text-xs text-text-muted">
          Tasdiqlanganda:
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>Ishchi hisobi yaratiladi (parol: raqamlar)</li>
            {app.unit_name && <li>Transport "Band" bo'ladi</li>}
            <li>{PERIOD_LABEL[app.period_type] ?? 'Haftalik'} ijara boshlanadi</li>
            {app.pay_timing === 'start' && <li>To'lov darhol yaratiladi</li>}
            {app.pay_timing === 'end'   && <li>To'lov ijara oxirida yaratiladi</li>}
          </ul>
        </div>

        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Bekor</Button>
          <Button className="flex-1" loading={loading} onClick={confirm}>
            <CheckIcon className="h-4 w-4" /> Tasdiqlash
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── pending applications tab ─────────────────────────────────────────────────

function AppRow({ app, onApprove, onReject, rejecting }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:px-5">
      {/* avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/10 text-sm font-black text-gold select-none">
        {app.full_name?.[0] ?? '?'}
      </div>

      {/* info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">{app.full_name}</p>
        <div className="flex flex-wrap gap-x-2 text-xs text-text-muted">
          <span>{app.phone}</span>
          {app.unit_name && (
            <span className="font-medium text-gold">
              {TYPE_LABEL[app.unit_type] ?? ''} {app.unit_name}
            </span>
          )}
          {app.battery_count != null
            ? <span>{app.battery_count}🔋 · Haftalik</span>
            : <span>{PERIOD_LABEL[app.period_type] ?? app.period_type}</span>
          }
          {fmt(app.total_amount) && (
            <span className="font-bold text-gold">{fmt(app.total_amount)}</span>
          )}
        </div>
      </div>

      {/* actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={() => onReject(app.id)} disabled={rejecting}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-40"
          title="Rad etish">
          <XIcon className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onApprove(app)}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-gold px-3 text-xs font-bold text-black hover:bg-gold/90"
          title="Tasdiqlash">
          <CheckIcon className="h-3.5 w-3.5" /> Tasdiqlash
        </button>
      </div>
    </div>
  )
}

function PendingApplicationsTab({ onCountChange }) {
  const [apps,        setApps]        = useState([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [error,       setError]       = useState(null)
  const [approving,   setApproving]   = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [search,      setSearch]      = useState('')
  const [page,        setPage]        = useState(1)

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const data = await fetchAdminApplications('pending')
      setApps(data); onCountChange(data.length)
    }
    catch (e) { setError(e.message) }
    finally { setIsLoading(false) }
  }, [onCountChange])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q
      ? apps.filter((a) =>
          a.full_name?.toLowerCase().includes(q) || a.phone?.includes(q)
        )
      : apps
  }, [apps, search])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function onApproved(id) {
    setApproving(null)
    setApps((prev) => { const next = prev.filter((a) => a.id !== id); onCountChange(next.length); return next })
  }

  async function handleReject(id) {
    setRejectingId(id)
    try {
      await rejectApplication(id)
      setApps((prev) => { const next = prev.filter((a) => a.id !== id); onCountChange(next.length); return next })
    }
    catch (e) { setError(e.message) }
    finally { setRejectingId(null) }
  }

  if (isLoading) return <p className="text-sm text-text-muted">Yuklanmoqda...</p>
  if (error)     return <p className="text-sm text-red-400">{error}</p>

  return (
    <>
      <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} />

      {paged.length === 0 ? (
        <EmptyState text={search ? "Qidiruv natijasi yo'q" : "Ariza yo'q"} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {paged.map((app) => (
            <AppRow
              key={app.id}
              app={app}
              rejecting={rejectingId === app.id}
              onApprove={setApproving}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      <Pagination page={page} total={filtered.length} onChange={setPage} />

      {approving && (
        <ApproveAppModal app={approving} onClose={() => setApproving(null)} onDone={onApproved} />
      )}
    </>
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

function WorkersTab({ status, t, onCountChange }) {
  const [workers,       setWorkers]       = useState([])
  const [isLoading,     setIsLoading]     = useState(true)
  const [error,         setError]         = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [isProcessing,  setIsProcessing]  = useState(false)
  const [search,        setSearch]        = useState('')
  const [page,          setPage]          = useState(1)

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const data = await fetchWorkers(status)
      setWorkers(data); onCountChange(data.length)
    }
    catch (e) { setError(e.message) }
    finally { setIsLoading(false) }
  }, [status, onCountChange])

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

  async function handleConfirm() {
    setIsProcessing(true)
    try {
      if (pendingAction.type === 'delete') await deleteWorker(pendingAction.worker.id)
      else await approveWorker(pendingAction.worker.id)
      await load()
    }
    catch (e) { setError(e.message) }
    finally { setIsProcessing(false); setPendingAction(null) }
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
              onDelete={(w) => setPendingAction({ type: 'delete', worker: w })}
            />
          ))}
        </div>
      )}

      <Pagination page={page} total={filtered.length} onChange={setPage} />

      <ConfirmModal
        open={Boolean(pendingAction)}
        title={pendingAction?.type === 'delete' ? t('workers.delete_title') : t('workers.approve_title')}
        description={
          pendingAction?.type === 'delete'
            ? `${pendingAction?.worker.full_name} ${t('workers.delete_desc')}`
            : `${pendingAction?.worker.full_name} ${t('workers.approve_desc')}`
        }
        variant={pendingAction?.type === 'delete' ? 'outline' : 'primary'}
        confirmLabel={pendingAction?.type === 'delete' ? t('common.delete') : t('common.approve')}
        loading={isProcessing}
        onConfirm={handleConfirm}
        onCancel={() => setPendingAction(null)}
      />
    </>
  )
}

// ─── rejected applications tab ────────────────────────────────────────────────

function RejectedApplicationsTab({ onCountChange }) {
  const [apps,      setApps]      = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState(null)
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(1)

  useEffect(() => {
    setIsLoading(true)
    fetchAdminApplications('rejected')
      .then((data) => { setApps(data); onCountChange(data.length) })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [onCountChange])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q
      ? apps.filter((a) => a.full_name?.toLowerCase().includes(q) || a.phone?.includes(q))
      : apps
  }, [apps, search])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (isLoading) return <p className="text-sm text-text-muted">Yuklanmoqda...</p>
  if (error)     return <p className="text-sm text-red-400">{error}</p>

  return (
    <>
      <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} />

      {paged.length === 0 ? (
        <EmptyState text={search ? "Qidiruv natijasi yo'q" : "Rad etilgan ariza yo'q"} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {paged.map((app) => (
            <div key={app.id}
              className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:px-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-400/10 text-sm font-black text-red-400 select-none">
                {app.full_name?.[0] ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{app.full_name}</p>
                <div className="flex flex-wrap gap-x-2 text-xs text-text-muted">
                  <span>{app.phone}</span>
                  {app.unit_name && (
                    <span>{TYPE_LABEL[app.unit_type] ?? ''} {app.unit_name}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">
                  Rad etilgan
                </span>
                <span className="text-[11px] text-text-muted/50">
                  {new Date(app.created_at).toLocaleDateString('uz-UZ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} total={filtered.length} onChange={setPage} />
    </>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function WorkersPage() {
  const { t } = useTranslation()
  const [activeTab,         setActiveTab]         = useState('pending')
  const [pendingAppCount,   setPendingAppCount]   = useState(null)
  const [activeWorkerCount, setActiveWorkerCount] = useState(null)
  const [rejectedAppCount,  setRejectedAppCount]  = useState(null)

  const TABS = [
    { value: 'pending',  label: 'Kutilayotgan', count: pendingAppCount    },
    { value: 'active',   label: 'Tasdiqlangan', count: activeWorkerCount  },
    { value: 'rejected', label: 'Rad etilgan',  count: rejectedAppCount   },
  ]

  return (
    <div>
      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl font-black text-text sm:text-2xl">{t('workers.title')}</h1>
        <p className="text-xs text-text-muted sm:text-sm">{t('workers.subtitle')}</p>
      </div>

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'pending' && (
        <PendingApplicationsTab onCountChange={setPendingAppCount} />
      )}
      {activeTab === 'active' && (
        <WorkersTab status="active" t={t} onCountChange={setActiveWorkerCount} />
      )}
      {activeTab === 'rejected' && (
        <RejectedApplicationsTab onCountChange={setRejectedAppCount} />
      )}
    </div>
  )
}
