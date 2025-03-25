/*
  # Add member profile fields

  1. Changes to members table
    - Add new columns for profile information:
      - mobile_number (text)
      - date_of_birth (date)
      - residence (text)
      - profile_image_url (text)

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS mobile_number text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE members ADD COLUMN IF NOT EXISTS residence text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_image_url text;

-- Ensure UPDATE policy exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'members' 
    AND policyname = 'Members can update their own profile'
  ) THEN
    CREATE POLICY "Members can update their own profile"
      ON members
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;