import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
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

export function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [slotsMap, setSlotsMap] = useState<Record<string, TimeSlot[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Loading schedule...');
  const [physician, setPhysician] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('Initial page load - fetching data');
    setLoading(true);
    setLoadingText('Loading physician data...');
    
    fetchPhysicianData()
      .then(() => {
        // Immediately check if physician data is available
        if (physician?.id) {
          console.log('Physician data already available, fetching slots immediately');
          setLoadingText('Loading schedule slots...');
          fetchAllTimeSlots();
        } else {
          // If not available right after fetchPhysicianData completes, 
          // set a small delay and try again
          console.log('Waiting for physician data to be available');
          setLoadingText('Preparing to load schedule...');
          setTimeout(() => {
            console.log('Delayed fetch of slots, physician:', physician?.id);
            setLoadingText('Loading schedule slots...');
            fetchAllTimeSlots();
          }, 300);
        }
      })
      .catch(error => {
        console.error('Error in initial data loading:', error);
        setLoadingText('Error loading data. Please refresh.');
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
      
      // First, run a simple count query to see if any slots exist
      const { count, error: countError } = await supabase
        .from('physician_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('physician_id', physician.id);
        
      console.log(`Total slots count for physician ${physician.id}:`, count);
      
      if (countError) {
        console.error('Error counting slots:', countError);
      }
      
      // IMPORTANT: Get ALL slots for this physician regardless of date
      // This way we can verify data exists in the database
      const { data: allPhysicianSlots, error: allSlotsError } = await supabase
        .from('physician_schedules')
        .select('*')
        .eq('physician_id', physician.id);
        
      if (allSlotsError) {
        console.error('Error fetching all physician slots:', allSlotsError);
        throw allSlotsError;
      } else {
        console.log('All slots for this physician (regardless of date):', allPhysicianSlots?.length || 0);
        
        // Log each slot with its date for debugging
        allPhysicianSlots?.forEach(slot => {
          console.log(`Slot ID ${slot.id}: specific_date=${slot.specific_date}, start=${slot.start_time}, end=${slot.end_time}`);
        });
      }
      
      // Get the start and end dates of the current month being viewed
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      
      console.log('Current month date range:', start, 'to', end);
      
      // Group all slots by date - even if they're not in the current month
      // This ensures we're not missing data due to query issues
      const newSlotsMap: Record<string, TimeSlot[]> = {};
      
      allPhysicianSlots?.forEach(slot => {
        if (slot.specific_date) {
          // Use the formatted date string as the key
          const formattedDate = format(new Date(slot.specific_date), 'yyyy-MM-dd');
          if (!newSlotsMap[formattedDate]) {
            newSlotsMap[formattedDate] = [];
          }
          newSlotsMap[formattedDate].push(slot);
        }
      });

      console.log('Organized slots by date:', newSlotsMap, 'Keys:', Object.keys(newSlotsMap));
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

  const handleAddTimeSlot = async (startTime: string, endTime: string, startDate: string, endDate: string) => {
    if (!selectedDate || !physician) return;

    try {
      // Validate time range
      if (!validateTimeRange(startTime, endTime)) {
        throw new Error('End time must be after start time');
      }

      const start = parseISO(startDate);
      const end = parseISO(endDate);
      
      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date selected');
      }
      
      console.log('Creating slots for date range:', { startDate, endDate, startTime, endTime });
      const daysInterval = eachDayOfInterval({ start, end });
      console.log('Days in interval:', daysInterval.map(d => format(d, 'yyyy-MM-dd')));

      // Make sure we format times correctly for database
      let formattedStartTime = startTime;
      let formattedEndTime = endTime;
      
      // Ensure we always have seconds in our time format
      if (startTime.length === 5) formattedStartTime = `${startTime}:00`;
      if (endTime.length === 5) formattedEndTime = `${endTime}:00`;
      
      console.log('Using formatted times:', { formattedStartTime, formattedEndTime });
      
      // First, clean up any existing slots for these dates
      for (const date of daysInterval) {
        const formattedDate = format(date, 'yyyy-MM-dd');
        console.log(`Cleaning up existing slots for ${formattedDate}`);
        
        // Delete any existing slots for this date
        const { error: deleteError } = await supabase
          .from('physician_schedules')
          .delete()
          .eq('physician_id', physician.id)
          .eq('specific_date', formattedDate);
          
        if (deleteError) {
          console.error(`Error deleting existing slots for ${formattedDate}:`, deleteError);
        }
      }

      // Creating a single slot for each specific date with exact times specified
      const slots = daysInterval.map(date => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateObj = new Date(formattedDate);
        
        // Log whether this is a future date (relevant for appointments page)
        const isFutureDate = dateObj > today;
        console.log(`Creating slot for ${formattedDate}, which is ${isFutureDate ? 'a FUTURE date' : 'NOT a future date'}`);
        
        return {
          physician_id: physician.id,
          day_of_week: date.getDay(),
          start_time: formattedStartTime,
          end_time: formattedEndTime,
          specific_date: formattedDate,
          is_available: true
        };
      });
      
      console.log('Slots to be created:', slots);

      // Insert the new slots
      const { data, error: insertError } = await supabase
        .from('physician_schedules')
        .insert(slots)
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }
      
      console.log('SUCCESSFULLY created slots:', data);
      
      // Verify the slots were actually created by fetching them again
      const { data: verifyData, error: verifyError } = await supabase
        .from('physician_schedules')
        .select('*')
        .eq('physician_id', physician.id)
        .in('specific_date', daysInterval.map(d => format(d, 'yyyy-MM-dd')));
        
      if (verifyError) {
        console.error('Error verifying slot creation:', verifyError);
      } else {
        console.log('Verification - slots in database:', verifyData);
      }
      
      setError('');
      setShowModal(false);
      fetchAllTimeSlots();
    } catch (error) {
      console.error('Error adding time slots:', error);
      setError(error instanceof Error ? error.message : 'Failed to add time slot');
    }
  };

  const handleDeleteSlot = async (slotId: string, isSpecificDate: boolean) => {
    try {
      if (isSpecificDate) {
        // If it's a specific date slot, just delete it
        const { error } = await supabase
          .from('physician_schedules')
          .delete()
          .eq('id', slotId);

        if (error) throw error;
      } else {
        // If it's a recurring slot, confirm the deletion
        const confirmed = window.confirm(
          "This will delete all future occurrences of this schedule. Do you want to continue?"
        );
        
        if (confirmed) {
          const { error } = await supabase
            .from('physician_schedules')
            .delete()
            .eq('id', slotId);

          if (error) throw error;
        } else {
          return; // User cancelled the deletion
        }
      }
      
      fetchAllTimeSlots();
    } catch (error) {
      console.error('Error deleting time slot:', error);
    }
  };

  const formatTimeSlot = (time: string) => {
    try {
      // Ensure the time string is in the correct format
      const formattedTime = time.length === 5 ? `${time}:00` : time;
      return format(parseISO(`2000-01-01T${formattedTime}`), 'h:mm a');
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
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        name={physician?.full_name || 'Dr.'}
        title={physician?.specialties?.[0]?.specialty || 'Physician'}
        profileImage={physician?.profile_image_url}
      />
      
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Create Schedule</h2>
                <div className="flex items-center space-x-4">
                  <button className="px-4 py-2 text-sm font-medium text-gray-700">
                    Day
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-gray-700">
                    Week
                  </button>
                  <button className="px-4 py-2 text-sm font-medium bg-pink-500 text-white rounded-lg">
                    Month
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
                      onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                      className="p-2 hover:bg-gray-100 rounded-full"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                      className="p-2 hover:bg-gray-100 rounded-full"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    
                    {/* Add quick future schedule test button */}
                    <button
                      onClick={async () => {
                        if (!physician?.id) {
                          alert("Please wait for physician data to load");
                          return;
                        }
                        
                        // Create a schedule for tomorrow
                        const today = new Date();
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        const tomorrowString = format(tomorrow, 'yyyy-MM-dd');
                        
                        // Format with seconds for consistency
                        const startTimeString = "09:00:00";
                        const endTimeString = "10:00:00";
                        
                        console.log(`Creating test schedule for tomorrow: ${tomorrowString}`);
                        
                        try {
                          // Clean up any existing slots for this date
                          await supabase
                            .from('physician_schedules')
                            .delete()
                            .eq('physician_id', physician.id)
                            .eq('specific_date', tomorrowString);
                            
                          // Create a new slot
                          const { data, error } = await supabase
                            .from('physician_schedules')
                            .insert([{
                              physician_id: physician.id,
                              day_of_week: tomorrow.getDay(),
                              start_time: startTimeString,
                              end_time: endTimeString,
                              specific_date: tomorrowString,
                              is_available: true
                            }])
                            .select();
                            
                          if (error) {
                            console.error('Error creating test schedule:', error);
                            alert("Error creating test schedule: " + error.message);
                          } else {
                            console.log('Successfully created test schedule:', data);
                            alert(`Successfully created test schedule for tomorrow (${tomorrowString})`);
                            fetchAllTimeSlots();
                          }
                        } catch (err) {
                          console.error('Exception creating test schedule:', err);
                          alert("Exception creating test schedule");
                        }
                      }}
                      className="ml-4 px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                    >
                      Create Tomorrow Slot
                    </button>
                  </div>
                </div>
                
                {/* Add refresh button */}
                <button
                  onClick={() => {
                    setLoadingText('Refreshing schedule...');
                    setLoading(true);
                    fetchPhysicianData().then(() => fetchAllTimeSlots());
                  }}
                  className="px-4 py-2 bg-pink-100 text-pink-600 rounded-lg hover:bg-pink-200 text-sm font-medium flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="M21 2v6h-6"></path>
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                    <path d="M3 22v-6h6"></path>
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                  </svg>
                  Refresh Schedule
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mb-4"></div>
                  <p className="text-gray-500">{loadingText}</p>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-px bg-gray-200">
                  {['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map((day) => (
                    <div key={day} className="bg-gray-50 py-2 text-center">
                      <span className="text-sm font-medium text-gray-500">{day}</span>
                    </div>
                  ))}
                  
                  {days.map((day) => {
                    // Get the specific key for this date in format yyyy-MM-dd
                    const dateKey = format(day, 'yyyy-MM-dd');
                    // Get slots for this specific date
                    const daySlots = slotsMap[dateKey] || [];
                    
                    console.log(`Rendering day ${dateKey} with ${daySlots.length} slots`);
                    
                    return (
                      <div
                        key={day.toISOString()}
                        className={`bg-white min-h-[120px] p-2 ${
                          !isSameMonth(day, currentDate) ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm ${
                            isToday(day) ? 'text-pink-500 font-semibold' : ''
                          }`}>
                            {format(day, 'd')}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedDate(day);
                              setDateRange({
                                startDate: format(day, 'yyyy-MM-dd'),
                                endDate: format(day, 'yyyy-MM-dd'),
                              });
                              setError('');
                              setShowModal(true);
                            }}
                            className="p-1 hover:bg-pink-50 rounded-full"
                          >
                            <Plus className="w-4 h-4 text-gray-400 hover:text-pink-500" />
                          </button>
                        </div>
                        
                        <div className="space-y-1">
                          {daySlots.length > 0 ? (
                            daySlots.map((slot) => (
                              <div
                                key={slot.id}
                                className="p-1 text-xs rounded flex items-center justify-between bg-pink-100 text-pink-700"
                              >
                                <span className="flex items-center">
                                  {formatTimeSlot(slot.start_time)} - {formatTimeSlot(slot.end_time)}
                                  <span className="ml-1 bg-pink-500 h-2 w-2 rounded-full" title="Single day slot"></span>
                                </span>
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => handleDeleteSlot(slot.id, true)}
                                    className="p-0.5 hover:bg-pink-100 rounded"
                                    title="Delete this specific date"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-500" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="h-16"></div> // Empty space to maintain consistent cell height
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setError('');
        }}
        title="Add Time Slot"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleAddTimeSlot(
              formData.get('startTime') as string,
              formData.get('endTime') as string,
              formData.get('startDate') as string,
              formData.get('endDate') as string
            );
          }}
          className="space-y-4"
        >
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg mb-4">
            <p className="font-medium text-blue-700 mb-1">How scheduling works:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Important:</strong> Select the same start and end date to create a slot for a single day.</li>
              <li>If you select different start and end dates, slots will be created for each day in that range.</li>
              <li>Existing slots for the selected date(s) will be replaced.</li>
            </ul>
          </div>
          
          {/* Preview of what will be created */}
          {dateRange.startDate && dateRange.endDate && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-1">Schedule preview:</p>
              {dateRange.startDate === dateRange.endDate ? (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Creating 1 slot for <span className="font-medium">{dateRange.startDate}</span></p>
                  <p className="text-xs text-yellow-600 italic">Any existing slots for this date will be replaced.</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    Creating slots for each day from <span className="font-medium">{dateRange.startDate}</span> to <span className="font-medium">{dateRange.endDate}</span>
                  </p>
                  <p className="text-xs text-yellow-600 italic">Any existing slots for these dates will be replaced.</p>
                </div>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setDateRange(prev => ({
                    startDate: newDate,
                    // If end date is before start date, set end date to start date
                    endDate: prev.endDate < newDate ? newDate : prev.endDate
                  }));
                }}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                required
                min={dateRange.startDate}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Time
            </label>
            <input
              type="time"
              name="startTime"
              required
              step="1800"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              End Time
            </label>
            <input
              type="time"
              name="endTime"
              required
              step="1800"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            />
          </div>
          
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setError('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-md hover:bg-pink-600"
            >
              Add Slot
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}