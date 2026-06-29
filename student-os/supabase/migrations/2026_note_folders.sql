-- Note Folders — run once in the Supabase SQL editor.
-- Adds user-created folders for organizing notes within the General section
-- (domain_id null) and within non-academic domains. Academic domains keep their
-- automatic teaching-week grouping and do not use folders.

create table if not exists note_folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  domain_id   uuid references domains(id) on delete cascade,        -- null = General scope
  parent_id   uuid references note_folders(id) on delete cascade,   -- null = top level
  name        text not null default 'New Folder',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table note_folders enable row level security;

do $$ begin
  create policy "Users manage their own note folders"
    on note_folders for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists note_folders_user_idx   on note_folders(user_id);
create index if not exists note_folders_parent_idx on note_folders(parent_id);

-- A note can live in at most one folder; deleting the folder unfiles the note.
alter table notes
  add column if not exists folder_id uuid references note_folders(id) on delete set null;
