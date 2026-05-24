-- ============================================================
-- StudentOS — Supabase Schema
-- Paste this into the Supabase SQL Editor and run it.
-- Every table has RLS enabled: users only see their own rows.
-- ============================================================

-- ─── Domains ─────────────────────────────────────────────────────────────────
create table domains (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  code         text,
  module_code  text,         -- future GCal integration: e.g. 'COM113.A.283966'
  category     text not null, -- 'academic'|'society'|'hackathon'|'organization'|'project'|'personal'|'other'
  color        text not null,
  color_muted  text,
  icon         text,
  professor    text,
  credits      integer,
  semester     text,
  progress     integer,
  description  text,
  role         text,         -- non-academic domains only
  created_at   timestamptz not null default now()
);

alter table domains enable row level security;
create policy "Users manage their own domains"
  on domains for all using (auth.uid() = user_id);

-- ─── Lectures ────────────────────────────────────────────────────────────────
create table domain_lectures (
  id         uuid primary key default gen_random_uuid(),
  domain_id  uuid not null references domains(id) on delete cascade,
  week       integer not null,
  title      text not null,
  date       date,
  status     text not null default 'upcoming', -- 'upcoming'|'in-progress'|'completed'
  has_notes  boolean not null default false,
  created_at timestamptz not null default now()
);

alter table domain_lectures enable row level security;
create policy "Users manage lectures for their domains"
  on domain_lectures for all
  using (exists (
    select 1 from domains where domains.id = domain_id and domains.user_id = auth.uid()
  ));

-- ─── Labs ────────────────────────────────────────────────────────────────────
create table domain_labs (
  id         uuid primary key default gen_random_uuid(),
  domain_id  uuid not null references domains(id) on delete cascade,
  week       integer not null,
  title      text not null,
  date       date,
  status     text not null default 'upcoming',
  pdf_url    text,   -- future: Supabase Storage URL for uploaded PDF
  note_id    uuid,   -- FK → notes; set after note is created for this lab
  created_at timestamptz not null default now()
);

alter table domain_labs enable row level security;
create policy "Users manage labs for their domains"
  on domain_labs for all
  using (exists (
    select 1 from domains where domains.id = domain_id and domains.user_id = auth.uid()
  ));

-- ─── Assignments ─────────────────────────────────────────────────────────────
create table domain_assignments (
  id         uuid primary key default gen_random_uuid(),
  domain_id  uuid not null references domains(id) on delete cascade,
  title      text not null,
  due_date   date,
  weight     integer,
  status     text not null default 'upcoming', -- 'upcoming'|'submitted'|'graded'
  grade      integer,
  created_at timestamptz not null default now()
);

alter table domain_assignments enable row level security;
create policy "Users manage assignments for their domains"
  on domain_assignments for all
  using (exists (
    select 1 from domains where domains.id = domain_id and domains.user_id = auth.uid()
  ));

-- ─── Exams ───────────────────────────────────────────────────────────────────
create table domain_exams (
  id         uuid primary key default gen_random_uuid(),
  domain_id  uuid not null references domains(id) on delete cascade,
  title      text not null,
  date       date,
  time       text,     -- e.g. '09:00 – 11:00'
  location   text,
  weight     integer,
  status     text not null default 'upcoming',
  created_at timestamptz not null default now()
);

alter table domain_exams enable row level security;
create policy "Users manage exams for their domains"
  on domain_exams for all
  using (exists (
    select 1 from domains where domains.id = domain_id and domains.user_id = auth.uid()
  ));

-- ─── Custom Calendar Events ───────────────────────────────────────────────────
create table custom_calendar_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  domain_id      uuid references domains(id) on delete set null,
  type           text not null,
  title          text not null,
  date           date not null,
  academic_week  integer,
  created_at     timestamptz not null default now()
);

alter table custom_calendar_events enable row level security;
create policy "Users manage their own calendar events"
  on custom_calendar_events for all using (auth.uid() = user_id);

-- ─── Event Notes ─────────────────────────────────────────────────────────────
-- event_id is a string key (polymorphic) referencing any event type.
-- unique(user_id, event_id) means one text note per event per user — matches
-- the current { [eventId]: string } shape in App.jsx.
create table event_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_id   text not null,
  text       text not null default '',
  updated_at timestamptz not null default now(),
  unique(user_id, event_id)
);

