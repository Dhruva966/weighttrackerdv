-- Diary, profile, intentions, and enrichment for gym + weight paths.
-- Rollback (manual): drop new tables/enums in reverse dependency order; alter columns added below.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type movement_kind as enum ('walk', 'run', 'hike', 'cardio', 'other');

create type capture_source as enum ('text', 'voice', 'photo', 'manual', 'import', 'seed');

create type weight_unit as enum ('lb', 'kg');

create type user_focus as enum ('meals', 'weight', 'both');

create type consistency_event_type as enum (
  'meal',
  'weight',
  'movement',
  'workout',
  'intention',
  'gold'
);

-- ---------------------------------------------------------------------------
-- User profile / preferences (single-user today; user_id = hardcoded owner)
-- ---------------------------------------------------------------------------
create table user_profiles (
  user_id uuid primary key,
  preferred_name text not null default 'Dhruva',
  timezone text not null default 'America/Los_Angeles',
  weight_unit weight_unit not null default 'lb',
  rest_timer_seconds int not null default 90
    check (rest_timer_seconds between 15 and 600),
  calorie_target int not null default 2400
    check (calorie_target between 800 and 10000),
  protein_target_g int
    check (protein_target_g is null or protein_target_g between 0 and 1000),
  focus user_focus not null default 'both',
  gold_days int not null default 1
    check (gold_days between 0 and 365),
  onboarding_complete boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_profiles_updated_at_idx on user_profiles (updated_at desc);

-- ---------------------------------------------------------------------------
-- Body weight enrichment
-- ---------------------------------------------------------------------------
alter table body_weight_logs
  add column notes text,
  add column capture_source capture_source not null default 'text',
  add column updated_at timestamptz not null default now();

create index body_weight_logs_user_logged_at_idx
  on body_weight_logs (user_id, logged_at desc);

-- ---------------------------------------------------------------------------
-- Meals (diary) + line items
-- ---------------------------------------------------------------------------
create table meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  logged_at timestamptz not null default now(),
  day_key date not null,
  title text not null,
  summary text not null default '',
  raw text not null,
  calories int not null default 0 check (calories >= 0),
  protein_g numeric(6, 1) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6, 1) not null default 0 check (fat_g >= 0),
  capture_source capture_source not null default 'text',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meal_logs_user_day_idx on meal_logs (user_id, day_key desc, logged_at desc);
create index meal_logs_user_logged_at_idx on meal_logs (user_id, logged_at desc);

create table meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meal_logs (id) on delete cascade,
  name text not null,
  portion text not null default 'As logged',
  calories int not null default 0 check (calories >= 0),
  protein_g numeric(6, 1) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6, 1) not null default 0 check (fat_g >= 0),
  sort_order int not null default 0 check (sort_order >= 0)
);

create index meal_items_meal_id_idx on meal_items (meal_id, sort_order);

-- ---------------------------------------------------------------------------
-- Movement / cardio diary
-- ---------------------------------------------------------------------------
create table movement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  logged_at timestamptz not null default now(),
  day_key date not null,
  kind movement_kind not null default 'other',
  title text not null,
  summary text not null default '',
  raw text not null,
  duration_min numeric(6, 1) check (duration_min is null or duration_min >= 0),
  distance_mi numeric(6, 2) check (distance_mi is null or distance_mi >= 0),
  calories_burned int check (calories_burned is null or calories_burned >= 0),
  capture_source capture_source not null default 'text',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index movement_logs_user_day_idx on movement_logs (user_id, day_key desc, logged_at desc);
create index movement_logs_user_logged_at_idx on movement_logs (user_id, logged_at desc);
create index movement_logs_kind_idx on movement_logs (user_id, kind);

-- ---------------------------------------------------------------------------
-- Daily intentions (template) + per-day completion
-- ---------------------------------------------------------------------------
create table intentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  sort_order int not null default 0 check (sort_order >= 0),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index intentions_user_active_idx on intentions (user_id, archived, sort_order);

create table intention_completions (
  id uuid primary key default gen_random_uuid(),
  intention_id uuid not null references intentions (id) on delete cascade,
  user_id uuid not null,
  day_key date not null,
  done boolean not null default false,
  completed_at timestamptz,
  unique (intention_id, day_key)
);

create index intention_completions_user_day_idx
  on intention_completions (user_id, day_key desc);

-- ---------------------------------------------------------------------------
-- Consistency / pot-of-gold events
-- ---------------------------------------------------------------------------
create table consistency_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day_key date not null,
  event_type consistency_event_type not null,
  source_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create index consistency_events_user_day_idx
  on consistency_events (user_id, day_key desc, created_at desc);

-- ---------------------------------------------------------------------------
-- Gym enrichment
-- ---------------------------------------------------------------------------
alter table sessions
  add column title text,
  add column planned_exercise_ids uuid[] not null default '{}',
  add column rest_timer_seconds int not null default 90
    check (rest_timer_seconds between 15 and 600),
  add column updated_at timestamptz not null default now();

alter table sets
  add column notes text;

alter table goals
  add column sort_order int not null default 0 check (sort_order >= 0),
  add column archived boolean not null default false,
  add column updated_at timestamptz not null default now();

create index goals_user_active_idx on goals (user_id, archived, sort_order);

-- ---------------------------------------------------------------------------
-- Helpers: LA day_key + updated_at
-- ---------------------------------------------------------------------------
create or replace function set_day_key_la() returns trigger as $$
begin
  if new.day_key is null then
    new.day_key := (new.logged_at at time zone 'America/Los_Angeles')::date;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger meal_logs_day_key before insert or update on meal_logs
  for each row execute function set_day_key_la();

create trigger movement_logs_day_key before insert or update on movement_logs
  for each row execute function set_day_key_la();

create trigger user_profiles_touch before update on user_profiles
  for each row execute function touch_updated_at();

create trigger meal_logs_touch before update on meal_logs
  for each row execute function touch_updated_at();

create trigger movement_logs_touch before update on movement_logs
  for each row execute function touch_updated_at();

create trigger intentions_touch before update on intentions
  for each row execute function touch_updated_at();

create trigger goals_touch before update on goals
  for each row execute function touch_updated_at();

create trigger body_weight_logs_touch before update on body_weight_logs
  for each row execute function touch_updated_at();

create trigger sessions_touch before update on sessions
  for each row execute function touch_updated_at();
