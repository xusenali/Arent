from rest_framework import serializers

from .models import ElectroUnit


class ElectroUnitSerializer(serializers.ModelSerializer):
    """Public — narx ko'rsatilmaydi (faqat ro'yxat uchun)."""
    class Meta:
        model = ElectroUnit
        fields = ['id', 'model_name', 'serial_number', 'unit_type', 'status', 'price_per_day', 'image']


class AdminElectroUnitSerializer(serializers.ModelSerializer):
    """Admin CRUD — narx yo'q, description bor."""
    class Meta:
        model = ElectroUnit
        fields = ['id', 'model_name', 'serial_number', 'unit_type', 'status', 'description', 'image', 'price_per_day']
        read_only_fields = ['id']
        extra_kwargs = {
            'price_per_day': {'required': False, 'default': 0},
        }
