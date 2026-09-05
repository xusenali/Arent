from django.db import models

from apps.common.models import UUIDModel


class ElectroUnit(UUIDModel):
    class Status(models.TextChoices):
        AVAILABLE = 'available', "Bo'sh"
        RENTED = 'rented', 'Band'
        MAINTENANCE = 'maintenance', "Ta'mirlashda"

    class UnitType(models.TextChoices):
        SCOOTER = 'scooter', 'Skuter'
        BIKE = 'bike', 'Velik'

    model_name = models.CharField(max_length=120)
    serial_number = models.CharField(max_length=64, unique=True)
    unit_type = models.CharField(max_length=20, choices=UnitType.choices, default=UnitType.SCOOTER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    price_per_day = models.DecimalField(max_digits=12, decimal_places=2)
    description   = models.TextField(null=True, blank=True)
    image = models.ImageField(upload_to='electro_units/', null=True, blank=True)

    class Meta:
        db_table = 'electro_units'
        ordering = ['model_name']

    def __str__(self):
        return f'{self.model_name} ({self.serial_number})'
