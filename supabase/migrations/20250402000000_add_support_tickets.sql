-- -----------------------------------------------------------------------------
-- Support System Migration - Run this script in the Supabase SQL Editor to set up
-- the support functionality.
-- -----------------------------------------------------------------------------

BEGIN;

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id SERIAL PRIMARY KEY,
  ticket_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('member', 'physician')),
  email TEXT NOT NULL,
  full_name TEXT,
  category TEXT NOT NULL CHECK (category IN ('account', 'appointments', 'payment', 'technical', 'other')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  attachments TEXT[],
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'resolved')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at);

-- Add RLS policies
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view their own support tickets"
  ON public.support_tickets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tickets
CREATE POLICY "Users can insert their own support tickets"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add timestamp trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('support-attachments', 'support-attachments', false, false, 5242880, '{image/png,image/jpeg,image/gif,application/pdf}')
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage
CREATE POLICY "Users can upload support attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'support-attachments');

CREATE POLICY "Users can view their own support attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'support-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

COMMIT; 