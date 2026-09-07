"""To'lov domeni — ijara bo'yicha barcha pul mantig'i shu modulda.

Tashqi kod (view, celery task) hech qachon ``Payment`` yozuvlarini o'zi
o'zgartirmaydi; faqat shu yerdagi funksiyalarni chaqiradi. Shu tufayli
qulflash (``select_for_update``), idempotentlik va audit izi bitta joyda
kafolatlanadi.

Asosiy tushunchalar
-------------------
``amount``        — hisoblangan qarz.
``paid_amount``   — haqiqatda olingan pul. Daromad **doim** shu maydondan olinadi.
``covered_days``  — admin "bu pul shuncha kunni qoplaydi" deb kiritgan qiymat;
                    ijara ``due_date`` ayni shuncha kunga uzayadi.
``settled_by``    — jarima alohida to'lanmay, boshqa tasdiqlash ichida yopilgan
                    bo'lsa, o'sha to'lovga ishora qiladi (``paid_amount=0``),
                    shuning uchun daromadda ikki marta sanalmaydi.
"""

from __future__ import annotations

import datetime
from dataclasses import dataclass
from decimal import ROUND_CEILING, Decimal, InvalidOperation

from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone

from .models import Payment
from .pricing import PERIOD_KEY_BY_DAYS, calc_amount

# Kunlik jarima miqdori transport turiga qarab (so'm)
DAILY_FINE_BY_TYPE = {
    'scooter': 70_000,
    'bike':    30_000,
}
DEFAULT_DAILY_FINE = 30_000

# Bir ijara bo'yicha jarima shuncha kundan ortiq o'smaydi.
MAX_FINE_DAYS = 30

# Admin bir marta kirita oladigan eng ko'p kun (xato terishdan himoya).
MAX_COVERED_DAYS = 365


class PaymentError(Exception):
    """To'lovni tasdiqlab bo'lmadi (biznes qoidasi buzildi)."""


# ─── kiruvchi qiymatlarni tekshirish ─────────────────────────────────────────

def parse_amount(raw) -> Decimal:
    """'200 000' / '200,000' / 200000 ko'rinishlarini Decimal ga aylantiradi."""
    if raw is None or raw == '':
        raise PaymentError('Summa majburiy.')
    try:
        value = Decimal(str(raw).replace(' ', '').replace(',', '').replace(' ', ''))
    except (InvalidOperation, ValueError):
        raise PaymentError("Summa noto'g'ri formatda.") from None
    if value <= 0:
        raise PaymentError("Summa musbat son bo'lishi kerak.")
    return value.quantize(Decimal('1.00'))


def parse_days(raw) -> int:
    """Admin kiritgan 'necha kunga amal qiladi' qiymatini tekshiradi."""
    if raw is None or raw == '':
        raise PaymentError('Kunlar soni majburiy.')
    try:
        days = int(raw)
    except (TypeError, ValueError):
        raise PaymentError("Kunlar soni butun son bo'lishi kerak.") from None
    if not 1 <= days <= MAX_COVERED_DAYS:
        raise PaymentError(f'Kunlar soni 1 va {MAX_COVERED_DAYS} orasida bo\'lishi kerak.')
    return days


# ─── narx hisoblash ──────────────────────────────────────────────────────────

def daily_fine_amount(rental) -> int:
    """Transport turiga mos kunlik jarima summasi."""
    return DAILY_FINE_BY_TYPE.get(rental.unit.unit_type, DEFAULT_DAILY_FINE)


def period_amount(rental) -> int:
    """Ijara davrining asosiy narxi — batareya soni ijaraning o'zida saqlanadi."""
    period_key = PERIOD_KEY_BY_DAYS.get(rental.period_days, 'weekly')
    return calc_amount(rental.unit, period_key, rental.battery_count)


# ─── qarz holati ─────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Outstanding:
    """Ijara bo'yicha yopilmagan qarz."""
    period: Decimal
    fine: Decimal

    @property
    def total(self) -> Decimal:
        return self.period + self.fine


def outstanding(rental) -> Outstanding:
    """Ochiq davr to'lovlari va jarimalarni bitta so'rovda yig'adi."""
    rows = (
        Payment.objects
        .filter(rental_id=rental.pk, paid_at__isnull=True)
        .values('is_fine')
        .annotate(total=Sum('amount'))
    )
    totals = {row['is_fine']: row['total'] or Decimal(0) for row in rows}
    return Outstanding(period=totals.get(False, Decimal(0)), fine=totals.get(True, Decimal(0)))


def open_period_payment(rental):
    """Eng eski yopilmagan davr to'lovi (jarima emas) yoki ``None``."""
    return (
        Payment.objects
        .filter(rental_id=rental.pk, is_fine=False, paid_at__isnull=True)
        .order_by('created_at')
        .first()
    )


