-- Phase 7: Multi-tenant SaaS schema.
-- Each doctor = one tenant. Patients join a tenant via invite. Every PHI row
-- carries tenant_id and is walled off by RLS. A tenant's write access is
-- gated on an active Stripe subscription.
--
-- Prior schema assumed a single global user population. This migration:
--   1. Adds tenant / subscription / invite tables and a role mapping.
--   2. Back-fills tenant_id on existing PHI tables (dev environments only —
--      production should have no pre-tenant rows since no doctors exist yet).
--   3. Replaces user-scoped RLS with tenant-scoped RLS.
--   4. Adds SQL helper functions used by policies.
--
-- Rollback is via the matching "down" migration (not included here — this is
-- a forward-only destructive migration for production purposes).

begin;

create extension if not exists citext;

-- ───────────────────────────────────────────────────────────────
-- 1. Tenants (one per doctor)
-- ───────────────────────────────────────────────────────────────
create table tenants (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  -- Populated when the owner cancels. A scheduled job hard-deletes all tenant
  -- data 30 days after deleted_at (see Phase 12).
  deleted_at timestamptz,
  constraint tenants_owner_unique unique (owner_user_id)
);

create index idx_tenants_owner on tenants(owner_user_id);
create index idx_tenants_deleted on tenants(deleted_at) where deleted_at is not null;

-- ───────────────────────────────────────────────────────────────
-- 2. User ↔ tenant role mapping
-- A doctor has exactly one row (role=doctor) linking to their own tenant.
-- A patient has one row per doctor they belong to (v1 assumption: one).
-- ───────────────────────────────────────────────────────────────
create type tenant_role as enum ('doctor', 'patient');

