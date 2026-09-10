"""Ishchi o'chirilganda transportni bo'shatish — himoya qatlami.

``WorkerDetailView.perform_destroy`` ijarani to'g'ri yakunlaydi, lekin ishchi
Django admin panelidan, ``shell`` dan yoki ``queryset.delete()`` orqali ham
o'chirilishi mumkin. ``pre_delete`` barcha shu yo'llarni qamrab oladi.

``pre_delete`` — ``post_delete`` emas: CASCADE ijara yozuvlarini o'chirib
yuborgach, qaysi transport band ekanini bilishning iloji qolmaydi.
"""

from django.conf import settings
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from . import services


@receiver(pre_delete, sender=settings.AUTH_USER_MODEL, dispatch_uid='free_units_on_user_delete')
def free_units_on_user_delete(sender, instance, **kwargs):
    services.end_active_rentals(instance.pk, note="Ishchi o'chirildi — ijara yakunlandi")
