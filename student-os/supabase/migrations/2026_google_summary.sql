-- The imported title now shows the session type ("Lecture", "Surgery/Drop in"),
-- so the module name from Google's `summary` needs its own column: it is the key
-- the domain mapping groups on.
alter table custom_calendar_events add column if not exists google_summary text;
