from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('applications', '0004_add_battery_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='workerapplication',
            name='password_hash',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
