-- Create the providers table
create table providers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  specialty text not null,
  rating numeric,
  distance text,
  avail text,
  telehealth boolean,
  badge text,
  initials text,
  bio text,
  expertise text[]
);

-- Insert mock data
insert into providers (name, specialty, rating, distance, avail, telehealth, badge, initials, bio, expertise)
values
  (
    'Karen Taylor, MD',
    'Primary Care',
    4.8,
    '1 mi away',
    'Available today',
    true,
    'Telehealth only',
    'KT',
    'Dr. Karen Taylor is a board-certified internal medicine physician with over 15 years of experience. She is dedicated to providing patient-centered preventive health care and chronic disease management.',
    ARRAY['Primary Care', 'Preventive Medicine', 'Chronic Disease', 'Telehealth']
  ),
  (
    'Andrew Morales, LMFT',
    'Mental Health',
    4.7,
    'Over 10 years exp.',
    'Next available: Wed',
    false,
    'In-person & Virtual',
    'AM',
    'Andrew Morales is a licensed marriage and family therapist specializing in anxiety, depression, and relationship counseling with a trauma-informed approach.',
    ARRAY['Anxiety & Depression', 'Couples Therapy', 'Trauma Recovery', 'CBT']
  ),
  (
    'Ruby Patel, MD',
    'Dermatology',
    5.0,
    '5.6 mi',
    'Available today',
    true,
    'Accepting new patients',
    'RP',
    'Dr. Ruby Patel is a board-certified dermatologist specializing in medical and cosmetic dermatology with expertise in skin cancer screening.',
    ARRAY['Medical Dermatology', 'Skin Cancer Screening', 'Cosmetic Procedures', 'Telehealth']
  ),
  (
    'Thomas White, MD',
    'Primary Care',
    4.9,
    '2.3 mi',
    'Available today',
    true,
    'Highly rated',
    'TW',
    'Dr. Thomas White provides comprehensive primary care with a focus on holistic wellness and preventive health strategies.',
    ARRAY['Family Medicine', 'Wellness', 'Preventive Care', 'Geriatrics']
  );

