-- First add the column allowing NULL values temporarily
ALTER TABLE physician_schedules 
ADD COLUMN IF NOT EXISTS specific_date DATE;

-- Update any existing rows to have today's date as specific_date
UPDATE physician_schedules
SET specific_date = CURRENT_DATE
WHERE specific_date IS NULL;

-- Now make the column NOT NULL
ALTER TABLE physician_schedules 
ALTER COLUMN specific_date SET NOT NULL;

-- Add an index on specific_date for better query performance
CREATE INDEX IF NOT EXISTS idx_physician_schedules_specific_date
ON physician_schedules(specific_date);

-- Create a unique constraint to prevent duplicate schedules for the same date
ALTER TABLE physician_schedules 
DROP CONSTRAINT IF EXISTS unique_physician_schedule;

ALTER TABLE physician_schedules 
ADD CONSTRAINT unique_physician_schedule 
UNIQUE (physician_id, specific_date, start_time, end_time);

-- Add a trigger to log inserts for debugging
CREATE OR REPLACE FUNCTION log_physician_schedule_changes()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'New physician schedule inserted: physician_id=%, specific_date=%, start_time=%, end_time=%', 
               NEW.physician_id, NEW.specific_date, NEW.start_time, NEW.end_time;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_physician_schedule_insert ON physician_schedules;
CREATE TRIGGER log_physician_schedule_insert
AFTER INSERT ON physician_schedules
FOR EACH ROW
EXECUTE FUNCTION log_physician_schedule_changes();

-- Update the fetchAllTimeSlots query to include specific_date filtering
COMMENT ON TABLE physician_schedules IS 
'Stores physician schedule slots for specific dates. specific_date is now required for all schedule entries.';

-- Add some debug output to help troubleshoot
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully. physician_schedules table now has NOT NULL specific_date column.';
  RAISE NOTICE 'All existing data has been updated with specific_date values.';
END $$; 