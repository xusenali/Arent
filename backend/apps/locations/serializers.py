from rest_framework import serializers

from .models import WorkerLocation


class WorkerLocationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerLocation
        fields = ['id', 'latitude', 'longitude', 'recorded_at']
        read_only_fields = ['id', 'recorded_at']


class AdminWorkerLocationSerializer(serializers.ModelSerializer):
    worker_id = serializers.UUIDField(source='worker.id', read_only=True)
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    rental_status = serializers.SerializerMethodField()

    class Meta:
        model = WorkerLocation
        fields = ['worker_id', 'worker_name', 'latitude', 'longitude', 'recorded_at', 'rental_status']

    def get_rental_status(self, obj):
        rental = obj.worker.rentals.exclude(status='completed').order_by('-start_date').first()
        return rental.status if rental else None
