"""Ariza oqimi olib tashlandi — ``worker_applications`` jadvalini tozalaydi.

Endi foydalanuvchi formani to'ldirishi bilan darhol ishchi bo'ladi
(``apps.users.registration``), shuning uchun ariza jadvali va uni yaratgan
``applications`` ilovasi keraksiz.
"""

from django.db import migrations


def drop_table(apps, schema_editor):
    schema_editor.execute('DROP TABLE IF EXISTS worker_applications CASCADE')
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
