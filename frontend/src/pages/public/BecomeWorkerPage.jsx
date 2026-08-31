import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import { CheckIcon } from '../../components/ui/icons.jsx'
import { formatPhone, isValidPhone } from '../../utils/formatPhone.js'
import { submitWorkerApplication } from '../../api/applicationsApi.js'
import { usePublicUnits } from '../../hooks/usePublicUnits.js'

export default function BecomeWorkerPage() {
  const { t } = useTranslation()
  const { units } = usePublicUnits()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [desiredUnitModel, setDesiredUnitModel] = useState('')
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  function validate() {
    const nextErrors = {}
    if (fullName.trim().length < 3) nextErrors.fullName = t('become_worker.full_name_error')
    if (!isValidPhone(phone)) nextErrors.phone = t('become_worker.phone_error')
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    setSubmitError(null)
    try {
      await submitWorkerApplication({ fullName, phone, desiredUnitModel })
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
      <span className="mb-3 inline-block rounded-full border border-gold/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold sm:mb-4 sm:px-4 sm:py-1.5 sm:text-xs">
        {t('become_worker.badge')}
      </span>
      <h1 className="mb-3 text-3xl font-black text-text sm:text-4xl">{t('become_worker.title')}</h1>
      <p className="mb-8 text-sm text-text-muted sm:mb-10">{t('become_worker.desc')}</p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
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
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t('become_worker.desired_model')}
          </label>
          <select
            value={desiredUnitModel}
            onChange={(e) => setDesiredUnitModel(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold"
          >
            <option value="">{t('become_worker.any_model')}</option>
            <option value="scooter">🛴 {t('rent.scooters')}</option>
            <option value="bike">🚲 {t('rent.bikes')}</option>
          </select>
        </div>
        {submitError && <p className="text-sm text-red-400">{submitError}</p>}
        <Button type="submit" fullWidth loading={isLoading}>
          {t('become_worker.submit')}
        </Button>
      </form>
    </div>
  )
}
