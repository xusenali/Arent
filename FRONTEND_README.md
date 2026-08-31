# Rent Electro (Ashrapov) — Frontend TZ (v2)

> Repo tuzilishi: backend va frontend **bitta repo** ichida (`backend/` va `frontend/` papkalari). Backend API kontrakti uchun `BACKEND_README.md` ga qarang.

---

## 🔄 v1 → v2 o'zgarishlar

- Frontend texnologiyasi aniqlashtirildi: **React**
- Monorepo tuzilishi: `frontend/` papkasi backend bilan bitta repo ichida
- "Ishchilar boshqaruvi" sahifasiga **ro'yxatdan o'tishni tasdiqlash, o'chirish, edit** tugmalari qo'shildi
- Ishchi batafsil sahifasiga **passport rasmi va video** ko'rish qo'shildi
- Worker dashboardga **chek surati yuklash** (to'lovni tasdiqlash) funksiyasi qo'shildi
- Admin uchun alohida **"To'lov cheklari"** sahifasi (tasdiqlash/rad etish uchun)
- Guest sahifalarga **"Ishchi bo'lish"** — alohida sahifa sifatida qo'shildi
- Shtraf ko'rsatkichi: dashboardda **kunlik kumulyativ** shtraf summasi ko'rinadi

---

## 1. Umumiy tavsif

4 asosiy foydalanuvchi oqimi:

1. **Login / parolni tiklash**
2. **Super Admin** paneli
3. **Ishchi (Worker)** kabineti
4. **User (mehmon)** uchun ochiq sahifalar

Til: **UZ (asosiy) / RU**, istalgan vaqt almashtiriladi.

---

## 2. Texnologik stek

| Qism | Texnologiya |
|---|---|
| Framework | **React** (Vite bilan) |
| Styling | TailwindCSS |
| Routing | React Router |
| Server state | React Query (TanStack Query) |
| Global state (til, auth) | Zustand / Context API |
| Ko'p tillilik | react-i18next |
| Xarita | Yandex Maps SDK |
| Fayl yuklash (rasm/video) | react-dropzone yoki oddiy `<input type="file">` + preview komponenti |
| Forma validatsiyasi | react-hook-form + zod |

---

## 3. Papka joylashuvi (monorepo ichida)

```
ashrapov-rent-electro/
├── backend/
├── frontend/                 ← shu qism
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── admin/
│   │   │   ├── worker/
│   │   │   └── public/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── i18n/ (uz.json, ru.json)
│   │   ├── api/
│   │   ├── store/
│   │   └── router/
│   ├── package.json
│   └── vite.config.ts
└── docker-compose.yml
```

---

## 4. Sahifalar tuzilishi

### 4.1 Login — `/login`
| Element | Tavsif |
|---|---|
| Telefon input | Maska `+998 XX XXX XX XX` |
| Parol input | Ko'rsatish/yashirish |
| "Kirish" | |
| "Parolni unutdingizmi?" | → `/reset-password` |

**`/reset-password`** — 3 bosqich: telefon → Telegram OTP → yangi parol.

---

### 4.2 Super Admin — `/admin/*`

#### `/admin/dashboard`
Statistik kartalar: jami ishchilar, faol ijaralar, joriy oy tushumi, muddati o'tganlar soni, kutilayotgan cheklar soni, kutilayotgan ro'yxatdan o'tish so'rovlari soni.

#### `/admin/workers` — Ishchilar boshqaruvi
- Tablar: **Faol** | **Kutilayotgan (ro'yxatdan o'tish so'rovlari)** | **Muddati o'tganlar**
- Har bir qatorda: ism, telefon, holat, amallar (✅ Tasdiqlash / ✏️ Edit / 🗑 O'chirish)
- O'chirish/tasdiqlash uchun `ConfirmModal`

**`/admin/workers/:id`** — Batafsil sahifa:
- Shaxsiy ma'lumotlar (edit imkoniyati bilan)
- **To'lovlar tarixi** jadvali (sana, summa, jarimami, holati)
- **Ijaraga olingan transport ma'lumoti** + **passport rasmi** va **video** (lightbox/preview bilan ko'rish)
- Joriy joylashuvi (mini-xarita yoki "Xaritada ko'rish" linki)
- Muddatdan o'tgan kunlar soni va shtraf summasi ochiq ko'rinadi

#### `/admin/map`
- Barcha ishchilarning so'nggi joylashuvi xaritada marker bilan
- Markerga bosilsa: ism + oxirgi yangilanish vaqti + muddat holati (🟢/🔴)

#### `/admin/payment-receipts` 🆕
- Kutilayotgan chek/screenshotlar ro'yxati (kartochka: rasm, ishchi ismi, summa, sana)
- **Tasdiqlash** / **Rad etish** tugmalari

---

### 4.3 Ishchi (Worker) — `/worker/*`

#### `/worker/dashboard`
- Ijara boshlangan sana
- Qancha kun qolgani (countdown)
- Keyingi to'lov sanasi va summasi
- Agar muddat o'tgan bo'lsa — qizil banner + **kunlik kumulyativ shtraf summasi**
- **"Chek yuklash"** tugmasi → fayl tanlash → yuklangach status "Tekshirilmoqda" ko'rinadi
- Holat indikatori: 🟢 to'langan / 🟡 yaqinlashmoqda / 🔴 muddati o'tgan

#### `/worker/rules`
- Qonun-qoida matni

---

### 4.4 User (guest, ro'yxatdan o'tmagan) sahifalar

#### `/rules`
- Qonun-qoida

#### `/rent-transport`
- Ijaraga beriladigan elektro-transportlar ro'yxati (rasm, model, narx — kunlik/haftalik/oylik)

#### `/become-worker` 🆕 — "Ishchi bo'lish" sahifasi
- Forma: ism, telefon, xohlagan transport modeli (ixtiyoriy)
- Yuborilgach: `POST /api/public/worker-applications`
- Muvaffaqiyatli yuborilgani haqida xabar (holat: admin tasdiqlashini kutmoqda)

---

## 5. Umumiy komponentlar

- `Header` (logo, til almashtirish UZ/RU, login/logout)
- `Sidebar` (rolga qarab menyu: admin / worker)
- `LanguageSwitcher`
- `StatCard`
- `DataTable` (ishchilar, to'lovlar, cheklar uchun)
- `StatusBadge`
- `MapView`
- `ConfirmModal`
- `PhoneInput`, `OtpInput`
- `FileUploader` 🆕 (rasm/video yuklash — passport, video, chek uchun qayta ishlatiladi)
- `MediaPreview` 🆕 (rasm/video ko'rish, lightbox)
- `ReceiptCard` 🆕 (chek kartochkasi, admin payment-receipts sahifasi uchun)

---

## 6. Ruxsatlar (route guard)

| Route prefiksi | Kirish huquqi |
|---|---|
| `/admin/*` | faqat `super_admin` |
| `/worker/*` | faqat `worker` |
| `/`, `/rules`, `/rent-transport`, `/become-worker`, `/login` | hammaga ochiq |

---

## 7. Dizayn yo'nalishi

- Mavzu: elektro/green-energy — yashil-elektro yoki ko'k-elektro ottenkalari (aniq brendbuk bo'lmagani uchun taxminiy, frontend-design skill tavsiyalariga amal qilinadi)
- Mobile-first — ishchilar asosan telefondan foydalanadi
- Fayl yuklash komponentlari uchun progress-indikator va xato holatlari (fayl juda katta, format noto'g'ri) ko'rsatilishi shart

---

## 8. Aniqlashtirish kerak bo'lgan savollar

- [ ] Admin xaritasida real-time yangilanish kerakmi (websocket) yoki periodik refresh yetarlimi?
- [ ] Video fayl uchun frontendda preview/pleer kerakmi, yoki faqat yuklab olish tugmasi yetarlimi?
- [ ] Brend rangi/logotip mavjudmi?
- [ ] Chek rad etilganda workerga qanday bildirishnoma ko'rsatiladi (in-app banner yetarlimi, yoki push/telegram xabar ham kerakmi)?
