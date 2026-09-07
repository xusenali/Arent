import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import OtpInput from '../../components/ui/OtpInput.jsx'
import { formatPhone, isValidPhone } from '../../utils/formatPhone.js'
import { requestOtp, verifyOtp, confirmNewPassword } from '../../api/resetPasswordApi.js'

const BOT = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'a_reset_password_bot'

// step: 'phone' | 'connect_bot' | 'otp' | 'password'
export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep]               = useState('phone')
  const [isLoading, setIsLoading]     = useState(false)
  const [error, setError]             = useState(null)

  const [phone, setPhone]             = useState('')
  const [code, setCode]               = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const STEP_KEYS  = ['phone', 'otp', 'password']
  const stepIndex  = step === 'connect_bot' ? 1 : STEP_KEYS.indexOf(step)

  async function handlePhoneSubmit(e) {
    e.preventDefault()
    if (!isValidPhone(phone)) { setError(t('auth.phone_error')); return }
    setError(null)
    setIsLoading(true)
    try {
      const data = await requestOtp({ phone })
      if (data?.telegram_connected) {
        setStep('otp')
      } else {
        setStep('connect_bot')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRecheck() {
    setError(null)
    setIsLoading(true)
    try {
      const data = await requestOtp({ phone })
      if (data?.telegram_connected) {
        setStep('otp')
      } else {
        setError("Hali ulanmagan. Botga o'ting va raqamingizni yuboring.")
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await verifyOtp({ phone, code })
      setStep('password')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setError(t('auth.passwords_mismatch')); return }
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

  const STEPS = [
    { label: t('auth.step_phone') },
    { label: t('auth.step_verify') },
    { label: t('auth.step_password') },
  ]

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <div className={[
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              i <= stepIndex ? 'bg-gold text-black' : 'bg-surface text-text-muted',
            ].join(' ')}>
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={['h-px flex-1', i < stepIndex ? 'bg-gold' : 'bg-border'].join(' ')} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Phone ── */}
      {step === 'phone' && (
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
            onChange={(e) => setPhone(formatPhone(e.target.value))}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" fullWidth loading={isLoading}>
            {t('auth.send_code')}
          </Button>
        </form>
      )}

      {/* ── Step 1b: Connect bot ── */}
      {step === 'connect_bot' && (
        <div className="space-y-5">
          <div>
            <h2 className="mb-1 text-2xl font-black text-text">Telegramga ulaning</h2>
            <p className="text-sm text-text-muted">
              Kod olish uchun avval hisobingizni Telegram botga ulang.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400 font-black text-sm">1</div>
              <p className="text-sm text-sky-300">
                Quyidagi botga o'ting
              </p>
            </div>
            <a
              href={`https://t.me/${BOT}`}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.93 6.43l-1.68 7.92c-.12.56-.46.7-.93.43l-2.57-1.9-1.24 1.19c-.14.14-.26.26-.52.26l.18-2.6 4.7-4.25c.2-.18-.05-.28-.32-.1L7.6 13.9l-2.5-.78c-.54-.17-.55-.54.12-.8l9.74-3.75c.45-.16.84.11.97.82z"/>
              </svg>
              @{BOT} ga o'tish
            </a>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400 font-black text-sm">2</div>
              <p className="text-sm text-sky-300">
                Botga telefon raqamingizni yuboring:{' '}
                <span className="font-bold text-sky-200">{phone}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400 font-black text-sm">3</div>
              <p className="text-sm text-sky-300">
                Bot kodni yuborgandan so'ng quyidagi tugmani bosing
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button fullWidth loading={isLoading} onClick={handleRecheck}>
            Kodni oldim →
          </Button>

          <button
            type="button"
            onClick={() => { setStep('phone'); setError(null) }}
            className="w-full text-center text-sm text-text-muted hover:text-text"
          >
            ← Orqaga
          </button>
        </div>
      )}

      {/* ── Step 2: OTP ── */}
      {step === 'otp' && (
        <form onSubmit={handleOtpSubmit} noValidate className="space-y-6">
          <div>
            <h2 className="mb-1 text-2xl font-black text-text">{t('auth.otp_title')}</h2>
            <p className="text-sm text-text-muted">
              Telegramga yuborilgan 6 ta raqamli kodni kiriting.
            </p>
          </div>
          <OtpInput value={code} onChange={setCode} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" fullWidth loading={isLoading} disabled={code.length !== 6}>
            {t('auth.verify')}
          </Button>
        </form>
      )}

      {/* ── Step 3: New password ── */}
      {step === 'password' && (
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
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label={t('auth.confirm_password')}
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
