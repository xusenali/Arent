"""Kunlik ijara vazifasi.

Pul mantig'i ``apps.payments.services`` da — bu yerda faqat vazifani barcha
faol ijaralar bo'ylab yurgizish qoladi.

Muhim: ``sync_rental_state`` idempotent va admin/ishchi sahifalari ham uni
chaqiradi. Shuning uchun Celery bir kun ishlamay qolsa ham holat yo'qolmaydi —
keyingi yurish yoki sahifa ochilishi uni to'g'rilaydi.
"""

import logging

from celery import shared_task

from apps.payments.services import sync_rental_state

from .models import Rental

logger = logging.getLogger(__name__)


@shared_task
def apply_daily_fines():
    """Har kuni 00:05 — muddati o'tgan ijaralarni yangilaydi va jarima yozadi."""
    synced, failed = 0, 0

    rental_ids = list(
        Rental.objects
        .filter(status__in=[Rental.Status.ACTIVE, Rental.Status.OVERDUE])
        .values_list('id', flat=True)
    )

    for rental_id in rental_ids:
        try:
            # Har bir ijara alohida tranzaksiyada — bittasi yiqilsa qolgani davom etadi.
            sync_rental_state(Rental.objects.only('id').get(pk=rental_id))
            synced += 1
        except Rental.DoesNotExist:
            continue
        except Exception:
            logger.exception('Ijara holatini yangilashda xato: %s', rental_id)
            failed += 1

    return {'synced': synced, 'failed': failed}
