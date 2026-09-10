from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser
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

        telegram_connected = False
        user = User.objects.filter(phone=phone).first()
        if user:
            code = generate_otp_code()
            store_otp(phone, code)
            if user.telegram_chat_id:
                telegram_connected = True
                send_otp_message(user.telegram_chat_id, code)

        return Response(
            {'telegram_connected': telegram_connected},
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
    GET  /api/admin/workers  ?status=active|blocked|overdue
    POST /api/admin/workers  — admin qo'lda ishchi qo'shadi (darhol faol).
    """

    permission_classes = [IsSuperAdmin]
    pagination_class   = None  # client-side pagination
    queryset = User.objects.filter(role=User.Role.WORKER)

    def get_serializer_class(self):
        return WorkerCreateSerializer if self.request.method == 'POST' else UserSerializer

    def get_queryset(self):
        from apps.rentals.models import Rental

        queryset = super().get_queryset()

        # Ijarasi yakunlangan ishchi arxivga o'tadi — asosiy ro'yxatda ko'rinmaydi.
        archived_ids = (
            Rental.objects.filter(status=Rental.Status.COMPLETED)
            .exclude(worker__rentals__status__in=[Rental.Status.ACTIVE, Rental.Status.OVERDUE])
            .values_list('worker_id', flat=True)
        )
        queryset = queryset.exclude(id__in=archived_ids)

        status_filter = self.request.query_params.get('status')
        if status_filter == 'overdue':
            return queryset.filter(rentals__status=Rental.Status.OVERDUE).distinct()
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

    def perform_destroy(self, instance):
        """Ishchini o'chirishdan oldin ijarasini yakunlab, transportini bo'shatadi.

        ``Rental.worker`` FK CASCADE bo'lgani uchun ijara yozuvi ishchi bilan
        birga o'chib ketadi — shuning uchun transportni O'CHIRISHDAN OLDIN
        bo'shatish shart, aks holda u ``rented`` holida osilib qoladi.
        """
        from apps.rentals import services as rental_services

        with transaction.atomic():
            rental_services.end_active_rentals(
                instance.pk,
                actor=self.request.user,
                note=f"Ishchi o'chirildi ({self.request.user.full_name})",
            )
            instance.delete()


class WorkerArchiveListView(generics.ListAPIView):
    """GET /api/admin/workers/archive — ijarasi yakunlangan ishchilar."""
    permission_classes = [IsSuperAdmin]
    pagination_class = None
    serializer_class = UserSerializer

    def get_queryset(self):
        from apps.rentals.models import Rental
        completed_ids = (
            Rental.objects.filter(status=Rental.Status.COMPLETED)
            .values_list('worker_id', flat=True)
            .distinct()
        )
        active_ids = (
            Rental.objects.exclude(status=Rental.Status.COMPLETED)
            .values_list('worker_id', flat=True)
            .distinct()
        )
        return (
            User.objects.filter(role=User.Role.WORKER, id__in=completed_ids)
            .exclude(id__in=active_ids)
            .order_by('-id')
        )


class WorkerDocumentUploadView(APIView):
    """POST /api/admin/workers/:id/documents — id_card yoki agreement_video yuklash."""

    permission_classes = [IsSuperAdmin]
    parser_classes = [MultiPartParser]

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
    """GET /api/admin/locations — barcha faol ishchilarning joylashuv holati."""

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from datetime import timedelta
        from apps.rentals.models import Rental

        # Barcha faol ishchilar (telegram bo'lmaganlar ham ko'rinadi, faqat markeri chiqmaydi)
        workers = User.objects.filter(
            role=User.Role.WORKER,
            status=User.Status.ACTIVE,
        )

        now = timezone.now()
        threshold = now - timedelta(hours=8)

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

            updated = worker.location_updated_at
            if updated is None:
                freshness = 'never'        # hech qachon ulashmagan
            elif updated >= threshold:
                freshness = 'fresh'        # 8 soatdan kam — yashil
            else:
                freshness = 'stale'        # 8 soatdan oshgan — sariq

            row = {
                'worker_id': str(worker.id),
                'worker_name': worker.full_name,
                'rental_status': rental.status if rental else None,
                'recorded_at': updated.isoformat() if updated else None,
                'freshness': freshness,    # 'fresh' | 'stale' | 'never'
            }
            if worker.latitude is not None and worker.longitude is not None:
                row['latitude'] = float(worker.latitude)
                row['longitude'] = float(worker.longitude)
            result.append(row)

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

        # Daromad doim paid_amount bo'yicha: boshqa to'lov ichida yopilgan
        # jarimalarda paid_amount=0, shuning uchun pul ikki marta sanalmaydi.
        monthly_revenue = (
            Payment.objects.filter(paid_at__gte=month_start)
            .aggregate(total=Sum('paid_amount'))
            .get('total')
            or 0
        )

        # So'nggi 30 kun uchun kunlik daromad
        thirty_days_ago = now - timedelta(days=30)
        daily_revenue_qs = (
            Payment.objects
            .filter(paid_at__gte=thirty_days_ago, paid_amount__gt=0)
            .annotate(day=TruncDate('paid_at'))
            .values('day')
            .annotate(total=Sum('paid_amount'))
            .order_by('day')
        )
        daily_revenue = [
            {'date': str(row['day']), 'amount': float(row['total'])}
            for row in daily_revenue_qs
        ]

        # Ishchi holatlari (donut chart)
        worker_stats = {
            'active':  User.objects.filter(role=User.Role.WORKER, status=User.Status.ACTIVE).count(),
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
            'daily_revenue': daily_revenue,
            'worker_stats': worker_stats,
            'rental_stats': rental_stats,
        }
        return Response(data)
