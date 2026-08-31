import Button from './Button.jsx'

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Tasdiqlash',
  cancelLabel = 'Bekor qilish',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <h3 className="mb-2 text-lg font-bold text-text">{title}</h3>
        {description && <p className="mb-6 text-sm text-text-muted">{description}</p>}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel} className="flex-1 border border-border">
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading} className="flex-1">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
