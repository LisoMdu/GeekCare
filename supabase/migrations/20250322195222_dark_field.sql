/*
  # Add physician profile fields and related tables

  1. Changes to physicians table
    - Add new columns for profile information
    - Add policy for profile updates

  2. New Tables
    - physician_specialties: Store physician specializations
    - physician_languages: Store languages spoken
    - physician_education: Store education history
    - physician_employment: Store work history

  3. Security
    - Enable RLS on all new tables
    - Add policies for data access and management
*/

-- Add new columns to physicians table
DO $$ 
BEGIN
  ALTER TABLE physicians ADD COLUMN IF NOT EXISTS mobile_number text;
  ALTER TABLE physicians ADD COLUMN IF NOT EXISTS date_of_birth date;
  ALTER TABLE physicians ADD COLUMN IF NOT EXISTS gender text;
  ALTER TABLE physicians ADD COLUMN IF NOT EXISTS residence text;
  ALTER TABLE physicians ADD COLUMN IF NOT EXISTS profile_image_url text;
  ALTER TABLE physicians ADD COLUMN IF NOT EXISTS consultation_fee numeric;
  ALTER TABLE physicians ADD COLUMN IF NOT EXISTS consultation_duration integer;
  ALTER TABLE physicians ADD COLUMN IF NOT EXISTS is_profile_complete boolean DEFAULT false;
END $$;

-- Create physician_specialties table
CREATE TABLE IF NOT EXISTS physician_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id uuid REFERENCES physicians(id) ON DELETE CASCADE,
  specialty text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create physician_languages table
CREATE TABLE IF NOT EXISTS physician_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id uuid REFERENCES physicians(id) ON DELETE CASCADE,
  language text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create physician_education table
CREATE TABLE IF NOT EXISTS physician_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id uuid REFERENCES physicians(id) ON DELETE CASCADE,
  institution text NOT NULL,
  degree text NOT NULL,
  field_of_study text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  file_url text,
  created_at timestamptz DEFAULT now()
);

-- Create physician_employment table
CREATE TABLE IF NOT EXISTS physician_employment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id uuid REFERENCES physicians(id) ON DELETE CASCADE,
  employer_name text NOT NULL,
  position text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE physician_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE physician_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE physician_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE physician_employment ENABLE ROW LEVEL SECURITY;

-- Create policies for physician_specialties
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'physician_specialties' 
    AND policyname = 'Physicians can manage their own specialties'
  ) THEN
    CREATE POLICY "Physicians can manage their own specialties"
      ON physician_specialties
      FOR ALL
      TO authenticated
      USING (auth.uid() = physician_id)
      WITH CHECK (auth.uid() = physician_id);
  END IF;
END $$;

-- Create policies for physician_languages
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'physician_languages' 
    AND policyname = 'Physicians can manage their own languages'
  ) THEN
    CREATE POLICY "Physicians can manage their own languages"
      ON physician_languages
      FOR ALL
      TO authenticated
      USING (auth.uid() = physician_id)
      WITH CHECK (auth.uid() = physician_id);
  END IF;
END $$;

-- Create policies for physician_education
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'physician_education' 
    AND policyname = 'Physicians can manage their own education'
  ) THEN
    CREATE POLICY "Physicians can manage their own education"
      ON physician_education
      FOR ALL
      TO authenticated
      USING (auth.uid() = physician_id)
      WITH CHECK (auth.uid() = physician_id);
  END IF;
END $$;

-- Create policies for physician_employment
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'physician_employment' 
    AND policyname = 'Physicians can manage their own employment'
  ) THEN
    CREATE POLICY "Physicians can manage their own employment"
      ON physician_employment
      FOR ALL
      TO authenticated
      USING (auth.uid() = physician_id)
      WITH CHECK (auth.uid() = physician_id);
  END IF;
END $$;

-- Update physicians policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'physicians' 
    AND policyname = 'Physicians can update their own profile'
  ) THEN
    CREATE POLICY "Physicians can update their own profile"
      ON physicians
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;