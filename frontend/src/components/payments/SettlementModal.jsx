import { useEffect, useState } from 'react'
import Button from '../ui/Button.jsx'
import { fetchRentalSettlement, settleAndCloseRental } from '../../api/adminApi.js'

const fmtSum = (n) => `${Math.round(Number(n || 0)).toLocaleString('uz-UZ')} so'm`

function Row({ label, value, hint, tone = 'default' }) {
  const toneCls = {
    default: 'text-text',
    plus:    'text-emerald-400',
    minus:   'text-red-400',
  }[tone]

  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-sm text-text-muted">{label}</p>
        {hint && <p className="text-[11px] text-text-muted/60">{hint}</p>}
      </div>
      <p className={`shrink-0 text-sm font-bold ${toneCls}`}>{value}</p>
    </div>
  )
}

/**
 * Ijarani erta yakunlash: hisob-kitobni ko'rsatib, tasdiqlangach yozadi.
 *
 * Oldindan to'lagan ishchiga foydalanilmagan kunlar uchun pul qaytariladi;
 * oxirida to'laydigan ishchidan faqat ishlagan kuni uchun haq olinadi.
 */
export default function SettlementModal({ workerId, workerName, onClose, onDone }) {
  const [data,  setData]  = useState(null)
  const [error, setError] = useState(null)
  const [busy,  setBusy]  = useState(false)

  useEffect(() => {
    fetchRentalSettlement(workerId).then(setData).catch((err) => setError(err.message))
  }, [workerId])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      onDone(await settleAndCloseRental(workerId))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const refund  = Number(data?.refund_to_worker  ?? 0)
  const payable = Number(data?.payable_by_worker ?? 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-border bg-surface p-5 sm:my-auto sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-base font-black text-text">Hisob-kitob va yakunlash</h3>
        <p className="mb-4 text-sm text-text-muted">
          {workerName} bilan yakuniy hisob. Tasdiqlangach transport bo'shaydi
          va ishchi arxivga tushadi.
        </p>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {!data && !error && <p className="py-6 text-center text-sm text-text-muted">Hisoblanmoqda...</p>}

        {data && (
          <>
            <div className="mb-4 rounded-xl border border-border bg-bg px-4 py-3">
              <Row
                label="Kunlik narx"
                value={fmtSum(data.daily_rate)}
                hint={`${data.unit_model} · ${data.pay_timing === 'start' ? 'Oldindan to\'langan' : 'Oxirida to\'lanadi'}`}
              />

              {data.unused_days > 0 && (
                <Row
                  label="Foydalanilmagan kunlar"
                  hint={`${data.unused_days} kun × kunlik narx`}
                  value={`+ ${fmtSum(data.refund)}`}
                  tone="plus"
                />
              )}

              {Number(data.charge_due) > 0 && (
                <Row
                  label="Ishlatilgan kunlar haqi"
                  hint={`${data.days_used} kun × kunlik narx`}
                  value={`− ${fmtSum(data.charge_due)}`}
                  tone="minus"
                />
              )}

              {Number(data.fine_due) > 0 && (
                <Row
                  label="Ochiq jarimalar"
                  value={`− ${fmtSum(data.fine_due)}`}
                  tone="minus"
                />
              )}
            </div>

            {/* yakuniy natija */}
            {refund > 0 && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                  Ishchiga qaytariladi
                </p>
                <p className="text-2xl font-black text-emerald-400">{fmtSum(refund)}</p>
              </div>
            )}

            {payable > 0 && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-red-400">
                  Ishchi to'lashi kerak
                </p>
                <p className="text-2xl font-black text-red-400">{fmtSum(payable)}</p>
              </div>
            )}

            {refund === 0 && payable === 0 && (
              <div className="mb-4 rounded-xl border border-border bg-bg px-4 py-3 text-center">
                <p className="text-sm font-bold text-text">Hisob teng — qarz yo'q</p>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose} disabled={busy}>
            Bekor qilish
          </Button>
          <Button fullWidth onClick={confirm} loading={busy} disabled={!data}>
            Yakunlash
          </Button>
        </div>
      </div>
    </div>
  )
}
