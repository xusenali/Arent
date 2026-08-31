from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),

    path('', include('apps.users.urls')),
    path('', include('apps.rentals.urls')),
    path('', include('apps.payments.urls')),
    path('', include('apps.locations.urls')),
    path('', include('apps.electro_units.urls')),
    path('', include('apps.applications.urls')),
    path('', include('apps.translations.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
