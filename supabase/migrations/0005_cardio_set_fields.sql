-- Cardio set fields (level / speed / time / calories), parallel to lift weight×reps.
-- Rollback: drop columns; restore weight_lb/reps NOT NULL after backfilling zeros.

alter table sets
  alter column weight_lb drop not null,
  alter column reps drop not null;

alter table sets
  add column if not exists level numeric(5,1),
  add column if not exists speed numeric(5,2),
  add column if not exists duration_sec int,
  add column if not exists calories numeric(6,1);

-- Lift sets keep positive weight+reps; cardio sets need at least one cardio metric.
alter table sets drop constraint if exists sets_lift_or_cardio;
alter table sets add constraint sets_lift_or_cardio check (
  (
    weight_lb is not null
    and weight_lb > 0
    and reps is not null
    and reps > 0
  )
  or (
    level is not null
    or speed is not null
    or duration_sec is not null
    or calories is not null
  )
);

-- PR marking only applies to lift sets with weight/reps.
create or replace function mark_pr() returns trigger as $$
begin
  if new.weight_lb is null or new.reps is null then
    new.is_pr := false;
    return new;
  end if;

  if not new.is_warmup and not exists (
    select 1 from sets s
    where s.exercise_id = new.exercise_id
      and s.id <> new.id
      and s.is_warmup = false
      and s.weight_lb is not null
      and s.reps is not null
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
