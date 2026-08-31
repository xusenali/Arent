import Button from './Button.jsx'
import { CheckIcon, XIcon } from './icons.jsx'

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
