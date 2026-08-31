const VARIANT_CLASSES = {
  primary:
    'bg-gold text-black hover:bg-gold-light disabled:bg-gold-dark disabled:text-black/50 neon-glow hover:shadow-[0_0_14px_#d2c4b4,0_0_40px_#d2c4b466]',
  outline:
    'border border-gold text-gold hover:bg-gold hover:text-black disabled:border-border disabled:text-text-muted neon-border hover:neon-glow',
  ghost:
    'text-text-muted hover:text-text disabled:text-text-muted/50',
}

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  fullWidth = false,
  loading = false,
  disabled = false,
  onClick,
  className = '',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3',
        'text-sm font-bold uppercase tracking-wide transition-colors duration-150',
        'disabled:cursor-not-allowed',
        fullWidth ? 'w-full' : '',
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}
