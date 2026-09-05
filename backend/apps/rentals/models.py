import datetime

from django.conf import settings
from django.db import models

from apps.common.models import UUIDModel


class Rental(UUIDModel):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Faol'
        OVERDUE = 'overdue', "Muddati o'tgan"
        COMPLETED = 'completed', 'Yakunlangan'

    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rentals',
    )
    unit = models.ForeignKey(
        'electro_units.ElectroUnit', on_delete=models.PROTECT, related_name='rentals',
    )
    start_date = models.DateField()
    period_days = models.PositiveIntegerField()
    due_date = models.DateField()
    class PayTiming(models.TextChoices):
        START = 'start', 'Boshida'
        END   = 'end',   'Oxirida'

    pay_timing = models.CharField(max_length=10, choices=PayTiming.choices, default=PayTiming.START)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        db_table = 'rentals'
        ordering = ['-start_date']

    def save(self, *args, **kwargs):
        if not self.due_date:
            self.due_date = self.start_date + datetime.timedelta(days=self.period_days)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.worker} — {self.unit} ({self.status})'


class RentalMedia(UUIDModel):
    class MediaType(models.TextChoices):
        PASSPORT_PHOTO = 'passport_photo', 'Passport rasmi'
        VIDEO = 'video', 'Video'

    rental = models.ForeignKey(Rental, on_delete=models.CASCADE, related_name='media')
    media_type = models.CharField(max_length=20, choices=MediaType.choices)
    file = models.FileField(upload_to='rental_media/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rental_media'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f'{self.rental_id} — {self.media_type}'
