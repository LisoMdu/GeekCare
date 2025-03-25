import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { 
  Heart, Calendar, Clock, DollarSign, User2, FileText, 
  X, Check, Search, MapPin, MessageSquare, CreditCard,
  Inbox, UserCircle, LogOut, LayoutDashboard, Edit2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/Modal';

interface Appointment {
  id: string;
  member_id: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  physicians: {
    id: string;
    full_name: string;
    profile_image_url: string | null;
    physician_specialties: { specialty: string }[];
  };
  appointment_details: {
    patient_name: string;
    patient_age: number;
    reason: string;
    symptoms: string[];
    medical_history: string;
  };
  appointment_payments: {
    amount: number;
    status: string;
    payment_method: string;
  }[];
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/home' },
  { icon: Calendar, label: 'Appointments', path: '/appointments' },
  { icon: MessageSquare, label: 'Ask your Queries', path: '/queries' },
  { icon: CreditCard, label: 'Payments', path: '/payments' },
  { icon: Inbox, label: 'Inbox', path: '/inbox' },
  { icon: UserCircle, label: 'Profile', path: '/profile' },
];

export function MemberAppointments() {
  const navigate = useNavigate();
  const [member, setMember] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  useEffect(() => {
    fetchMemberData();
    fetchAppointments();
  }, [activeTab]);

  const fetchMemberData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: memberData, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!memberData) {
        navigate('/login');
        return;
      }

      setMember(memberData);
    } catch (error) {
      console.error('Error fetching member data:', error);
      navigate('/login');
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();
      const query = supabase
        .from('physician_appointments')
        .select(`
          *,
          physicians (
            id,
            full_name,
            profile_image_url,
            physician_specialties (specialty)
          ),
          appointment_details (
            patient_name,
            patient_age,
            reason,
            symptoms,
            medical_history
          ),
          appointment_payments (
            amount,
            status,
            payment_method
          )
        `)
        .eq('member_id', user.id)
        .eq('status', 'scheduled');

      if (activeTab === 'upcoming') {
        query.gte('start_time', now);
      } else {
        query.lt('start_time', now);
      }

      query.order('start_time', { ascending: activeTab === 'upcoming' });

      const { data: appointmentsData, error } = await query;

      if (error) throw error;
      setAppointments(appointmentsData as Appointment[]);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleAppointment = async () => {
    if (!selectedAppointment || !selectedDate || !selectedTime) return;

    try {
      setLoading(true);
      setError('');

      // Check available tables in the database
      console.log('Checking database tables...');
      const { data: tables, error: tablesError } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');

      if (tablesError) {
        console.error('Error fetching tables:', tablesError);
      } else {
        console.log('Available tables:', tables);
      }

      // Convert time to 24-hour format with seconds
      const formattedStartTime = selectedTime.length === 8 ? selectedTime : `${selectedTime}:00`;
      
      // Create the new start datetime
      const startDateTime = new Date(`${selectedDate}T${formattedStartTime}`);
      
      // Calculate end time (30 minutes after start)
      const endDateTime = new Date(startDateTime.getTime() + (30 * 60000));

      // Validate the times
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error('Invalid date or time selected');
      }

      console.log('Updating appointment directly:', {
        id: selectedAppointment.id,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString()
      });

      // Try with appointment table name instead
      const { error: updateError } = await supabase
        .from('physician_appointments')
        .update({
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString()
        })
        .eq('id', selectedAppointment.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(updateError.message || 'Failed to reschedule appointment');
      }

      // Reset state and refresh appointments to show the latest data
      setShowRescheduleModal(false);
      setSelectedDate('');
      setSelectedTime('');
      setSelectedAppointment(null);
      await fetchAppointments();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      setError(error instanceof Error ? error.message : 'Failed to reschedule appointment');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (date: string, physicianId: string) => {
    try {
      setError('');
      const dayOfWeek = new Date(date).getDay();
      
      // Get physician's schedule for the selected day
      const { data: schedules, error: scheduleError } = await supabase
        .from('physician_schedules')
        .select('*')
        .eq('physician_id', physicianId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);

      if (scheduleError) throw scheduleError;

      if (!schedules || schedules.length === 0) {
        setAvailableSlots([]);
        return;
      }

      // Get existing appointments for the selected date
      const { data: bookedSlots, error: bookingError } = await supabase
        .from('physician_appointments')
        .select('id, start_time, end_time')
        .eq('physician_id', physicianId)
        .eq('status', 'scheduled')
        .gte('start_time', `${date}T00:00:00`)
        .lt('start_time', `${date}T23:59:59`);

      if (bookingError) throw bookingError;

      // Process each schedule to create 30-minute slots
      const allSlots: TimeSlot[] = [];
      schedules.forEach(schedule => {
        const startTime = parseISO(`2000-01-01T${schedule.start_time}`);
        const endTime = parseISO(`2000-01-01T${schedule.end_time}`);
        
        let currentSlot = startTime;
        while (currentSlot < endTime) {
          const slotEnd = new Date(currentSlot.getTime() + 30 * 60000);
          if (slotEnd <= endTime) {
            const slotStartStr = format(currentSlot, 'HH:mm:ss');
            
            // Check if slot is already booked
            const isBooked = bookedSlots?.some(booked => {
              const bookedStart = new Date(booked.start_time);
              const bookedEnd = new Date(booked.end_time);
              const slotStart = new Date(`${date}T${slotStartStr}`);
              
              // Don't count current appointment as booked
              if (booked.id === selectedAppointment?.id) {
                return false;
              }
              
              return slotStart >= bookedStart && slotStart < bookedEnd;
            });

            if (!isBooked) {
              allSlots.push({
                start_time: slotStartStr,
                end_time: format(slotEnd, 'HH:mm:ss'),
                is_available: true
              });
            }
          }
          currentSlot = new Date(currentSlot.getTime() + 30 * 60000);
        }
      });

      setAvailableSlots(allSlots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setError('Failed to fetch available time slots');
      setAvailableSlots([]);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('physician_appointments')
        .update({ status: 'cancelled' })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      setShowCancelModal(false);
      fetchAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      setError('Failed to cancel appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const filteredAppointments = appointments.filter(apt =>
    apt.physicians.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.appointment_details?.patient_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-pink-500 fill-pink-500" />
              <span className="ml-2 text-2xl font-bold">GeekCare</span>
            </div>
            <button
              onClick={() => navigate('/home')}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Home
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white min-h-[calc(100vh-4rem)] p-6">
          <div className="text-center mb-8">
            {member?.profile_image_url ? (
              <img
                src={member.profile_image_url}
                alt={member.full_name}
                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gray-200 flex items-center justify-center">
                <User2 className="w-12 h-12 text-gray-400" />
              </div>
            )}
            <h2 className="text-xl font-semibold">{member?.full_name}</h2>
            <div className="flex items-center justify-center text-sm text-gray-500 mt-2">
              <MapPin className="w-4 h-4 mr-1" />
              {member?.residence || 'Location not set'}
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-4 py-2 text-left rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-pink-100 text-pink-500'
                    : 'text-gray-700 hover:bg-pink-50'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-left text-gray-700 hover:bg-pink-50 rounded-lg"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">My Appointments</h2>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setActiveTab('upcoming')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        activeTab === 'upcoming'
                          ? 'bg-pink-500 text-white'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      Upcoming
                    </button>
                    <button
                      onClick={() => setActiveTab('past')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        activeTab === 'past'
                          ? 'bg-pink-500 text-white'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      Past
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by doctor or patient name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {loading ? (
                  <div className="p-6 text-center text-gray-500">Loading appointments...</div>
                ) : filteredAppointments.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No {activeTab} appointments found
                  </div>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-6">
                      <div className="flex items-start">
                        {appointment.physicians.profile_image_url ? (
                          <img
                            src={appointment.physicians.profile_image_url}
                            alt={appointment.physicians.full_name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                            <User2 className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <div className="ml-6 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">
                                Dr. {appointment.physicians.full_name}
                              </h3>
                              <p className="text-gray-500">
                                {appointment.physicians.physician_specialties?.[0]?.specialty}
                              </p>
                            </div>
                            <div className="flex items-center space-x-4">
                              {activeTab === 'upcoming' && appointment.status === 'scheduled' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedAppointment(appointment);
                                      setSelectedDate(format(new Date(appointment.start_time), 'yyyy-MM-dd'));
                                      fetchAvailableSlots(
                                        format(new Date(appointment.start_time), 'yyyy-MM-dd'),
                                        appointment.physicians.id
                                      );
                                      setShowRescheduleModal(true);
                                    }}
                                    className="flex items-center px-3 py-1 text-sm text-pink-600 hover:bg-pink-50 rounded-lg"
                                  >
                                    <Edit2 className="w-4 h-4 mr-1" />
                                    Reschedule
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedAppointment(appointment);
                                      setShowCancelModal(true);
                                    }}
                                    className="flex items-center px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Cancel
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setShowDetailsModal(true);
                                }}
                                className="px-3 py-1 text-sm text-white bg-pink-500 rounded-lg hover:bg-pink-600"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center text-gray-500">
                              <Calendar className="w-4 h-4 mr-2" />
                              {format(new Date(appointment.start_time), 'MMMM d, yyyy')}
                            </div>
                            <div className="flex items-center text-gray-500">
                              <Clock className="w-4 h-4 mr-2" />
                              {format(new Date(appointment.start_time), 'h:mm a')}
                            </div>
                            <div className="flex items-center text-gray-500">
                              <FileText className="w-4 h-4 mr-2" />
                              {appointment.appointment_details?.reason || 'No reason provided'}
                            </div>
                            <div className="flex items-center text-gray-500">
                              <DollarSign className="w-4 h-4 mr-2" />
                              ${appointment.appointment_payments?.[0]?.amount || 0}
                              {appointment.appointment_payments?.[0]?.status === 'completed' && (
                                <Check className="w-4 h-4 ml-1 text-green-500" />
                              )}
                            </div>
                          </div>
                          <div className="mt-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                appointment.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : appointment.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      <Modal
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false);
          setSelectedDate('');
          setSelectedTime('');
          setError('');
        }}
        title="Reschedule Appointment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select New Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                const newDate = e.target.value;
                setSelectedDate(newDate);
                setSelectedTime('');
                if (selectedAppointment) {
                  fetchAvailableSlots(newDate, selectedAppointment.physicians.id);
                }
              }}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          {selectedDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Available Time Slots
              </label>
              <div className="grid grid-cols-3 gap-2">
                {availableSlots && availableSlots.length > 0 ? (
                  availableSlots.map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedTime(slot.start_time)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        selectedTime === slot.start_time
                          ? 'bg-pink-500 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-pink-50 hover:border-pink-500'
                      }`}
                    >
                      {format(parseISO(`2000-01-01T${slot.start_time}`), 'h:mm a')}
                    </button>
                  ))
                ) : (
                  <p className="col-span-3 text-center py-2 text-gray-500">
                    No available slots for this date
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowRescheduleModal(false);
                setSelectedDate('');
                setSelectedTime('');
                setError('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRescheduleAppointment}
              disabled={loading || !selectedDate || !selectedTime}
              className="px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 disabled:opacity-50"
            >
              {loading ? 'Rescheduling...' : 'Confirm New Time'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Appointment Details"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Doctor</h4>
              <p className="mt-1">Dr. {selectedAppointment.physicians.full_name}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Specialty</h4>
              <p className="mt-1">
                {selectedAppointment.physicians.physician_specialties?.[0]?.specialty}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Date & Time</h4>
              <p className="mt-1">
                {format(new Date(selectedAppointment.start_time), 'PPP p')}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Status</h4>
              <p className="mt-1">{selectedAppointment.status}</p>
            </div>
            {selectedAppointment.appointment_details && (
              <>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Reason for Visit</h4>
                  <p className="mt-1">{selectedAppointment.appointment_details.reason}</p>
                </div>
                {selectedAppointment.appointment_details.symptoms && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Symptoms</h4>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedAppointment.appointment_details.symptoms.map((symptom, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedAppointment.appointment_details.medical_history && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Medical History</h4>
                    <p className="mt-1">{selectedAppointment.appointment_details.medical_history}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Appointment"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowCancelModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              No, Keep It
            </button>
            <button
              onClick={handleCancelAppointment}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600"
            >
              {loading ? 'Cancelling...' : 'Yes, Cancel'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}