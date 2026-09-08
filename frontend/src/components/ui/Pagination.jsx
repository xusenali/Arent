import { ChevronLeftIcon, ChevronRightIcon } from './icons.jsx'

/**
 * Klient tomonidagi sahifalash.
 *
 * Bitta sahifa yetsa hech narsa chizmaydi. Sahifalar ko'p bo'lsa
 * boshi, oxiri va joriy sahifa atrofidagilar ko'rsatiladi, qolgani "…".
 *
 * @param {number}   props.page      joriy sahifa (1 dan boshlanadi)
 * @param {number}   props.total     jami yozuvlar soni
 * @param {number}   props.pageSize  bir sahifadagi yozuvlar
 * @param {Function} props.onChange  yangi sahifa raqami bilan chaqiriladi
 */
export default function Pagination({ page, total, pageSize = 10, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
      acc.push(p)
      return acc
    }, [])

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-xs text-text-muted">
        {total} ta · {page}/{totalPages} sahifa
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-gold/40 hover:text-text disabled:opacity-30"
          aria-label="Oldingi sahifa"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-text-muted">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={[
                'flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-xs font-bold transition-all',
                p === page
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-border text-text-muted hover:border-gold/40 hover:text-text',
              ].join(' ')}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-gold/40 hover:text-text disabled:opacity-30"
          aria-label="Keyingi sahifa"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
