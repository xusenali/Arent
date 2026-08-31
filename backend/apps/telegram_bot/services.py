import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

TELEGRAM_API_URL = 'https://api.telegram.org/bot{token}/sendMessage'


def send_otp_message(chat_id: str, code: str) -> bool:
    """
    Telegram Bot API orqali OTP kodini yuboradi.
    Bot tokeni sozlanmagan bo'lsa (lokal dev), xabar log qilinadi va True qaytariladi.
    """
    text = (
        f'🔐 Ashrapov Rent — parolni tiklash kodi:\n\n'
        f'<b>{code}</b>\n\n'
        f'Kod 5 daqiqa amal qiladi. Hech kimga bermang!'
    )

    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning('TELEGRAM_BOT_TOKEN sozlanmagan. OTP (dev rejimi): chat_id=%s code=%s', chat_id, code)
        return True

    url = TELEGRAM_API_URL.format(token=settings.TELEGRAM_BOT_TOKEN)
    try:
        response = requests.post(
            url,
            json={'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'},
            timeout=5,
        )
        response.raise_for_status()
        return True
    except requests.RequestException:
        logger.exception('Telegram orqali OTP yuborishda xatolik (chat_id=%s)', chat_id)
        return False
