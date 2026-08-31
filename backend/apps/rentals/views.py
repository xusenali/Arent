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
            return Response({'rental': None})

        from apps.payments.models import Payment, PaymentReceipt

        days_left = (rental.due_date - timezone.localdate()).days
        # README §12 ochiq savoli: summasi price_per_day * period_days sifatida hisoblanmoqda
        amount_due = rental.unit.price_per_day * rental.period_days
        current_fine = (
            Payment.objects.filter(rental=rental, is_fine=True, paid_at__isnull=True)
            .values_list('amount', flat=True)
        )
        total_fine = sum(current_fine) if current_fine else 0

        last_receipt = (
            PaymentReceipt.objects.filter(payment__rental=rental)
            .order_by('-uploaded_at')
            .first()
        )

        return Response({
            'rental_id': rental.id,
            'unit_model': rental.unit.model_name,
            'start_date': rental.start_date,
            'due_date': rental.due_date,
            'days_left': days_left,
            'status': rental.status,
            'amount_due': amount_due,
            'current_fine': total_fine,
            'last_receipt_status': last_receipt.status if last_receipt else None,
        })
