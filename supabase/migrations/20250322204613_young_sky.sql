/*
  # Add appointment details and payment information

  1. New Tables
    - `appointment_details`
      - `id` (uuid, primary key)
      - `appointment_id` (uuid, references physician_appointments)
      - `patient_name` (text)
      - `patient_age` (integer)
      - `reason` (text)
      - `symptoms` (text[])
      - `medical_history` (text)
      - `created_at` (timestamptz)

    - `appointment_payments`
      - `id` (uuid, primary key)
      - `appointment_id` (uuid, references physician_appointments)
      - `amount` (numeric)
      - `currency` (text)
      - `status` (text)
      - `payment_id` (text)
      - `payment_method` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Appointment Details Table
CREATE TABLE IF NOT EXISTS appointment_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES physician_appointments(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  patient_age integer,
  reason text NOT NULL,
  symptoms text[],
  medical_history text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointment_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can insert their own appointment details"
  ON appointment_details
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM physician_appointments
      WHERE id = appointment_id
      AND member_id = auth.uid()
    )
  );

CREATE POLICY "Members can view their own appointment details"
  ON appointment_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM physician_appointments
      WHERE id = appointment_id
      AND member_id = auth.uid()
    )
  );

CREATE POLICY "Physicians can view appointment details for their appointments"
  ON appointment_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM physician_appointments
      WHERE id = appointment_id
      AND physician_id = auth.uid()
    )
  );

-- Appointment Payments Table
CREATE TABLE IF NOT EXISTS appointment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES physician_appointments(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  payment_id text,
  payment_method text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can insert their own appointment payments"
  ON appointment_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM physician_appointments
      WHERE id = appointment_id
      AND member_id = auth.uid()
    )
  );

CREATE POLICY "Members can view their own appointment payments"
  ON appointment_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM physician_appointments
      WHERE id = appointment_id
      AND member_id = auth.uid()
    )
  );

CREATE POLICY "Physicians can view payments for their appointments"
  ON appointment_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM physician_appointments
      WHERE id = appointment_id
      AND physician_id = auth.uid()
    )
  );