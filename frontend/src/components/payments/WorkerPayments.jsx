import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '../ui/Button.jsx'
import { XIcon } from '../ui/icons.jsx'
import {
  approvePaymentReceipt,
  fetchWorkerPayments,
  recordCashPayment,
  recordPaymentCorrection,
  rejectPaymentReceipt,
} from '../../api/adminApi.js'
import { formatDate } from '../../utils/date.js'

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtSum = (n) => (n == null ? '—' : `${Number(n).toLocaleString('uz-UZ')} so'm`)

const METHOD_LABEL = { cash: 'Naqd', receipt: 'Chek' }

/**
 * To'lov tasdiqlangandan keyingi muddat — backend'dagi _due_date_after bilan bir xil.
 *
 * Ochiq qarz yopilayotgan bo'lsa, u qarz allaqachon `due_date` gacha bo'lgan
 * davrga tegishli, shuning uchun muddat davr boshidan qayta o'lchanadi.
 * Aks holda (oldindan to'lov) kun mavjud muddat ustiga qo'shiladi.
 */
function nextDueDate({ dueDate, periodDays, days, closesOpenCharge, mode }) {
  if (!dueDate || !days) return null
  const n = Number(days)
  // Chek tasdiqlash mavjud hisob-fakturani yopadi — muddat davr boshidan
  // qayta o'lchanadi. "Naqd oldim" va minus esa muddatni to'g'ridan-to'g'ri
  // uzaytiradi yoki qisqartiradi.
  const offset =
    mode === 'subtract' ? -n
    : mode === 'cash'   ? n
    : closesOpenCharge  ? n - Number(periodDays || 0)
    : n
  const d = new Date(`${dueDate}T00:00:00`)
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Raqamni "200 000" ko'rinishida ko'rsatadi, faqat raqamlarni qoldiradi. */
const digitsOnly = (v) => v.replace(/\D/g, '')
const groupDigits = (v) => (v ? Number(v).toLocaleString('uz-UZ') : '')

// ─── rasm lightbox ────────────────────────────────────────────────────────────

function ImageLightbox({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
        aria-label="Yopish"
      >
        <XIcon className="h-5 w-5" />
      </button>
      <img src={src} alt="Chek" className="max-h-full max-w-full rounded-xl object-contain" />
    </div>
  )
}

// ─── to'lovni tasdiqlash modali (naqd va chek uchun umumiy) ──────────────────

/**
 * Admin summani va necha kunga amal qilishini qo'lda kiritadi.
 *
 * @param {object}   props.receipt   chek (bo'lsa rasm ko'rsatiladi), aks holda naqd
 * @param {object}   props.rental    ijara — muddat hisobini ko'rsatish uchun
 * @param {number}   props.suggest   taklif qilinadigan summa (ochiq qarz)
 */
function ConfirmPaymentModal({ receipt, rental, suggest, closesOpenCharge, mode, onConfirm, onClose }) {
  const isReceipt = Boolean(receipt)
  const subtract  = mode === 'subtract'
  // Chekda summa majburiy (chekdagi pul tasdiqlanadi); naqd va minusda esa
  // asosiysi kun — summa ixtiyoriy.
  const amountRequired = isReceipt
  const [amount, setAmount] = useState(suggest ? String(suggest) : '')
  const [days,   setDays]   = useState(rental?.period_days ? String(rental.period_days) : '')
  const [note,   setNote]   = useState('')
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState(null)
  const [zoom,   setZoom]   = useState(false)

  const newDueDate = nextDueDate({
    dueDate: rental?.due_date,
    periodDays: rental?.period_days,
    days,
    closesOpenCharge,
    mode,
  })

  async function submit() {
    const amt = Number(digitsOnly(amount))
    const d   = Number(days)
    if (amountRequired && (!amt || amt <= 0)) return setError('Olingan summani kiriting.')
    if (!d || d <= 0 || d > 365) return setError("Kunlar soni 1 va 365 orasida bo'lishi kerak.")

    setBusy(true)
    setError(null)
    try {
      await onConfirm({ amount: amt, days: d, note })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" onClick={onClose}>
        <div
          className="my-auto w-full max-w-sm rounded-2xl border border-border bg-surface p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="mb-1 text-base font-black text-text">
            {subtract ? 'Tuzatish — ayirish' : isReceipt ? 'Chekni tasdiqlash' : "Naqd to'lov"}
          </h3>
          <p className="mb-4 text-sm text-text-muted">
            {subtract
              ? "Necha kun ayirilishini kiriting. Summa ixtiyoriy."
              : isReceipt
                ? 'Olingan summani va necha kunga amal qilishini kiriting.'
                : "Necha kun qo'shilishini kiriting. Summa ixtiyoriy."}
          </p>

          {isReceipt && receipt.receipt_image && (
            <button
              type="button"
              onClick={() => setZoom(true)}
              className="mb-4 block w-full overflow-hidden rounded-xl border border-border bg-bg"
            >
              <img
                src={receipt.receipt_image}
                alt="Chek"
                className="max-h-52 w-full object-contain"
              />
              <span className="block border-t border-border py-1.5 text-[11px] font-semibold text-text-muted">
                Kattalashtirish uchun bosing
              </span>
            </button>
          )}

          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            {subtract ? 'Ayiriladigan summa' : 'Olingan summa'}
            {!amountRequired && (
              <span className="ml-1 font-normal normal-case text-text-muted/60">(ixtiyoriy)</span>
            )}
          </label>
          <div className="relative mb-4">
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="200 000"
              value={groupDigits(digitsOnly(amount))}
              onChange={(e) => setAmount(digitsOnly(e.target.value))}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 pr-14 text-sm font-bold text-text placeholder:font-normal placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text-muted">
              so'm
            </span>
          </div>

          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            {subtract ? 'Necha kun ayiriladi?' : "Necha kun qo'shiladi?"}
          </label>
          <div className="relative mb-2">
            <input
              type="number"
              min="1"
              max="365"
              placeholder="7"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 pr-12 text-sm font-bold text-text placeholder:font-normal placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text-muted">
              kun
            </span>
          </div>

          {newDueDate && (
            <p className={[
              'mb-4 rounded-lg border px-3 py-2 text-xs text-text-muted',
              subtract ? 'border-red-500/25 bg-red-500/5' : 'border-gold/20 bg-gold/5',
            ].join(' ')}>
              {subtract ? (
                <>
                  Muddatdan <span className="font-bold text-red-400">{days} kun</span> ayiriladi.
                  Yangi sana:{' '}
                  <span className="font-bold text-text">{newDueDate}</span>.
                </>
              ) : isReceipt ? (
                <>
                  To'lov <span className="font-bold text-gold">{days} kunni</span> qoplaydi.
                  Keyingi to'lov sanasi:{' '}
                  <span className="font-bold text-text">{newDueDate}</span>.
                  Ochiq jarimalar yopiladi.
                </>
              ) : (
                <>
                  Muddatga <span className="font-bold text-gold">{days} kun</span> qo'shiladi.
                  Yangi sana:{' '}
                  <span className="font-bold text-text">{newDueDate}</span>.
                </>
              )}
            </p>
          )}

          <input
            type="text"
            placeholder="Izoh (ixtiyoriy)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={255}
            className="mb-4 w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
          />

          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={onClose} disabled={busy}>
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={submit}
              loading={busy}
              className={subtract ? '!bg-red-500 !text-white hover:!opacity-90' : undefined}
            >
              {subtract ? 'Ayirish' : isReceipt ? 'Tasdiqlash' : "Qo'shish"}
            </Button>
          </div>
        </div>
      </div>

      {zoom && <ImageLightbox src={receipt.receipt_image} onClose={() => setZoom(false)} />}
    </>
  )
}

// ─── chekni rad etish modali ─────────────────────────────────────────────────

function RejectModal({ onReject, onClose }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await onReject(reason)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 text-base font-black text-text">Chekni rad etish</h3>
        <p className="mb-4 text-sm text-text-muted">
          Sabab ishchiga ko'rinadi va u yangi chek yuklay oladi.
        </p>
        <input
          type="text"
          autoFocus
          placeholder="Masalan: summa mos kelmadi"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          maxLength={255}
          className="mb-4 w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
        />
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose} disabled={busy}>
            Bekor qilish
          </Button>
          <Button
            fullWidth
            onClick={submit}
            loading={busy}
            className="!border-red-500/40 !bg-red-500/10 !text-red-400 hover:!bg-red-500 hover:!text-white"
          >
            Rad etish
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── bitta to'lov qatori ─────────────────────────────────────────────────────

function PaymentRow({ row, onApprove, onReject, onZoom }) {
  const paid    = row.paid_at != null
  const settled = row.settled_by != null
  // Manfiy summa — tuzatish yoki erta yakunlashda qaytarilgan pul.
  const negative = Number(row.paid_amount ?? row.amount) < 0
  const days = Number(row.covered_days ?? 0)
  const pendingReceipt = row.receipts?.find((r) => r.status === 'pending')
  const lastRejected   = !paid && !pendingReceipt
    ? row.receipts?.find((r) => r.status === 'rejected')
    : null

  return (
    <div className="border-b border-border px-4 py-3.5 last:border-b-0 sm:px-5">
      <div className="flex items-start gap-3">
        {pendingReceipt?.receipt_image && (
          <button
            type="button"
            onClick={() => onZoom(pendingReceipt.receipt_image)}
            className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-bg"
          >
            <img src={pendingReceipt.receipt_image} alt="Chek" className="h-full w-full object-cover" />
          </button>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={`text-sm font-bold ${negative ? 'text-red-400' : 'text-text'}`}>
              {fmtSum(paid ? row.paid_amount : row.amount)}
            </p>

            <span className={[
              'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide',
              negative   ? 'bg-red-500/15 text-red-400'
              : row.is_fine ? 'bg-red-400/10 text-red-400'
              : 'bg-gold/10 text-gold',
            ].join(' ')}>
              {negative ? 'Ayirildi' : row.is_fine ? 'Jarima' : "To'lov"}
            </span>

            {!negative && (paid ? (
              <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                {settled ? 'Yopilgan' : "To'langan"}
              </span>
            ) : (
              <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                {pendingReceipt ? 'Chek keldi' : 'Kutilmoqda'}
              </span>
            ))}

            {row.method && paid && !settled && !negative && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-text-muted">
                {METHOD_LABEL[row.method] ?? row.method}
              </span>
            )}

            {days !== 0 && (
              <span className={[
                'rounded-full px-2 py-0.5 text-[10px] font-black',
                days > 0 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-500/15 text-red-400',
              ].join(' ')}>
                {days > 0 ? `+${days}` : `−${Math.abs(days)}`} kun
              </span>
            )}
          </div>

          <p className="text-xs text-text-muted">
            {paid ? `To'langan: ${formatDate(row.paid_at)}` : `Yaratilgan: ${formatDate(row.created_at)}`}
            {row.received_by_name && ` · ${row.received_by_name}`}
          </p>

          {row.note && <p className="text-[11px] italic text-text-muted/70">{row.note}</p>}

          {lastRejected && (
            <p className="text-[11px] text-red-400/80">
              Oxirgi chek rad etilgan{lastRejected.reject_reason ? `: ${lastRejected.reject_reason}` : ''}
            </p>
          )}

          {pendingReceipt && (
            <div className="flex flex-wrap gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => onApprove(pendingReceipt, row)}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20 active:scale-95"
              >
                Tasdiqlash
              </button>
              <button
                type="button"
                onClick={() => onReject(pendingReceipt)}
                className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 active:scale-95"
              >
                Rad etish
              </button>
            </div>
          )}
        </div>

        {/* tasdiqlangan/rad etilgan cheklarni ko'rish */}
        {!pendingReceipt && row.receipts?.length > 0 && (
          <button
            type="button"
            onClick={() => onZoom(row.receipts[0].receipt_image)}
            className="shrink-0 self-center rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-text-muted transition hover:border-gold/40 hover:text-gold"
          >
            Chek
          </button>
        )}
      </div>
    </div>
  )
}

// ─── asosiy bo'lim ───────────────────────────────────────────────────────────

/**
 * Ishchi to'lovlari: tarix, kutilayotgan cheklarni tasdiqlash va naqd to'lov.
 *
 * @param {string}   props.workerId
 * @param {object}   props.rental          faol ijara (yo'q bo'lsa naqd to'lov o'chirilgan)
 * @param {Function} props.onRentalChange  ijara muddati o'zgargach chaqiriladi
 */
export default function WorkerPayments({ workerId, rental, onRentalChange }) {
  const [payments, setPayments] = useState(null)
  const [error,    setError]    = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null) // { receipt?, suggest }
  const [rejectTarget,  setRejectTarget]  = useState(null)
  const [zoomSrc,       setZoomSrc]       = useState(null)

  const load = useCallback(
    () => fetchWorkerPayments(workerId).then(setPayments).catch((err) => setError(err.message)),
    [workerId],
  )

  useEffect(() => { load() }, [load])

  const { openPeriod, openFine, openPeriodPayment } = useMemo(() => {
    const open = (payments ?? []).filter((p) => p.paid_at == null)
    const sum = (rows) => rows.reduce((acc, p) => acc + Number(p.amount), 0)
    return {
      openPeriod: sum(open.filter((p) => !p.is_fine)),
      openFine:   sum(open.filter((p) => p.is_fine)),
      openPeriodPayment: open.filter((p) => !p.is_fine).at(-1) ?? null,
    }
  }, [payments])

  /** To'lov yoki chek tasdiqlangach — jadval ham, ijara ham yangilanadi. */
  async function refresh() {
    await load()
    onRentalChange?.()
    setConfirmTarget(null)
    setRejectTarget(null)
  }

  async function handleConfirm({ amount, days, note }) {
    if (confirmTarget.mode === 'subtract') {
      await recordPaymentCorrection(rental.id, { amount, days, note })
    } else if (confirmTarget.receipt) {
      await approvePaymentReceipt(confirmTarget.receipt.id, { amount, days, note })
    } else {
      await recordCashPayment(rental.id, { amount, days, note })
    }
    await refresh()
  }

  async function handleReject(reason) {
    await rejectPaymentReceipt(rejectTarget.id, reason)
    await refresh()
  }

  if (error)    return <p className="text-sm text-red-400">{error}</p>
  if (!payments) return <p className="text-sm text-text-muted">Yuklanmoqda...</p>

  const totalOpen = openPeriod + openFine
  const canTakeCash = Boolean(rental?.id) && rental.status !== 'completed'

  return (
    <section className="mb-4 rounded-xl border border-border bg-surface sm:mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="mr-auto">
          <h2 className="font-bold text-text">To'lovlar</h2>
          <p className="mt-0.5 text-xs text-text-muted">{payments.length} ta yozuv</p>
        </div>
        {canTakeCash && (
          <button
            type="button"
            onClick={() => setConfirmTarget({ receipt: null, mode: 'cash' })}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20 active:scale-95"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            +
          </button>
        )}
        {canTakeCash && (
          <button
            type="button"
            title="Tuzatish — kun va summani ayirish"
            onClick={() => setConfirmTarget({ receipt: null, mode: 'subtract' })}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 active:scale-95"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
        )}
      </div>

      {totalOpen > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-amber-400/5 px-4 py-3 sm:px-5">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Ochiq qarz</span>
          <span className="text-base font-black text-amber-400">{fmtSum(totalOpen)}</span>
          <span className="text-xs text-text-muted">
            davr {fmtSum(openPeriod)}
            {openFine > 0 && <> · jarima <span className="text-red-400">{fmtSum(openFine)}</span></>}
          </span>
        </div>
      )}

      {payments.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-text-muted sm:px-5">
          Hozircha to'lov yozuvi yo'q
        </p>
      ) : (
        payments.map((row) => (
          <PaymentRow
            key={row.id}
            row={row}
            onZoom={setZoomSrc}
            onReject={setRejectTarget}
            onApprove={(receipt, payment) =>
              setConfirmTarget({
                receipt,
                suggest: Number(payment.amount) + openFine,
                closesOpenCharge: true,
              })
            }
          />
        ))
      )}

      {confirmTarget && (
        <ConfirmPaymentModal
          receipt={confirmTarget.receipt}
          rental={rental}
          mode={confirmTarget.mode}
          closesOpenCharge={confirmTarget.closesOpenCharge}
          suggest={confirmTarget.suggest ?? (openPeriodPayment ? Number(openPeriodPayment.amount) : null)}
          onConfirm={handleConfirm}
          onClose={() => setConfirmTarget(null)}
        />
      )}

      {rejectTarget && (
        <RejectModal onReject={handleReject} onClose={() => setRejectTarget(null)} />
      )}

      {zoomSrc && <ImageLightbox src={zoomSrc} onClose={() => setZoomSrc(null)} />}
    </section>
  )
}
