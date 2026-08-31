# Rent Electro (Ashrapov) — Backend TZ (v2)

> Repo tuzilishi: backend va frontend **bitta repo** ichida, alohida papkalarda joylashadi (quyida ko'rsatilgan). Ushbu hujjat — backend qismi uchun texnik topshiriq.

---

## 🔄 v1 → v2 o'zgarishlar

- Backend texnologiyasi aniqlashtirildi: **Python (Django REST Framework)**
- Backend + frontend **monorepo** tarzida bitta repo ichida
- Ishchining ro'yxatdan o'tish so'rovi endi alohida "zayavka" sahifasida emas, **"Ishchilar boshqaruvi"** sahifasi ichida (tab sifatida) boshqariladi
- Ijaraga transport berilganda **passport rasmi va video** (holat isboti) saqlash qo'shildi
- To'lovni tasdiqlash: ishchi **chek/screenshot yuklaydi**, admin tasdiqlaydi yoki rad etadi
- Shtraf mantig'i aniqlashtirildi: **har bir kechikkan kun uchun 70 000 so'm** qo'shiladi (kumulyativ, bir martalik emas)
- Guest (user) sahifalarida "Ishchi bo'lish" arizasi — alohida, ochiq sahifa

---

## 1. Loyiha haqida

**Rent Electro** — kompaniya (Ashrapov) elektro-transportlarni ishchilarga (ijarachilarga) ijaraga beradi. Ishchi davriy to'lov qiladi, to'lovni chek surati bilan tasdiqlaydi, admin tekshirib tasdiqlaydi. Muddat o'tkazilsa — har kuni uchun shtraf qo'shiladi.

| Rol | Tavsif |
|---|---|
| `super_admin` | Tizimni to'liq boshqaradi |
| `worker` (ishchi) | Elektro-transportni ijaraga olgan shaxs |
| `guest` (user) | Ro'yxatdan o'tmagan, faqat ochiq sahifalarni ko'radi |

---

## 2. Repozitoriy tuzilishi (monorepo)

```
ashrapov-rent-electro/
├── backend/                  # Python (Django REST Framework)
│   ├── manage.py
│   ├── config/                # settings, urls, celery config
│   ├── apps/
│   │   ├── users/              # auth, worker profile
│   │   ├── electro_units/      # transport (skuter) katalogi
│   │   ├── rentals/             # ijara, rental_media
│   │   ├── payments/            # to'lovlar, chek/receipt, jarima
│   │   ├── locations/           # GPS kuzatuv
│   │   ├── applications/        # "ishchi bo'lish" arizalari
│   │   ├── translations/        # ko'p tillilik kontenti
│   │   └── telegram_bot/        # parolni tiklash boti
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # React (frontend README'ga qarang)
├── docker-compose.yml
└── README.md                  # umumiy loyiha tavsifi
```

---

## 3. Texnologik stek

| Qism | Texnologiya |
|---|---|
| Framework | Django + Django REST Framework |
| DB | PostgreSQL |
| Cache / Queue | Redis |
| Fon vazifalar (cron) | Celery + Celery Beat (kunlik jarima hisoblash) |
| Auth | JWT — `djangorestframework-simplejwt` |
| Telegram bot | `python-telegram-bot` yoki `aiogram` |
| Media (rasm/video) | Django `FileField`/`ImageField`, production'da S3-compatible storage tavsiya etiladi |
| Konteynerizatsiya | Docker + docker-compose |

---

## 4. Autentifikatsiya va parolni tiklash

*(o'zgarishsiz, v1'dan)*

- Login: **telefon raqam + parol** → JWT access/refresh token
- Parolni tiklash **Telegram bot** orqali:
  1. Foydalanuvchi telefon raqamini kiritadi
  2. Agar `telegram_chat_id` bog'langan bo'lsa — 6 xonali OTP kod Telegram orqali yuboriladi (Redis'da 5 daqiqa TTL)
  3. Kod tasdiqlangach — yangi parol o'rnatiladi, eski tokenlar bekor qilinadi

```
POST /api/auth/login
POST /api/auth/reset-password/request      { phone }
POST /api/auth/reset-password/verify-otp   { phone, code }
POST /api/auth/reset-password/confirm      { phone, code, new_password }
POST /api/auth/refresh-token
```

---

## 5. Ma'lumotlar bazasi (yangilangan)

### `users`
| Field | Type |
|---|---|
| id | UUID |
| full_name | string |
| phone | string, unique |
| password_hash | string |
| role | enum(super_admin, worker) |
| telegram_chat_id | string, nullable |
| status | enum(pending, active, blocked) |
| created_at | timestamp |

### `electro_units`
| Field | Type |
|---|---|
| id | UUID |
| model_name | string |
| serial_number | string |
| status | enum(available, rented, maintenance) |
| price_per_day | decimal |

### `rentals`
| Field | Type |
|---|---|
| id | UUID |
| worker_id | FK → users |
| unit_id | FK → electro_units |
| start_date | date |
| period_days | int |
| due_date | date |
| status | enum(active, overdue, completed) |

### `rental_media` 🆕
| Field | Type | Izoh |
|---|---|---|
| id | UUID | |
| rental_id | FK → rentals | |
| media_type | enum(passport_photo, video) | |
| file_url | string | |
| uploaded_at | timestamp | |

### `payments`
| Field | Type | Izoh |
|---|---|---|
| id | UUID | |
| rental_id | FK → rentals | |
| amount | decimal | |
| is_fine | boolean | |
| fine_days_count | int, nullable | Nechta kun uchun hisoblanganini saqlash uchun |
| paid_at | timestamp, nullable | |

### `payment_receipts` 🆕
| Field | Type | Izoh |
|---|---|---|
| id | UUID | |
| payment_id | FK → payments | |
| receipt_image | string (file url) | |
| status | enum(pending, approved, rejected) | |
| uploaded_at | timestamp | |
| reviewed_by | FK → users, nullable | Admin |
| reviewed_at | timestamp, nullable | |

### `worker_locations`
| Field | Type |
|---|---|
| id | UUID |
| worker_id | FK → users |
| latitude | decimal |
| longitude | decimal |
| recorded_at | timestamp |

### `worker_applications` ("Ishchi bo'lish" arizasi)
| Field | Type |
|---|---|
| id | UUID |
| full_name | string |
| phone | string |
| desired_unit_model | string, nullable |
| status | enum(pending, approved, rejected) |
| created_at | timestamp |

### `content_translations`
| Field | Type |
|---|---|
| id | UUID |
| key | string |
| lang | enum(uz, ru) |
| value | text |

---

## 6. API endpoints (yangilangan)

### Super Admin — Ishchilar boshqaruvi
```
GET    /api/admin/dashboard/stats
GET    /api/admin/workers                     ?status=active|pending|overdue
GET    /api/admin/workers/:id                  (batafsil: profil + tulovlar + media)
PATCH  /api/admin/workers/:id                  (edit)
DELETE /api/admin/workers/:id
POST   /api/admin/workers/:id/approve          (registratsiyani tasdiqlash)
GET    /api/admin/workers/:id/payments
GET    /api/admin/workers/:id/rental-media     (passport rasm + video)
GET    /api/admin/locations                    (barcha ishchilar joylashuvi)
GET    /api/admin/payment-receipts             ?status=pending
POST   /api/admin/payment-receipts/:id/approve
POST   /api/admin/payment-receipts/:id/reject
```

### Worker
```
GET  /api/worker/dashboard        → ijara sanasi, qolgan kun, tulov summasi, joriy shtraf
POST /api/worker/payment-receipts  (chek surati yuklash)
POST /api/worker/locations         (GPS yuborish)
GET  /api/worker/rules
```

### Public (guest)
```
GET  /api/public/rules
GET  /api/public/units                  (rent transportlar ro'yxati va narxlari)
POST /api/public/worker-applications    (Ishchi bo'lish arizasi)
```

---

## 7. Biznes-logika: to'lov, chek tasdiqlash va jarima

1. Har bir `rental`da `due_date` bor
2. **Celery Beat kunlik vazifasi** (masalan har kuni 00:05):
   - Agar joriy sana `due_date`dan o'tgan bo'lsa → status `overdue`
   - **Har o'tgan kun uchun 70 000 so'm** jarima qo'shiladi (kumulyativ — masalan 3 kun kechiksa: 210 000 so'm)
3. Ishchi to'lov qilgach, **chek/screenshot rasmini yuklaydi** (`payment_receipts`, status=`pending`)
4. Admin panelda tasdiqlaydi yoki rad etadi:
   - Tasdiqlansa → tegishli `payment` yozuvi yopiladi, shtraf hisoblanishi to'xtaydi
   - Rad etilsa → worker qayta chek yuklashi kerak

---

## 8. Media: passport va video (ijara boshlanishida)

- Transport ishchiga berilganda, ijara yaratilishi bilan bir vaqtda **passport rasmi** va **video** (transport holati isboti) yuklanadi va `rental_media` jadvalida saqlanadi
- Bu fayllar keyin admin "batafsil" sahifasida ko'rinadi (faqat admin va tegishli ishchi ko'ra oladi — ruxsat tekshiruvi majburiy)

