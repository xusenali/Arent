"""Ishchi o'chirilganda transport bo'shashi kerak (regression testi)."""

import datetime

from django.test import TestCase

from apps.electro_units.models import ElectroUnit
from apps.payments.models import Payment
from apps.rentals import services
from apps.rentals.models import Rental
from apps.users.models import User


def make_unit(serial='SN-1', status=ElectroUnit.Status.RENTED):
    return ElectroUnit.objects.create(
        model_name='Test Scooter', serial_number=serial,
        status=status, price_per_day=10000,
    )


def make_rental(worker, unit, status=Rental.Status.ACTIVE):
    return Rental.objects.create(
        worker=worker, unit=unit,
        start_date=datetime.date(2026, 1, 1), period_days=30,
        due_date=datetime.date(2026, 1, 31), status=status,
    )


class WorkerDeleteFreesUnitTests(TestCase):
    def setUp(self):
        self.worker = User.objects.create_user(phone='+998900000001', full_name='Test Ishchi')
        self.unit = make_unit()
        self.rental = make_rental(self.worker, self.unit)

    def test_deleting_worker_frees_the_unit(self):
        """Asosiy bug: ishchi o'chirilgach transport 'rented' bo'lib qolardi."""
        self.worker.delete()

        self.unit.refresh_from_db()
        self.assertEqual(self.unit.status, ElectroUnit.Status.AVAILABLE)

    def test_deleting_worker_via_queryset_also_frees_the_unit(self):
        """queryset.delete() ham signal orqali qamrab olinadi."""
        User.objects.filter(pk=self.worker.pk).delete()

        self.unit.refresh_from_db()
        self.assertEqual(self.unit.status, ElectroUnit.Status.AVAILABLE)

    def test_maintenance_unit_is_not_touched(self):
        """Ta'mirlashdagi transport 'bo'sh' deb belgilanmasligi kerak."""
        self.unit.status = ElectroUnit.Status.MAINTENANCE
        self.unit.save(update_fields=['status'])

        self.worker.delete()

        self.unit.refresh_from_db()
        self.assertEqual(self.unit.status, ElectroUnit.Status.MAINTENANCE)

    def test_other_workers_units_are_not_touched(self):
        boshqa_worker = User.objects.create_user(phone='+998900000002', full_name='Boshqa')
        boshqa_unit = make_unit(serial='SN-2')
        make_rental(boshqa_worker, boshqa_unit)

        self.worker.delete()

        boshqa_unit.refresh_from_db()
        self.assertEqual(boshqa_unit.status, ElectroUnit.Status.RENTED)


class EndRentalTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='+998900000009', full_name='Admin', role=User.Role.SUPER_ADMIN,
        )
        self.worker = User.objects.create_user(phone='+998900000003', full_name='Ishchi')
        self.unit = make_unit(serial='SN-3')
        self.rental = make_rental(self.worker, self.unit)

    def test_end_rental_completes_and_frees(self):
        services.end_rental(self.rental, actor=self.admin, note='test')

        self.rental.refresh_from_db()
        self.unit.refresh_from_db()
        self.assertEqual(self.rental.status, Rental.Status.COMPLETED)
        self.assertEqual(self.unit.status, ElectroUnit.Status.AVAILABLE)

    def test_end_rental_waives_open_fines(self):
        fine = Payment.objects.create(rental=self.rental, amount=5000, is_fine=True)

        services.end_rental(self.rental, actor=self.admin, note='bekor')

        fine.refresh_from_db()
        self.assertIsNotNone(fine.paid_at)
        self.assertEqual(fine.paid_amount, 0)

    def test_end_rental_is_idempotent(self):
        services.end_rental(self.rental, actor=self.admin)
        services.end_rental(self.rental, actor=self.admin)   # ikkinchi marta — xato bo'lmasin

        self.unit.refresh_from_db()
        self.assertEqual(self.unit.status, ElectroUnit.Status.AVAILABLE)


class FreeOrphanUnitsTests(TestCase):
    def test_frees_units_with_no_active_rental(self):
        osilib_qolgan = make_unit(serial='SN-ORPHAN')     # ijarasi yo'q, lekin 'rented'

        worker = User.objects.create_user(phone='+998900000004', full_name='Ishchi')
        band = make_unit(serial='SN-BUSY')
        make_rental(worker, band)                          # haqiqatan band

        freed = services.free_orphan_units()

        self.assertEqual([u.id for u in freed], [osilib_qolgan.id])
        osilib_qolgan.refresh_from_db()
        band.refresh_from_db()
        self.assertEqual(osilib_qolgan.status, ElectroUnit.Status.AVAILABLE)
        self.assertEqual(band.status, ElectroUnit.Status.RENTED)

    def test_completed_rental_unit_is_an_orphan(self):
        worker = User.objects.create_user(phone='+998900000005', full_name='Ishchi')
        unit = make_unit(serial='SN-DONE')
        make_rental(worker, unit, status=Rental.Status.COMPLETED)

        services.free_orphan_units()

        unit.refresh_from_db()
        self.assertEqual(unit.status, ElectroUnit.Status.AVAILABLE)
