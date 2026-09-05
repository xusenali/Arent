from django.urls import path

from .views import (
    AdminApplicationApproveView,
    AdminApplicationListView,
    AdminApplicationRejectView,
    PublicWorkerApplicationCreateView,
)

urlpatterns = [
    path('api/public/worker-applications', PublicWorkerApplicationCreateView.as_view(), name='public-worker-applications'),
    path('api/admin/applications', AdminApplicationListView.as_view(), name='admin-application-list'),
    path('api/admin/applications/<uuid:id>/approve', AdminApplicationApproveView.as_view(), name='admin-application-approve'),
    path('api/admin/applications/<uuid:id>/reject', AdminApplicationRejectView.as_view(), name='admin-application-reject'),
]
