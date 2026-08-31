from django.contrib import admin

from .models import ContentTranslation


@admin.register(ContentTranslation)
class ContentTranslationAdmin(admin.ModelAdmin):
    list_display = ['key', 'lang', 'value']
    list_filter = ['lang']
    search_fields = ['key', 'value']
