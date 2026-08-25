-- Todo completion lifecycle + external (Jarvis) writes.
-- Idempotent: safe to re-run if the ALTERs were already applied by hand.

alter table todos add column if not exists completed_at timestamptz;
alter table todos add column if not exists source text not null default 'app';

update todos set completed_at = created_at where done and completed_at is null;
update todos set completed_at = null       where not done and completed_at is not null;

-- `done` and `completed_at` are two views of one fact, and there are two writers
-- (this app and Jarvis). Enforce agreement in the DB so neither writer can drift:
-- whichever column a writer touches, the other follows.
create or replace function todos_sync_completion() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.done and new.completed_at is null then
      new.completed_at := now();
    elsif not new.done then
      new.completed_at := null;
    end if;
    return new;
  end if;

  if new.done is distinct from old.done
     and new.completed_at is not distinct from old.completed_at then
    new.completed_at := case when new.done then now() else null end;
  elsif new.completed_at is distinct from old.completed_at
        and new.done is not distinct from old.done then
    new.done := new.completed_at is not null;
  end if;

  if new.done <> (new.completed_at is not null) then
    new.completed_at := case when new.done then coalesce(new.completed_at, now()) else null end;
  end if;

  return new;
end;
$$;

drop trigger if exists todos_sync_completion_trigger on todos;
create trigger todos_sync_completion_trigger
  before insert or update on todos
  for each row execute function todos_sync_completion();

-- Live-sync the open app with tasks Jarvis creates, completes, or deletes.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'todos'
  ) then
    alter publication supabase_realtime add table todos;
  end if;
end $$;
