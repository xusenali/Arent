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
    """
    POST /api/admin/workers/:id/rentals — transportni ishchiga biriktirib
    ijara ochadi. README jadvalida alohida ko'rsatilmagan, ammo §8'da
    tasvirlangan "ijara yaratilishi bilan bir vaqtda" oqimi shu endpointsiz
    amalga oshmaydi — mavjud CRUD to'plamini to'ldiruvchi qo'shimcha.
    """

    serializer_class = RentalSerializer
    permission_classes = [IsSuperAdmin]

    def perform_create(self, serializer):
        worker = get_object_or_404(User, id=self.kwargs['worker_id'], role=User.Role.WORKER)
        serializer.save(worker=worker)


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


class WorkerDashboardView(APIView):
    """GET /api/worker/dashboard"""

    permission_classes = [IsWorker]

    def get(self, request):
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

        from apps.payments.models import Payment, PaymentReceipt

        today     = timezone.localdate()
        days_left = (rental.due_date - today).days

        # Pending davr to'lovi (jarima emas)
        pending_period = (
            Payment.objects.filter(rental=rental, is_fine=False, paid_at__isnull=True)
            .order_by('created_at')
            .first()
        )

        # Jami ochiq jarima
        total_fine = (
            Payment.objects.filter(rental=rental, is_fine=True, paid_at__isnull=True)
            .aggregate(s=Sum('amount'))['s'] or 0
        )

        # Pending to'lovning oxirgi cheki
        last_receipt_status = None
        if pending_period:
            last_receipt = (
                PaymentReceipt.objects.filter(payment=pending_period)
                .order_by('-uploaded_at')
                .first()
            )
            last_receipt_status = last_receipt.status if last_receipt else None

        # Pro-rate hisoblash (arenda yakunlanishida ko'rsatish uchun)
        last_period_start = rental.due_date - datetime.timedelta(days=rental.period_days)
        days_used = max(1, (today - last_period_start).days)
        days_used = min(days_used, rental.period_days)
        if pending_period and rental.period_days > 0:
            daily_rate    = pending_period.amount / rental.period_days
            prorated_amount = math.ceil(daily_rate * days_used)
        else:
            prorated_amount = 0

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
            'prorated_amount':        prorated_amount,
            'days_used':              days_used,
            'current_fine':           total_fine,
            'last_receipt_status':    last_receipt_status,
            'telegram_connected':     bool(request.user.telegram_chat_id),
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
