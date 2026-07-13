-- Public read bucket for exercise images.
insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', true)
on conflict (id) do update set public = excluded.public;
