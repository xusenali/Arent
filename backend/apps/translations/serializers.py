from rest_framework import serializers

from .models import ContentTranslation


class ContentTranslationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentTranslation
        fields = ['key', 'value']