-- 2. Patient Profiles (PII stored separately from auth metadata)
create table patient_profiles (
  id uuid references auth.users primary key,
  full_name text not null,
  dob date not null,
  address text not null,
  consented_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table patient_profiles enable row level security;
create policy "Users can view own profile" on patient_profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on patient_profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on patient_profiles for update using (auth.uid() = id);

-- 3. Health Logs (History & Jev Clinical Triage)
create table health_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  tenant_id uuid references tenants(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  symptom text,
  severity int, -- 1-10
  ai_advice text,
  -- Jev System 1 Clinical Governance & Audit Provenance:
  urgency text default 'routine' check (urgency in ('routine', 'urgent', 'emergency')),
  decision_class text default 'AUTONOMOUS_HOME_CARE',
  risk_band text default 'LOW' check (risk_band in ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
  red_flags text[] default '{}',
  arbiter_hash text
);

-- Enable RLS
alter table health_logs enable row level security;
create policy "Users can view own logs" on health_logs for select using (auth.uid() = user_id);
create policy "Users can insert own logs" on health_logs for insert with check (auth.uid() = user_id);

-- 4. Audit Logs (SOC 2 / HIPAA compliance) — append-only, server-written only.
-- Clients must NOT insert directly; the `log-audit` Edge Function writes via
-- the service role. This prevents users tainting their own audit trail.
create table audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  event_type text not null check (event_type in (
    'auth.sign_in',
    'auth.sign_up',
    'auth.sign_out',
    'auth.anon_sign_in',
    'auth.upgrade_anon',
    'profile.update',
    'health_log.create',
    'settings.change',
    'message.read',
    'message.send',
    'system.signup_trigger'
  )),
  detail text,
  ip text,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table audit_logs enable row level security;
create policy "Users can view own audit logs" on audit_logs for select using (auth.uid() = user_id);

-- Explicitly revoke write privileges from client-facing roles.
revoke insert, update, delete on audit_logs from authenticated, anon;
grant select on audit_logs to authenticated;

-- Defense-in-depth: log every auth.users insert even if the client never
-- reports a sign_up event.
create or replace function public.log_signup_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, event_type, detail)
  values (new.id, 'system.signup_trigger', 'auth.users row inserted');
  return new;
end;
$$;

create trigger on_auth_user_created_audit
  after insert on auth.users
  for each row execute function public.log_signup_audit();

-- Enable Row Level Security (optional, for read access)
alter table providers enable row level security;

-- Create a policy that allows anyone to read providers (public access)
create policy "Public providers are viewable by everyone"
  on providers for select
  using ( true );

-- ═══════════════════════════════════════════════════════════
-- 5. MULTI-TENANCY TABLES
-- ═══════════════════════════════════════════════════════════

-- Tenants: each provider practice is a tenant.
create table tenants (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table tenants enable row level security;
create policy "Members can view own tenant" on tenants for select
  using (id in (select tenant_id from user_tenants where user_id = auth.uid()));

-- User ↔ Tenant membership (role: 'doctor' | 'patient').
create table user_tenants (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  tenant_id uuid references tenants(id) not null,
  role text not null check (role in ('doctor', 'patient')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, tenant_id)
);

alter table user_tenants enable row level security;
create policy "Users can view own memberships" on user_tenants for select
  using (auth.uid() = user_id);
-- Doctors can view all memberships in their tenant (to list patients).
create policy "Doctors can view tenant members" on user_tenants for select
  using (tenant_id in (
    select tenant_id from user_tenants where user_id = auth.uid() and role = 'doctor'
  ));

-- Subscriptions: Stripe subscription state per tenant.
create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'trialing' check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  current_period_end timestamp with time zone,
  cancel_at timestamp with time zone,
  trial_end timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table subscriptions enable row level security;
create policy "Tenant members can view subscription" on subscriptions for select
  using (tenant_id in (select tenant_id from user_tenants where user_id = auth.uid()));

-- Provider profiles: public-facing doctor profile linked to a tenant.
create table provider_profiles (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) not null unique,
  display_name text,
  specialty text,
  bio text,
  scheduling_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table provider_profiles enable row level security;
-- Public read for provider directory.
create policy "Provider profiles are public" on provider_profiles for select using (true);
-- Doctors can update their own tenant's profile.
create policy "Doctors can update own profile" on provider_profiles for update
  using (tenant_id in (
    select tenant_id from user_tenants where user_id = auth.uid() and role = 'doctor'
  ));
create policy "Doctors can insert own profile" on provider_profiles for insert
  with check (tenant_id in (
    select tenant_id from user_tenants where user_id = auth.uid() and role = 'doctor'
  ));

-- ═══════════════════════════════════════════════════════════
-- 6. MESSAGES (Real-time 1:1 messaging)
-- ═══════════════════════════════════════════════════════════

create table messages (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) not null,
  patient_user_id uuid references auth.users not null,
  sender_user_id uuid references auth.users not null,
  body text not null check (char_length(body) <= 4000),
  read_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table messages enable row level security;
-- Patients can read/write messages in their own conversation.
create policy "Patients can view own messages" on messages for select
  using (auth.uid() = patient_user_id);
create policy "Patients can send own messages" on messages for insert
  with check (auth.uid() = sender_user_id and auth.uid() = patient_user_id);
-- Doctors can read/write messages for patients in their tenant.
create policy "Doctors can view tenant messages" on messages for select
  using (tenant_id in (
    select tenant_id from user_tenants where user_id = auth.uid() and role = 'doctor'
  ));
create policy "Doctors can send tenant messages" on messages for insert
  with check (
    auth.uid() = sender_user_id
    and tenant_id in (
      select tenant_id from user_tenants where user_id = auth.uid() and role = 'doctor'
    )
  );
-- Both parties can mark messages as read.
create policy "Conversation participants can update read_at" on messages for update
  using (
    auth.uid() = patient_user_id
    or tenant_id in (
      select tenant_id from user_tenants where user_id = auth.uid() and role = 'doctor'
    )
  );

-- Enable Supabase Realtime for messages.
alter publication supabase_realtime add table messages;

-- ═══════════════════════════════════════════════════════════
-- INDEXES for query performance
-- ═══════════════════════════════════════════════════════════

-- health_logs: frequently queried by user_id + created_at (history screen)
create index idx_health_logs_user_created on health_logs (user_id, created_at desc);

-- health_logs: tenant_id scoping
create index idx_health_logs_tenant on health_logs (tenant_id);

-- health_logs: severity filtering for analytics
create index idx_health_logs_severity on health_logs (severity);

-- health_logs: Jev risk_band & decision_class filtering for clinical triage
create index idx_health_logs_risk_band on health_logs (risk_band);
create index idx_health_logs_decision_class on health_logs (decision_class);

-- audit_logs: queried by user_id + created_at for compliance review
create index idx_audit_logs_user_created on audit_logs (user_id, created_at desc);

-- audit_logs: event_type lookups for SOC 2 auditing
create index idx_audit_logs_event_type on audit_logs (event_type);

-- providers: specialty filtering on provider directory
create index idx_providers_specialty on providers (specialty);

-- user_tenants: fast membership lookups
create index idx_user_tenants_user on user_tenants (user_id);
create index idx_user_tenants_tenant on user_tenants (tenant_id);

-- messages: conversation lookup + ordering
create index idx_messages_conversation on messages (tenant_id, patient_user_id, created_at);

-- messages: unread detection
create index idx_messages_unread on messages (patient_user_id, sender_user_id) where read_at is null;

-- provider_profiles: tenant lookup
create index idx_provider_profiles_tenant on provider_profiles (tenant_id);

-- patient_profiles: no additional index needed (PK lookup only)

-- ═══════════════════════════════════════════════════════════
-- JEV CLINICAL GOVERNANCE MIGRATION (Idempotent for existing DBs)
-- ═══════════════════════════════════════════════════════════
-- alter table health_logs add column if not exists tenant_id uuid references tenants(id);
-- alter table health_logs add column if not exists urgency text default 'routine' check (urgency in ('routine', 'urgent', 'emergency'));
-- alter table health_logs add column if not exists decision_class text default 'AUTONOMOUS_HOME_CARE';
-- alter table health_logs add column if not exists risk_band text default 'LOW' check (risk_band in ('LOW', 'MODERATE', 'HIGH', 'CRITICAL'));
-- alter table health_logs add column if not exists red_flags text[] default '{}';
-- alter table health_logs add column if not exists arbiter_hash text;
-- create index if not exists idx_health_logs_risk_band on health_logs (risk_band);
-- create index if not exists idx_health_logs_decision_class on health_logs (decision_class);
-- create index if not exists idx_health_logs_tenant on health_logs (tenant_id);

-- ═══════════════════════════════════════════════════════════
-- AUDIT LOG CHECK CONSTRAINT MIGRATION (Idempotent for existing DBs)
-- ═══════════════════════════════════════════════════════════
-- alter table audit_logs drop constraint if exists audit_logs_event_type_check;
-- alter table audit_logs add constraint audit_logs_event_type_check check (event_type in (
--   'auth.sign_in', 'auth.sign_up', 'auth.sign_out', 'auth.anon_sign_in',
--   'auth.upgrade_anon', 'profile.update', 'health_log.create',
--   'settings.change', 'message.read', 'message.send', 'system.signup_trigger'
-- ));

