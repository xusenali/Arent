from rest_framework import serializers

from .models import Payment, PaymentReceipt


class ReceiptInlineSerializer(serializers.ModelSerializer):
    """Chek — to'lov qatori ichida ko'rsatiladi (ishchi sahifasidagi jadval)."""

    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, default=None)

    class Meta:
        model = PaymentReceipt
        fields = [
            'id', 'receipt_image', 'status', 'uploaded_at',
            'reviewed_by_name', 'reviewed_at', 'reject_reason',
        ]
        read_only_fields = fields


class AdminWorkerPaymentSerializer(serializers.ModelSerializer):
    """Admin -> ishchi to'lovlari jadvali."""

    unit_name        = serializers.CharField(source='rental.unit.model_name', read_only=True)
    unit_type        = serializers.CharField(source='rental.unit.unit_type',  read_only=True)
    received_by_name = serializers.CharField(source='received_by.full_name',  read_only=True, default=None)
    receipts         = ReceiptInlineSerializer(many=True, read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'rental', 'unit_name', 'unit_type',
            'amount', 'is_fine', 'fine_days_count',
            'paid_at', 'paid_amount', 'method', 'covered_days',
            'received_by_name', 'settled_by', 'note',
            'created_at', 'receipts',
        ]
        read_only_fields = fields


class ConfirmPaymentSerializer(serializers.Serializer):
    """Naqd to'lov va chek tasdiqlash uchun umumiy kirish: summa + kunlar."""

    amount = serializers.CharField()
    days   = serializers.IntegerField(min_value=1)
    note   = serializers.CharField(required=False, allow_blank=True, default='')


class CashPaymentSerializer(ConfirmPaymentSerializer):
    rental_id = serializers.UUIDField()


class RejectReceiptSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default='')


class WorkerReceiptUploadSerializer(serializers.Serializer):
    receipt_image = serializers.ImageField()
