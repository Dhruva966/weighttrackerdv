-- Workout templates (Phase 6: My/Example templates, start-from-template).
create table templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on templates (user_id);

create trigger templates_touch before update on templates
  for each row execute function touch_updated_at();

-- Ordered exercise list within a template.
create table template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  position int not null,
  target_sets int,
  target_reps int,
  target_weight_lb numeric(6,2),
  created_at timestamptz default now(),
  unique (template_id, position)
);

create index on template_exercises (template_id);

-- Device-local day tracking for sessions (Phase 5: replace hardcoded LA tz).
-- Backfill assumes the app's current hardcoded America/Los_Angeles behavior so
-- existing rows keep the same calendar-day bucketing they already had.
alter table sessions add column local_date date;
alter table sessions add column timezone text default 'America/Los_Angeles';

update sessions
set local_date = (started_at at time zone 'America/Los_Angeles')::date
where local_date is null;

create index on sessions (user_id, local_date);

-- Rollback: drop table template_exercises; drop table templates;
--           alter table sessions drop column local_date, drop column timezone;
