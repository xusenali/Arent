import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import MediaPreview from '../../components/ui/MediaPreview.jsx'
import { ChevronLeftIcon, MapPinIcon, XIcon } from '../../components/ui/icons.jsx'
import {
  fetchWorkerDetail,
  fetchWorkerPayments,
  fetchWorkerRental,
  fetchWorkerRentalMedia,
  updateWorker,
  uploadWorkerDocument,
  deleteWorkerDocument,
} from '../../api/adminApi.js'
import { formatDate } from '../../utils/date.js'

// ─── constants ────────────────────────────────────────────────────────────────

const UNIT_EMOJI  = { scooter: '🛴', bike: '🚲' }
const PAY_LABEL   = { start: 'Oldindan (boshida)', end: 'Keyin (oxirida)' }
const STATUS_MAP  = {
  active:    { label: 'Faol',              cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  overdue:   { label: "Muddati o'tgan",   cls: 'bg-red-400/10    text-red-400    border-red-400/20'    },
  completed: { label: 'Yakunlangan',       cls: 'bg-border        text-text-muted border-border'         },
}
const RECEIPT_STATUS = {
  pending:  { label: 'Kutilmoqda', cls: 'bg-amber-400/10   text-amber-400'   },
  approved: { label: 'Tasdiqlangan', cls: 'bg-emerald-400/10 text-emerald-400' },
  rejected: { label: 'Rad etilgan', cls: 'bg-red-400/10    text-red-400'    },
}

function fmt(n) {
  return n != null ? `${Number(n).toLocaleString('uz-UZ')} so'm` : '—'
}

function periodLabel(days) {
  if (days === 1)  return 'Kunlik (1 kun)'
  if (days === 7)  return 'Haftalik (7 kun)'
  if (days === 30) return 'Oylik (30 kun)'
  return `${days} kun`
}

// ─── receipt lightbox modal ───────────────────────────────────────────────────

function ReceiptModal({ receipts, amount, onClose }) {
  const [idx, setIdx] = useState(0)
  const total = receipts.length
  const cur   = receipts[idx]

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const rSt = RECEIPT_STATUS[cur?.status] ?? RECEIPT_STATUS.pending

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={onClose}
    >
      {/* header */}
      <div
        className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-bold text-white">
              To'lov cheki {total > 1 ? `(${idx + 1}/${total})` : ''}
            </p>
            <p className="text-xs text-white/50">{fmt(amount)}</p>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${rSt.cls}`}>
            {rSt.label}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      {/* image area */}
      <div
        className="flex flex-1 items-center justify-center overflow-hidden p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {cur?.receipt_image ? (
          <img
            src={cur.receipt_image}
            alt={`Chek ${idx + 1}`}
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
          />
        ) : (
          <p className="text-white/40">Rasm mavjud emas</p>
        )}
      </div>

      {/* footer */}
      <div
        className="flex shrink-0 items-center justify-between border-t border-white/10 px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs text-white/40">{cur?.uploaded_at ? formatDate(cur.uploaded_at) : ''}</p>
        {total > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => setIdx((i) => i - 1)}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 disabled:opacity-30"
            >
              ← Oldingi
            </button>
            <button
              type="button"
              disabled={idx === total - 1}
              onClick={() => setIdx((i) => i + 1)}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 disabled:opacity-30"
            >
              Keyingi →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── rental info card ─────────────────────────────────────────────────────────

function RentalCard({ rental }) {
  if (!rental) {
    return (
      <p className="text-sm text-text-muted">Hozirda faol ijara yo'q</p>
    )
  }

  const st = STATUS_MAP[rental.status] ?? STATUS_MAP.active
  const daysLeft = rental.days_left

  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Transport</dt>
        <dd className="mt-1 flex items-center gap-1.5 text-sm font-bold text-text">
          <span className="text-base">{UNIT_EMOJI[rental.unit_type] ?? '🚗'}</span>
          {rental.unit_model}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Ijara holati</dt>
        <dd className="mt-1">
          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${st.cls}`}>
            {st.label}
          </span>
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Davr</dt>
        <dd className="mt-1 text-sm text-text">{periodLabel(rental.period_days)}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">To'lov tartibi</dt>
        <dd className="mt-1 text-sm text-text">{PAY_LABEL[rental.pay_timing] ?? rental.pay_timing}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Boshlangan</dt>
        <dd className="mt-1 text-sm text-text">{rental.start_date}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Tugash sanasi</dt>
        <dd className="mt-1">
          <span className="text-sm font-semibold text-text">{rental.due_date}</span>
          {daysLeft != null && (
            <span className={`ml-2 text-xs font-bold ${daysLeft < 0 ? 'text-red-400' : daysLeft <= 3 ? 'text-amber-400' : 'text-text-muted'}`}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)} kun o'tgan` : daysLeft === 0 ? 'Bugun!' : `${daysLeft} kun qoldi`}
            </span>
          )}
        </dd>
      </div>
    </dl>
  )
}

