# Vitalio — архітектура

Web-first (PWA) застосунок для підрахунку калорій і БЖВ. Той самий код збирається у веб, PWA та нативні
застосунки App Store / Google Play через **Capacitor** — без переписування.

## Схема шарів

```mermaid
flowchart TD
    UI["UI · src/features, src/components<br/>React 19 · Tailwind v4 · Framer Motion"]
    Hooks["Hooks · src/hooks<br/>TanStack Query (серверний стан) + Zustand (UI-стан)"]
    Ports["Порти · src/services/ports.ts<br/>DiaryRepository · FoodRepository · ProfileRepository"]
    Local["LocalStorage-реалізація<br/>(прототип, офлайн)"]
    Supa["Supabase-реалізація<br/>(Postgres + Auth + Storage)"]
    Domain["Домен · src/lib, src/types<br/>чисті функції: TDEE, БЖВ, серії"]

    UI --> Hooks --> Ports
    Ports --> Local
    Ports -.->|наступний модуль| Supa
    Hooks --> Domain
    UI --> Domain
```

**Ключові рішення**

| Рішення | Чому |
| --- | --- |
| Репозиторії-порти + composition root (`src/services/index.ts`) | Перехід на Supabase = заміна трьох рядків, UI не змінюється (Dependency Inversion). |
| TanStack Query для даних, Zustand лише для UI | Немає дублювання джерел правди; оптимістичні оновлення води/видалення вже працюють. |
| Знімок нутрієнтів у `food_entries` | Редагування бази продуктів не переписує історію користувача. |
| Домен — чисті функції з тестами (`vitest`) | Формула Міффліна — Сан Жеора, БЖВ, серії перевіряються без UI. |
| Словник `src/i18n/uk.ts` + тип `Dictionary` | Нова мова = один файл, що реалізує той самий тип; помилки пропущених ключів ловить TypeScript. |
| Семантичні токени (`--surface`, `--ink`, `--brand`…) | Світла/темна теми та бренд змінюються в одному місці (`globals.css`). |

## Структура папок

```text
.
├── capacitor.config.ts          # appId, webDir: out, Safe Area
├── next.config.ts               # BUILD_TARGET=mobile → output: "export"
├── public/
│   ├── manifest.webmanifest     # PWA
│   ├── sw.js                    # офлайн-оболонка (stale-while-revalidate)
│   └── icons/
├── supabase/migrations/0001_init.sql   # схема БД + RLS + Storage
├── docs/ARCHITECTURE.md
└── src/
    ├── app/
    │   ├── layout.tsx           # viewport-fit=cover, theme-color, шрифти
    │   ├── providers.tsx        # next-themes, React Query, i18n, service worker
    │   ├── globals.css          # дизайн-токени + Tailwind v4 @theme
    │   └── (app)/               # оболонка з навігацією
    │       ├── layout.tsx
    │       ├── page.tsx         # Дашборд
    │       └── diary|progress|profile/page.tsx   # заглушки (наступні модулі)
    ├── components/
    │   ├── ui/                  # Button, Card, ProgressRing, BottomSheet, Toaster…
    │   ├── layout/              # AppShell, BottomNav, Sidebar, ThemeToggle
    │   └── brand/
    ├── features/
    │   ├── dashboard/           # bento-картки, календар, прийоми їжі
    │   └── food-log/            # Bottom Sheet: пошук → вага → додати
    ├── hooks/                   # use-diary (мутації), use-app-data (запити)
    ├── services/                # порти + локальні реалізації + демо-дані
    ├── stores/ui-store.ts       # Zustand: дата, sheet, тости
    ├── lib/                     # nutrition, date, streak, format, cn
    ├── i18n/                    # uk.ts + провайдер
    ├── data/foods.ts            # демо-база продуктів
    └── types/domain.ts
```

## Web → App Store / Google Play (Capacitor)

1. **Статичний експорт.** `npm run build:mobile` ставить `BUILD_TARGET=mobile`, і `next.config.ts` вмикає
   `output: "export"` → папка `out/`. Для цього в UI-шарі немає Route Handlers, Server Actions, `next/image`-оптимізатора
   чи middleware. Бекенд — Supabase (клієнтський SDK) та Edge Functions.
