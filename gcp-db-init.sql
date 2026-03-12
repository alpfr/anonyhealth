-- 1. Create PostgREST roles
CREATE ROLE authenticator noinherit login password 'anonyhealth_auth_password';
CREATE ROLE anon nologin;
CREATE ROLE authenticated nologin;

GRANT anon TO authenticator;
GRANT authenticated TO authenticator;

-- 2. Mock the Supabase auth schema and users table
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamp with time zone default now()
);

GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON auth.users TO anon, authenticated;

-- 3. Application Schema (from your supabase_schema.sql)
CREATE TABLE IF NOT EXISTS public.providers (
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

-- Note: We disable RLS momentarily or configure policies carefully.
-- For PostgREST, we need to grant usage to the public schema.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Insert mock data
insert into public.providers (name, specialty, rating, distance, avail, telehealth, badge, initials, bio, expertise)
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
  );

-- Patient Profiles
CREATE TABLE IF NOT EXISTS public.patient_profiles (
  id uuid references auth.users primary key,
  full_name text not null,
  dob date not null,
  address text not null,
  consented_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Health Logs
CREATE TABLE IF NOT EXISTS public.health_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  symptom text,
  severity int, -- 1-10
  ai_advice text
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  event_type text not null,
  detail text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS and setup policies (using current_setting('request.jwt.claim.sub', true) to mimic auth.uid() in Supabase)
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ LANGUAGE sql STABLE;

ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.patient_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.patient_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.patient_profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs" ON public.health_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.health_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public providers are viewable by everyone" ON public.providers FOR SELECT USING ( true );

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
