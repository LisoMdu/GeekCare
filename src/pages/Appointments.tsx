import React, { useState, useEffect } from 'react';
import { format, parseISO, isToday, isBefore, isAfter } from 'date-fns';
import { MoreVertical, Search, Check, X, MessageCircle, Calendar } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabase';
import { SwipeableContainer } from '../components/SwipeableContainer';
import { SkeletonAppointmentList } from '../components/ui/skeletons';

type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

interface AppointmentDetails {
  patient_name: string;
  reason: string;
  symptoms: string[];
  medical_history: string;
}

interface Appointment {
  id: string;
  physician_id: string;
  member_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  members: {
    id: string;
    full_name: string;
    email: string;
  };
  appointment_details: AppointmentDetails[];
}

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  specific_date: string;
  is_available: boolean;
}

type TabType = 'today' | 'upcoming' | 'past';

export function Appointments() {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [physician, setPhysician] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<TimeSlot[]>([]);

  useEffect(() => {
    fetchPhysicianData();
  }, []);

  useEffect(() => {
    if (physician?.id) {
      console.log('Appointments: Physician data available, fetching data');
      fetchAppointments();
      
      // Add a small delay to ensure Supabase queries don't interfere with each other
      setTimeout(() => {
        console.log('Fetching schedules after appointments');
        fetchSchedules();
      }, 100);
    }
  }, [activeTab, physician]);

  // Add a specific effect to handle tab changes for optimizing UI
  useEffect(() => {
    // Skip on initial render or if no physician data yet
    if (physician?.id && !loading) {
      console.log('Active tab changed, refreshing schedules immediately');
      setSchedulesLoading(true);
      fetchSchedules();
    }
  }, [activeTab]); // physician and loading are intentionally omitted to avoid loops

  const fetchPhysicianData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      console.log('Authenticated user ID:', user.id);

      // CRITICAL: Make this a simple query to ensure we get the data
      const { data: physicianData, error: fetchError } = await supabase
        .from('physicians')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!physicianData) {
        throw new Error('Physician profile not found');
      }

      console.log('Physician data retrieved - ID:', physicianData.id, 'Name:', physicianData.full_name);
      setPhysician(physicianData);
    } catch (error) {
      console.error('Error fetching physician data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load physician data');
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const now = new Date();
      let query = supabase
        .from('physician_appointments')
        .select(`
          *,
          members (
            id,
            full_name,
            email
          ),
          appointment_details (
            patient_name,
            reason,
            symptoms,
            medical_history
          )
        `)
        .eq('physician_id', physician.id);

      // Filter based on active tab
      switch (activeTab) {
        case 'today':
          const todayStart = now.toISOString().split('T')[0];
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStart = tomorrow.toISOString().split('T')[0];
          
          query = query
            .gte('start_time', todayStart)
            .lt('start_time', tomorrowStart);
          break;
        case 'upcoming':
          query = query.gte('start_time', now.toISOString());
          break;
        case 'past':
          query = query.lt('start_time', now.toISOString());
          break;
      }

      query = query.order('start_time', { ascending: true });

      const { data: appointmentsData, error: appointmentsError } = await query;

      if (appointmentsError) throw appointmentsError;
      
      setAppointments(appointmentsData || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError(error instanceof Error ? error.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async (retryCount = 0) => {
    try {
      setSchedulesLoading(true);
      
      if (!physician?.id) {
        console.log('No physician data for fetching schedules');
        if (retryCount < 3) {
          console.log(`Appointments: Will retry fetchSchedules (${retryCount + 1}/3) in 500ms`);
          setTimeout(() => fetchSchedules(retryCount + 1), 500);
        } else {
          // After all retries, show empty but don't keep loading
          setSchedules([]);
          setSchedulesLoading(false);
        }
        return;
      }
      
      console.log('Appointments: Fetching schedules for physician:', physician.id);
      
      // CRITICAL DEBUG: First check if ANY schedules exist without filters
      const { data: allSchedules, error: allSchedulesError } = await supabase
        .from('physician_schedules')
        .select('*')
        .eq('physician_id', physician.id);
        
      console.log('ALL SCHEDULES (no filters):', allSchedules?.length || 0, allSchedules);
      
      if (allSchedulesError) {
        console.error('Error fetching all schedules:', allSchedulesError);
      }
      
      // Debug: Show each schedule with its date information
      if (allSchedules && allSchedules.length > 0) {
        console.log('DETAILED SCHEDULE INFO:');
        console.log('Physician ID used for query:', physician.id);
        console.log('Active tab for scheduling:', activeTab);
        console.log('Current date in app:', format(new Date(), 'yyyy-MM-dd'));
        
        // Log every schedule in a clear tabular format
        console.table(allSchedules.map(schedule => ({
          id: schedule.id,
          date: schedule.specific_date,
          physician_id: schedule.physician_id,
          start: schedule.start_time,
          end: schedule.end_time,
          isToday: schedule.specific_date === format(new Date(), 'yyyy-MM-dd'),
          isFuture: schedule.specific_date >= format(new Date(), 'yyyy-MM-dd')
        })));
        
        // Also log with regular console.log for different format
        allSchedules.forEach(schedule => {
          const scheduleDate = new Date(schedule.specific_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const isInFuture = scheduleDate > today;
          const isToday = format(scheduleDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
          const isPast = scheduleDate < today;
          
          console.log(`Schedule ID ${schedule.id}: date=${schedule.specific_date}, isToday=${isToday}, isInFuture=${isInFuture}, isPast=${isPast}`);
        });
      }
      
      // If we have no schedules at all, no need to continue with filtered queries
      if (!allSchedules || allSchedules.length === 0) {
        console.log('No schedules found for this physician at all');
        setSchedules([]);
        return;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // First, check total count of schedules for this physician
      const { count, error: countError } = await supabase
        .from('physician_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('physician_id', physician.id);
        
      console.log(`Appointments: Total schedules count for physician ${physician.id}:`, count);
      
      if (countError) {
        console.error('Error counting schedules:', countError);
      }
      
      // IMPORTANT: Just use the all schedules data and filter it in memory
      // This avoids any potential issues with Supabase date filtering
      let filteredSchedules = [...allSchedules];
      const todayStr = format(today, 'yyyy-MM-dd');
      
      console.log('Current tab:', activeTab, 'Today date:', todayStr);
      console.log('All schedule dates:', allSchedules.map(s => s.specific_date).join(', '));
      
      // Convert strings to actual Date objects for proper comparison
      const todayDate = new Date(todayStr);
      todayDate.setHours(0, 0, 0, 0);
      
      switch(activeTab) {
        case 'today':
          const todayStr = format(today, 'yyyy-MM-dd');
          console.log('Today date for comparison:', todayStr);
          
          // For today, we want exact date match
          filteredSchedules = allSchedules.filter(schedule => {
            const isToday = schedule.specific_date === todayStr;
            console.log(`Schedule ${schedule.id}, date=${schedule.specific_date}, isToday=${isToday}`);
            return isToday;
          });
          
          console.log('Today schedules count:', filteredSchedules.length);
          break;
        case 'upcoming':
          // Use today's date as the cutoff for upcoming - this ensures we see all future dates including today
          const todayDateStr = format(new Date(), 'yyyy-MM-dd');
          
          console.log('Today date for upcoming comparison:', todayDateStr);
          console.log('All schedule dates for upcoming comparison:', allSchedules.map(s => s.specific_date).join(', '));
          
          // For upcoming, we want dates >= today (not tomorrow)
          filteredSchedules = allSchedules.filter(schedule => {
            const isUpcoming = schedule.specific_date >= todayDateStr;
            console.log(`Schedule ${schedule.id}, date=${schedule.specific_date}, isUpcoming=${isUpcoming}`);
            return isUpcoming;
          });
          
          console.log('Final upcoming schedules count:', filteredSchedules.length);
          break;
        case 'past':
          const yesterdayObj = new Date();
          yesterdayObj.setDate(yesterdayObj.getDate() - 1);
          const yesterdayStr = format(yesterdayObj, 'yyyy-MM-dd');
          
          console.log('Yesterday date for comparison:', yesterdayStr);
          
          // For past, we want dates <= yesterday
          filteredSchedules = allSchedules.filter(schedule => {
            const isPast = schedule.specific_date <= yesterdayStr;
            console.log(`Schedule ${schedule.id}, date=${schedule.specific_date}, isPast=${isPast}`);
            return isPast;
          });
          
          console.log('Past schedules count:', filteredSchedules.length);
          break;
      }
      
      console.log('Filtered schedules:', filteredSchedules.length, filteredSchedules);
      setSchedules(filteredSchedules);
    } catch (error) {
      console.error('Error in fetchSchedules:', error);
      // Retry if we have retries left
      if (retryCount < 2) {
        console.log(`Appointments: Retrying fetchSchedules after error (${retryCount + 1}/2)`);
        setTimeout(() => fetchSchedules(retryCount + 1), 1000);
      }
    } finally {
      setSchedulesLoading(false);
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

  const handleStatusChange = async (appointmentId: string, status: AppointmentStatus) => {
    try {
      const { error: updateError } = await supabase
        .from('physician_appointments')
        .update({ status })
        .eq('id', appointmentId);

      if (updateError) throw updateError;
      await fetchAppointments();
      setError(null);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update appointment status');
    }
  };

  const handleBulkAction = async (action: AppointmentStatus) => {
    try {
      const { error: bulkUpdateError } = await supabase
        .from('physician_appointments')
        .update({ status: action })
        .in('id', Array.from(selectedItems));

      if (bulkUpdateError) throw bulkUpdateError;
      setSelectedItems(new Set());
      await fetchAppointments();
      setError(null);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      setError(error instanceof Error ? error.message : 'Failed to update appointments');
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === appointments.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(appointments.map(apt => apt.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const filteredAppointments = appointments.filter(apt => {
    const patientName = apt.members?.full_name || '';
    return patientName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar
          name={physician?.full_name || 'Dr.'}
          title={physician?.physician_specialties?.[0]?.specialty || 'Physician'}
          profileImage={physician?.profile_image_url}
        />
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchAppointments}
                className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        name={physician?.full_name || 'Dr.'}
        title={physician?.physician_specialties?.[0]?.specialty || 'Physician'}
        profileImage={physician?.profile_image_url}
      />

      <SwipeableContainer
        leftRoute="/inbox"
        rightRoute="/home"
      >
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">Appointments</h2>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setActiveTab('today')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        activeTab === 'today'
                          ? 'bg-pink-500 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setActiveTab('upcoming')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        activeTab === 'upcoming'
                          ? 'bg-pink-500 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Upcoming
                    </button>
                    <button
                      onClick={() => setActiveTab('past')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        activeTab === 'past'
                          ? 'bg-pink-500 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Past
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by patient name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>

                  {selectedItems.size > 0 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleBulkAction('completed')}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600"
                      >
                        Approve Selected
                      </button>
                      <button
                        onClick={() => handleBulkAction('cancelled')}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600"
                      >
                        Cancel Selected
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                    <span className="ml-3 text-gray-500">Loading appointments...</span>
                  </div>
                ) : filteredAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <Calendar className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                    <p className="text-gray-500 text-center max-w-sm">
                      {activeTab === 'today' 
                        ? "You don't have any appointments scheduled for today."
                        : activeTab === 'upcoming'
                        ? "You don't have any upcoming appointments scheduled."
                        : "You don't have any past appointments."}
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedItems.size === appointments.length}
                            onChange={toggleSelectAll}
                            className="rounded text-pink-500 focus:ring-pink-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Patient Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Scheduled on
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAppointments.map((appointment) => (
                        <tr key={appointment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(appointment.id)}
                              onChange={() => toggleSelectItem(appointment.id)}
                              className="rounded text-pink-500 focus:ring-pink-500"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.members?.full_name || 'N/A'}
                            </div>
                            {appointment.appointment_details?.[0]?.reason && (
                              <div className="text-sm text-gray-500">
                                {appointment.appointment_details[0].reason}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {format(new Date(appointment.start_time), 'MMM d, yyyy')}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {format(new Date(appointment.start_time), 'h:mm a')}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              appointment.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : appointment.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {appointment.status === 'scheduled' && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(appointment.id, 'completed')}
                                  className="text-green-500 hover:text-green-600"
                                >
                                  <Check className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </>
                            )}
                            {appointment.status === 'completed' && (
                              <button className="text-blue-500 hover:text-blue-600">
                                <MessageCircle className="w-5 h-5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setShowDetailsModal(true);
                              }}
                              className="text-gray-400 hover:text-gray-500"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="mt-8 bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">Your Scheduled Availabilities</h2>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-gray-500">
                      {activeTab === 'today' 
                        ? "Today's availabilities" 
                        : activeTab === 'upcoming' 
                          ? "Future availabilities" 
                          : "Past availabilities"}
                    </div>
                    <button
                      onClick={() => fetchSchedules(0)}
                      className="ml-2 p-1 rounded-full hover:bg-gray-100 text-gray-500"
                      title="Refresh availabilities"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 2v6h-6"></path>
                        <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                        <path d="M3 22v-6h6"></path>
                        <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                      </svg>
                    </button>
                    <button 
                      onClick={async () => {
                        setSchedulesLoading(true);
                        try {
                          console.log('Force refreshing schedules directly from database');
                          const { data, error } = await supabase
                            .from('physician_schedules')
                            .select('*')
                            .eq('physician_id', physician.id);
                          
                          if (error) throw error;
                          console.log('Force refresh returned:', data?.length || 0, 'schedules');
                          
                          if (data && data.length > 0) {
                            // Apply filtering based on active tab
                            let filtered = [];
                            const todayStr = format(new Date(), 'yyyy-MM-dd');
                            const tomorrowObj = new Date();
                            tomorrowObj.setDate(tomorrowObj.getDate() + 1);
                            const tomorrowStr = format(tomorrowObj, 'yyyy-MM-dd');
                            
                            if (activeTab === 'today') {
                              filtered = data.filter(s => s.specific_date === todayStr);
                            } else if (activeTab === 'upcoming') {
                              filtered = data.filter(s => s.specific_date >= tomorrowStr);
                            } else { // past
                              filtered = data.filter(s => s.specific_date < todayStr);
                            }
                            
                            console.log(`Force refresh filtered for "${activeTab}":`, filtered.length);
                            setSchedules(filtered);
                          } else {
                            setSchedules([]);
                          }
                        } catch (err) {
                          console.error('Error during force refresh:', err);
                        } finally {
                          setSchedulesLoading(false);
                        }
                      }}
                      className="ml-2 px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                      title="Force refresh from database"
                    >
                      Force Refresh
                    </button>
                    <button 
                      onClick={async () => {
                        setSchedulesLoading(true);
                        try {
                          console.log('Showing ALL schedules without filtering');
                          const { data, error } = await supabase
                            .from('physician_schedules')
                            .select('*')
                            .eq('physician_id', physician.id);
                          
                          if (error) throw error;
                          console.log('SHOWING ALL SCHEDULES:', data);
                          
                          if (data) {
                            // Show ALL schedules without any date filtering
                            setSchedules(data);
                          } else {
                            setSchedules([]);
                          }
                        } catch (err) {
                          console.error('Error showing all schedules:', err);
                        } finally {
                          setSchedulesLoading(false);
                        }
                      }}
                      className="ml-2 px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200"
                      title="Show all available schedules"
                    >
                      Show All Times
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {activeTab === 'upcoming' && schedules.length > 0 && (
                  <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
                    <p><strong>Pro tip:</strong> You can create more schedule availabilities on the <strong>Create Schedule</strong> page.</p>
                  </div>
                )}
                
                {schedulesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                    <span className="ml-3 text-gray-500">Loading availabilities...</span>
                  </div>
                ) : schedules.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>No scheduled availabilities found for this period.</p>
                    <p className="text-sm mt-1 text-gray-400">
                      {activeTab === 'today' 
                        ? "Create availabilities on the Schedule page to allow patients to book today." 
                        : activeTab === 'upcoming' 
                          ? "Create availabilities on the Schedule page for future dates." 
                          : "No past availabilities were found."}
                    </p>
                    <div className="mt-4 flex flex-col items-center space-y-2">
                      <button 
                        onClick={async () => {
                          setSchedulesLoading(true);
                          try {
                            console.log('DEBUG checking ALL schedules');
                            const { data, error } = await supabase
                              .from('physician_schedules')
                              .select('*');
                              
                            if (error) throw error;
                            alert(`Found ${data?.length || 0} total schedules in the database. Check browser console for details.`);
                            console.log('ALL SCHEDULES IN DATABASE:', data);
                          } catch (err) {
                            console.error('Error checking schedules:', err);
                          } finally {
                            setSchedulesLoading(false);
                          }
                        }}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        Check All Database Schedules
                      </button>
                      <a 
                        href="/schedule" 
                        className="px-4 py-2 bg-pink-100 text-pink-700 rounded-md hover:bg-pink-200 transition-colors"
                      >
                        Go to Schedule Page
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {schedules.map((schedule) => (
                      <div 
                        key={schedule.id} 
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-lg font-medium text-gray-900">
                              {format(new Date(schedule.specific_date), 'EEEE, MMMM d, yyyy')}
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              {formatTimeSlot(schedule.start_time)} - {formatTimeSlot(schedule.end_time)}
                            </div>
                            <div className="mt-2 text-xs text-gray-500 flex flex-col">
                              {isToday(new Date(schedule.specific_date)) 
                                ? <span className="text-green-600 font-medium">Today</span> 
                                : `Day of week: ${format(new Date(schedule.specific_date), 'EEEE')}`}
                              <span className="mt-1">ID: {schedule.id.substring(0, 8)}</span>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Available
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SwipeableContainer>

      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Appointment Details"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Patient Name</h4>
              <p className="mt-1 text-sm text-gray-900">
                {selectedAppointment.members?.full_name || 'N/A'}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Date & Time</h4>
              <p className="mt-1 text-sm text-gray-900">
                {format(new Date(selectedAppointment.start_time), 'PPP p')}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Status</h4>
              <p className="mt-1 text-sm text-gray-900">{selectedAppointment.status}</p>
            </div>
            {selectedAppointment.appointment_details?.[0] && (
              <>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Reason for Visit</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedAppointment.appointment_details[0].reason}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Patient Details</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedAppointment.appointment_details[0].patient_name}
                  </p>
                </div>
              </>
            )}
            {selectedAppointment.status === 'scheduled' && (
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    handleStatusChange(selectedAppointment.id, 'completed');
                    setShowDetailsModal(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(selectedAppointment.id, 'cancelled');
                    setShowDetailsModal(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}