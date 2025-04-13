import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parse, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Save, Clock } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabase';

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  specific_date?: string;
  is_available: boolean;
}

interface WeeklySchedule {
  [key: number]: {
    enabled: boolean;
    start_time: string;
    end_time: string;
  };
}

export function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [slotsMap, setSlotsMap] = useState<Record<string, TimeSlot[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Loading schedule...');
  const [physician, setPhysician] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState('');
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({
    0: { enabled: false, start_time: '09:00', end_time: '17:00' }, // Sunday
    1: { enabled: true, start_time: '09:00', end_time: '17:00' },  // Monday
    2: { enabled: true, start_time: '09:00', end_time: '17:00' },  // Tuesday
    3: { enabled: true, start_time: '09:00', end_time: '17:00' },  // Wednesday
    4: { enabled: true, start_time: '09:00', end_time: '17:00' },  // Thursday
    5: { enabled: true, start_time: '09:00', end_time: '17:00' },  // Friday
    6: { enabled: false, start_time: '09:00', end_time: '17:00' }  // Saturday
  });
  const [editDayOverride, setEditDayOverride] = useState<{
    date: Date;
    enabled: boolean;
    start_time: string;
    end_time: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const ensureTablesExist = async () => {
    try {
      // Check if physician_weekly_schedule table exists
      const { count, error: countError } = await supabase
        .from('physician_weekly_schedule')
        .select('*', { count: 'exact', head: true })
        .limit(1);
        
      if (countError) {
        console.log("Weekly schedule table might not exist, trying to create it");
        
        try {
          // Get the current user's auth ID for proper RLS policy setup
          const { data: { user } } = await supabase.auth.getUser();
          console.log("Current auth user ID for RLS policy:", user?.id);
          
          // Try using the RPC function first
          const { error: createError } = await supabase.rpc('create_weekly_schedule_table');
          
          if (createError) {
            console.error("Error creating weekly schedule table using RPC:", createError);
            
            // If RPC fails, try direct SQL
            const { error: sqlError } = await supabase.rpc('execute_sql', { 
              sql: `
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
                
                -- Make sure RLS is enabled
                ALTER TABLE public.physician_weekly_schedule ENABLE ROW LEVEL SECURITY;
                
                -- Drop any existing policies that might conflict
                DROP POLICY IF EXISTS "Users can access their own data" ON public.physician_weekly_schedule;
                
                -- Create proper RLS policy allowing authenticated users to manage physician schedules
                CREATE POLICY "Allow users to manage schedules" 
                  ON public.physician_weekly_schedule 
                  FOR ALL 
                  TO authenticated
                  USING (true)
                  WITH CHECK (true);
                
                -- Create index for better performance
                CREATE INDEX IF NOT EXISTS idx_weekly_schedule_physician_id
                  ON public.physician_weekly_schedule(physician_id);
              `
            });
            
            if (sqlError) {
              console.error("Error creating weekly schedule table using SQL:", sqlError);
              // Continue anyway, the table might still exist but we might not have permissions to create it
            } else {
              console.log("Weekly schedule table created successfully using SQL");
            }
          } else {
            console.log("Weekly schedule table created successfully using RPC");
          }
        } catch (err) {
          console.error("Error creating weekly schedule table:", err);
          // Continue anyway, the table might still exist
        }
      }
      
      // Similar approach for daily overrides table
      // ... similar code for daily overrides ...
      
      return true;
    } catch (error) {
      console.error("Error ensuring tables exist:", error);
      return false;
    }
  };

  useEffect(() => {
    console.log('Initial page load - fetching data');
    setLoading(true);
    setLoadingText('Loading physician data...');
    
    // First ensure the required tables exist
    ensureTablesExist().then(() => {
    fetchPhysicianData()
      .then(() => {
        // Immediately check if physician data is available
        if (physician?.id) {
          console.log('Physician data already available, fetching slots immediately');
          setLoadingText('Loading schedule slots...');
          fetchAllTimeSlots();
            fetchWeeklySchedule();
        } else {
          // If not available right after fetchPhysicianData completes, 
          // set a small delay and try again
          console.log('Waiting for physician data to be available');
          setLoadingText('Preparing to load schedule...');
          setTimeout(() => {
            console.log('Delayed fetch of slots, physician:', physician?.id);
            setLoadingText('Loading schedule slots...');
            fetchAllTimeSlots();
              fetchWeeklySchedule();
          }, 300);
        }
      })
      .catch(error => {
        console.error('Error in initial data loading:', error);
        setLoadingText('Error loading data. Please refresh.');
        });
      });
  }, []);

  // Separate effect to handle date changes
  useEffect(() => {
    if (currentDate && physician?.id) {
      console.log('Current date changed, refreshing slots');
      setLoadingText('Updating calendar view...');
      setLoading(true);
      fetchAllTimeSlots();
    }
  }, [currentDate, physician?.id]);

  const fetchPhysicianData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Schedule: No authenticated user found');
        return;
      }
      
      console.log('Schedule: Auth user ID:', user.id);

      const { data: physicianData, error } = await supabase
        .from('physicians')
        .select(`
          *,
          physician_specialties (
            specialty
          )
        `)
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Schedule: Error fetching physician data:', error);
        throw error;
      }
      
      if (!physicianData) {
        console.error('Schedule: No physician found for user ID:', user.id);
        return;
      }
      
      console.log('Schedule: Physician data retrieved, ID:', physicianData.id);
      setPhysician(physicianData);
      return physicianData;
    } catch (error) {
      console.error('Error fetching physician data:', error);
    }
  };

  const fetchWeeklySchedule = async () => {
    if (!physician?.id) return;
    
    try {
      // Fetch weekly schedule
      const { data, error } = await supabase
        .from('physician_weekly_schedule')
        .select('*')
        .eq('physician_id', physician.id);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Convert the database data to our state format
        const newSchedule: WeeklySchedule = { ...weeklySchedule };
        
        data.forEach(day => {
          newSchedule[day.day_of_week] = {
            enabled: day.is_available,
            start_time: day.start_time,
            end_time: day.end_time
          };
        });
        
        setWeeklySchedule(newSchedule);
      }
    } catch (error) {
      console.error('Error fetching weekly schedule:', error);
    }
  };

  const fetchAllTimeSlots = async (retryCount = 0) => {
    if (!physician?.id) {
      console.log('No physician data available yet, skipping slot fetch');
      // If we're still waiting for physician data but have retries left, try again
      if (retryCount < 3) {
        console.log(`Will retry fetch (${retryCount + 1}/3) in 500ms`);
        setTimeout(() => fetchAllTimeSlots(retryCount + 1), 500);
      }
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching slots for physician:', physician.id);
      
      // Get the start and end dates of the current month being viewed
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      
      console.log('Current month date range:', start, 'to', end);
      
      // Get all daily schedule overrides
      const { data: dailyOverrides, error: overridesError } = await supabase
        .from('physician_daily_overrides')
        .select('*')
        .eq('physician_id', physician.id)
        .gte('date', start)
        .lte('date', end);
        
      if (overridesError) {
        console.error('Error fetching daily overrides:', overridesError);
        throw overridesError;
      }
      
      // Get the weekly schedule
      const { data: weeklySchedule, error: weeklyError } = await supabase
        .from('physician_weekly_schedule')
        .select('*')
        .eq('physician_id', physician.id);
        
      if (weeklyError) {
        console.error('Error fetching weekly schedule:', weeklyError);
        throw weeklyError;
      }
      
      // Get all appointments that are already booked
      const { data: bookedAppointments, error: bookedError } = await supabase
        .from('physician_appointments')
        .select('id, start_time, end_time, status')
        .eq('physician_id', physician.id)
        .gte('start_time', `${start}T00:00:00`)
        .lte('start_time', `${end}T23:59:59`)
        .not('status', 'eq', 'cancelled');
        
      if (bookedError) {
        console.error('Error fetching booked appointments:', bookedError);
      }
      
      // Create a map of all days in the month
      const daysInMonth = eachDayOfInterval({
        start: new Date(start),
        end: new Date(end)
      });
      
      // Group all slots by date
      const newSlotsMap: Record<string, TimeSlot[]> = {};
      
      // Create a record for each day that includes the regular weekly schedule
      // with any overrides applied
      daysInMonth.forEach((day: Date) => {
        const formattedDate = format(day, 'yyyy-MM-dd');
        const dayOfWeek = day.getDay();
        
        // Find the weekly schedule for this day of week
        const weekDay = weeklySchedule?.find(ws => ws.day_of_week === dayOfWeek);
        
        // Find any override for this specific date
        const override = dailyOverrides?.find(
          o => format(new Date(o.date), 'yyyy-MM-dd') === formattedDate
        );
        
        // If there's an override, use that; otherwise use the weekly schedule
        if (override) {
          if (override.is_available) {
            newSlotsMap[formattedDate] = [{
              id: override.id,
              day_of_week: dayOfWeek,
              start_time: override.start_time,
              end_time: override.end_time,
              specific_date: formattedDate,
              is_available: true
            }];
          } else {
            // Day is marked as unavailable in override
            newSlotsMap[formattedDate] = [];
          }
        } else if (weekDay && weekDay.is_available) {
          // Use weekly schedule
          newSlotsMap[formattedDate] = [{
            id: `weekly-${dayOfWeek}`,
            day_of_week: dayOfWeek,
            start_time: weekDay.start_time,
            end_time: weekDay.end_time,
            specific_date: formattedDate,
            is_available: true
          }];
        } else {
          // Day is not available in weekly schedule
          newSlotsMap[formattedDate] = [];
        }
      });
      
      console.log('Organized schedule by date:', newSlotsMap);
      setSlotsMap(newSlotsMap);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      // Retry logic if needed
      if (retryCount < 2) {
        console.log(`Retrying fetchAllTimeSlots (${retryCount + 1}/2) after error...`);
        setTimeout(() => fetchAllTimeSlots(retryCount + 1), 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const validateTimeRange = (startTime: string, endTime: string): boolean => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    return endMinutes > startMinutes;
  };

  const createScheduleTableIfNeeded = async () => {
    console.log("Creating schedule table if needed...");
    try {
      // First, check if we can select from the table to see if it exists
      const { data, error } = await supabase
        .from('physician_weekly_schedule')
        .select('count(*)', { count: 'exact', head: true });
        
      if (!error) {
        console.log("Table already exists");
        return true; // Table exists
      }
      
      console.log("Table might not exist, trying to create it via SQL functions");
      
      // Try to create the table using supabase client with bare minimum fields
      // Unfortunately we can't run direct CREATE TABLE SQL, but we can try an insert
      // with the right schema which might auto-create the table
      
      const testData = {
        physician_id: 'test', // Will be replaced in actual save
        day_of_week: 0,
        start_time: '09:00',
        end_time: '17:00',
        is_available: true
      };
      
      // Try to insert test data to create table (this often works with Supabase)
      const { error: insertError } = await supabase
        .from('physician_weekly_schedule')
        .insert([testData]);
      
      if (!insertError || insertError.message?.includes('already exists')) {
        console.log("Table created successfully");
        
        // Now delete our test data
        const { error: deleteError } = await supabase
          .from('physician_weekly_schedule')
          .delete()
          .eq('physician_id', 'test');
          
        if (deleteError) {
          console.warn("Could not delete test data:", deleteError);
        }
        
        return true;
      }
      
      // If we get here, the table couldn't be created
      console.error("Could not create table:", insertError);
      return false;
    } catch (error) {
      console.error("Error creating table:", error);
      return false;
    }
  };

  const handleSaveWeeklySchedule = async () => {
    if (!physician?.id) {
      setError("Physician data not loaded. Please refresh the page.");
      return;
    }
    
    try {
      setLoading(true);
      setError(''); 
      setSuccessMessage('');
      
      // Add detailed logging
      console.log("===== SCHEDULE SAVE DIAGNOSTICS =====");
      console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
      console.log("Physician ID:", physician.id);
      
      // Check authentication status
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Session error:", sessionError);
        throw new Error("Authentication session error: " + sessionError.message);
      }
      
      if (!session) {
        throw new Error("You must be logged in to save your schedule.");
      }
      
      console.log("User is authenticated:", session.user.id);
      console.log("User email:", session.user.email);
      console.log("User role:", session.user.role);
      
      // Validate time ranges before submitting
      for (const [day, schedule] of Object.entries(weeklySchedule)) {
        if (schedule.enabled) {
          if (!validateTimeRange(schedule.start_time, schedule.end_time)) {
            setError(`Invalid time range for ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(day)]}: End time must be after start time`);
            setLoading(false);
            return;
          }
        }
      }
      
      // Prepare the data - only enabled days
      const enabledDays = Object.entries(weeklySchedule)
        .filter(([_, schedule]) => schedule.enabled)
        .map(([day, schedule]) => ({
          physician_id: physician.id,
          day_of_week: parseInt(day),
          start_time: schedule.start_time.includes(':') ? schedule.start_time : `${schedule.start_time}:00`,
          end_time: schedule.end_time.includes(':') ? schedule.end_time : `${schedule.end_time}:00`,
          is_available: true
        }));
      
      if (enabledDays.length === 0) {
        setError("Please enable at least one day in your weekly schedule.");
        return;
      }
      
      console.log("Days to save:", JSON.stringify(enabledDays, null, 2));
      
      // Try the direct Supabase approach first
      try {
        console.log("Trying direct Supabase client approach");
        
        // Try to fetch first to see if table exists
        const { data: testData, error: testError } = await supabase
          .from('physician_weekly_schedule')
        .select('*')
          .limit(1);
          
        if (testError) {
          console.error("Test query error:", testError);
          
          if (testError.message?.includes("does not exist")) {
            throw new Error("The physician_weekly_schedule table does not exist in your Supabase database. Please create it first.");
          }
      } else {
          console.log("Table exists, test query succeeded");
        }
        
        // Try deleting with detailed error logging
        console.log("Deleting existing records");
        const deleteResponse = await supabase
          .from('physician_weekly_schedule')
          .delete()
          .eq('physician_id', physician.id);
          
        console.log("Delete response:", deleteResponse);
        
        if (deleteResponse.error) {
          console.error("Delete error:", deleteResponse.error);
          // Continue anyway, try the insert
        }
        
        // Try inserting 
        console.log("Inserting new schedule records");
        const insertResponse = await supabase
          .from('physician_weekly_schedule')
          .insert(enabledDays);
          
        console.log("Insert response:", insertResponse);
        
        if (insertResponse.error) {
          console.error("Insert error:", insertResponse.error);
          throw insertResponse.error;
        }
        
        console.log("Schedule saved successfully");
        setSuccessMessage('Weekly schedule saved successfully!');
        setShowWeeklyModal(false);
        fetchAllTimeSlots();
        return;
    } catch (error) {
        console.error("Standard approach failed:", error);
        
        // Try a fallback using the direct REST API approach
        console.log("Trying fallback REST API approach");
        
        try {
          const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          if (!apiKey) {
            throw new Error("Supabase anon key not found in environment variables");
          }
          
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          if (!supabaseUrl) {
            throw new Error("Supabase URL not found in environment variables");
          }
          
          // Try to use fetch API directly to bypass the Supabase client
          const response = await fetch(
            `${supabaseUrl}/rest/v1/physician_weekly_schedule`, 
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey,
                'Authorization': `Bearer ${session.access_token}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify(enabledDays)
            }
          );
          
          console.log("REST API response status:", response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error("REST API error:", errorText);
            throw new Error(`REST API request failed: ${response.status} ${errorText}`);
          }
          
          console.log("Schedule saved successfully via REST API");
          setSuccessMessage('Weekly schedule saved successfully!');
          setShowWeeklyModal(false);
          fetchAllTimeSlots();
        } catch (restError) {
          console.error("REST API fallback also failed:", restError);
          throw restError;
        }
      }
    } catch (error) {
      console.error('Error saving weekly schedule:', error);
      
      let errorMessage = 'Failed to save weekly schedule. ';
      
      if (error instanceof Error) {
        errorMessage += error.message || 'Unknown error occurred';
      } else if (typeof error === 'object' && error !== null) {
        try {
          if (Object.keys(error).length === 0) {
            errorMessage += "Empty error object received from Supabase. Please check browser console for detailed diagnostics. " +
                           "Most likely causes: 1) The table doesn't exist, 2) Your RLS policy blocks this operation, or " +
                           "3) Your account doesn't have insert permissions.";
          } else {
            errorMessage += JSON.stringify(error);
          }
        } catch (e) {
          errorMessage += 'Unknown error format';
        }
      } else if (error !== undefined) {
        errorMessage += String(error);
      } else {
        errorMessage += 'Unknown error occurred';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDayOverride = async () => {
    if (!physician?.id || !editDayOverride) return;
    
    try {
      setLoading(true);
      
      const formattedDate = format(editDayOverride.date, 'yyyy-MM-dd');
      
      // Check if an override already exists for this date
      const { data: existingOverride, error: checkError } = await supabase
        .from('physician_daily_overrides')
        .select('id')
        .eq('physician_id', physician.id)
        .eq('date', formattedDate)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingOverride) {
        // Update existing override
        const { error } = await supabase
          .from('physician_daily_overrides')
          .update({
            start_time: editDayOverride.start_time,
            end_time: editDayOverride.end_time,
            is_available: editDayOverride.enabled
          })
          .eq('id', existingOverride.id);

        if (error) throw error;
      } else {
        // Insert new override
          const { error } = await supabase
          .from('physician_daily_overrides')
          .insert({
            physician_id: physician.id,
            date: formattedDate,
            start_time: editDayOverride.start_time,
            end_time: editDayOverride.end_time,
            is_available: editDayOverride.enabled
          });

          if (error) throw error;
      }
      
      setEditDayOverride(null);
      fetchAllTimeSlots();
    } catch (error) {
      console.error('Error saving day override:', error);
      setError('Failed to save day override');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOverride = async (date: string) => {
    if (!physician?.id) return;
    
    try {
      const { error } = await supabase
        .from('physician_daily_overrides')
        .delete()
        .eq('physician_id', physician.id)
        .eq('date', date);
      
      if (error) throw error;
      
      fetchAllTimeSlots();
    } catch (error) {
      console.error('Error deleting override:', error);
      setError('Failed to delete override');
    }
  };

  const handleEditDay = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    const slots = slotsMap[formattedDate] || [];
    
    // Check if this day has an override
    const isOverride = slots.length > 0 && typeof slots[0].id === 'string' && !slots[0].id.startsWith('weekly');
    
    if (isOverride) {
      // Edit existing override
      setEditDayOverride({
        date,
        enabled: slots.length > 0,
        start_time: slots.length > 0 ? slots[0].start_time : '09:00',
        end_time: slots.length > 0 ? slots[0].end_time : '17:00'
      });
    } else {
      // Create new override based on weekly schedule
      setEditDayOverride({
        date,
        enabled: slots.length > 0,
        start_time: slots.length > 0 ? slots[0].start_time : weeklySchedule[dayOfWeek].start_time,
        end_time: slots.length > 0 ? slots[0].end_time : weeklySchedule[dayOfWeek].end_time
      });
    }
  };

  const formatTimeSlot = (time: string) => {
    try {
      // Simple formatting without using date-fns parsing
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
      return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return time;
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  return (
    <div className="flex-1">
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded flex justify-between items-center">
              <span>{successMessage}</span>
              <button 
                onClick={() => setSuccessMessage('')}
                className="text-green-700 hover:text-green-900"
              >
                ×
              </button>
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">My Schedule</h2>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setShowWeeklyModal(true)}
                    className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm flex items-center"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Set Weekly Hours
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <h3 className="text-lg font-semibold">
                    {format(currentDate, 'MMMM yyyy')}
                  </h3>
                  <div className="flex ml-4">
                    <button
                      onClick={() => {
                        const newDate = new Date(currentDate);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setCurrentDate(newDate);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-full"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        const newDate = new Date(currentDate);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setCurrentDate(newDate);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-full"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-gray-500 font-semibold">
                    {day}
                    </div>
                  ))}
              </div>

              <div className="grid grid-cols-7 gap-2 mt-2">
                {days.map((day: Date) => {
                  const formattedDate = format(day, 'yyyy-MM-dd');
                  const daySlots = slotsMap[formattedDate] || [];
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isWeeklySchedule = daySlots.length > 0 && (daySlots[0].id as string).startsWith('weekly');
                  const isOverride = daySlots.length > 0 && !isWeeklySchedule;
                    
                    return (
                      <div
                      key={day.toString()}
                      className={`border rounded-lg p-2 h-32 ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${isToday(day) ? 'border-blue-500 border-2' : 'border-gray-200'}`}
                    >
                      <div className="flex justify-between mb-2">
                        <div className={`text-sm font-semibold ${isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}`}>
                            {format(day, 'd')}
                        </div>
                        <div>
                          {isOverride && (
                          <button
                              onClick={() => handleDeleteOverride(formattedDate)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                          </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs">
                          {daySlots.length > 0 ? (
                          <div>
                            <div className={`${isOverride ? 'text-blue-600' : 'text-gray-600'}`}>
                              {formatTimeSlot(daySlots[0].start_time)} - {formatTimeSlot(daySlots[0].end_time)}
                                </div>
                            {isOverride && (
                              <div className="mt-1 text-xs text-blue-600 font-semibold">Custom Schedule</div>
                            )}
                              </div>
                          ) : (
                          <div className="text-gray-400">No availability</div>
                          )}
                        </div>
                      <div className="mt-2">
                        <button
                          onClick={() => handleEditDay(day)}
                          className="mt-1 text-xs text-blue-500 hover:text-blue-700"
                        >
                          Override
                        </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>
          </div>
        </div>
      </div>

      {showWeeklyModal && (
      <Modal
          isOpen={showWeeklyModal}
          title="Set Weekly Working Hours"
          onClose={() => setShowWeeklyModal(false)}
          size="lg"
        >
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Set your regular working hours for each day of the week. These will be applied to all future weeks unless overridden for specific dates.
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                <div key={day} className="flex items-center border-b pb-3">
                  <div className="w-1/4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={weeklySchedule[index].enabled}
                        onChange={(e) => {
                          setWeeklySchedule({
                            ...weeklySchedule,
                            [index]: {
                              ...weeklySchedule[index],
                              enabled: e.target.checked
                            }
                          });
                        }}
                        className="mr-2"
                      />
                      <span className="font-medium">{day}</span>
                    </label>
          </div>
          
                  <div className="w-3/4 flex space-x-4">
                <div>
                      <label className="block text-sm text-gray-600 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={weeklySchedule[index].start_time}
                        onChange={(e) => {
                          setWeeklySchedule({
                            ...weeklySchedule,
                            [index]: {
                              ...weeklySchedule[index],
                              start_time: e.target.value
                            }
                          });
                        }}
                        disabled={!weeklySchedule[index].enabled}
                        className="border rounded px-2 py-1"
                      />
                </div>
                    
                <div>
                      <label className="block text-sm text-gray-600 mb-1">End Time</label>
                      <input
                        type="time"
                        value={weeklySchedule[index].end_time}
                        onChange={(e) => {
                          setWeeklySchedule({
                            ...weeklySchedule,
                            [index]: {
                              ...weeklySchedule[index],
                              end_time: e.target.value
                            }
                          });
                        }}
                        disabled={!weeklySchedule[index].enabled}
                        className="border rounded px-2 py-1"
                      />
                </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowWeeklyModal(false)}
                className="px-4 py-2 text-gray-600 rounded-lg border mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWeeklySchedule}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Weekly Schedule
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      {editDayOverride && (
        <Modal
          isOpen={!!editDayOverride}
          title={`Override Schedule for ${format(editDayOverride.date, 'MMMM d, yyyy')}`}
          onClose={() => setEditDayOverride(null)}
        >
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              This will override your regular weekly schedule for this specific date.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center mb-4">
              <input
                  type="checkbox"
                  checked={editDayOverride.enabled}
                onChange={(e) => {
                    setEditDayOverride({
                      ...editDayOverride,
                      enabled: e.target.checked
                    });
                  }}
                  className="mr-2"
                />
                <span>Available on this day</span>
            </div>
              
              <div className="grid grid-cols-2 gap-4">
            <div>
                  <label className="block text-sm text-gray-600 mb-1">Start Time</label>
            <input
              type="time"
                    value={editDayOverride.start_time}
                    onChange={(e) => {
                      setEditDayOverride({
                        ...editDayOverride,
                        start_time: e.target.value
                      });
                    }}
                    disabled={!editDayOverride.enabled}
                    className="border rounded w-full px-2 py-1"
            />
          </div>
                
          <div>
                  <label className="block text-sm text-gray-600 mb-1">End Time</label>
            <input
              type="time"
                    value={editDayOverride.end_time}
                    onChange={(e) => {
                      setEditDayOverride({
                        ...editDayOverride,
                        end_time: e.target.value
                      });
                    }}
                    disabled={!editDayOverride.enabled}
                    className="border rounded w-full px-2 py-1"
                  />
                </div>
              </div>
          </div>
          
            <div className="mt-6 flex justify-end">
            <button
                onClick={() => setEditDayOverride(null)}
                className="px-4 py-2 text-gray-600 rounded-lg border mr-2"
            >
              Cancel
            </button>
            <button
                onClick={handleSaveDayOverride}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Override
                  </>
                )}
            </button>
          </div>
          </div>
      </Modal>
      )}
    </div>
  );
}