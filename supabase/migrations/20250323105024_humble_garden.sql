/*
  # Add test physicians data

  1. Create auth users first
  2. Add physicians with:
    - Basic information
    - Specialties
    - Languages
    - Consultation fees
    - Profile completion status

  3. Security
    - Maintain existing RLS policies
*/

-- First create users in auth.users
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES
  ('00000000-0000-4000-a000-000000000001', 'john.smith@example.com', now()),
  ('00000000-0000-4000-a000-000000000002', 'sarah.johnson@example.com', now()),
  ('00000000-0000-4000-a000-000000000003', 'michael.chen@example.com', now())
ON CONFLICT (id) DO NOTHING;

-- Then add physicians
INSERT INTO physicians (id, full_name, email, mobile_number, gender, residence, consultation_fee, consultation_duration, is_profile_complete)
VALUES
  ('00000000-0000-4000-a000-000000000001', 'John Smith', 'john.smith@example.com', '+1234567890', 'male', 'USA', 100, 30, true),
  ('00000000-0000-4000-a000-000000000002', 'Sarah Johnson', 'sarah.johnson@example.com', '+1234567891', 'female', 'UK', 120, 45, true),
  ('00000000-0000-4000-a000-000000000003', 'Michael Chen', 'michael.chen@example.com', '+1234567892', 'male', 'Singapore', 90, 30, true)
ON CONFLICT (id) DO NOTHING;

-- Add specialties
INSERT INTO physician_specialties (physician_id, specialty)
VALUES
  ('00000000-0000-4000-a000-000000000001', 'Cardiology'),
  ('00000000-0000-4000-a000-000000000001', 'Internal Medicine'),
  ('00000000-0000-4000-a000-000000000002', 'Pediatrics'),
  ('00000000-0000-4000-a000-000000000002', 'Family Medicine'),
  ('00000000-0000-4000-a000-000000000003', 'Neurology'),
  ('00000000-0000-4000-a000-000000000003', 'Psychiatry')
ON CONFLICT DO NOTHING;

-- Add languages
INSERT INTO physician_languages (physician_id, language)
VALUES
  ('00000000-0000-4000-a000-000000000001', 'English'),
  ('00000000-0000-4000-a000-000000000001', 'Spanish'),
  ('00000000-0000-4000-a000-000000000002', 'English'),
  ('00000000-0000-4000-a000-000000000002', 'French'),
  ('00000000-0000-4000-a000-000000000003', 'English'),
  ('00000000-0000-4000-a000-000000000003', 'Mandarin')
ON CONFLICT DO NOTHING;