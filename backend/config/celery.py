import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('rent_electro')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'apply-daily-rental-fines': {
        'task': 'apps.rentals.tasks.apply_daily_fines',
        # README 7-bo'lim: har kuni 00:05 da ishga tushadi
        'schedule': crontab(hour=0, minute=5),
    },
}
