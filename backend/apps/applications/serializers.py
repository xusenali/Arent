from rest_framework import serializers

from .models import WorkerApplication
from .utils import calc_amount


class WorkerApplicationSerializer(serializers.ModelSerializer):
    """Public ariza yuborish."""

    class Meta:
        model = WorkerApplication
        fields = [
            'id', 'full_name', 'phone', 'desired_unit_model',
            'unit', 'period_type', 'pay_timing', 'battery_count',
            'status', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def validate(self, attrs):
        unit      = attrs.get('unit')
        unit_type = unit.unit_type if unit else attrs.get('desired_unit_model')

        if unit_type == 'scooter':
            # Skuter uchun period doim weekly
            attrs['period_type'] = WorkerApplication.PeriodType.WEEKLY
            # battery_count majburiy
            if not attrs.get('battery_count'):
                raise serializers.ValidationError(
                    {'battery_count': 'Skuter uchun batareya sonini tanlang (1 yoki 2).'}
                )
        else:
            # Velosiped uchun battery_count ma'nosiz
            attrs['battery_count'] = None

        return attrs


class AdminApplicationSerializer(serializers.ModelSerializer):
    """Admin uchun — transport nomi, narx hisoblangan holda."""

    unit_name    = serializers.CharField(source='unit.model_name', read_only=True)
    unit_type    = serializers.CharField(source='unit.unit_type',  read_only=True)
    unit_status  = serializers.CharField(source='unit.status',     read_only=True)
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
