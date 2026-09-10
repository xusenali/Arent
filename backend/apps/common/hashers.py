from django.contrib.auth.hashers import BCryptSHA256PasswordHasher


class FastBCryptSHA256PasswordHasher(BCryptSHA256PasswordHasher):
    """bcrypt, 12 emas 10 raund — OWASP tavsiya qilgan minimum.

    Render bepul tarifida (0.1 CPU) 12 raund bitta login'ga ~1.5 s sarflardi;
    10 raund 4 barobar tez. ``algorithm`` nomi o'zgarmagani uchun eski 12
    raundli xeshlar ham tekshiriladi va keyingi muvaffaqiyatli login'da
    avtomatik 10 raundga qayta xeshlanadi.
    """

    rounds = 10
