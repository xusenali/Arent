import { useCallback, useEffect, useState } from 'react'
import { CheckIcon, XIcon } from '../../components/ui/icons.jsx'
import Button from '../../components/ui/Button.jsx'
import {
  approvePaymentReceipt,
  fetchPaymentReceipts,
  fetchUpcomingPayments,
  recordCashPayment,
  rejectPaymentReceipt,
} from '../../api/adminApi.js'

// ─── helpers ──────────────────────────────────────────────────────────────────

const UNIT_ICON  = { scooter: '🛴', bike: '🚲' }
const PAY_LABEL  = { start: 'Boshida', end: 'Oxirida' }
const STATUS_TABS = [
  { value: 'pending',  label: 'Kutilmoqda',  dot: 'bg-amber-400'   },
  { value: 'approved', label: 'Tasdiqlangan', dot: 'bg-emerald-400' },
  { value: 'rejected', label: 'Rad etilgan',  dot: 'bg-red-400'     },
]

function fmt(n)    { return Number(n).toLocaleString('uz-UZ') + " so'm" }
function fmtDate(s){ return new Date(s).toLocaleString('uz-UZ') }

// ─── lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ src, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <img
        src={src}
        alt="Chek"
        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <XIcon className="h-5 w-5" />
      </button>
    </div>
  )
}

// ─── shared amount input ──────────────────────────────────────────────────────

function AmountInput({ value, onChange, label = "Qabul qilingan summa (so'm)" }) {
  function handleChange(e) {
    // faqat raqam
    const raw = e.target.value.replace(/\D/g, '')
    onChange(raw)
  }
  const display = value ? Number(value).toLocaleString('uz-UZ') : ''
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-text">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          placeholder="350 000"
          className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 pr-14 text-right text-base font-bold text-text placeholder:font-normal placeholder:text-text-muted focus:border-gold focus:outline-none"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">so'm</span>
      </div>
    </div>
  )
}

// ─── cash modal ───────────────────────────────────────────────────────────────

