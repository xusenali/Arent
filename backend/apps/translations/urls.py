from django.urls import path

from .views import PublicRulesView, WorkerRulesView

urlpatterns = [
    path('api/public/rules', PublicRulesView.as_view(), name='public-rules'),
    path('api/worker/rules', WorkerRulesView.as_view(), name='worker-rules'),
]
