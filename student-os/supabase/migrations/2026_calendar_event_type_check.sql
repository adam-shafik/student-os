-- Constrain custom_calendar_events.type to the keys EVENT_TYPES actually knows.
-- `type` is plain text today, so an off-list value is not rejected -- it is
-- silently downgraded: resolveTypeLabel/resolveTypeColor in
-- src/utils/calendarEvents.js fall through to a grey chip reading "Event", so the
-- event lands on the right day looking wrong for no stated reason. Constraining
-- makes the same mistake fail loudly from any writer -- Jarvis, the sync edge
-- function, or this app.
--
-- The list is closed by design, not merely current: a new kind of event goes in as
-- 'other' with details.customTypeName (AddEventModal requires the name), so this
-- does not become a thing to remember to update.
--
-- Idempotent: safe to re-run.
--
-- Survey the live values first if you want them by hand:
--   select type, count(*) from custom_calendar_events group by type order by 2 desc;

-- Names the offending values, instead of Postgres's "violated by some row".
do $$
declare offending text;
begin
  select string_agg(distinct quote_literal(type), ', ') into offending
  from custom_calendar_events
  where type not in (
    'lecture','lab','tutorial','seminar','workshop','group',
    'assignment','exam','study','social','appointment','reminder','other'
  );

  if offending is not null then
    raise exception
      'custom_calendar_events.type holds values outside EVENT_TYPES: %. Fix or remap these rows before adding the constraint.', offending;
  end if;
end $$;

alter table custom_calendar_events
  drop constraint if exists custom_calendar_events_type_check;

alter table custom_calendar_events
  add constraint custom_calendar_events_type_check
  check (type in (
    'lecture','lab','tutorial','seminar','workshop','group',
    'assignment','exam','study','social','appointment','reminder','other'
  ));

-- Rollback:
--   alter table custom_calendar_events drop constraint if exists custom_calendar_events_type_check;