alter table event_notes enable row level security;
create policy "Users manage their own event notes"
  on event_notes for all using (auth.uid() = user_id);

-- ─── Notes (handwritten canvas notes) ────────────────────────────────────────
create table notes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  domain_id         uuid references domains(id) on delete set null,
  academic_week     integer,
  event_id          text,   -- polymorphic link to any event type by string ID
  study_session_id  uuid,   -- FK → study_sessions; nullable circular ref resolved below
  title             text not null default 'Untitled Note',
  template          text not null default 'blank', -- 'blank'|'lined'|'grid'|'dotted'
  bg_color          text not null default '#f8f7f2',
  line_spacing      integer not null default 32,
  orientation       text not null default 'portrait',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table notes enable row level security;
create policy "Users manage their own notes"
  on notes for all using (auth.uid() = user_id);

-- ─── Note Pages ──────────────────────────────────────────────────────────────
-- strokes is JSONB: the full strokes array for a page serialised as JSON.
create table note_pages (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid not null references notes(id) on delete cascade,
  page_order  integer not null default 0,
  strokes     jsonb not null default '[]'
);

alter table note_pages enable row level security;
create policy "Users manage pages for their notes"
  on note_pages for all
  using (exists (
    select 1 from notes where notes.id = note_id and notes.user_id = auth.uid()
  ));

-- ─── Todos ───────────────────────────────────────────────────────────────────
create table todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  domain_id   uuid references domains(id) on delete set null,
  title       text not null,
  due_date    date,
  priority    text not null default 'medium', -- 'low'|'medium'|'high'
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table todos enable row level security;
create policy "Users manage their own todos"
  on todos for all using (auth.uid() = user_id);

-- ─── Study Sessions ───────────────────────────────────────────────────────────
create table study_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  domain_id         uuid references domains(id) on delete set null,
  topic             text,
  academic_week     integer,
  pomodoro_work     integer not null,  -- minutes
  pomodoro_break    integer not null,  -- minutes
  total_rounds      integer not null,
  rounds_completed  integer not null default 0,
  note_id           uuid references notes(id) on delete set null,
  status            text not null,     -- 'completed'|'abandoned'
  started_at        timestamptz not null,
  ended_at          timestamptz
);

alter table study_sessions enable row level security;
create policy "Users manage their own study sessions"
  on study_sessions for all using (auth.uid() = user_id);

-- Resolve the notes ↔ study_sessions circular FK now that both tables exist
alter table notes
  add constraint notes_study_session_id_fkey
  foreign key (study_session_id) references study_sessions(id) on delete set null;

-- ─── Week Confidence ──────────────────────────────────────────────────────────
-- unique(user_id, domain_id, week) → use upsert on write
create table week_confidence (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  domain_id  uuid not null references domains(id) on delete cascade,
  week       integer not null,
  status     text not null default 'not_started', -- 'not_started'|'reviewed'|'confident'
  unique(user_id, domain_id, week)
);

alter table week_confidence enable row level security;
create policy "Users manage their own week confidence"
  on week_confidence for all using (auth.uid() = user_id);

-- ─── Semester Config ──────────────────────────────────────────────────────────
-- Replaces the hardcoded semesterConfig in src/data/semester.js.
-- is_active = true marks the semester the app currently uses.
create table semester_configs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,   -- e.g. 'Semester 2 2025-26'
  start_date  date not null,
  end_date    date not null,
  is_active   boolean not null default true
);

alter table semester_configs enable row level security;
create policy "Users manage their own semester configs"
  on semester_configs for all using (auth.uid() = user_id);

create table semester_breaks (
  id           uuid primary key default gen_random_uuid(),
  semester_id  uuid not null references semester_configs(id) on delete cascade,
  name         text not null,
  short_name   text,
  color        text,
  start_date   date not null,
  end_date     date not null
);

alter table semester_breaks enable row level security;
create policy "Users manage their own semester breaks"
  on semester_breaks for all
  using (exists (
    select 1 from semester_configs
    where semester_configs.id = semester_id and semester_configs.user_id = auth.uid()
  ));
