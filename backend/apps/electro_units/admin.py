from django.contrib import admin

from .models import ElectroUnit


@admin.register(ElectroUnit)
class ElectroUnitAdmin(admin.ModelAdmin):
    list_display = ['model_name', 'serial_number', 'status', 'price_per_day']
    list_filter = ['status']
    search_fields = ['model_name', 'serial_number']