# ─── ijara holatini yangilash ────────────────────────────────────────────────

def _open_period_exists(rental) -> bool:
    return Payment.objects.filter(
        rental_id=rental.pk, is_fine=False, paid_at__isnull=True,
    ).exists()


def _charge_next_period(rental) -> Payment:
    """Ijarani keyingi davrga o'tkazadi: ``due_date`` uzayadi va yangi qarz yoziladi.

    Jarimalar bu yerda yangi to'lovga **qo'shilmaydi** — ular mustaqil qarz
    bo'lib ochiq qoladi, aks holda bir xil pul ikki yozuvda sanalardi.
    """
    rental.due_date += datetime.timedelta(days=rental.period_days)
    rental.save(update_fields=['due_date'])
    return Payment.objects.create(rental=rental, amount=period_amount(rental), is_fine=False)


def _accrue_daily_fine(rental, today: datetime.date) -> bool:
    """Bugungi jarimani yozadi. Bir kunda bir marta, ``MAX_FINE_DAYS`` gacha."""
    fines = Payment.objects.filter(rental_id=rental.pk, is_fine=True)
    if fines.filter(created_at__date=today).exists() or fines.count() >= MAX_FINE_DAYS:
        return False
    Payment.objects.create(
        rental=rental,
        amount=daily_fine_amount(rental),
        is_fine=True,
        fine_days_count=1,
    )
    return True


@transaction.atomic
def sync_rental_state(rental, today: datetime.date | None = None):
    """Ijarani bugungi sanaga moslaydi — idempotent va qulflangan.

    Celery kunlik vazifasi ham, admin/ishchi sahifalari ham shu funksiyani
    chaqiradi. Shuning uchun Celery ishlamay qolsa ham holat sahifa ochilganda
    o'zini to'g'rilaydi.

    Ketma-ketlik:
      1. Muddat o'tgan va ochiq davr qarzi yo'q -> keyingi davrga o'tkazish.
      2. Muddat o'tgan va ochiq davr qarzi bor -> OVERDUE + bugungi jarima.
      3. Muddat o'tmagan -> ACTIVE.
    """
    from apps.rentals.models import Rental

    today = today or timezone.localdate()
    rental = Rental.objects.select_for_update().select_related('unit').get(pk=rental.pk)

    if rental.status == Rental.Status.COMPLETED:
        return rental

    if rental.due_date < today and not _open_period_exists(rental):
        _charge_next_period(rental)

    if rental.due_date < today:
        if rental.status != Rental.Status.OVERDUE:
            rental.status = Rental.Status.OVERDUE
            rental.save(update_fields=['status'])
        _accrue_daily_fine(rental, today)
    elif rental.status != Rental.Status.ACTIVE:
        rental.status = Rental.Status.ACTIVE
        rental.save(update_fields=['status'])

    return rental


# ─── to'lovni tasdiqlash ─────────────────────────────────────────────────────

def _due_date_after(rental, days: int, closes_open_charge: bool) -> datetime.date:
    """To'lov tasdiqlangandan keyingi ``due_date``.

    Muhim nuqta: ochiq davr qarzi *allaqachon* ``due_date`` bilan berilgan
    davrga tegishli. Ijara ochilganda ham, ``_charge_next_period`` da ham
    ``due_date`` uzaytirilishi va qarz yozilishi birga bo'ladi.

    Shuning uchun o'sha qarz to'langanda kun **qo'shilmaydi**, balki davr
    boshidan qayta o'lchanadi:

        due_date = davr_boshi + covered_days

    Masalan: ijara 8-sentabrda ochildi, davr 7 kun, ``due_date`` = 15-sentabr.
    Ishchi 7 kunlik to'lovni to'lasa, muddat 15-sentabrligicha qoladi —
    22-sentabrga ketmaydi. Admin 3 kun deb yozsa, muddat 11-sentabr bo'ladi.

    Ochiq qarz bo'lmasa (ishchi oldindan qo'shimcha to'lasa) — kun mavjud
    muddat ustiga qo'shiladi.
    """
    if not closes_open_charge:
        return rental.due_date + datetime.timedelta(days=days)

    period_start = rental.due_date - datetime.timedelta(days=rental.period_days)
    return period_start + datetime.timedelta(days=days)


