import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import MediaPreview from '../../components/ui/MediaPreview.jsx'
import { ChevronLeftIcon, MapPinIcon } from '../../components/ui/icons.jsx'
import WorkerPayments from '../../components/payments/WorkerPayments.jsx'
import {
  fetchWorkerDetail,
  fetchWorkerRental,
  fetchWorkerRentalMedia,
  updateWorker,
  uploadWorkerDocument,
  deleteWorkerDocument,
  adminEndRental,
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

const PERIOD_LABEL = { 1: 'Kunlik (1 kun)', 7: 'Haftalik (7 kun)', 30: 'Oylik (30 kun)' }
const periodLabel = (days) => PERIOD_LABEL[days] ?? `${days} kun`

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

// ─── page ─────────────────────────────────────────────────────────────────────

export default function WorkerDetailPage() {
  const { t }  = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()

  const [worker,       setWorker]       = useState(undefined)
  const [rental,       setRental]       = useState(undefined)
  const [media,        setMedia]        = useState([])
  const [error,        setError]        = useState(null)
  const [isEditing,    setIsEditing]    = useState(false)
  const [fullName,     setFullName]     = useState('')
  const [phone,        setPhone]        = useState('')
  const [isSaving,     setIsSaving]     = useState(false)
  const [docUploading, setDocUploading] = useState({
    id_card_front: false, id_card_back: false, agreement_video: false,
  })
  const [docError,     setDocError]     = useState(null)
  const [showEndModal, setShowEndModal]  = useState(false)
  const [isEnding,     setIsEnding]      = useState(false)
  const [endError,     setEndError]      = useState(null)

  // To'lov tasdiqlangandan keyin ijara muddati o'zgaradi — qayta o'qiymiz.
  const reloadRental = useCallback(
    () => fetchWorkerRental(id).then(setRental).catch(() => {}),
    [id],
  )

  useEffect(() => {
    Promise.all([
      fetchWorkerDetail(id),
      fetchWorkerRental(id),
      fetchWorkerRentalMedia(id),
    ])
      .then(([workerData, rentalData, mediaData]) => {
        setWorker(workerData)
        setFullName(workerData.full_name)
        setPhone(workerData.phone)
        setRental(rentalData)
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
    setDocError(null)
    setDocUploading((p) => ({ ...p, [type]: true }))
    try {
      const fd = new FormData()
      fd.append(type, file)
      setWorker(await uploadWorkerDocument(id, fd))
    } catch (err) {
      setDocError(err.message)
    } finally {
      setDocUploading((p) => ({ ...p, [type]: false }))
    }
  }

  async function handleDocDelete(type) {
    try { setWorker(await deleteWorkerDocument(id, type)) }
    catch (err) { setError(err.message) }
  }

  async function handleEndRental() {
    setIsEnding(true)
    setEndError(null)
    try {
      await adminEndRental(id)
      setShowEndModal(false)
      setRental(null)
    } catch (err) {
      setEndError(err.message)
    } finally {
      setIsEnding(false)
    }
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-bold text-text">Transport va Ijara</h2>
          {rental && rental.status !== 'completed' && (
            <button
              type="button"
              onClick={() => setShowEndModal(true)}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:border-red-500/60 hover:bg-red-500/20"
            >
              Ijarani yakunlash
            </button>
          )}
        </div>
        {endError && <p className="mb-3 text-sm text-red-400">{endError}</p>}
        <RentalCard rental={rental ?? null} />
      </section>

      {/* Hujjatlar */}
      <section className="mb-4 rounded-xl border border-border bg-surface p-4 sm:mb-6 sm:p-6">
        <h2 className="mb-4 font-bold text-text">Hujjatlar</h2>
        {docError && <p className="mb-3 text-sm text-red-400">{docError}</p>}
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

      {/* To'lovlar — cheklarni tasdiqlash va naqd to'lov shu yerda */}
      <WorkerPayments workerId={id} rental={rental} onRentalChange={reloadRental} />

      {/* Joylashuv */}
      <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="mb-4 font-bold text-text">{t('worker_detail.location')}</h2>
        <Link to="/admin/map" className="flex items-center gap-2 text-sm font-medium text-gold hover:text-gold-light">
          <MapPinIcon className="h-4 w-4" />
          {t('worker_detail.view_map')}
        </Link>
      </section>

      {/* Ijarani yakunlash modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setShowEndModal(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-base font-black text-text">Ijarani yakunlash</h3>
            <p className="mb-5 text-sm text-text-muted">
              Transport ijarasi yakunlanadi va transport bo'sh holatga o'tkaziladi. Davom etasizmi?
            </p>
            {endError && <p className="mb-3 text-sm text-red-400">{endError}</p>}
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => setShowEndModal(false)} disabled={isEnding}>
                Bekor qilish
              </Button>
              <Button variant="primary" fullWidth onClick={handleEndRental} loading={isEnding}>
                Yakunlash
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
