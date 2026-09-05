import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../../components/ui/Button.jsx'
import { usePublicUnits } from '../../hooks/usePublicUnits.js'

const SCOOTER_IMAGES = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=480&h=360&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=480&h=360&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1593764592116-bfb2a97c642a?w=480&h=360&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1601752943749-3521793af341?w=480&h=360&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=480&h=360&fit=crop&auto=format',
]

const BIKE_IMAGES = [
  'https://images.unsplash.com/photo-1502744688674-c619d1586c9e?w=480&h=360&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=480&h=360&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=480&h=360&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1571333250630-f0230c320b6d?w=480&h=360&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=480&h=360&fit=crop&auto=format',
]

function getImage(unit, i) {
  if (unit.image) return unit.image
  return (unit.unit_type === 'bike' ? BIKE_IMAGES : SCOOTER_IMAGES)[i % 5]
}

const SCOOTER_PLANS = [
  {
    label: '1 ta akkumulyator',
    price: '350 000',
    period: '7 kun',
    icon: '🔋',
    highlight: false,
  },
  {
    label: '2 ta akkumulyator',
    price: '450 000',
    period: '7 kun',
    icon: '🔋🔋',
    highlight: true,
  },
]

const BIKE_PLANS = [
  { label: 'Kunlik',   price: '20 000',  period: '1 kun',  icon: '☀️',  highlight: false },
  { label: 'Haftalik', price: '100 000', period: '7 kun',  icon: '📅',  highlight: true  },
  { label: 'Oylik',    price: '400 000', period: '30 kun', icon: '🗓️', highlight: false },
]

function PricingBanner({ type }) {
  const plans = type === 'scooter' ? SCOOTER_PLANS : BIKE_PLANS
  return (
    <div className="mb-8 rounded-2xl border border-gold/20 bg-surface p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-base">{type === 'scooter' ? '🛴' : '🚲'}</span>
        <h2 className="text-sm font-black uppercase tracking-widest text-gold">
          {type === 'scooter' ? 'Skuter narxlari' : 'Velosiped narxlari'}
        </h2>
        {type === 'bike' && (
          <span className="ml-auto rounded-full border border-gold/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
            Razmer 26 / 29
          </span>
        )}
      </div>
      <div className={['grid gap-3', plans.length === 2 ? 'grid-cols-2' : 'grid-cols-3'].join(' ')}>
        {plans.map((plan) => (
          <div
            key={plan.label}
            className={[
              'relative rounded-xl border p-3 text-center sm:p-4 transition-colors',
              plan.highlight
                ? 'border-gold bg-gold/8 ring-1 ring-gold/30'
                : 'border-border bg-bg',
            ].join(' ')}
          >
            {plan.highlight && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gold px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                Mashhur
              </span>
            )}
            <div className="mb-1 text-xl">{plan.icon}</div>
            <p className="mb-0.5 text-[11px] font-medium text-text-muted">{plan.label}</p>
            <p className="text-base font-black text-gold sm:text-lg">{plan.price}</p>
            <p className="text-[10px] text-text-muted">so'm / {plan.period}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function UnitCard({ unit, i, bookLabel, unavailableLabel }) {
  const isAvailable = unit.status === 'available'
  const statusClass = unit.status === 'available' ? 'text-emerald-400'
    : unit.status === 'rented' ? 'text-red-400' : 'text-amber-400'

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-gold/40">
      <div className="aspect-[4/3] overflow-hidden bg-bg">
        <img
          src={getImage(unit, i)}
          alt={unit.model_name}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            e.target.src = `https://placehold.co/480x360/131313/d2c4b4?text=${encodeURIComponent(unit.model_name)}`
          }}
        />
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-text">{unit.model_name}</h3>
          <span className={['shrink-0 text-xs font-semibold', statusClass].join(' ')}>
            {isAvailable ? bookLabel : unavailableLabel}
          </span>
        </div>
        <Link
          to={isAvailable
            ? `/become-worker?unit=${unit.id}&name=${encodeURIComponent(unit.model_name)}&type=${unit.unit_type}`
            : '#'}
          className="mb-4 block"
        >
          <Button variant={isAvailable ? 'primary' : 'outline'} fullWidth disabled={!isAvailable}>
            {isAvailable ? bookLabel : unavailableLabel}
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function RentTransportPage() {
  const { t } = useTranslation()
  const { units, isLoading, error } = usePublicUnits()
  const [activeType, setActiveType] = useState('scooter')

  const scooters = units.filter((u) => u.unit_type === 'scooter')
  const bikes = units.filter((u) => u.unit_type === 'bike')
  const displayed = activeType === 'scooter' ? scooters : bikes

  const TABS = [
    { value: 'scooter', label: '🛴 ' + t('rent.scooters'), count: scooters.length },
    { value: 'bike', label: '🚲 ' + t('rent.bikes'), count: bikes.length },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
      <span className="mb-3 inline-block rounded-full border border-gold/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold sm:mb-4 sm:px-4 sm:py-1.5 sm:text-xs">
        {t('rent.badge')}
      </span>
      <h1 className="mb-3 text-2xl font-black text-text sm:text-4xl">{t('rent.title')}</h1>
      <p className="mb-8 text-sm text-text-muted sm:mb-10">{t('rent.desc')}</p>

      {/* Tabs */}
      <div className="mb-8 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveType(tab.value)}
            className={[
              'flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all duration-200 sm:flex-none sm:px-6',
              activeType === tab.value
                ? 'border-gold bg-gold text-black neon-glow'
                : 'border-border bg-surface text-text-muted hover:border-gold/40 hover:text-text',
            ].join(' ')}
          >
            {tab.label}
            <span className={['rounded-full px-1.5 py-0.5 text-xs font-semibold',
              activeType === tab.value ? 'bg-black/15' : 'bg-bg text-text-muted'].join(' ')}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <PricingBanner type={activeType} />

      {isLoading && <p className="text-text-muted">{t('common.loading')}</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!isLoading && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-5">
          {displayed.map((unit, i) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              i={i}
              bookLabel={t('rent.book')}
              unavailableLabel={t('rent.unavailable')}
            />
          ))}
          {displayed.length === 0 && (
            <p className="col-span-full text-text-muted">{t('rent.empty')}</p>
          )}
        </div>
      )}
    </div>
  )
}
