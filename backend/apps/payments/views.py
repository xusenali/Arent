from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rentals.models import Rental
from apps.users.permissions import IsSuperAdmin, IsWorker

from .models import Payment, PaymentReceipt
from .serializers import (
    PaymentReceiptSerializer,
    PaymentSerializer,
    WorkerReceiptUploadSerializer,
)


class AdminWorkerPaymentsView(generics.ListAPIView):
    """GET /api/admin/workers/:id/payments"""

    serializer_class = PaymentSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        return Payment.objects.filter(rental__worker_id=self.kwargs['worker_id'])


class AdminPaymentReceiptListView(generics.ListAPIView):
    """GET /api/admin/payment-receipts ?status=pending"""

    serializer_class = PaymentReceiptSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        queryset = PaymentReceipt.objects.select_related('payment__rental__worker')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


class BaseReceiptReviewView(APIView):
    permission_classes = [IsSuperAdmin]
    target_status = None

    def post(self, request, id):
        receipt = get_object_or_404(PaymentReceipt, id=id)
        receipt.status = self.target_status
        receipt.reviewed_by = request.user
        receipt.reviewed_at = timezone.now()
        receipt.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

        if self.target_status == PaymentReceipt.Status.APPROVED:
            self._close_payment(receipt.payment)

        return Response(PaymentReceiptSerializer(receipt).data)

    @staticmethod
    def _close_payment(payment):
        payment.paid_at = timezone.now()
        payment.save(update_fields=['paid_at'])

        rental = payment.rental
        has_open_balance = Payment.objects.filter(
            rental=rental, paid_at__isnull=True,
        ).exclude(id=payment.id).exists()

        if not has_open_balance and rental.status == Rental.Status.OVERDUE:
            rental.status = Rental.Status.ACTIVE
            rental.save(update_fields=['status'])


class ApproveReceiptView(BaseReceiptReviewView):
    """POST /api/admin/payment-receipts/:id/approve"""

    target_status = PaymentReceipt.Status.APPROVED


class RejectReceiptView(BaseReceiptReviewView):
    """POST /api/admin/payment-receipts/:id/reject"""

    target_status = PaymentReceipt.Status.REJECTED


class WorkerReceiptUploadView(APIView):
    """POST /api/worker/payment-receipts — chek surati yuklash"""

    permission_classes = [IsWorker]

    def post(self, request):
        serializer = WorkerReceiptUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        rental = (
            Rental.objects.filter(worker=request.user)
            .exclude(status=Rental.Status.COMPLETED)
            .order_by('-start_date')
            .first()
        )
        if not rental:
            raise ValidationError("Faol ijara topilmadi")

        payment = (
            Payment.objects.filter(rental=rental, paid_at__isnull=True)
            .order_by('created_at')
            .first()
        )
        if not payment:
            payment = Payment.objects.create(
                rental=rental,
                amount=rental.unit.price_per_day * rental.period_days,
                is_fine=False,
            )

        receipt = PaymentReceipt.objects.create(
            payment=payment,
            receipt_image=serializer.validated_data['receipt_image'],
        )
        return Response(PaymentReceiptSerializer(receipt).data, status=status.HTTP_201_CREATED)
