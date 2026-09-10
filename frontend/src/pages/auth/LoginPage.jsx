import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import { EyeIcon, EyeOffIcon } from '../../components/ui/icons.jsx'
import { useLogin } from '../../hooks/useLogin.js'
import { wakeBackend } from '../../api/client.js'
import { formatPhone, isValidPhone } from '../../utils/formatPhone.js'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, isLoading, isSlow, error } = useLogin()

  // Foydalanuvchi raqam/parol yozguncha server uyg'onib ulgursin.
  useEffect(() => { wakeBackend() }, [])

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  function handlePhoneChange(event) {
    setPhone(formatPhone(event.target.value))
  }

  function validate() {
    const errors = {}
    if (!isValidPhone(phone)) {
      errors.phone = t('auth.phone_error')
    }
    if (password.length < 6) {
      errors.password = t('auth.password_error')
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return

    try {
      const { user } = await login({ phone, password })
      navigate(user.role === 'super_admin' ? '/admin/dashboard' : '/worker/dashboard')
    } catch {
      // xato holati useLogin ichida `error` sifatida saqlanadi
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-2xl font-black text-text">{t('auth.login_title')}</h2>
      <p className="mb-8 text-sm text-text-muted">{t('auth.login_desc')}</p>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Input
          label={t('auth.phone')}
          type="tel"
          inputMode="numeric"
          placeholder="+998 90 123 45 67"
          value={phone}
          onChange={handlePhoneChange}
          error={fieldErrors.phone}
          autoComplete="tel"
        />

        <div>
          <div className="relative">
            <Input
              label={t('auth.password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-[38px] text-text-muted hover:text-text"
              aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
            >
              {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-3 text-right">
            <Link to="/reset-password" className="text-xs font-medium text-gold hover:text-gold-light">
              {t('auth.forgot_password')}
            </Link>
          </div>
        </div>

        {isSlow && !error && (
          <p className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
            {t('auth.server_waking')}
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth loading={isLoading}>
          {t('auth.login_btn')}
        </Button>
      </form>
    </div>
  )
}
