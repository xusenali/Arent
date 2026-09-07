"""Eski to'lovlar uchun ``paid_amount`` ni to'ldiradi.

Daromad hisoboti endi ``paid_amount`` bo'yicha olinadi. Migratsiyadan oldin
yopilgan yozuvlarda bu maydon bo'sh bo'lgani uchun ular hisobdan tushib
qolmasligi kerak — mavjud ``amount`` qiymati ko'chiriladi.
"""

from django.db import migrations
from django.db.models import F


def backfill(apps, schema_editor):
    Payment = apps.get_model('payments', 'Payment')
    Payment.objects.filter(paid_at__isnull=False, paid_amount__isnull=True).update(
        paid_amount=F('amount'),
        method='cash',
        note="Eski yozuv — usul aniqlanmagan",
    )


def noop(apps, schema_editor):
    """Orqaga qaytarish ma'lumot yo'qotmaydi: yangi maydonlar baribir o'chiriladi."""


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0005_remove_paymentreceipt_ai_extracted_amount_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill, noop),
    ]
