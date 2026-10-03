-- Per-domain weekly tick tracker ("did I do the homework / tutorial / revision
-- for week 7?"). Academic domains only, enforced in the UI rather than here:
-- a domain can change category, and dropping its tracker on that edit would
-- silently destroy a term's worth of ticks.
-- Idempotent: safe to re-run.

-- ─── Columns ──────────────────────────────────────────────────────────────────
-- The user's own column set, defined once per domain and repeated down every
-- teaching week. Position orders them left to right; gaps are fine, the UI only
-- ever sorts by it.
create table if not exists domain_tracker_columns (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  domain_id   uuid not null references domains(id) on delete cascade,
  label       text not null default 'New column',
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table domain_tracker_columns enable row level security;

drop policy if exists "Users manage their own tracker columns" on domain_tracker_columns;
create policy "Users manage their own tracker columns"
  on domain_tracker_columns for all using (auth.uid() = user_id);

create index if not exists domain_tracker_columns_domain_idx
  on domain_tracker_columns (user_id, domain_id, position);

-- ─── Cells ────────────────────────────────────────────────────────────────────
-- One row per (column, week) the user has touched. `checked = false` rows are
-- kept rather than deleted, mirroring week_confidence: an upsert on a stable
-- conflict target is a single round trip, where toggling by insert/delete is two
-- code paths and races with itself on a fast double-tap.
create table if not exists domain_tracker_cells (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  column_id   uuid not null references domain_tracker_columns(id) on delete cascade,
  week        integer not null,
  checked     boolean not null default false,
  updated_at  timestamptz not null default now(),
  unique(user_id, column_id, week)
);

alter table domain_tracker_cells enable row level security;

drop policy if exists "Users manage their own tracker cells" on domain_tracker_cells;
create policy "Users manage their own tracker cells"
  on domain_tracker_cells for all using (auth.uid() = user_id);

-- Deleting a column takes its cells with it (cascade above), so there is no
-- orphan-sweep to run. Dropping the domain takes both.

-- Rollback:
--   drop table if exists domain_tracker_cells;
--   drop table if exists domain_tracker_columns;
