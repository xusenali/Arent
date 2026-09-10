"""Ijarani yakunlash logikasi — bitta joyda.

Ijara yakunlanishi uch joydan boshlanadi: admin tugmasi, ishchi tugmasi va
ishchi o'chirilishi. Uchalasi ham bir xil ish qilishi kerak:

  1. ochiq jarimalar bekor qilinadi (yozuv qoladi — kim bekor qilgani ko'rinadi);
  2. ijara ``completed`` bo'ladi;
  3. **transport bo'shaydi** — aks holda u boshqa hech kimga berilmaydi.

Shu uchinchi qadam ishchi o'chirilganda tushib qolgan edi: ``Rental.worker``
FK ``CASCADE`` bo'lgani uchun ijara yozuvi o'chib ketardi, lekin
``ElectroUnit.status`` ``rented`` holida qolib ketardi va transport abadiy
band bo'lib turardi.
"""

from django.db import transaction

from apps.electro_units.models import ElectroUnit
from apps.payments import services as payment_services

from .models import Rental


def active_rentals(worker_id):
    """Ishchining yakunlanmagan ijaralari (odatda bitta, lekin kafolat yo'q)."""
    return (
        Rental.objects.select_related('unit')
        .filter(worker_id=worker_id)
        .exclude(status=Rental.Status.COMPLETED)
    )


@transaction.atomic
def end_rental(rental, *, actor=None, note: str = 'Ijara yakunlandi') -> Rental:
    """Bitta ijarani yakunlaydi va transportni bo'shatadi. Idempotent."""
    payment_services.waive_open_fines(rental, actor=actor, note=note)

    if rental.status != Rental.Status.COMPLETED:
        rental.status = Rental.Status.COMPLETED
        rental.save(update_fields=['status'])

    free_unit(rental.unit)
    return rental


@transaction.atomic
def end_active_rentals(worker_id, *, actor=None, note: str = 'Ijara yakunlandi') -> int:
    """Ishchining barcha faol ijaralarini yakunlaydi. Yakunlanganlar sonini qaytaradi."""
    count = 0
    for rental in active_rentals(worker_id):
        end_rental(rental, actor=actor, note=note)
        count += 1
    return count


def free_unit(unit) -> bool:
    """Transportni bo'sh qiladi. Ta'mirlashdagi transport tegilmaydi."""
    if unit is None or unit.status != ElectroUnit.Status.RENTED:
        return False
    unit.status = ElectroUnit.Status.AVAILABLE
    unit.save(update_fields=['status'])
    return True


def free_orphan_units() -> list[ElectroUnit]:
    """``rented`` deb turgan, lekin hech qaysi faol ijaraga bog'lanmagan transportlar.

    Eski ma'lumotlarni tozalash uchun (bug tuzatilishidan oldin o'chirilgan
    ishchilardan qolgan "osilib qolgan" transportlar).
    """
    band_unit_ids = (
        Rental.objects.exclude(status=Rental.Status.COMPLETED)
        .values_list('unit_id', flat=True)
    )
    orphans = list(
        ElectroUnit.objects.filter(status=ElectroUnit.Status.RENTED)
        .exclude(id__in=band_unit_ids)
    )
    if orphans:
        ElectroUnit.objects.filter(id__in=[u.id for u in orphans]).update(
            status=ElectroUnit.Status.AVAILABLE,
        )
    return orphans
