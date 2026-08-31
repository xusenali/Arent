import uuid

from django.db import models


class UUIDModel(models.Model):
    """Barcha domain modellar uchun umumiy UUID primary key (BACKEND_README §5)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True