@transaction.atomic
def confirm_payment(*, rental, amount: Decimal, days: int, method: str, actor,
                    receipt=None, note: str = '') -> Payment:
    """Admin to'lovni tasdiqlaydi: ``amount`` so'm olindi, ``days`` kunga amal qiladi.

    Naqd to'lov ham, chek tasdiqlash ham ayni shu yo'ldan o'tadi.

    Bajariladigan ishlar:
      * ochiq davr qarzi yopiladi (yo'q bo'lsa — yangi yozuv yaratiladi);
      * ``due_date`` aynan ``days`` kunga uzaytiriladi — bugundan emas, mavjud
        muddatdan, shu tufayli kechikkan kunlar bepul qolib ketmaydi;
      * ochiq jarimalar shu to'lov ichida yopilgan deb belgilanadi;
      * yangi ``due_date`` ga qarab ijara ACTIVE yoki OVERDUE bo'ladi.
    """
    from apps.rentals.models import Rental

    rental = Rental.objects.select_for_update().select_related('unit').get(pk=rental.pk)
    if rental.status == Rental.Status.COMPLETED:
        raise PaymentError("Ijara yakunlangan, to'lov qabul qilib bo'lmaydi.")

    now = timezone.now()

    if receipt is not None:
        payment = Payment.objects.select_for_update().get(pk=receipt.payment_id)
        if payment.paid_at is not None:
            raise PaymentError("Bu to'lov allaqachon tasdiqlangan.")
        closes_open_charge = True
    else:
        existing = open_period_payment(rental)
        closes_open_charge = existing is not None
        payment = (
            Payment.objects.select_for_update().get(pk=existing.pk)
            if existing else
            Payment.objects.create(rental=rental, amount=amount, is_fine=False)
        )

    payment.amount       = amount
    payment.paid_amount  = amount
    payment.covered_days = days
    payment.method       = method
    payment.received_by  = actor
    payment.paid_at      = now
    payment.note         = note[:255]
    payment.save(update_fields=[
        'amount', 'paid_amount', 'covered_days', 'method',
        'received_by', 'paid_at', 'note',
    ])

    # Ochiq jarimalar shu tasdiqlash ichida yopiladi. paid_amount=0 — pul
    # faqat yuqoridagi yozuvda hisoblanadi, daromad ikki marta sanalmaydi.
    Payment.objects.filter(
        rental_id=rental.pk, is_fine=True, paid_at__isnull=True,
    ).update(paid_at=now, paid_amount=0, settled_by=payment, received_by=actor)

    rental.due_date = _due_date_after(rental, days, closes_open_charge)
    rental.status = (
        Rental.Status.ACTIVE if rental.due_date >= timezone.localdate()
        else Rental.Status.OVERDUE
    )
    rental.save(update_fields=['due_date', 'status'])

    return payment


@transaction.atomic
def waive_open_fines(rental, *, actor, note: str) -> int:
    """Ochiq jarimalarni bekor qiladi — o'chirmaydi, iz qoldiradi.

    Ijara yakunlanganda ishlatiladi: yozuv DB da qoladi, ``paid_amount=0`` va
    ``note`` orqali kim bekor qilgani ko'rinadi.
    """
    return Payment.objects.filter(
        rental_id=rental.pk, is_fine=True, paid_at__isnull=True,
    ).update(paid_at=timezone.now(), paid_amount=0, received_by=actor, note=note[:255])


# ─── erta yakunlash hisob-kitobi ─────────────────────────────────────────────

@dataclass(frozen=True)
class Settlement:
    """Ijarani erta yakunlashdagi yakuniy hisob.

    ``net`` musbat bo'lsa admin ishchiga qaytaradi, manfiy bo'lsa ishchi to'laydi.
    """
    days_used: int          # joriy davrda foydalanilgan kunlar
    unused_days: int        # to'langan, lekin foydalanilmagan kunlar
    daily_rate: Decimal     # bir kunlik narx
    refund: Decimal         # foydalanilmagan kunlar uchun qaytariladigan pul
    charge_due: Decimal     # to'lanmagan davr uchun foydalanilgan kunlar haqi
    fine_due: Decimal       # ochiq jarimalar
    net: Decimal            # refund - charge_due - fine_due

    @property
    def refund_to_worker(self) -> Decimal:
        return self.net if self.net > 0 else Decimal(0)

    @property
    def payable_by_worker(self) -> Decimal:
        return -self.net if self.net < 0 else Decimal(0)


def _last_covered_payment(rental):
    """Oxirgi tasdiqlangan davr to'lovi — qaytarish hisobi shunga tayanadi."""
    return (
        Payment.objects
        .filter(rental_id=rental.pk, is_fine=False, paid_at__isnull=False,
                covered_days__gt=0, paid_amount__gt=0)
        .order_by('-paid_at')
        .first()
    )


def _ceil_sum(value: Decimal) -> Decimal:
    """So'mni butun songa yaxlitlaydi (yuqoriga)."""
    return value.to_integral_value(rounding=ROUND_CEILING)


