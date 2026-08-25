-- Google events carry a structured description (module codes, room, staff,
-- session type). Keep it so the event detail modal can show it.
alter table custom_calendar_events add column if not exists description text;
