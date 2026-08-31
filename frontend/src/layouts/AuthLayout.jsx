import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Logo from '../components/ui/Logo.jsx'

export default function AuthLayout() {
  const { t, i18n } = useTranslation()

  const features = t('auth.features', { returnObjects: true })

  function toggleLang() {
    const next = i18n.language === 'uz' ? 'ru' : 'uz'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-surface p-12 lg:flex">
        <div className="flex items-center justify-between">
          <Logo size="lg" />
          <button
            type="button"
            onClick={toggleLang}
            className="rounded-full border border-gold/40 bg-bg/60 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gold hover:bg-gold/10 transition-colors"
          >
            {i18n.language === 'uz' ? 'RU' : 'UZ'}
          </button>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-gold">
            {t('auth.slogan')}
          </p>
          <h1 className="mb-8 text-4xl font-black leading-tight text-text">
            {t('auth.hero_title')} <br /> <span className="text-gold">{t('auth.hero_title_2')}</span>
          </h1>

          <ul className="space-y-4">
            {Array.isArray(features) && features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span className="text-sm text-text-muted">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
      </aside>

      <main className="flex w-full flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <Logo size="md" />
            <button
              type="button"
              onClick={toggleLang}
              className="rounded-full border border-gold/40 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-gold hover:bg-gold/10 transition-colors"
            >
              {i18n.language === 'uz' ? 'RU' : 'UZ'}
            </button>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
