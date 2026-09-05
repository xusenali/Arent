"""Ijara narxi hisoblash."""

PERIOD_DAYS: dict[str, int] = {
    'daily':   1,
    'weekly':  7,
    'monthly': 30,
}

# Velosiped narxlari (so'm)
BIKE_PRICES: dict[str, int] = {
    'daily':   20_000,
    'weekly':  100_000,
    'monthly': 400_000,
}

# Skuter faqat haftalik — batareya soniga qarab
SCOOTER_WEEKLY_PRICES: dict[int, int] = {
    1: 350_000,
    2: 450_000,
}


def calc_amount(unit, period_type: str, battery_count: int | None = None) -> int:
    """Transport turi, davr va batareya soniga qarab to'lov miqdorini qaytaradi (so'm)."""
    if unit is None:
        return 0

    if unit.unit_type == 'scooter':
        # Skuter uchun faqat haftalik; battery_count berilmasa 1 ta deb hisoblanadi
        bc = battery_count if battery_count in (1, 2) else 1
        return SCOOTER_WEEKLY_PRICES[bc]

    # Velosiped
    return BIKE_PRICES.get(period_type, BIKE_PRICES['weekly'])


# Backwards-compat alias used by older call sites
_calc_amount = calc_amount
