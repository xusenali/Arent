from rest_framework import serializers

from .models import ElectroUnit


class ElectroUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = ElectroUnit
        fields = ['id', 'model_name', 'serial_number', 'unit_type', 'status', 'price_per_day', 'image']
