const STATUS_STYLES = {
  active: { label: 'Faol', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  pending: { label: 'Kutilmoqda', dot: 'bg-amber-400', text: 'text-amber-400' },
  overdue: { label: "Muddati o'tgan", dot: 'bg-red-400', text: 'text-red-400' },
  completed: { label: 'Yakunlangan', dot: 'bg-text-muted', text: 'text-text-muted' },
  approved: { label: 'Tasdiqlangan', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  rejected: { label: 'Rad etilgan', dot: 'bg-red-400', text: 'text-red-400' },
  blocked: { label: 'Bloklangan', dot: 'bg-red-400', text: 'text-red-400' },
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.completed

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-bg px-3 py-1 text-xs font-semibold',
        style.text,
      ].join(' ')}
    >
      <span className={['h-1.5 w-1.5 rounded-full', style.dot].join(' ')} />
      {style.label}
    </span>
  )
}
