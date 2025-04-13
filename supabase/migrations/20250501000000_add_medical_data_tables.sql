-- -----------------------------------------------------------------------------
-- Medical Data System Migration - This script adds tables for medical queries
-- and medical records to support the member dashboard functionalities.
-- -----------------------------------------------------------------------------

BEGIN;

-- Create medical_queries table
CREATE TABLE IF NOT EXISTS public.medical_queries (
  id SERIAL PRIMARY KEY,
  query_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  response TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
  physician_id UUID REFERENCES public.physicians(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create medical_records table
CREATE TABLE IF NOT EXISTS public.medical_records (
  id SERIAL PRIMARY KEY,
  record_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lab', 'prescription', 'document')),
  date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  physician_name TEXT,
  physician_id UUID REFERENCES public.physicians(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_medical_queries_member_id ON public.medical_queries(member_id);
CREATE INDEX IF NOT EXISTS idx_medical_queries_status ON public.medical_queries(status);
CREATE INDEX IF NOT EXISTS idx_medical_queries_created_at ON public.medical_queries(created_at);

CREATE INDEX IF NOT EXISTS idx_medical_records_member_id ON public.medical_records(member_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_type ON public.medical_records(type);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON public.medical_records(date);

-- Add RLS policies for medical_queries
ALTER TABLE public.medical_queries ENABLE ROW LEVEL SECURITY;

-- Members can view their own queries
CREATE POLICY "Members can view their own medical queries"
  ON public.medical_queries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = member_id);

-- Members can insert their own queries
CREATE POLICY "Members can insert their own medical queries"
  ON public.medical_queries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = member_id);

-- Physicians can update queries to provide responses
CREATE POLICY "Physicians can answer medical queries"
  ON public.medical_queries
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.physicians
    WHERE id = auth.uid()
  ))
  WITH CHECK (
    status = 'answered' AND 
    auth.uid() = physician_id
  );

-- Add RLS policies for medical_records
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- Members can view their own records
CREATE POLICY "Members can view their own medical records"
  ON public.medical_records
  FOR SELECT
  TO authenticated
  USING (auth.uid() = member_id);

-- Members can insert their own records
CREATE POLICY "Members can insert their own medical records"
  ON public.medical_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = member_id);

-- Physicians can insert records for members they have treated
CREATE POLICY "Physicians can add records for their patients"
  ON public.medical_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.physicians
      WHERE id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.physician_appointments
      WHERE physician_id = auth.uid() AND member_id = member_id
    )
  );

-- Create storage bucket for medical files
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('medical-files', 'medical-files', false, false, 10485760, '{image/png,image/jpeg,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}')
ON CONFLICT (id) DO NOTHING;

-- RLS policy for medical files storage
CREATE POLICY "Members can access their own medical files"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'medical-files' AND
    (storage.foldername(name))[1] = 'medical-records' AND
    auth.uid()::text = SPLIT_PART(SPLIT_PART(name, '/', 2), '-', 1)
  )
  WITH CHECK (
    bucket_id = 'medical-files' AND
    (storage.foldername(name))[1] = 'medical-records' AND
    auth.uid()::text = SPLIT_PART(SPLIT_PART(name, '/', 2), '-', 1)
  );

-- Add timestamp trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for updated_at
DROP TRIGGER IF EXISTS update_medical_queries_updated_at ON public.medical_queries;
CREATE TRIGGER update_medical_queries_updated_at
BEFORE UPDATE ON public.medical_queries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_medical_records_updated_at ON public.medical_records;
CREATE TRIGGER update_medical_records_updated_at
BEFORE UPDATE ON public.medical_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMIT; 