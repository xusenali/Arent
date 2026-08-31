import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Tabs from '../../components/ui/Tabs.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import ConfirmModal from '../../components/ui/ConfirmModal.jsx'
import { CheckIcon, XIcon } from '../../components/ui/icons.jsx'
import { approveWorker, deleteWorker, fetchWorkers } from '../../api/adminApi.js'

function WorkerRow({ row, onApprove, onDelete, detailsLabel, approveLabel, deleteLabel }) {
  return (
    <div className="border-b border-border px-4 py-3 last:border-b-0 sm:px-5 sm:py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">{row.full_name}</p>
          <p className="text-xs text-text-muted">{row.phone}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={row.status} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        {row.status === 'pending' && (
          <button type="button" onClick={() => onApprove(row)}
            className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300">
            <CheckIcon className="h-3.5 w-3.5" />
            {approveLabel}
          </button>
        )}
        <Link to={`/admin/workers/${row.id}`}
          className="text-xs font-medium text-gold hover:text-gold-light">
          {detailsLabel}
        </Link>
        <button type="button" onClick={() => onDelete(row)}
          className="ml-auto text-text-muted hover:text-red-400">
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function WorkersPage() {
  const { t } = useTranslation()
  const [countsByStatus, setCountsByStatus] = useState({})
  const [workers, setWorkers] = useState([])
  const [activeTab, setActiveTab] = useState('active')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const TABS = useMemo(() => [
    { value: 'active', label: t('workers.tab_active') },
    { value: 'pending', label: t('workers.tab_pending') },
    { value: 'overdue', label: t('workers.tab_overdue') },
  ], [t])

  const loadCounts = useCallback(async () => {
    const [active, pending, overdue] = await Promise.all(TABS.map((tab) => fetchWorkers(tab.value)))
    setCountsByStatus({ active: active.length, pending: pending.length, overdue: overdue.length })
  }, [TABS])

  const loadActiveTabWorkers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setWorkers(await fetchWorkers(activeTab))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab])

  useEffect(() => { loadActiveTabWorkers() }, [loadActiveTabWorkers])
  useEffect(() => { loadCounts() }, [loadCounts])

  const tabsWithCounts = useMemo(
    () => TABS.map((tab) => ({ ...tab, count: countsByStatus[tab.value] })),
    [countsByStatus, TABS],
  )

  async function handleConfirm() {
    setIsProcessing(true)
    try {
      if (pendingAction.type === 'delete') await deleteWorker(pendingAction.worker.id)
      else await approveWorker(pendingAction.worker.id)
      await Promise.all([loadActiveTabWorkers(), loadCounts()])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
      setPendingAction(null)
    }
  }

  return (
    <div>
      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl font-black text-text sm:text-2xl">{t('workers.title')}</h1>
        <p className="text-xs text-text-muted sm:text-sm">{t('workers.subtitle')}</p>
      </div>

      <div className="mb-5 sm:mb-6">
        <Tabs tabs={tabsWithCounts} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {isLoading ? (
        <p className="text-text-muted">{t('common.loading')}</p>
      ) : workers.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-12 text-center text-sm text-text-muted">
          {t('workers.empty')}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {workers.map((row) => (
            <WorkerRow
              key={row.id}
              row={row}
              onApprove={(w) => setPendingAction({ type: 'approve', worker: w })}
              onDelete={(w) => setPendingAction({ type: 'delete', worker: w })}
              detailsLabel={t('common.details')}
              approveLabel={t('common.approve')}
              deleteLabel={t('common.delete')}
            />
          ))}
        </div>
      )}

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
    </div>
  )
}
