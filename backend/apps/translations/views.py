from rest_framework import generics
from rest_framework.permissions import AllowAny

from apps.users.permissions import IsWorker

from .models import ContentTranslation
from .serializers import ContentTranslationSerializer

RULES_KEY_PREFIX = 'rules.'


class BaseRulesView(generics.ListAPIView):
    """`?lang=uz|ru` — README §10, standart uz."""

    serializer_class = ContentTranslationSerializer

    def get_queryset(self):
        lang = self.request.query_params.get('lang', ContentTranslation.Lang.UZ)
        return ContentTranslation.objects.filter(
            key__startswith=RULES_KEY_PREFIX, lang=lang,
        )


class PublicRulesView(BaseRulesView):
    """GET /api/public/rules"""

    permission_classes = [AllowAny]


class WorkerRulesView(BaseRulesView):
    """GET /api/worker/rules"""

    permission_classes = [IsWorker]
