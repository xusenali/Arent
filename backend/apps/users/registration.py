"""Ishchi bo'lib ro'yxatdan o'tish — admin tasdig'isiz, darhol.

Ilgari ariza yuborilib, admin uni tasdiqlagach ishchi yaratilardi. Endi
foydalanuvchi formani to'ldirishi bilan hisob ochiladi, ijara boshlanadi va
u darhol tizimga kiradi.
"""

import datetime
import re

from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.electro_units.models import ElectroUnit
from apps.payments.models import Payment
from apps.payments.pricing import PERIOD_DAYS, calc_amount
from apps.rentals.models import Rental

from .models import User
from .serializers import UserSerializer

_PHONE_RE = re.compile(r'^\+998\d{9}$')


class WorkerRegistrationSerializer(serializers.Serializer):
    """Ommaviy forma: shaxsiy ma'lumot + tanlangan transport va shartlar."""

    full_name     = serializers.CharField(max_length=255)
    phone         = serializers.CharField(max_length=20)
    password      = serializers.CharField(min_length=6, write_only=True)
    unit          = serializers.PrimaryKeyRelatedField(
        queryset=ElectroUnit.objects.all(), required=False, allow_null=True,
    )
    period_type   = serializers.ChoiceField(choices=list(PERIOD_DAYS), default='weekly')
    pay_timing    = serializers.ChoiceField(choices=Rental.PayTiming.choices, default=Rental.PayTiming.START)
    battery_count = serializers.ChoiceField(
        choices=Rental.BatteryCount.choices, required=False, allow_null=True,
    )

    def validate_full_name(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Ism kamida 3 ta belgidan iborat bo'lsin.")
        return value

    def validate_phone(self, value):
        phone = re.sub(r'[\s\-()]', '', value)
        if not _PHONE_RE.match(phone):
            raise serializers.ValidationError(
                "Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak.",
            )
        if User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError(
                'Bu raqam allaqachon ro\'yxatdan o\'tgan. Tizimga kiring yoki parolni tiklang.',
            )
        return phone

    def validate_unit(self, unit):
        if unit and unit.status != ElectroUnit.Status.AVAILABLE:
            raise serializers.ValidationError('Bu transport hozir band. Boshqasini tanlang.')
        return unit

    def validate(self, attrs):
        unit = attrs.get('unit')

        if unit and unit.unit_type == 'scooter':
            # Skuter faqat haftalik va batareya soni majburiy — narx shunga bog'liq.
            attrs['period_type'] = 'weekly'
            if not attrs.get('battery_count'):
                raise serializers.ValidationError(
                    {'battery_count': 'Skuter uchun batareya sonini tanlang (1 yoki 2).'},
                )
        else:
            attrs['battery_count'] = None

        return attrs


class WorkerRegisterView(APIView):
    """POST /api/public/worker-register

    Hisob ochadi, transport tanlangan bo'lsa ijarani boshlaydi va JWT qaytaradi —
    foydalanuvchi shu zahoti ishchi kabinetiga kiradi.
    """

    permission_classes = [AllowAny]
    throttle_classes   = [ScopedRateThrottle]
    throttle_scope     = 'register'

    def post(self, request):
        payload = WorkerRegistrationSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        with transaction.atomic():
            worker = User.objects.create_user(
                phone=data['phone'],
                full_name=data['full_name'],
                role=User.Role.WORKER,
                status=User.Status.ACTIVE,
                password=None,
            )
            worker.password = make_password(data['password'])
            worker.save(update_fields=['password'])

            unit = data.get('unit')
            if unit:
                # Ikki kishi bir vaqtda tanlab qolmasligi uchun qulflab tekshiramiz.
                unit = ElectroUnit.objects.select_for_update().get(pk=unit.pk)
                if unit.status != ElectroUnit.Status.AVAILABLE:
                    raise serializers.ValidationError(
                        {'unit': 'Bu transport hozir band. Boshqasini tanlang.'},
                    )
                unit.status = ElectroUnit.Status.RENTED
                unit.save(update_fields=['status'])

                period_days = PERIOD_DAYS.get(data['period_type'], 7)
                today = timezone.localdate()
                rental = Rental.objects.create(
                    worker=worker,
                    unit=unit,
                    start_date=today,
                    period_days=period_days,
                    due_date=today + datetime.timedelta(days=period_days),
                    pay_timing=data['pay_timing'],
                    battery_count=data.get('battery_count'),
                    status=Rental.Status.ACTIVE,
                )

                # pay_timing='start' — oldindan to'lanadi, qarz darhol yoziladi.
                # 'end' — davr tugaganda sync_rental_state() yozadi.
                if rental.pay_timing == Rental.PayTiming.START:
                    Payment.objects.create(
                        rental=rental,
                        amount=calc_amount(unit, data['period_type'], rental.battery_count),
                        is_fine=False,
                    )

        refresh = RefreshToken.for_user(worker)
        return Response(
            {
                'user':    UserSerializer(worker).data,
                'access':  str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )
