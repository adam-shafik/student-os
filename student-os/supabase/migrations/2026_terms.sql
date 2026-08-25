-- Terms (semester periods) — run once in the Supabase SQL editor.
-- Lets the student roll over into a new semester without deleting the previous one.
-- Each term stores its own dates; domains and breaks belong to a term, so past terms
-- keep their exact calendar/events while a new term becomes current.

create table if not exists terms (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null default 'Semester',
  start_date  date not null,
  end_date    date not null,
  position    integer not null default 0,   -- chronological order
  is_current  boolean not null default true,-- exactly one current term per user
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table terms enable row level security;

do $$ begin
  create policy "Users manage their own terms"
    on terms for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists terms_user_idx on terms(user_id);

-- A domain belongs to one term; deleting the term detaches (never deletes) the domain.
alter table domains
  add column if not exists term_id uuid references terms(id) on delete set null;

-- A break belongs to one term so editing one term's breaks never touches another's.
alter table semester_breaks
  add column if not exists term_id uuid references terms(id) on delete cascade;
