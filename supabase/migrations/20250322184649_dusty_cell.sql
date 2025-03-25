/*
  # Initial Auth Schema Setup

  1. New Tables
    - `members`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `email` (text)
      - `created_at` (timestamp)
    - `physicians`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `email` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read their own data
*/

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create physicians table
CREATE TABLE IF NOT EXISTS physicians (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE physicians ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own member data"
  ON members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read own physician data"
  ON physicians
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own member data"
  ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own physician data"
  ON physicians
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);