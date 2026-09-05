from django.db import models

from apps.common.models import UUIDModel


class WorkerApplication(UUIDModel):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Kutilmoqda'
        APPROVED = 'approved', 'Tasdiqlangan'
        REJECTED = 'rejected', 'Rad etilgan'

    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    desired_unit_model = models.CharField(max_length=120, null=True, blank=True)
    unit = models.ForeignKey(
        'electro_units.ElectroUnit',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='applications',
    )

    class PeriodType(models.TextChoices):
        DAILY   = 'daily',   'Kunlik'
        WEEKLY  = 'weekly',  'Haftalik'
        MONTHLY = 'monthly', 'Oylik'

    class PayTiming(models.TextChoices):
        START = 'start', 'Boshida'
        END   = 'end',   'Oxirida'

    class BatteryCount(models.IntegerChoices):
        ONE = 1, '1 ta batareya'
        TWO = 2, '2 ta batareya'

    period_type   = models.CharField(max_length=10, choices=PeriodType.choices, default=PeriodType.WEEKLY)
    pay_timing    = models.CharField(max_length=10, choices=PayTiming.choices,  default=PayTiming.START)
    battery_count = models.PositiveSmallIntegerField(
        choices=BatteryCount.choices, null=True, blank=True,
        help_text='Faqat skuter uchun: 1 yoki 2 batareya',
    )

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'worker_applications'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.full_name} ({self.phone})'
