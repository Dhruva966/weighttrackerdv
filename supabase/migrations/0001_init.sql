-- Extensions
create extension if not exists "pgcrypto";

-- Muscle groups (enum-like)
create type muscle_group as enum (
  'chest','back','shoulders','arms','biceps','triceps',
  'legs','quads','hamstrings','glutes','calves',
  'core','forearms','full-body','cardio'
);

create type equipment_kind as enum (
  'barbell','dumbbell','machine','cable','bodyweight','kettlebell','other'
);

create type image_style as enum ('photo','silhouette','name-only');

-- Exercise catalog (shared)
create table exercises (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  muscle_group muscle_group not null,
  secondary_muscles text[] default '{}',
  equipment equipment_kind default 'other',
  instructions text[] default '{}',
  setup_notes text[] default '{}',
  image_url text,
  image_style image_style default 'name-only',
  source text,
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on exercises (muscle_group);
create index on exercises (archived);
create index on exercises using gin (to_tsvector('english', name));

-- Sessions
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text
);

create index on sessions (user_id, started_at desc);

-- Sets
create table sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  set_number int not null,
  weight_lb numeric(6,2) not null,
  reps int not null check (reps > 0),
  rpe numeric(3,1),
  is_warmup boolean default false,
  is_pr boolean default false,
  created_at timestamptz default now()
);

create index on sets (session_id);
create index on sets (exercise_id, created_at desc);

-- Body weight log
create table body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  logged_at date not null default current_date,
  weight_lb numeric(5,2) not null,
  unique (user_id, logged_at)
);

-- Goals (from "Goals" column of user's board)
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  target_value numeric,
  target_unit text,
  achieved boolean default false,
  achieved_at date,
  created_at timestamptz default now()
);

-- PR trigger: mark is_pr on insert if this set's (weight, reps) beats every prior set for the exercise.
create or replace function mark_pr() returns trigger as $$
begin
  if not new.is_warmup and not exists (
    select 1 from sets s
    where s.exercise_id = new.exercise_id
      and s.id <> new.id
      and s.is_warmup = false
      and (
        (s.weight_lb > new.weight_lb) or
        (s.weight_lb = new.weight_lb and s.reps >= new.reps)
      )
  ) then
    new.is_pr := true;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger sets_mark_pr before insert on sets
  for each row execute function mark_pr();

-- Updated_at trigger for exercises.
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger exercises_touch before update on exercises
  for each row execute function touch_updated_at();