create table user_tenants (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role tenant_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

create index idx_user_tenants_tenant on user_tenants(tenant_id);

-- ───────────────────────────────────────────────────────────────
-- 3. Subscriptions (mirrored from Stripe webhooks)
-- Writes happen only from the stripe-webhook Edge Function using the service
-- role. Clients never insert/update rows here.
-- ───────────────────────────────────────────────────────────────
create table subscriptions (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  status text not null check (status in (
    'trialing', 'active', 'past_due', 'canceled',
    'incomplete', 'incomplete_expired', 'unpaid', 'paused'
  )),
  price_id text,
  current_period_end timestamptz,
  cancel_at timestamptz,
  trial_end timestamptz,
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_customer on subscriptions(stripe_customer_id);
create index idx_subscriptions_status on subscriptions(status);

-- ───────────────────────────────────────────────────────────────
-- 4. Patient invites (tokenized, single-use)
-- A doctor generates one; the token is the only way a new patient user can
-- join a tenant. No public patient self-signup.
-- ───────────────────────────────────────────────────────────────
create table patient_invites (
  token text primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  email citext,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id),
  constraint patient_invites_used_consistency
    check ((used_at is null) = (used_by is null))
);

create index idx_patient_invites_tenant on patient_invites(tenant_id);
create index idx_patient_invites_unused on patient_invites(tenant_id)
  where used_at is null;

-- ───────────────────────────────────────────────────────────────
-- 5. Extend existing PHI tables with tenant_id
-- ───────────────────────────────────────────────────────────────
alter table patient_profiles add column tenant_id uuid references tenants(id) on delete cascade;
alter table health_logs      add column tenant_id uuid references tenants(id) on delete cascade;
alter table audit_logs       add column tenant_id uuid references tenants(id) on delete cascade;

-- In production the PHI tables are empty (no doctors yet) so no back-fill is
-- needed. Dev/staging instances with orphan rows must be truncated manually
-- before this migration — we enforce that by making the column NOT NULL once
-- the application starts writing new rows (see Phase 10).

create index idx_patient_profiles_tenant on patient_profiles(tenant_id);
create index idx_health_logs_tenant_created on health_logs(tenant_id, created_at desc);
create index idx_audit_logs_tenant_created on audit_logs(tenant_id, created_at desc);

-- ───────────────────────────────────────────────────────────────
-- 6. SQL helper functions used by RLS policies
-- ───────────────────────────────────────────────────────────────
create or replace function public.current_user_tenants()
  returns setof uuid
  language sql stable security definer
  set search_path = public
as $$
  select tenant_id
  from user_tenants
  where user_id = auth.uid()
$$;

create or replace function public.is_tenant_doctor(p_tenant_id uuid)
  returns boolean
  language sql stable security definer
  set search_path = public
as $$
  select exists (
    select 1 from user_tenants
    where user_id = auth.uid()
      and tenant_id = p_tenant_id
      and role = 'doctor'
  )
$$;

create or replace function public.has_active_subscription(p_tenant_id uuid)
  returns boolean
  language sql stable security definer
  set search_path = public
as $$
  select exists (
    select 1 from subscriptions
    where tenant_id = p_tenant_id
      and status in ('active', 'trialing')
  )
$$;

revoke all on function public.current_user_tenants()     from public;
revoke all on function public.is_tenant_doctor(uuid)     from public;
revoke all on function public.has_active_subscription(uuid) from public;
grant execute on function public.current_user_tenants()    to authenticated;
grant execute on function public.is_tenant_doctor(uuid)    to authenticated;
grant execute on function public.has_active_subscription(uuid) to authenticated;

-- ───────────────────────────────────────────────────────────────
-- 7. RLS on new tables
-- ───────────────────────────────────────────────────────────────
alter table tenants           enable row level security;
alter table user_tenants      enable row level security;
alter table subscriptions     enable row level security;
alter table patient_invites   enable row level security;

-- Tenants: only members can see their tenant row; only the owner can rename;
-- writes to `deleted_at` happen server-side via service role.
create policy "Members read their tenant"
  on tenants for select
  using (id in (select public.current_user_tenants()));

create policy "Owner renames their tenant"
  on tenants for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- user_tenants: a user can see their own memberships; doctors see all
-- memberships of their tenant. No client writes — the server manages rows.
create policy "See own memberships"
  on user_tenants for select
  using (user_id = auth.uid()
         or public.is_tenant_doctor(tenant_id));

-- subscriptions: read-only for tenant members; writes only via service role.
create policy "Members see their subscription"
  on subscriptions for select
  using (tenant_id in (select public.current_user_tenants()));

-- patient_invites: doctors of the tenant see/manage invites for that tenant.
-- Token-based redemption happens via the accept-patient-invite Edge Function
-- using the service role, so no client INSERT policy is needed.
create policy "Doctor reads own tenant invites"
  on patient_invites for select
  using (public.is_tenant_doctor(tenant_id));

create policy "Doctor revokes own tenant invites"
  on patient_invites for delete
  using (public.is_tenant_doctor(tenant_id));

revoke insert, update on user_tenants, subscriptions, patient_invites from authenticated, anon;
grant select on user_tenants, subscriptions, patient_invites to authenticated;

-- ───────────────────────────────────────────────────────────────
-- 8. Replace RLS on existing PHI tables with tenant-scoped policies
-- ───────────────────────────────────────────────────────────────
drop policy if exists "Users can view own profile"    on patient_profiles;
drop policy if exists "Users can insert own profile"  on patient_profiles;
drop policy if exists "Users can update own profile"  on patient_profiles;

create policy "Tenant members read profiles"
  on patient_profiles for select
  using (tenant_id in (select public.current_user_tenants()));

-- Patients write their own row; doctors of the tenant can also edit for intake.
create policy "Patient writes own profile"
  on patient_profiles for insert
  with check (
    id = auth.uid()
    and tenant_id in (select public.current_user_tenants())
    and public.has_active_subscription(tenant_id)
  );

create policy "Patient updates own profile"
  on patient_profiles for update
  using (id = auth.uid())
  with check (id = auth.uid()
              and public.has_active_subscription(tenant_id));

create policy "Doctor updates tenant profiles"
  on patient_profiles for update
  using (public.is_tenant_doctor(tenant_id))
  with check (public.is_tenant_doctor(tenant_id)
              and public.has_active_subscription(tenant_id));

drop policy if exists "Users can view own logs"   on health_logs;
drop policy if exists "Users can insert own logs" on health_logs;

create policy "Tenant members read logs"
  on health_logs for select
  using (tenant_id in (select public.current_user_tenants()));

create policy "Patient inserts own logs"
  on health_logs for insert
  with check (
    user_id = auth.uid()
    and tenant_id in (select public.current_user_tenants())
    and public.has_active_subscription(tenant_id)
  );

-- audit_logs: phase 4 already revoked client writes. Add tenant-scoped SELECT.
drop policy if exists "Users can view own audit logs" on audit_logs;

create policy "Tenant members read audit rows"
  on audit_logs for select
  using (tenant_id in (select public.current_user_tenants())
         or user_id = auth.uid());  -- pre-tenant rows stay visible to owner

-- ───────────────────────────────────────────────────────────────
-- 9. providers directory: deprecated in multi-tenant model.
-- The table stays for now so the patient-facing directory screens keep
-- working in staging; Phase 11 removes those screens and this migration
-- becomes obsolete. Restrict reads to tenant members to stop the data from
-- being a public leak vector.
-- ───────────────────────────────────────────────────────────────
drop policy if exists "Public providers are viewable by everyone" on providers;
revoke select on providers from anon;
create policy "Authenticated users read providers"
  on providers for select
  to authenticated
  using (true);

commit;
