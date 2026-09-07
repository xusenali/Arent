"""Ijara tariflari.

Narxlar to'lov domenining bir qismi, shuning uchun ``payments`` ichida turadi.
Bu yerda faqat toza hisob-kitob bor — DB ga murojaat qilinmaydi.
"""

PERIOD_DAYS: dict[str, int] = {
    'daily':   1,
    'weekly':  7,
    'monthly': 30,
}

# Kun soni -> tarif kaliti (PERIOD_DAYS ning teskarisi)
PERIOD_KEY_BY_DAYS: dict[int, str] = {days: key for key, days in PERIOD_DAYS.items()}

# Velosiped narxlari (so'm)
BIKE_PRICES: dict[str, int] = {
    'daily':   30_000,
    'weekly':  100_000,
    'monthly': 400_000,
}

# Skuter faqat haftalik — batareya soniga qarab
SCOOTER_WEEKLY_PRICES: dict[int, int] = {
    1: 350_000,
    2: 450_000,
}


def calc_amount(unit, period_type: str, battery_count: int | None = None) -> int:
    """Transport turi, davr va batareya soniga qarab to'lov summasini qaytaradi (so'm)."""
    if unit is None:
        return 0

    if unit.unit_type == 'scooter':
        # Skuter uchun faqat haftalik tarif; batareya ko'rsatilmasa 1 ta deb olinadi.
        return SCOOTER_WEEKLY_PRICES[battery_count if battery_count in (1, 2) else 1]

    return BIKE_PRICES.get(period_type, BIKE_PRICES['weekly'])
