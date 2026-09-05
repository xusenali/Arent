import Button from './Button.jsx'
import { CheckIcon, XIcon } from './icons.jsx'

const AI_CONFIG = {
  real:    { icon: '🟢', label: 'Haqiqiy chek',   cls: 'text-emerald-400 bg-emerald-400/8 border-emerald-400/20' },
  fake:    { icon: '🔴', label: 'Shubhali chek',  cls: 'text-red-400    bg-red-400/8    border-red-400/20'    },
  unclear: { icon: '🟡', label: 'Aniqlanmadi',    cls: 'text-amber-400  bg-amber-400/8  border-amber-400/20'  },
}

function AiBadge({ verdict, extractedAmount }) {
  const cfg = AI_CONFIG[verdict]
  if (!cfg) return null
  return (
    <div className={`mb-3 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${cfg.cls}`}>
      <span className="flex items-center gap-1.5 font-medium">
        <span>{cfg.icon}</span>
        <span>AI: {cfg.label}</span>
      </span>
      {extractedAmount != null && (
        <span className="font-semibold">
          {extractedAmount.toLocaleString('uz-UZ')} so'm
        </span>
      )}
    </div>
  )
}

export default function ReceiptCard({ receipt, onApprove, onReject, isProcessing = false }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="aspect-[4/3] bg-bg">
        <img src={receipt.imageUrl} alt="Chek" className="h-full w-full object-cover" />
      </div>

      <div className="p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="font-semibold text-text">{receipt.workerName}</p>
            <p className="text-xs text-text-muted">{receipt.uploadedAt}</p>
          </div>
          <p className="text-lg font-black text-gold">
            {receipt.amount.toLocaleString('uz-UZ')} so'm
          </p>
        </div>

        <AiBadge verdict={receipt.aiVerdict} extractedAmount={receipt.aiExtractedAmount} />

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 !border-red-500/40 !text-red-400 hover:!bg-red-500 hover:!text-white"
            onClick={() => onReject(receipt.id)}
            loading={isProcessing}
          >
            <XIcon className="h-4 w-4" />
            Rad etish
          </Button>
          <Button className="flex-1" onClick={() => onApprove(receipt.id)} loading={isProcessing}>
            <CheckIcon className="h-4 w-4" />
            Tasdiqlash
          </Button>
        </div>
      </div>
    </div>
  )
}