---

## 9. GPS / joylashuvni kuzatish

- Ishchiga biriktirilgan qurilma/karta davriy koordinata yuboradi: `POST /api/worker/locations`
- Admin `/admin/locations` orqali barcha ishchilarning so'nggi joylashuvini oladi (frontend xaritada chizadi)

---

## 10. Ko'p tillilik (i18n)

- UZ (asosiy) va RU
- Statik matnlar `content_translations` jadvalida saqlanadi, `?lang=uz|ru` orqali qaytariladi

---

## 11. Xavfsizlik

- Parollar `bcrypt`/`argon2` bilan hashlanadi (Django default: PBKDF2, argon2 ham ulanishi mumkin)
- RBAC — har bir endpoint rol bo'yicha tekshiriladi
- Login/OTP endpointlarida rate-limiting
- Media fayllar (passport, chek) — faqat admin va tegishli ishchi ko'ra oladi, signed URL yoki permission-based serving tavsiya etiladi
- Audit-log: admin harakatlari (tasdiqlash, o'chirish, edit) log qilinishi tavsiya etiladi

---

## 12. Aniqlashtirish kerak bo'lgan savollar

- [ ] Rasm/video uchun fayl hajmi va format cheklovlari qanday bo'lsin?
- [ ] Chek rad etilganda ishchiga xabar (Telegram/SMS) yuborilsinmi?
- [ ] Ishchi o'chirilganda (`DELETE /admin/workers/:id`) — bog'liq ijara/to'lov tarixi ham o'chadimi yoki faqat arxivlanadimi (soft delete)?
- [ ] To'lov summasi qayerdan hisoblanadi — `electro_units.price_per_day * period_days`mi, yoki admin qo'lda belgilaydimi?
