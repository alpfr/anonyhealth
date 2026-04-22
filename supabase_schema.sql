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

-- 3. Health Logs (History)
create table health_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  symptom text,
  severity int, -- 1-10
  ai_advice text
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
    'profile.update',
    'health_log.create',
    'settings.change',
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
-- INDEXES for query performance
-- ═══════════════════════════════════════════════════════════

-- health_logs: frequently queried by user_id + created_at (history screen)
create index idx_health_logs_user_created on health_logs (user_id, created_at desc);

-- health_logs: severity filtering for analytics
create index idx_health_logs_severity on health_logs (severity);

-- audit_logs: queried by user_id + created_at for compliance review
create index idx_audit_logs_user_created on audit_logs (user_id, created_at desc);

-- audit_logs: event_type lookups for SOC 2 auditing
create index idx_audit_logs_event_type on audit_logs (event_type);

-- providers: specialty filtering on provider directory
create index idx_providers_specialty on providers (specialty);

-- patient_profiles: no additional index needed (PK lookup only)
