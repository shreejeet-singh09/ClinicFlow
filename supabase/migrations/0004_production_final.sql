-- ClinicFlow 0004 — Production final: staff invitations, billing, notifications, email templates.
-- Idempotent (uses IF NOT EXISTS + DO blocks) so it can safely run against the live project.

-- ================================================================
-- 1) Staff invitations
-- ================================================================
create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  email text not null,
  role public.app_role not null,
  token uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid references auth.users(id),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists staff_invitations_token_key on public.staff_invitations(token);
create index if not exists staff_invitations_clinic_email on public.staff_invitations(clinic_id, email);
alter table public.staff_invitations enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='staff_invitations' and policyname='invitations_owner_all') then
    create policy invitations_owner_all on public.staff_invitations for all using (
      exists(select 1 from public.profiles p where p.id=auth.uid() and p.clinic_id=staff_invitations.clinic_id and p.role='clinic_owner')
      or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='platform_admin')
    ) with check (
      exists(select 1 from public.profiles p where p.id=auth.uid() and p.clinic_id=staff_invitations.clinic_id and p.role='clinic_owner')
      or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='platform_admin')
    );
  end if;
end $$;

-- RPC used by invitee (authenticated) to accept: matches by token + email, links profile to clinic.
create or replace function public.accept_staff_invitation(invite_token uuid)
returns public.staff_invitations
language plpgsql security definer set search_path = public as $$
declare
  inv public.staff_invitations;
  actor_email text;
  actor_name text;
begin
  select * into inv from public.staff_invitations where token = invite_token for update;
  if inv.id is null then raise exception 'Invitation not found'; end if;
  if inv.status <> 'pending' then raise exception 'Invitation is % ', inv.status; end if;
  if inv.expires_at < now() then
    update public.staff_invitations set status='expired' where id=inv.id;
    raise exception 'Invitation expired';
  end if;
  select email, coalesce(raw_user_meta_data->>'name', email) into actor_email, actor_name
    from auth.users where id = auth.uid();
  if actor_email is null then raise exception 'Sign in required'; end if;
  if lower(actor_email) <> lower(inv.email) then raise exception 'Signed-in email does not match invited email'; end if;
  insert into public.profiles(id, email, name, role, clinic_id)
    values(auth.uid(), actor_email, actor_name, inv.role, inv.clinic_id)
    on conflict (id) do update set clinic_id = excluded.clinic_id, role = excluded.role;
  update public.staff_invitations set status='accepted', accepted_at=now() where id=inv.id;
  insert into public.audit_events(clinic_id, actor_user_id, event_type, metadata)
    values(inv.clinic_id, auth.uid(), 'STAFF_JOINED', jsonb_build_object('email', actor_email, 'role', inv.role));
  select * into inv from public.staff_invitations where id=inv.id;
  return inv;
end; $$;
revoke all on function public.accept_staff_invitation(uuid) from public;
grant execute on function public.accept_staff_invitation(uuid) to authenticated;

-- Public read RPC (anon) to preview invitation before signing up
create or replace function public.preview_staff_invitation(invite_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare inv public.staff_invitations; c public.clinics;
begin
  select * into inv from public.staff_invitations where token=invite_token;
  if inv.id is null then raise exception 'Invitation not found'; end if;
  select * into c from public.clinics where id=inv.clinic_id;
  return jsonb_build_object(
    'email', inv.email, 'role', inv.role, 'status', inv.status,
    'expires_at', inv.expires_at, 'clinic_name', c.name, 'clinic_slug', c.slug
  );
end; $$;
revoke all on function public.preview_staff_invitation(uuid) from public;
grant execute on function public.preview_staff_invitation(uuid) to anon, authenticated;

-- ================================================================
-- 2) Plans, subscriptions, invoices, payments, webhook events
-- ================================================================
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  price_inr numeric(10,2) not null default 0,
  monthly_visits_limit integer,   -- null = unlimited
  doctors_limit integer,
  receptionists_limit integer,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.plans enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='plans' and policyname='plans_public_read') then
    create policy plans_public_read on public.plans for select to anon, authenticated using (is_active = true);
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='plans' and policyname='plans_admin_write') then
    create policy plans_admin_write on public.plans for all using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='platform_admin')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='platform_admin'));
  end if;
end $$;

-- Seed default plans (idempotent)
insert into public.plans(code, name, price_inr, monthly_visits_limit, doctors_limit, receptionists_limit, features) values
  ('trial', 'Trial', 0, 200, 1, 1, jsonb_build_object('analytics', true, 'export', true, 'audit', true)),
  ('basic', 'Basic', 999, 1000, 1, 2, jsonb_build_object('analytics', true, 'export', true, 'audit', true)),
  ('professional', 'Professional', 2499, 5000, 3, 5, jsonb_build_object('analytics', true, 'export', true, 'audit', true, 'multi_doctor', true)),
  ('enterprise', 'Enterprise', 9999, null, null, null, jsonb_build_object('analytics', true, 'export', true, 'audit', true, 'multi_doctor', true, 'sso', true, 'priority_support', true))
on conflict (code) do nothing;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid unique not null references public.clinics(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'trialing' check (status in ('trialing','active','past_due','canceled','incomplete')),
  trial_ends_at timestamptz,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  cancel_at_period_end boolean not null default false,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='sub_member_read') then
    create policy sub_member_read on public.subscriptions for select using (public.is_clinic_member(clinic_id) or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='platform_admin'));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='sub_admin_write') then
    create policy sub_admin_write on public.subscriptions for all using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='platform_admin')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='platform_admin'));
  end if;
end $$;