def settlement_preview(rental, today: datetime.date | None = None) -> Settlement:
    """Ijarani bugun yakunlaganda kim kimga qancha qarzdorligini hisoblaydi.

    Ikkala to'lov tartibi bitta formula bilan qamraladi:

    * ``pay_timing='start'`` — ishchi oldindan to'lagan. Muddat tugamagan
      bo'lsa, qolgan kunlar uchun pul **qaytariladi**.
    * ``pay_timing='end'``  — davr uchun qarz ochiq. Faqat **foydalanilgan
      kunlar** uchun haq olinadi, qolgani bekor qilinadi.

    Ochiq jarimalar har ikki holatda ham hisobdan chiqariladi.
    """
    today = today or timezone.localdate()

    # 1. To'langan, lekin foydalanilmagan kunlar -> qaytariladigan pul.
    refund, unused_days, daily_rate = Decimal(0), 0, Decimal(0)
    paid = _last_covered_payment(rental)
    if paid and rental.due_date > today:
        unused_days = min((rental.due_date - today).days, paid.covered_days)
        daily_rate  = Decimal(paid.paid_amount) / paid.covered_days
        refund      = _ceil_sum(daily_rate * unused_days)

    # 2. Ochiq davr qarzi -> faqat foydalanilgan kunlar uchun.
    charge_due, days_used = Decimal(0), 0
    open_charge = open_period_payment(rental)
    if open_charge and rental.period_days:
        period_start = rental.due_date - datetime.timedelta(days=rental.period_days)
        days_used    = min(max((today - period_start).days, 1), rental.period_days)
        charge_rate  = Decimal(open_charge.amount) / rental.period_days
        charge_due   = _ceil_sum(charge_rate * days_used)
        if not daily_rate:
            daily_rate = charge_rate

    fine_due = outstanding(rental).fine

    return Settlement(
        days_used=days_used,
        unused_days=unused_days,
        daily_rate=daily_rate.quantize(Decimal('1.00')),
        refund=refund,
        charge_due=charge_due,
        fine_due=fine_due,
        net=refund - charge_due - fine_due,
    )


@transaction.atomic
def settle_and_close_rental(rental, *, actor, today: datetime.date | None = None) -> Settlement:
    """Hisob-kitobni yozib, ijarani yakunlaydi va transportni bo'shatadi.

    Daftarda har bir bo'lak alohida qoladi — qaytarilgan pul manfiy
    ``paid_amount`` bilan yoziladi, shuning uchun daromad yig'indisi
    o'z-o'zidan to'g'rilanadi.
    """
    from apps.electro_units.models import ElectroUnit
    from apps.rentals.models import Rental

    today  = today or timezone.localdate()
    rental = Rental.objects.select_for_update().select_related('unit').get(pk=rental.pk)
    if rental.status == Rental.Status.COMPLETED:
        raise PaymentError('Ijara allaqachon yakunlangan.')

    result = settlement_preview(rental, today)
    now    = timezone.now()

    # Ochiq davr qarzi foydalanilgan kunlarga qisqartirilib yopiladi.
    open_charge = open_period_payment(rental)
    if open_charge:
        open_charge.amount       = result.charge_due
        open_charge.paid_amount  = result.charge_due
        open_charge.covered_days = result.days_used
        open_charge.method       = Payment.Method.CASH
        open_charge.received_by  = actor
        open_charge.paid_at      = now
        open_charge.note         = f'Erta yakunlash — {result.days_used} kun uchun'
        open_charge.save(update_fields=[
            'amount', 'paid_amount', 'covered_days', 'method',
            'received_by', 'paid_at', 'note',
        ])

    # Jarimalar yopiladi — ular hisobda alohida ko'rinadi.
    Payment.objects.filter(
        rental_id=rental.pk, is_fine=True, paid_at__isnull=True,
    ).update(paid_at=now, paid_amount=F('amount'), received_by=actor,
             note='Erta yakunlash hisobiga kiritildi')

    # Qaytarilgan pul manfiy yozuv sifatida qoladi (daromaddan ayriladi).
    if result.refund > 0:
        Payment.objects.create(
            rental=rental,
            amount=-result.refund,
            paid_amount=-result.refund,
            is_fine=False,
            method=Payment.Method.CASH,
            received_by=actor,
            covered_days=0,
            paid_at=now,
            note=f'Erta yakunlash — {result.unused_days} kun uchun qaytarildi',
        )

    rental.due_date = min(rental.due_date, today)
    rental.status   = Rental.Status.COMPLETED
    rental.save(update_fields=['due_date', 'status'])

    rental.unit.status = ElectroUnit.Status.AVAILABLE
    rental.unit.save(update_fields=['status'])

    return result
