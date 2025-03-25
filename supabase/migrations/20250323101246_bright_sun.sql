/*
  # Fix member profile update functionality

  1. Ensure all required columns exist
  2. Add proper policies for profile updates
  3. Add indexes for better performance
*/

-- Ensure all required columns exist
ALTER TABLE members ADD COLUMN IF NOT EXISTS mobile_number text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE members ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS residence text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_image_url text;

-- Drop existing update policy if it exists
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Members can update their own profile" ON members;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create comprehensive update policy
CREATE POLICY "Members can update their own profile"
  ON members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS members_id_idx ON members(id);