-- Auto-create trial subscription for every existing active clinic
insert into public.subscriptions(clinic_id, plan_id, status, trial_ends_at)
select c.id, (select id from public.plans where code='trial'), 'trialing', now() + interval '14 days'
from public.clinics c
where c.status = 'active' and not exists(select 1 from public.subscriptions s where s.clinic_id=c.id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  invoice_number text unique not null default ('INV-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  amount_inr numeric(10,2) not null,
  status text not null default 'draft' check (status in ('draft','open','paid','void','uncollectible')),
  period_start date,
  period_end date,
  provider_invoice_id text,
  hosted_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists invoices_clinic on public.invoices(clinic_id, created_at desc);
alter table public.invoices enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='invoices' and policyname='inv_member_read') then
    create policy inv_member_read on public.invoices for select using (public.is_clinic_member(clinic_id) or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='platform_admin'));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='invoices' and policyname='inv_admin_write') then
    create policy inv_admin_write on public.invoices for all using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='platform_admin')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='platform_admin'));
  end if;
end $$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete set null,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  amount_inr numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','succeeded','failed','refunded')),
  provider text,
  provider_payment_id text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists payments_clinic on public.payments(clinic_id, created_at desc);
alter table public.payments enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='payments' and policyname='pay_member_read') then
    create policy pay_member_read on public.payments for select using (public.is_clinic_member(clinic_id) or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='platform_admin'));
  end if;
end $$;

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, event_id)
);
alter table public.payment_webhook_events enable row level security;
-- Only service role writes; admins read
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='payment_webhook_events' and policyname='pwe_admin_read') then
    create policy pwe_admin_read on public.payment_webhook_events for select using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='platform_admin'));
  end if;
end $$;

-- ================================================================
-- 3) In-app notifications
-- ================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete cascade,
  type text not null,           -- e.g. QUEUE_CALLED, STAFF_INVITED, INVOICE_ISSUED, CLINIC_APPROVED
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notif_user_created on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='notif_self_read') then
    create policy notif_self_read on public.notifications for select using (user_id = auth.uid());
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='notif_self_update') then
    create policy notif_self_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;
alter publication supabase_realtime add table public.notifications;

-- ================================================================
-- 4) Email templates (metadata only; provider integration deferred)
-- ================================================================
create table if not exists public.email_templates (
  key text primary key,
  subject text not null,
  body_html text not null,
  body_text text not null,
  updated_at timestamptz not null default now()
);
alter table public.email_templates enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='email_templates' and policyname='tmpl_admin_all') then
    create policy tmpl_admin_all on public.email_templates for all using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='platform_admin')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='platform_admin'));
  end if;
end $$;
insert into public.email_templates(key, subject, body_html, body_text) values
  ('email_verification', 'Confirm your ClinicFlow email', '<p>Please confirm your email to activate your ClinicFlow account.</p>', 'Please confirm your email to activate your ClinicFlow account.'),
  ('password_reset', 'Reset your ClinicFlow password', '<p>Click the link to reset your ClinicFlow password.</p>', 'Click the link to reset your ClinicFlow password.'),
  ('staff_invitation', 'You have been invited to ClinicFlow', '<p>Your clinic has invited you to join ClinicFlow. Open the invitation link to accept.</p>', 'Your clinic has invited you to join ClinicFlow. Open the invitation link to accept.'),
  ('clinic_approved', 'Your clinic is approved', '<p>Your ClinicFlow clinic is now active. Sign in to start managing your queue.</p>', 'Your ClinicFlow clinic is now active. Sign in to start managing your queue.'),
  ('clinic_suspended', 'Your clinic has been suspended', '<p>Your ClinicFlow clinic has been suspended. Contact support.</p>', 'Your ClinicFlow clinic has been suspended. Contact support.'),
  ('invoice_issued', 'A new ClinicFlow invoice is available', '<p>A new invoice is available in your billing area.</p>', 'A new invoice is available in your billing area.')
on conflict (key) do nothing;

-- ================================================================
-- 5) Notifications helper RPC (server side inserts via trigger for common events)
-- ================================================================
create or replace function public.notify_user(target_user uuid, notif_type text, notif_title text, notif_body text, notif_data jsonb default '{}'::jsonb, notif_clinic uuid default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id, clinic_id, type, title, body, data) values(target_user, notif_clinic, notif_type, notif_title, notif_body, notif_data);
end; $$;
grant execute on function public.notify_user(uuid,text,text,text,jsonb,uuid) to service_role;

-- Trigger: notify clinic owner when clinic status changes
create or replace function public.on_clinic_status_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status <> old.status and new.owner_user_id is not null then
    if new.status = 'active' then
      perform public.notify_user(new.owner_user_id, 'CLINIC_APPROVED', 'Your clinic is approved', 'You can now sign in and manage your queue.', jsonb_build_object('clinic_id', new.id), new.id);
    elsif new.status = 'suspended' then
      perform public.notify_user(new.owner_user_id, 'CLINIC_SUSPENDED', 'Your clinic was suspended', 'Please contact ClinicFlow support.', jsonb_build_object('clinic_id', new.id), new.id);
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_clinic_status on public.clinics;
create trigger trg_clinic_status after update on public.clinics for each row when (new.status is distinct from old.status) execute function public.on_clinic_status_change();

-- Trigger: notify patient's associated visit owner when a visit becomes CALLED (audit-only for now; patient PWA polls public snapshot)
-- (No trigger to auth users because patients aren't Supabase users.)

-- ================================================================
-- 6) Helpful indexes for queue + audit performance
-- ================================================================
create index if not exists visits_clinic_date_status on public.visits(clinic_id, visit_date, status);
create index if not exists audit_events_visit on public.audit_events(visit_id);
create index if not exists billing_usage_clinic_date on public.billing_usage(clinic_id, usage_date);
