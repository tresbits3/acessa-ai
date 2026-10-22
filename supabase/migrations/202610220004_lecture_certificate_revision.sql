create or replace function bump_lecture_certificate_revisions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.title is distinct from new.title or old.speaker is distinct from new.speaker
    or old.event_date is distinct from new.event_date or old.workload is distinct from new.workload
    or old.details is distinct from new.details then
    update certificates set revision = revision + 1
    where participant_id in (select id from participants where lecture_id = new.id);
  end if;
  return new;
end $$;

drop trigger if exists lecture_certificate_revision on lectures;
create trigger lecture_certificate_revision after update on lectures
for each row execute function bump_lecture_certificate_revisions();
