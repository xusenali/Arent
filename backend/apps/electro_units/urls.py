from django.urls import path

from .views import AdminUnitDetailView, AdminUnitListCreateView, PublicUnitListView

urlpatterns = [
    path('api/public/units', PublicUnitListView.as_view(), name='public-units'),
    path('api/admin/units', AdminUnitListCreateView.as_view(), name='admin-unit-list'),
    path('api/admin/units/<uuid:id>', AdminUnitDetailView.as_view(), name='admin-unit-detail'),
]
