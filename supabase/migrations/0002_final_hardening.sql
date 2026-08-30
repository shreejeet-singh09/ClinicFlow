-- CarePair final hardening: immutable public identifiers, privacy-safe patient access,
-- auditable queue transitions, atomic billing, and clinic-level analytics.
alter table public.clinics add column if not exists slug text;
alter table public.clinics add column if not exists doctor_name text;
alter table public.clinics add column if not exists city text;
alter table public.clinics add column if not exists opening_hours jsonb not null default '{}'::jsonb;
update public.clinics set slug = coalesce(nullif(slug, ''), lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 8)) where slug is null or slug = '';
alter table public.clinics alter column slug set not null;
create unique index if not exists clinics_slug_key on public.clinics(slug);
alter table public.patients add column if not exists area text;
alter table public.visits add column if not exists patient_access_token uuid not null default gen_random_uuid();
create unique index if not exists visits_patient_access_token_key on public.visits(patient_access_token);
alter table public.visits add column if not exists skipped_at timestamptz;
alter table public.visits add column if not exists cancelled_at timestamptz;
alter table public.visits add column if not exists no_show_at timestamptz;
create or replace function public.join_clinic_queue(qr_code text, patient_name text, patient_age integer, patient_phone text, patient_area text default null) returns public.visits language plpgsql security definer set search_path = public as $$ declare c public.clinics; p public.patients; v public.visits; next_token integer; begin select * into c from public.clinics where qr_identifier = qr_code and status = 'active'; if c.id is null then raise exception 'Clinic is not active or QR is invalid'; end if; if length(trim(patient_name)) < 1 or patient_age < 0 or patient_age > 130 then raise exception 'Invalid patient details'; end if; insert into public.patients(clinic_id,name,age,phone,area) values(c.id,trim(patient_name),patient_age,trim(patient_phone),nullif(trim(patient_area),'')) returning * into p; select coalesce(max(token_number),0)+1 into next_token from public.visits where clinic_id=c.id and visit_date=current_date; insert into public.visits(clinic_id,patient_id,doctor_id,token_number) values(c.id,p.id,c.owner_user_id,next_token) returning * into v; insert into public.audit_events(clinic_id,visit_id,event_type,metadata) values(c.id,v.id,'PATIENT_JOINED',jsonb_build_object('area',p.area)); return v; end; $$;
revoke all on function public.join_clinic_queue(text,text,integer,text,text) from public;
grant execute on function public.join_clinic_queue(text,text,integer,text,text) to anon, authenticated;
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id),
  visit_id uuid references public.visits(id),
  actor_user_id uuid references auth.users(id),
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_clinic_created on public.audit_events(clinic_id, created_at desc);

create or replace function public.public_queue_snapshot(access_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.visits; c public.clinics; current_token integer; ahead integer; avg_duration numeric;
begin
  select * into v from public.visits where patient_access_token = access_token;
  if v.id is null then raise exception 'Queue ticket not found'; end if;
  select * into c from public.clinics where id = v.clinic_id;
  select coalesce(max(token_number) filter (where status in ('consulting','called')), 0) into current_token from public.visits where clinic_id = v.clinic_id and visit_date = v.visit_date;
  select count(*) into ahead from public.visits where clinic_id = v.clinic_id and visit_date = v.visit_date and token_number < v.token_number and status in ('waiting','called','consulting');
  select coalesce(avg(consultation_duration) filter (where status = 'completed'), 600) into avg_duration from public.visits where clinic_id = v.clinic_id and visit_date >= current_date - 14;
  return jsonb_build_object('visit_id', v.id, 'clinic_id', v.clinic_id, 'clinic_name', c.name, 'doctor_name', c.doctor_name, 'slug', c.slug, 'token_number', v.token_number, 'status', upper(v.status::text), 'current_token', current_token, 'patients_ahead', greatest(ahead, 0), 'estimated_wait_minutes', round((greatest(ahead, 0) * avg_duration) / 60), 'queue_paused', exists(select 1 from public.queue_status q where q.clinic_id = v.clinic_id and q.is_paused));
end; $$;
revoke all on function public.public_queue_snapshot(uuid) from public;
grant execute on function public.public_queue_snapshot(uuid) to anon, authenticated;

create or replace function public.transition_visit(target_visit uuid, next_status public.visit_status)
returns public.visits language plpgsql security definer set search_path = public as $$
declare v public.visits; actor uuid := auth.uid(); price numeric; cap numeric; month_usage numeric; charge numeric := 0;
begin
  select * into v from public.visits where id = target_visit for update;
  if v.id is null then raise exception 'Visit not found'; end if;
  if not exists(select 1 from public.profiles p where p.id = actor and p.clinic_id = v.clinic_id and p.role in ('clinic_owner','receptionist')) then raise exception 'Forbidden'; end if;
  if (v.status, next_status) not in (('waiting','called'),('waiting','cancelled'),('waiting','no_show'),('called','consulting'),('called','skipped'),('skipped','called'),('consulting','completed')) then raise exception 'Invalid queue transition'; end if;
  if next_status = 'completed' then
    update public.visits set status = next_status, consultation_finished_at = now(), consultation_duration = greatest(0, extract(epoch from (now() - consultation_started_at))::integer), updated_at = now() where id = v.id;
    select price_per_completed, monthly_cap into price, cap from public.platform_settings where id = true;
    select coalesce(sum(amount),0) into month_usage from public.billing_usage where clinic_id = v.clinic_id and date_trunc('month', usage_date) = date_trunc('month', current_date);
    charge := least(price, greatest(cap - month_usage, 0));
    insert into public.billing_usage(visit_id, clinic_id, amount) values(v.id, v.clinic_id, charge) on conflict (visit_id) do nothing;
  elsif next_status = 'called' then update public.visits set status = next_status, called_at = coalesce(called_at, now()), updated_at = now() where id = v.id;
  elsif next_status = 'consulting' then update public.visits set status = next_status, consultation_started_at = coalesce(consultation_started_at, now()), updated_at = now() where id = v.id;
  else update public.visits set status = next_status, skipped_at = case when next_status='skipped' then now() else skipped_at end, cancelled_at = case when next_status='cancelled' then now() else cancelled_at end, no_show_at = case when next_status='no_show' then now() else no_show_at end, updated_at = now() where id = v.id;
  end if;
  insert into public.audit_events(clinic_id, visit_id, actor_user_id, event_type) values(v.clinic_id, v.id, actor, upper(next_status::text));
  select * into v from public.visits where id = target_visit;
  return v;
end; $$;
revoke all on function public.transition_visit(uuid, public.visit_status) from public;
grant execute on function public.transition_visit(uuid, public.visit_status) to authenticated;

alter table public.audit_events enable row level security;
create policy audit_member_read on public.audit_events for select using (exists(select 1 from public.profiles p where p.id = auth.uid() and (p.clinic_id = clinic_id or p.role = 'platform_admin')));
create policy clinics_owner_update on public.clinics for update using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.clinic_id = id and p.role = 'clinic_owner')) with check (exists(select 1 from public.profiles p where p.id = auth.uid() and p.clinic_id = id and p.role = 'clinic_owner'));
alter publication supabase_realtime add table public.audit_events;