2. **Нативні проєкти.** Один раз: `npx cap add ios` і `npx cap add android`. Далі `npm run cap:ios` /
   `npm run cap:android` збирають експорт, синхронізують його в нативний проєкт і відкривають Xcode / Android Studio.
3. **Safe Area.** `viewport-fit=cover` + змінні `--safe-top` / `--safe-bottom` (`env(safe-area-inset-*)`).
   Нижня панель, Bottom Sheet, тости й відступи контенту враховують «чубчик» та home indicator.
   У `capacitor.config.ts` `ios.contentInset = "never"` — відступи віддано CSS.
4. **Нативні відчуття.** Свайп-для-видалення та drag-to-dismiss Bottom Sheet працюють на pointer events
   (Framer Motion) — однаково у браузері й WebView; `overscroll-behavior` вимкнено, `touch-action: manipulation`
   прибирає затримку тапу.
5. **Що додати перед публікацією:** `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor/camera`
   (сканер штрихкодів/AI), `@capacitor/haptics`, PNG-іконки 1024×1024; Sign in with Apple (вимога App Store при
   наявності Google-входу); для підписок у сторах — IAP (Apple/Google) замість Stripe.

## Схема бази даних

Повний SQL — [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "1:1 (trigger)"
    PROFILES ||--o{ USER_GOALS : "історія цілей"
    PROFILES ||--o{ WEIGHT_LOGS : ""
    PROFILES ||--o{ FOOD_ENTRIES : ""
    PROFILES ||--o{ WATER_LOGS : ""
    PROFILES ||--o{ ACTIVITY_LOGS : ""
    PROFILES ||--o{ AI_SCANS : ""
    PROFILES ||--o{ SUBSCRIPTIONS : ""
    PROFILES ||--o{ FOODS : "власні (owner_id)"
    FOODS ||--o{ FOOD_SERVINGS : ""
    FOODS ||--o{ FOOD_ENTRIES : "food_id (SET NULL)"
    AI_SCANS ||--o{ FOOD_ENTRIES : "ai_scan_id"

    PROFILES {
        uuid id PK
        text display_name
        date birth_date
        sex_type sex
        numeric height_cm
        activity_level activity_level
        text locale
        text timezone
    }
    USER_GOALS {
        uuid id PK
        date effective_from
        goal_type goal_type
        int kcal_target
        int protein_g
        int fat_g
        int carbs_g
        int water_ml
    }
    FOODS {
        uuid id PK
        uuid owner_id "NULL = системний"
        text name
        text barcode
        numeric kcal_100g
        numeric protein_100g
        numeric fat_100g
        numeric carbs_100g
    }
    FOOD_ENTRIES {
        uuid id PK
        date logged_on
        meal_type meal
        text name "знімок"
        numeric grams
        numeric kcal "знімок"
        numeric protein_g
        numeric fat_g
        numeric carbs_g
    }
    SUBSCRIPTIONS {
        uuid id PK
        billing_provider provider
        text provider_subscription_id
        plan_tier tier
        subscription_status status
        timestamptz current_period_end
    }
```

**Безпека та SaaS**

- RLS увімкнено на всіх таблицях; користувач бачить лише свої рядки (`user_id = auth.uid()`).
- Системні продукти (`owner_id IS NULL`) може писати лише `service_role`; користувацькі — тільки власник і лише `is_verified = false`.
- `subscriptions` і `billing_events` пишуться тільки вебхуками (Stripe / LemonSqueezy / Apple / Google) через `service_role`;
  `billing_events (provider, event_id)` забезпечує ідемпотентність.
- `user_entitlements` — представлення «Free чи Pro»; квоти AI-сканів рахуються з `ai_scans`.
- Фото страв — приватний bucket `meal-photos`, доступ лише до папки `<user_id>/`.
- `daily_summaries` та `current_streak()` — агрегати для дашборду й аналітики на стороні БД.

## Дорожня карта модулів

1. **Дашборд** ✅ (цей крок)
2. Онбординг + калькулятор TDEE (формула вже в `lib/nutrition.ts`)
3. Логіка додавання їжі: штрихкод, AI-сканер
4. База даних + Auth (Supabase-репозиторії, Google/Apple/Email)
5. Paywall + Stripe/LemonSqueezy
6. Аналітика та прогрес (вага, тижні/місяці)
