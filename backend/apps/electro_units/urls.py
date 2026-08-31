from django.urls import path

from .views import PublicUnitListView

urlpatterns = [
    path('api/public/units', PublicUnitListView.as_view(), name='public-units'),
]
