import datetime

from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.users.models import User
from apps.users.permissions import IsSuperAdmin

from .models import WorkerApplication
from .serializers import AdminApplicationSerializer, WorkerApplicationSerializer


class PublicWorkerApplicationCreateView(generics.CreateAPIView):
    """POST /api/public/worker-applications"""
    serializer_class = WorkerApplicationSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'otp-request'


class AdminApplicationListView(generics.ListAPIView):
    """GET /api/admin/applications ?status=pending"""
    serializer_class = AdminApplicationSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        qs = WorkerApplication.objects.select_related('unit')
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        return qs


class AdminApplicationApproveView(APIView):
    """POST /api/admin/applications/:id/approve

    1. Ishchi user yaratadi (telefon = parol)
    2. Transportni 'rented' qiladi
    3. Ijara yaratadi (7 kun default)
    4. Arizani 'approved' qiladi
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request, id):
        app = generics.get_object_or_404(
            WorkerApplication.objects.select_related('unit'), id=id,
        )

        if app.status != WorkerApplication.Status.PENDING:
            return Response({'detail': 'Ariza allaqachon ko\'rib chiqilgan.'}, status=400)

        phone = app.phone
        if User.objects.filter(phone=phone).exists():
            return Response({'detail': 'Bu telefon raqam bilan foydalanuvchi allaqachon mavjud.'}, status=400)

        with transaction.atomic():
            raw_password = phone.replace('+', '').replace(' ', '')
            worker = User.objects.create_user(
                phone=phone,
                full_name=app.full_name,
                role=User.Role.WORKER,
                status=User.Status.ACTIVE,
                password=raw_password,
            )

            if app.unit:
                from apps.electro_units.models import ElectroUnit
                from apps.rentals.models import Rental
                from apps.payments.models import Payment
                from .utils import calc_amount, PERIOD_DAYS

                app.unit.status = ElectroUnit.Status.RENTED
                app.unit.save(update_fields=['status'])

                period_days = PERIOD_DAYS.get(app.period_type, 7)
                today = timezone.now().date()
                rental = Rental.objects.create(
                    worker=worker,
                    unit=app.unit,
                    start_date=today,
                    period_days=period_days,
                    due_date=today + datetime.timedelta(days=period_days),
                    pay_timing=app.pay_timing,
                    status=Rental.Status.ACTIVE,
                )

                total = calc_amount(app.unit, app.period_type, app.battery_count)
                if app.pay_timing == WorkerApplication.PayTiming.START:
                    Payment.objects.create(rental=rental, amount=total, is_fine=False)
                # pay_timing='end': to'lov due_date da Celery task orqali yaratiladi

            app.status = WorkerApplication.Status.APPROVED
            app.save(update_fields=['status'])

        return Response(AdminApplicationSerializer(app).data)


class AdminApplicationRejectView(APIView):
    """POST /api/admin/applications/:id/reject"""
    permission_classes = [IsSuperAdmin]

    def post(self, request, id):
        app = generics.get_object_or_404(WorkerApplication, id=id)
        if app.status != WorkerApplication.Status.PENDING:
            return Response({'detail': 'Ariza allaqachon ko\'rib chiqilgan.'}, status=400)
        app.status = WorkerApplication.Status.REJECTED
        app.save(update_fields=['status'])
        return Response(AdminApplicationSerializer(app).data)
