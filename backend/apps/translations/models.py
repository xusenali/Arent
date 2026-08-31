from django.db import models

from apps.common.models import UUIDModel


class ContentTranslation(UUIDModel):
    class Lang(models.TextChoices):
        UZ = 'uz', "O'zbekcha"
        RU = 'ru', 'Русский'

    key = models.CharField(max_length=150)
    lang = models.CharField(max_length=2, choices=Lang.choices)
    value = models.TextField()

    class Meta:
        db_table = 'content_translations'
        constraints = [
            models.UniqueConstraint(fields=['key', 'lang'], name='unique_key_lang'),
        ]
        ordering = ['key', 'lang']

    def __str__(self):
        return f'{self.key} [{self.lang}]'
