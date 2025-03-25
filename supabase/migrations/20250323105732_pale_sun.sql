/*
  # Add public read access policies

  1. Changes
    - Add public read access to physicians table
    - Add public read access to physician_specialties table
    - Add public read access to physician_languages table
    
  2. Security
    - Only allow reading of completed profiles
    - Maintain existing RLS policies
*/

-- Add public read policy for physicians
CREATE POLICY "Anyone can view completed physician profiles"
  ON physicians
  FOR SELECT
  TO public
  USING (is_profile_complete = true);

-- Add public read policy for physician specialties
CREATE POLICY "Anyone can view physician specialties"
  ON physician_specialties
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM physicians
      WHERE id = physician_id
      AND is_profile_complete = true
    )
  );

-- Add public read policy for physician languages
CREATE POLICY "Anyone can view physician languages"
  ON physician_languages
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM physicians
      WHERE id = physician_id
      AND is_profile_complete = true
    )
  );