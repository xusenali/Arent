import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReceiptCard from '../../components/ui/ReceiptCard.jsx'
import { approvePaymentReceipt, fetchPaymentReceipts, rejectPaymentReceipt } from '../../api/adminApi.js'

function mapReceipt(item) {
  return {
    id: item.id,
    workerName: item.worker_name,
    amount: Number(item.amount),
    uploadedAt: new Date(item.uploaded_at).toLocaleString('uz-UZ'),
    imageUrl: item.receipt_image,
  }
}

export default function PaymentReceiptsPage() {
  const { t } = useTranslation()
  const [receipts, setReceipts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    fetchPaymentReceipts('pending')
      .then((data) => setReceipts(data.map(mapReceipt)))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [])

  async function resolveReceipt(id, action) {
    setProcessingId(id)
    try {
      if (action === 'approve') await approvePaymentReceipt(id)
      else await rejectPaymentReceipt(id)
      setReceipts((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div>
      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl font-black text-text sm:text-2xl">{t('receipts.title')}</h1>
        <p className="text-xs text-text-muted sm:text-sm">{t('receipts.subtitle')}</p>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {isLoading ? (
        <p className="text-text-muted">{t('common.loading')}</p>
      ) : receipts.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-12 text-center text-sm text-text-muted">
          {t('receipts.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {receipts.map((receipt) => (
            <ReceiptCard
              key={receipt.id}
              receipt={receipt}
              onApprove={(id) => resolveReceipt(id, 'approve')}
              onReject={(id) => resolveReceipt(id, 'reject')}
              isProcessing={processingId === receipt.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
