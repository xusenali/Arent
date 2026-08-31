from rest_framework import serializers

from .models import WorkerApplication


class WorkerApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkerApplication
        fields = ['id', 'full_name', 'phone', 'desired_unit_model', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']
