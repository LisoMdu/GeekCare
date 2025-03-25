-- Create a database function to allow members to update their appointments
CREATE OR REPLACE FUNCTION public.update_member_appointment(
  appointment_id UUID,
  new_start_time TIMESTAMPTZ,
  new_end_time TIMESTAMPTZ
) RETURNS VOID AS $$
BEGIN
  UPDATE physician_appointments
  SET 
    start_time = new_start_time,
    end_time = new_end_time
  WHERE id = appointment_id 
  AND member_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_member_appointment TO authenticated; 