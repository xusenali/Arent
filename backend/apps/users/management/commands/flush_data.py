from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = 'Super admin dan tashqari barcha ma\'lumotlarni o\'chiradi'

    def add_arguments(self, parser):
        parser.add_argument(
            '--yes',
            action='store_true',
            help='Tasdiqlash so\'rovisiz bajarish',
        )

    def handle(self, *args, **options):
        if not options['yes']:
            confirm = input(
                '\n⚠️  DIQQAT: Bu amal barcha ishchilar, ijaralar, to\'lovlar, '
                'arizalar va transport ma\'lumotlarini O\'CHIRADI.\n'
                'Super admin faqat qoladi.\n\n'
                'Davom etishni xohlaysizmi? (yes/no): '
            )
            if confirm.strip().lower() != 'yes':
                self.stdout.write(self.style.WARNING('Bekor qilindi.'))
                return

        with transaction.atomic():
            from apps.locations.models import WorkerLocation
            from apps.payments.models import Payment, Receipt
            from apps.rentals.models import Rental
            from apps.applications.models import WorkerApplication
            from apps.electro_units.models import ElectroUnit
            from apps.users.models import User

            # 1. Cheklar
            r_count = Receipt.objects.all().delete()[0]
            self.stdout.write(f'  Cheklar o\'chirildi: {r_count}')

            # 2. To'lovlar
            p_count = Payment.objects.all().delete()[0]
            self.stdout.write(f'  To\'lovlar o\'chirildi: {p_count}')

            # 3. Ijaralar
            ren_count = Rental.objects.all().delete()[0]
            self.stdout.write(f'  Ijaralar o\'chirildi: {ren_count}')

            # 4. Lokatsiyalar
            loc_count = WorkerLocation.objects.all().delete()[0]
            self.stdout.write(f'  Lokatsiyalar o\'chirildi: {loc_count}')

            # 5. Arizalar
            app_count = WorkerApplication.objects.all().delete()[0]
            self.stdout.write(f'  Arizalar o\'chirildi: {app_count}')

            # 6. Transportlar statusini 'available' ga qaytarish
            eu_count = ElectroUnit.objects.update(status=ElectroUnit.Status.AVAILABLE)
            self.stdout.write(f'  Transportlar "available" ga qaytarildi: {eu_count}')

            # 7. Ishchilarni o'chirish (super_admin qoladi)
            w_count = User.objects.filter(role=User.Role.WORKER).delete()[0]
            self.stdout.write(f'  Ishchilar o\'chirildi: {w_count}')

            admins = User.objects.filter(role=User.Role.SUPER_ADMIN)
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ Tozalandi. Qolgan super adminlar: {admins.count()}'
                )
            )
            for a in admins:
                self.stdout.write(f'   → {a.full_name} ({a.phone})')
