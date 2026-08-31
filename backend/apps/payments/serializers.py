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
    worker_name = serializers.CharField(source='payment.rental.worker.full_name', read_only=True)
    amount = serializers.DecimalField(source='payment.amount', max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = PaymentReceipt
        fields = [
            'id', 'payment', 'receipt_image', 'status', 'uploaded_at',
            'reviewed_by', 'reviewed_at', 'worker_name', 'amount',
        ]
        read_only_fields = ['id', 'status', 'uploaded_at', 'reviewed_by', 'reviewed_at']


class WorkerReceiptUploadSerializer(serializers.Serializer):
    receipt_image = serializers.ImageField()
