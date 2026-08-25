-- Google Calendar import: connection state + the columns imported timetable
-- events need (custom_calendar_events previously stored only a date).
-- Idempotent: safe to re-run.

create table if not exists google_calendar_connections (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  google_email    text,
  refresh_token   text not null,
  calendar_ids    text[] not null default '{}',
  last_synced_at  timestamptz,
  last_sync_error text,
  created_at      timestamptz not null default now()
);

alter table google_calendar_connections enable row level security;

-- The refresh token is a long-lived credential: the client may see whether a
-- connection exists and which calendars are selected, but never the token
-- itself. Reads go through the view below; writes are service-role only, from
-- the edge functions.
drop policy if exists "Users read their own google connection" on google_calendar_connections;
create policy "Users read their own google connection"
  on google_calendar_connections for select using (auth.uid() = user_id);

drop policy if exists "Users delete their own google connection" on google_calendar_connections;
create policy "Users delete their own google connection"
  on google_calendar_connections for delete using (auth.uid() = user_id);

create or replace view google_calendar_status
with (security_invoker = true) as
  select user_id, google_email, calendar_ids, last_synced_at, last_sync_error
  from google_calendar_connections;

-- Views do not inherit the schema's default grants, so the client would get a
-- permission error without this. security_invoker keeps the table's RLS in force,
-- which also means the caller needs column privileges on the underlying table --
-- granted on the non-secret columns only, so refresh_token stays unreadable.
grant select (user_id, google_email, calendar_ids, last_synced_at, last_sync_error)
  on google_calendar_connections to authenticated;
grant select on google_calendar_status to authenticated;

alter table custom_calendar_events add column if not exists start_time         time;
alter table custom_calendar_events add column if not exists duration_minutes   integer;
alter table custom_calendar_events add column if not exists location           text;
alter table custom_calendar_events add column if not exists google_event_id    text;
alter table custom_calendar_events add column if not exists google_calendar_id text;
alter table custom_calendar_events add column if not exists locally_edited     boolean not null default false;

-- Reconciliation keys on this: one row per Google occurrence per user.
create unique index if not exists custom_calendar_events_google_uniq
  on custom_calendar_events (user_id, google_event_id)
  where google_event_id is not null;
