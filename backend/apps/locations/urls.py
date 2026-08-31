from django.urls import path

from .views import AdminLocationListView, WorkerLocationCreateView

urlpatterns = [
    path('api/admin/locations', AdminLocationListView.as_view(), name='admin-locations'),
    path('api/worker/locations', WorkerLocationCreateView.as_view(), name='worker-locations'),
]
