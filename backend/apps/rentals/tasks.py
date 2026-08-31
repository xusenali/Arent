from celery import shared_task
from django.conf import settings
from django.utils import timezone

from .models import Rental


@shared_task
def apply_daily_fines():
    """
    Celery Beat kunlik vazifasi (BACKEND_README §7, har kuni 00:05).

    Muddati o'tgan har bir faol ijara uchun:
      1. status -> 'overdue'
      2. shu kun uchun bitta jarima Payment yozuvi qo'shiladi (agar bugun
         uchun hali qo'shilmagan bo'lsa — idempotentlik uchun).
    """
    from apps.payments.models import Payment

    today = timezone.localdate()
    overdue_rentals = Rental.objects.filter(
        due_date__lt=today,
    ).exclude(status=Rental.Status.COMPLETED)

    created_count = 0
    for rental in overdue_rentals:
        if rental.status != Rental.Status.OVERDUE:
            rental.status = Rental.Status.OVERDUE
            rental.save(update_fields=['status'])

        already_fined_today = Payment.objects.filter(
            rental=rental, is_fine=True, created_at__date=today,
        ).exists()
        if already_fined_today:
            continue

        Payment.objects.create(
            rental=rental,
            amount=settings.DAILY_FINE_AMOUNT,
            is_fine=True,
            fine_days_count=1,
        )
        created_count += 1

    return {'checked': overdue_rentals.count(), 'fines_created': created_count}
