export default function StatCard({ label, value, Icon, accent = false }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between sm:mb-4">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:text-xs">
          {label}
        </span>
        {Icon && (
          <span className={['flex h-7 w-7 items-center justify-center rounded-lg sm:h-9 sm:w-9',
            accent ? 'bg-gold/10 text-gold' : 'bg-bg text-text-muted'].join(' ')}>
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
        )}
      </div>
      <p className={['text-xl font-black sm:text-3xl', accent ? 'text-gold' : 'text-text'].join(' ')}>
        {value}
      </p>
    </div>
  )
}
