from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsSuperAdmin, IsWorker

from .models import WorkerLocation
from .serializers import AdminWorkerLocationSerializer, WorkerLocationCreateSerializer


class WorkerLocationCreateView(generics.CreateAPIView):
    """POST /api/worker/locations — GPS koordinatasini yuborish"""

    serializer_class = WorkerLocationCreateSerializer
    permission_classes = [IsWorker]

    def perform_create(self, serializer):
        serializer.save(worker=self.request.user)


class AdminLocationListView(APIView):
    """GET /api/admin/locations — barcha ishchilarning so'nggi joylashuvi"""

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        latest_locations = (
            WorkerLocation.objects.select_related('worker')
            .order_by('worker_id', '-recorded_at')
            .distinct('worker_id')
        )
        return Response(AdminWorkerLocationSerializer(latest_locations, many=True).data)
