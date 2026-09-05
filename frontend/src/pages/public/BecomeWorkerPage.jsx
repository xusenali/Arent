import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation as useT } from 'react-i18next'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import { CheckIcon } from '../../components/ui/icons.jsx'
import { formatPhone, isValidPhone } from '../../utils/formatPhone.js'
import { submitWorkerApplication } from '../../api/applicationsApi.js'

// ─── pricing constants (mirror of backend utils.py) ───────────────────────────
const SCOOTER_PRICES = { 1: 350_000, 2: 450_000 }
const BIKE_PRICES    = { daily: 20_000, weekly: 100_000, monthly: 400_000 }
const PERIOD_LABELS  = { daily: 'Kunlik', weekly: 'Haftalik', monthly: 'Oylik' }

function formatSum(n) {
  return n.toLocaleString('uz-UZ') + " so'm"
}

// ─── sub-components ────────────────────────────────────────────────────────────

function OptionButton({ selected, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
        selected
          ? 'border-gold bg-gold/10 shadow-sm'
          : 'border-border bg-surface hover:border-gold/50',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function SectionLabel({ children }) {
  return <p className="mb-2.5 text-sm font-semibold text-text">{children}</p>
}

function PriceBadge({ amount }) {
  if (amount == null) return null
  return (
    <div className="flex items-center justify-between rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
      <span className="text-sm text-text-muted">Ijara narxi</span>
      <span className="text-base font-black text-gold">{formatSum(amount)}</span>
    </div>
  )
}

// ─── scooter-specific controls ────────────────────────────────────────────────

function ScooterControls({ batteryCount, onBatteryChange }) {
  return (
    <div>
      <SectionLabel>Batareya soni</SectionLabel>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map((n) => (
          <OptionButton key={n} selected={batteryCount === n} onClick={() => onBatteryChange(n)}>
            <div className={`text-sm font-bold ${batteryCount === n ? 'text-gold' : 'text-text'}`}>
              {n} ta batareya
            </div>
            <div className={`mt-0.5 text-xs ${batteryCount === n ? 'text-gold/70' : 'text-text-muted'}`}>
              {formatSum(SCOOTER_PRICES[n])} / hafta
            </div>
          </OptionButton>
        ))}
      </div>
    </div>
  )
}

// ─── bike-specific controls ───────────────────────────────────────────────────

function BikeControls({ periodType, onPeriodChange }) {
  return (
    <div>
      <SectionLabel>Ijara davri</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        {['daily', 'weekly', 'monthly'].map((p) => (
          <OptionButton key={p} selected={periodType === p} onClick={() => onPeriodChange(p)}>
            <div className={`text-sm font-bold ${periodType === p ? 'text-gold' : 'text-text'}`}>
              {PERIOD_LABELS[p]}
            </div>
            <div className={`mt-0.5 text-xs ${periodType === p ? 'text-gold/70' : 'text-text-muted'}`}>
              {formatSum(BIKE_PRICES[p])}
            </div>
          </OptionButton>
        ))}
      </div>
    </div>
  )
}

// ─── pay timing (shared) ──────────────────────────────────────────────────────

function PayTimingControls({ payTiming, onPayTimingChange }) {
  const options = [
    { value: 'start', label: 'Boshida',  desc: 'Ijara boshlanishida' },
    { value: 'end',   label: 'Oxirida',  desc: 'Ijara tugaganda'     },
  ]
  return (
    <div>
      <SectionLabel>To'lov vaqti</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        {options.map(({ value, label, desc }) => (
          <OptionButton key={value} selected={payTiming === value} onClick={() => onPayTimingChange(value)}>
            <div className={`text-sm font-bold ${payTiming === value ? 'text-gold' : 'text-text'}`}>
              {label}
            </div>
            <div className="mt-0.5 text-xs text-text-muted">{desc}</div>
          </OptionButton>
        ))}
      </div>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function BecomeWorkerPage() {
  const { t } = useT()
  const [searchParams] = useSearchParams()

  const unitId   = searchParams.get('unit')
  const unitName = searchParams.get('name')
  const unitType = searchParams.get('type')   // 'scooter' | 'bike'
  const isScooter = unitType === 'scooter'

  const [fullName,     setFullName]     = useState('')
  const [phone,        setPhone]        = useState('')
  const [periodType,   setPeriodType]   = useState('weekly')
  const [payTiming,    setPayTiming]    = useState('start')
  const [batteryCount, setBatteryCount] = useState(1)
  const [errors,       setErrors]       = useState({})
  const [isLoading,    setIsLoading]    = useState(false)
  const [isSubmitted,  setIsSubmitted]  = useState(false)
  const [submitError,  setSubmitError]  = useState(null)

  const previewPrice = (() => {
    if (!unitType) return null
    return isScooter
      ? SCOOTER_PRICES[batteryCount]
      : BIKE_PRICES[periodType]
  })()

  function validate() {
    const errs = {}
    if (fullName.trim().length < 3) errs.fullName = t('become_worker.full_name_error')
    if (!isValidPhone(phone))       errs.phone    = t('become_worker.phone_error')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    setSubmitError(null)
    try {
      await submitWorkerApplication({
        fullName,
        phone,
        desiredUnitModel: unitType ?? null,
        unitId:           unitId ?? null,
        period_type:      isScooter ? 'weekly' : periodType,
        pay_timing:       payTiming,
        battery_count:    isScooter ? batteryCount : null,
      })
      setIsSubmitted(true)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
          <CheckIcon className="h-7 w-7 text-gold" />
        </div>
        <h1 className="mb-3 text-2xl font-black text-text">{t('become_worker.success_title')}</h1>
        <p className="text-sm text-text-muted sm:text-base">{t('become_worker.success_desc')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-16">
      <span className="mb-3 inline-block rounded-full border border-gold/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold">
        {t('become_worker.badge')}
      </span>
      <h1 className="mb-3 text-3xl font-black text-text sm:text-4xl">{t('become_worker.title')}</h1>
      <p className="mb-8 text-sm text-text-muted">{t('become_worker.desc')}</p>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Input
          label={t('become_worker.full_name')}
          placeholder="Aliyev Sardor"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
        />
        <Input
          label={t('become_worker.phone')}
          type="tel"
          placeholder="+998 90 123 45 67"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          error={errors.phone}
        />

        {unitName && (
          <div className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-gold">
              Tanlangan transport
            </p>
            <p className="text-sm font-bold text-text">
              {isScooter ? '🛴' : '🚲'} {unitName}
              {isScooter && (
                <span className="ml-2 text-xs font-normal text-text-muted">· Haftalik ijara</span>
              )}
            </p>
          </div>
        )}

        {isScooter ? (
          <ScooterControls batteryCount={batteryCount} onBatteryChange={setBatteryCount} />
        ) : (
          <BikeControls periodType={periodType} onPeriodChange={setPeriodType} />
        )}

        <PayTimingControls payTiming={payTiming} onPayTimingChange={setPayTiming} />

        <PriceBadge amount={previewPrice} />

        {submitError && <p className="text-sm text-red-400">{submitError}</p>}

        <Button type="submit" fullWidth loading={isLoading}>
          {t('become_worker.submit')}
        </Button>
      </form>
    </div>
  )
}
