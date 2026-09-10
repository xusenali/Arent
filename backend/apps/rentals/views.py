import datetime
import math
from decimal import Decimal

from django.db import transaction

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments import services as payment_services
from apps.payments.models import Payment, PaymentCard, PaymentReceipt
from apps.users.models import User
from apps.users.permissions import IsSuperAdmin, IsWorker

from . import services
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
        worker = get_object_or_404(User, id=self.kwargs['worker_id'], role=User.Role.WORKER)
        rental = serializer.save(worker=worker)

        # pay_timing='start' — ishchi oldindan to'laydi, qarz darhol yoziladi.
        if rental.pay_timing == Rental.PayTiming.START:
            Payment.objects.create(
                rental=rental, amount=payment_services.period_amount(rental), is_fine=False,
            )


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


def _settlement_payload(rental, result):
    """Hisob-kitobni frontend uchun tayyorlaydi."""
    return {
        'rental_id':     str(rental.id),
        'unit_model':    rental.unit.model_name,
        'pay_timing':    rental.pay_timing,
        'period_days':   rental.period_days,
        'due_date':      rental.due_date,
        'days_used':     result.days_used,
        'unused_days':   result.unused_days,
        'daily_rate':    result.daily_rate,
        'refund':        result.refund,
        'charge_due':    result.charge_due,
        'fine_due':      result.fine_due,
        'net':           result.net,
        # Aniqlik uchun: kim kimga to'laydi.
        'refund_to_worker':  result.refund_to_worker,
        'payable_by_worker': result.payable_by_worker,
    }


class AdminRentalSettlementView(APIView):
    """Ijarani erta yakunlash — hisob-kitob bilan.

    GET  /api/admin/workers/:worker_id/rental/settlement — hisobni ko'rsatadi
    POST /api/admin/workers/:worker_id/rental/settlement — yozib, yakunlaydi

    Oldindan to'lagan ishchiga foydalanilmagan kunlar uchun pul qaytariladi;
    oxirida to'laydigan ishchidan faqat ishlagan kuni uchun haq olinadi.
    Har ikki holatda transport bo'shaydi va ishchi arxivga tushadi.
    """

    permission_classes = [IsSuperAdmin]

    def _get_rental(self, worker_id):
        rental = (
            Rental.objects.select_related('unit', 'worker')
            .filter(worker_id=worker_id)
            .exclude(status=Rental.Status.COMPLETED)
            .order_by('-start_date')
            .first()
        )
        if not rental:
            raise NotFound('Faol ijara topilmadi.')
        return rental

    def get(self, request, worker_id):
        rental = self._get_rental(worker_id)
        # Hisob bugungi holatga tayanadi — avval jarima/davrni yangilab olamiz.
        rental = payment_services.sync_rental_state(rental)
        result = payment_services.settlement_preview(rental)
        return Response(_settlement_payload(rental, result))

    def post(self, request, worker_id):
        rental = self._get_rental(worker_id)
        rental = payment_services.sync_rental_state(rental)
        try:
            result = payment_services.settle_and_close_rental(rental, actor=request.user)
        except payment_services.PaymentError as exc:
            return Response({'detail': str(exc)}, status=400)

        rental.refresh_from_db()
        return Response({
            'detail': 'Ijara yakunlandi va hisob-kitob yozildi.',
            **_settlement_payload(rental, result),
        })


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

            # Jarima o'chirilmaydi — kim bekor qilgani ko'rinib turishi uchun
            # yozuv qoladi (paid_amount=0). Transport ham shu yerda bo'shaydi.
            services.end_rental(
                rental, actor=request.user,
                note=f"Ijara yakunlanganda bekor qilindi ({request.user.full_name})",
            )

        return Response({'detail': 'Ijara yakunlandi.'})


def _card_payload():
    """Admin kiritgan to'lov kartasi (kiritilmagan bo'lsa None)."""
    card = PaymentCard.load()
    if not card:
        return None
    return {'number': card.number, 'holder': card.holder, 'bank': card.bank}


def _prorate(rental, pending_period, today):
    """Erta yakunlashda haqiqatda foydalanilgan kunlar uchun summa.

    Qaytaradi: ``(summa, foydalanilgan_kunlar)``.
    """
    if not pending_period or not rental.period_days:
        return 0, 0
    period_start = rental.due_date - datetime.timedelta(days=rental.period_days)
    days_used = min(max(1, (today - period_start).days), rental.period_days)
    amount = math.ceil(Decimal(pending_period.amount) / rental.period_days * days_used)
    return amount, days_used


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

        today = timezone.localdate()

        # Holatni bugungi sanaga moslash — Celery ishlamay qolsa ham dashboard
        # to'g'ri ma'lumot ko'rsatadi (idempotent).
        rental = payment_services.sync_rental_state(rental, today)
        days_left = (rental.due_date - today).days

        pending_period = payment_services.open_period_payment(rental)
        debt = payment_services.outstanding(rental)

        last_receipt_status = (
            PaymentReceipt.objects
            .filter(payment=pending_period)
            .order_by('-uploaded_at')
            .values_list('status', flat=True)
            .first()
            if pending_period else None
        )

        # Erta yakunlashda to'lanadigan summa (faqat ko'rsatish uchun).
        prorated_amount, days_used = _prorate(rental, pending_period, today)

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
            'pending_payment_amount': debt.period,
            'current_fine':           debt.fine,
            'total_due':              debt.total,
            'prorated_amount':        prorated_amount,
            'days_used':              days_used,
            'last_receipt_status':    last_receipt_status,
            'telegram_connected':     bool(request.user.telegram_chat_id),
            'daily_fine_rate':        payment_services.daily_fine_amount(rental),
            # Ishchi to'lov modalida shu kartaga pul o'tkazadi.
            'payment_card':           _card_payload(),
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

            today = timezone.localdate()

            # Ochiq davr qarzi foydalanilgan kunlarga qarab kamaytiriladi,
            # lekin yopilmaydi — pul haqiqatda olinmagan.
            pending_period = payment_services.open_period_payment(rental)
            prorated_amount, _ = _prorate(rental, pending_period, today)
            if prorated_amount:
                pending_period.amount = prorated_amount
                pending_period.note   = 'Erta yakunlash — foydalanilgan kunlar uchun'
                pending_period.save(update_fields=['amount', 'note'])

            # Ijarani yakunlaydi, jarimalarni bekor qiladi va transportni bo'shatadi.
            services.end_rental(
                rental, actor=request.user, note='Ishchi ijarani erta yakunladi',
            )

        return Response({
            'detail': 'Ijara yakunlandi.',
            'has_pending_payment': pending_period is not None,
            'prorated_amount':     prorated_amount,
        })
