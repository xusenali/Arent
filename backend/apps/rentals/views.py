import datetime
import math

from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User
from apps.users.permissions import IsSuperAdmin, IsWorker

from .models import Rental, RentalMedia
from .serializers import RentalMediaSerializer, RentalSerializer


class AdminWorkerActiveRentalView(APIView):
    """GET /api/admin/workers/:worker_id/rental — faol yoki muddati o'tgan ijarasi."""

    permission_classes = [IsSuperAdmin]

    def get(self, request, worker_id):
        rental = (
            Rental.objects.select_related('unit')
            .filter(worker_id=worker_id)
            .exclude(status=Rental.Status.COMPLETED)
            .order_by('-start_date')
            .first()
        )
        if not rental:
            return Response(None)

        today = timezone.now().date()
        return Response({
            'id':          str(rental.id),
            'unit_model':  rental.unit.model_name,
            'unit_type':   rental.unit.unit_type,
            'period_days': rental.period_days,
            'pay_timing':  rental.pay_timing,
            'start_date':  str(rental.start_date),
            'due_date':    str(rental.due_date),
            'status':      rental.status,
            'days_left':   (rental.due_date - today).days,
        })


class AdminRentalCreateView(generics.CreateAPIView):
    """POST /api/admin/workers/:id/rentals — transportni ishchiga biriktirib ijara ochadi."""

    serializer_class = RentalSerializer
    permission_classes = [IsSuperAdmin]

    def perform_create(self, serializer):
        from apps.rentals.tasks import _period_amount
        from apps.payments.models import Payment

        worker = get_object_or_404(User, id=self.kwargs['worker_id'], role=User.Role.WORKER)
        rental = serializer.save(worker=worker)

        # pay_timing='start' da darhol to'lov yaratamiz (ishchi oldindan to'laydi)
        if rental.pay_timing == Rental.PayTiming.START:
            Payment.objects.create(rental=rental, amount=_period_amount(rental), is_fine=False)


class AdminRentalMediaView(generics.ListCreateAPIView):
    """
    GET  /api/admin/workers/:id/rental-media — passport rasm + video
    POST — passport rasmi/video yuklash (README §8)
    """

    serializer_class = RentalMediaSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        return RentalMedia.objects.filter(rental__worker_id=self.kwargs['worker_id'])

    def perform_create(self, serializer):
        rental = (
            Rental.objects.filter(worker_id=self.kwargs['worker_id'])
            .exclude(status=Rental.Status.COMPLETED)
            .order_by('-start_date')
            .first()
        )
        if not rental:
            raise ValidationError("Bu ishchining faol ijarasi topilmadi")
        serializer.save(rental=rental)


class AdminEndRentalView(APIView):
    """POST /api/admin/workers/:worker_id/rental/end — admin ijarani yakunlaydi."""

    permission_classes = [IsSuperAdmin]

    def post(self, request, worker_id):
        with transaction.atomic():
            rental = (
                Rental.objects.select_related('unit')
                .filter(worker_id=worker_id)
                .exclude(status=Rental.Status.COMPLETED)
                .order_by('-start_date')
                .first()
            )
            if not rental:
                return Response({'detail': 'Faol ijara topilmadi.'}, status=404)

            from apps.payments.models import Payment

            Payment.objects.filter(rental=rental, is_fine=True, paid_at__isnull=True).delete()

            rental.status = Rental.Status.COMPLETED
            rental.save(update_fields=['status'])

            from apps.electro_units.models import ElectroUnit
            rental.unit.status = ElectroUnit.Status.AVAILABLE
            rental.unit.save(update_fields=['status'])

        return Response({'detail': 'Ijara yakunlandi.'})


def _materialize_overdue(rental, today):
    """
    pay_timing='end' va due_date <= today bo'lganda ishchi dashboardini ochganda
    idempotent tarzda chaqiriladi:
      1. Davr to'lovi yaratilmagan bo'lsa — yaratadi
      2. Status hali ACTIVE bo'lsa — OVERDUE ga o'tkazadi
      3. Bugungi kunlik jarima qo'yilmagan bo'lsa — qo'yadi
    Qaytaradi: yangilangan rental obyektini.
    """
    from apps.payments.models import Payment
    from apps.rentals.tasks import _period_amount, _daily_fine_amount

    with transaction.atomic():
        rental = Rental.objects.select_for_update().select_related('unit').get(pk=rental.pk)

        if not Payment.objects.filter(rental=rental, is_fine=False, paid_at__isnull=True).exists():
            Payment.objects.create(rental=rental, amount=_period_amount(rental), is_fine=False)

        if rental.status == Rental.Status.ACTIVE:
            rental.status = Rental.Status.OVERDUE
            rental.save(update_fields=['status'])

        if rental.status == Rental.Status.OVERDUE:
            if not Payment.objects.filter(rental=rental, is_fine=True, created_at__date=today).exists():
                Payment.objects.create(
                    rental=rental,
                    amount=_daily_fine_amount(rental),
                    is_fine=True,
                    fine_days_count=1,
                )

    return rental


