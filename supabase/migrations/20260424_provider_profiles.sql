-- Phase 17: provider profiles. Each tenant has at most one row in
-- provider_profiles describing the doctor — name, credentials, bio. Visible
-- to the doctor's patients (via the patient dashboard's provider banner).
--
-- Distinct from `patient_profiles`. The two were never meant to share a
-- table — patient_profiles holds PHI/PII (DOB, address); provider_profiles
-- holds non-PHI marketing-style information.

create table provider_profiles (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 120),
  credentials text check (credentials is null or length(credentials) <= 80),
  specialty text check (specialty is null or length(specialty) <= 80),
  bio text check (bio is null or length(bio) <= 4000),
  -- Avatar uploads land in Supabase Storage; we only store the public URL.
  avatar_url text check (avatar_url is null or length(avatar_url) <= 1024),
  updated_at timestamptz not null default now()
);

alter table provider_profiles enable row level security;

create policy "Tenant members read provider profile"
  on provider_profiles for select
  using (tenant_id in (select public.current_user_tenants()));

create policy "Doctor manages own provider profile"
  on provider_profiles for insert
  with check (public.is_tenant_doctor(tenant_id));

create policy "Doctor updates own provider profile"
  on provider_profiles for update
  using (public.is_tenant_doctor(tenant_id))
  with check (public.is_tenant_doctor(tenant_id));

revoke delete on provider_profiles from authenticated, anon;
grant select, insert, update on provider_profiles to authenticated;
