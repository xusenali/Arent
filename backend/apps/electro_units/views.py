from rest_framework import generics
from rest_framework.permissions import AllowAny

from apps.users.permissions import IsSuperAdmin

from .models import ElectroUnit
from .serializers import AdminElectroUnitSerializer, ElectroUnitSerializer


class PublicUnitListView(generics.ListAPIView):
    """GET /api/public/units"""
    serializer_class = ElectroUnitSerializer
    permission_classes = [AllowAny]
    queryset = ElectroUnit.objects.all()


class AdminUnitListCreateView(generics.ListCreateAPIView):
    """GET /api/admin/units  •  POST /api/admin/units"""
    serializer_class = AdminElectroUnitSerializer
    permission_classes = [IsSuperAdmin]
    queryset = ElectroUnit.objects.all()


class AdminUnitDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/admin/units/:id"""
    serializer_class = AdminElectroUnitSerializer
    permission_classes = [IsSuperAdmin]
    queryset = ElectroUnit.objects.all()
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']
