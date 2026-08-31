import secrets

from django.conf import settings
from django.core.cache import cache

CACHE_KEY_TEMPLATE = 'otp:reset-password:{phone}'


def _cache_key(phone: str) -> str:
    return CACHE_KEY_TEMPLATE.format(phone=phone)


def generate_otp_code() -> str:
    return f'{secrets.randbelow(1_000_000):06d}'


def store_otp(phone: str, code: str) -> None:
    cache.set(_cache_key(phone), code, timeout=settings.OTP_TTL_SECONDS)


def get_otp(phone: str) -> str | None:
    return cache.get(_cache_key(phone))


def clear_otp(phone: str) -> None:
    cache.delete(_cache_key(phone))
