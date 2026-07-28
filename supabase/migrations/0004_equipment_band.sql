-- ~12 imported exercises use resistance bands; don't lump them into 'other'.
alter type equipment_kind add value if not exists 'band';

-- Rollback: not reversible in place (Postgres cannot drop enum values).
-- If needed, recreate the enum without 'band' and remap affected rows.
