import re

from django.contrib.auth.hashers import make_password
from rest_framework import serializers

from .models import WorkerApplication
from .utils import calc_amount

_PHONE_RE = re.compile(r'^\+998\d{9}$')


class WorkerApplicationSerializer(serializers.ModelSerializer):
    """Public ariza yuborish."""

    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = WorkerApplication
        fields = [
            'id', 'full_name', 'phone', 'desired_unit_model',
            'unit', 'period_type', 'pay_timing', 'battery_count',
            'password', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def validate_full_name(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Ism kamida 3 ta belgidan iborat bo'lsin.")
        return value.strip()

    def validate_phone(self, value):
        # Normalize: remove spaces/dashes
        normalized = re.sub(r'[\s\-()]', '', value)
        if not _PHONE_RE.match(normalized):
            raise serializers.ValidationError(
                "Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak."
            )
        # Duplicate pending check
        if WorkerApplication.objects.filter(
            phone=normalized, status=WorkerApplication.Status.PENDING
        ).exists():
            raise serializers.ValidationError(
                "Bu telefon raqam bilan kutilayotgan ariza allaqachon mavjud."
            )
        return normalized

    def validate(self, attrs):
        unit      = attrs.get('unit')
        unit_type = unit.unit_type if unit else attrs.get('desired_unit_model')

        if unit_type == 'scooter':
            attrs['period_type'] = WorkerApplication.PeriodType.WEEKLY
            if not attrs.get('battery_count'):
                raise serializers.ValidationError(
                    {'battery_count': 'Skuter uchun batareya sonini tanlang (1 yoki 2).'}
                )
        else:
            attrs['battery_count'] = None

        return attrs

    def create(self, validated_data):
        raw_password = validated_data.pop('password')
        validated_data['password_hash'] = make_password(raw_password)
        return super().create(validated_data)


class AdminApplicationSerializer(serializers.ModelSerializer):
    """Admin uchun — transport nomi, narx hisoblangan holda."""

    unit_name    = serializers.CharField(source='unit.model_name', read_only=True, allow_null=True, default=None)
    unit_type    = serializers.CharField(source='unit.unit_type',  read_only=True, allow_null=True, default=None)
    unit_status  = serializers.CharField(source='unit.status',     read_only=True, allow_null=True, default=None)
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = WorkerApplication
        fields = [
            'id', 'full_name', 'phone', 'desired_unit_model',
            'unit', 'unit_name', 'unit_type', 'unit_status',
            'period_type', 'pay_timing', 'battery_count', 'total_amount',
            'status', 'created_at',
        ]
        read_only_fields = fields

    def get_total_amount(self, obj):
        return calc_amount(obj.unit, obj.period_type, obj.battery_count) if obj.unit else None
