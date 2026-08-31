from django.urls import path

from .views import PublicWorkerApplicationCreateView

urlpatterns = [
    path(
        'api/public/worker-applications',
        PublicWorkerApplicationCreateView.as_view(),
        name='public-worker-applications',
    ),
]
