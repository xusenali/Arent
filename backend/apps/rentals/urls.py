from django.urls import path

from .views import (
    AdminEndRentalView,
    AdminRentalCreateView,
    AdminRentalMediaView,
    AdminRentalSettlementView,
    AdminWorkerActiveRentalView,
    WorkerDashboardView,
    WorkerEndRentalView,
)

urlpatterns = [
    path(
        'api/admin/workers/<uuid:worker_id>/rental',
        AdminWorkerActiveRentalView.as_view(),
        name='admin-worker-active-rental',
    ),
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
    path(
        'api/admin/workers/<uuid:worker_id>/rental/end',
        AdminEndRentalView.as_view(),
        name='admin-worker-rental-end',
    ),
    path(
        'api/admin/workers/<uuid:worker_id>/rental/settlement',
        AdminRentalSettlementView.as_view(),
        name='admin-worker-rental-settlement',
    ),
    path('api/worker/dashboard', WorkerDashboardView.as_view(), name='worker-dashboard'),
    path('api/worker/rental/end', WorkerEndRentalView.as_view(), name='worker-rental-end'),
]
