from rest_framework import serializers

from apps.electro_units.models import ElectroUnit
from apps.electro_units.serializers import ElectroUnitSerializer

from .models import Rental, RentalMedia


class RentalMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RentalMedia
        fields = ['id', 'rental', 'media_type', 'file', 'uploaded_at']
        read_only_fields = ['id', 'rental', 'uploaded_at']


class RentalSerializer(serializers.ModelSerializer):
    unit = ElectroUnitSerializer(read_only=True)
    unit_id = serializers.PrimaryKeyRelatedField(
        source='unit', queryset=ElectroUnit.objects.all(), write_only=True,
    )

    class Meta:
        model = Rental
        fields = [
            'id', 'worker', 'unit', 'unit_id', 'start_date',
            'period_days', 'due_date', 'status',
        ]
        read_only_fields = ['id', 'worker', 'due_date', 'status']
