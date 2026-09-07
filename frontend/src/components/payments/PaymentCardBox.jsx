import { useEffect, useState } from 'react'
import { fetchPaymentCard, savePaymentCard } from '../../api/adminApi.js'

/** "8600123456789012" -> "8600 1234 5678 9012" */
export function formatCardNumber(value = '') {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

/**
 * Admin sidebar'idagi to'lov kartasi bloki.
 *
 * Bu yerda kiritilgan raqam ishchining "To'lov qilish" modalida ko'rinadi —
 * ishchi shu kartaga pul o'tkazib, chekini yuklaydi.
 */
export default function PaymentCardBox() {
  const [card, setCard]       = useState(undefined) // undefined = yuklanmoqda; number bo'sh = kiritilmagan
  const [editing, setEditing] = useState(false)
  const [number, setNumber]   = useState('')
  const [holder, setHolder]   = useState('')
  const [bank,   setBank]     = useState('')
  const [busy,   setBusy]     = useState(false)
  const [error,  setError]    = useState(null)

  useEffect(() => {
    fetchPaymentCard().then(setCard).catch(() => setCard(null))
  }, [])

  function openEditor() {
    setNumber(formatCardNumber(card?.number ?? ''))
    setHolder(card?.holder ?? '')
    setBank(card?.bank ?? '')
    setError(null)
    setEditing(true)
  }

  async function save() {
    const digits = number.replace(/\D/g, '')
    if (digits.length !== 16) return setError("Karta raqami 16 xona bo'lishi kerak")

    setBusy(true)
    setError(null)
    try {
      setCard(await savePaymentCard({ number: digits, holder, bank }))
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (card === undefined) return null

  if (editing) {
    return (
      <div className="mb-3 rounded-lg border border-gold/30 bg-gold/5 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gold">
          To'lov kartasi
        </p>

        <input
          type="text"
          inputMode="numeric"
          autoFocus
          placeholder="8600 0000 0000 0000"
          value={number}
          onChange={(e) => setNumber(formatCardNumber(e.target.value))}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="mb-2 w-full rounded-md border border-border bg-bg px-2.5 py-2 text-xs font-bold tracking-wider text-text placeholder:font-normal placeholder:tracking-normal placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Karta egasi"
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          maxLength={100}
          className="mb-2 w-full rounded-md border border-border bg-bg px-2.5 py-2 text-xs text-text placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Bank (ixtiyoriy)"
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          maxLength={64}
          className="mb-2 w-full rounded-md border border-border bg-bg px-2.5 py-2 text-xs text-text placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
        />

        {error && <p className="mb-2 text-[11px] text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={busy}
            className="flex-1 rounded-md border border-border py-1.5 text-[11px] font-semibold text-text-muted transition hover:text-text disabled:opacity-50"
          >
            Bekor
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-md bg-gold py-1.5 text-[11px] font-bold text-bg transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? '...' : 'Saqlash'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={openEditor}
      className="group mb-3 block w-full rounded-lg border border-border bg-bg/50 p-3 text-left transition hover:border-gold/40"
      title="O'zgartirish uchun bosing"
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
          To'lov kartasi
        </span>
        <svg className="h-3 w-3 text-text-muted transition group-hover:text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </div>

      {card?.number ? (
        <>
          <p className="text-xs font-bold tracking-wider text-text">
            {formatCardNumber(card.number)}
          </p>
          {(card.holder || card.bank) && (
            <p className="mt-0.5 truncate text-[10px] text-text-muted">
              {[card.holder, card.bank].filter(Boolean).join(' · ')}
            </p>
          )}
        </>
      ) : (
        <p className="text-xs font-semibold text-gold">+ Karta qo'shish</p>
      )}
    </button>
  )
}
