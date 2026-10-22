-- The application uses only the server-side service_role client. Keep all
-- participant data unavailable to anonymous and authenticated API roles.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

alter table workshop_students add column if not exists deleted_at timestamptz;
alter table certificates add column if not exists revision integer not null default 1;
alter table certificates add column if not exists reissued_at timestamptz;
create unique index if not exists workshop_students_active_name_unique
  on workshop_students(workshop_id, name_key) where deleted_at is null;

create or replace function bump_student_certificate_revision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.full_name is distinct from new.full_name
    or old.name_key is distinct from new.name_key
    or old.deleted_at is distinct from new.deleted_at then
    update certificates set revision = revision + 1
    where workshop_student_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists workshop_student_certificate_revision on workshop_students;
create trigger workshop_student_certificate_revision after update on workshop_students
for each row execute function bump_student_certificate_revision();

create or replace function bump_workshop_certificate_revisions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.title is distinct from new.title or old.teacher is distinct from new.teacher
    or old.event_date is distinct from new.event_date or old.workload is distinct from new.workload
    or old.details is distinct from new.details then
    update certificates set revision = revision + 1
    where workshop_student_id in
      (select id from workshop_students where workshop_id = new.id);
  end if;
  return new;
end $$;
drop trigger if exists workshop_certificate_revision on workshops;
create trigger workshop_certificate_revision after update on workshops
for each row execute function bump_workshop_certificate_revisions();

create or replace function add_workshop_student(p_workshop_id uuid, p_name text, p_name_key text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_student_id uuid;
begin
  if length(trim(p_name)) < 2 or length(p_name) > 180 or p_name_key = '' then
    raise exception 'Nome inválido';
  end if;
  insert into workshop_students(workshop_id, full_name, name_key, student_key)
  values(p_workshop_id, p_name, p_name_key, gen_random_uuid()::text)
  returning id into v_student_id;
  insert into certificates(kind, workshop_student_id)
  values('workshop', v_student_id);
  return v_student_id;
end $$;

create or replace function reissue_workshop_certificate(p_student_id uuid)
returns table(certificate_id uuid, new_revision integer, reissued_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  return query
    update certificates c set revision = c.revision + 1, reissued_at = now()
    from workshop_students s
    where s.id = p_student_id and s.deleted_at is null
      and c.workshop_student_id = s.id and c.kind = 'workshop'
    returning c.id, c.revision, c.reissued_at;
end $$;

-- Preserve original import keys so repeating the initial load after an edit or
-- soft deletion does not restore an old name or make another enrollment.
create or replace function import_workshops(p_courses jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare course jsonb; student jsonb; w workshops%rowtype; s workshop_students%rowtype;
  n_courses integer := 0; n_students integer := 0;
begin
  for course in select * from jsonb_array_elements(p_courses) loop
    insert into workshops(title, teacher, event_date, workload, details, import_key)
    values(course->>'title', course->>'teacher', (course->>'event_date')::date,
      nullif(course->>'workload',''), nullif(course->>'details',''), course->>'key')
    on conflict (import_key) do nothing returning * into w;
    if found then n_courses := n_courses + 1;
    else select * into w from workshops where import_key = course->>'key'; end if;
    for student in select * from jsonb_array_elements(course->'students') loop
      insert into workshop_students(workshop_id, full_name, name_key, student_key)
      values(w.id, student->>'name', student->>'key', student->>'key')
      on conflict (workshop_id, student_key) do nothing returning * into s;
      if found then n_students := n_students + 1;
      else select * into s from workshop_students
        where workshop_id = w.id and student_key = student->>'key'; end if;
      insert into certificates(kind, workshop_student_id)
      values('workshop', s.id) on conflict (workshop_student_id) do nothing;
    end loop;
  end loop;
  return jsonb_build_object('courses_created', n_courses, 'students_created', n_students);
end $$;

revoke execute on function bump_student_certificate_revision() from public, anon, authenticated;
revoke execute on function bump_workshop_certificate_revisions() from public, anon, authenticated;
revoke execute on function add_workshop_student(uuid,text,text) from public, anon, authenticated;
revoke execute on function reissue_workshop_certificate(uuid) from public, anon, authenticated;
revoke execute on function import_workshops(jsonb) from public, anon, authenticated;
grant execute on function add_workshop_student(uuid,text,text) to service_role;
grant execute on function reissue_workshop_certificate(uuid) to service_role;
grant execute on function import_workshops(jsonb) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('certificates','certificates',false,10485760,array['application/pdf'])
on conflict (id) do update set public = false;
