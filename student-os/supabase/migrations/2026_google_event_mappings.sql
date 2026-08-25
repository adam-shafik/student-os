-- Title -> domain mapping for imported Google Calendar events.
-- This uni titles each event with the module itself, so the title repeats exactly
-- every week: one mapping per module, applied on every future sync.
-- Idempotent: safe to re-run.

create table if not exists google_event_mappings (
  user_id    uuid not null references auth.users(id) on delete cascade,
  title_key  text not null,   -- lower(trim(google event title))
  domain_id  uuid references domains(id) on delete cascade,
  event_type text,
  updated_at timestamptz not null default now(),
  primary key (user_id, title_key)
);

alter table google_event_mappings enable row level security;

drop policy if exists "Users manage their own google event mappings" on google_event_mappings;
create policy "Users manage their own google event mappings"
  on google_event_mappings for all using (auth.uid() = user_id);

grant select, insert, update, delete on google_event_mappings to authenticated;
