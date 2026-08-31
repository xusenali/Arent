from django.contrib import admin

from .models import Payment, PaymentReceipt


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'rental', 'amount', 'is_fine', 'paid_at', 'created_at']
    list_filter = ['is_fine']
    autocomplete_fields = ['rental']


@admin.register(PaymentReceipt)
class PaymentReceiptAdmin(admin.ModelAdmin):
    list_display = ['id', 'payment', 'status', 'uploaded_at', 'reviewed_by']
    list_filter = ['status']
