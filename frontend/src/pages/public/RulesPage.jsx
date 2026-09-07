import { useCallback } from 'react'
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
    </div>
  )
}
