"""
Ashrapov Rent — Telegram bot (BACKEND_README §4).

Ishga tushirish: `python manage.py run_telegram_bot`

Funksiyalar:
  1. /start      → telefon raqam so'raydi → telegram_chat_id saqlaydi
  2. /reset      → bot ichida parolni tiklash (OTP → yangi parol)
  3. 📍 Location → worker koordinatalarini DBga yozadi (live location ham)
"""
import logging

from asgiref.sync import sync_to_async
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from telegram import KeyboardButton, ReplyKeyboardMarkup, ReplyKeyboardRemove, Update
from telegram.ext import (
    Application,
    CommandHandler,
    ConversationHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from apps.telegram_bot.otp import clear_otp, generate_otp_code, get_otp, store_otp

logger = logging.getLogger(__name__)

# Conversation states
RESET_WAIT_OTP, RESET_WAIT_PASSWORD = range(2)

# Klaviaturalar
MAIN_KEYBOARD = ReplyKeyboardMarkup(
    [
        [KeyboardButton('📱 Telefon raqamni yuborish', request_contact=True)],
        [KeyboardButton('📍 Joylashuvimni ulashish', request_location=True)],
    ],
    resize_keyboard=True,
)

CONTACT_ONLY_KEYBOARD = ReplyKeyboardMarkup(
    [[KeyboardButton('📱 Telefon raqamni yuborish', request_contact=True)]],
    resize_keyboard=True,
    one_time_keyboard=True,
)

LOCATION_KEYBOARD = ReplyKeyboardMarkup(
    [[KeyboardButton('📍 Joylashuvimni ulashish', request_location=True)]],
    resize_keyboard=True,
)


# ---------------------------------------------------------------------------
# /start
# ---------------------------------------------------------------------------

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    from apps.users.models import User

    chat_id = str(update.effective_chat.id)
    user = await sync_to_async(
        lambda: User.objects.filter(telegram_chat_id=chat_id).first()
    )()

    if user:
        await update.message.reply_text(
            f"Salom, {user.full_name}! 👋\n\n"
            "📍 Joylashuvingizni ulash uchun quyidagi tugmani bosing.\n"
            "🔐 Parolni tiklash uchun /reset buyrug'ini yuboring.",
            reply_markup=MAIN_KEYBOARD,
        )
    else:
        await update.message.reply_text(
            "Assalomu alaykum! Ashrapov Rent boti.\n\n"
            "Hisobingizni ulash uchun telefon raqamingizni yuboring:",
            reply_markup=CONTACT_ONLY_KEYBOARD,
        )


# ---------------------------------------------------------------------------
# Kontakt
# ---------------------------------------------------------------------------

async def handle_contact(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    from apps.users.models import User

    contact = update.message.contact
    phone = _normalize_phone(contact.phone_number)
    chat_id = str(update.effective_chat.id)

    updated = await sync_to_async(
        User.objects.filter(phone=phone).update
    )(telegram_chat_id=chat_id)

    if updated:
        await update.message.reply_text(
            "✅ Hisobingiz muvaffaqiyatli ulandi!\n\n"
            "📍 Joylashuvingizni ulash uchun quyidagi tugmani bosing.\n"
            "🔐 Parolni tiklash uchun /reset buyrug'ini yuboring.",
            reply_markup=MAIN_KEYBOARD,
        )
    else:
        await update.message.reply_text(
            "❌ Bu telefon raqam bilan ro'yxatdan o'tilgan hisob topilmadi.\n"
            "Admin bilan bog'laning."
        )


# ---------------------------------------------------------------------------
# Joylashuv (oddiy + live location)
# ---------------------------------------------------------------------------

async def handle_location(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    from apps.users.models import User

    msg = update.effective_message
    if not msg or not msg.location:
        return

    chat_id = str(update.effective_chat.id)
    location = msg.location

    user = await sync_to_async(
        lambda: User.objects.filter(telegram_chat_id=chat_id).first()
    )()

    if not user:
        if update.message:
            await update.message.reply_text(
                "❌ Hisob topilmadi. /start bosib hisobingizni ulang.",
                reply_markup=CONTACT_ONLY_KEYBOARD,
            )
        return

    user.latitude = location.latitude
    user.longitude = location.longitude
    user.location_updated_at = timezone.now()
    await sync_to_async(user.save)(
        update_fields=['latitude', 'longitude', 'location_updated_at']
    )

    logger.info(
        "Location updated: user=%s lat=%s lng=%s live=%s",
        user.phone, location.latitude, location.longitude,
        bool(location.live_period),
    )

    if update.message:
        if location.live_period:
            await update.message.reply_text(
                f"✅ Live location ulandi! Admin xaritada harakatizni ko'radi.\n"
                f"Davomiyligi: {location.live_period // 60} daqiqa."
            )
        else:
            await update.message.reply_text("📍 Joylashuvingiz saqlandi!")


# ---------------------------------------------------------------------------
# /reset — ConversationHandler
# ---------------------------------------------------------------------------

async def reset_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """1-qadam: /reset → OTP yuborish."""
    from apps.users.models import User

    chat_id = str(update.effective_chat.id)
    user = await sync_to_async(
        lambda: User.objects.filter(telegram_chat_id=chat_id).first()
    )()

    if not user:
        await update.message.reply_text(
            "❌ Hisob topilmadi.\n"
            "/start bosib avval hisobingizni ulab oling.",
            reply_markup=CONTACT_ONLY_KEYBOARD,
        )
        return ConversationHandler.END

    # OTP generatsiya va cache
    code = generate_otp_code()
    await sync_to_async(store_otp)(user.phone, code)

    # Xuddi shu chatga OTP yuboramiz (bot o'zi xabar yuboradi)
    await update.message.reply_text(
        f"🔐 Parolni tiklash kodi:\n\n"
        f"<b>{code}</b>\n\n"
        f"Kodni pastga yozing (5 daqiqa amal qiladi):",
        parse_mode='HTML',
        reply_markup=ReplyKeyboardRemove(),
    )

    # Phoneni context ga saqlaymiz
    context.user_data['reset_phone'] = user.phone
    return RESET_WAIT_OTP


async def reset_verify_otp(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """2-qadam: foydalanuvchi OTP ni kiritdi."""
    entered = update.message.text.strip()
    phone = context.user_data.get('reset_phone')

    if not phone:
        await update.message.reply_text("❌ Xatolik. /reset dan qayta boshlang.")
        return ConversationHandler.END

    stored = await sync_to_async(get_otp)(phone)

    if not stored or stored != entered:
        await update.message.reply_text(
            "❌ Kod noto'g'ri yoki muddati o'tgan.\n"
            "Qaytadan /reset buyrug'ini yuboring."
        )
        return ConversationHandler.END

    await update.message.reply_text(
        "✅ Kod tasdiqlandi!\n\n"
        "Yangi parolni kiriting (kamida 8 ta belgi):"
    )
    return RESET_WAIT_PASSWORD


async def reset_set_password(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """3-qadam: yangi parol."""
    from apps.users.models import User
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError

    new_password = update.message.text.strip()
    phone = context.user_data.get('reset_phone')

    if not phone:
        await update.message.reply_text("❌ Xatolik. /reset dan qayta boshlang.")
        return ConversationHandler.END

    # OTP hali ham amal qiladimi?
    stored = await sync_to_async(get_otp)(phone)
    if not stored:
        await update.message.reply_text(
            "❌ Kodning muddati o'tdi. /reset dan qayta boshlang."
        )
        return ConversationHandler.END

    # Parol validatsiyasi
    try:
        await sync_to_async(validate_password)(new_password)
    except ValidationError as exc:
        errors = '\n'.join(f'• {e}' for e in exc.messages)
        await update.message.reply_text(
            f"❌ Parol talablarga javob bermaydi:\n{errors}\n\n"
            "Yangi parolni qayta kiriting:"
        )
        return RESET_WAIT_PASSWORD

    # Parolni yangilash
    user = await sync_to_async(
        lambda: User.objects.filter(phone=phone).first()
    )()
    if not user:
        await update.message.reply_text("❌ Foydalanuvchi topilmadi.")
        return ConversationHandler.END

    user.set_password(new_password)
    await sync_to_async(user.save)(update_fields=['password'])
    await sync_to_async(clear_otp)(phone)
    context.user_data.clear()

    await update.message.reply_text(
        "✅ Parolingiz muvaffaqiyatli yangilandi!\n\n"
        "Endi yangi parol bilan tizimga kiring.",
        reply_markup=MAIN_KEYBOARD,
    )
    return ConversationHandler.END


async def reset_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data.clear()
    await update.message.reply_text(
        "❌ Parolni tiklash bekor qilindi.",
        reply_markup=MAIN_KEYBOARD,
    )
    return ConversationHandler.END


# ---------------------------------------------------------------------------
# Yordamchi
# ---------------------------------------------------------------------------

def _normalize_phone(raw_phone: str) -> str:
    digits = ''.join(ch for ch in raw_phone if ch.isdigit())
    if not digits.startswith('998'):
        digits = f'998{digits[-9:]}'
    return f'+{digits}'


# ---------------------------------------------------------------------------
# Management command
# ---------------------------------------------------------------------------

class Command(BaseCommand):
    help = 'Ashrapov Rent Telegram botni ishga tushiradi (long polling)'

    def handle(self, *args, **options):
        if not settings.TELEGRAM_BOT_TOKEN:
            raise CommandError('TELEGRAM_BOT_TOKEN sozlanmagan (.env fayliga qarang)')

        application = Application.builder().token(settings.TELEGRAM_BOT_TOKEN).build()

        # /start
        application.add_handler(CommandHandler('start', start))

        # Kontakt
        application.add_handler(MessageHandler(filters.CONTACT, handle_contact))

        # Joylashuv (yangi + live update)
        application.add_handler(
            MessageHandler(filters.LOCATION & filters.UpdateType.MESSAGE, handle_location)
        )
        application.add_handler(
            MessageHandler(filters.LOCATION & filters.UpdateType.EDITED_MESSAGE, handle_location)
        )

        # Parolni tiklash — ConversationHandler
        reset_conv = ConversationHandler(
            entry_points=[CommandHandler('reset', reset_start)],
            states={
                RESET_WAIT_OTP: [
                    MessageHandler(filters.TEXT & ~filters.COMMAND, reset_verify_otp)
                ],
                RESET_WAIT_PASSWORD: [
                    MessageHandler(filters.TEXT & ~filters.COMMAND, reset_set_password)
                ],
            },
            fallbacks=[CommandHandler('cancel', reset_cancel)],
            allow_reentry=True,
        )
        application.add_handler(reset_conv)

        self.stdout.write(self.style.SUCCESS(
            "Ashrapov Rent boti ishga tushdi (Ctrl+C — to'xtatish)"
        ))
        application.run_polling(allowed_updates=Update.ALL_TYPES)
