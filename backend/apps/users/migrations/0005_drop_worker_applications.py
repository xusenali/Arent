"""Ariza oqimi olib tashlandi — ``worker_applications`` jadvalini tozalaydi.

Endi foydalanuvchi formani to'ldirishi bilan darhol ishchi bo'ladi
(``apps.users.registration``), shuning uchun ariza jadvali va uni yaratgan
``applications`` ilovasi keraksiz.
"""

from django.db import migrations


def drop_table(apps, schema_editor):
    # CASCADE — faqat Postgres sintaksisi; sqlite (test bazasi) uni tushunmaydi.
    cascade = ' CASCADE' if schema_editor.connection.vendor == 'postgresql' else ''
    schema_editor.execute(f'DROP TABLE IF EXISTS worker_applications{cascade}')
    # Ilova o'chirilgani uchun uning migratsiya tarixi ham kerak emas —
    # aks holda `showmigrations` yo'q ilovani ko'rsatib turadi.
    schema_editor.execute("DELETE FROM django_migrations WHERE app = 'applications'")


def noop(apps, schema_editor):
    """Orqaga qaytarish jadvalni tiklamaydi — ariza modeli butunlay olib tashlangan."""


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_id_card_front_back'),
    ]

    operations = [
        migrations.RunPython(drop_table, noop),
    ]
