import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import FileUploader from '../../components/ui/FileUploader.jsx'
import Button from '../../components/ui/Button.jsx'
import { ClockIcon } from '../../components/ui/icons.jsx'
import { fetchWorkerDashboard, uploadPaymentReceipt } from '../../api/workerApi.js'
import { formatDate } from '../../utils/date.js'

const STATUS_TO_BADGE = { active: 'active', overdue: 'overdue', completed: 'completed' }

function formatSum(n) {
  return Number(n).toLocaleString('uz-UZ') + " so'm"
}

// ─── Payment timing info card ─────────────────────────────────────────────────
function PaymentTimingCard({ rental, t }) {
  const { pay_timing, days_left, has_pending_payment, pending_payment_amount } = rental

  if (pay_timing === 'start') {
    if (has_pending_payment) {
      return (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-400">
            {t('worker_dashboard.payment_due_now')}
          </p>
          <p className="mb-1 text-xl font-black text-amber-400">{formatSum(pending_payment_amount)}</p>
          <p className="text-xs text-amber-400/80">{t('worker_dashboard.payment_due_now_desc')}</p>
        </div>
      )
    }
    return (
      <div className="mb-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {t('worker_dashboard.payment_next', { date: formatDate(rental.due_date) })}
        </p>
      </div>
    )
  }

  // pay_timing === 'end'
  if (days_left <= 0) {
    return (
      <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 sm:p-5">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-red-400">
          {t('worker_dashboard.payment_overdue')}
        </p>
        <p className="mb-1 text-xl font-black text-red-400">{formatSum(pending_payment_amount)}</p>
        <p className="text-xs text-red-400/80">{t('worker_dashboard.payment_due_end_desc')}</p>
      </div>
    )
  }
  if (days_left <= 3) {
    return (
      <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-400">
          {t('worker_dashboard.payment_due_in', { days: days_left })}
        </p>
        <p className="mb-1 text-xl font-black text-amber-400">{formatSum(pending_payment_amount)}</p>
        <p className="text-xs text-amber-400/80">{t('worker_dashboard.payment_due_end_desc')}</p>
      </div>
    )
  }
  return (
    <div className="mb-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {t('worker_dashboard.payment_due_in', { days: days_left })} — {formatDate(rental.due_date)}
      </p>
      <p className="mt-0.5 text-xs text-text-muted">{t('worker_dashboard.payment_due_end_desc')}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const TG_BOT = import.meta.env.VITE_TELEGRAM_BOT_USERNAME

export default function WorkerDashboardPage() {
  const { t } = useTranslation()
  const [rental, setRental]               = useState(undefined)
  const [tgConnected, setTgConnected]     = useState(true)
  const [loadError, setLoadError]         = useState(null)
  const [receiptFile, setReceiptFile]     = useState(null)
  const [isUploading, setIsUploading]     = useState(false)
  const [uploadError, setUploadError]     = useState(null)
  const [ended, setEnded]                 = useState(false)

  useEffect(() => {
    fetchWorkerDashboard()
      .then((data) => {
        setTgConnected(!!data.telegram_connected)
        setRental(data.rental_id ? data : null)
      })
      .catch((err) => setLoadError(err.message))
  }, [])

  async function handleUpload() {
    if (!receiptFile) return
    setIsUploading(true)
    setUploadError(null)
    try {
      await uploadPaymentReceipt({ file: receiptFile })
      setRental((prev) => prev ? { ...prev, last_receipt_status: 'pending' } : prev)
      setReceiptFile(null)
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  if (loadError) return <p className="text-red-400">{loadError}</p>
  if (rental === undefined) return <p className="text-text-muted">{t('common.loading')}</p>

  const TgBanner = !tgConnected && (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
      <svg className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.93 6.43l-1.68 7.92c-.12.56-.46.7-.93.43l-2.57-1.9-1.24 1.19c-.14.14-.26.26-.52.26l.18-2.6 4.7-4.25c.2-.18-.05-.28-.32-.1L7.6 13.9l-2.5-.78c-.54-.17-.55-.54.12-.8l9.74-3.75c.45-.16.84.11.97.82z"/>
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-sky-400">Telegram botga ulanmagan</p>
        <p className="mt-0.5 text-xs text-sky-400/80">
          Parolni tiklash va joylashuvni ulash uchun botga o'tib, telefon raqamingizni yuboring.
        </p>
        {TG_BOT && (
          <a
            href={`https://t.me/${TG_BOT}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
          >
            Botga o'tish →
          </a>
        )}
        {!TG_BOT && (
          <p className="mt-1 text-xs text-sky-400/60">Bot: admindan havolani so'rang</p>
        )}
      </div>
    </div>
  )

  if (ended) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center sm:p-10">
        <p className="text-base font-bold text-emerald-400">{t('worker_dashboard.rental_ended_success')}</p>
      </div>
    )
  }

  if (rental === null) {
    return (
      <div>
        {TgBanner}
        <div className="rounded-xl border border-border bg-surface p-8 text-center sm:p-10">
          <p className="text-text-muted">{t('worker_dashboard.no_rental')}</p>
        </div>
      </div>
    )
  }

  const canUpload = rental.has_pending_payment && rental.last_receipt_status !== 'pending'
  const receiptPending = rental.has_pending_payment && rental.last_receipt_status === 'pending'

  return (
    <div className="mx-auto max-w-3xl">
      {TgBanner}
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-text sm:text-2xl">{t('worker_dashboard.title')}</h1>
          <p className="text-xs text-text-muted sm:text-sm">
            {rental.unit_model} — {t('worker_dashboard.current_rental')}
          </p>
        </div>
        <StatusBadge status={STATUS_TO_BADGE[rental.status]} />
      </div>

      {/* Overdue banner */}
      {rental.status === 'overdue' && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-4 sm:px-6 sm:py-5">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-red-400">
            {t('worker_dashboard.overdue_banner')}
          </p>
          <p className="text-xl font-black text-red-400 sm:text-2xl">
            {Number(rental.current_fine).toLocaleString('uz-UZ')} {t('common.sum')}
          </p>
          <p className="mt-1 text-xs text-red-400/80">
            {Math.abs(rental.days_left)} {t('worker_dashboard.overdue_desc')}
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div className="mb-5 grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border bg-surface p-3 sm:p-5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:text-xs">
            {t('worker_dashboard.start_date')}
          </p>
          <p className="text-xs font-bold text-text sm:text-sm">{formatDate(rental.start_date)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 sm:p-5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:text-xs">
            {t('worker_dashboard.days_left')}
          </p>
          <p className="flex items-center gap-1 text-xs font-bold text-text sm:text-sm">
            <ClockIcon className="h-3.5 w-3.5 text-gold" />
            {rental.days_left >= 0
              ? `${rental.days_left} ${t('worker_dashboard.days_suffix')}`
              : `${Math.abs(rental.days_left)} ${t('worker_dashboard.days_overdue')}`}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 sm:p-5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:text-xs">
            {t('worker_dashboard.amount_due')}
          </p>
          <p className="text-xs font-bold text-gold sm:text-sm">
            {Number(rental.pending_payment_amount || 0).toLocaleString('uz-UZ')} {t('common.sum')}
          </p>
        </div>
      </div>

      {/* Payment timing info */}
      <PaymentTimingCard rental={rental} t={t} />

      {/* Receipt upload — faqat pending to'lov bo'lsa */}
      {(canUpload || receiptPending) && (
        <div className="mb-4 rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h2 className="mb-1 font-bold text-text">{t('worker_dashboard.upload_title')}</h2>
          <p className="mb-4 text-sm text-text-muted">{t('worker_dashboard.upload_desc')}</p>

          {receiptPending ? (
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
      )}

    </div>
  )
}
