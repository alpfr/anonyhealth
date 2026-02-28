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

-- 3. Health Logs (History)
create table health_logs (
  id uuid default uuid_generate_v4() primary key,
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

-- Enable Row Level Security (optional, for read access)
alter table providers enable row level security;

-- Create a policy that allows anyone to read providers (public access)
create policy "Public providers are viewable by everyone"
  on providers for select
  using ( true );
