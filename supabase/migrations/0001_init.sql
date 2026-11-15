-- ============================================================================
-- Vitalio · початкова схема БД (Supabase / PostgreSQL 15+)
-- Застосування: `supabase db push` або вставити у SQL Editor.
--
-- Принципи:
--  * Усі дані користувача ізольовані RLS (user_id = auth.uid()).
--  * `food_entries` зберігає ЗНІМОК нутрієнтів — історія не змінюється при правках бази продуктів.
--  * Системні продукти (owner_id IS NULL) пише лише service_role; користувацькі — власник.
--  * Підписки та біллінг-події пишуться ТІЛЬКИ вебхуками (service_role); клієнт має read-only.
-- ============================================================================

create extension if not exists pg_trgm with schema extensions;

-- ───────────────────────────────── Типи ─────────────────────────────────
create type public.sex_type            as enum ('male', 'female');
create type public.activity_level      as enum ('sedentary', 'light', 'moderate', 'high', 'extreme');
create type public.goal_type           as enum ('lose', 'maintain', 'gain');
create type public.meal_type           as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.food_source         as enum ('system', 'user', 'barcode', 'ai');
create type public.plan_tier           as enum ('free', 'pro');
create type public.billing_provider    as enum ('stripe', 'lemonsqueezy', 'apple', 'google');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'paused');
create type public.ai_input_type       as enum ('photo', 'text', 'voice');
create type public.ai_scan_status      as enum ('pending', 'completed', 'failed');

-- ─────────────────────────── Службові функції ───────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ──────────────────────────────── Профілі ────────────────────────────────
create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  display_name            text not null default '',
  locale                  text not null default 'uk',
  timezone                text not null default 'Europe/Kyiv',
  birth_date              date,
  sex                     public.sex_type,
  height_cm               numeric(4, 1) check (height_cm is null or height_cm between 50 and 260),
  activity_level          public.activity_level not null default 'light',
  onboarding_completed_at timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Автоматичне створення профілю при реєстрації (Google / Apple / Email).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────── Цілі (історія змін, а не одна строка) ─────────────────────
create table public.user_goals (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  effective_from   date not null default current_date,
  goal_type        public.goal_type not null,
  kcal_target      integer not null check (kcal_target between 800 and 10000),
  protein_g        integer not null check (protein_g >= 0),
  fat_g            integer not null check (fat_g >= 0),
  carbs_g          integer not null check (carbs_g >= 0),
  water_ml         integer not null default 2000 check (water_ml between 500 and 10000),
  target_weight_kg numeric(5, 2) check (target_weight_kg is null or target_weight_kg between 20 and 400),
  created_at       timestamptz not null default now(),
  unique (user_id, effective_from)
);

-- ───────────────────────────────── Вага ─────────────────────────────────
create table public.weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  logged_on  date not null default current_date,
  weight_kg  numeric(5, 2) not null check (weight_kg between 20 and 400),
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, logged_on)
);

-- ───────────────────────────────── Продукти ─────────────────────────────────
create table public.foods (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid references public.profiles (id) on delete cascade, -- NULL = системний
  name             text not null check (char_length(name) between 1 and 200),
  brand            text,
  barcode          text check (barcode is null or barcode ~ '^[0-9]{8,14}$'),
  source           public.food_source not null default 'system',
  locale           text not null default 'uk',
  kcal_100g        numeric(6, 1) not null check (kcal_100g between 0 and 900),
  protein_100g     numeric(5, 1) not null check (protein_100g between 0 and 100),
  fat_100g         numeric(5, 1) not null check (fat_100g between 0 and 100),
  carbs_100g       numeric(5, 1) not null check (carbs_100g between 0 and 100),
  fiber_100g       numeric(5, 1) check (fiber_100g is null or fiber_100g between 0 and 100),
  default_serving_g numeric(7, 1) check (default_serving_g is null or default_serving_g > 0),
  is_verified      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger foods_set_updated_at
  before update on public.foods
  for each row execute function public.set_updated_at();

-- Швидкий нечіткий пошук з автодоповненням (ILIKE '%кур%' та similarity()).
create index foods_name_trgm_idx on public.foods using gin (lower(name) extensions.gin_trgm_ops);
create unique index foods_system_barcode_uidx on public.foods (barcode) where owner_id is null and barcode is not null;
create index foods_owner_idx on public.foods (owner_id) where owner_id is not null;

create table public.food_servings (
  id      uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods (id) on delete cascade,
  label   text not null,
  grams   numeric(7, 1) not null check (grams > 0),
  unique (food_id, label)
);

-- ───────────────────── Записи щоденника (знімок нутрієнтів) ─────────────────────
create table public.ai_scans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  input_type  public.ai_input_type not null,
  input_text  text,
  image_path  text, -- шлях у Storage: meal-photos/<user_id>/<file>
  status      public.ai_scan_status not null default 'pending',
  result      jsonb,
  model       text,
  created_at  timestamptz not null default now()
);

