from django.conf import settings
from django.db import models

from apps.common.models import UUIDModel


class WorkerLocation(UUIDModel):
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='locations',
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'worker_locations'
        ordering = ['-recorded_at']

    def __str__(self):
        return f'{self.worker_id} @ {self.recorded_at}'
