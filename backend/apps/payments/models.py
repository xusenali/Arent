from django.conf import settings
from django.db import models

from apps.common.models import UUIDModel


class Payment(UUIDModel):
    """Ijara bo'yicha bitta hisob-kitob yozuvi.

    Ikki xil bo'ladi:
      * davr to'lovi (``is_fine=False``) — ijara davri uchun asosiy narx;
      * jarima (``is_fine=True``)      — kechiktirilgan har bir kun uchun.

    Yozuv yaratilganda u *qarz*: ``amount`` to'lanishi kerak bo'lgan summa.
    Admin tasdiqlaganda ``paid_amount`` (haqiqatda olingan pul), ``method``,
    ``covered_days`` va ``received_by`` to'ldiriladi — shu uchlik audit izini
    beradi va daromad hisoboti doim ``paid_amount`` bo'yicha olinadi.
    """

    class Method(models.TextChoices):
        CASH    = 'cash',    'Naqd'
        RECEIPT = 'receipt', 'Chek orqali'

    rental = models.ForeignKey('rentals.Rental', on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_fine = models.BooleanField(default=False)
    fine_days_count = models.PositiveIntegerField(null=True, blank=True)

    # ── tasdiqlash natijasi ──────────────────────────────────────────────────
    paid_at      = models.DateTimeField(null=True, blank=True)
    paid_amount  = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    method       = models.CharField(max_length=10, choices=Method.choices, null=True, blank=True)
    covered_days = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Bu to'lov ijara muddatini necha kunga uzaytirgani.",
    )
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='confirmed_payments',
    )
    # Jarima alohida to'lanmay, boshqa tasdiqlash ichida yopilgan bo'lsa —
    # o'sha tasdiqlangan to'lovga ishora qiladi (daromad ikki marta sanalmasligi uchun).
    settled_by = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='settled_fines',
    )
    note = models.CharField(max_length=255, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']
        indexes = [
            # Ochiq qarzni topish — eng ko'p ishlatiladigan so'rov.
            models.Index(fields=['rental', 'is_fine', 'paid_at'], name='pay_rental_kind_paid_idx'),
            # Daromad hisoboti.
            models.Index(fields=['paid_at'], name='pay_paid_at_idx'),
        ]

    def __str__(self):
        kind = 'Jarima' if self.is_fine else "To'lov"
        return f'{kind} — {self.amount} ({self.rental_id})'

    @property
    def is_paid(self) -> bool:
        return self.paid_at is not None


class PaymentReceipt(UUIDModel):
    """Ishchi yuklagan to'lov cheki surati. Admin uni ishchi sahifasida ko'rib tasdiqlaydi."""

    class Status(models.TextChoices):
        PENDING  = 'pending',  'Kutilmoqda'
        APPROVED = 'approved', 'Tasdiqlangan'
        REJECTED = 'rejected', 'Rad etilgan'

    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='receipts')
    receipt_image = models.ImageField(upload_to='payment_receipts/')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reviewed_receipts',
    )
    reviewed_at   = models.DateTimeField(null=True, blank=True)
    reject_reason = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        db_table = 'payment_receipts'
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['status', '-uploaded_at'], name='receipt_status_time_idx'),
        ]

    def __str__(self):
        return f'Chek {self.id} — {self.status}'


class PaymentCard(UUIDModel):
    """Ishchilar pul o'tkazadigan karta — bitta yagona yozuv (singleton).

    Admin uni sidebar'dagi profil blokidan kiritadi, ishchi esa to'lov
    modalida ko'radi. Yozuv har doim bitta bo'lishi uchun ``load()`` ishlatiladi.
    """

    number     = models.CharField(max_length=16, help_text='Faqat raqamlar, 16 xona.')
    holder     = models.CharField(max_length=100, blank=True, default='')
    bank       = models.CharField(max_length=64, blank=True, default='')
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_card'

    def __str__(self):
        return self.masked

    @property
    def masked(self) -> str:
        """Ro'yxatlarda ko'rsatish uchun: 8600 **** **** 1234."""
        n = self.number
        return f'{n[:4]} **** **** {n[-4:]}' if len(n) == 16 else n

    @classmethod
    def load(cls):
        """Yagona yozuvni qaytaradi (hali kiritilmagan bo'lsa ``None``)."""
        return cls.objects.select_related('updated_by').first()
