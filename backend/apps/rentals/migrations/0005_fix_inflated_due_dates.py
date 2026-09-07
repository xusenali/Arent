"""Xato hisob tufayli oldinga surilib ketgan ``due_date`` larni to'g'rilaydi.

Muammo: to'lov tasdiqlanganda ``due_date`` ga ``covered_days`` qo'shilardi.
Lekin ochiq qarz allaqachon ``due_date`` gacha bo'lgan davrga tegishli edi —
shu sababli har bir tasdiqlangan to'lov muddatni bir davrga ortiqcha surardi.
Masalan: 8-sentabrda ochilgan 7 kunlik ijara (``due_date`` = 15-sentabr)
7 kunlik to'lovdan keyin 22-sentabrga ketardi.

To'g'rilash faqat ishonchli holatlarga tegadi: barcha davr to'lovlari
to'langan va har birida ``covered_days`` bor bo'lsa — ya'ni ijara faqat
qo'lda tasdiqlangan to'lovlar orqali uzaygan. Bunday ijarada muddat
aniq ``start_date + Σ covered_days`` bo'lishi kerak.

Avtomatik davr yozilgan (``covered_days`` siz to'lovi bor) yoki hali
to'lanmagan qarzi bo'lgan ijaralarga tegilmaydi — ular uchun ishonchli
qayta hisob yo'q.
"""

import datetime

from django.db import migrations


def fix_due_dates(apps, schema_editor):
    Rental = apps.get_model('rentals', 'Rental')
    Payment = apps.get_model('payments', 'Payment')

    for rental in Rental.objects.all():
        period_payments = list(
            Payment.objects.filter(rental_id=rental.pk, is_fine=False)
        )
        if not period_payments:
            continue

        # Har bir davr to'lovi qo'lda tasdiqlangan bo'lishi shart.
        if not all(p.paid_at and p.covered_days for p in period_payments):
            continue

        correct_due = rental.start_date + datetime.timedelta(
            days=sum(p.covered_days for p in period_payments),
        )
        # Faqat ortiqcha surilganini qaytaramiz — muddatni qisqartirmaymiz.
        if rental.due_date > correct_due:
            rental.due_date = correct_due
            rental.save(update_fields=['due_date'])


def noop(apps, schema_editor):
    """Orqaga qaytarish yo'q: eski qiymat xato edi, uni tiklashning ma'nosi yo'q."""


class Migration(migrations.Migration):

    dependencies = [
        ('rentals', '0004_rental_battery_count'),
        ('payments', '0007_paymentcard'),
    ]

    operations = [
        migrations.RunPython(fix_due_dates, noop),
    ]
