import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchPublicRules } from '../../api/publicApi.js'
import { useRules } from '../../hooks/useRules.js'

function RuleBody({ body }) {
  const lines = body.split('\n').filter(Boolean)
  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-text-muted">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/50" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  )
}

function Tilxat() {
  const printRef = useRef()

  function handlePrint() {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank', 'width=800,height=900')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Tilxat — Ashrapov Rent</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:14px;line-height:1.7;margin:40px;color:#111}
        h2{font-size:18px;text-align:center;margin-bottom:4px}
        .sub{text-align:center;font-size:13px;color:#555;margin-bottom:30px}
        .row{display:flex;gap:8px;margin-bottom:18px}
        .label{min-width:200px;font-weight:600;color:#333}
        .line{flex:1;border-bottom:1px solid #aaa;min-height:22px}
        .text{font-size:13px;margin-bottom:18px;line-height:1.8}
        .sign-row{display:flex;justify-content:space-between;margin-top:40px}
        .sign-box{width:45%}
        .sign-box .label{display:block;font-size:12px;color:#555;margin-bottom:4px}
        .sign-line{border-bottom:1px solid #555;height:24px;margin-bottom:4px}
        @media print{body{margin:20px}}
      </style></head><body>${content}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-black text-text sm:text-lg">Tilxat (shartnoma)</h2>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-gold/40 hover:text-text"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Chop etish
        </button>
      </div>

      <div
        ref={printRef}
        className="rounded-2xl border border-border bg-surface p-6 sm:p-8"
      >
        {/* Print-only content */}
        <h2>TILXAT</h2>
        <p className="sub">Ashrapov Rent — Elektro-transport ijarasi</p>

        <div className="mb-6 space-y-4">
          <div className="flex gap-3">
            <span className="min-w-[180px] text-xs font-semibold uppercase tracking-wide text-text-muted sm:min-w-[220px]">F.I.Sh.</span>
            <span className="flex-1 border-b border-dashed border-border" />
          </div>
          <div className="flex gap-3">
            <span className="min-w-[180px] text-xs font-semibold uppercase tracking-wide text-text-muted sm:min-w-[220px]">Passport / ID seriya va raqami</span>
            <span className="flex-1 border-b border-dashed border-border" />
          </div>
          <div className="flex gap-3">
            <span className="min-w-[180px] text-xs font-semibold uppercase tracking-wide text-text-muted sm:min-w-[220px]">Telefon raqami</span>
            <span className="flex-1 border-b border-dashed border-border" />
          </div>
          <div className="flex gap-3">
            <span className="min-w-[180px] text-xs font-semibold uppercase tracking-wide text-text-muted sm:min-w-[220px]">Yaqin qarindosh tel. raqami</span>
            <span className="flex-1 border-b border-dashed border-border" />
          </div>
          <div className="flex gap-3">
            <span className="min-w-[180px] text-xs font-semibold uppercase tracking-wide text-text-muted sm:min-w-[220px]">Transport turi / modeli</span>
            <span className="flex-1 border-b border-dashed border-border" />
          </div>
          <div className="flex gap-3">
            <span className="min-w-[180px] text-xs font-semibold uppercase tracking-wide text-text-muted sm:min-w-[220px]">Ijara boshlanish sanasi</span>
            <span className="flex-1 border-b border-dashed border-border" />
          </div>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-text-muted">
          Men, quyida imzo qo'ygan shaxs, <strong className="text-text">Ashrapov Rent</strong> kompaniyasidan
          elektro-transport ijaraga olish shartlari bilan to'liq tanishib chiqdim va quyidagilarga
          so'zsiz roziligimni bildiraman:
        </p>

        <ol className="mb-6 space-y-2 text-sm text-text-muted">
          <li className="flex gap-2"><span className="font-bold text-gold">1.</span> Transportni faqat belgilangan maqsadda — yuk tashish va yetkazib berish uchun ishlataman.</li>
          <li className="flex gap-2"><span className="font-bold text-gold">2.</span> To'lov muddatiga qat'iy rioya qilaman. Kechikkan kunlar uchun jarima to'lanishiga roziman.</li>
          <li className="flex gap-2"><span className="font-bold text-gold">3.</span> Transportni uchinchi shaxslarga bermasligimni va o'z vaqtida qaytarishimni kafolatlyman.</li>
          <li className="flex gap-2"><span className="font-bold text-gold">4.</span> Batareyani vaqtida zaryadlab, texnik holatiga e'tibor beraman.</li>
          <li className="flex gap-2"><span className="font-bold text-gold">5.</span> Transport yo'qolishi yoki shikastlanishi yuz berganda to'liq moddiy mas'uliyatni o'z zimmamga olaman.</li>
          <li className="flex gap-2"><span className="font-bold text-gold">6.</span> Geolokatsiyani har 8 soatda Telegram bot orqali yuborib turaman.</li>
        </ol>

        <div className="mt-8 flex justify-between gap-8">
          <div className="flex-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Ijara oluvchi imzosi</p>
            <div className="mt-6 border-b border-border" />
            <p className="mt-1 text-xs text-text-muted">F.I.Sh. / sana</p>
          </div>
          <div className="flex-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Ashrapov Rent vakili</p>
            <div className="mt-6 border-b border-border" />
            <p className="mt-1 text-xs text-text-muted">F.I.Sh. / sana / muhr</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RulesPage() {
  const { t, i18n } = useTranslation()
  const fetcher = useCallback(() => fetchPublicRules(i18n.language), [i18n.language])
  const { rules, isLoading, error } = useRules(fetcher)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <span className="mb-3 inline-block rounded-full border border-gold/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold sm:mb-4 sm:px-4 sm:py-1.5 sm:text-xs">
        {t('rules.badge')}
      </span>
      <h1 className="mb-2 text-2xl font-black text-text sm:text-4xl">{t('rules.title')}</h1>
      <p className="mb-8 text-sm text-text-muted sm:mb-10">{t('rules.desc')}</p>

      {isLoading && <p className="text-text-muted">{t('common.loading')}</p>}
      {error && <p className="text-red-400">{error}</p>}

      <ol className="space-y-3 sm:space-y-4">
        {rules.map((rule, index) => (
          <li key={rule.key} className="rounded-xl border border-border bg-surface p-4 sm:p-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/10 text-xs font-bold text-gold sm:h-8 sm:w-8 sm:text-sm">
                {index + 1}
              </span>
              <h2 className="text-sm font-bold text-text sm:text-base">{rule.title}</h2>
            </div>
            <RuleBody body={rule.body} />
          </li>
        ))}
      </ol>

      <Tilxat />
    </div>
  )
}
