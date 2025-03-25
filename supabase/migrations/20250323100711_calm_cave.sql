/*
  # Add member update policy

  1. Changes
    - Add policy for members to update their own profile data
    
  2. Security
    - Enable members to update their own data only
    - Maintain existing RLS policies
*/

-- Add UPDATE policy for members table
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