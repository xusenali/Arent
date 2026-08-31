import { useTranslation } from 'react-i18next'
import Logo from '../ui/Logo.jsx'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center md:flex-row md:justify-between md:text-left">
        <Logo size="sm" />
        <p className="text-xs text-text-muted">
          © {new Date().getFullYear()} Ashrapov Rent. {t('footer.rights')}
        </p>
      </div>
    </footer>
  )
}
