import { useRef } from 'react'

export default function OtpInput({ length = 6, value, onChange }) {
  const inputRefs = useRef([])

  function handleChange(index, rawValue) {
    const digit = rawValue.replace(/\D/g, '').slice(-1)
    const chars = value.split('')
    chars[index] = digit ?? ''
    const next = chars.join('').slice(0, length)
    onChange(next)

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index, event) {
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="flex justify-between gap-2">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] ?? ''}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          className="h-14 w-12 rounded-lg border border-border bg-surface text-center text-xl font-bold text-text outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold"
        />
      ))}
    </div>
  )
}
