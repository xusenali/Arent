import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Logo from '../ui/Logo.jsx'
import Button from '../ui/Button.jsx'

function MenuIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CloseIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function Header() {
  const { t, i18n } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)

  const NAV_LINKS = [
    { to: '/rent-transport', label: t('nav.transports') },
    { to: '/become-worker', label: t('nav.become_worker') },
    { to: '/rules', label: t('nav.rules') },
  ]

  function toggleLang() {
    const next = i18n.language === 'uz' ? 'ru' : 'uz'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
        <Link to="/" onClick={() => setMenuOpen(false)}>
          <Logo size="sm" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                ['text-sm font-medium uppercase tracking-wide transition-colors',
                  isActive ? 'text-gold' : 'text-text-muted hover:text-text'].join(' ')
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={toggleLang}
            className="text-xs font-semibold uppercase tracking-wide text-text-muted hover:text-gold transition-colors"
          >
            {i18n.language === 'uz' ? 'RU' : 'UZ'}
          </button>
          <Link to="/login" className="hidden md:block">
            <Button variant="outline" className="px-5 py-2.5">
              {t('nav.login')}
            </Button>
          </Link>
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-lg p-2 text-text-muted hover:text-text md:hidden"
            aria-label="Menu"
          >
            {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="border-t border-border bg-bg/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  ['rounded-lg px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors',
                    isActive ? 'bg-gold/10 text-gold' : 'text-text-muted hover:bg-surface hover:text-text'].join(' ')
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Link to="/login" onClick={() => setMenuOpen(false)} className="mt-2">
              <Button variant="outline" fullWidth>
                {t('nav.login')}
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
