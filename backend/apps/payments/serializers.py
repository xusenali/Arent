from django.utils import timezone
from rest_framework import serializers

from .models import Payment, PaymentReceipt


class ReceiptInlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentReceipt
        fields = ['id', 'receipt_image', 'status', 'uploaded_at']
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    receipts = ReceiptInlineSerializer(many=True, read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'rental', 'amount', 'is_fine', 'fine_days_count', 'paid_at', 'created_at', 'receipts']
        read_only_fields = fields


class PaymentReceiptSerializer(serializers.ModelSerializer):
    worker_name   = serializers.CharField(source='payment.rental.worker.full_name', read_only=True)
    worker_phone  = serializers.CharField(source='payment.rental.worker.phone',     read_only=True)
    unit_name     = serializers.CharField(source='payment.rental.unit.model_name',  read_only=True)
    unit_type     = serializers.CharField(source='payment.rental.unit.unit_type',   read_only=True)
    period_days   = serializers.IntegerField(source='payment.rental.period_days',   read_only=True)
    pay_timing    = serializers.CharField(source='payment.rental.pay_timing',       read_only=True)
    is_fine       = serializers.BooleanField(source='payment.is_fine',              read_only=True)
    amount        = serializers.DecimalField(source='payment.amount', max_digits=12, decimal_places=2, read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name',        read_only=True)

    class Meta:
        model = PaymentReceipt
        fields = [
            'id', 'payment', 'receipt_image', 'status', 'uploaded_at',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'worker_name', 'worker_phone',
            'unit_name', 'unit_type', 'period_days', 'pay_timing', 'is_fine',
            'amount', 'ai_verdict', 'ai_extracted_amount',
        ]
        read_only_fields = fields


class WorkerReceiptUploadSerializer(serializers.Serializer):
    receipt_image = serializers.ImageField()


class UpcomingPaymentSerializer(serializers.Serializer):
    """Yaqin to'lov muddatli ijaralar uchun read-only serializer."""
    rental_id    = serializers.UUIDField(source='id')
    worker_name  = serializers.CharField(source='worker.full_name')
    worker_phone = serializers.CharField(source='worker.phone')
    unit_name    = serializers.CharField(source='unit.model_name')
    unit_type    = serializers.CharField(source='unit.unit_type')
    pay_timing   = serializers.CharField()
    due_date     = serializers.DateField()
    rental_status = serializers.CharField(source='status')
    days_left    = serializers.SerializerMethodField()
    pending_amount = serializers.SerializerMethodField()

    def get_days_left(self, obj):
        return (obj.due_date - timezone.now().date()).days

    def get_pending_amount(self, obj):
        p = obj.payments.filter(paid_at__isnull=True, is_fine=False).order_by('created_at').first()
        return str(p.amount) if p else None
