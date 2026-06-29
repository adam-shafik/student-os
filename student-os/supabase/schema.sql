-- ============================================================
-- StudentOS — Supabase Schema
-- Paste into the Supabase SQL Editor and run.
-- Every table has RLS: users only see their own rows.
-- ============================================================

-- ─── User Profiles ────────────────────────────────────────────────────────────
create table user_profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  first_name      text,
  university      text,
  year_of_study   text,
  semester_start  date,
  semester_end    date,
  semester2_start date,                            -- optional 2nd semester (null = single-semester year)
  semester2_end   date,
  week_start      text not null default 'monday', -- 'monday'|'sunday'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table user_profiles enable row level security;
create policy "Users manage their own profile"
  on user_profiles for all using (auth.uid() = id);

-- ─── Semester Breaks ──────────────────────────────────────────────────────────
create table semester_breaks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  start_monday    date not null,
  return_monday   date not null
);

alter table semester_breaks enable row level security;
create policy "Users manage their own semester breaks"
  on semester_breaks for all using (auth.uid() = user_id);

-- ─── Domains ──────────────────────────────────────────────────────────────────
create table domains (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  code                text,
  category            text not null, -- 'academic'|'society'|'hackathon'|'organization'|'project'|'personal'|'other'
  color               text not null,
  icon                text,
  professor           text,
  credits             integer,
  semester_label      text,
  semester_number     smallint,      -- 1 or 2 = that semester; null/0 = full-year domain
  role                text,          -- non-academic domains
  description         text,
  progress            integer,
  is_past             boolean not null default false,
  exclude_from_grade  boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table domains enable row level security;
create policy "Users manage their own domains"
  on domains for all using (auth.uid() = user_id);

-- ─── Domain Schedule Slots ────────────────────────────────────────────────────
create table domain_schedule_slots (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  domain_id         uuid not null references domains(id) on delete cascade,
  day_of_week       integer not null, -- 0=Mon … 6=Sun
  slot_type         text not null,    -- 'lecture'|'lab'|'tutorial'|'seminar'|'workshop'|'group'
  start_time        text not null,    -- 'HH:MM'
  duration_minutes  integer not null,
  week_from         integer,          -- null = whole semester
  week_to           integer,
  location          text
);

alter table domain_schedule_slots enable row level security;
create policy "Users manage their own schedule slots"
  on domain_schedule_slots for all using (auth.uid() = user_id);

-- ─── Domain Assessments ───────────────────────────────────────────────────────
create table domain_assessments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  domain_id   uuid not null references domains(id) on delete cascade,
  type        text not null,    -- 'assignment'|'exam'|'quiz'|'project'|'other'
  title       text not null,
  date        date,
  weight      integer not null default 0,
  grade       numeric,
  location    text,
  created_at  timestamptz not null default now()
);

alter table domain_assessments enable row level security;
create policy "Users manage their own assessments"
  on domain_assessments for all using (auth.uid() = user_id);

-- ─── Custom Calendar Events ───────────────────────────────────────────────────
create table custom_calendar_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  domain_id       uuid references domains(id) on delete set null,
  type            text not null,
  title           text not null,
  date            date not null,
  academic_week   integer,
  created_at      timestamptz not null default now()
);

alter table custom_calendar_events enable row level security;
create policy "Users manage their own calendar events"
  on custom_calendar_events for all using (auth.uid() = user_id);

-- ─── Cancelled Schedule Events ────────────────────────────────────────────────
create table cancelled_schedule_events (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  event_id  text not null,
  unique(user_id, event_id)
);

alter table cancelled_schedule_events enable row level security;
create policy "Users manage their own cancelled events"
  on cancelled_schedule_events for all using (auth.uid() = user_id);

-- ─── Event Notes ──────────────────────────────────────────────────────────────
create table event_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_id    text not null,
  text        text not null default '',
  updated_at  timestamptz not null default now(),
  unique(user_id, event_id)
);

alter table event_notes enable row level security;
create policy "Users manage their own event notes"
  on event_notes for all using (auth.uid() = user_id);

-- ─── User Preferences ─────────────────────────────────────────────────────────
create table user_preferences (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  event_type_colors   jsonb not null default '{}'
);

alter table user_preferences enable row level security;
create policy "Users manage their own preferences"
  on user_preferences for all using (auth.uid() = user_id);

-- ─── Week Confidence ──────────────────────────────────────────────────────────
create table week_confidence (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  domain_id   uuid not null references domains(id) on delete cascade,
  week        integer not null,
  status      text not null default 'not_started', -- 'not_started'|'reviewed'|'confident'
  unique(user_id, domain_id, week)
);