// ─── payments section ─────────────────────────────────────────────────────────

function PaymentRow({ row, onViewReceipt }) {
  const paid   = row.paid_at != null
  const isFine = row.is_fine

  return (
    <div className="border-b border-border px-4 py-3.5 last:border-b-0 sm:px-5">
      <div className="flex items-start gap-3">
        {/* left: date + amount + type */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-text">{fmt(row.amount)}</p>
            <span className={[
              'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide',
              isFine
                ? 'bg-red-400/10 text-red-400'
                : 'bg-gold/10 text-gold',
            ].join(' ')}>
              {isFine ? 'Jarima' : "To'lov"}
            </span>
            <span className={[
              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
              paid ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400',
            ].join(' ')}>
              {paid ? "To'langan" : "Kutilmoqda"}
            </span>
          </div>
          <p className="text-xs text-text-muted">
            {paid
              ? `To'langan: ${formatDate(row.paid_at)}`
              : `Yaratilgan: ${formatDate(row.created_at)}`
            }
          </p>
          {isFine && row.fine_days_count != null && (
            <p className="text-[11px] text-red-400/70">{row.fine_days_count} kun jarima</p>
          )}
        </div>

        {/* right: receipt button */}
        {row.receipts?.length > 0 && (
          <button
            type="button"
            onClick={() => onViewReceipt(row)}
            className="shrink-0 rounded-lg border border-gold/30 bg-gold/5 px-3 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold/15 active:scale-95"
          >
            Chekni ko'rish
            {row.receipts.length > 1 && (
              <span className="ml-1 rounded-full bg-gold/20 px-1 text-[10px]">{row.receipts.length}</span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function WorkerDetailPage() {
  const { t }  = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()

  const [worker,       setWorker]       = useState(undefined)
  const [rental,       setRental]       = useState(undefined)
  const [payments,     setPayments]     = useState([])
  const [media,        setMedia]        = useState([])
  const [error,        setError]        = useState(null)
  const [isEditing,    setIsEditing]    = useState(false)
  const [fullName,     setFullName]     = useState('')
  const [phone,        setPhone]        = useState('')
  const [isSaving,     setIsSaving]     = useState(false)
  const [docUploading, setDocUploading] = useState({
    id_card_front: false, id_card_back: false, agreement_video: false,
  })
  const [receiptModal, setReceiptModal] = useState(null) // { receipts, amount }

  useEffect(() => {
    Promise.all([
      fetchWorkerDetail(id),
      fetchWorkerRental(id),
      fetchWorkerPayments(id),
      fetchWorkerRentalMedia(id),
    ])
      .then(([workerData, rentalData, paymentsData, mediaData]) => {
        setWorker(workerData)
        setFullName(workerData.full_name)
        setPhone(workerData.phone)
        setRental(rentalData)
        setPayments(paymentsData)
        setMedia(
          mediaData.map((item) => ({
            id:    item.id,
            type:  item.media_type === 'video' ? 'video' : 'image',
            url:   item.file,
            label: item.media_type === 'video' ? 'Video' : t('worker_detail.media'),
          })),
        )
      })
      .catch((err) => {
        if (err.status === 404) setWorker(null)
        else setError(err.message)
      })
  }, [id, t])

  async function handleDocUpload(type, file) {
    if (!file) return
    setDocUploading((p) => ({ ...p, [type]: true }))
    try {
      const fd = new FormData()
      fd.append(type, file)
      setWorker(await uploadWorkerDocument(id, fd))
    } catch (err) {
      setError(err.message)
    } finally {
      setDocUploading((p) => ({ ...p, [type]: false }))
    }
  }

  async function handleDocDelete(type) {
    try { setWorker(await deleteWorkerDocument(id, type)) }
    catch (err) { setError(err.message) }
  }

  async function handleSave(e) {
    e.preventDefault()
    setIsSaving(true)
    try {
      setWorker(await updateWorker(id, { full_name: fullName, phone }))
      setIsEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (error) return <p className="text-red-400">{error}</p>
  if (worker === undefined) return <p className="text-text-muted">{t('common.loading')}</p>
  if (worker === null) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="mb-4 text-text-muted">{t('worker_detail.not_found')}</p>
        <Link to="/admin/workers" className="text-sm font-medium text-gold hover:text-gold-light">
          {t('worker_detail.back_list')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <button
        type="button"
        onClick={() => navigate('/admin/workers')}
        className="mb-5 hidden items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text md:flex"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        {t('worker_detail.back')}
      </button>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black text-text sm:text-2xl">{worker.full_name}</h1>
            <StatusBadge status={worker.status} />
          </div>
          <p className="text-xs text-text-muted sm:text-sm">{worker.phone}</p>
        </div>
        {!isEditing && (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            {t('common.edit')}
          </Button>
        )}
      </div>

      {/* Shaxsiy ma'lumotlar */}
      <section className="mb-4 rounded-xl border border-border bg-surface p-4 sm:mb-6 sm:p-6">
        <h2 className="mb-4 font-bold text-text">{t('worker_detail.personal')}</h2>
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label={t('worker_detail.full_name')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label={t('worker_detail.phone')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="flex gap-3">
              <Button type="submit" loading={isSaving}>{t('common.save')}</Button>
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {t('worker_detail.full_name')}
              </dt>
              <dd className="mt-1 text-sm text-text">{worker.full_name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {t('worker_detail.phone')}
              </dt>
              <dd className="mt-1 text-sm text-text">{worker.phone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {t('worker_detail.registered_at')}
              </dt>
              <dd className="mt-1 text-sm text-text">{formatDate(worker.created_at)}</dd>
            </div>
          </dl>
        )}
      </section>

      {/* Transport va Ijara */}
      <section className="mb-4 rounded-xl border border-border bg-surface p-4 sm:mb-6 sm:p-6">
        <h2 className="mb-4 font-bold text-text">Transport va Ijara</h2>
        <RentalCard rental={rental ?? null} />
      </section>

      {/* Hujjatlar */}
      <section className="mb-4 rounded-xl border border-border bg-surface p-4 sm:mb-6 sm:p-6">
        <h2 className="mb-4 font-bold text-text">Hujjatlar</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { field: 'id_card_front',  label: 'ID Karta — Old tomoni',  accept: 'image/*', isImage: true  },
            { field: 'id_card_back',   label: 'ID Karta — Orqa tomoni', accept: 'image/*', isImage: true  },
            { field: 'agreement_video', label: 'Kelishilgan Video',      accept: 'video/*', isImage: false },
          ].map(({ field, label, accept, isImage }) => (
            <div key={field} className="rounded-lg border border-border bg-bg p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
              {worker[field] ? (
                <div className="space-y-3">
                  {isImage ? (
                    <img src={worker[field]} alt={label} className="w-full rounded-lg object-cover" style={{ maxHeight: 160 }} />
                  ) : (
                    <video src={worker[field]} controls className="w-full rounded-lg" style={{ maxHeight: 160 }} />
                  )}
                  <div className="flex gap-2">
                    <a href={worker[field]} target="_blank" rel="noreferrer"
                      className="flex-1 rounded-lg border border-border py-1.5 text-center text-xs font-semibold text-gold hover:bg-gold/5">
                      Ko'rish
                    </a>
                    <button type="button" onClick={() => handleDocDelete(field)}
                      className="flex-1 rounded-lg border border-red-500/30 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/5">
                      O'chirish
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-3 py-8 text-center transition hover:border-gold/40">
                  {isImage ? (
                    <svg className="h-7 w-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="h-7 w-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                  <span className="text-xs text-text-muted">
                    {docUploading[field] ? 'Yuklanmoqda...' : `${isImage ? 'Rasm' : 'Video'} yuklash`}
                  </span>
                  <input
                    type="file"
                    accept={accept}
                    className="hidden"
                    disabled={docUploading[field]}
                    onChange={(e) => handleDocUpload(field, e.target.files[0])}
                  />
                </label>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Media */}
      {media.length > 0 && (
        <section className="mb-4 rounded-xl border border-border bg-surface p-4 sm:mb-6 sm:p-6">
          <h2 className="mb-4 font-bold text-text">{t('worker_detail.media')}</h2>
          <MediaPreview items={media} />
        </section>
      )}

      {/* To'lovlar */}
      <section className="mb-4 rounded-xl border border-border bg-surface sm:mb-6">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="font-bold text-text">To'lovlar tarixi</h2>
          {payments.length > 0 && (
            <p className="mt-0.5 text-xs text-text-muted">{payments.length} ta yozuv</p>
          )}
        </div>

        {payments.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-text-muted sm:px-5">
            {t('worker_detail.no_payments')}
          </div>
        ) : (
          payments.map((row) => (
            <PaymentRow
              key={row.id}
              row={row}
              onViewReceipt={(r) => setReceiptModal({ receipts: r.receipts, amount: r.amount })}
            />
          ))
        )}
      </section>

      {/* Joylashuv */}
      <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="mb-4 font-bold text-text">{t('worker_detail.location')}</h2>
        <Link to="/admin/map" className="flex items-center gap-2 text-sm font-medium text-gold hover:text-gold-light">
          <MapPinIcon className="h-4 w-4" />
          {t('worker_detail.view_map')}
        </Link>
      </section>

      {/* Chek modal */}
      {receiptModal && (
        <ReceiptModal
          receipts={receiptModal.receipts}
          amount={receiptModal.amount}
          onClose={() => setReceiptModal(null)}
        />
      )}
    </div>
  )
}
