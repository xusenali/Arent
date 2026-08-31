import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import MediaPreview from '../../components/ui/MediaPreview.jsx'
import { ChevronLeftIcon, MapPinIcon } from '../../components/ui/icons.jsx'
import { fetchWorkerDetail, fetchWorkerPayments, fetchWorkerRentalMedia, updateWorker, uploadWorkerDocument, deleteWorkerDocument } from '../../api/adminApi.js'
import { formatDate } from '../../utils/date.js'

export default function WorkerDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()

  const [worker, setWorker] = useState(undefined)
  const [payments, setPayments] = useState([])
  const [media, setMedia] = useState([])
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [docUploading, setDocUploading] = useState({ id_card_front: false, id_card_back: false, agreement_video: false })
  const [receiptModal, setReceiptModal] = useState(null) // { receipts: [], amount }
  const modalRef = useRef(null)

  useEffect(() => {
    Promise.all([fetchWorkerDetail(id), fetchWorkerPayments(id), fetchWorkerRentalMedia(id)])
      .then(([workerData, paymentsData, mediaData]) => {
        setWorker(workerData)
        setFullName(workerData.full_name)
        setPhone(workerData.phone)
        setPayments(paymentsData)
        setMedia(mediaData.map((item) => ({
          id: item.id,
          type: item.media_type === 'video' ? 'video' : 'image',
          url: item.file,
          label: item.media_type === 'video' ? 'Video' : t('worker_detail.media'),
        })))
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
      const updated = await uploadWorkerDocument(id, fd)
      setWorker(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setDocUploading((p) => ({ ...p, [type]: false }))
    }
  }

  async function handleDocDelete(type) {
    try {
      const updated = await deleteWorkerDocument(id, type)
      setWorker(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSave(event) {
    event.preventDefault()
    setIsSaving(true)
    try {
      const updated = await updateWorker(id, { full_name: fullName, phone })
      setWorker(updated)
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
      <button type="button" onClick={() => navigate('/admin/workers')}
        className="mb-5 hidden items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text md:flex">
        <ChevronLeftIcon className="h-4 w-4" />
        {t('worker_detail.back')}
      </button>

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

      <section className="mb-4 rounded-xl border border-border bg-surface p-4 sm:mb-6 sm:p-6">
        <h2 className="mb-4 font-bold text-text">{t('worker_detail.personal')}</h2>
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <Input label={t('worker_detail.full_name')} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input label={t('worker_detail.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div className="flex gap-3">
              <Button type="submit" loading={isSaving}>{t('common.save')}</Button>
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>{t('common.cancel')}</Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('worker_detail.full_name')}</dt>
              <dd className="mt-1 text-sm text-text">{worker.full_name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('worker_detail.phone')}</dt>
              <dd className="mt-1 text-sm text-text">{worker.phone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('worker_detail.registered_at')}</dt>
              <dd className="mt-1 text-sm text-text">{formatDate(worker.created_at)}</dd>
            </div>
          </dl>
        )}
      </section>

      {/* Hujjatlar */}
      <section className="mb-4 rounded-xl border border-border bg-surface p-4 sm:mb-6 sm:p-6">
        <h2 className="mb-4 font-bold text-text">Hujjatlar</h2>
        <div className="grid gap-4 sm:grid-cols-3">

          {[
            { field: 'id_card_front', label: 'ID Karta — Old tomoni', accept: 'image/*', isImage: true },
            { field: 'id_card_back',  label: 'ID Karta — Orqa tomoni', accept: 'image/*', isImage: true },
            { field: 'agreement_video', label: 'Kelishilgan Video', accept: 'video/*', isImage: false },
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
                    <a
                      href={worker[field]}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 rounded-lg border border-border py-1.5 text-center text-xs font-semibold text-gold hover:bg-gold/5"
                    >
                      Ko'rish
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDocDelete(field)}
                      className="flex-1 rounded-lg border border-red-500/30 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/5"
                    >
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

      {media.length > 0 && (
        <section className="mb-4 rounded-xl border border-border bg-surface p-4 sm:mb-6 sm:p-6">
          <h2 className="mb-4 font-bold text-text">{t('worker_detail.media')}</h2>
          <MediaPreview items={media} />
        </section>
      )}

      {/* Payments - mobile card list */}
      <section className="mb-4 rounded-xl border border-border bg-surface p-4 sm:mb-6 sm:p-6">
        <h2 className="mb-4 font-bold text-text">{t('worker_detail.payments')}</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-text-muted">{t('worker_detail.no_payments')}</p>
        ) : (
          <div className="space-y-2">
            {payments.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-muted">{formatDate(row.created_at)}</p>
                  <p className="text-sm font-semibold text-text">
                    {Number(row.amount).toLocaleString('uz-UZ')} {t('common.sum')}
                  </p>
                  <p className="text-xs text-text-muted">{row.is_fine ? t('worker_detail.fine') : t('worker_detail.payment')}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {row.receipts?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setReceiptModal({ receipts: row.receipts, amount: row.amount })}
                      className="rounded-lg border border-gold/40 px-2.5 py-1 text-xs font-semibold text-gold transition hover:bg-gold/10"
                    >
                      Chek ({row.receipts.length})
                    </button>
                  )}
                  <span className={['rounded-full px-2 py-0.5 text-xs font-bold',
                    row.paid_at ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'].join(' ')}>
                    {row.paid_at ? '✓' : '…'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="mb-4 font-bold text-text">{t('worker_detail.location')}</h2>
        <Link to="/admin/map" className="flex items-center gap-2 text-sm font-medium text-gold hover:text-gold-light">
          <MapPinIcon className="h-4 w-4" />
          {t('worker_detail.view_map')}
        </Link>
      </section>

      {/* Chek modal */}
      {receiptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setReceiptModal(null)}
        >
          <div
            ref={modalRef}
            className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-text">To'lov cheklari</h3>
                <p className="text-xs text-text-muted">
                  {Number(receiptModal.amount).toLocaleString('uz-UZ')} {t('common.sum')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-hover hover:text-text"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
              {receiptModal.receipts.map((r, i) => (
                <div key={r.id} className="rounded-xl border border-border bg-bg p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-text-muted">Chek #{i + 1}</span>
                    <span className={[
                      'rounded-full px-2 py-0.5 text-xs font-bold',
                      r.status === 'approved' ? 'bg-emerald-400/10 text-emerald-400'
                        : r.status === 'rejected' ? 'bg-red-400/10 text-red-400'
                        : 'bg-amber-400/10 text-amber-400',
                    ].join(' ')}>
                      {r.status === 'approved' ? 'Tasdiqlangan' : r.status === 'rejected' ? 'Rad etilgan' : 'Kutilmoqda'}
                    </span>
                  </div>
                  <a href={r.receipt_image} target="_blank" rel="noreferrer">
                    <img
                      src={r.receipt_image}
                      alt={`Chek ${i + 1}`}
                      className="w-full cursor-zoom-in rounded-lg object-contain"
                      style={{ maxHeight: 320 }}
                    />
                  </a>
                  <p className="mt-2 text-right text-xs text-text-muted">{formatDate(r.uploaded_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
