import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../../components/ui/Button.jsx'

export default function HomePage() {
  const { t } = useTranslation()

  const FEATURES = [
    { title: t('home.features.safety_title'), description: t('home.features.safety_desc') },
    { title: t('home.features.fast_title'), description: t('home.features.fast_desc') },
    { title: t('home.features.transparent_title'), description: t('home.features.transparent_desc') },
    { title: t('home.features.control_title'), description: t('home.features.control_desc') },
  ]

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-24">
          <div className="order-2 lg:order-1">
            <span className="mb-4 inline-block rounded-full border border-gold/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold sm:px-4 sm:py-1.5 sm:text-xs">
              {t('home.badge')}
            </span>
            <h1 className="mb-4 text-3xl font-black leading-[1.1] text-text sm:text-4xl lg:text-5xl lg:leading-[1.05]">
              {t('home.hero_title_1')} <br />
              <span className="text-gold">{t('home.hero_title_2')}</span> {t('home.hero_title_3')}
            </h1>
            <p className="mb-7 text-sm text-text-muted sm:mb-8 sm:text-base">
              {t('home.hero_desc')}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/rent-transport">
                <Button fullWidth>{t('home.see_transports')}</Button>
              </Link>
              <Link to="/become-worker">
                <Button variant="outline" fullWidth>{t('home.become_worker')}</Button>
              </Link>
            </div>
          </div>

          <div className="order-1 mx-auto w-full max-w-sm lg:order-2 lg:max-w-md">
            <img
              src="/velo.PNG"
              alt="Ashrapov Rent — elektro transport"
              className="w-full rounded-2xl object-cover shadow-[0_0_40px_#d2c4b422]"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <h2 className="mb-8 text-center text-2xl font-black text-text sm:mb-12 sm:text-3xl">
          {t('home.why_title')} <span className="text-gold">{t('home.why_brand')}</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-gold/40"
            >
              <div className="mb-3 h-2 w-8 rounded-full bg-gold" />
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-text">
                {feature.title}
              </h3>
              <p className="text-sm text-text-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-12 text-center sm:px-6 sm:py-16">
          <h2 className="text-2xl font-black text-text sm:text-3xl">
            {t('home.ready_title')} <span className="text-gold">{t('home.ready_brand')}</span>
          </h2>
          <p className="max-w-md text-sm text-text-muted sm:text-base">
            {t('home.ready_desc')}
          </p>
          <Link to="/become-worker" className="w-full sm:w-auto">
            <Button fullWidth>{t('home.apply')}</Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
