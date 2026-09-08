from django.urls import path

from .views import (
    AdminCashPaymentView,
    AdminPaymentCardView,
    AdminPaymentCorrectionView,
    AdminWorkerPaymentsView,
    ApproveReceiptView,
    RejectReceiptView,
    WorkerReceiptUploadView,
)

urlpatterns = [
    path(
        'api/admin/workers/<uuid:worker_id>/payments',
        AdminWorkerPaymentsView.as_view(), name='admin-worker-payments',
    ),
    path(
        'api/admin/payment-receipts/<uuid:id>/approve',
        ApproveReceiptView.as_view(), name='admin-receipt-approve',
    ),
    path(
        'api/admin/payment-receipts/<uuid:id>/reject',
        RejectReceiptView.as_view(), name='admin-receipt-reject',
    ),
    path('api/admin/cash-payment', AdminCashPaymentView.as_view(), name='admin-cash-payment'),
    path('api/admin/payment-card', AdminPaymentCardView.as_view(), name='admin-payment-card'),
    path(
        'api/admin/payment-correction',
        AdminPaymentCorrectionView.as_view(), name='admin-payment-correction',
    ),
    path(
        'api/worker/payment-receipts',
        WorkerReceiptUploadView.as_view(), name='worker-receipt-upload',
    ),
]
