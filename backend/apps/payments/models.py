from django.conf import settings
from django.db import models

from apps.common.models import UUIDModel


class Payment(UUIDModel):
    rental = models.ForeignKey('rentals.Rental', on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_fine = models.BooleanField(default=False)
    fine_days_count = models.PositiveIntegerField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    # README §5 jadvalida yo'q, lekin Celery kunlik jarima vazifasi bir kunda bir marta
    # ishlashini kafolatlash (idempotentlik) uchun zarur — apps/rentals/tasks.py'ga qarang.
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']

    def __str__(self):
        kind = 'Jarima' if self.is_fine else "To'lov"
        return f'{kind} — {self.amount} ({self.rental_id})'


class PaymentReceipt(UUIDModel):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Kutilmoqda'
        APPROVED = 'approved', 'Tasdiqlangan'
        REJECTED = 'rejected', 'Rad etilgan'

    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='receipts')
    receipt_image = models.ImageField(upload_to='payment_receipts/')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reviewed_receipts',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payment_receipts'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f'Chek {self.id} — {self.status}'
