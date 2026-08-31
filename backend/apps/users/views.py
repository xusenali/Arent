from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.telegram_bot.otp import clear_otp, generate_otp_code, get_otp, store_otp
from apps.telegram_bot.services import send_otp_message

from .models import User
from .permissions import IsSuperAdmin
from .serializers import (
    ConfirmResetPasswordSerializer,
    PhoneTokenObtainPairSerializer,
    RequestOtpSerializer,
    UserSerializer,
    VerifyOtpSerializer,
    WorkerCreateSerializer,
    WorkerUpdateSerializer,
)


class LoginView(TokenObtainPairView):
    serializer_class = PhoneTokenObtainPairSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


class RequestPasswordResetView(APIView):
    """POST /api/auth/reset-password/request — Telegram orqali OTP yuboradi."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'otp-request'

    def post(self, request):
        serializer = RequestOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data['phone']

        user = User.objects.filter(phone=phone).first()
        if user and user.telegram_chat_id:
            code = generate_otp_code()
            store_otp(phone, code)
            send_otp_message(user.telegram_chat_id, code)

        # Foydalanuvchi mavjudligini oshkor qilmaslik uchun har doim bir xil javob
        return Response(
            {'detail': "Agar hisob Telegramga ulangan bo'lsa, kod yuborildi"},
            status=status.HTTP_200_OK,
        )


class VerifyOtpView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data['phone']
        code = serializer.validated_data['code']

        stored_code = get_otp(phone)
        if not stored_code or stored_code != code:
            return Response({'detail': "Kod noto'g'ri yoki muddati o'tgan"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'verified': True})


class ConfirmPasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ConfirmResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data['phone']
        code = serializer.validated_data['code']
        new_password = serializer.validated_data['new_password']

        stored_code = get_otp(phone)
        if not stored_code or stored_code != code:
            return Response({'detail': "Kod noto'g'ri yoki muddati o'tgan"}, status=status.HTTP_400_BAD_REQUEST)

        user = get_object_or_404(User, phone=phone)
        user.set_password(new_password)
        user.save(update_fields=['password'])
        clear_otp(phone)

        return Response({'detail': "Parol muvaffaqiyatli yangilandi"})


class WorkerListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/admin/workers  ?status=active|pending|overdue
    POST /api/admin/workers  — yangi ishchi (status=pending) yaratadi.

    README §6 jadvalida yaratish endpointi alohida ko'rsatilmagan, ammo
    "Kutilayotgan" tabini to'ldirish uchun zarur — mavjud CRUD to'plamini
    to'ldiruvchi qo'shimcha sifatida qo'shildi.
    """

    permission_classes = [IsSuperAdmin]
    queryset = User.objects.filter(role=User.Role.WORKER)

    def get_serializer_class(self):
        return WorkerCreateSerializer if self.request.method == 'POST' else UserSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter == 'overdue':
            worker_ids = queryset.filter(
                rentals__status='overdue'
            ).values_list('id', flat=True)
            return queryset.filter(id__in=worker_ids)
        if status_filter:
            return queryset.filter(status=status_filter)
        return queryset


class WorkerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/admin/workers/:id"""

    permission_classes = [IsSuperAdmin]
    queryset = User.objects.filter(role=User.Role.WORKER)
    lookup_field = 'id'

    def get_serializer_class(self):
        return WorkerUpdateSerializer if self.request.method == 'PATCH' else UserSerializer


class WorkerApproveView(APIView):
    """POST /api/admin/workers/:id/approve"""

    permission_classes = [IsSuperAdmin]

    def post(self, request, id):
        worker = get_object_or_404(User, id=id, role=User.Role.WORKER)
        worker.status = User.Status.ACTIVE
        worker.save(update_fields=['status'])
        return Response(UserSerializer(worker).data)


class WorkerDocumentUploadView(APIView):
    """POST /api/admin/workers/:id/documents — id_card yoki agreement_video yuklash."""

    permission_classes = [IsSuperAdmin]
    parser_classes = [__import__('rest_framework.parsers', fromlist=['MultiPartParser']).MultiPartParser]

    def post(self, request, id):
        worker = get_object_or_404(User, id=id, role=User.Role.WORKER)
        updated_fields = []

        for field in ('id_card_front', 'id_card_back', 'agreement_video'):
            if field in request.FILES:
                setattr(worker, field, request.FILES[field])
                updated_fields.append(field)

        if not updated_fields:
            return Response(
                {'detail': 'id_card_front, id_card_back yoki agreement_video fayli yuborilmadi'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        worker.save(update_fields=updated_fields)
        return Response(UserSerializer(worker, context={'request': request}).data)

    def delete(self, request, id):
        worker = get_object_or_404(User, id=id, role=User.Role.WORKER)
        doc_type = request.query_params.get('type')
        allowed = ('id_card_front', 'id_card_back', 'agreement_video')

        if doc_type not in allowed:
            return Response(
                {'detail': f'type= qiymati: {", ".join(allowed)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        field = getattr(worker, doc_type)
        if field:
            field.delete(save=True)

        return Response(UserSerializer(worker, context={'request': request}).data)


class WorkerLocationsView(APIView):
    """GET /api/admin/locations — faol ishchilarning oxirgi joylashuvi."""

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from apps.rentals.models import Rental

        workers = User.objects.filter(
            role=User.Role.WORKER,
            status=User.Status.ACTIVE,
            latitude__isnull=False,
            longitude__isnull=False,
        )

        result = []
        for worker in workers:
            rental = (
                Rental.objects.filter(
                    worker=worker,
                    status__in=[Rental.Status.ACTIVE, Rental.Status.OVERDUE],
                )
                .only('status')
                .first()
            )
            result.append({
                'worker_id': str(worker.id),
                'worker_name': worker.full_name,
                'latitude': float(worker.latitude),
                'longitude': float(worker.longitude),
                'rental_status': rental.status if rental else None,
                'recorded_at': worker.location_updated_at.isoformat() if worker.location_updated_at else None,
            })

        return Response(result)


class AdminDashboardStatsView(APIView):
    """GET /api/admin/dashboard/stats"""

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from datetime import timedelta
        from django.db.models import Sum
        from django.db.models.functions import TruncDate
        from apps.payments.models import Payment, PaymentReceipt
        from apps.rentals.models import Rental

        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        monthly_revenue = (
            Payment.objects.filter(paid_at__gte=month_start)
            .aggregate(total=Sum('amount'))
            .get('total')
            or 0
        )

        # So'nggi 30 kun uchun kunlik daromad
        thirty_days_ago = now - timedelta(days=30)
        daily_revenue_qs = (
            Payment.objects
            .filter(paid_at__gte=thirty_days_ago)
            .annotate(day=TruncDate('paid_at'))
            .values('day')
            .annotate(total=Sum('amount'))
            .order_by('day')
        )
        daily_revenue = [
            {'date': str(row['day']), 'amount': float(row['total'])}
            for row in daily_revenue_qs
        ]

        # Ishchi holatlari (donut chart)
        worker_stats = {
            'active': User.objects.filter(role=User.Role.WORKER, status=User.Status.ACTIVE).count(),
            'pending': User.objects.filter(role=User.Role.WORKER, status=User.Status.PENDING).count(),
            'blocked': User.objects.filter(role=User.Role.WORKER, status=User.Status.BLOCKED).count(),
        }

        # Ijara holatlari (bar chart)
        rental_stats = {
            'active': Rental.objects.filter(status=Rental.Status.ACTIVE).count(),
            'overdue': Rental.objects.filter(status=Rental.Status.OVERDUE).count(),
            'completed': Rental.objects.filter(status=Rental.Status.COMPLETED).count(),
        }

        data = {
            'total_workers': User.objects.filter(role=User.Role.WORKER).count(),
            'active_rentals': Rental.objects.filter(status=Rental.Status.ACTIVE).count(),
            'monthly_revenue': monthly_revenue,
            'overdue_count': Rental.objects.filter(status=Rental.Status.OVERDUE).count(),
            'pending_receipts_count': PaymentReceipt.objects.filter(
                status=PaymentReceipt.Status.PENDING
            ).count(),
            'pending_worker_requests_count': User.objects.filter(
                role=User.Role.WORKER, status=User.Status.PENDING
            ).count(),
            'daily_revenue': daily_revenue,
            'worker_stats': worker_stats,
            'rental_stats': rental_stats,
        }
        return Response(data)
