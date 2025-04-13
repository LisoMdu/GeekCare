-- Create table for physician weekly schedule
CREATE TABLE IF NOT EXISTS public.physician_weekly_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  physician_id UUID NOT NULL REFERENCES public.physicians(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (physician_id, day_of_week)
);

-- Create table for physician daily schedule overrides
CREATE TABLE IF NOT EXISTS public.physician_daily_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  physician_id UUID NOT NULL REFERENCES public.physicians(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (physician_id, date)
);

-- Add column for cancellation reason to physician_appointments
ALTER TABLE public.physician_appointments
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Create RLS policies for physician_weekly_schedule
ALTER TABLE public.physician_weekly_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Physicians can view their own weekly schedule"
  ON public.physician_weekly_schedule
  FOR SELECT
  USING (auth.uid() = physician_id);
  
CREATE POLICY "Physicians can insert their own weekly schedule"
  ON public.physician_weekly_schedule
  FOR INSERT
  WITH CHECK (auth.uid() = physician_id);
  
CREATE POLICY "Physicians can update their own weekly schedule"
  ON public.physician_weekly_schedule
  FOR UPDATE
  USING (auth.uid() = physician_id)
  WITH CHECK (auth.uid() = physician_id);
  
CREATE POLICY "Physicians can delete their own weekly schedule"
  ON public.physician_weekly_schedule
  FOR DELETE
  USING (auth.uid() = physician_id);
  
-- Create RLS policies for physician_daily_overrides
ALTER TABLE public.physician_daily_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Physicians can view their own daily overrides"
  ON public.physician_daily_overrides
  FOR SELECT
  USING (auth.uid() = physician_id);
  
CREATE POLICY "Physicians can insert their own daily overrides"
  ON public.physician_daily_overrides
  FOR INSERT
  WITH CHECK (auth.uid() = physician_id);
  
CREATE POLICY "Physicians can update their own daily overrides"
  ON public.physician_daily_overrides
  FOR UPDATE
  USING (auth.uid() = physician_id)
  WITH CHECK (auth.uid() = physician_id);
  
CREATE POLICY "Physicians can delete their own daily overrides"
  ON public.physician_daily_overrides
  FOR DELETE
  USING (auth.uid() = physician_id);
  
-- Create public policy to allow members to view physician schedules
CREATE POLICY "Members can view physician weekly schedules"
  ON public.physician_weekly_schedule
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members WHERE id = auth.uid()
    )
  );
  
CREATE POLICY "Members can view physician daily overrides"
  ON public.physician_daily_overrides
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members WHERE id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_weekly_schedule_physician_id
  ON public.physician_weekly_schedule(physician_id);
  
CREATE INDEX IF NOT EXISTS idx_daily_overrides_physician_id_date
  ON public.physician_daily_overrides(physician_id, date); 