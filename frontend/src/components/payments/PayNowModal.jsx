import { useEffect, useState } from 'react'
import Button from '../ui/Button.jsx'
import FileUploader from '../ui/FileUploader.jsx'
import { XIcon } from '../ui/icons.jsx'
import { formatCardNumber } from './PaymentCardBox.jsx'
import { uploadPaymentReceipt } from '../../api/workerApi.js'

const formatSum = (n) => `${Number(n || 0).toLocaleString('uz-UZ')} so'm`

/** Karta raqamini clipboard'ga nusxalaydi. HTTPS bo'lmasa ham ishlashi uchun zaxira usul bor. */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  }
}

// ─── karta bloki ─────────────────────────────────────────────────────────────

function CardDetails({ card }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(id)
  }, [copied])

  if (!card?.number) {
    return (
      <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
        Karta raqami hali kiritilmagan. Iltimos, admin bilan bog'laning.
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-xl border border-gold/25 bg-gold/5 p-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gold">
        Shu kartaga o'tkazing
      </p>

      <div className="flex items-center gap-2">
        <p className="flex-1 text-lg font-black tracking-wider text-text">
          {formatCardNumber(card.number)}
        </p>
        <button
          type="button"
          onClick={async () => setCopied(await copyText(card.number))}
          className="shrink-0 rounded-lg border border-gold/30 px-2.5 py-1.5 text-[11px] font-bold text-gold transition hover:bg-gold/10 active:scale-95"
        >
          {copied ? 'Nusxalandi ✓' : 'Nusxalash'}
        </button>
      </div>

      {(card.holder || card.bank) && (
        <p className="mt-1 text-xs text-text-muted">
          {[card.holder, card.bank].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  )
}

// ─── modal ───────────────────────────────────────────────────────────────────

/**
 * Ishchining to'lov modali: karta raqami + chek suratini yuborish.
 *
 * @param {object}   props.rental   dashboard javobi (qarz va karta shu yerda)
 * @param {Function} props.onSent   chek yuborilgach chaqiriladi
 */
export default function PayNowModal({ rental, onSent, onClose }) {
  const [file, setFile]   = useState(null)
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  async function send() {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      await uploadPaymentReceipt({ file })
      onSent()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const total = Number(rental.total_due ?? rental.pending_payment_amount ?? 0)
  const fine  = Number(rental.current_fine ?? 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-border bg-surface p-5 sm:my-auto sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-text">To'lov qilish</h3>
            <p className="mt-0.5 text-xs text-text-muted">
              Pulni kartaga o'tkazing va chek suratini yuboring.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted transition hover:bg-surface-hover hover:text-text disabled:opacity-40"
            aria-label="Yopish"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* to'lanadigan summa */}
        <div className="mb-4 rounded-xl border border-border bg-bg px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
            To'lanadigan summa
          </p>
          <p className="text-xl font-black text-gold">{formatSum(total)}</p>
          {fine > 0 && (
            <p className="mt-0.5 text-[11px] text-red-400">
              shundan jarima: {formatSum(fine)}
            </p>
          )}
        </div>

        <CardDetails card={rental.payment_card} />

        {/* chek yuklash */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Chek yoki skrinshot
        </p>
        <div className="mb-4">
          <FileUploader
            accept="image/*"
            maxSizeMb={5}
            hint="JPG, PNG — 5MB gacha"
            file={file}
            onChange={setFile}
          />
        </div>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <Button onClick={send} loading={busy} disabled={!file} fullWidth>
          Chekni yuborish
        </Button>

        <p className="mt-3 text-center text-[11px] text-text-muted">
          Admin chekni tekshirib tasdiqlaydi, so'ng ijara muddati uzayadi.
        </p>
      </div>
    </div>
  )
}
