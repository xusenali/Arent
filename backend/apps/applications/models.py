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
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'worker_applications'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.full_name} ({self.phone})'