create index ai_scans_user_created_idx on public.ai_scans (user_id, created_at desc);

create table public.food_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  logged_on   date not null,
  meal        public.meal_type not null,
  food_id     uuid references public.foods (id) on delete set null,
  name        text not null,
  grams       numeric(7, 1) not null check (grams > 0),
  kcal        numeric(7, 1) not null check (kcal >= 0),
  protein_g   numeric(6, 1) not null check (protein_g >= 0),
  fat_g       numeric(6, 1) not null check (fat_g >= 0),
  carbs_g     numeric(6, 1) not null check (carbs_g >= 0),
  source      public.food_source not null default 'system',
  ai_scan_id  uuid references public.ai_scans (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger food_entries_set_updated_at
  before update on public.food_entries
  for each row execute function public.set_updated_at();

create index food_entries_user_day_idx on public.food_entries (user_id, logged_on);

-- ─────────────────────────── Вода та активність ───────────────────────────
create table public.water_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  logged_on   date not null,
  amount_ml   integer not null check (amount_ml between 1 and 3000),
  consumed_at timestamptz not null default now()
);

create index water_logs_user_day_idx on public.water_logs (user_id, logged_on);

create table public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  logged_on   date not null,
  burned_kcal integer not null check (burned_kcal between 0 and 10000),
  source      text not null default 'manual' check (source in ('manual', 'healthkit', 'health_connect')),
  created_at  timestamptz not null default now(),
  unique (user_id, logged_on, source)
);

-- ───────────────────────── Підписки та біллінг (SaaS) ─────────────────────────
create table public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles (id) on delete cascade,
  provider                 public.billing_provider not null,
  provider_customer_id     text not null,
  provider_subscription_id text not null,
  tier                     public.plan_tier not null default 'pro',
  status                   public.subscription_status not null,
  price_id                 text,
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  trial_end                timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create index subscriptions_user_idx on public.subscriptions (user_id);

