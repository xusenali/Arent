from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.db import DatabaseError, connection
from django.http import JsonResponse
from django.urls import include, path


def health_check(request):
    """Keep-alive ping uchun. DB ga ham tegadi — shunda ping faqat gunicorn'ni
    emas, DB ulanishini ham iliq ushlaydi va DB ishlamasa buni ko'rsatadi."""
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
    except DatabaseError:
        return JsonResponse({'status': 'error', 'db': 'unavailable'}, status=503)
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('health/', health_check, name='health-check'),
    path('admin/', admin.site.urls),

    path('', include('apps.users.urls')),
    path('', include('apps.rentals.urls')),
    path('', include('apps.payments.urls')),
    path('', include('apps.locations.urls')),
    path('', include('apps.electro_units.urls')),
    path('', include('apps.translations.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
