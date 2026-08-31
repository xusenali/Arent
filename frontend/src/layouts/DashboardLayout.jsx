import { Outlet } from 'react-router-dom'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from '../components/layout/Sidebar.jsx'
import {
  GridIcon,
  UsersIcon,
  MapPinIcon,
  ReceiptIcon,
  BookIcon,
  LogoutIcon,
} from '../components/ui/icons.jsx'
import { useAuthStore } from '../store/authStore.js'

// Root sahifalar — bu sahifalarda back button kerak emas
const ROOT_PATHS = [
  '/admin/dashboard',
  '/admin/workers',
  '/admin/map',
  '/admin/payment-receipts',
  '/worker/dashboard',
  '/worker/rules',
]

function MobileTopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const isRoot = ROOT_PATHS.some((p) => location.pathname === p)
  if (isRoot) return null

  const PAGE_TITLES = {
    '/admin/workers': t('sidebar.workers'),
  }

  // Sub-page title — URL dan avtomatik aniqlash
  const segments = location.pathname.split('/').filter(Boolean)
  const pageKey = `/${segments.slice(0, 2).join('/')}`
  const title = PAGE_TITLES[pageKey] ?? ''

  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-surface px-4 py-3 md:hidden">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-surface-hover hover:text-text active:scale-95 transition"
        aria-label="Orqaga"
      >
        ←
      </button>
      {title && <span className="text-sm font-semibold text-text">{title}</span>}
    </div>
  )
}

function BottomNav({ role }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  const adminLinks = [
    { to: '/admin/dashboard', label: t('sidebar.dashboard'), Icon: GridIcon },
    { to: '/admin/workers', label: t('sidebar.workers'), Icon: UsersIcon },
    { to: '/admin/map', label: t('sidebar.map'), Icon: MapPinIcon },
    { to: '/admin/payment-receipts', label: t('sidebar.receipts_short'), Icon: ReceiptIcon },
  ]
  const workerLinks = [
    { to: '/worker/dashboard', label: t('sidebar.dashboard'), Icon: GridIcon },
    { to: '/worker/rules', label: t('sidebar.rules'), Icon: BookIcon },
  ]
  const links = role === 'super_admin' ? adminLinks : workerLinks

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-surface md:hidden">
      {links.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            ['flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px] font-semibold uppercase tracking-wide transition-colors',
              isActive ? 'text-gold' : 'text-text-muted'].join(' ')
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={handleLogout}
        className="flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px] font-semibold uppercase tracking-wide text-text-muted transition-colors"
      >
        <LogoutIcon className="h-5 w-5" />
        {t('sidebar.logout')}
      </button>
    </nav>
  )
}

export default function DashboardLayout({ role }) {
  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar role={role} />
      </div>

      {/* Right side: top bar (mobile only) + content */}
      <div className="flex flex-1 flex-col">
        <MobileTopBar />
        <main className="flex-1 overflow-y-auto px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav role={role} />
    </div>
  )
}
