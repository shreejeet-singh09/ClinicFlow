-- ClinicFlow 0005 — RLS fixes for clinic writes + self-registration RPC.
-- Root cause of "Account not linked to a clinic":
--   * There was no INSERT policy on public.clinics, so the "Register your clinic" flow
--     silently created an auth user but could never create the clinic row, and the
--     dependent profile insert therefore never ran. New self-registered users landed
--     on the "not linked" screen forever.
--   * The pre-existing owner UPDATE policy used `profiles.clinic_id = p.id` (a self-join
--     bug) instead of matching the clinics row's id, so owners could NEVER save their
--     own clinic settings.
--   * There was no UPDATE/DELETE policy for platform_admin, so admin approve/suspend/
--     reactivate/delete actions silently no-op'd.
-- Also adds a security-definer RPC register_clinic() so new signups atomically create
-- clinic + profile in one authenticated call (no partial state possible).

-- Drop the broken owner-update policy if present
drop policy if exists clinics_owner_update on public.clinics;

-- Correct owner UPDATE policy (owner may edit their own clinic)
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='clinics' and policyname='clinics_owner_update_v2') then
    create policy clinics_owner_update_v2 on public.clinics for update
      using (
        exists(select 1 from public.profiles p
               where p.id = auth.uid()
                 and p.clinic_id = clinics.id
                 and p.role = 'clinic_owner')
      )
      with check (
        exists(select 1 from public.profiles p
               where p.id = auth.uid()
                 and p.clinic_id = clinics.id
                 and p.role = 'clinic_owner')
      );
  end if;
end $$;

-- Platform admin UPDATE (approve/suspend/reactivate)
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='clinics' and policyname='clinics_admin_update') then
    create policy clinics_admin_update on public.clinics for update
      using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin'))
      with check (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin'));
  end if;
end $$;

-- Platform admin DELETE
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='clinics' and policyname='clinics_admin_delete') then
    create policy clinics_admin_delete on public.clinics for delete
      using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'platform_admin'));
  end if;
end $$;

-- Signup INSERT: any authenticated user may create ONE clinic where they are the owner.
-- Status is forced to pending_approval via check.
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='clinics' and policyname='clinics_self_register') then
    create policy clinics_self_register on public.clinics for insert to authenticated
      with check (owner_user_id = auth.uid() and status = 'pending_approval');
  end if;
end $$;

-- Atomic self-registration RPC: creates the clinic (pending_approval) + owner profile in one call.
-- Because it's security definer it bypasses RLS but validates that the caller's auth.uid() matches.
create or replace function public.register_clinic(
  clinic_name text,
  doctor_name text,
  clinic_address text,
  clinic_phone text,
  clinic_city text default null,
  consultation_fee numeric default 300
) returns public.clinics
language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  actor_email text;
  new_slug text;
  c public.clinics;
begin
  if actor is null then raise exception 'Sign in required'; end if;
  select email into actor_email from auth.users where id = actor;
  if actor_email is null then raise exception 'User not found'; end if;
  new_slug := lower(regexp_replace(coalesce(nullif(trim(clinic_name), ''), 'clinic'), '[^a-zA-Z0-9]+', '-', 'g'))
              || '-' || substr(gen_random_uuid()::text, 1, 6);
  new_slug := regexp_replace(new_slug, '^-+|-+$', '', 'g');

  insert into public.clinics(name, owner_user_id, address, phone, consultation_fee, status, slug, doctor_name, city)
    values(trim(clinic_name), actor, trim(clinic_address), trim(clinic_phone), coalesce(consultation_fee, 300), 'pending_approval', new_slug, trim(doctor_name), nullif(trim(clinic_city), ''))
    returning * into c;

  insert into public.profiles(id, email, name, role, clinic_id)
    values(actor, actor_email, coalesce(nullif(trim(doctor_name), ''), actor_email), 'clinic_owner', c.id)
    on conflict (id) do update set clinic_id = c.id, role = 'clinic_owner', name = excluded.name;

  insert into public.queue_status(clinic_id, is_paused) values(c.id, false) on conflict (clinic_id) do nothing;

  insert into public.subscriptions(clinic_id, plan_id, status, trial_ends_at)
    select c.id, (select id from public.plans where code='trial'), 'trialing', now() + interval '14 days'
    where exists(select 1 from public.plans where code='trial')
    on conflict (clinic_id) do nothing;

  insert into public.audit_events(clinic_id, actor_user_id, event_type, metadata)
    values(c.id, actor, 'CLINIC_REGISTERED', jsonb_build_object('email', actor_email));

  return c;
end; $$;
revoke all on function public.register_clinic(text,text,text,text,text,numeric) from public;
grant execute on function public.register_clinic(text,text,text,text,text,numeric) to authenticated;

-- Small self-heal RPC: any authenticated user without a profile can call this to create
-- their own profile row (with no clinic_id / role='clinic_owner' pending). This gives
-- previously-broken signups a way to recover automatically.
create or replace function public.ensure_self_profile() returns public.profiles
language plpgsql security definer set search_path = public as $$
declare p public.profiles; actor uuid := auth.uid(); actor_email text; actor_name text;
begin
  if actor is null then raise exception 'Sign in required'; end if;
  select email, coalesce(raw_user_meta_data->>'name', email) into actor_email, actor_name from auth.users where id=actor;
  select * into p from public.profiles where id = actor;
  if p.id is null then
    insert into public.profiles(id, email, name, role, clinic_id)
      values(actor, actor_email, actor_name, 'clinic_owner', null)
      returning * into p;
  end if;
  return p;
end; $$;
revoke all on function public.ensure_self_profile() from public;
grant execute on function public.ensure_self_profile() to authenticated;