class WorkerDashboardView(APIView):
    """GET /api/worker/dashboard"""

    permission_classes = [IsWorker]

    def get(self, request):
        from apps.payments.models import Payment, PaymentReceipt
        from apps.rentals.tasks import _daily_fine_amount

        rental = (
            Rental.objects.filter(worker=request.user)
            .exclude(status=Rental.Status.COMPLETED)
            .select_related('unit')
            .order_by('-start_date')
            .first()
        )

        if not rental:
            return Response({
                'rental': None,
                'telegram_connected': bool(request.user.telegram_chat_id),
            })

        today     = timezone.localdate()
        days_left = (rental.due_date - today).days

        # pay_timing='end' va muddati o'tgan bo'lsa — lazily to'g'rilash
        if rental.pay_timing == Rental.PayTiming.END and days_left <= 0:
            rental = _materialize_overdue(rental, today)

        # Pending davr to'lovi (jarima emas)
        pending_period = (
            Payment.objects.filter(rental=rental, is_fine=False, paid_at__isnull=True)
            .order_by('created_at')
            .first()
        )

        # Jami ochiq jarimalar
        total_fine = (
            Payment.objects.filter(rental=rental, is_fine=True, paid_at__isnull=True)
            .aggregate(s=Sum('amount'))['s'] or 0
        )

        # Pending to'lov uchun oxirgi chek holati
        last_receipt_status = None
        if pending_period:
            last_receipt = (
                PaymentReceipt.objects.filter(payment=pending_period)
                .order_by('-uploaded_at')
                .first()
            )
            last_receipt_status = last_receipt.status if last_receipt else None

        # Pro-rate (erta yakunlash uchun ko'rsatish)
        last_period_start = rental.due_date - datetime.timedelta(days=rental.period_days)
        days_used = min(max(1, (today - last_period_start).days), rental.period_days or 1)
        prorated_amount = 0
        if pending_period and rental.period_days:
            prorated_amount = math.ceil(pending_period.amount / rental.period_days * days_used)

        return Response({
            'rental_id':              rental.id,
            'unit_model':             rental.unit.model_name,
            'unit_type':              rental.unit.unit_type,
            'start_date':             rental.start_date,
            'due_date':               rental.due_date,
            'days_left':              days_left,
            'status':                 rental.status,
            'pay_timing':             rental.pay_timing,
            'period_days':            rental.period_days,
            'has_pending_payment':    pending_period is not None,
            'pending_payment_amount': pending_period.amount if pending_period else 0,
            'total_due':              (pending_period.amount if pending_period else 0) + total_fine,
            'prorated_amount':        prorated_amount,
            'days_used':              days_used,
            'current_fine':           total_fine,
            'last_receipt_status':    last_receipt_status,
            'telegram_connected':     bool(request.user.telegram_chat_id),
            'daily_fine_rate':        _daily_fine_amount(rental),
        })


class WorkerEndRentalView(APIView):
    """POST /api/worker/rental/end — ishchi ijarani muddatidan oldin yakunlaydi."""

    permission_classes = [IsWorker]

    def post(self, request):
        with transaction.atomic():
            rental = (
                Rental.objects.select_related('unit')
                .filter(worker=request.user)
                .exclude(status=Rental.Status.COMPLETED)
                .order_by('-start_date')
                .first()
            )
            if not rental:
                return Response({'detail': 'Faol ijara topilmadi.'}, status=404)

            from apps.payments.models import Payment

            today = timezone.localdate()

            # Pending davr to'lovi
            pending_period = (
                Payment.objects.filter(rental=rental, is_fine=False, paid_at__isnull=True)
                .order_by('created_at')
                .first()
            )

            prorated_amount = 0
            if pending_period and rental.period_days > 0:
                last_period_start = rental.due_date - datetime.timedelta(days=rental.period_days)
                days_used = max(1, (today - last_period_start).days)
                days_used = min(days_used, rental.period_days)
                daily_rate      = pending_period.amount / rental.period_days
                prorated_amount = math.ceil(daily_rate * days_used)
                pending_period.amount = prorated_amount
                pending_period.save(update_fields=['amount'])

            # Ochiq jarimalarni bekor qilish
            Payment.objects.filter(rental=rental, is_fine=True, paid_at__isnull=True).delete()

            # Ijarani yakunlash
            rental.status = Rental.Status.COMPLETED
            rental.save(update_fields=['status'])

            # Transportni bo'sh qilish
            from apps.electro_units.models import ElectroUnit
            rental.unit.status = ElectroUnit.Status.AVAILABLE
            rental.unit.save(update_fields=['status'])

        return Response({
            'detail': 'Ijara yakunlandi.',
            'has_pending_payment': pending_period is not None,
            'prorated_amount':     prorated_amount,
        })
