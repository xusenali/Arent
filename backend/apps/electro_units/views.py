from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import ElectroUnit
from .serializers import ElectroUnitSerializer


class PublicUnitListView(generics.ListAPIView):
    """GET /api/public/units"""

    serializer_class = ElectroUnitSerializer
    permission_classes = [AllowAny]
    queryset = ElectroUnit.objects.all()
