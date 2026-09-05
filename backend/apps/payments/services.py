"""Google Cloud Vision orqali to'lov chekini tahlil qilish."""

import logging
import os
import re

logger = logging.getLogger(__name__)

# Chek ekanligini bildiruvchi kalit so'zlar (ko'p tilli)
_RECEIPT_KEYWORDS = re.compile(
    r"to'lov|to\'lov|tolov|summa|amount|сумма|itogo|jami|tranzaksiya|"
    r"transaction|transfer|click|payme|uzcard|humo|bank|uzs|so'm|сум",
    re.IGNORECASE,
)

# Summa olish uchun patternlar (Uzbek chek formatlari: Click, Payme, bank)
_AMOUNT_PATTERNS = [
    re.compile(r"(\d[\d\s]{2,}\d)[.,]\d{2}\s*UZS", re.IGNORECASE),    # 150 000.00 UZS
    re.compile(r"(\d[\d\s]+\d)\s*(?:so'?m|UZS|сум)", re.IGNORECASE),  # 150 000 so'm
    re.compile(
        r"(?:summa|amount|сумма|to'lov|itogo|jami)[:\s*=]+([0-9][\d\s.,]+)",
        re.IGNORECASE,
    ),
    re.compile(r"\b(\d{4,})\b"),                                        # fallback: 4+ raqam
]


def _parse_amount(text: str):
    for pattern in _AMOUNT_PATTERNS:
        m = pattern.search(text)
        if m:
            raw = m.group(1)
            cleaned = re.sub(r"[\s]", "", raw).replace(",", "").rstrip(".")
            try:
                val = float(cleaned)
                if val >= 1000:          # 1 000 so'mdan kam — chek emas
                    return val
            except ValueError:
                continue
    return None


def analyze_receipt_image(image_path: str) -> dict:
    """
    Rasmni Google Vision bilan OCR qilib, chek ekanligini va summasini aniqlaydi.

    Qaytaradi:
        {
            'verdict':          'real' | 'fake' | 'unclear',
            'extracted_amount': float | None,
            'raw_text':         str,
        }
    """
    if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") and \
       not os.environ.get("GOOGLE_VISION_API_KEY"):
        logger.debug("Google Vision sozlanmagan, AI tahlili o'tkazib yuborildi.")
        return {"verdict": None, "extracted_amount": None, "raw_text": ""}

    try:
        from google.cloud import vision as gvision
    except ImportError:
        logger.warning("google-cloud-vision o'rnatilmagan.")
        return {"verdict": None, "extracted_amount": None, "raw_text": ""}

    try:
        client = gvision.ImageAnnotatorClient()
        with open(image_path, "rb") as fh:
            content = fh.read()
        image = gvision.Image(content=content)
        response = client.document_text_detection(image=image)

        if response.error.message:
            logger.error("Vision API xato: %s", response.error.message)
            return {"verdict": "unclear", "extracted_amount": None, "raw_text": ""}

        raw_text = response.full_text_annotation.text or ""
    except Exception as exc:
        logger.exception("Vision API chaqiruvda xato: %s", exc)
        return {"verdict": "unclear", "extracted_amount": None, "raw_text": ""}

    extracted_amount = _parse_amount(raw_text)
    keyword_hit = bool(_RECEIPT_KEYWORDS.search(raw_text))

    if not raw_text.strip():
        verdict = "fake"          # hech qanday matn yo'q
    elif keyword_hit and extracted_amount:
        verdict = "real"          # chek kalit so'zi + summa topildi
    elif keyword_hit or extracted_amount:
        verdict = "unclear"       # qisman ma'lumot
    else:
        verdict = "fake"          # matn bor, lekin chekka o'xshamaydi

    return {
        "verdict": verdict,
        "extracted_amount": extracted_amount,
        "raw_text": raw_text[:2000],   # DB da joy tejash
    }
