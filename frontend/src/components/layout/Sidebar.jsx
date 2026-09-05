import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Logo from '../ui/Logo.jsx'
import {
  GridIcon,
  UsersIcon,
  MapPinIcon,
  ReceiptIcon,
  BookIcon,
  LogoutIcon,
  ScooterIcon,
  FileIcon,
} from '../ui/icons.jsx'
import { useAuthStore } from '../../store/authStore.js'

export default function Sidebar({ role }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)

  const ADMIN_LINKS = [
    { to: '/admin/dashboard', label: t('sidebar.dashboard'), Icon: GridIcon },
    { to: '/admin/workers', label: t('sidebar.workers'), Icon: UsersIcon },
    { to: '/admin/transports',   label: 'Transportlar', Icon: ScooterIcon },
    { to: '/admin/applications', label: 'Arizalar',     Icon: FileIcon },
    ...(import.meta.env.VITE_ENABLE_MAP === 'true'
      ? [{ to: '/admin/map', label: t('sidebar.map'), Icon: MapPinIcon }]
      : []),
    { to: '/admin/payment-receipts', label: t('sidebar.receipts'), Icon: ReceiptIcon },
  ]

  const WORKER_LINKS = [
    { to: '/worker/dashboard', label: t('sidebar.dashboard'), Icon: GridIcon },
    { to: '/worker/rules', label: t('sidebar.rules'), Icon: BookIcon },
  ]

  const links = role === 'super_admin' ? ADMIN_LINKS : WORKER_LINKS

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function toggleLang() {
    const next = i18n.language === 'uz' ? 'ru' : 'uz'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-6 py-6">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gold/10 text-gold'
                  : 'text-text-muted hover:bg-surface-hover hover:text-text',
              ].join(' ')
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 px-2">
          <p className="truncate text-sm font-semibold text-text">{user?.full_name}</p>
          <p className="text-xs text-text-muted">{user?.phone}</p>
        </div>
        <button
          type="button"
          onClick={toggleLang}
          className="mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted transition-colors hover:bg-surface-hover hover:text-gold"
        >
          {i18n.language === 'uz' ? 'RU' : 'UZ'}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
        >
          <LogoutIcon className="h-[18px] w-[18px]" />
          {t('sidebar.logout')}
        </button>
      </div>
    </aside>
  )
}
