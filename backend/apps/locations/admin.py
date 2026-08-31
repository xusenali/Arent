from django.contrib import admin

from .models import WorkerLocation


@admin.register(WorkerLocation)
class WorkerLocationAdmin(admin.ModelAdmin):
    list_display = ['worker', 'latitude', 'longitude', 'recorded_at']
    list_filter = ['recorded_at']
