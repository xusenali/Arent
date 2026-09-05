from django.urls import path

from .views import (
    AdminCashPaymentView,
    AdminPaymentReceiptListView,
    AdminUpcomingPaymentsView,
    AdminWorkerPaymentsView,
    ApproveReceiptView,
    RejectReceiptView,
    WorkerReceiptUploadView,
)

urlpatterns = [
    path(
        'api/admin/workers/<uuid:worker_id>/payments',
        AdminWorkerPaymentsView.as_view(),
        name='admin-worker-payments',
    ),
    path('api/admin/payment-receipts',             AdminPaymentReceiptListView.as_view(), name='admin-receipts-list'),
    path('api/admin/payment-receipts/<uuid:id>/approve', ApproveReceiptView.as_view(),   name='admin-receipt-approve'),
    path('api/admin/payment-receipts/<uuid:id>/reject',  RejectReceiptView.as_view(),    name='admin-receipt-reject'),
    path('api/admin/upcoming-payments',            AdminUpcomingPaymentsView.as_view(),  name='admin-upcoming-payments'),
    path('api/admin/cash-payment',                 AdminCashPaymentView.as_view(),       name='admin-cash-payment'),
    path('api/worker/payment-receipts',            WorkerReceiptUploadView.as_view(),    name='worker-receipt-upload'),
]
