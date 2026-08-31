from django.urls import path

from .views import AdminRentalCreateView, AdminRentalMediaView, WorkerDashboardView

urlpatterns = [
    path(
        'api/admin/workers/<uuid:worker_id>/rentals',
        AdminRentalCreateView.as_view(),
        name='admin-worker-rental-create',
    ),
    path(
        'api/admin/workers/<uuid:worker_id>/rental-media',
        AdminRentalMediaView.as_view(),
        name='admin-worker-rental-media',
    ),
    path('api/worker/dashboard', WorkerDashboardView.as_view(), name='worker-dashboard'),
]
