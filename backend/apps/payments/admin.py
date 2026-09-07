from django.contrib import admin

from .models import Payment, PaymentCard, PaymentReceipt


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'rental', 'amount', 'paid_amount', 'is_fine',
        'method', 'covered_days', 'received_by', 'paid_at', 'created_at',
    ]
    list_filter = ['is_fine', 'method']
    list_select_related = ['rental', 'received_by']
    autocomplete_fields = ['rental', 'received_by']
    search_fields = ['id', 'rental__worker__full_name', 'rental__worker__phone']
    readonly_fields = ['created_at']


@admin.register(PaymentReceipt)
class PaymentReceiptAdmin(admin.ModelAdmin):
    list_display = ['id', 'payment', 'status', 'uploaded_at', 'reviewed_by', 'reviewed_at']
    list_filter = ['status']
    list_select_related = ['payment', 'reviewed_by']
    readonly_fields = ['uploaded_at']


@admin.register(PaymentCard)
class PaymentCardAdmin(admin.ModelAdmin):
    list_display = ['masked', 'holder', 'bank', 'updated_by', 'updated_at']
    list_select_related = ['updated_by']
