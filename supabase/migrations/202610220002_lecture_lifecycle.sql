alter table lectures add column if not exists deleted_at timestamptz;

create or replace function register_lecture(p_lecture_id uuid, p_name text, p_name_key text,
  p_phone text, p_phone_hash text, p_email text)
returns table(certificate_id uuid, participant_id uuid, created boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_lecture lectures%rowtype;
  v_participant participants%rowtype;
  v_certificate certificates%rowtype;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_new boolean := false;
begin
  select * into v_lecture from lectures where id = p_lecture_id for share;
  if not found or v_lecture.deleted_at is not null then
    raise exception 'Palestra não encontrada';
  end if;
  if v_today < v_lecture.event_date then
    raise exception 'A palestra ainda não ocorreu';
  end if;
  if length(trim(p_name)) < 3 or length(p_name) > 180 or p_name_key = ''
    or length(p_phone) < 10 or p_phone_hash = '' then
    raise exception 'Dados inválidos';
  end if;
  select * into v_participant from participants
    where lecture_id = p_lecture_id and phone_hash = p_phone_hash;
  if found then
    if v_participant.name_key <> p_name_key then
      raise exception 'Dados divergentes para este celular';
    end if;
  else
    if v_today <> v_lecture.event_date then
      raise exception 'Cadastro permitido apenas na data da palestra';
    end if;
    insert into participants(lecture_id,full_name,name_key,phone_e164,phone_hash,email)
    values(p_lecture_id,p_name,p_name_key,p_phone,p_phone_hash,p_email)
    on conflict (lecture_id,phone_hash) do nothing returning * into v_participant;
    if found then v_new := true;
    else
      select * into v_participant from participants
        where lecture_id = p_lecture_id and phone_hash = p_phone_hash;
      if v_participant.name_key <> p_name_key then
        raise exception 'Dados divergentes para este celular';
      end if;
    end if;
  end if;
  if v_today = v_lecture.event_date then
    insert into certificates(kind,participant_id) values('lecture',v_participant.id)
    on conflict (participant_id) do nothing;
  end if;
  select * into v_certificate from certificates where certificates.participant_id = v_participant.id;
  if not found then raise exception 'Certificado não encontrado'; end if;
  return query select v_certificate.id,v_participant.id,v_new;
end $$;

revoke execute on function register_lecture(uuid,text,text,text,text,text) from public, anon, authenticated;
grant execute on function register_lecture(uuid,text,text,text,text,text) to service_role;

alter table lectures drop column if exists registration_open;
