import { useId, useRef, useState } from 'react'
import { UploadIcon, FileIcon, XIcon } from './icons.jsx'

const DEFAULT_MAX_SIZE_MB = 10

export default function FileUploader({
  label,
  accept = 'image/*',
  maxSizeMb = DEFAULT_MAX_SIZE_MB,
  file,
  onChange,
  hint,
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)

  function validateAndSet(selected) {
    if (!selected) return

    const isAccepted = accept
      .split(',')
      .some((pattern) => selected.type.match(pattern.trim().replace('*', '.*')))

    if (!isAccepted) {
      setError("Fayl formati qo'llab-quvvatlanmaydi")
      return
    }
    if (selected.size > maxSizeMb * 1024 * 1024) {
      setError(`Fayl hajmi ${maxSizeMb}MB dan oshmasligi kerak`)
      return
    }

    setError(null)
    onChange(selected)
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    validateAndSet(event.dataTransfer.files?.[0])
  }

  function handleRemove(event) {
    event.stopPropagation()
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-muted"
        >
          {label}
        </label>
      )}

      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={[
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors',
          isDragging ? 'border-gold bg-gold/5' : 'border-border bg-surface hover:border-gold/50',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => validateAndSet(event.target.files?.[0])}
        />

        {file ? (
          <div className="flex w-full items-center justify-between gap-3 rounded-lg bg-bg px-4 py-3">
            <div className="flex min-w-0 items-center gap-2 text-sm text-text">
              <FileIcon className="h-4 w-4 shrink-0 text-gold" />
              <span className="truncate">{file.name}</span>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="shrink-0 text-text-muted hover:text-red-400"
              aria-label="Faylni olib tashlash"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <UploadIcon className="h-6 w-6 text-text-muted" />
            <p className="text-sm text-text-muted">
              Faylni shu yerga tashlang yoki <span className="text-gold">tanlang</span>
            </p>
            {hint && <p className="text-xs text-text-muted/70">{hint}</p>}
          </>
        )}
      </label>

      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )
}
