import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import OtpInput from '../../components/ui/OtpInput.jsx'
import { formatPhone, isValidPhone } from '../../utils/formatPhone.js'
import { requestOtp, verifyOtp, confirmNewPassword } from '../../api/resetPasswordApi.js'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const STEPS = [
    { key: 'phone', label: t('auth.step_phone') },
    { key: 'otp', label: t('auth.step_verify') },
    { key: 'password', label: t('auth.step_password') },
  ]

  async function handlePhoneSubmit(event) {
    event.preventDefault()
    if (!isValidPhone(phone)) {
      setError(t('auth.phone_error'))
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      await requestOtp({ phone })
      setStepIndex(1)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleOtpSubmit(event) {
    event.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await verifyOtp({ phone, code })
      setStepIndex(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwords_mismatch'))
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      await confirmNewPassword({ phone, code, newPassword })
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((step, index) => (
          <div key={step.key} className="flex flex-1 items-center gap-2">
            <div
              className={[
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                index <= stepIndex ? 'bg-gold text-black' : 'bg-surface text-text-muted',
              ].join(' ')}
            >
              {index + 1}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={[
                  'h-px flex-1',
                  index < stepIndex ? 'bg-gold' : 'bg-border',
                ].join(' ')}
              />
            )}
          </div>
        ))}
      </div>

      {stepIndex === 0 && (
        <form onSubmit={handlePhoneSubmit} noValidate className="space-y-5">
          <div>
            <h2 className="mb-1 text-2xl font-black text-text">{t('auth.reset_title')}</h2>
            <p className="text-sm text-text-muted">{t('auth.reset_desc')}</p>
          </div>

          <Input
            label={t('auth.phone')}
            type="tel"
            placeholder="+998 90 123 45 67"
            value={phone}
            onChange={(event) => setPhone(formatPhone(event.target.value))}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" fullWidth loading={isLoading}>
            {t('auth.send_code')}
          </Button>
        </form>
      )}

      {stepIndex === 1 && (
        <form onSubmit={handleOtpSubmit} noValidate className="space-y-6">
          <div>
            <h2 className="mb-1 text-2xl font-black text-text">{t('auth.otp_title')}</h2>
            <p className="text-sm text-text-muted">{t('auth.otp_desc')}</p>
          </div>

          <OtpInput value={code} onChange={setCode} />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" fullWidth loading={isLoading} disabled={code.length !== 6}>
            {t('auth.verify')}
          </Button>
        </form>
      )}

      {stepIndex === 2 && (
        <form onSubmit={handlePasswordSubmit} noValidate className="space-y-5">
          <div>
            <h2 className="mb-1 text-2xl font-black text-text">{t('auth.new_password_title')}</h2>
            <p className="text-sm text-text-muted">{t('auth.new_password_desc')}</p>
          </div>

          <Input
            label={t('auth.new_password')}
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <Input
            label={t('auth.confirm_password')}
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" fullWidth loading={isLoading}>
            {t('auth.save_password')}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-text-muted">
        <Link to="/login" className="font-medium text-gold hover:text-gold-light">
          {t('auth.back_to_login')}
        </Link>
      </p>
    </div>
  )
}
