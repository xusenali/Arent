from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle

from .models import WorkerApplication
from .serializers import WorkerApplicationSerializer


class PublicWorkerApplicationCreateView(generics.CreateAPIView):
    """POST /api/public/worker-applications — "Ishchi bo'lish" arizasi"""

    serializer_class = WorkerApplicationSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'otp-request'  # bir xil turdagi ochiq forma — spam'dan himoya
