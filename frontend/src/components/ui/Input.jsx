import { forwardRef, useId } from 'react'

const Input = forwardRef(function Input(
  { label, error, icon: Icon, id, className = '', ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-muted"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        )}
        <input
          id={inputId}
          ref={ref}
          className={[
            'w-full rounded-lg border bg-surface px-4 py-3 text-sm text-text',
            'placeholder:text-text-muted/60',
            'transition-colors duration-150 outline-none',
            'focus:border-gold focus:ring-1 focus:ring-gold',
            Icon ? 'pl-11' : '',
            error ? 'border-red-500/70' : 'border-border',
          ].join(' ')}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
      </div>

      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  )
})

export default Input