-- Ідемпотентність вебхуків Stripe / LemonSqueezy / Apple / Google.
create table public.billing_events (
  id           uuid primary key default gen_random_uuid(),
  provider     public.billing_provider not null,
  event_id     text not null,
  event_type   text not null,
  payload      jsonb not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

-- ───────────────────────────── Представлення та функції ─────────────────────────────
-- security_invoker: RLS застосовується від імені користувача, який робить запит.

create view public.daily_summaries
with (security_invoker = true) as
with e as (
  select user_id, logged_on,
         sum(kcal) as kcal, sum(protein_g) as protein_g, sum(fat_g) as fat_g, sum(carbs_g) as carbs_g,
         count(*)::int as entries_count
  from public.food_entries group by user_id, logged_on
), w as (
  select user_id, logged_on, sum(amount_ml)::int as water_ml
  from public.water_logs group by user_id, logged_on
), a as (
  select user_id, logged_on, sum(burned_kcal)::int as burned_kcal
  from public.activity_logs group by user_id, logged_on
), keys as (
  select user_id, logged_on from e
  union select user_id, logged_on from w
  union select user_id, logged_on from a
)
select k.user_id,
       k.logged_on,
       coalesce(e.kcal, 0)          as kcal,
       coalesce(e.protein_g, 0)     as protein_g,
       coalesce(e.fat_g, 0)         as fat_g,
       coalesce(e.carbs_g, 0)       as carbs_g,
       coalesce(e.entries_count, 0) as entries_count,
       coalesce(w.water_ml, 0)      as water_ml,
       coalesce(a.burned_kcal, 0)   as burned_kcal
from keys k
left join e on e.user_id = k.user_id and e.logged_on = k.logged_on
left join w on w.user_id = k.user_id and w.logged_on = k.logged_on
left join a on a.user_id = k.user_id and a.logged_on = k.logged_on;

-- Поточна серія днів із записами. `p_today` передає клієнт (його локальна дата).
-- Якщо сьогодні записів ще немає, серія рахується від учора (день не завершено).
create or replace function public.current_streak(p_today date default current_date)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  with days as (
    select distinct logged_on
    from public.food_entries
    where user_id = auth.uid() and logged_on <= p_today
  ),
  anchor as (
    select case when exists (select 1 from days where logged_on = p_today)
                then p_today else p_today - 1 end as start_day
  ),
  numbered as (
    select d.logged_on, (row_number() over (order by d.logged_on desc) - 1)::int as n
    from days d, anchor a
    where d.logged_on <= a.start_day
  )
  select count(*)::int
  from numbered, anchor
  where numbered.logged_on = anchor.start_day - numbered.n;
$$;

-- Тариф користувача: Pro, якщо є активна/пробна підписка з неприкладеним терміном.
create view public.user_entitlements
with (security_invoker = true) as
select p.id as user_id,
       case when exists (
              select 1 from public.subscriptions s
              where s.user_id = p.id
                and s.status in ('active', 'trialing')
                and (s.current_period_end is null or s.current_period_end > now())
            ) then 'pro'::public.plan_tier else 'free'::public.plan_tier end as tier
from public.profiles p;

-- ───────────────────────────── Row Level Security ─────────────────────────────
alter table public.profiles       enable row level security;
alter table public.user_goals     enable row level security;
alter table public.weight_logs    enable row level security;
alter table public.foods          enable row level security;
alter table public.food_servings  enable row level security;
alter table public.food_entries   enable row level security;
alter table public.water_logs     enable row level security;
alter table public.activity_logs  enable row level security;
alter table public.ai_scans       enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.billing_events enable row level security; -- без політик: лише service_role

create policy "profiles: власник читає"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles: власник створює" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles: власник змінює"  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Таблиці з повним CRUD для власника.
do $$
declare t text;
begin
  foreach t in array array['user_goals', 'weight_logs', 'food_entries', 'water_logs', 'activity_logs']
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || ': власник керує', t);
  end loop;
end $$;

create policy "ai_scans: власник читає"   on public.ai_scans for select to authenticated using (user_id = (select auth.uid()));
create policy "ai_scans: власник створює" on public.ai_scans for insert to authenticated with check (user_id = (select auth.uid()));
-- Оновлення результату (status/result) виконує Edge Function від service_role.

create policy "foods: системні та власні" on public.foods for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy "foods: власник створює" on public.foods for insert to authenticated
  with check (owner_id = (select auth.uid()) and is_verified = false and source in ('user', 'barcode', 'ai'));
create policy "foods: власник змінює" on public.foods for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and is_verified = false);
create policy "foods: власник видаляє" on public.foods for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "food_servings: видимі разом із продуктом" on public.food_servings for select to authenticated
  using (exists (select 1 from public.foods f
                 where f.id = food_id and (f.owner_id is null or f.owner_id = (select auth.uid()))));
create policy "food_servings: власник керує" on public.food_servings for all to authenticated
  using (exists (select 1 from public.foods f where f.id = food_id and f.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.foods f where f.id = food_id and f.owner_id = (select auth.uid())));

create policy "subscriptions: власник читає" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- ─────────────────────────── Storage: фото страв (приватні) ───────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "meal-photos: власник читає" on storage.objects for select to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "meal-photos: власник завантажує" on storage.objects for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "meal-photos: власник видаляє" on storage.objects for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
