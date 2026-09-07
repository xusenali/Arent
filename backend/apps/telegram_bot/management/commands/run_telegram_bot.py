"""
Ashrapov Rent — Telegram bot (BACKEND_README §4).

Ishga tushirish: `python manage.py run_telegram_bot`

Funksiyalar:
  1. /start      → telefon raqam so'raydi → telegram_chat_id saqlaydi
  2. /reset      → bot ichida parolni tiklash (OTP → yangi parol)
  3. 📍 Location → worker koordinatalarini DBga yozadi (live location ham)
  4. JobQueue    → har 8 soatda barcha ishchilarga joylashuv eslatmasi
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
from datetime import timedelta

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

CONTACT_KEYBOARD = ReplyKeyboardMarkup(
    [[KeyboardButton('📱 Kontaktni yuborish', request_contact=True)]],
    resize_keyboard=True,
    one_time_keyboard=True,
    input_field_placeholder='+998 XX XXX XX XX',
)

# eski nom — backward compat
CONTACT_ONLY_KEYBOARD = CONTACT_KEYBOARD

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
            "🔐 Parolni tiklash uchun telefon raqamingizni yuboring.",
            reply_markup=MAIN_KEYBOARD,
        )
    else:
        await update.message.reply_text(
            "Assalomu alaykum! 👋 <b>Ashrapov Rent</b> boti.\n\n"
            "Hisobingizni ulash uchun telefon raqamingizni yuboring:\n\n"
            "• Quyidagi tugmani bosing <b>yoki</b>\n"
            "• Raqamni to'g'ridan-to'g'ri yozing: <code>+998901234567</code>",
            parse_mode='HTML',
            reply_markup=CONTACT_KEYBOARD,
        )


# ---------------------------------------------------------------------------
# Kontakt
# ---------------------------------------------------------------------------

async def _link_and_send_otp(phone: str, chat_id: str, update: Update) -> None:
    """Telefon raqam bo'yicha hisobni ulaydi va agar OTP kutilayotgan bo'lsa yuboradi."""
    from apps.users.models import User

    user = await sync_to_async(
        lambda: User.objects.filter(phone=phone).first()
    )()

    if not user:
        await update.message.reply_text(
            "❌ Bu raqam bilan hisob topilmadi.\n"
            "Admin bilan bog'laning.",
            reply_markup=CONTACT_KEYBOARD,
        )
        return

    # Chat ID ni saqlash
    if user.telegram_chat_id != chat_id:
        await sync_to_async(
            User.objects.filter(phone=phone).update
        )(telegram_chat_id=chat_id)

    # Kutilayotgan OTP bormi?
    stored = await sync_to_async(get_otp)(phone)
    if stored:
        await update.message.reply_text(
            f"🔐 Parolni tiklash kodi:\n\n"
            f"<b>{stored}</b>\n\n"
            "Kodni saytga kiriting. Kod 5 daqiqa amal qiladi.",
            parse_mode='HTML',
            reply_markup=MAIN_KEYBOARD,
        )
    else:
        await update.message.reply_text(
            f"✅ Hisob ulandi, {user.full_name}!\n\n"
            "Parolni tiklash uchun avval saytda «Parolni unutdim» bo'limini oching.",
            reply_markup=MAIN_KEYBOARD,
        )


async def handle_contact(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    contact = update.message.contact
    phone = _normalize_phone(contact.phone_number)
    chat_id = str(update.effective_chat.id)
    await _link_and_send_otp(phone, chat_id, update)


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

# ---------------------------------------------------------------------------
# 8-soatlik joylashuv eslatmasi (JobQueue)
# ---------------------------------------------------------------------------

REMINDER_TEXT = (
    "📍 <b>Joylashuvingizni yangilang!</b>\n\n"
    "Har 8 soatda joylashuvingizni ulashib turishingiz shart.\n"
    "Quyidagi tugmani bosib joylashuvingizni yuboring 👇"
)

REMINDER_INTERVAL = 8 * 3600  # 8 soat (soniyalarda)


async def send_location_reminders(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Har 8 soatda barcha faol ishchilarga joylashuv eslatmasi yuboradi."""
    from apps.users.models import User

    workers = await sync_to_async(list)(
        User.objects.filter(
            role=User.Role.WORKER,
            status=User.Status.ACTIVE,
            telegram_chat_id__isnull=False,
        ).values('telegram_chat_id', 'full_name', 'location_updated_at')
    )

    now = timezone.now()
    sent = 0
    for w in workers:
        chat_id = w['telegram_chat_id']
        if not chat_id:
            continue
        # 8 soatdan kam vaqt o'tgan bo'lsa eslatma yubormaymiz
        updated_at = w['location_updated_at']
        if updated_at and (now - updated_at) < timedelta(hours=8):
            continue
        try:
            await context.bot.send_message(
                chat_id=chat_id,
                text=REMINDER_TEXT,
                parse_mode='HTML',
                reply_markup=LOCATION_KEYBOARD,
            )
            sent += 1
        except Exception as exc:
            logger.warning("Eslatma yuborib bo'lmadi chat_id=%s: %s", chat_id, exc)

    logger.info("Joylashuv eslatmasi: %d ishchiga yuborildi", sent)


