import datetime

from celery import shared_task
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone

from .models import Rental


# ─── public helpers (imported by payments/views.py too) ──────────────────────

def _period_amount(rental):
    """Ijara davrining asosiy narxini hisoblaydi."""
    from apps.applications.utils import calc_amount
    from apps.applications.models import WorkerApplication

    period_map = {1: 'daily', 7: 'weekly', 30: 'monthly'}
    period_type = period_map.get(rental.period_days, 'weekly')

    battery_count = None
    if rental.unit.unit_type == 'scooter':
        app = (
            WorkerApplication.objects
            .filter(unit=rental.unit, status=WorkerApplication.Status.APPROVED)
            .order_by('-created_at')
            .first()
        )
        battery_count = app.battery_count if app else 1

    return calc_amount(rental.unit, period_type, battery_count)


def renew_rental(rental):
    """Ijarani keyingi davrga o'tkazadi.

    - due_date ni period_days ga uzaytiradi (eski due_date dan, bugundan emas)
    - Yangi davr to'lovini yaratadi: asosiy narx + muallaq jarimalar
    - Muallaq jarimalarni yangi to'lovga qo'shib, ularni "to'langan" deb belgilaydi
    """
    from apps.payments.models import Payment

    rental.due_date = rental.due_date + datetime.timedelta(days=rental.period_days)
    rental.status   = Rental.Status.ACTIVE
    rental.save(update_fields=['due_date', 'status'])

    pending_fines = int(
        Payment.objects.filter(rental=rental, is_fine=True, paid_at__isnull=True)
        .aggregate(total=Sum('amount'))['total'] or 0
    )

    base_amount = _period_amount(rental)
    Payment.objects.create(rental=rental, amount=base_amount + pending_fines, is_fine=False)

    # Jarimalar yangi to'lovga qo'shildi — ularni yopamiz
    if pending_fines:
        Payment.objects.filter(
            rental=rental, is_fine=True, paid_at__isnull=True,
        ).update(paid_at=timezone.now())


# ─── celery task ──────────────────────────────────────────────────────────────

@shared_task
def apply_daily_fines():
    """
    Celery Beat vazifasi — har kuni 00:05 da ishlaydi.

    1. ACTIVE + muddati o'tgan ijaralar:
       - To'lov to'langan → avtomatik yangilash (renew)
       - To'lov to'lanmagan → 'overdue' + jarima
       - pay_timing='end': avval davr to'lovini yaratadi (hali yo'q bo'lsa)

    2. OVERDUE ijaralar → bugungi jarima (agar hali yo'q bo'lsa)
    """
    from apps.payments.models import Payment

    today = timezone.localdate()
    renewed = 0
    overdue = 0
    fines   = 0

    # ── Step 1: muddati o'tgan ACTIVE ijaralar ────────────────────────────
    expired = list(
        Rental.objects
        .filter(due_date__lt=today, status=Rental.Status.ACTIVE)
        .select_related('unit', 'worker')
    )

    for rental in expired:
        # pay_timing='end': agar davr to'lovi hali yaratilmagan bo'lsa — yaratamiz
        if rental.pay_timing == Rental.PayTiming.END:
            if not Payment.objects.filter(
                rental=rental, is_fine=False, paid_at__isnull=True,
            ).exists():
                Payment.objects.create(
                    rental=rental, amount=_period_amount(rental), is_fine=False,
                )

        has_unpaid_period = Payment.objects.filter(
            rental=rental, is_fine=False, paid_at__isnull=True,
        ).exists()

        if has_unpaid_period:
            rental.status = Rental.Status.OVERDUE
            rental.save(update_fields=['status'])
            overdue += 1
        else:
            renew_rental(rental)
            renewed += 1

    # ── Step 2: OVERDUE ijaralar — kunlik jarima ──────────────────────────
    for rental in Rental.objects.filter(status=Rental.Status.OVERDUE):
        already_fined = Payment.objects.filter(
            rental=rental, is_fine=True, created_at__date=today,
        ).exists()
        if not already_fined:
            Payment.objects.create(
                rental=rental,
                amount=settings.DAILY_FINE_AMOUNT,
                is_fine=True,
                fine_days_count=1,
            )
            fines += 1

    return {'renewed': renewed, 'newly_overdue': overdue, 'fines_created': fines}
