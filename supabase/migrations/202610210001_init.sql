create extension if not exists pgcrypto;

create table if not exists lectures (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  speaker text not null,
  event_date date not null,
  workload text,
  details text,
  registration_open boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists workshops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  teacher text not null,
  event_date date not null,
  workload text,
  details text,
  import_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references lectures(id),
  full_name text not null,
  name_key text not null,
  phone_e164 text not null,
  phone_hash text not null,
  email text,
  created_at timestamptz not null default now(),
  unique(lecture_id, phone_hash)
);

create table if not exists workshop_students (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references workshops(id),
  full_name text not null,
  name_key text not null,
  student_key text not null,
  created_at timestamptz not null default now(),
  unique(workshop_id, student_key)
);

create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('lecture', 'workshop')),
  participant_id uuid unique references participants(id),
  workshop_student_id uuid unique references workshop_students(id),
  issued_at timestamptz not null default now(),
  storage_path text unique,
  check ((kind = 'lecture' and participant_id is not null and workshop_student_id is null)
      or (kind = 'workshop' and workshop_student_id is not null and participant_id is null))
);

create table if not exists recovery_attempts (
  id bigint generated always as identity primary key,
  lecture_id uuid not null references lectures(id),
  key_hash text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists recovery_attempts_window on recovery_attempts(lecture_id,key_hash,attempted_at desc);

alter table lectures enable row level security;
alter table workshops enable row level security;
alter table participants enable row level security;
alter table workshop_students enable row level security;
alter table certificates enable row level security;
alter table recovery_attempts enable row level security;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('certificates','certificates',false,10485760,array['application/pdf'])
on conflict (id) do nothing;

create or replace function register_lecture(p_lecture_id uuid, p_name text, p_name_key text,
  p_phone text, p_phone_hash text, p_email text)
returns table(certificate_id uuid, participant_id uuid, created boolean)
language plpgsql security definer set search_path = public as $$
declare v_participant participants%rowtype; v_certificate certificates%rowtype; v_open boolean; v_new boolean := false;
begin
  select registration_open into v_open from lectures where id=p_lecture_id for share;
  if not found then raise exception 'Palestra não encontrada'; end if;
  select * into v_participant from participants where lecture_id=p_lecture_id and phone_hash=p_phone_hash;
  if found then
    if v_participant.name_key <> p_name_key then raise exception 'Dados divergentes para este celular'; end if;
  else
    if not v_open then raise exception 'Inscrições encerradas'; end if;
    insert into participants(lecture_id,full_name,name_key,phone_e164,phone_hash,email)
    values(p_lecture_id,p_name,p_name_key,p_phone,p_phone_hash,p_email)
    on conflict (lecture_id,phone_hash) do nothing returning * into v_participant;
    if found then v_new := true;
    else
      select * into v_participant from participants where lecture_id=p_lecture_id and phone_hash=p_phone_hash;
      if v_participant.name_key <> p_name_key then raise exception 'Dados divergentes para este celular'; end if;
    end if;
  end if;
  insert into certificates(kind,participant_id) values('lecture',v_participant.id)
  on conflict (participant_id) do nothing;
  select * into v_certificate from certificates where certificates.participant_id=v_participant.id;
  return query select v_certificate.id,v_participant.id,v_new;
end $$;

create or replace function check_recovery_limit(p_lecture_id uuid,p_key_hash text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_lecture_id::text || p_key_hash,0));
  select count(*) into v_count from recovery_attempts
  where lecture_id=p_lecture_id and key_hash=p_key_hash and attempted_at > now()-interval '15 minutes';
  if v_count >= 5 then return false; end if;
  insert into recovery_attempts(lecture_id,key_hash) values(p_lecture_id,p_key_hash);
  return true;
end $$;

revoke all on all tables in schema public from anon, authenticated;
revoke execute on function register_lecture(uuid,text,text,text,text,text) from public, anon, authenticated;
revoke execute on function check_recovery_limit(uuid,text) from public, anon, authenticated;

create or replace function import_workshops(p_courses jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare course jsonb; student jsonb; w workshops%rowtype; s workshop_students%rowtype; n_courses integer := 0; n_students integer := 0;
begin
  for course in select * from jsonb_array_elements(p_courses) loop
    insert into workshops(title,teacher,event_date,workload,details,import_key)
    values(course->>'title',course->>'teacher',(course->>'event_date')::date,
      nullif(course->>'workload',''),nullif(course->>'details',''),course->>'key')
    on conflict (import_key) do nothing returning * into w;
    if not found then
      select * into w from workshops where import_key=course->>'key';
      if w.title<>course->>'title' or w.teacher<>course->>'teacher' or w.event_date<>(course->>'event_date')::date
        or coalesce(w.workload,'')<>coalesce(course->>'workload','') or coalesce(w.details,'')<>coalesce(course->>'details','')
      then raise exception 'Dados do minicurso alterados: %',w.title; end if;
    else n_courses := n_courses+1; end if;
    for student in select * from jsonb_array_elements(course->'students') loop
      insert into workshop_students(workshop_id,full_name,name_key,student_key)
      values(w.id,student->>'name',student->>'key',student->>'key')
      on conflict (workshop_id,student_key) do nothing returning * into s;
      if found then n_students := n_students+1;
      else
        select * into s from workshop_students where workshop_id=w.id and student_key=student->>'key';
        if s.full_name<>student->>'name' then raise exception 'Nome divergente: %',student->>'name'; end if;
      end if;
      insert into certificates(kind,workshop_student_id) values('workshop',s.id)
      on conflict (workshop_student_id) do nothing;
    end loop;
  end loop;
  return jsonb_build_object('courses_created',n_courses,'students_created',n_students);
end $$;
revoke execute on function import_workshops(jsonb) from public, anon, authenticated;
grant execute on function register_lecture(uuid,text,text,text,text,text) to service_role;
grant execute on function check_recovery_limit(uuid,text) to service_role;
grant execute on function import_workshops(jsonb) to service_role;
