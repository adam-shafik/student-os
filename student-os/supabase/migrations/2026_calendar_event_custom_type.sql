-- The label a user types for an "Other" event (e.g. "Revision session"). Without it
-- the label only lived in memory and reverted to "Other" on reload.
alter table custom_calendar_events add column if not exists custom_type_name text;