alter table week_confidence enable row level security;
create policy "Users manage their own week confidence"
  on week_confidence for all using (auth.uid() = user_id);

-- ─── Todos ────────────────────────────────────────────────────────────────────
create table todos (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  domain_id         uuid references domains(id) on delete set null,
  title             text not null,
  due_date          date,
  priority          text not null default 'medium', -- 'low'|'medium'|'high'
  done              boolean not null default false,
  academic_week     integer,
  note_id           uuid,   -- FK → notes (circular; added after notes table)
  study_session_id  uuid,   -- FK → study_sessions (circular; added after that table)
  created_at        timestamptz not null default now()
);

alter table todos enable row level security;
create policy "Users manage their own todos"
  on todos for all using (auth.uid() = user_id);

-- ─── Notes ────────────────────────────────────────────────────────────────────
create table notes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  domain_id         uuid references domains(id) on delete set null,
  academic_week     integer,
  event_id          text,
  study_session_id  uuid,   -- FK → study_sessions (circular; added after that table)
  title             text not null default 'Untitled Note',
  note_type         text not null default 'handwritten', -- 'handwritten'|'typed'
  content           text,          -- typed notes only
  template          text not null default 'lined',  -- 'blank'|'lined'|'grid'|'dotted'
  bg_color          text not null default '#f8f7f2',
  line_spacing      integer not null default 48,
  orientation       text not null default 'portrait',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table notes enable row level security;
create policy "Users manage their own notes"
  on notes for all using (auth.uid() = user_id);

-- ─── Note Folders ─────────────────────────────────────────────────────────────
-- User-created folders for organizing notes within the General section (domain_id
-- null) and within non-academic domains. Academic domains keep automatic teaching-
-- week grouping, so they don't use folders.
create table note_folders (
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
create policy "Users manage their own note folders"
  on note_folders for all using (auth.uid() = user_id);

create index note_folders_user_idx   on note_folders(user_id);
create index note_folders_parent_idx on note_folders(parent_id);

-- A note can live in at most one folder; deleting the folder unfiles the note.
alter table notes
  add column folder_id uuid references note_folders(id) on delete set null;

-- ─── Note Pages ───────────────────────────────────────────────────────────────
create table note_pages (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid not null references notes(id) on delete cascade,
  page_order  integer not null default 0,
  strokes     jsonb not null default '[]',
  unique(note_id, page_order)
);

alter table note_pages enable row level security;
create policy "Users manage pages for their notes"
  on note_pages for all
  using (exists (
    select 1 from notes where notes.id = note_id and notes.user_id = auth.uid()
  ));

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

-- Resolve circular FKs now that all tables exist
alter table notes
  add constraint notes_study_session_fkey
  foreign key (study_session_id) references study_sessions(id) on delete set null;

alter table todos
  add constraint todos_note_fkey
  foreign key (note_id) references notes(id) on delete set null;

alter table todos
  add constraint todos_study_session_fkey
  foreign key (study_session_id) references study_sessions(id) on delete set null;

-- ─── Flashcard Decks ──────────────────────────────────────────────────────────
create table flashcard_decks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  domain_id         uuid references domains(id) on delete set null,
  academic_week     integer,
  note_id           uuid references notes(id) on delete set null,
  study_session_id  uuid references study_sessions(id) on delete set null,
  title             text not null default 'Untitled Deck',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table flashcard_decks enable row level security;
create policy "Users manage their own flashcard decks"
  on flashcard_decks for all using (auth.uid() = user_id);

-- ─── Flashcards ───────────────────────────────────────────────────────────────
create table flashcards (
  id             uuid primary key default gen_random_uuid(),
  deck_id        uuid not null references flashcard_decks(id) on delete cascade,
  front          text not null default '',
  back           text not null default '',
  position       integer not null default 0,
  ease_factor    numeric not null default 2.5,  -- SM-2 spaced repetition state
  interval_days  integer not null default 0,
  due_date       date,                          -- null = new card, always due
  repetitions    integer not null default 0,
  created_at     timestamptz not null default now()
);

alter table flashcards enable row level security;
create policy "Users manage cards for their decks"
  on flashcards for all
  using (exists (
    select 1 from flashcard_decks where flashcard_decks.id = deck_id and flashcard_decks.user_id = auth.uid()
  ));

-- ============================================================
-- Migration: two-semester support (run on existing installs)
-- ============================================================
alter table user_profiles add column if not exists semester2_start date;
alter table user_profiles add column if not exists semester2_end   date;
alter table domains       add column if not exists semester_number smallint;