function CashModal({ rental, onClose, onDone }) {
  const defaultAmount = rental.pending_amount ? String(Math.round(Number(rental.pending_amount))) : ''
  const [amount,  setAmount]  = useState(defaultAmount)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function confirm() {
    if (!amount || Number(amount) <= 0) {
      setError("Summani kiriting")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await recordCashPayment(rental.rental_id, Number(amount))
      onDone(rental.rental_id)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <h2 className="mb-4 text-base font-black text-text">💵 Naqd to'lovni qabul qilish</h2>

        <dl className="mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-muted">Ishchi</dt>
            <dd className="font-semibold text-text">{rental.worker_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Telefon</dt>
            <dd className="text-text">{rental.worker_phone}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Transport</dt>
            <dd className="text-text">
              {UNIT_ICON[rental.unit_type] ?? '🚗'} {rental.unit_name}
            </dd>
          </div>
        </dl>

        <div className="mb-4">
          <AmountInput value={amount} onChange={setAmount} />
        </div>

        <div className="mb-4 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2 text-xs text-text-muted">
          Naqd pul qabul qilindi deb belgilanadi. Chek rasmi talab qilinmaydi.
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

// ─── receipt approve modal ────────────────────────────────────────────────────

function ApproveReceiptModal({ receipt, onClose, onDone }) {
  const defaultAmount = receipt.amount ? String(Math.round(receipt.amount)) : ''
  const [amount,  setAmount]  = useState(defaultAmount)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function confirm() {
    if (!amount || Number(amount) <= 0) { setError("Summani kiriting"); return }
    setLoading(true)
    setError(null)
    try {
      await approvePaymentReceipt(receipt.id, Number(amount))
      onDone(receipt.id)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <h2 className="mb-4 text-base font-black text-text">✅ Chekni tasdiqlash</h2>

        <dl className="mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-muted">Ishchi</dt>
            <dd className="font-semibold text-text">{receipt.worker_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Transport</dt>
            <dd className="text-text">
              {UNIT_ICON[receipt.unit_type] ?? '🚗'} {receipt.unit_name}
            </dd>
          </div>
        </dl>

        <div className="mb-4">
          <AmountInput value={amount} onChange={setAmount} label="Tasdiqlangan summa (so'm)" />
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

// ─── upcoming payments section ────────────────────────────────────────────────

function urgencyClass(daysLeft) {
  if (daysLeft < 0)  return 'border-red-500/40   bg-red-500/5   text-red-400'
  if (daysLeft === 0) return 'border-red-400/40  bg-red-400/5   text-red-400'
  if (daysLeft <= 2) return 'border-amber-400/40 bg-amber-400/5 text-amber-400'
  return               'border-border            bg-surface      text-text-muted'
}

function daysLabel(d) {
  if (d < 0)  return `${Math.abs(d)} kun kech`
  if (d === 0) return 'Bugun!'
  if (d === 1) return 'Ertaga'
  return `${d} kun qoldi`
}

function UpcomingSection({ onCashClick }) {
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    fetchUpcomingPayments()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function removeItem(rentalId) {
    setItems((prev) => prev.filter((r) => r.rental_id !== rentalId))
  }

  if (loading) return null
  if (items.length === 0) return null

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-black text-text">⏰ Yaqin to'lovlar</h2>
        <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-400">
          {items.length} ta
        </span>
      </div>

      <div className="space-y-2">
        {items.map((r) => {
          const cls = urgencyClass(r.days_left)
          return (
            <div
              key={r.rental_id}
              className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${cls}`}
            >
              {/* worker info */}
              <div className="flex-1 min-w-0">
                <p className="truncate font-bold text-text">{r.worker_name}</p>
                <p className="text-xs opacity-70">{r.worker_phone}</p>
              </div>

              {/* unit */}
              <div className="hidden text-sm sm:block">
                {UNIT_ICON[r.unit_type] ?? '🚗'} {r.unit_name}
              </div>

              {/* due date badge */}
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>
                {daysLabel(r.days_left)}
              </span>

              {/* amount */}
              {r.pending_amount && (
                <span className="font-black text-gold">{fmt(r.pending_amount)}</span>
              )}

              {/* action */}
              <Button
                className="shrink-0 !py-1.5 !text-xs"
                onClick={() => onCashClick(r, removeItem)}
              >
                💵 Nax oldim
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── receipt card ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = {
    pending:  { cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20',       label: 'Kutilmoqda'  },
    approved: { cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', label: 'Tasdiqlangan' },
    rejected: { cls: 'bg-red-400/10 text-red-400 border-red-400/20',             label: 'Rad etilgan' },
  }[status] ?? { cls: 'border-border text-text-muted', label: status }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function ReceiptCard({ receipt, onApproveClick, onReject, onImageClick, processing }) {
  const isPending = receipt.status === 'pending'

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => onImageClick(receipt.receipt_image)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-bg"
        title="Kattalashtirish"
      >
        <img
          src={receipt.receipt_image}
          alt="Chek"
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
          <div className="rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            Kattalashtirish
          </div>
        </div>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-bold text-text">{receipt.worker_name}</p>
            <p className="text-xs text-text-muted">{receipt.worker_phone}</p>
          </div>
          <StatusBadge status={receipt.status} />
        </div>

        <dl className="mb-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-muted">Transport</dt>
            <dd className="font-medium text-text">
              {UNIT_ICON[receipt.unit_type] ?? '🚗'} {receipt.unit_name ?? '—'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Davr</dt>
            <dd className="font-medium text-text">{receipt.period_days} kun</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">To'lov vaqti</dt>
            <dd className="font-medium text-text">{PAY_LABEL[receipt.pay_timing] ?? receipt.pay_timing}</dd>
          </div>
          {receipt.is_fine && (
            <div className="flex justify-between">
              <dt className="text-text-muted">Tur</dt>
              <dd className="font-medium text-red-400">Jarima</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-1.5">
            <dt className="font-semibold text-text-muted">Summa</dt>
            <dd className="font-black text-gold">{fmt(receipt.amount)}</dd>
          </div>
        </dl>

        <p className="mb-3 text-xs text-text-muted">{fmtDate(receipt.uploaded_at)}</p>

        {receipt.reviewed_by_name && (
          <p className="mb-3 rounded-lg bg-bg px-3 py-2 text-xs text-text-muted">
            {receipt.status === 'approved' ? '✅' : '❌'} {receipt.reviewed_by_name} —{' '}
            {fmtDate(receipt.reviewed_at)}
          </p>
        )}

        {isPending && (
          <div className="mt-auto flex gap-2">
            <Button
              variant="outline"
              className="flex-1 !border-red-500/40 !text-red-400 hover:!bg-red-500 hover:!text-white"
              loading={processing}
              onClick={() => onReject(receipt.id)}
            >
              <XIcon className="h-4 w-4" />
              Rad
            </Button>
            <Button className="flex-1" loading={processing} onClick={() => onApproveClick(receipt)}>
              <CheckIcon className="h-4 w-4" />
              Tasdiqlash
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

function mapReceipt(item) {
  return {
    id:               item.id,
    status:           item.status,
    receipt_image:    item.receipt_image,
    worker_name:      item.worker_name,
    worker_phone:     item.worker_phone,
    unit_name:        item.unit_name,
    unit_type:        item.unit_type,
    period_days:      item.period_days,
    pay_timing:       item.pay_timing,
    is_fine:          item.is_fine,
    amount:           Number(item.amount),
    uploaded_at:      item.uploaded_at,
    reviewed_by_name: item.reviewed_by_name ?? null,
    reviewed_at:      item.reviewed_at ?? null,
  }
}

export default function PaymentReceiptsPage() {
  const [tab,          setTab]          = useState('pending')
  const [receipts,     setReceipts]     = useState([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [error,        setError]        = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [lightbox,     setLightbox]     = useState(null)

  // naqd to'lov modal
  const [cashModal,    setCashModal]    = useState(null)
  // chek tasdiqlash modal
  const [approveModal, setApproveModal] = useState(null)

  const load = useCallback((s) => {
    setIsLoading(true)
    setError(null)
    fetchPaymentReceipts(s)
      .then((data) => setReceipts(data.map(mapReceipt)))
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  async function handleReject(id) {
    setProcessingId(id)
    try {
      await rejectPaymentReceipt(id)
      setReceipts((prev) => prev.filter((r) => r.id !== id))
    } catch (e) {
      setError(e.message)
    } finally {
      setProcessingId(null)
    }
  }

  function onApproveConfirmed(id) {
    setApproveModal(null)
    setReceipts((prev) => prev.filter((r) => r.id !== id))
  }

  function openCashModal(rental, removeFromUpcoming) {
    setCashModal({ rental, removeFromUpcoming })
  }

  function onCashDone(rentalId) {
    cashModal?.removeFromUpcoming?.(rentalId)
    setCashModal(null)
  }

  const pendingCount = receipts.filter((r) => r.status === 'pending').length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-black text-text sm:text-2xl">To'lovlar</h1>
        <p className="text-xs text-text-muted">Chek rasmlari va yaqin to'lovlar</p>
      </div>

      {/* upcoming payments */}
      <UpcomingSection onCashClick={openCashModal} />

      {/* receipt tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="flex items-center self-center pr-2 text-sm font-semibold text-text-muted">
          Chek rasmlari:
        </span>
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={[
              'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all',
              tab === t.value
                ? 'border-gold bg-gold text-black'
                : 'border-border bg-surface text-text-muted hover:border-gold/40 hover:text-text',
            ].join(' ')}
          >
            <span className={`h-2 w-2 rounded-full ${t.dot}`} />
            {t.label}
            {t.value === 'pending' && pendingCount > 0 && !isLoading && (
              <span className="ml-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-black">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-text-muted">Yuklanmoqda...</p>
      ) : receipts.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-16 text-center text-sm text-text-muted">
          Chek yo'q
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {receipts.map((receipt) => (
            <ReceiptCard
              key={receipt.id}
              receipt={receipt}
              processing={processingId === receipt.id}
              onApproveClick={(r) => setApproveModal(r)}
              onReject={handleReject}
              onImageClick={setLightbox}
            />
          ))}
        </div>
      )}

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      {cashModal && (
        <CashModal
          rental={cashModal.rental}
          onClose={() => setCashModal(null)}
          onDone={onCashDone}
        />
      )}

      {approveModal && (
        <ApproveReceiptModal
          receipt={approveModal}
          onClose={() => setApproveModal(null)}
          onDone={onApproveConfirmed}
        />
      )}
    </div>
  )
}
