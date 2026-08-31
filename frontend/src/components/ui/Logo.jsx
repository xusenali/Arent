const SIZE_CLASSES = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
}

export default function Logo({ size = 'md', className = '' }) {
  return (
    <div className={['flex flex-col leading-none', className].join(' ')}>
      <span className={['font-black tracking-tight text-text', SIZE_CLASSES[size]].join(' ')}>
        ASHRAPOV<span className="text-gold">RENT</span>
      </span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-text-muted">
        Elektro-ijara
      </span>
    </div>
  )
}
