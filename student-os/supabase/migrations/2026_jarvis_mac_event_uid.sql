-- A handle pairing a StudentOS event with JARVIS's copy in macOS Calendar.
-- JARVIS writes every event to both apps, and nothing syncs them, so today it
-- pairs the two copies on title + date. That is ambiguous when one day holds two
-- events with the same name (two lectures, two gym sessions), and JARVIS refuses
-- rather than guessing -- so those edits reach the Mac copy only.
-- Idempotent: safe to re-run.

alter table custom_calendar_events add column if not exists mac_event_uid text;

-- Deliberately nullable, not unique across users, and not a foreign key: JARVIS
-- owns the value, nothing in this app reads it, and a stale uid must never block
-- a write. Null on every row that exists today; nothing backfills it, hence the
-- partial index.
create index if not exists custom_calendar_events_mac_event_uid_idx
  on custom_calendar_events (user_id, mac_event_uid)
  where mac_event_uid is not null;

-- NOT a variant of google_event_id, and must never be folded into it: that column
-- is the provenance flag (null = Adam's own event, set = imported timetable), and
-- JARVIS filters the morning briefing on exactly that. A Mac uid written there
-- would take his own events out of the feature they exist for.

-- Rollback:
--   drop index if exists custom_calendar_events_mac_event_uid_idx;
--   alter table custom_calendar_events drop column if exists mac_event_uid;
