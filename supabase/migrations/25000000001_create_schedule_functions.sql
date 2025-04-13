-- Function to create the physician_weekly_schedule table if it doesn't exist
CREATE OR REPLACE FUNCTION create_weekly_schedule_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table already exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'physician_weekly_schedule'
  ) THEN
    -- Create the table
    CREATE TABLE public.physician_weekly_schedule (
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

    -- Create RLS policies
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
      
    -- Create indexes
    CREATE INDEX idx_weekly_schedule_physician_id
      ON public.physician_weekly_schedule(physician_id);
      
    RAISE NOTICE 'Created physician_weekly_schedule table';
  ELSE
    RAISE NOTICE 'physician_weekly_schedule table already exists';
  END IF;
END;
$$;

-- Function to create the physician_daily_overrides table if it doesn't exist
CREATE OR REPLACE FUNCTION create_daily_overrides_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table already exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'physician_daily_overrides'
  ) THEN
    -- Create the table
    CREATE TABLE public.physician_daily_overrides (
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

    -- Create RLS policies
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
      
    -- Create public access policies
    CREATE POLICY "Members can view physician daily overrides"
      ON public.physician_daily_overrides
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.members WHERE id = auth.uid()
        )
      );
      
    -- Create indexes
    CREATE INDEX idx_daily_overrides_physician_id_date
      ON public.physician_daily_overrides(physician_id, date);
      
    RAISE NOTICE 'Created physician_daily_overrides table';
  ELSE
    RAISE NOTICE 'physician_daily_overrides table already exists';
  END IF;
  
  -- Add cancellation_reason column to physician_appointments if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'physician_appointments'
    AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE public.physician_appointments 
    ADD COLUMN cancellation_reason TEXT;
    
    RAISE NOTICE 'Added cancellation_reason column to physician_appointments';
  ELSE
    RAISE NOTICE 'cancellation_reason column already exists in physician_appointments';
  END IF;
END;
$$; 