from django.contrib import admin

from .models import Rental, RentalMedia


class RentalMediaInline(admin.TabularInline):
    model = RentalMedia
    extra = 0


@admin.register(Rental)
class RentalAdmin(admin.ModelAdmin):
    list_display = ['id', 'worker', 'unit', 'start_date', 'due_date', 'status']
    list_filter = ['status']
    search_fields = ['worker__full_name', 'worker__phone', 'unit__model_name']
    autocomplete_fields = ['worker', 'unit']
    inlines = [RentalMediaInline]
