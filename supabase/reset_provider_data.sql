-- AnonyHealth: Complete Provider & Practice Clean-Slate Reset Script
-- 
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/exzmdnnkbjjgrtwnjemm/sql
--
-- What this does:
-- 1. Truncates all doctor tenants (cascades to subscriptions, provider_profiles,
--    patient_invites, appointment_requests, messages, and tenant-scoped health logs).
-- 2. Removes test auth users so testers can register fresh with the same emails.
-- 3. Resets and re-seeds the public mock providers directory.

BEGIN;

-- 1. Wipe all doctor tenants and cascaded records (subscriptions, profiles, invites, etc.)
TRUNCATE TABLE tenants CASCADE;

-- 2. Optional: Remove test provider/patient users from auth.users so you can re-use emails
-- (Uncomment the line below if you want to delete all auth accounts and start 100% fresh)
-- DELETE FROM auth.users;

-- 3. Reset and re-seed the public Provider Directory table
TRUNCATE TABLE providers;

INSERT INTO providers (name, specialty, rating, distance, avail, telehealth, badge, initials, bio, expertise)
VALUES
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

COMMIT;
