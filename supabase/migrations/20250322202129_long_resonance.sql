/*
  # Add Schedule Management Tables

  1. New Tables
    - `physician_schedules`
      - `id` (uuid, primary key)
      - `physician_id` (uuid, references physicians)
      - `day_of_week` (integer, 0-6 for Sunday-Saturday)
      - `start_time` (time)
      - `end_time` (time)
      - `is_available` (boolean)
      - `created_at` (timestamp)

    - `physician_appointments`
      - `id` (uuid, primary key)
      - `physician_id` (uuid, references physicians)
      - `member_id` (uuid, references members)
      - `start_time` (timestamp with time zone)
      - `end_time` (timestamp with time zone)
      - `status` (text: scheduled, completed, cancelled)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for physicians to manage their schedules
    - Add policies for members to view available slots
*/

-- Create physician_schedules table
CREATE TABLE IF NOT EXISTS physician_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id uuid REFERENCES physicians(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Create physician_appointments table
CREATE TABLE IF NOT EXISTS physician_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id uuid REFERENCES physicians(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_appointment_time CHECK (start_time < end_time)
);

-- Enable RLS
ALTER TABLE physician_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE physician_appointments ENABLE ROW LEVEL SECURITY;

-- Policies for physician_schedules
CREATE POLICY "Physicians can manage their schedules"
  ON physician_schedules
  FOR ALL
  TO authenticated
  USING (auth.uid() = physician_id)
  WITH CHECK (auth.uid() = physician_id);

CREATE POLICY "Members can view physician schedules"
  ON physician_schedules
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for physician_appointments
CREATE POLICY "Physicians can view their appointments"
  ON physician_appointments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = physician_id);

CREATE POLICY "Members can view their appointments"
  ON physician_appointments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = member_id);

CREATE POLICY "Members can create appointments"
  ON physician_appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Physicians can update appointment status"
  ON physician_appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = physician_id)
  WITH CHECK (auth.uid() = physician_id);

CREATE POLICY "Members can update their appointments"
  ON physician_appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);