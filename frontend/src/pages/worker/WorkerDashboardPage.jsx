import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import FileUploader from '../../components/ui/FileUploader.jsx'
import Button from '../../components/ui/Button.jsx'
import { ClockIcon, MapPinIcon } from '../../components/ui/icons.jsx'
import { fetchWorkerDashboard, uploadPaymentReceipt } from '../../api/workerApi.js'
import { formatDate } from '../../utils/date.js'

const STATUS_TO_BADGE = { active: 'active', overdue: 'overdue', completed: 'completed' }

export default function WorkerDashboardPage() {
  const { t } = useTranslation()
  const [rental, setRental] = useState(undefined)
  const [loadError, setLoadError] = useState(null)
  const [receiptFile, setReceiptFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  useEffect(() => {
    fetchWorkerDashboard()
      .then((data) => setRental(data.rental_id ? data : null))
      .catch((err) => setLoadError(err.message))
  }, [])

  async function handleUpload() {
    if (!receiptFile) return
    setIsUploading(true)
    setUploadError(null)
    try {
      await uploadPaymentReceipt({ file: receiptFile })
      setRental((prev) => (prev ? { ...prev, last_receipt_status: 'pending' } : prev))
      setReceiptFile(null)
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  if (loadError) return <p className="text-red-400">{loadError}</p>
  if (rental === undefined) return <p className="text-text-muted">{t('common.loading')}</p>
  if (rental === null) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center sm:p-10">
        <p className="text-text-muted">{t('worker_dashboard.no_rental')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-text sm:text-2xl">{t('worker_dashboard.title')}</h1>
          <p className="text-xs text-text-muted sm:text-sm">{rental.unit_model} — {t('worker_dashboard.current_rental')}</p>
        </div>
        <StatusBadge status={STATUS_TO_BADGE[rental.status]} />
      </div>

      {rental.status === 'overdue' && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-4 sm:px-6 sm:py-5">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-red-400 sm:text-sm">
            {t('worker_dashboard.overdue_banner')}
          </p>
          <p className="text-xl font-black text-red-400 sm:text-2xl">
            {Number(rental.current_fine).toLocaleString('uz-UZ')} {t('common.sum')}
          </p>
          <p className="mt-1 text-xs text-red-400/80 sm:text-sm">
            {Math.abs(rental.days_left)} {t('worker_dashboard.overdue_desc')}
          </p>
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:text-xs">
            {t('worker_dashboard.start_date')}
          </p>
          <p className="text-sm font-bold text-text sm:text-base">{formatDate(rental.start_date)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:text-xs">
            {t('worker_dashboard.days_left')}
          </p>
          <p className="flex items-center gap-2 text-sm font-bold text-text sm:text-base">
            <ClockIcon className="h-4 w-4 text-gold" />
            {rental.days_left >= 0
              ? `${rental.days_left} ${t('worker_dashboard.days_suffix')}`
              : `${Math.abs(rental.days_left)} ${t('worker_dashboard.days_overdue')}`}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:text-xs">
            {t('worker_dashboard.amount_due')}
          </p>
          <p className="text-sm font-bold text-gold sm:text-base">
            {Number(rental.amount_due).toLocaleString('uz-UZ')} {t('common.sum')}
          </p>
        </div>
      </div>

      {/* Joylashuv ulash */}
      <div className="mb-4 rounded-xl border border-border bg-surface p-4 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <MapPinIcon className="h-5 w-5 text-gold" />
          <h2 className="font-bold text-text">{t('worker_dashboard.location_title')}</h2>
        </div>
        <p className="mb-4 text-sm text-text-muted">{t('worker_dashboard.location_desc')}</p>
        <a
          href="https://t.me/ashrapovrentbot"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
        >
          <MapPinIcon className="h-4 w-4" />
          {t('worker_dashboard.location_btn')}
        </a>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="mb-1 font-bold text-text">{t('worker_dashboard.upload_title')}</h2>
        <p className="mb-4 text-sm text-text-muted sm:mb-5">{t('worker_dashboard.upload_desc')}</p>

        {rental.last_receipt_status === 'pending' ? (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            <ClockIcon className="h-5 w-5 shrink-0" />
            {t('worker_dashboard.pending_receipt')}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <FileUploader
              accept="image/*"
              maxSizeMb={5}
              hint="JPG, PNG — 5MB gacha"
              file={receiptFile}
              onChange={setReceiptFile}
            />
            {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
            <Button onClick={handleUpload} loading={isUploading} disabled={!receiptFile} fullWidth>
              {t('worker_dashboard.send_receipt')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
