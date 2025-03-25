import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Heart, Calendar, Clock, DollarSign, User2, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/Modal';

interface AppointmentDetails {
  patientName: string;
  patientAge: string;
  reason: string;
  symptoms: string[];
  medicalHistory: string;
}

export function BookAppointment() {
  const { physicianId } = useParams();
  const navigate = useNavigate();
  const [physician, setPhysician] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState<AppointmentDetails>({
    patientName: '',
    patientAge: '',
    reason: '',
    symptoms: [],
    medicalHistory: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPhysicianData();
  }, [physicianId]);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  const fetchPhysicianData = async () => {
    try {
      const { data: physicianData, error } = await supabase
        .from('physicians')
        .select(`
          *,
          physician_specialties (specialty),
          physician_languages (language)
        `)
        .eq('id', physicianId)
        .single();

      if (error) throw error;
      setPhysician(physicianData);
    } catch (error) {
      console.error('Error fetching physician data:', error);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      setAvailableSlots([]); // Clear previous slots
      
      if (!selectedDate || !physicianId) {
        console.error('Missing required data for fetching slots:', { selectedDate, physicianId });
        return;
      }

      console.log('Fetching slots for date:', selectedDate, 'physician:', physicianId);
      
      // Get the day of week for the selected date (0-6, where 0 is Sunday)
      const selectedDayOfWeek = new Date(selectedDate).getDay();
      console.log('Selected day of week:', selectedDayOfWeek);
      
      // First, try to get specific date slots
      const { data: specificDateSlots, error: specificError } = await supabase
        .from('physician_schedules')
        .select('*')
        .eq('physician_id', physicianId)
        .eq('specific_date', selectedDate);
        
      if (specificError) {
        console.error('Error fetching specific date slots:', specificError);
      }
      
      console.log('Specific date slots found:', specificDateSlots?.length || 0);
      
      // Then, try to get day of week slots
      const { data: dayOfWeekSlots, error: dayError } = await supabase
        .from('physician_schedules')
        .select('*')
        .eq('physician_id', physicianId)
        .eq('day_of_week', selectedDayOfWeek);
        
      if (dayError) {
        console.error('Error fetching day of week slots:', dayError);
      }
      
      console.log('Day of week slots found:', dayOfWeekSlots?.length || 0);
      
      // Combine both types of slots (prefer specific dates over weekly recurrences)
      let allSlots = [...(specificDateSlots || []), ...(dayOfWeekSlots || [])];
      
      // Remove duplicates based on start_time and end_time
      const uniqueSlots = allSlots.filter((slot, index, self) =>
        index === self.findIndex((s) => s.start_time === slot.start_time && s.end_time === slot.end_time)
      );
      
      console.log('Combined unique slots:', uniqueSlots.length);

      // Filter out slots that are already booked
      const { data: bookedSlots, error: bookingError } = await supabase
        .from('physician_appointments')
        .select('start_time, end_time')
        .eq('physician_id', physicianId)
        .eq('status', 'scheduled')
        .gte('start_time', `${selectedDate}T00:00:00`)
        .lt('start_time', `${selectedDate}T23:59:59`);
        
      if (bookingError) {
        console.error('Error fetching booked slots:', bookingError);
      }
      
      console.log('Booked slots found:', bookedSlots?.length || 0);

      const availableTimeSlots = uniqueSlots.filter(slot => {
        // Skip slots that don't have start or end times
        if (!slot.start_time || !slot.end_time) {
          console.log('Skipping slot with missing time data:', slot);
          return false;
        }
        
        // Make sure we're only including available slots
        if (slot.is_available === false) {
          return false;
        }
        
        const slotStart = new Date(`${selectedDate}T${slot.start_time}`);
        const slotEnd = new Date(`${selectedDate}T${slot.end_time}`);
        
        // Skip if no booked slots
        if (!bookedSlots || bookedSlots.length === 0) {
          return true;
        }
        
        // Check if the slot overlaps with any booked appointment
        return !bookedSlots.some(booked => {
          const bookedStart = new Date(booked.start_time);
          const bookedEnd = new Date(booked.end_time);
          
          const overlap = (
            (slotStart >= bookedStart && slotStart < bookedEnd) ||
            (slotEnd > bookedStart && slotEnd <= bookedEnd) ||
            (slotStart <= bookedStart && slotEnd >= bookedEnd)
          );
          
          if (overlap) {
            console.log('Slot overlaps with booking:', {
              slot: `${slot.start_time}-${slot.end_time}`,
              booking: `${bookedStart.toISOString()}-${bookedEnd.toISOString()}`
            });
          }
          
          return overlap;
        });
      });

      console.log('Final available slots:', availableTimeSlots);
      setAvailableSlots(availableTimeSlots || []);
    } catch (error) {
      console.error('Error fetching available slots:', error);
    }
  };

  const handleBookAppointment = async (paymentMethod: 'online' | 'onsite') => {
    try {
      setLoading(true);
      setError('');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in to book an appointment');

      // Calculate end time based on consultation duration
      const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const endDateTime = new Date(startDateTime.getTime() + (physician.consultation_duration * 60000));

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('physician_appointments')
        .insert([
          {
            physician_id: physicianId,
            member_id: user.id,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            status: 'scheduled'
          }
        ])
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Create appointment details
      const { error: detailsError } = await supabase
        .from('appointment_details')
        .insert([
          {
            appointment_id: appointment.id,
            patient_name: appointmentDetails.patientName,
            patient_age: parseInt(appointmentDetails.patientAge),
            reason: appointmentDetails.reason,
            symptoms: appointmentDetails.symptoms,
            medical_history: appointmentDetails.medicalHistory
          }
        ]);

      if (detailsError) throw detailsError;

      if (paymentMethod === 'onsite') {
        // Create payment record for on-site payment
        const { error: paymentError } = await supabase
          .from('appointment_payments')
          .insert([
            {
              appointment_id: appointment.id,
              amount: physician.consultation_fee,
              currency: 'USD',
              status: 'pending',
              payment_method: 'onsite'
            }
          ]);

        if (paymentError) throw paymentError;
        
        // Navigate to home page
        navigate('/home');
      } else {
        // Initialize Razorpay payment
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: physician.consultation_fee * 100,
          currency: "USD",
          name: "GeekCare",
          description: `Consultation with Dr. ${physician.full_name}`,
          order_id: appointment.id,
          handler: async (response: any) => {
            try {
              // Record payment
              await supabase
                .from('appointment_payments')
                .insert([
                  {
                    appointment_id: appointment.id,
                    amount: physician.consultation_fee,
                    currency: 'USD',
                    status: 'completed',
                    payment_id: response.razorpay_payment_id,
                    payment_method: 'razorpay'
                  }
                ]);

              // Navigate to home page
              navigate('/home');
            } catch (error) {
              console.error('Error recording payment:', error);
              setError('Payment recorded but failed to update records. Please contact support.');
            }
          },
          prefill: {
            name: appointmentDetails.patientName,
            email: user.email
          },
          theme: {
            color: "#EC4899"
          }
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      setError(error instanceof Error ? error.message : 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  if (!physician) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Physician Info */}
          <div className="p-6 border-b">
            <div className="flex items-center">
              {physician.profile_image_url ? (
                <img
                  src={physician.profile_image_url}
                  alt={physician.full_name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <User2 className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div className="ml-4">
                <h2 className="text-xl font-semibold">Dr. {physician.full_name}</h2>
                <p className="text-gray-600">
                  {physician.physician_specialties?.[0]?.specialty}
                </p>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Select Date & Time</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <div className="mt-1 relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                  {/* Debug button */}
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          // Directly query all slots for this physician to see what's in the database
                          const { data: allPhysicianSlots, error } = await supabase
                            .from('physician_schedules')
                            .select('*')
                            .eq('physician_id', physicianId);
                            
                          if (error) throw error;
                          
                          console.log('DEBUG - All physician slots in database:', allPhysicianSlots);
                          
                          // Format the data for an alert
                          const slots = allPhysicianSlots?.map(slot => {
                            return `ID: ${slot.id.substring(0,8)}, Day: ${slot.day_of_week}, Date: ${slot.specific_date || 'N/A'}, Time: ${slot.start_time}-${slot.end_time}`;
                          }).join('\n');
                          
                          alert(`Found ${allPhysicianSlots?.length || 0} schedule slots in the database for this physician:\n\n${slots || 'None'}`);
                        } catch (err) {
                          console.error('Error debugging slots:', err);
                          alert('Error checking slots. See console for details.');
                        }
                      }}
                      className="mt-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Debug: Check All Available Slots
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Available Time Slots
                  </label>
                  <div className="mt-1">
                    {availableSlots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map((slot) => (
                          <button
                            key={`${slot.start_time}-${slot.end_time}`}
                            onClick={() => setSelectedTime(slot.start_time)}
                            className={`px-3 py-2 text-sm rounded-lg ${
                              selectedTime === slot.start_time
                                ? 'bg-pink-500 text-white'
                                : 'border border-gray-300 text-gray-700 hover:border-pink-500'
                            }`}
                          >
                            {format(new Date(`2000-01-01T${slot.start_time}`), 'h:mm a')}
                          </button>
                        ))}
                      </div>
                    ) : selectedDate ? (
                      <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">
                        <p className="flex items-center text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          No available time slots for this date. Please select another date.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 text-gray-500 rounded-lg border border-gray-200">
                        <p className="text-sm">Please select a date to see available time slots.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-4 border-t border-b">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="ml-2 text-gray-600">
                  {physician.consultation_duration} minutes
                </span>
              </div>
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <span className="ml-2 text-gray-600">
                  ${physician.consultation_fee}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowDetailsModal(true)}
              disabled={!selectedDate || !selectedTime}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </main>

      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Appointment Details"
      >
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Patient Name
            </label>
            <input
              type="text"
              value={appointmentDetails.patientName}
              onChange={(e) => setAppointmentDetails({
                ...appointmentDetails,
                patientName: e.target.value
              })}
              required
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Patient Age
            </label>
            <input
              type="number"
              value={appointmentDetails.patientAge}
              onChange={(e) => setAppointmentDetails({
                ...appointmentDetails,
                patientAge: e.target.value
              })}
              required
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reason for Visit
            </label>
            <textarea
              value={appointmentDetails.reason}
              onChange={(e) => setAppointmentDetails({
                ...appointmentDetails,
                reason: e.target.value
              })}
              required
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Symptoms (comma separated)
            </label>
            <input
              type="text"
              value={appointmentDetails.symptoms.join(', ')}
              onChange={(e) => setAppointmentDetails({
                ...appointmentDetails,
                symptoms: e.target.value.split(',').map(s => s.trim())
              })}
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Medical History
            </label>
            <textarea
              value={appointmentDetails.medicalHistory}
              onChange={(e) => setAppointmentDetails({
                ...appointmentDetails,
                medicalHistory: e.target.value
              })}
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowDetailsModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleBookAppointment('onsite')}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-pink-500 border border-pink-500 rounded-lg hover:bg-pink-50"
            >
              Pay on-site
            </button>
            <button
              type="button"
              onClick={() => handleBookAppointment('online')}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600"
            >
              {loading ? 'Processing...' : 'Pay Online'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}