def _normalize_phone(raw_phone: str) -> str:
    digits = ''.join(ch for ch in raw_phone if ch.isdigit())
    if not digits.startswith('998'):
        digits = f'998{digits[-9:]}'
    return f'+{digits}'


def _looks_like_phone(text: str) -> bool:
    """Matn telefon raqamga o'xshayaptimi (9-13 raqam)."""
    digits = ''.join(ch for ch in text if ch.isdigit())
    return 7 <= len(digits) <= 13


# ---------------------------------------------------------------------------
# Telefon raqam matn orqali yuborilsa → OTP
# ---------------------------------------------------------------------------

async def handle_phone_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Foydalanuvchi raqamini matn sifatida yuborganida ulaydi va OTP yuboradi."""
    text = update.message.text.strip()
    if not _looks_like_phone(text):
        return
    chat_id = str(update.effective_chat.id)
    phone = _normalize_phone(text)
    await _link_and_send_otp(phone, chat_id, update)


# ---------------------------------------------------------------------------
# Management command
# ---------------------------------------------------------------------------

class Command(BaseCommand):
    help = 'Ashrapov Rent Telegram botni ishga tushiradi (long polling)'

    def handle(self, *args, **options):
        if not settings.TELEGRAM_BOT_TOKEN:
            raise CommandError('TELEGRAM_BOT_TOKEN sozlanmagan (.env fayliga qarang)')

        application = (
            Application.builder()
            .token(settings.TELEGRAM_BOT_TOKEN)
            .build()
        )

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

        # Telefon raqam matn — OTP yuborish (reset_conv dan keyin, group=1)
        application.add_handler(
            MessageHandler(filters.TEXT & ~filters.COMMAND, handle_phone_text),
            group=1,
        )

        # 8-soatlik joylashuv eslatmasi
        if application.job_queue:
            application.job_queue.run_repeating(
                send_location_reminders,
                interval=REMINDER_INTERVAL,
                first=60,  # botni ishga tushirgandan 1 daqiqa keyin birinchi tekshiruv
            )
            self.stdout.write(self.style.SUCCESS("JobQueue: 8-soatlik eslatma ulandi"))
        else:
            self.stdout.write(self.style.WARNING(
                "JobQueue mavjud emas — pip install python-telegram-bot[job-queue]"
            ))

        self.stdout.write(self.style.SUCCESS(
            "Ashrapov Rent boti ishga tushdi (Ctrl+C — to'xtatish)"
        ))
        application.run_polling(allowed_updates=Update.ALL_TYPES)
