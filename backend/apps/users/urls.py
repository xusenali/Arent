from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminDashboardStatsView,
    ConfirmPasswordResetView,
    LoginView,
    RequestPasswordResetView,
    VerifyOtpView,
    WorkerApproveView,
    WorkerDetailView,
    WorkerDocumentUploadView,
    WorkerListCreateView,
    WorkerLocationsView,
)

urlpatterns = [
    path('api/auth/login', LoginView.as_view(), name='auth-login'),
    path('api/auth/refresh-token', TokenRefreshView.as_view(), name='auth-refresh-token'),
    path('api/auth/reset-password/request', RequestPasswordResetView.as_view(), name='auth-reset-request'),
    path('api/auth/reset-password/verify-otp', VerifyOtpView.as_view(), name='auth-reset-verify'),
    path('api/auth/reset-password/confirm', ConfirmPasswordResetView.as_view(), name='auth-reset-confirm'),

    path('api/admin/dashboard/stats', AdminDashboardStatsView.as_view(), name='admin-dashboard-stats'),
    path('api/admin/workers', WorkerListCreateView.as_view(), name='admin-worker-list'),
    path('api/admin/workers/<uuid:id>', WorkerDetailView.as_view(), name='admin-worker-detail'),
    path('api/admin/workers/<uuid:id>/approve', WorkerApproveView.as_view(), name='admin-worker-approve'),
    path('api/admin/workers/<uuid:id>/documents', WorkerDocumentUploadView.as_view(), name='admin-worker-documents'),
    path('api/admin/locations', WorkerLocationsView.as_view(), name='admin-worker-locations'),
]
