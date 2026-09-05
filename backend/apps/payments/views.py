import datetime
import logging

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

logger = logging.getLogger(__name__)

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
    UpcomingPaymentSerializer,
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
        queryset = PaymentReceipt.objects.select_related(
            'payment__rental__worker',
            'payment__rental__unit',
            'reviewed_by',
        )
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


class BaseReceiptReviewView(APIView):
    permission_classes = [IsSuperAdmin]
    target_status = None

    def post(self, request, id):
        receipt = get_object_or_404(
            PaymentReceipt.objects.select_related('payment__rental'),
            id=id,
        )
        with transaction.atomic():
            receipt.status      = self.target_status
            receipt.reviewed_by = request.user
            receipt.reviewed_at = timezone.now()
            receipt.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

            if self.target_status == PaymentReceipt.Status.APPROVED:
                confirmed_amount = request.data.get('amount')
                self._close_payment(receipt.payment, confirmed_amount)

        return Response(PaymentReceiptSerializer(receipt).data)

    @staticmethod
    def _close_payment(payment, confirmed_amount=None):
        update_fields = ['paid_at']
        if confirmed_amount:
            try:
                amt = int(str(confirmed_amount).replace(' ', '').replace(',', ''))
                if amt > 0:
                    payment.amount = amt
                    update_fields.append('amount')
            except (ValueError, TypeError):
                pass
        payment.paid_at = timezone.now()
        payment.save(update_fields=update_fields)

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
            from apps.applications.utils import calc_amount, PERIOD_DAYS
            _days_to_period = {v: k for k, v in PERIOD_DAYS.items()}   # {1:'daily', 7:'weekly', 30:'monthly'}
            period_type = _days_to_period.get(rental.period_days, 'weekly')
            amount = calc_amount(rental.unit, period_type)
            payment = Payment.objects.create(rental=rental, amount=amount, is_fine=False)

        receipt = PaymentReceipt.objects.create(
            payment=payment,
            receipt_image=serializer.validated_data['receipt_image'],
        )

        # Google Vision AI tahlili (sozlanmagan bo'lsa o'tkazib yuboriladi)
        try:
            from .services import analyze_receipt_image
            result = analyze_receipt_image(receipt.receipt_image.path)
            if result.get('verdict'):
                receipt.ai_verdict          = result['verdict']
                receipt.ai_extracted_amount = result['extracted_amount']
                receipt.ai_raw_text         = result['raw_text']
                receipt.save(update_fields=['ai_verdict', 'ai_extracted_amount', 'ai_raw_text'])
        except Exception as exc:
            logger.warning("AI tahlil xato: %s", exc)

        return Response(PaymentReceiptSerializer(receipt).data, status=status.HTTP_201_CREATED)


class AdminUpcomingPaymentsView(generics.ListAPIView):
    """GET /api/admin/upcoming-payments

    To'lov muddati yaqinlashgan yoki muddati o'tgan ijaralar.
    Deadline: bugundan 4 kun ichida due_date bo'lgan ACTIVE + barcha OVERDUE.
    """
    serializer_class = UpcomingPaymentSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        horizon = timezone.now().date() + datetime.timedelta(days=4)
        return (
            Rental.objects
            .select_related('worker', 'unit')
            .prefetch_related('payments')
            .filter(status__in=[Rental.Status.ACTIVE, Rental.Status.OVERDUE])
            .filter(due_date__lte=horizon)
            .order_by('due_date')
        )


class AdminCashPaymentView(APIView):
    """POST /api/admin/cash-payment  { rental_id, amount }

    Naqd pul qabul qilindi — admin kiritgan miqdorni saqlaydi va
    mavjud pending to'lovni to'langan deb belgilaydi.
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        rental_id      = request.data.get('rental_id')
        received_amount = request.data.get('amount')

        if not rental_id:
            return Response({'detail': 'rental_id majburiy.'}, status=400)
        if not received_amount:
            return Response({'detail': 'amount majburiy.'}, status=400)

        try:
            received_amount = int(str(received_amount).replace(' ', '').replace(',', ''))
            if received_amount <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({'detail': 'amount musbat son bo\'lishi kerak.'}, status=400)

        rental = get_object_or_404(
            Rental.objects.select_related('unit', 'worker'),
            id=rental_id,
            status__in=[Rental.Status.ACTIVE, Rental.Status.OVERDUE],
        )

        with transaction.atomic():
            payment = (
                Payment.objects.filter(rental=rental, paid_at__isnull=True, is_fine=False)
                .order_by('created_at')
                .first()
            )
            if not payment:
                payment = Payment.objects.create(rental=rental, amount=received_amount, is_fine=False)
            else:
                payment.amount = received_amount

            payment.paid_at = timezone.now()
            payment.save(update_fields=['amount', 'paid_at'])

            # Agar ijara OVERDUE bo'lsa va boshqa ochiq to'lov yo'q bo'lsa — ACTIVE ga qaytarish
            has_open = Payment.objects.filter(rental=rental, paid_at__isnull=True).exclude(id=payment.id).exists()
            if not has_open and rental.status == Rental.Status.OVERDUE:
                rental.status = Rental.Status.ACTIVE
                rental.save(update_fields=['status'])

        return Response({
            'detail': "Naqd to'lov qabul qilindi.",
            'payment_id': str(payment.id),
            'amount': str(payment.amount),
            'worker': rental.worker.full_name,
        })
