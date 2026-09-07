"""To'lov endpointlari.

Barcha pul mantig'i ``services`` modulida — bu yerda faqat HTTP qatlami:
kirishni tekshirish, servisni chaqirish, natijani qaytarish.
"""

import logging

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rentals.models import Rental
from apps.users.permissions import IsSuperAdmin, IsWorker

from . import services
from .models import Payment, PaymentReceipt
from .serializers import (
    AdminWorkerPaymentSerializer,
    CashPaymentSerializer,
    ConfirmPaymentSerializer,
    ReceiptInlineSerializer,
    RejectReceiptSerializer,
    WorkerReceiptUploadSerializer,
)

logger = logging.getLogger(__name__)


def _bad_request(exc: services.PaymentError) -> Response:
    return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class AdminWorkerPaymentsView(generics.ListAPIView):
    """GET /api/admin/workers/:worker_id/payments — to'lovlar tarixi + kutilayotgan cheklar."""

    serializer_class   = AdminWorkerPaymentSerializer
    permission_classes = [IsSuperAdmin]
    pagination_class   = None

    def get_queryset(self):
        return (
            Payment.objects
            .filter(rental__worker_id=self.kwargs['worker_id'])
            .select_related('rental__unit', 'received_by')
            .prefetch_related('receipts__reviewed_by')
            .order_by('-created_at')
        )


class ApproveReceiptView(APIView):
    """POST /api/admin/payment-receipts/:id/approve  { amount, days, note? }

    Admin chekni ko'rib, olingan summani va necha kunga amal qilishini qo'lda kiritadi.
    """

    permission_classes = [IsSuperAdmin]

    def post(self, request, id):
        payload = ConfirmPaymentSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        receipt = get_object_or_404(
            PaymentReceipt.objects.select_related('payment__rental'),
            id=id,
        )
        if receipt.status != PaymentReceipt.Status.PENDING:
            return Response(
                {'detail': "Bu chek allaqachon ko'rib chiqilgan."},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            amount = services.parse_amount(payload.validated_data['amount'])
            days   = services.parse_days(payload.validated_data['days'])
        except services.PaymentError as exc:
            return _bad_request(exc)

        try:
            with transaction.atomic():
                # Bir vaqtda ikki admin tasdiqlashining oldini oladi.
                locked = (
                    PaymentReceipt.objects
                    .select_for_update()
                    .select_related('payment__rental')
                    .get(pk=receipt.pk)
                )
                if locked.status != PaymentReceipt.Status.PENDING:
                    raise services.PaymentError("Bu chek allaqachon ko'rib chiqilgan.")

                services.confirm_payment(
                    rental=locked.payment.rental,
                    amount=amount,
                    days=days,
                    method=Payment.Method.RECEIPT,
                    actor=request.user,
                    receipt=locked,
                    note=payload.validated_data.get('note', ''),
                )

                locked.status      = PaymentReceipt.Status.APPROVED
                locked.reviewed_by = request.user
                locked.reviewed_at = timezone.now()
                locked.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])
        except services.PaymentError as exc:
            return _bad_request(exc)

        return Response(ReceiptInlineSerializer(locked).data)


class RejectReceiptView(APIView):
    """POST /api/admin/payment-receipts/:id/reject  { reason? }"""

    permission_classes = [IsSuperAdmin]

    def post(self, request, id):
        payload = RejectReceiptSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        with transaction.atomic():
            receipt = get_object_or_404(
                PaymentReceipt.objects.select_for_update(), id=id,
            )
            if receipt.status != PaymentReceipt.Status.PENDING:
                return Response(
                    {'detail': "Bu chek allaqachon ko'rib chiqilgan."},
                    status=status.HTTP_409_CONFLICT,
                )

            receipt.status        = PaymentReceipt.Status.REJECTED
            receipt.reviewed_by   = request.user
            receipt.reviewed_at   = timezone.now()
            receipt.reject_reason = payload.validated_data.get('reason', '')[:255]
            receipt.save(update_fields=[
                'status', 'reviewed_by', 'reviewed_at', 'reject_reason',
            ])

        return Response(ReceiptInlineSerializer(receipt).data)


class AdminCashPaymentView(APIView):
    """POST /api/admin/cash-payment  { rental_id, amount, days, note? }

    "Naqd oldim" — admin pulni qo'lda qabul qilgani va necha kunni qoplashini yozadi.
    """

    permission_classes = [IsSuperAdmin]

    def post(self, request):
        payload = CashPaymentSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        rental = get_object_or_404(
            Rental.objects.select_related('unit', 'worker'),
            id=payload.validated_data['rental_id'],
            status__in=[Rental.Status.ACTIVE, Rental.Status.OVERDUE],
        )

        try:
            payment = services.confirm_payment(
                rental=rental,
                amount=services.parse_amount(payload.validated_data['amount']),
                days=services.parse_days(payload.validated_data['days']),
                method=Payment.Method.CASH,
                actor=request.user,
                note=payload.validated_data.get('note', ''),
            )
        except services.PaymentError as exc:
            return _bad_request(exc)

        rental.refresh_from_db(fields=['due_date', 'status'])
        return Response({
            'payment':      AdminWorkerPaymentSerializer(payment).data,
            'due_date':     rental.due_date,
            'rental_status': rental.status,
        }, status=status.HTTP_201_CREATED)


class WorkerReceiptUploadView(APIView):
    """POST /api/worker/payment-receipts — ishchi to'lov chekini yuklaydi."""

    permission_classes = [IsWorker]

    def post(self, request):
        payload = WorkerReceiptUploadSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        rental = (
            Rental.objects.select_related('unit')
            .filter(worker=request.user)
            .exclude(status=Rental.Status.COMPLETED)
            .order_by('-start_date')
            .first()
        )
        if not rental:
            raise ValidationError("Faol ijara topilmadi.")

        with transaction.atomic():
            # Chek doim davr to'loviga bog'lanadi — jarimaga emas.
            payment = services.open_period_payment(rental)
            if payment is None:
                payment = Payment.objects.create(
                    rental=rental, amount=services.period_amount(rental), is_fine=False,
                )

            if PaymentReceipt.objects.filter(
                payment=payment, status=PaymentReceipt.Status.PENDING,
            ).exists():
                raise ValidationError(
                    "Oldingi chekingiz hali ko'rib chiqilmoqda. Iltimos, kuting.",
                )

            receipt = PaymentReceipt.objects.create(
                payment=payment,
                receipt_image=payload.validated_data['receipt_image'],
            )

        return Response(ReceiptInlineSerializer(receipt).data, status=status.HTTP_201_CREATED)
