"""Osilib qolgan transportlarni bo'shatadi.

Bug tuzatilishidan oldin o'chirilgan ishchilardan qolgan, ``rented`` deb
turgan-u hech qanday faol ijaraga bog'lanmagan transportlarni topadi.

    python manage.py free_orphan_units --dry-run   # faqat ko'rsatadi
    python manage.py free_orphan_units             # bo'shatadi
"""

from django.core.management.base import BaseCommand

from apps.electro_units.models import ElectroUnit
from apps.rentals.models import Rental
from apps.rentals.services import free_orphan_units


class Command(BaseCommand):
    help = "Faol ijarasi yo'q, lekin 'band' deb turgan transportlarni bo'shatadi."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help="Hech narsani o'zgartirmay, faqat ro'yxatni ko'rsatadi.",
        )

    def handle(self, *args, **options):
        if options['dry_run']:
            band_ids = (
                Rental.objects.exclude(status=Rental.Status.COMPLETED)
                .values_list('unit_id', flat=True)
            )
            orphans = (
                ElectroUnit.objects.filter(status=ElectroUnit.Status.RENTED)
                .exclude(id__in=band_ids)
            )
        else:
            orphans = free_orphan_units()

        if not orphans:
            self.stdout.write(self.style.SUCCESS('Osilib qolgan transport yo\'q.'))
            return

        for unit in orphans:
            self.stdout.write(f'  • {unit.model_name} ({unit.serial_number})')

        n = len(orphans)
        if options['dry_run']:
            self.stdout.write(self.style.WARNING(f'{n} ta topildi (dry-run — o\'zgarish yo\'q).'))
        else:
            self.stdout.write(self.style.SUCCESS(f"{n} ta transport bo'shatildi."))
