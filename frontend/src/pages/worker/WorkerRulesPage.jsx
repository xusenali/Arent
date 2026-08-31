import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchWorkerRules } from '../../api/workerApi.js'
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

export default function WorkerRulesPage() {
  const { t, i18n } = useTranslation()
  const fetcher = useCallback(() => fetchWorkerRules(i18n.language), [i18n.language])
  const { rules, isLoading, error } = useRules(fetcher)

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-black text-text">{t('rules.title')}</h1>
      <p className="mb-8 text-sm text-text-muted">{t('rules.worker_desc')}</p>

      {isLoading && <p className="text-text-muted">{t('common.loading')}</p>}
      {error && <p className="text-red-400">{error}</p>}

      <ol className="space-y-4">
        {rules.map((rule, index) => (
          <li key={rule.key} className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/10 text-sm font-bold text-gold">
                {index + 1}
              </span>
              <h2 className="text-sm font-bold text-text">{rule.title}</h2>
            </div>
            <RuleBody body={rule.body} />
          </li>
        ))}
      </ol>
    </div>
  )
}
