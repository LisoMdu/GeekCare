/*
  # Add SELECT policies for physician data

  1. Changes
    - Add SELECT policies for physicians table
    - Add SELECT policies for all related tables (specialties, languages, education, employment)
    
  2. Security
    - Enable authenticated users to read their own data
    - Maintain existing RLS policies
*/

-- Add SELECT policy for physicians table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'physicians' 
    AND policyname = 'Physicians can read own data'
  ) THEN
    CREATE POLICY "Physicians can read own data"
      ON physicians
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Add SELECT policies for related tables
DO $$ 
BEGIN
  -- Physician specialties
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'physician_specialties' 
    AND policyname = 'Physicians can read own specialties'
  ) THEN
    CREATE POLICY "Physicians can read own specialties"
      ON physician_specialties
      FOR SELECT
      TO authenticated
      USING (auth.uid() = physician_id);
  END IF;

  -- Physician languages
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'physician_languages' 
    AND policyname = 'Physicians can read own languages'
  ) THEN
    CREATE POLICY "Physicians can read own languages"
      ON physician_languages
      FOR SELECT
      TO authenticated
      USING (auth.uid() = physician_id);
  END IF;

  -- Physician education
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'physician_education' 
    AND policyname = 'Physicians can read own education'
  ) THEN
    CREATE POLICY "Physicians can read own education"
      ON physician_education
      FOR SELECT
      TO authenticated
      USING (auth.uid() = physician_id);
  END IF;

  -- Physician employment
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'physician_employment' 
    AND policyname = 'Physicians can read own employment'
  ) THEN
    CREATE POLICY "Physicians can read own employment"
      ON physician_employment
      FOR SELECT
      TO authenticated
      USING (auth.uid() = physician_id);
  END IF;
END $$;