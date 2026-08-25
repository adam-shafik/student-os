-- Fixes a 403 on google_calendar_status.
--
-- The view is security_invoker, so it runs with the caller's privileges and the
-- caller therefore needs rights on the underlying table. Granting the whole
-- table would expose refresh_token to the browser, so grant only the non-secret
-- columns: the token then cannot be read even by querying the table directly,
-- and RLS still restricts every caller to their own row.
grant select (user_id, google_email, calendar_ids, last_synced_at, last_sync_error)
  on google_calendar_connections to authenticated;

grant select on google_calendar_status to authenticated;

-- Same omission on the mappings table.
grant select, insert, update, delete on google_event_mappings to authenticated;
