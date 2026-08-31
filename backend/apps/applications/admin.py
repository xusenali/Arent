from django.contrib import admin

from .models import WorkerApplication


@admin.register(WorkerApplication)
class WorkerApplicationAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'phone', 'desired_unit_model', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['full_name', 'phone']
